import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import StaffUser
from app.db.session import get_db
from app.models.enquiry import Enquiry, EnquiryAttachment
from app.models.enums import EnquiryStatus
from app.schemas.common import Page
from app.schemas.enquiry import AdminEnquiry, EnquiryPatch
from app.services import enquiry_service as svc
from app.services.storage_service import get_storage

router = APIRouter(prefix="/admin/enquiries", tags=["enquiries (admin/staff)"])


@router.get("", response_model=Page[AdminEnquiry])
def list_enquiries(user: StaffUser, db: Session = Depends(get_db), status_filter: EnquiryStatus | None = Query(None, alias="status"),
                   q: str | None = Query(None, max_length=100), page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    stmt = select(Enquiry).options(selectinload(Enquiry.attachments))
    if status_filter:
        stmt = stmt.where(Enquiry.status == status_filter)
    if q:
        t = q.strip()
        stmt = stmt.where(Enquiry.full_name.icontains(t, autoescape=True) | Enquiry.email.icontains(t, autoescape=True)
                          | Enquiry.phone.icontains(t, autoescape=True) | Enquiry.description.icontains(t, autoescape=True))
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).with_only_columns(Enquiry.id).subquery())) or 0
    rows = list(db.scalars(stmt.order_by(Enquiry.created_at.desc(), Enquiry.id).offset((page - 1) * page_size).limit(page_size)))
    return Page(items=rows, total=total, page=page, page_size=page_size)


@router.get("/{enquiry_id}", response_model=AdminEnquiry)
def get_enquiry(enquiry_id: uuid.UUID, user: StaffUser, db: Session = Depends(get_db)):
    return svc.get_enquiry_or_404(db, enquiry_id)


@router.patch("/{enquiry_id}", response_model=AdminEnquiry)
def update_enquiry(enquiry_id: uuid.UUID, payload: EnquiryPatch, user: StaffUser, db: Session = Depends(get_db)):
    e = svc.get_enquiry_or_404(db, enquiry_id)
    e.status = payload.status
    db.commit()
    return e


@router.get("/{enquiry_id}/attachments/{attachment_id}/file", summary="Download a reference image (staff only)")
def download_attachment(enquiry_id: uuid.UUID, attachment_id: uuid.UUID, user: StaffUser, db: Session = Depends(get_db)):
    """Reference images are private: they are only available here, to logged-in staff."""
    a = db.scalar(select(EnquiryAttachment).where(EnquiryAttachment.id == attachment_id, EnquiryAttachment.enquiry_id == enquiry_id))
    if a is None:
        raise HTTPException(404, "Attachment not found.")
    try:
        data = get_storage().read(a.image_url)
    except (FileNotFoundError, ValueError):
        raise HTTPException(404, "The file is no longer available.")
    return Response(content=data, media_type=a.content_type,
                    headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline"})
