import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import CommitmentStatus, OrderStatus, enum_col


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    order_number: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    customer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    enquiry_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("enquiries.id", ondelete="SET NULL"), nullable=True)
    customer_name: Mapped[str] = mapped_column(String(120))
    customer_phone: Mapped[str] = mapped_column(String(30), index=True)  # normalized E.164
    customer_email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    work_type: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    order_date: Mapped[date] = mapped_column(Date)
    agreed_completion_date: Mapped[date] = mapped_column(Date)  # never changes after creation
    estimated_completion_date: Mapped[date] = mapped_column(Date)  # current expectation; changes are recorded
    current_status: Mapped[OrderStatus] = mapped_column(enum_col(OrderStatus, "order_status"), default=OrderStatus.order_received)
    is_delayed: Mapped[bool] = mapped_column(Boolean, default=False)
    delay_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    history: Mapped[list["OrderStatusHistory"]] = relationship(back_populates="order", order_by="OrderStatusHistory.created_at", cascade="all, delete-orphan")
    revisions: Mapped[list["OrderDateRevision"]] = relationship(back_populates="order", order_by="OrderDateRevision.created_at", cascade="all, delete-orphan")
    commitments: Mapped[list["OrderCommitment"]] = relationship(back_populates="order", order_by="OrderCommitment.created_at", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_orders_status_delayed", "current_status", "is_delayed"),)


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    previous_status: Mapped[OrderStatus | None] = mapped_column(enum_col(OrderStatus, "order_status_prev"), nullable=True)
    new_status: Mapped[OrderStatus] = mapped_column(enum_col(OrderStatus, "order_status_new"))
    update_message: Mapped[str] = mapped_column(Text)  # customer-visible
    internal_note: Mapped[str | None] = mapped_column(Text, nullable=True)  # staff only, never shown to customers
    is_delayed: Mapped[bool] = mapped_column(Boolean, default=False)  # delay flag at the time of this update
    delay_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order: Mapped[Order] = relationship(back_populates="history")


class OrderDateRevision(Base):
    __tablename__ = "order_date_revisions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    previous_date: Mapped[date] = mapped_column(Date)
    revised_date: Mapped[date] = mapped_column(Date)
    reason: Mapped[str] = mapped_column(Text)
    changed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order: Mapped[Order] = relationship(back_populates="revisions")


class OrderCommitment(Base):
    __tablename__ = "order_commitments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    commitment_text: Mapped[str] = mapped_column(Text)
    agreed_date: Mapped[date] = mapped_column(Date)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[CommitmentStatus] = mapped_column(enum_col(CommitmentStatus, "commitment_status"), default=CommitmentStatus.active)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    order: Mapped[Order] = relationship(back_populates="commitments")
