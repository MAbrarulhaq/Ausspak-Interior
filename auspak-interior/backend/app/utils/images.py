"""Validates uploaded images by inspecting their actual content (not just the filename or MIME header)."""
import io
from dataclasses import dataclass

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError

from app.core.config import get_settings

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
FORMAT_INFO = {"JPEG": ("jpg", "image/jpeg"), "PNG": ("png", "image/png"), "WEBP": ("webp", "image/webp")}
EXT_TO_FORMAT = {"jpg": "JPEG", "jpeg": "JPEG", "png": "PNG", "webp": "WEBP"}
ACCEPT_MESSAGE = "Only JPG, JPEG, PNG and WebP images are accepted."


@dataclass
class ValidatedImage:
    ext: str
    content_type: str
    width: int
    height: int
    size: int


def validate_image(data: bytes, filename: str | None) -> ValidatedImage:
    s = get_settings()
    if not data:
        raise HTTPException(422, "The uploaded file is empty.")
    if len(data) > s.MAX_IMAGE_BYTES:
        raise HTTPException(413, f"Each image must be at most {s.MAX_IMAGE_BYTES // (1024 * 1024)} MB.")
    claimed_ext = (filename or "").rsplit(".", 1)[-1].lower() if "." in (filename or "") else ""
    if claimed_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(422, ACCEPT_MESSAGE)
    Image.MAX_IMAGE_PIXELS = s.MAX_IMAGE_PIXELS
    try:
        with Image.open(io.BytesIO(data)) as img:
            fmt, (w, h) = img.format, img.size
            img.verify()  # detects truncated/corrupt files
    except (UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning, OSError, SyntaxError, ValueError):
        raise HTTPException(422, "The file is not a valid image.")
    if fmt not in FORMAT_INFO:
        raise HTTPException(422, ACCEPT_MESSAGE)
    if EXT_TO_FORMAT[claimed_ext] != fmt:
        raise HTTPException(422, "The file content does not match its file extension.")
    ext, content_type = FORMAT_INFO[fmt]
    return ValidatedImage(ext=ext, content_type=content_type, width=w, height=h, size=len(data))
