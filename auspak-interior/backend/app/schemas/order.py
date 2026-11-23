import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models.enums import CommitmentStatus, OrderStatus
from app.utils.phone import normalize_phone



class OrderCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    customer_name: str = Field(min_length=2, max_length=120)
    customer_phone: str
    customer_email: EmailStr | None = None
    work_type: str = Field(min_length=2, max_length=100)
    description: str = Field(min_length=3, max_length=4000)
    order_date: date | None = None
    agreed_completion_date: date
    estimated_completion_date: date | None = None
    current_status: OrderStatus = OrderStatus.order_received  # existing orders can be entered at any stage
    initial_message: str | None = Field(default=None, max_length=1000)  # customer-visible note for the first history entry
    customer_id: uuid.UUID | None = None
    enquiry_id: uuid.UUID | None = None
    notify: bool = True

    @field_validator("customer_phone")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        return normalize_phone(v)

    @field_validator("customer_email")
    @classmethod
    def lower_email(cls, v):
        return v.lower() if v else v

    @model_validator(mode="after")
    def check_dates(self):
        od = self.order_date or date.today()
        if self.agreed_completion_date < od:
            raise ValueError("agreed_completion_date cannot be before the order date.")
        if self.estimated_completion_date and self.estimated_completion_date < od:
            raise ValueError("estimated_completion_date cannot be before the order date.")
        return self


class OrderPatch(BaseModel):
    """Contact/description corrections only. Status and dates have their own endpoints so they are always recorded."""
    model_config = ConfigDict(extra="forbid")

    customer_name: str | None = Field(default=None, min_length=2, max_length=120)
    customer_phone: str | None = None
    customer_email: EmailStr | None = None
    work_type: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = Field(default=None, min_length=3, max_length=4000)
    customer_id: uuid.UUID | None = None

    @field_validator("customer_phone")
    @classmethod
    def clean_phone(cls, v):
        return normalize_phone(v) if v else v


class StatusChange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    new_status: OrderStatus | None = None  # omit to post a progress note without changing the stage
    update_message: str = Field(min_length=3, max_length=2000)  # customer-visible explanation
    is_delayed: bool | None = None  # omit to leave the delay flag unchanged
    delay_reason: str | None = Field(default=None, max_length=2000)
    internal_note: str | None = Field(default=None, max_length=2000)  # staff only
    notify: bool = True


class DateRevisionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    revised_date: date
    reason: str = Field(min_length=5, max_length=2000)
    notify: bool = True


class CommitmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    commitment_text: str = Field(min_length=3, max_length=2000)
    agreed_date: date
    due_date: date | None = None
    notify: bool = True


class CommitmentPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    commitment_text: str | None = Field(default=None, min_length=3, max_length=2000)
    due_date: date | None = None
    status: CommitmentStatus | None = None
    notify: bool = True


class HistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    previous_status: OrderStatus | None
    new_status: OrderStatus
    update_message: str
    internal_note: str | None
    is_delayed: bool
    delay_reason: str | None
    updated_by: uuid.UUID | None
    created_at: datetime


class RevisionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    previous_date: date
    revised_date: date
    reason: str
    changed_by: uuid.UUID | None
    created_at: datetime


class CommitmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    commitment_text: str
    agreed_date: date
    due_date: date | None
    status: CommitmentStatus
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class OrderListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_number: str
    customer_name: str
    customer_phone: str
    work_type: str
    current_status: OrderStatus
    is_delayed: bool
    order_date: date
    agreed_completion_date: date
    estimated_completion_date: date
    created_at: datetime
    updated_at: datetime


class OrderDetail(OrderListItem):
    customer_email: str | None
    customer_id: uuid.UUID | None
    enquiry_id: uuid.UUID | None
    description: str
    delay_reason: str | None
    created_by: uuid.UUID | None
    history: list[HistoryOut]
    revisions: list[RevisionOut]
    commitments: list[CommitmentOut]


class HistoryBundle(BaseModel):
    status_history: list[HistoryOut]
    date_revisions: list[RevisionOut]
    commitments: list[CommitmentOut]


# ---- public tracking (customer-safe) ----
class TrackingRequest(BaseModel):
    order_number: str = Field(min_length=1, max_length=30)
    phone: str

    @field_validator("order_number")
    @classmethod
    def clean_number(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        return normalize_phone(v)


class TrackingProgress(BaseModel):
    status: OrderStatus
    status_label: str
    message: str
    is_delayed: bool
    date: datetime


class TrackingRevision(BaseModel):
    previous_date: date
    revised_date: date
    reason: str
    date: datetime


class TrackingCommitment(BaseModel):
    commitment_text: str
    agreed_date: date
    due_date: date | None
    status: CommitmentStatus


class TrackingOut(BaseModel):
    """Everything here is safe to show to the customer. No internal IDs, staff details or internal notes."""
    order_number: str
    work_type: str
    order_date: date
    current_status: OrderStatus
    current_status_label: str
    stages: list[dict]
    is_delayed: bool
    delay_reason: str | None
    agreed_completion_date: date
    estimated_completion_date: date
    date_revised: bool
    last_update: datetime | None
    progress: list[TrackingProgress]
    date_revisions: list[TrackingRevision]
    commitments: list[TrackingCommitment]
