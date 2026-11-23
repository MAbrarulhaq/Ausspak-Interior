import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.permissions import StaffUser
from app.db.session import get_db
from app.models.enums import OrderStatus
from app.schemas.common import Page
from app.schemas.order import (CommitmentCreate, CommitmentOut, CommitmentPatch, DateRevisionIn, HistoryBundle, OrderCreate,
                               OrderDetail, OrderListItem, OrderPatch, StatusChange)
from app.services import order_service as svc

router = APIRouter(prefix="/orders", tags=["orders (admin/staff)"])


@router.post("", response_model=OrderDetail, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, user: StaffUser, db: Session = Depends(get_db)):
    """Create the official order (after an enquiry, or to add an existing order manually at any stage)."""
    return svc.create_order(db, payload, user)


@router.get("", response_model=Page[OrderListItem])
def list_orders(user: StaffUser, db: Session = Depends(get_db),
                q: str | None = Query(None, max_length=100, description="Search order number, customer name, phone or email"),
                status_filter: OrderStatus | None = Query(None, alias="status"),
                is_delayed: bool | None = None,
                sort_by: Literal["created_at", "estimated_completion_date"] = "created_at",
                sort_dir: Literal["asc", "desc"] = "desc",
                page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    items, total = svc.list_orders(db, q=q, status_=status_filter, delayed=is_delayed, sort_by=sort_by, sort_dir=sort_dir, page=page, page_size=page_size)
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/{order_id}", response_model=OrderDetail)
def get_order(order_id: uuid.UUID, user: StaffUser, db: Session = Depends(get_db)):
    return svc.get_order(db, order_id)


@router.patch("/{order_id}", response_model=OrderDetail)
def edit_order(order_id: uuid.UUID, payload: OrderPatch, user: StaffUser, db: Session = Depends(get_db)):
    return svc.update_order(db, svc.get_order(db, order_id), payload)


@router.post("/{order_id}/status", response_model=OrderDetail)
def add_status_update(order_id: uuid.UUID, payload: StatusChange, user: StaffUser, db: Session = Depends(get_db)):
    """Change the stage and/or post a progress note. Every call is stored in the history."""
    return svc.change_status(db, svc.get_order(db, order_id), payload, user)


@router.post("/{order_id}/revise-date", response_model=OrderDetail)
def revise_completion_date(order_id: uuid.UUID, payload: DateRevisionIn, user: StaffUser, db: Session = Depends(get_db)):
    """Changes the ESTIMATED date. The original agreed date is preserved and every revision is recorded."""
    return svc.revise_date(db, svc.get_order(db, order_id), payload, user)


@router.post("/{order_id}/commitments", response_model=CommitmentOut, status_code=status.HTTP_201_CREATED)
def add_commitment(order_id: uuid.UUID, payload: CommitmentCreate, user: StaffUser, db: Session = Depends(get_db)):
    return svc.add_commitment(db, svc.get_order(db, order_id), payload, user)


@router.patch("/{order_id}/commitments/{commitment_id}", response_model=CommitmentOut)
def update_commitment(order_id: uuid.UUID, commitment_id: uuid.UUID, payload: CommitmentPatch, user: StaffUser, db: Session = Depends(get_db)):
    return svc.update_commitment(db, svc.get_order(db, order_id), commitment_id, payload)


@router.get("/{order_id}/history", response_model=HistoryBundle)
def order_history(order_id: uuid.UUID, user: StaffUser, db: Session = Depends(get_db)):
    o = svc.get_order(db, order_id)
    return HistoryBundle(status_history=o.history, date_revisions=o.revisions, commitments=o.commitments)
