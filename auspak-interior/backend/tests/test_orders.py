from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app.models.order import Order

TODAY = date.today()
ORDER = {"customer_name": "Sara Ahmed", "customer_phone": "0300 1234567", "customer_email": "sara@example.com", "work_type": "Kitchen",
         "description": "Spanish-style kitchen for a 10x12 room", "agreed_completion_date": str(TODAY + timedelta(days=30))}


def make_order(client, headers, **over):
    r = client.post("/api/v1/orders", json={**ORDER, **over}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def test_orders_require_staff(client, customer_h, staff_h, admin_h):
    assert client.get("/api/v1/orders").status_code == 401
    assert client.get("/api/v1/orders", headers=customer_h).status_code == 403
    assert client.post("/api/v1/orders", json=ORDER, headers=customer_h).status_code == 403
    assert client.get("/api/v1/orders", headers=staff_h).status_code == 200
    assert client.get("/api/v1/orders", headers=admin_h).status_code == 200


def test_admin_creates_order_for_customer_without_account(client, admin_h):
    o = make_order(client, admin_h)
    assert o["customer_id"] is None and o["customer_phone"] == "+923001234567" and o["current_status"] == "order_received"
    assert o["estimated_completion_date"] == o["agreed_completion_date"] and o["is_delayed"] is False
    assert len(o["history"]) == 1 and o["history"][0]["previous_status"] is None


def test_order_numbers_unique_and_not_guessable(client, admin_h):
    nums = {make_order(client, admin_h)["order_number"] for _ in range(15)}
    assert len(nums) == 15 and all(n.startswith("AUS-") and len(n) == 12 for n in nums)


def test_existing_order_can_be_added_at_any_stage_without_fake_history(client, admin_h):
    o = make_order(client, admin_h, current_status="in_progress", order_date=str(TODAY - timedelta(days=10)), initial_message="Existing order added manually.")
    assert o["current_status"] == "in_progress" and len(o["history"]) == 1
    assert o["history"][0]["new_status"] == "in_progress" and o["history"][0]["update_message"] == "Existing order added manually."


def test_create_validation(client, admin_h):
    for bad in ({"customer_phone": "abc"}, {"customer_email": "nope"}, {"agreed_completion_date": str(TODAY - timedelta(days=1))},
                {"current_status": "shipped"}, {"customer_name": ""}, {"unknown_field": 1}):
        assert client.post("/api/v1/orders", json={**ORDER, **bad}, headers=admin_h).status_code == 422, bad


def test_status_update_creates_history_and_records_actor(client, admin_h, staff_h):
    o = make_order(client, admin_h)
    r = client.post(f"/api/v1/orders/{o['id']}/status", json={"new_status": "designing", "update_message": "Design discussion started"}, headers=staff_h)
    assert r.status_code == 200
    d = r.json()
    assert d["current_status"] == "designing" and len(d["history"]) == 2
    h = d["history"][-1]
    assert h["previous_status"] == "order_received" and h["new_status"] == "designing" and h["updated_by"]


def test_progress_note_without_status_change_is_recorded(client, admin_h):
    o = make_order(client, admin_h, current_status="in_progress")
    d = client.post(f"/api/v1/orders/{o['id']}/status", json={"update_message": "Panels are being cut"}, headers=admin_h).json()
    assert d["current_status"] == "in_progress" and len(d["history"]) == 2 and d["history"][-1]["previous_status"] == "in_progress"


def test_staff_can_skip_a_stage_forward(client, admin_h):
    o = make_order(client, admin_h)
    r = client.post(f"/api/v1/orders/{o['id']}/status", json={"new_status": "in_progress", "update_message": "No design stage needed"}, headers=admin_h)
    assert r.status_code == 200 and r.json()["current_status"] == "in_progress"


def test_backward_move_needs_explanation(client, admin_h):
    o = make_order(client, admin_h, current_status="in_progress")
    url = f"/api/v1/orders/{o['id']}/status"
    assert client.post(url, json={"new_status": "designing", "update_message": "oops"}, headers=admin_h).status_code == 422
    r = client.post(url, json={"new_status": "designing", "update_message": "Customer asked for a design change before production"}, headers=admin_h)
    assert r.status_code == 200 and r.json()["current_status"] == "designing"


def test_invalid_status_value_rejected(client, admin_h):
    o = make_order(client, admin_h)
    assert client.post(f"/api/v1/orders/{o['id']}/status", json={"new_status": "teleported", "update_message": "x y z"}, headers=admin_h).status_code == 422


def test_only_admin_can_reopen_completed_order(client, admin_h, staff_h):
    o = make_order(client, admin_h, current_status="completed")
    body = {"new_status": "in_progress", "update_message": "Customer reported a defect; reopening for repair"}
    assert client.post(f"/api/v1/orders/{o['id']}/status", json=body, headers=staff_h).status_code == 403
    assert client.post(f"/api/v1/orders/{o['id']}/status", json=body, headers=admin_h).status_code == 200


def test_delay_requires_explanation_and_keeps_work_status(client, admin_h):
    o = make_order(client, admin_h, current_status="in_progress")
    url = f"/api/v1/orders/{o['id']}/status"
    assert client.post(url, json={"update_message": "Running late", "is_delayed": True}, headers=admin_h).status_code == 422
    r = client.post(url, json={"update_message": "Running late", "is_delayed": True, "delay_reason": "Imported hardware arrived late"}, headers=admin_h)
    d = r.json()
    assert r.status_code == 200 and d["is_delayed"] is True and d["current_status"] == "in_progress"
    assert d["delay_reason"] == "Imported hardware arrived late" and d["history"][-1]["delay_reason"] == "Imported hardware arrived late"
    # later note keeps the delay (and its reason) unless explicitly cleared
    d2 = client.post(url, json={"update_message": "Hardware arrived, assembling"}, headers=admin_h).json()
    assert d2["is_delayed"] is True and d2["delay_reason"] == "Imported hardware arrived late"
    d3 = client.post(url, json={"update_message": "Back on schedule", "is_delayed": False}, headers=admin_h).json()
    assert d3["is_delayed"] is False and d3["delay_reason"] is None
    assert client.post(url, json={"update_message": "bad combo", "is_delayed": False, "delay_reason": "why?"}, headers=admin_h).status_code == 422


def test_completing_clears_delay(client, admin_h):
    o = make_order(client, admin_h, current_status="in_progress")
    url = f"/api/v1/orders/{o['id']}/status"
    client.post(url, json={"update_message": "Late", "is_delayed": True, "delay_reason": "Supplier problem"}, headers=admin_h)
    d = client.post(url, json={"new_status": "completed", "update_message": "Delivered and installed"}, headers=admin_h).json()
    assert d["current_status"] == "completed" and d["is_delayed"] is False and d["delay_reason"] is None


def test_date_revision_preserves_original_and_records_history(client, admin_h, db):
    o = make_order(client, admin_h)
    new = str(TODAY + timedelta(days=45))
    r = client.post(f"/api/v1/orders/{o['id']}/revise-date", json={"revised_date": new, "reason": "Customer changed the layout"}, headers=admin_h)
    d = r.json()
    assert r.status_code == 200 and d["estimated_completion_date"] == new
    assert d["agreed_completion_date"] == ORDER["agreed_completion_date"]  # original preserved
    rev = d["revisions"][0]
    assert rev["previous_date"] == ORDER["agreed_completion_date"] and rev["revised_date"] == new and rev["reason"] == "Customer changed the layout"
    # a second revision records the previous *estimated* date
    new2 = str(TODAY + timedelta(days=50))
    d2 = client.post(f"/api/v1/orders/{o['id']}/revise-date", json={"revised_date": new2, "reason": "Supplier delay again"}, headers=admin_h).json()
    assert [x["previous_date"] for x in d2["revisions"]] == [ORDER["agreed_completion_date"], new] and d2["agreed_completion_date"] == ORDER["agreed_completion_date"]


def test_date_revision_validation(client, admin_h):
    o = make_order(client, admin_h)
    url = f"/api/v1/orders/{o['id']}/revise-date"
    assert client.post(url, json={"revised_date": ORDER["agreed_completion_date"], "reason": "same date"}, headers=admin_h).status_code == 422
    assert client.post(url, json={"revised_date": str(TODAY + timedelta(days=40)), "reason": "x"}, headers=admin_h).status_code == 422
    assert client.post(url, json={"revised_date": str(TODAY - timedelta(days=5)), "reason": "in the past"}, headers=admin_h).status_code == 422


def test_cannot_change_status_or_dates_through_patch(client, admin_h):
    o = make_order(client, admin_h)
    for field in ({"current_status": "completed"}, {"estimated_completion_date": "2030-01-01"}, {"agreed_completion_date": "2030-01-01"}, {"order_number": "AUS-HACKED1"}):
        assert client.patch(f"/api/v1/orders/{o['id']}", json=field, headers=admin_h).status_code == 422
    r = client.patch(f"/api/v1/orders/{o['id']}", json={"customer_phone": "+92 321 7654321", "description": "Updated description"}, headers=admin_h)
    assert r.status_code == 200 and r.json()["customer_phone"] == "+923217654321"


def test_commitments_add_and_update(client, admin_h):
    o = make_order(client, admin_h)
    due = str(TODAY + timedelta(days=10))
    r = client.post(f"/api/v1/orders/{o['id']}/commitments", json={"commitment_text": "Deliver the island countertop first", "agreed_date": str(TODAY), "due_date": due}, headers=admin_h)
    assert r.status_code == 201 and r.json()["status"] == "active"
    cid = r.json()["id"]
    r2 = client.patch(f"/api/v1/orders/{o['id']}/commitments/{cid}", json={"due_date": str(TODAY + timedelta(days=14))}, headers=admin_h)
    assert r2.json()["status"] == "revised"
    r3 = client.patch(f"/api/v1/orders/{o['id']}/commitments/{cid}", json={"status": "fulfilled"}, headers=admin_h)
    assert r3.json()["status"] == "fulfilled"
    assert len(client.get(f"/api/v1/orders/{o['id']}/history", headers=admin_h).json()["commitments"]) == 1
    assert client.patch(f"/api/v1/orders/{o['id']}/commitments/00000000-0000-0000-0000-000000000000", json={"status": "cancelled"}, headers=admin_h).status_code == 404


def test_history_endpoint_and_404(client, admin_h):
    o = make_order(client, admin_h)
    client.post(f"/api/v1/orders/{o['id']}/status", json={"new_status": "designing", "update_message": "Started designing"}, headers=admin_h)
    h = client.get(f"/api/v1/orders/{o['id']}/history", headers=admin_h).json()
    assert [x["new_status"] for x in h["status_history"]] == ["order_received", "designing"]
    assert client.get("/api/v1/orders/00000000-0000-0000-0000-000000000000", headers=admin_h).status_code == 404
    assert client.get("/api/v1/orders/not-a-uuid", headers=admin_h).status_code == 422


def test_list_search_filter_sort_paginate(client, admin_h):
    a = make_order(client, admin_h, customer_name="Alpha Customer", agreed_completion_date=str(TODAY + timedelta(days=20)))
    b = make_order(client, admin_h, customer_name="Beta Customer", customer_phone="0321 5550000", current_status="in_progress", agreed_completion_date=str(TODAY + timedelta(days=10)))
    c = make_order(client, admin_h, customer_name="Gamma Customer", current_status="in_progress", agreed_completion_date=str(TODAY + timedelta(days=40)))
    client.post(f"/api/v1/orders/{c['id']}/status", json={"update_message": "Late", "is_delayed": True, "delay_reason": "Supplier problem"}, headers=admin_h)
    get = lambda **p: client.get("/api/v1/orders", params=p, headers=admin_h).json()
    assert get()["total"] == 3
    assert [i["customer_name"] for i in get(q="beta")["items"]] == ["Beta Customer"]
    assert get(q=a["order_number"].lower())["total"] == 1
    assert get(q="5550000")["total"] == 1
    assert get(q="%")["total"] == 0  # wildcard characters are escaped
    assert get(status="in_progress")["total"] == 2
    assert [i["customer_name"] for i in get(is_delayed="true")["items"]] == ["Gamma Customer"]
    assert [i["customer_name"] for i in get(sort_by="estimated_completion_date", sort_dir="asc")["items"]] == ["Beta Customer", "Alpha Customer", "Gamma Customer"]
    page = get(page_size=2, page=2)
    assert page["total"] == 3 and len(page["items"]) == 1 and page["page"] == 2
    assert client.get("/api/v1/orders", params={"page_size": 1000}, headers=admin_h).status_code == 422
