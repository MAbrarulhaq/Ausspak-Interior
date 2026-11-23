import hmac
import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.security import generate_order_number
from app.models.enquiry import Enquiry
from app.models.enums import STATUS_ORDER, EnquiryStatus, OrderStatus, UserRole, CommitmentStatus
from app.models.order import Order, OrderCommitment, OrderDateRevision, OrderStatusHistory
from app.models.user import User
from app.schemas.order import (CommitmentCreate, CommitmentPatch, DateRevisionIn, OrderCreate, OrderPatch, StatusChange,
                               TrackingCommitment, TrackingOut, TrackingProgress, TrackingRevision)
from app.services import notification_service as notify
from app.utils.labels import STATUS_LABELS


def _bad(detail: str, code: int = 422) -> HTTPException:
    return HTTPException(code, detail)


def get_order(db: Session, order_id: uuid.UUID) -> Order:
    order = db.scalar(select(Order).options(selectinload(Order.history), selectinload(Order.revisions), selectinload(Order.commitments)).where(Order.id == order_id))
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found.")
    return order


def create_order(db: Session, data: OrderCreate, actor: User) -> Order:
    if data.customer_id and db.get(User, data.customer_id) is None:
        raise _bad("customer_id does not match any user.")
    enquiry = None
    if data.enquiry_id:
        enquiry = db.get(Enquiry, data.enquiry_id)
        if enquiry is None:
            raise _bad("enquiry_id does not match any enquiry.")
    order_date = data.order_date or date.today()
    for _ in range(5):  # order numbers are random; retry on the (extremely unlikely) collision
        order = Order(order_number=generate_order_number(), customer_id=data.customer_id, enquiry_id=data.enquiry_id,
                      customer_name=data.customer_name.strip(), customer_phone=data.customer_phone, customer_email=data.customer_email,
                      work_type=data.work_type.strip(), description=data.description.strip(), order_date=order_date,
                      agreed_completion_date=data.agreed_completion_date,
                      estimated_completion_date=data.estimated_completion_date or data.agreed_completion_date,
                      current_status=data.current_status, is_delayed=False, created_by=actor.id)
        order.history.append(OrderStatusHistory(previous_status=None, new_status=data.current_status, is_delayed=False,
                                                update_message=data.initial_message or "Order recorded.", updated_by=actor.id))
        if enquiry is not None:
            enquiry.status = EnquiryStatus.converted
        db.add(order)
        try:
            db.commit()
            break
        except IntegrityError:
            db.rollback()
            if enquiry is not None:
                enquiry = db.get(Enquiry, data.enquiry_id)
    else:
        raise HTTPException(500, "Could not generate a unique order number.")
    if data.notify:
        notify.notify_order_event(db, order, "order_created")
    return get_order(db, order.id)


def update_order(db: Session, order: Order, data: OrderPatch) -> Order:
    changes = data.model_dump(exclude_unset=True)
    if "customer_id" in changes and changes["customer_id"] and db.get(User, changes["customer_id"]) is None:
        raise _bad("customer_id does not match any user.")
    for k, v in changes.items():
        setattr(order, k, v.strip() if isinstance(v, str) else (v.lower() if k == "customer_email" and v else v))
    db.commit()
    return get_order(db, order.id)


def change_status(db: Session, order: Order, data: StatusChange, actor: User) -> Order:
    current = order.current_status
    new = data.new_status or current
    diff = STATUS_ORDER.index(new) - STATUS_ORDER.index(current)

    if current == OrderStatus.completed and new != OrderStatus.completed and actor.role != UserRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only an admin can reopen a completed order.")
    if diff < 0 and len(data.update_message.strip()) < 10:
        raise _bad("Moving an order backwards needs an explanation of at least 10 characters in update_message.")

    was_delayed = order.is_delayed
    if data.delay_reason and data.is_delayed is False:
        raise _bad("delay_reason can only be given when is_delayed is true.")
    target = was_delayed if data.is_delayed is None else data.is_delayed
    reason = None
    if target:
        reason = (data.delay_reason or (order.delay_reason if was_delayed else None) or "").strip()
        if len(reason) < 5:
            raise _bad("A delayed order needs an explanation: provide delay_reason (at least 5 characters).")
    if new == OrderStatus.completed:  # a finished order is no longer delayed
        target, reason = False, None

    order.current_status, order.is_delayed, order.delay_reason = new, target, reason
    order.history.append(OrderStatusHistory(previous_status=current, new_status=new, update_message=data.update_message.strip(),
                                            internal_note=data.internal_note, is_delayed=target, delay_reason=reason, updated_by=actor.id))
    db.commit()

    if data.notify:
        if new != current and new == OrderStatus.completed:
            event = "order_completed"
        elif new != current and new == OrderStatus.ready_for_collection:
            event = "ready_for_collection"
        elif target and not was_delayed:
            event = "order_delayed"
        else:
            event = "status_changed"
        notify.notify_order_event(db, order, event, {"message": data.update_message.strip()})
    return get_order(db, order.id)


