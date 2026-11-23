import smtplib
import ssl
from email.message import EmailMessage
from email.utils import make_msgid

from app.core.config import get_settings
from app.models.enums import DeliveryStatus
from app.services.providers.base import ProviderResult


class MockEmailProvider:
    """Development fallback. Records the message but sends NOTHING."""
    def send(self, recipient: str, subject: str | None, message: str) -> ProviderResult:
        return ProviderResult(DeliveryStatus.not_sent, error="Mock email provider: the message was recorded but NOT sent.")


class SMTPEmailProvider:
    """Sends through any SMTP server (host, port and credentials come from environment variables).
    'sent' means the SMTP server accepted the message for delivery; it is not a read receipt."""
    def send(self, recipient: str, subject: str | None, message: str) -> ProviderResult:
        s = get_settings()
        if not s.SMTP_HOST:
            return ProviderResult(DeliveryStatus.failed, error="SMTP_HOST is not configured.")
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = s.EMAIL_FROM, recipient, subject or "Update from Auspak Interior"
        msg_id = make_msgid(domain="auspak.local")
        msg["Message-ID"] = msg_id
        msg.set_content(message)
        try:
            if s.SMTP_USE_SSL:
                server = smtplib.SMTP_SSL(s.SMTP_HOST, s.SMTP_PORT, timeout=s.SMTP_TIMEOUT_SECONDS, context=ssl.create_default_context())
            else:
                server = smtplib.SMTP(s.SMTP_HOST, s.SMTP_PORT, timeout=s.SMTP_TIMEOUT_SECONDS)
            with server:
                if s.SMTP_USE_STARTTLS and not s.SMTP_USE_SSL:
                    server.starttls(context=ssl.create_default_context())
                if s.SMTP_USERNAME:
                    server.login(s.SMTP_USERNAME, s.SMTP_PASSWORD)
                refused = server.send_message(msg)
            if refused:
                return ProviderResult(DeliveryStatus.failed, error=f"Recipient refused by server: {refused}")
            return ProviderResult(DeliveryStatus.sent, provider_message_id=msg_id)
        except Exception as exc:  # network, TLS, auth... never crash the caller
            return ProviderResult(DeliveryStatus.failed, error=f"{type(exc).__name__}: {exc}"[:500])
