from datetime import timedelta

from sqlalchemy import select

from app.models.user import User
from tests.conftest import _make_user
from tests.test_orders import ORDER, TODAY, make_order
from tests.test_enquiries import post as post_enquiry


def test_staff_can_do_daily_work(client, staff_h):
    o = make_order(client, staff_h)
    oid = o["id"]
    assert client.post(f"/api/v1/orders/{oid}/status", json={"new_status": "designing", "update_message": "Design started"}, headers=staff_h).status_code == 200
    assert client.post(f"/api/v1/orders/{oid}/revise-date", json={"revised_date": str(TODAY + timedelta(days=40)), "reason": "Customer change"}, headers=staff_h).status_code == 200
    assert client.post(f"/api/v1/orders/{oid}/commitments", json={"commitment_text": "Deliver island first", "agreed_date": str(TODAY)}, headers=staff_h).status_code == 201
    assert client.patch(f"/api/v1/orders/{oid}", json={"description": "Updated description"}, headers=staff_h).status_code == 200
    eid = post_enquiry(client).json()["id"]
    assert client.get("/api/v1/admin/enquiries", headers=staff_h).status_code == 200
    assert client.patch(f"/api/v1/admin/enquiries/{eid}", json={"status": "in_review"}, headers=staff_h).status_code == 200
    assert client.post(f"/api/v1/admin/orders/{oid}/notify", json={"message": "Please call us"}, headers=staff_h).status_code == 200


def test_staff_cannot_manage_gallery_categories_or_accounts(client, staff_h, admin_h, db):
    other = db.scalar(select(User).where(User.email == "admin@example.com"))
    forbidden = [
        ("POST", "/api/v1/admin/categories", {"name": "New Cat"}),
        ("PATCH", "/api/v1/admin/categories/00000000-0000-0000-0000-000000000000", {"name": "X Y"}),
        ("GET", "/api/v1/admin/designs", None),
        ("POST", "/api/v1/admin/designs", {"category_id": "00000000-0000-0000-0000-000000000000", "title": "T T", "description": "abc"}),
        ("DELETE", "/api/v1/admin/designs/00000000-0000-0000-0000-000000000000", None),
        ("GET", "/api/v1/admin/users", None),
        ("POST", "/api/v1/admin/users", {"full_name": "New Staff", "email": "n@example.com", "password": "long-enough-pass", "role": "staff"}),
        ("PATCH", f"/api/v1/admin/users/{other.id}", {"is_active": False}),
    ]
    for method, url, body in forbidden:
        r = client.request(method, url, json=body, headers=staff_h)
        assert r.status_code == 403, (method, url, r.status_code)
    assert db.scalar(select(User).where(User.email == "n@example.com")) is None
    assert db.get(User, other.id).is_active is True


def test_only_admin_can_reopen_completed_orders(client, staff_h, admin_h):
    o = make_order(client, admin_h, current_status="completed")
    body = {"new_status": "in_progress", "update_message": "Reopening to fix a reported defect"}
    assert client.post(f"/api/v1/orders/{o['id']}/status", json=body, headers=staff_h).status_code == 403
    assert client.post(f"/api/v1/orders/{o['id']}/status", json=body, headers=admin_h).status_code == 200


def test_admin_user_management(client, admin_h, db):
    assert client.post("/api/v1/admin/users", json={"full_name": "New Staff", "email": "newstaff@example.com", "password": "long-enough-pass", "role": "staff"}, headers=admin_h).status_code == 201
    assert client.post("/api/v1/admin/users", json={"full_name": "Dup", "email": "NEWSTAFF@example.com", "password": "long-enough-pass", "role": "staff"}, headers=admin_h).status_code == 409
    users = client.get("/api/v1/admin/users", headers=admin_h).json()
    assert users["total"] == 2 and "password_hash" not in str(users)
    assert client.get("/api/v1/admin/users", params={"role": "staff"}, headers=admin_h).json()["total"] == 1
    assert client.get("/api/v1/admin/users", params={"q": "newstaff"}, headers=admin_h).json()["total"] == 1
    staff = db.scalar(select(User).where(User.email == "newstaff@example.com"))
    # promote then deactivate; a deactivated user can no longer log in
    assert client.patch(f"/api/v1/admin/users/{staff.id}", json={"role": "admin"}, headers=admin_h).json()["role"] == "admin"
    assert client.patch(f"/api/v1/admin/users/{staff.id}", json={"role": "staff", "is_active": False}, headers=admin_h).json()["is_active"] is False
    assert client.post("/api/v1/auth/login", json={"email": "newstaff@example.com", "password": "long-enough-pass"}).status_code == 401
    assert client.patch("/api/v1/admin/users/00000000-0000-0000-0000-000000000000", json={"is_active": True}, headers=admin_h).status_code == 404
    assert client.patch(f"/api/v1/admin/users/{staff.id}", json={"password_hash": "x"}, headers=admin_h).status_code == 422


def test_admin_cannot_lock_themselves_out(client, admin_h, db):
    me = db.scalar(select(User).where(User.email == "admin@example.com"))
    assert client.patch(f"/api/v1/admin/users/{me.id}", json={"is_active": False}, headers=admin_h).status_code == 409
    assert client.patch(f"/api/v1/admin/users/{me.id}", json={"role": "staff"}, headers=admin_h).status_code == 409
    assert client.patch(f"/api/v1/admin/users/{me.id}", json={"full_name": "Renamed Admin"}, headers=admin_h).status_code == 200
    assert db.get(User, me.id).role.value == "admin"


def test_site_contact_endpoint_is_public_and_normalized(client):
    r = client.get("/api/v1/site/contact")
    assert r.status_code == 200
    d = r.json()
    assert d["whatsapp_number"] == "+923003822377" and d["email"] == "arrianhbk@gmail.com"
    assert d["whatsapp_link"].startswith("https://wa.me/923003822377?text=") and "Golra Road" in d["address"]


def test_whatsapp_notifications_carry_a_click_to_chat_link(client, admin_h):
    o = make_order(client, admin_h)
    items = client.get("/api/v1/admin/notifications", params={"order_id": o["id"]}, headers=admin_h).json()["items"]
    wa = next(i for i in items if i["channel"] == "whatsapp")
    email = next(i for i in items if i["channel"] == "email")
    assert email["whatsapp_link"] is None
    assert wa["whatsapp_link"].startswith("https://wa.me/923001234567?text=") and "AUS-" in wa["whatsapp_link"]
    assert wa["delivery_status"] == "not_sent" and "manually" in wa["error_message"]
