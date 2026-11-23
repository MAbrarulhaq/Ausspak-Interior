import socket
from datetime import timedelta

import pytest
from aiosmtpd.controller import Controller
from sqlalchemy import select

from app.core.config import get_settings
from app.models.notification import Notification
from tests.test_orders import ORDER, TODAY, make_order


def notes(db, **filters):
    db.expire_all()
    return list(db.scalars(select(Notification).filter_by(**filters).order_by(Notification.created_at)))


def status_url(o):
    return f"/api/v1/orders/{o['id']}/status"


def test_order_created_records_email_and_whatsapp_notifications(client, admin_h, db):
    o = make_order(client, admin_h)
    ns = notes(db)
    assert {(n.channel.value, n.recipient) for n in ns} == {("email", "sara@example.com"), ("whatsapp", "+923001234567")}
    assert all(n.notification_type == "order_created" and str(n.order_id) == o["id"] for n in ns)
    text = ns[0].message
    assert o["order_number"] in text and "/track-order" in text and "Order Received" in text


def test_order_without_email_only_whatsapp(client, admin_h, db):
    make_order(client, admin_h, customer_email=None)
    assert [n.channel.value for n in notes(db)] == ["whatsapp"]


def test_mock_provider_never_claims_delivery(client, admin_h, db):
    make_order(client, admin_h)
    for n in notes(db):
        assert n.delivery_status.value == "not_sent" and n.sent_at is None and n.provider_message_id is None
        assert "NOT sent" in n.error_message


def test_notify_false_creates_nothing(client, admin_h, db):
    make_order(client, admin_h, notify=False)
    assert notes(db) == []


def test_event_types_for_each_workflow_action(client, admin_h, db):
    o = make_order(client, admin_h, current_status="in_progress")
    client.post(status_url(o), json={"update_message": "Late", "is_delayed": True, "delay_reason": "Supplier problem"}, headers=admin_h)
    client.post(f"/api/v1/orders/{o['id']}/revise-date", json={"revised_date": str(TODAY + timedelta(days=45)), "reason": "Supplier problem"}, headers=admin_h)
    client.post(f"/api/v1/orders/{o['id']}/commitments", json={"commitment_text": "Countertop first", "agreed_date": str(TODAY)}, headers=admin_h)
    client.post(status_url(o), json={"new_status": "ready_for_collection", "update_message": "All done, please collect"}, headers=admin_h)
    client.post(status_url(o), json={"new_status": "completed", "update_message": "Collected, thank you"}, headers=admin_h)
    client.post(status_url(o), json={"update_message": "Just a note after completion"}, headers=admin_h)
    types = [n.notification_type for n in notes(db, channel="email")]
    assert types == ["order_created", "order_delayed", "date_revised", "commitment_added", "ready_for_collection", "order_completed", "status_changed"]


def test_messages_never_contain_internal_notes_and_include_reason(client, admin_h, db):
    o = make_order(client, admin_h, current_status="in_progress")
    client.post(status_url(o), json={"update_message": "Running late", "internal_note": "SECRET margin note", "is_delayed": True, "delay_reason": "Hinges are late"}, headers=admin_h)
    msg = notes(db, channel="email", notification_type="order_delayed")[0].message
    assert "SECRET" not in msg and "Hinges are late" in msg and "Running late" in msg


def test_manual_notify_and_permissions(client, admin_h, customer_h, db):
    o = make_order(client, admin_h)
    url = f"/api/v1/admin/orders/{o['id']}/notify"
    assert client.post(url, json={"message": "Please call us"}).status_code == 401
    assert client.post(url, json={"message": "Please call us"}, headers=customer_h).status_code == 403
    r = client.post(url, json={"message": "Please call us about handles", "channels": ["whatsapp"]}, headers=admin_h)
    assert r.status_code == 200 and [n["channel"] for n in r.json()] == ["whatsapp"] and "handles" in r.json()[0]["message"]


