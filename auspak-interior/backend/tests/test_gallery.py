from pathlib import Path

from tests.helpers import make_image


def mk_category(client, h, name="Kitchens"):
    r = client.post("/api/v1/admin/categories", json={"name": name, "description": "d"}, headers=h)
    assert r.status_code == 201, r.text
    return r.json()


def mk_design(client, h, cat_id, title="Modern Spanish Kitchen", status="published", style="Spanish"):
    r = client.post("/api/v1/admin/designs", json={"category_id": cat_id, "title": title, "description": "Sample design", "style": style, "publication_status": status}, headers=h)
    assert r.status_code == 201, r.text
    return r.json()


def upload(client, h, design_id, data, name="photo.png", alt="alt text"):
    return client.post(f"/api/v1/admin/designs/{design_id}/images", files={"file": (name, data, "image/png")}, data={"alt_text": alt}, headers=h)


def test_gallery_management_is_admin_only(client, customer_h, staff_h, admin_h):
    for method, url in (("post", "/api/v1/admin/categories"), ("post", "/api/v1/admin/designs"), ("get", "/api/v1/admin/designs")):
        assert client.request(method.upper(), url, json={}).status_code == 401
        assert client.request(method.upper(), url, json={}, headers=customer_h).status_code == 403
        assert client.request(method.upper(), url, json={}, headers=staff_h).status_code == 403  # staff cannot manage the gallery
    assert client.get("/api/v1/admin/designs", headers=admin_h).status_code == 200


def test_public_sees_only_published_designs(client, admin_h):
    cat = mk_category(client, admin_h)
    pub = mk_design(client, admin_h, cat["id"], "Published One")
    draft = mk_design(client, admin_h, cat["id"], "Draft One", status="draft")
    arch = mk_design(client, admin_h, cat["id"], "Archived One", status="archived")
    items = client.get("/api/v1/designs").json()
    assert items["total"] == 1 and items["items"][0]["slug"] == pub["slug"]
    assert client.get(f"/api/v1/designs/{pub['slug']}").status_code == 200
    assert client.get(f"/api/v1/designs/{draft['slug']}").status_code == 404
    assert client.get(f"/api/v1/designs/{arch['slug']}").status_code == 404
    assert "publication_status" not in client.get(f"/api/v1/designs/{pub['slug']}").text
    adm = client.get("/api/v1/admin/designs", headers=admin_h).json()
    assert adm["total"] == 3
    assert client.get("/api/v1/admin/designs", params={"publication_status": "draft"}, headers=admin_h).json()["total"] == 1


def test_categories_counts_only_published(client, admin_h):
    cat = mk_category(client, admin_h)
    mk_design(client, admin_h, cat["id"], "Design A")
    mk_design(client, admin_h, cat["id"], "Design B", status="draft")
    cats = client.get("/api/v1/categories").json()
    assert cats[0]["slug"] == "kitchens" and cats[0]["design_count"] == 1
    assert client.post("/api/v1/admin/categories", json={"name": "kitchens"}, headers=admin_h).status_code == 409


def test_filters_search_pagination(client, admin_h):
    k, w = mk_category(client, admin_h, "Kitchens"), mk_category(client, admin_h, "Wardrobes")
    for i in range(5):
        mk_design(client, admin_h, k["id"], f"Kitchen {i}", style="Spanish" if i < 2 else "Modern")
    mk_design(client, admin_h, w["id"], "Dressing Room", style="Modern")
    get = lambda **p: client.get("/api/v1/designs", params=p).json()
    assert get()["total"] == 6
    assert get(category="kitchens")["total"] == 5 and get(category="wardrobes")["total"] == 1 and get(category="nope")["total"] == 0
    assert get(style="spanish")["total"] == 2 and get(style="MODERN")["total"] == 4
    assert get(q="dressing")["total"] == 1 and get(q="%")["total"] == 0
    p = get(page_size=4, page=2)
    assert p["total"] == 6 and len(p["items"]) == 2
    assert client.get("/api/v1/designs", params={"page_size": 500}).status_code == 422


