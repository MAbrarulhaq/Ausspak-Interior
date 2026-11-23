import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.models.enums import DeliveryStatus, NotificationChannel


class NotificationAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID | None
    order_id: uuid.UUID | None
    notification_type: str
    channel: NotificationChannel
    recipient: str
    subject: str | None
    message: str
    delivery_status: DeliveryStatus
    provider_message_id: str | None
    error_message: str | None
    sent_at: datetime | None
    created_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def whatsapp_link(self) -> str | None:
        """Click-to-chat link with the message prefilled. Staff can open it on the business WhatsApp to send the message manually."""
        if self.channel != NotificationChannel.whatsapp:
            return None
        from app.api.v1.endpoints.site import whatsapp_link
        return whatsapp_link(self.recipient, self.message)


class NotificationCustomerOut(BaseModel):
    """What a customer sees about their own notifications (no provider internals)."""
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    notification_type: str
    channel: NotificationChannel
    subject: str | None
    message: str
    created_at: datetime


class ManualNotify(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(min_length=3, max_length=1000, description="Customer-visible text added to the update")
    channels: list[NotificationChannel] | None = None


class DashboardSummary(BaseModel):
    total_orders: int
    orders_by_status: dict[str, int]
    in_progress: int
    delayed: int
    ready_for_collection: int
    completed: int
    new_enquiries: int
    # Admin-only figures (null for staff, who get a limited dashboard)
    published_designs: int | None = None
    draft_designs: int | None = None
    failed_notifications: int | None = None
