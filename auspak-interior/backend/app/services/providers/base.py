from dataclasses import dataclass
from typing import Protocol

from app.models.enums import DeliveryStatus


@dataclass
class ProviderResult:
    status: DeliveryStatus  # sent (provider accepted it), failed, or not_sent (mock)
    provider_message_id: str | None = None
    error: str | None = None


class NotificationProvider(Protocol):
    """Implement `send` to add a new channel provider (for example the client's WhatsApp service)."""
    def send(self, recipient: str, subject: str | None, message: str) -> ProviderResult: ...
