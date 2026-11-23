from app.core.config import get_settings
from app.models.enums import NotificationChannel
from app.services.providers.base import NotificationProvider
from app.services.providers.email import MockEmailProvider, SMTPEmailProvider
from app.services.providers.whatsapp import MockWhatsAppProvider

EMAIL_PROVIDERS = {"mock": MockEmailProvider, "smtp": SMTPEmailProvider}
WHATSAPP_PROVIDERS = {"mock": MockWhatsAppProvider}  # add the client's provider here when known


def get_provider(channel: NotificationChannel) -> NotificationProvider:
    s = get_settings()
    registry, name = (EMAIL_PROVIDERS, s.EMAIL_PROVIDER) if channel == NotificationChannel.email else (WHATSAPP_PROVIDERS, s.WHATSAPP_PROVIDER)
    if name not in registry:
        raise ValueError(f"Unknown {channel.value} provider '{name}'. Available: {', '.join(registry)}")
    return registry[name]()
