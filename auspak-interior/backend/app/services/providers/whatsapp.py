from app.models.enums import DeliveryStatus
from app.services.providers.base import ProviderResult


class MockWhatsAppProvider:
    """Records the message but sends NOTHING automatically (no WhatsApp Business API is configured).
    Staff can send it by hand using the `whatsapp_link` shown in the admin notification list.
    The client's real WhatsApp integration is not known yet: add a class with the same `send` method
    (see providers/base.py) and register it in providers/__init__.py."""
    def send(self, recipient: str, subject: str | None, message: str) -> ProviderResult:
        return ProviderResult(DeliveryStatus.not_sent, error="WhatsApp is not automated yet: the message was recorded but NOT sent automatically. Use the whatsapp_link to send it manually.")
