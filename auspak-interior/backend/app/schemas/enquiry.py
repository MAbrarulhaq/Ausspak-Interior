import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import EnquiryStatus
from app.utils.phone import normalize_phone


class EnquiryIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str
    work_type: str = Field(min_length=2, max_length=100)
    description: str = Field(min_length=10, max_length=4000)
    selected_design_id: uuid.UUID | None = None
    order_number: str | None = Field(default=None, max_length=30, description="Fill in when the question is about an existing order")

    @field_validator("full_name", "work_type", "description")
    @classmethod
    def strip(cls, v: str) -> str:
        return v.strip()

    @field_validator("email")
    @classmethod
    def lower(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        return normalize_phone(v)

    @field_validator("order_number")
    @classmethod
    def clean_order_number(cls, v: str | None) -> str | None:
        return v.strip().upper() or None if v else None


class AttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    original_filename: str
    content_type: str
    file_size: int
    created_at: datetime


class EnquiryCreated(BaseModel):
    id: uuid.UUID
    status: EnquiryStatus
    attachments: list[AttachmentOut]
    attachment_token: str = Field(description="Shown once. Send it as the X-Enquiry-Token header to add more images to this enquiry.")
    message: str = "Enquiry received. We will contact you soon."


class AdminEnquiry(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID | None
    full_name: str
    email: str
    phone: str
    work_type: str
    selected_design_id: uuid.UUID | None
    order_number_reference: str | None
    description: str
    status: EnquiryStatus
    created_at: datetime
    updated_at: datetime
    attachments: list[AttachmentOut]


class EnquiryPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: EnquiryStatus
