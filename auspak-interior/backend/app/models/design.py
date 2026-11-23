import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid, false, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PublicationStatus, enum_col


class DesignCategory(Base):
    __tablename__ = "design_categories"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    designs: Mapped[list["Design"]] = relationship(back_populates="category")


class Design(Base):
    __tablename__ = "designs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("design_categories.id", ondelete="RESTRICT"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text)
    style: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    is_demonstration: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())  # sample content, not a real Auspak project
    publication_status: Mapped[PublicationStatus] = mapped_column(enum_col(PublicationStatus, "publication_status"), default=PublicationStatus.draft, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category: Mapped[DesignCategory] = relationship(back_populates="designs")
    images: Mapped[list["DesignImage"]] = relationship(back_populates="design", order_by="DesignImage.display_order", cascade="all, delete-orphan")


class DesignImage(Base):
    __tablename__ = "design_images"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    design_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("designs.id", ondelete="CASCADE"), index=True)
    image_url: Mapped[str] = mapped_column(Text)
    storage_key: Mapped[str | None] = mapped_column(String(300), nullable=True)
    alt_text: Mapped[str] = mapped_column(String(200), default="")
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    design: Mapped[Design] = relationship(back_populates="images")


class Favourite(Base):
    __tablename__ = "favourites"
    __table_args__ = (UniqueConstraint("user_id", "design_id", name="uq_favourite_user_design"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    design_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("designs.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
