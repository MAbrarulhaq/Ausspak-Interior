import os
from pathlib import Path

from sqlalchemy import select

from app.models.enquiry import Enquiry, EnquiryAttachment
from tests.helpers import make_image
from tests.test_gallery import mk_category, mk_design

FORM = {"full_name": "Guest Person", "email": "Guest@Example.com", "phone": "0321 5551234", "work_type": "Kitchen",
        "description": "I would like a quotation for a new kitchen."}


def post(client, data=None, files=None, headers=None):
    return client.post("/api/v1/enquiries", data={**FORM, **(data or {})}, files=files or [], headers=headers or {})


def img(name="ref.png", fmt="PNG", size=(64, 48)):
    return ("files", (name, make_image(fmt, size), "image/png"))


def test_guest_can_submit_enquiry_without_account(client, db):
    r = post(client)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "new" and body["attachments"] == [] and len(body["attachment_token"]) > 20
    e = db.scalar(select(Enquiry))
    assert e.user_id is None and e.email == "guest@example.com" and e.phone == "+923215551234"
    assert e.attachment_token_hash and body["attachment_token"] not in (e.attachment_token_hash or "")  # only the hash is stored


def test_logged_in_customer_enquiry_is_linked(client, customer_h, db):
    assert post(client, headers=customer_h).status_code == 201
    assert db.scalar(select(Enquiry)).user_id is not None


def test_validation(client, db):
    for bad in ({"email": "nope"}, {"phone": "abc"}, {"full_name": ""}, {"description": "short"}, {"selected_design_id": "not-a-uuid"}):
        r = post(client, bad)
        assert r.status_code == 422, bad
    r = client.post("/api/v1/enquiries", data={"full_name": "A B"})
    assert r.status_code == 422
    assert db.query(Enquiry).count() == 0


def test_selected_design_must_be_published(client, admin_h):
    cat = mk_category(client, admin_h)
    pub, draft = mk_design(client, admin_h, cat["id"], "Pub One"), mk_design(client, admin_h, cat["id"], "Draft One", status="draft")
    assert post(client, {"selected_design_id": pub["id"]}).status_code == 201
    assert post(client, {"selected_design_id": draft["id"]}).status_code == 422
    assert post(client, {"selected_design_id": "00000000-0000-0000-0000-000000000000"}).status_code == 422


def test_order_question_reference_is_stored_uppercase(client, db):
    assert post(client, {"order_number": "aus-abcd2345", "work_type": "Question about my order"}).status_code == 201
    assert db.scalar(select(Enquiry)).order_number_reference == "AUS-ABCD2345"


def test_submit_with_reference_images(client, db):
    r = post(client, files=[img("a.png"), img("b.jpg", "JPEG"), img("c.webp", "WEBP")])
    assert r.status_code == 201, r.text
    assert len(r.json()["attachments"]) == 3
    rows = db.scalars(select(EnquiryAttachment)).all()
    root = Path(os.environ["STORAGE_DIR"])
    for a in rows:
        assert a.image_url.startswith("private/enquiries/") and (root / a.image_url).exists()
        assert a.original_filename in ("a.png", "b.jpg", "c.webp")


def test_image_limits_and_nothing_saved_on_failure(client, db):
    six = [img(f"{i}.png") for i in range(6)]
    assert post(client, files=six).status_code == 422
    assert post(client, files=[img("ok.png"), ("files", ("bad.jpg", b"not an image", "image/jpeg"))]).status_code == 422
    assert post(client, files=[("files", ("evil.exe", b"MZ....", "application/octet-stream"))]).status_code == 422
    too_big = make_image("PNG") + b"0" * (5 * 1024 * 1024 + 1)
    assert post(client, files=[("files", ("big.png", too_big, "image/png"))]).status_code == 413
    assert db.query(Enquiry).count() == 0 and db.query(EnquiryAttachment).count() == 0  # all-or-nothing


def test_total_size_limit_enforced(client, monkeypatch):
    from app.core.config import get_settings
    one = make_image("PNG", (40, 40))
    monkeypatch.setattr(get_settings(), "MAX_ENQUIRY_TOTAL_BYTES", len(one) + 10)
    two = [("files", ("a.png", one, "image/png")), ("files", ("b.png", one, "image/png"))]
    assert post(client, files=two).status_code == 413
    assert post(client, files=two[:1]).status_code == 201


