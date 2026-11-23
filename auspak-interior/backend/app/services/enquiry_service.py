import hmac
import uuid

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import sha256_hex
from app.models.enquiry import Enquiry, EnquiryAttachment
from app.services.storage_service import get_storage
from app.utils.images import ValidatedImage, validate_image


async def read_and_validate(files: list[UploadFile], existing_count: int = 0, existing_bytes: int = 0) -> list[tuple[bytes, str, ValidatedImage]]:
    """Validates EVERY file before anything is stored, so a bad file means nothing is saved."""
    s = get_settings()
    real = [f for f in files if f.filename]  # ignore empty file inputs
    if existing_count + len(real) > s.MAX_ENQUIRY_IMAGES:
        raise HTTPException(422, f"At most {s.MAX_ENQUIRY_IMAGES} reference images are allowed per enquiry.")
    out, total = [], existing_bytes
    for f in real:
        data = await f.read(s.MAX_IMAGE_BYTES + 1)
        info = validate_image(data, f.filename)
        total += info.size
        if total > s.MAX_ENQUIRY_TOTAL_BYTES:
            raise HTTPException(413, f"Reference images may total at most {s.MAX_ENQUIRY_TOTAL_BYTES // (1024 * 1024)} MB per enquiry.")
        out.append((data, f.filename, info))
    return out


def store_attachments(db: Session, enquiry: Enquiry, validated: list[tuple[bytes, str, ValidatedImage]]) -> list[EnquiryAttachment]:
    storage, rows = get_storage(), []
    for data, filename, info in validated:
        stored = storage.save(data, f"enquiries/{enquiry.id}", info.ext, private=True)  # private: never publicly served
        safe_name = filename.replace("\\", "/").rsplit("/", 1)[-1][:255]
        row = EnquiryAttachment(enquiry_id=enquiry.id, image_url=stored.key, original_filename=safe_name, content_type=info.content_type, file_size=info.size)
        db.add(row)
        rows.append(row)
    return rows


def verify_token(enquiry: Enquiry, token: str | None) -> bool:
    if not token or not enquiry.attachment_token_hash:
        return False
    return hmac.compare_digest(enquiry.attachment_token_hash, sha256_hex(token))


def get_enquiry_or_404(db: Session, enquiry_id: uuid.UUID) -> Enquiry:
    e = db.scalar(select(Enquiry).where(Enquiry.id == enquiry_id))
    if e is None:
        raise HTTPException(404, "Enquiry not found.")
    return e
