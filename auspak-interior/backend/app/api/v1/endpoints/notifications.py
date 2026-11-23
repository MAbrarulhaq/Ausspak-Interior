import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.permissions import CustomerUser, StaffUser
from app.db.session import get_db
from app.models.enums import DeliveryStatus, NotificationChannel
from app.models.notification import Notification
from app.schemas.common import Page
from app.schemas.notification import ManualNotify, NotificationAdminOut, NotificationCustomerOut
from app.services import notification_service as svc
from app.services import order_service

router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=Page[NotificationCustomerOut], summary="My notifications (customer)")
def my_notifications(user: CustomerUser, db: Session = Depends(get_db), page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    """Notifications for orders linked to the logged-in customer account."""
    stmt = select(Notification).where(Notification.user_id == user.id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(db.scalars(stmt.order_by(Notification.created_at.desc(), Notification.id).offset((page - 1) * page_size).limit(page_size)))
    return Page(items=rows, total=total, page=page, page_size=page_size)


@router.get("/admin/notifications", response_model=Page[NotificationAdminOut], tags=["notifications (admin/staff)"])
def admin_notifications(user: StaffUser, db: Session = Depends(get_db), delivery_status: DeliveryStatus | None = None,
                        channel: NotificationChannel | None = None, order_id: uuid.UUID | None = None,
                        notification_type: str | None = Query(None, max_length=50), page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    stmt = select(Notification)
    if delivery_status:
        stmt = stmt.where(Notification.delivery_status == delivery_status)
    if channel:
        stmt = stmt.where(Notification.channel == channel)
    if order_id:
        stmt = stmt.where(Notification.order_id == order_id)
    if notification_type:
        stmt = stmt.where(Notification.notification_type == notification_type)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(db.scalars(stmt.order_by(Notification.created_at.desc(), Notification.id).offset((page - 1) * page_size).limit(page_size)))
    return Page(items=rows, total=total, page=page, page_size=page_size)


@router.post("/admin/notifications/{notification_id}/retry", response_model=NotificationAdminOut, tags=["notifications (admin/staff)"])
def retry_notification(notification_id: uuid.UUID, user: StaffUser, db: Session = Depends(get_db)):
    """Try delivering a failed / not-sent notification again with the currently configured provider."""
    n = svc.retry(db, notification_id)
    if n is None:
        raise HTTPException(404, "Notification not found.")
    return n


@router.post("/admin/orders/{order_id}/notify", response_model=list[NotificationAdminOut], tags=["notifications (admin/staff)"])
def manual_notify(order_id: uuid.UUID, payload: ManualNotify, user: StaffUser, db: Session = Depends(get_db)):
    """Send a manual update to the customer of an order (email and/or WhatsApp)."""
    order = order_service.get_order(db, order_id)
    return svc.notify_order_event(db, order, "manual_update", {"message": payload.message.strip()}, payload.channels)
