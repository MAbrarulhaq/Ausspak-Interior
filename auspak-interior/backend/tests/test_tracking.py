import json
from datetime import date, timedelta

from tests.test_orders import ORDER, TODAY, make_order


def lookup(client, number, phone):
    return client.post("/api/v1/tracking/lookup", json={"order_number": number, "phone": phone})


def test_valid_lookup_and_phone_formats(client, admin_h):
    o = make_order(client, admin_h)
    for phone in ("0300 1234567", "+92 300 1234567", "923001234567", "0092-300-1234567"):
        r = lookup(client, o["order_number"].lower(), phone)
        assert r.status_code == 200, phone
    d = r.json()
    assert d["order_number"] == o["order_number"] and d["current_status"] == "order_received" and d["current_status_label"] == "Order Received"
    assert [s["state"] for s in d["stages"]] == ["current", "pending", "pending", "pending", "pending"]


def test_wrong_credentials_get_identical_generic_error(client, admin_h):
    o = make_order(client, admin_h)
    wrong_phone = lookup(client, o["order_number"], "0300 9999999")
    wrong_number = lookup(client, "AUS-NOPE2345", "0300 1234567")
    both = lookup(client, "AUS-NOPE2345", "0300 9999999")
    assert wrong_phone.status_code == wrong_number.status_code == both.status_code == 404
    assert wrong_phone.json() == wrong_number.json() == both.json()


def test_validation_errors(client):
    assert lookup(client, "AUS-X", "abc").status_code == 422
    assert client.post("/api/v1/tracking/lookup", json={"order_number": "AUS-X"}).status_code == 422
    assert client.get("/api/v1/tracking/lookup").status_code == 405


def test_response_contains_only_customer_safe_data(client, admin_h, db):
    from app.models.user import User
    o = make_order(client, admin_h)
    client.post(f"/api/v1/orders/{o['id']}/status", json={"new_status": "designing", "update_message": "Design started", "internal_note": "SECRET-INTERNAL-NOTE margin is low"}, headers=admin_h)
    staff_id = db.query(User).filter(User.email == "admin@example.com").one().id
    r = lookup(client, o["order_number"], ORDER["customer_phone"])
    text = r.text
    assert "SECRET-INTERNAL-NOTE" not in text and str(staff_id) not in text and o["id"] not in text
    for leaked in ("Sara Ahmed", "sara@example.com", "+923001234567", "internal_note", "updated_by", "customer_id", "password", "created_by"):
        assert leaked not in text, leaked
    assert [p["message"] for p in r.json()["progress"]] == ["Order recorded.", "Design started"]


def test_tracking_shows_delay_revisions_and_commitments(client, admin_h):
    o = make_order(client, admin_h, current_status="in_progress")
    client.post(f"/api/v1/orders/{o['id']}/status", json={"update_message": "Delayed", "is_delayed": True, "delay_reason": "Supplier problem with hinges"}, headers=admin_h)
    new = str(TODAY + timedelta(days=40))
    client.post(f"/api/v1/orders/{o['id']}/revise-date", json={"revised_date": new, "reason": "Hinges arrive later"}, headers=admin_h)
    client.post(f"/api/v1/orders/{o['id']}/commitments", json={"commitment_text": "Countertop delivered first", "agreed_date": str(TODAY)}, headers=admin_h)
    d = lookup(client, o["order_number"], ORDER["customer_phone"]).json()
    assert d["current_status"] == "in_progress" and d["is_delayed"] is True and d["delay_reason"] == "Supplier problem with hinges"
    assert d["agreed_completion_date"] == ORDER["agreed_completion_date"] and d["estimated_completion_date"] == new and d["date_revised"] is True
    assert d["date_revisions"][0]["reason"] == "Hinges arrive later" and d["commitments"][0]["commitment_text"] == "Countertop delivered first"


def test_completed_timeline_all_done(client, admin_h):
    o = make_order(client, admin_h, current_status="completed")
    d = lookup(client, o["order_number"], ORDER["customer_phone"]).json()
    assert [s["state"] for s in d["stages"]] == ["done"] * 5


def test_tracking_rate_limited_per_ip(client):
    codes = [lookup(client, "AUS-NOPE2345", "0300 9999999").status_code for _ in range(12)]
    assert codes[:10] == [404] * 10 and codes[10:] == [429, 429]
