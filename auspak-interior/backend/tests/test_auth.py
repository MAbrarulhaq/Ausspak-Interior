import time
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from sqlalchemy import select

from app.core.config import get_settings
from app.models.user import User

SIGNUP = {"full_name": "Ali Khan", "email": "Ali.Khan@Example.com", "phone": "0300 1234567", "password": "a-strong-password"}


def test_health(client):
    assert client.get("/api/v1/health").json() == {"status": "ok", "database": "ok"}


def test_signup_success_normalizes_and_hashes(client, db):
    r = client.post("/api/v1/auth/signup", json=SIGNUP)
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["email"] == "ali.khan@example.com" and body["user"]["role"] == "customer"
    assert body["user"]["phone"] == "+923001234567" and body["expires_in"] == 1800
    assert "password" not in r.text
    user = db.scalar(select(User).where(User.email == "ali.khan@example.com"))
    assert user.password_hash.startswith("$argon2id$") and "a-strong-password" not in user.password_hash


def test_signup_duplicate_email_rejected_case_insensitive(client):
    assert client.post("/api/v1/auth/signup", json=SIGNUP).status_code == 201
    r = client.post("/api/v1/auth/signup", json={**SIGNUP, "email": "ALI.KHAN@example.com"})
    assert r.status_code == 409


def test_signup_validation(client):
    for bad in ({**SIGNUP, "password": "short"}, {**SIGNUP, "email": "nope"}, {**SIGNUP, "full_name": ""}, {**SIGNUP, "phone": "abc"}):
        r = client.post("/api/v1/auth/signup", json=bad)
        assert r.status_code == 422
        assert "a-strong-password" not in r.text  # input is never echoed back


def test_public_signup_cannot_create_admin(client, db):
    r = client.post("/api/v1/auth/signup", json={**SIGNUP, "role": "admin", "is_active": True})
    assert r.status_code == 201 and r.json()["user"]["role"] == "customer"
    assert db.scalar(select(User).where(User.email == "ali.khan@example.com")).role.value == "customer"


def test_login_success_and_me(client):
    client.post("/api/v1/auth/signup", json=SIGNUP)
    r = client.post("/api/v1/auth/login", json={"email": "ali.khan@example.com", "password": "a-strong-password"})
    assert r.status_code == 200
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"})
    assert me.status_code == 200 and me.json()["email"] == "ali.khan@example.com"


def test_login_wrong_password_and_unknown_user_same_error(client):
    client.post("/api/v1/auth/signup", json=SIGNUP)
    a = client.post("/api/v1/auth/login", json={"email": "ali.khan@example.com", "password": "wrong-password"})
    b = client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "wrong-password"})
    assert a.status_code == b.status_code == 401 and a.json() == b.json()


def test_me_requires_valid_token(client):
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_expired_and_forged_tokens_rejected(client, customer_h, db):
    s = get_settings()
    uid = db.scalar(select(User).where(User.email == "customer@example.com")).id
    now = datetime.now(timezone.utc)
    expired = jwt.encode({"sub": str(uid), "iat": now - timedelta(hours=2), "exp": now - timedelta(hours=1)}, s.JWT_SECRET, algorithm="HS256")
    forged = jwt.encode({"sub": str(uid), "exp": now + timedelta(hours=1)}, "another-secret-another-secret-123456", algorithm="HS256")
    for tok in (expired, forged):
        assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tok}"}).status_code == 401


def test_token_role_claim_is_not_trusted(client, customer_h, db):
    s = get_settings()
    uid = db.scalar(select(User).where(User.email == "customer@example.com")).id
    tok = jwt.encode({"sub": str(uid), "role": "admin", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}, s.JWT_SECRET, algorithm="HS256")
    assert client.get("/api/v1/admin/dashboard/summary", headers={"Authorization": f"Bearer {tok}"}).status_code == 403


def test_disabled_user_blocked_immediately(client, customer_h, db):
    user = db.scalar(select(User).where(User.email == "customer@example.com"))
    user.is_active = False
    db.commit()
    assert client.get("/api/v1/auth/me", headers=customer_h).status_code == 401
    assert client.post("/api/v1/auth/login", json={"email": "customer@example.com", "password": "correct-horse-battery"}).status_code == 401


def test_logout_is_documented_stateless(client, customer_h):
    r = client.post("/api/v1/auth/logout", headers=customer_h)
    assert r.status_code == 200 and "expires" in r.json()["message"]


def test_only_admin_can_create_staff(client, admin_h, staff_h, customer_h):
    payload = {**SIGNUP, "email": "newstaff@example.com", "role": "staff"}
    assert client.post("/api/v1/admin/users", json=payload).status_code == 401
    assert client.post("/api/v1/admin/users", json=payload, headers=customer_h).status_code == 403
    assert client.post("/api/v1/admin/users", json=payload, headers=staff_h).status_code == 403
    r = client.post("/api/v1/admin/users", json=payload, headers=admin_h)
    assert r.status_code == 201 and r.json()["role"] == "staff"


def test_login_rate_limited(client):
    codes = [client.post("/api/v1/auth/login", json={"email": "x@example.com", "password": "bad-password"}).status_code for _ in range(12)]
    assert codes[:10] == [401] * 10 and codes[10:] == [429, 429]
