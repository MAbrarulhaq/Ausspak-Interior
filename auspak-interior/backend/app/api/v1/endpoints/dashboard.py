from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.permissions import StaffUser
from app.db.session import get_db
from app.models.design import Design
from app.models.enquiry import Enquiry
from app.models.enums import UserRole, DeliveryStatus, EnquiryStatus, OrderStatus, PublicationStatus
from app.models.notification import Notification
from app.models.order import Order
from app.schemas.notification import DashboardSummary

router = APIRouter(prefix="/admin/dashboard", tags=["dashboard (admin/staff)"])


@router.get("/summary", response_model=DashboardSummary)
def summary(user: StaffUser, db: Session = Depends(get_db)):
    by_status = {s.value: 0 for s in OrderStatus}
    for st, n in db.execute(select(Order.current_status, func.count()).group_by(Order.current_status)):
        by_status[st.value] = n
    count = lambda stmt: db.scalar(stmt) or 0
    full = user.role == UserRole.admin  # staff get a limited view: order and enquiry counts only
    return DashboardSummary(
        total_orders=sum(by_status.values()), orders_by_status=by_status, in_progress=by_status["in_progress"],
        delayed=count(select(func.count()).select_from(Order).where(Order.is_delayed.is_(True))),
        ready_for_collection=by_status["ready_for_collection"], completed=by_status["completed"],
        new_enquiries=count(select(func.count()).select_from(Enquiry).where(Enquiry.status == EnquiryStatus.new)),
        published_designs=count(select(func.count()).select_from(Design).where(Design.publication_status == PublicationStatus.published)) if full else None,
        draft_designs=count(select(func.count()).select_from(Design).where(Design.publication_status == PublicationStatus.draft)) if full else None,
        failed_notifications=count(select(func.count()).select_from(Notification).where(Notification.delivery_status == DeliveryStatus.failed)) if full else None,
    )
