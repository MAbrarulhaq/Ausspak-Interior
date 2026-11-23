import os
import subprocess
import sys
import tempfile
from pathlib import Path

# Test configuration must be set BEFORE the app is imported. Tests never touch the development database.
TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", "postgresql+psycopg://auspak:auspak_dev_password@localhost:5432/auspak_test")
os.environ.update({
    "ENVIRONMENT": "test",
    "DATABASE_URL": TEST_DB_URL,
    "JWT_SECRET": "test-secret-test-secret-test-secret-123456",
    "STORAGE_DIR": tempfile.mkdtemp(prefix="auspak_test_storage_"),
    "EMAIL_PROVIDER": "mock",
    "WHATSAPP_PROVIDER": "mock",
})

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

BACKEND = Path(__file__).resolve().parents[1]
TABLES = ["notifications", "favourites", "enquiry_attachments", "order_commitments", "order_date_revisions",
          "order_status_history", "orders", "enquiries", "design_images", "designs", "design_categories", "users"]


@pytest.fixture(scope="session", autouse=True)
def prepared_db():
    env = {**os.environ}
    for args in (["downgrade", "base"], ["upgrade", "head"]):
        subprocess.run([sys.executable, "-m", "alembic", *args], cwd=BACKEND, env=env, check=True, capture_output=True)


@pytest.fixture(autouse=True)
def clean_state():
    from app.db.session import engine
    from app.utils.ratelimit import limiter
    with engine.begin() as c:
        c.execute(text("TRUNCATE " + ", ".join(TABLES) + " RESTART IDENTITY CASCADE"))
    limiter.reset()


@pytest.fixture()
def client():
    from app.main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def db():
    from app.db.session import SessionLocal
    with SessionLocal() as s:
        yield s


def _make_user(db, client, role: str, email: str, password: str = "correct-horse-battery"):
    from app.core.security import hash_password
    from app.models.enums import UserRole
    from app.models.user import User
    db.add(User(full_name=f"Test {role}", email=email, phone="+923001112233", password_hash=hash_password(password), role=UserRole(role)))
    db.commit()
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def admin_h(db, client):
    return _make_user(db, client, "admin", "admin@example.com")


@pytest.fixture()
def staff_h(db, client):
    return _make_user(db, client, "staff", "staff@example.com")


@pytest.fixture()
def customer_h(db, client):
    return _make_user(db, client, "customer", "customer@example.com")
