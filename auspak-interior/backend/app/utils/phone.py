"""Phone normalization to E.164 (+923001234567). Used for orders, notifications and tracking verification."""
import re

from app.core.config import get_settings

_E164 = re.compile(r"^\+\d{9,15}$")


def normalize_phone(raw: str) -> str:
    """Accepts 0300 1234567, +92 300 1234567, 923001234567, 0092 300 1234567 and returns +923001234567.
    Raises ValueError when the result is not a plausible international number."""
    cleaned = re.sub(r"[\s\-().]", "", raw or "")
    if not cleaned:
        raise ValueError("Phone number is required.")
    cc = get_settings().DEFAULT_COUNTRY_CODE
    if cleaned.startswith("00"):
        cleaned = "+" + cleaned[2:]
    elif cleaned.startswith("+"):
        pass
    elif cleaned.startswith("0"):
        cleaned = f"+{cc}{cleaned[1:]}"
    elif cleaned.startswith(cc) and len(cleaned) >= len(cc) + 9:
        cleaned = "+" + cleaned
    else:
        cleaned = "+" + cleaned
    if not _E164.match(cleaned):
        raise ValueError("Enter a valid phone number, for example 0300 1234567.")
    return cleaned