def test_customer_sees_only_own_linked_notifications(client, admin_h, customer_h, db):
    from app.models.user import User
    me = db.scalar(select(User).where(User.email == "customer@example.com"))
    make_order(client, admin_h, customer_id=str(me.id))
    make_order(client, admin_h)  # someone else's order
    mine = client.get("/api/v1/notifications", headers=customer_h).json()
    assert mine["total"] == 2 and all("error_message" not in i and "recipient" not in i and "provider_message_id" not in i for i in mine["items"])
    assert client.get("/api/v1/notifications").status_code == 401
    assert client.get("/api/v1/notifications", headers=admin_h).status_code == 403


def test_admin_notification_history_filters_and_permissions(client, admin_h, customer_h):
    o = make_order(client, admin_h)
    assert client.get("/api/v1/admin/notifications", headers=customer_h).status_code == 403
    allr = client.get("/api/v1/admin/notifications", headers=admin_h).json()
    assert allr["total"] == 2
    one = client.get("/api/v1/admin/notifications", params={"channel": "email"}, headers=admin_h).json()
    assert one["total"] == 1 and one["items"][0]["recipient"] == "sara@example.com"
    assert client.get("/api/v1/admin/notifications", params={"delivery_status": "failed"}, headers=admin_h).json()["total"] == 0
    assert client.get("/api/v1/admin/notifications", params={"order_id": o["id"], "notification_type": "order_created"}, headers=admin_h).json()["total"] == 2


# ---------- real SMTP delivery against a local test mail server ----------
class Capture:
    def __init__(self):
        self.messages = []

    async def handle_DATA(self, server, session, envelope):
        self.messages.append(envelope)
        return "250 OK"


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture()
def smtp_server(monkeypatch):
    handler, port = Capture(), free_port()
    ctl = Controller(handler, hostname="127.0.0.1", port=port)
    ctl.start()
    s = get_settings()
    for k, v in {"EMAIL_PROVIDER": "smtp", "SMTP_HOST": "127.0.0.1", "SMTP_PORT": port, "SMTP_USE_STARTTLS": False, "SMTP_USERNAME": "",
                 "EMAIL_FROM": "Auspak Interior <orders@auspak.test>"}.items():
        monkeypatch.setattr(s, k, v)
    yield handler
    ctl.stop()


def test_smtp_email_really_delivered_and_recorded_sent(client, admin_h, db, smtp_server):
    o = make_order(client, admin_h)
    email = notes(db, channel="email")[0]
    assert email.delivery_status.value == "sent" and email.sent_at is not None and email.provider_message_id and email.error_message is None
    assert len(smtp_server.messages) == 1
    env = smtp_server.messages[0]
    raw = env.content.decode()
    assert env.rcpt_tos == ["sara@example.com"] and "orders@auspak.test" in env.mail_from
    assert o["order_number"] in raw and "Subject:" in raw
    wa = notes(db, channel="whatsapp")[0]
    assert wa.delivery_status.value == "not_sent"  # WhatsApp is still the mock provider


def test_smtp_failure_is_recorded_and_does_not_block_the_order_update(client, admin_h, db, monkeypatch):
    s = get_settings()
    for k, v in {"EMAIL_PROVIDER": "smtp", "SMTP_HOST": "127.0.0.1", "SMTP_PORT": free_port(), "SMTP_USE_STARTTLS": False, "SMTP_TIMEOUT_SECONDS": 2}.items():
        monkeypatch.setattr(s, k, v)
    o = make_order(client, admin_h)  # creation still succeeds
    r = client.post(status_url(o), json={"new_status": "designing", "update_message": "Design started"}, headers=admin_h)
    assert r.status_code == 200 and r.json()["current_status"] == "designing"
    emails = notes(db, channel="email")
    assert len(emails) == 2 and all(n.delivery_status.value == "failed" and n.sent_at is None and "ConnectionRefused" in n.error_message for n in emails)