def test_add_attachments_later_needs_the_token(client, db):
    created = post(client, files=[img("one.png")]).json()
    url = f"/api/v1/enquiries/{created['id']}/attachments"
    assert client.post(url, files=[img("x.png")]).status_code == 404
    assert client.post(url, files=[img("x.png")], headers={"X-Enquiry-Token": "wrong-token"}).status_code == 404
    ok = client.post(url, files=[img("two.png"), img("three.png")], headers={"X-Enquiry-Token": created["attachment_token"]})
    assert ok.status_code == 201 and len(ok.json()) == 2
    over = client.post(url, files=[img(f"{i}.png") for i in range(3)], headers={"X-Enquiry-Token": created["attachment_token"]})
    assert over.status_code == 422  # 3 existing + 3 new > 5
    assert db.query(EnquiryAttachment).count() == 3


def test_private_images_are_not_publicly_reachable(client, db):
    post(client, files=[img("secret.png")])
    a = db.scalar(select(EnquiryAttachment))
    for url in (f"/media/{a.image_url}", f"/media/enquiries/{a.enquiry_id}/{a.image_url.rsplit('/', 1)[1]}", f"/{a.image_url}", f"/media/../private/enquiries/x"):
        assert client.get(url).status_code in (404, 405)
    assert client.get(f"/api/v1/admin/enquiries/{a.enquiry_id}/attachments/{a.id}/file").status_code == 401


def test_admin_can_view_and_download_private_image(client, admin_h, staff_h, customer_h, db):
    post(client, files=[img("secret.png")])
    a = db.scalar(select(EnquiryAttachment))
    url = f"/api/v1/admin/enquiries/{a.enquiry_id}/attachments/{a.id}/file"
    assert client.get(url, headers=customer_h).status_code == 403
    for h in (admin_h, staff_h):
        r = client.get(url, headers=h)
        assert r.status_code == 200 and r.content[:4] == b"\x89PNG" and r.headers["cache-control"] == "private, no-store"
    assert client.get(f"/api/v1/admin/enquiries/{a.enquiry_id}/attachments/{a.enquiry_id}/file", headers=admin_h).status_code == 404


def test_admin_enquiry_management(client, admin_h, customer_h):
    ids = [post(client, {"full_name": f"Person {i}", "description": f"Need work number {i} please"}).json()["id"] for i in range(3)]
    assert client.get("/api/v1/admin/enquiries").status_code == 401
    assert client.get("/api/v1/admin/enquiries", headers=customer_h).status_code == 403
    lst = client.get("/api/v1/admin/enquiries", headers=admin_h).json()
    assert lst["total"] == 3 and all(i["status"] == "new" for i in lst["items"])
    r = client.patch(f"/api/v1/admin/enquiries/{ids[0]}", json={"status": "contacted"}, headers=admin_h)
    assert r.status_code == 200 and r.json()["status"] == "contacted"
    assert client.patch(f"/api/v1/admin/enquiries/{ids[0]}", json={"status": "bogus"}, headers=admin_h).status_code == 422
    assert client.get("/api/v1/admin/enquiries", params={"status": "new"}, headers=admin_h).json()["total"] == 2
    assert client.get("/api/v1/admin/enquiries", params={"q": "Person 1"}, headers=admin_h).json()["total"] == 1
    assert client.get(f"/api/v1/admin/enquiries/{ids[1]}", headers=admin_h).json()["email"] == "guest@example.com"
    assert client.get("/api/v1/admin/enquiries/00000000-0000-0000-0000-000000000000", headers=admin_h).status_code == 404


def test_order_created_from_enquiry_marks_it_converted(client, admin_h):
    from tests.test_orders import ORDER
    eid = post(client).json()["id"]
    r = client.post("/api/v1/orders", json={**ORDER, "enquiry_id": eid}, headers=admin_h)
    assert r.status_code == 201 and r.json()["enquiry_id"] == eid
    assert client.get(f"/api/v1/admin/enquiries/{eid}", headers=admin_h).json()["status"] == "converted"
    assert client.post("/api/v1/orders", json={**ORDER, "enquiry_id": "00000000-0000-0000-0000-000000000000"}, headers=admin_h).status_code == 422


def test_enquiry_rate_limited(client):
    codes = [post(client).status_code for _ in range(12)]
    assert codes[:10] == [201] * 10 and codes[10:] == [429, 429]
