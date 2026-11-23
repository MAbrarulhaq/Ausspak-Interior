"""File storage abstraction. Local disk now; to use Cloudflare R2 / any S3-compatible service later, add a class with
the same four methods and select it with STORAGE_BACKEND. Nothing else in the code base needs to change.

Public files (design images) are served at MEDIA_URL. Private files (customer reference images) are NEVER served
publicly: they are only readable through admin-protected endpoints."""
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from app.core.config import get_settings


@dataclass
class StoredFile:
    key: str  # identifies the file inside the storage backend
    url: str  # public URL for public files; the key itself for private files


class StorageService(Protocol):
    def save(self, data: bytes, folder: str, ext: str, *, private: bool) -> StoredFile: ...
    def read(self, key: str) -> bytes: ...
    def delete(self, key: str) -> None: ...


class LocalStorage:
    def __init__(self) -> None:
        s = get_settings()
        self.root = s.storage_path
        self.media_url = s.MEDIA_URL.rstrip("/")
        (self.root / "public").mkdir(parents=True, exist_ok=True)
        (self.root / "private").mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        p = (self.root / key).resolve()
        if not p.is_relative_to(self.root):  # blocks path traversal
            raise ValueError("Invalid storage key.")
        return p

    def save(self, data: bytes, folder: str, ext: str, *, private: bool) -> StoredFile:
        visibility = "private" if private else "public"
        name = f"{uuid.uuid4().hex}.{ext}"  # never use the user-supplied filename
        key = f"{visibility}/{folder}/{name}"
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return StoredFile(key=key, url=key if private else f"{self.media_url}/{folder}/{name}")

    def read(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    def delete(self, key: str) -> None:
        try:
            self._path(key).unlink(missing_ok=True)
        except (ValueError, OSError):
            pass


_storage: StorageService | None = None


def get_storage() -> StorageService:
    global _storage
    if _storage is None:
        backend = get_settings().STORAGE_BACKEND
        if backend != "local":
            raise RuntimeError(f"Unknown STORAGE_BACKEND '{backend}'. Only 'local' is implemented.")
        _storage = LocalStorage()
    return _storage
