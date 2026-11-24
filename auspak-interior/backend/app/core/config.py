from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENVIRONMENT: str = "development"  # development | test | production
    DATABASE_URL: str = "postgresql+psycopg://neondb_owner:npg_TZ*******4@ep-steep-brook-biiwee7j-pooler.c-5.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    FRONTEND_URL: str = "https://ausspak-interior.vercel.app/track-order"

    # Business contact details (public; returned by GET /api/v1/site/contact so the frontend does not hardcode them)
    BUSINESS_NAME: str = "Auspak Interior"
    BUSINESS_WHATSAPP: str = "03003822377"
    BUSINESS_EMAIL: str = "arrianhbk@gmail.com"
    BUSINESS_ADDRESS: str = "Main Service Road, Golra Road, opposite G-11/1, Street #1, Islamabad, Pakistan"
    BUSINESS_FACEBOOK_URL: str = "https://www.facebook.com/share/1coqzjSSu7/?mibextid=wwXIfr"

    # Auth. JWT_SECRET has NO default on purpose: the app will not start without one.
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Storage (local disk now; the StorageService interface is ready for an S3/R2 implementation)
    STORAGE_BACKEND: str = "local"
    STORAGE_DIR: str = "./storage"
    MEDIA_URL: str = "/media"
    MAX_IMAGE_BYTES: int = 5 * 1024 * 1024
    MAX_ENQUIRY_IMAGES: int = 5
    MAX_ENQUIRY_TOTAL_BYTES: int = 25 * 1024 * 1024
    MAX_IMAGE_PIXELS: int = 40_000_000

    # Phone handling
    DEFAULT_COUNTRY_CODE: str = "92"

    # Notifications. "mock" records the message but does NOT send anything.
    EMAIL_PROVIDER: str = "mock"  # mock | smtp
    WHATSAPP_PROVIDER: str = "mock"  # mock (real provider to be added once the client's integration is known)
    EMAIL_FROM: str = "Auspak Interior <no-reply@example.invalid>"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_STARTTLS: bool = True
    SMTP_USE_SSL: bool = False
    SMTP_TIMEOUT_SECONDS: int = 8

    # Rate limits (attempts per window, per client IP)
    TRACK_RATE_LIMIT: int = 10
    TRACK_RATE_WINDOW_SECONDS: int = 300
    LOGIN_RATE_LIMIT: int = 10
    LOGIN_RATE_WINDOW_SECONDS: int = 300
    SIGNUP_RATE_LIMIT: int = 10
    SIGNUP_RATE_WINDOW_SECONDS: int = 3600
    ENQUIRY_RATE_LIMIT: int = 10
    ENQUIRY_RATE_WINDOW_SECONDS: int = 3600

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def storage_path(self) -> Path:
        return Path(self.STORAGE_DIR).resolve()

    @model_validator(mode="after")
    def check_secret(self):
        if len(self.JWT_SECRET) < 32 or self.JWT_SECRET.lower().startswith("change-me"):
            raise ValueError("JWT_SECRET must be a random string of at least 32 characters. "
                             'Generate one with: python -c "import secrets; print(secrets.token_urlsafe(48))"')
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