def test_create_update_archive_design_and_slug_uniqueness(client, admin_h):
    cat = mk_category(client, admin_h)
    a = mk_design(client, admin_h, cat["id"], "Same Title")
    b = mk_design(client, admin_h, cat["id"], "Same Title")
    assert a["slug"] == "same-title" and b["slug"] == "same-title-2"
    r = client.patch(f"/api/v1/admin/designs/{a['id']}", json={"title": "Renamed", "description": "New description"}, headers=admin_h)
    assert r.status_code == 200 and r.json()["title"] == "Renamed" and r.json()["slug"] == "same-title"  # slug stays stable
    assert client.post("/api/v1/admin/designs", json={"category_id": "00000000-0000-0000-0000-000000000000", "title": "x y", "description": "abc"}, headers=admin_h).status_code == 422
    r = client.delete(f"/api/v1/admin/designs/{a['id']}", headers=admin_h)
    assert r.status_code == 200 and r.json()["publication_status"] == "archived"
    assert client.get(f"/api/v1/designs/{a['slug']}").status_code == 404
    client.patch(f"/api/v1/admin/designs/{a['id']}", json={"publication_status": "published"}, headers=admin_h)
    assert client.get(f"/api/v1/designs/{a['slug']}").status_code == 200


def test_image_upload_served_publicly_and_deleted(client, admin_h):
    cat = mk_category(client, admin_h)
    d = mk_design(client, admin_h, cat["id"])
    for fmt, name in (("PNG", "a.png"), ("JPEG", "b.jpg"), ("JPEG", "c.JPEG"), ("WEBP", "d.webp")):
        r = upload(client, admin_h, d["id"], make_image(fmt), name)
        assert r.status_code == 201, (name, r.text)
    detail = client.get(f"/api/v1/designs/{d['slug']}").json()
    assert detail["image_count"] == 4 and [i["display_order"] for i in detail["images"]] == [0, 1, 2, 3]
    first = detail["images"][0]
    assert first["image_url"].startswith("/media/designs/") and first["image_url"].endswith(".png")
    served = client.get(first["image_url"])
    assert served.status_code == 200 and served.content[:4] == b"\x89PNG"
    assert detail["cover_image"]["id"] == first["id"]
    path = Path(__import__("os").environ["STORAGE_DIR"]) / "public" / "designs" / first["image_url"].rsplit("/", 1)[1]
    assert path.exists()
    assert client.delete(f"/api/v1/admin/designs/{d['id']}/images/{first['id']}", headers=admin_h).status_code == 204
    assert not path.exists() and client.get(first["image_url"]).status_code == 404


def test_image_upload_rejects_bad_files(client, admin_h):
    cat = mk_category(client, admin_h)
    d = mk_design(client, admin_h, cat["id"])
    big = make_image("PNG", (64, 48)) + b"0" * (5 * 1024 * 1024 + 1)
    cases = {
        "text renamed to jpg": (b"<?php echo 'hi'; ?>", "evil.jpg", 422),
        "svg": (b"<svg xmlns='http://www.w3.org/2000/svg'/>", "pic.svg", 422),
        "gif": (make_image("GIF"), "pic.gif", 422),
        "png content with jpg name": (make_image("PNG"), "pic.jpg", 422),
        "no extension": (make_image("PNG"), "pic", 422),
        "empty": (b"", "pic.png", 422),
        "truncated": (make_image("PNG", (300, 300))[:80], "pic.png", 422),
        "too big": (big, "pic.png", 413),
    }
    for label, (data, name, code) in cases.items():
        r = upload(client, admin_h, d["id"], data, name)
        assert r.status_code == code, (label, r.status_code, r.text)
    assert client.get(f"/api/v1/designs/{d['slug']}").json()["image_count"] == 0


def test_user_supplied_filename_is_never_used(client, admin_h):
    cat = mk_category(client, admin_h)
    d = mk_design(client, admin_h, cat["id"])
    r = upload(client, admin_h, d["id"], make_image("PNG"), "../../etc/passwd.png")
    assert r.status_code == 201 and "passwd" not in r.json()["image_url"] and ".." not in r.json()["image_url"]


def test_favourites_require_customer_login(client, customer_h, staff_h, admin_h):
    cat = mk_category(client, admin_h)
    d = mk_design(client, admin_h, cat["id"])
    assert client.get("/api/v1/favourites").status_code == 401
    assert client.post(f"/api/v1/favourites/{d['id']}").status_code == 401
    assert client.post(f"/api/v1/favourites/{d['id']}", headers=staff_h).status_code == 403


