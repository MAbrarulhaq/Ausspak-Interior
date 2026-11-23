from sqlalchemy import select

from app import cli, seed
from app.models.design import Design, DesignImage
from app.models.order import Order
from app.models.user import User


def test_seed_is_idempotent_and_creates_no_users(db, client):
    seed.main()
    seed.main()
    db.expire_all()
    assert db.query(Design).count() == 9 and db.query(DesignImage).count() == 18 and db.query(Order).count() == 3
    assert db.query(User).count() == 0  # no default/known admin account
    assert client.get("/api/v1/designs").json()["total"] == 9
    assert all(d["is_demonstration"] for d in client.get("/api/v1/designs").json()["items"])
    assert all(d["cover_image"]["image_url"].startswith("/media/designs/") for d in client.get("/api/v1/designs").json()["items"])
    img = client.get("/api/v1/designs").json()["items"][0]["cover_image"]["image_url"]
    assert client.get(img).status_code == 200


def test_seeded_demo_orders_can_be_tracked(client, db):
    seed.main()
    d = client.post("/api/v1/tracking/lookup", json={"order_number": "AUS-DEMO0001", "phone": "0300 0000001"}).json()
    assert d["current_status"] == "in_progress" and d["is_delayed"] is True and d["date_revised"] is True and len(d["commitments"]) == 1
    done = client.post("/api/v1/tracking/lookup", json={"order_number": "AUS-DEMO0002", "phone": "03000000002"}).json()
    assert [s["state"] for s in done["stages"]] == ["done"] * 5
    assert client.post("/api/v1/tracking/lookup", json={"order_number": "AUS-DEMO0001", "phone": "03000000002"}).status_code == 404


def test_cli_create_admin_hashes_password_and_rejects_duplicates_and_weak_passwords(db, capsys):
    assert cli.create_admin("Owner@Example.com", "Owner", "admin", "a-very-strong-pass") == 0
    u = db.scalar(select(User).where(User.email == "owner@example.com"))
    assert u.role.value == "admin" and u.password_hash.startswith("$argon2id$") and "strong" not in u.password_hash
    assert cli.create_admin("owner@example.com", "Owner", "admin", "a-very-strong-pass") == 1
    assert cli.create_admin("x@example.com", "X", "staff", "short") == 1
    assert cli.create_admin("staff@example.com", "Staff", "staff", "another-strong-pass") == 0
    assert db.scalar(select(User).where(User.email == "staff@example.com")).role.value == "staff"


def test_cli_rejects_emails_the_api_would_reject(db):
    assert cli.create_admin("owner@auspak.test", "Owner", "admin", "a-very-strong-pass") == 1
    assert cli.create_admin("not-an-email", "Owner", "admin", "a-very-strong-pass") == 1
    assert db.query(User).count() == 0
