from urllib.parse import quote

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import get_settings
from app.utils.phone import normalize_phone

router = APIRouter(prefix="/site", tags=["site"])


class ContactInfo(BaseModel):
    business_name: str
    whatsapp_number: str
    whatsapp_link: str
    email: str
    address: str
    facebook_url: str


def whatsapp_link(number_e164: str, text: str | None = None) -> str:
    link = f"https://wa.me/{number_e164.lstrip('+')}"
    return f"{link}?text={quote(text)}" if text else link


@router.get("/contact", response_model=ContactInfo)
def contact_info():
    """Public business contact details, configured in the backend .env (so the frontend never hardcodes them)."""
    s = get_settings()
    wa = normalize_phone(s.BUSINESS_WHATSAPP)
    return ContactInfo(business_name=s.BUSINESS_NAME, whatsapp_number=wa,
                       whatsapp_link=whatsapp_link(wa, "Hello Auspak Interior, I would like to discuss an interior project."),
                       email=s.BUSINESS_EMAIL, address=s.BUSINESS_ADDRESS, facebook_url=s.BUSINESS_FACEBOOK_URL)