def test_favourites_add_duplicate_list_remove(client, customer_h, admin_h, db):
    from app.models.design import Favourite
    cat = mk_category(client, admin_h)
    d = mk_design(client, admin_h, cat["id"])
    other = mk_design(client, admin_h, cat["id"], "Other")
    assert client.post(f"/api/v1/favourites/{d['id']}", headers=customer_h).status_code == 201
    assert client.post(f"/api/v1/favourites/{d['id']}", headers=customer_h).status_code == 200  # no duplicate
    assert db.query(Favourite).count() == 1
    favs = client.get("/api/v1/favourites", headers=customer_h).json()
    assert favs["total"] == 1 and favs["items"][0]["id"] == d["id"] and favs["items"][0]["is_favourite"] is True
    listing = {i["id"]: i["is_favourite"] for i in client.get("/api/v1/designs", headers=customer_h).json()["items"]}
    assert listing == {d["id"]: True, other["id"]: False}
    assert all(i["is_favourite"] is False for i in client.get("/api/v1/designs").json()["items"])  # anonymous
    assert client.delete(f"/api/v1/favourites/{d['id']}", headers=customer_h).status_code == 204
    assert client.delete(f"/api/v1/favourites/{d['id']}", headers=customer_h).status_code == 404
    assert client.get("/api/v1/favourites", headers=customer_h).json()["total"] == 0


def test_cannot_favourite_unpublished_design_and_hidden_after_archive(client, customer_h, admin_h):
    cat = mk_category(client, admin_h)
    draft = mk_design(client, admin_h, cat["id"], "Draft", status="draft")
    assert client.post(f"/api/v1/favourites/{draft['id']}", headers=customer_h).status_code == 404
    pub = mk_design(client, admin_h, cat["id"], "Pub")
    client.post(f"/api/v1/favourites/{pub['id']}", headers=customer_h)
    client.delete(f"/api/v1/admin/designs/{pub['id']}", headers=admin_h)
    assert client.get("/api/v1/favourites", headers=customer_h).json()["total"] == 0


def test_favourites_are_private_per_user(client, customer_h, admin_h, db):
    from tests.conftest import _make_user
    other_h = _make_user(db, client, "customer", "other@example.com")
    cat = mk_category(client, admin_h)
    d = mk_design(client, admin_h, cat["id"])
    client.post(f"/api/v1/favourites/{d['id']}", headers=customer_h)
    assert client.get("/api/v1/favourites", headers=other_h).json()["total"] == 0


def test_demonstration_flag_defaults_false_and_is_public(client, admin_h):
    cat = mk_category(client, admin_h)
    real = mk_design(client, admin_h, cat["id"], "Real Project")
    r = client.post("/api/v1/admin/designs", json={"category_id": cat["id"], "title": "Sample Project", "description": "Sample", "publication_status": "published", "is_demonstration": True}, headers=admin_h)
    assert r.status_code == 201 and r.json()["is_demonstration"] is True
    assert real["is_demonstration"] is False
    flags = {i["title"]: i["is_demonstration"] for i in client.get("/api/v1/designs").json()["items"]}
    assert flags == {"Real Project": False, "Sample Project": True}
    r = client.patch(f"/api/v1/admin/designs/{real['id']}", json={"is_demonstration": True}, headers=admin_h)
    assert r.json()["is_demonstration"] is True


def test_admin_can_fetch_any_single_design(client, admin_h, staff_h):
    cat = mk_category(client, admin_h)
    d = mk_design(client, admin_h, cat["id"], "Hidden Draft", status="draft")
    r = client.get(f"/api/v1/admin/designs/{d['id']}", headers=admin_h)
    assert r.status_code == 200 and r.json()["publication_status"] == "draft" and r.json()["title"] == "Hidden Draft"
    assert client.get(f"/api/v1/admin/designs/{d['id']}", headers=staff_h).status_code == 403
    assert client.get("/api/v1/admin/designs/00000000-0000-0000-0000-000000000000", headers=admin_h).status_code == 404
