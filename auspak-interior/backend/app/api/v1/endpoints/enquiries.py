import uuid

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.permissions import OptionalUser, client_ip
from app.core.security import new_secret_token, sha256_hex
from app.db.session import get_db
from app.models.design import Design
from app.models.enquiry import Enquiry
from app.models.enums import PublicationStatus
from app.schemas.enquiry import AttachmentOut, EnquiryCreated, EnquiryIn
from app.services import enquiry_service as svc
from app.utils.ratelimit import limiter

router = APIRouter(prefix="/enquiries", tags=["enquiries (public)"])


def enquiry_form(full_name: str = Form(...), email: str = Form(...), phone: str = Form(...), work_type: str = Form(...),
                 description: str = Form(...), selected_design_id: str | None = Form(None), order_number: str | None = Form(None)) -> EnquiryIn:
    try:
        return EnquiryIn(full_name=full_name, email=email, phone=phone, work_type=work_type, description=description,
                         selected_design_id=selected_design_id or None, order_number=order_number or None)
    except ValidationError as exc:
        raise RequestValidationError(exc.errors())


@router.post("", response_model=EnquiryCreated, status_code=status.HTTP_201_CREATED)
async def submit_enquiry(request: Request, user: OptionalUser, data: EnquiryIn = Depends(enquiry_form),
                         files: list[UploadFile] = File(default=[], description="Up to 5 reference images (JPG, JPEG, PNG, WebP; 5 MB each)"),
                         db: Session = Depends(get_db)):
    """Guests can submit without an account (multipart/form-data). Also use this for 'a question about my order'
    by filling `order_number`. All images are validated before anything is saved."""
    s = get_settings()
    limiter.check(f"enquiry:{client_ip(request)}", s.ENQUIRY_RATE_LIMIT, s.ENQUIRY_RATE_WINDOW_SECONDS)
    if data.selected_design_id:
        d = db.get(Design, data.selected_design_id)
        if d is None or d.publication_status != PublicationStatus.published:
            raise HTTPException(422, "selected_design_id does not match a published design.")
    validated = await svc.read_and_validate(files)
    token = new_secret_token()
    enquiry = Enquiry(user_id=user.id if user and user.role.value == "customer" else None, full_name=data.full_name, email=data.email, phone=data.phone,
                      work_type=data.work_type, selected_design_id=data.selected_design_id, order_number_reference=data.order_number,
                      description=data.description, attachment_token_hash=sha256_hex(token))
    db.add(enquiry)
    db.flush()
    rows = svc.store_attachments(db, enquiry, validated)
    db.commit()
    return EnquiryCreated(id=enquiry.id, status=enquiry.status, attachments=[AttachmentOut.model_validate(r) for r in rows], attachment_token=token)


@router.post("/{enquiry_id}/attachments", response_model=list[AttachmentOut], status_code=status.HTTP_201_CREATED)
async def add_attachments(enquiry_id: uuid.UUID, files: list[UploadFile] = File(...), x_enquiry_token: str | None = Header(None),
                          db: Session = Depends(get_db)):
    """Add reference images later. Requires the X-Enquiry-Token returned when the enquiry was created."""
    enquiry = db.get(Enquiry, enquiry_id)
    if enquiry is None or not svc.verify_token(enquiry, x_enquiry_token):
        raise HTTPException(404, "Enquiry not found.")  # same answer for a wrong id or a wrong token
    existing = enquiry.attachments
    validated = await svc.read_and_validate(files, len(existing), sum(a.file_size for a in existing))
    if not validated:
        raise HTTPException(422, "No image was uploaded.")
    rows = svc.store_attachments(db, enquiry, validated)
    db.commit()
    return rows