def test_missing_smtp_configuration_handled_safely(client, admin_h, db, monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "EMAIL_PROVIDER", "smtp")
    monkeypatch.setattr(s, "SMTP_HOST", "")
    make_order(client, admin_h)
    n = notes(db, channel="email")[0]
    assert n.delivery_status.value == "failed" and "SMTP_HOST" in n.error_message


def test_unknown_provider_name_is_recorded_as_failure_not_a_crash(client, admin_h, db, monkeypatch):
    monkeypatch.setattr(get_settings(), "WHATSAPP_PROVIDER", "carrier-pigeon")
    r = client.post("/api/v1/orders", json=ORDER, headers=admin_h)
    assert r.status_code == 201
    n = notes(db, channel="whatsapp")[0]
    assert n.delivery_status.value == "failed" and "Unknown whatsapp provider" in n.error_message


def test_provider_exception_is_recorded(client, admin_h, db, monkeypatch):
    from app.services.providers import email as email_mod

    def boom(self, recipient, subject, message):
        raise RuntimeError("provider exploded")
    monkeypatch.setattr(email_mod.MockEmailProvider, "send", boom)
    assert client.post("/api/v1/orders", json=ORDER, headers=admin_h).status_code == 201
    n = notes(db, channel="email")[0]
    assert n.delivery_status.value == "failed" and "provider exploded" in n.error_message


def test_retry_failed_notification_after_fixing_provider(client, admin_h, db, monkeypatch, smtp_server):
    s = get_settings()
    good_port = s.SMTP_PORT
    monkeypatch.setattr(s, "SMTP_PORT", free_port())
    monkeypatch.setattr(s, "SMTP_TIMEOUT_SECONDS", 2)
    make_order(client, admin_h)
    failed = notes(db, channel="email")[0]
    assert failed.delivery_status.value == "failed" and smtp_server.messages == []
    monkeypatch.setattr(s, "SMTP_PORT", good_port)  # "fix the configuration"
    r = client.post(f"/api/v1/admin/notifications/{failed.id}/retry", headers=admin_h)
    assert r.status_code == 200 and r.json()["delivery_status"] == "sent" and r.json()["error_message"] is None
    assert len(smtp_server.messages) == 1
    assert client.post("/api/v1/admin/notifications/00000000-0000-0000-0000-000000000000/retry", headers=admin_h).status_code == 404


def test_dashboard_summary(client, admin_h, staff_h, customer_h, db):
    assert client.get("/api/v1/admin/dashboard/summary").status_code == 401
    assert client.get("/api/v1/admin/dashboard/summary", headers=customer_h).status_code == 403
    a = make_order(client, admin_h, current_status="in_progress")
    make_order(client, admin_h, current_status="ready_for_collection")
    make_order(client, admin_h, current_status="completed")
    client.post(status_url(a), json={"update_message": "Late", "is_delayed": True, "delay_reason": "Supplier problem"}, headers=admin_h)
    client.post("/api/v1/enquiries", data={"full_name": "Guest P", "email": "g@example.com", "phone": "0300 1234567", "work_type": "Kitchen", "description": "Need a quotation please"})
    d = client.get("/api/v1/admin/dashboard/summary", headers=admin_h).json()
    assert d["total_orders"] == 3 and d["in_progress"] == 1 and d["delayed"] == 1 and d["ready_for_collection"] == 1 and d["completed"] == 1
    assert d["new_enquiries"] == 1 and d["failed_notifications"] == 0 and d["orders_by_status"]["order_received"] == 0
    assert d["published_designs"] == 0 and d["draft_designs"] == 0
    limited = client.get("/api/v1/admin/dashboard/summary", headers=staff_h).json()  # staff: limited view
    assert limited["total_orders"] == 3 and limited["new_enquiries"] == 1
    assert limited["published_designs"] is None and limited["draft_designs"] is None and limited["failed_notifications"] is None