def revise_date(db: Session, order: Order, data: DateRevisionIn, actor: User) -> Order:
    if data.revised_date == order.estimated_completion_date:
        raise _bad("The revised date is the same as the current estimated completion date.")
    if data.revised_date < order.order_date:
        raise _bad("The revised date cannot be before the order date.")
    order.revisions.append(OrderDateRevision(previous_date=order.estimated_completion_date, revised_date=data.revised_date,
                                             reason=data.reason.strip(), changed_by=actor.id))
    order.estimated_completion_date = data.revised_date  # agreed_completion_date is never changed
    db.commit()
    if data.notify:
        notify.notify_order_event(db, order, "date_revised", {"reason": data.reason.strip()})
    return get_order(db, order.id)


def add_commitment(db: Session, order: Order, data: CommitmentCreate, actor: User) -> OrderCommitment:
    c = OrderCommitment(order_id=order.id, commitment_text=data.commitment_text.strip(), agreed_date=data.agreed_date,
                        due_date=data.due_date, status=CommitmentStatus.active, created_by=actor.id)
    db.add(c)
    db.commit()
    if data.notify:
        notify.notify_order_event(db, order, "commitment_added", {"commitment_text": c.commitment_text, "due_date": c.due_date})
    return c


def update_commitment(db: Session, order: Order, commitment_id: uuid.UUID, data: CommitmentPatch) -> OrderCommitment:
    c = db.scalar(select(OrderCommitment).where(OrderCommitment.id == commitment_id, OrderCommitment.order_id == order.id))
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Commitment not found.")
    changes = data.model_dump(exclude_unset=True, exclude={"notify"})
    if not changes:
        raise _bad("Nothing to update.")
    due_changed = "due_date" in changes and changes["due_date"] != c.due_date
    for k, v in changes.items():
        setattr(c, k, v.strip() if isinstance(v, str) else v)
    if due_changed and "status" not in changes and c.status == CommitmentStatus.active:
        c.status = CommitmentStatus.revised
    db.commit()
    if data.notify:
        notify.notify_order_event(db, order, "commitment_updated", {"commitment_text": c.commitment_text, "due_date": c.due_date})
    return c


def list_orders(db: Session, *, q: str | None, status_: OrderStatus | None, delayed: bool | None, sort_by: str, sort_dir: str,
                page: int, page_size: int) -> tuple[list[Order], int]:
    stmt = select(Order)
    if q:
        term = q.strip()
        stmt = stmt.where(Order.order_number.icontains(term, autoescape=True) | Order.customer_name.icontains(term, autoescape=True)
                          | Order.customer_phone.icontains(term, autoescape=True) | Order.customer_email.icontains(term, autoescape=True))
    if status_:
        stmt = stmt.where(Order.current_status == status_)
    if delayed is not None:
        stmt = stmt.where(Order.is_delayed == delayed)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    col = Order.estimated_completion_date if sort_by == "estimated_completion_date" else Order.created_at
    stmt = stmt.order_by(col.asc() if sort_dir == "asc" else col.desc(), Order.id).offset((page - 1) * page_size).limit(page_size)
    return list(db.scalars(stmt)), total


# ---------------- public tracking ----------------
def verify_tracking(db: Session, order_number: str, phone: str) -> Order | None:
    """Both values must belong to the same order. The phone comparison always runs and is constant-time,
    so the answer never reveals whether the order number exists."""
    order = db.scalar(select(Order).options(selectinload(Order.history), selectinload(Order.revisions), selectinload(Order.commitments))
                      .where(Order.order_number == order_number))
    stored = order.customer_phone if order else "+000000000000"
    ok = hmac.compare_digest(stored.encode(), phone.encode())
    return order if (order is not None and ok) else None


def build_tracking(order: Order) -> TrackingOut:
    cur_idx = STATUS_ORDER.index(order.current_status)
    stages = [{"status": s.value, "label": STATUS_LABELS[s],
               "state": "done" if i < cur_idx or (i == cur_idx and order.current_status == OrderStatus.completed) else "current" if i == cur_idx else "pending"}
              for i, s in enumerate(STATUS_ORDER)]
    history = sorted(order.history, key=lambda h: h.created_at)
    return TrackingOut(
        order_number=order.order_number, work_type=order.work_type, order_date=order.order_date,
        current_status=order.current_status, current_status_label=STATUS_LABELS[order.current_status], stages=stages,
        is_delayed=order.is_delayed, delay_reason=order.delay_reason if order.is_delayed else None,
        agreed_completion_date=order.agreed_completion_date, estimated_completion_date=order.estimated_completion_date,
        date_revised=bool(order.revisions), last_update=history[-1].created_at if history else None,
        progress=[TrackingProgress(status=h.new_status, status_label=STATUS_LABELS[h.new_status], message=h.update_message,
                                   is_delayed=h.is_delayed, date=h.created_at) for h in history],
        date_revisions=[TrackingRevision(previous_date=r.previous_date, revised_date=r.revised_date, reason=r.reason, date=r.created_at)
                        for r in sorted(order.revisions, key=lambda r: r.created_at)],
        commitments=[TrackingCommitment(commitment_text=c.commitment_text, agreed_date=c.agreed_date, due_date=c.due_date, status=c.status)
                     for c in sorted(order.commitments, key=lambda c: c.created_at)],
    )
