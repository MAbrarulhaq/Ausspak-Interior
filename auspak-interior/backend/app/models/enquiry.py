import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import EnquiryStatus, enum_col


class Enquiry(Base):
    __tablename__ = "enquiries"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254))
    phone: Mapped[str] = mapped_column(String(30))
    work_type: Mapped[str] = mapped_column(String(100))
    selected_design_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("designs.id", ondelete="SET NULL"), nullable=True)
    order_number_reference: Mapped[str | None] = mapped_column(String(30), nullable=True)  # "question about my order"
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[EnquiryStatus] = mapped_column(enum_col(EnquiryStatus, "enquiry_status"), default=EnquiryStatus.new, index=True)
    attachment_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)  # lets the submitter add images later
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    attachments: Mapped[list["EnquiryAttachment"]] = relationship(back_populates="enquiry", order_by="EnquiryAttachment.created_at", cascade="all, delete-orphan")


class EnquiryAttachment(Base):
    __tablename__ = "enquiry_attachments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    enquiry_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("enquiries.id", ondelete="CASCADE"), index=True)
    image_url: Mapped[str] = mapped_column(Text)  # private storage key/URL; not publicly served
    original_filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(50))
    file_size: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    enquiry: Mapped[Enquiry] = relationship(back_populates="attachments")
