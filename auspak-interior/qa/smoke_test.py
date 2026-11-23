"""Live smoke test of the running backend over real HTTP (no test database, no mocks).
Needs: backend running, `python -m app.seed` done, and an admin account.
  set ADMIN_EMAIL=owner@auspak.test & set ADMIN_PASSWORD=...   then   python qa/smoke_test.py
Creates a few clearly named test records (SMOKE TEST ...) in the database you point it at."""
import io, os, sys
from datetime import date, timedelta
import httpx
from PIL import Image

BASE = os.environ.get("API_BASE", "http://localhost:8000")
EMAIL, PASSWORD = os.environ.get("ADMIN_EMAIL"), os.environ.get("ADMIN_PASSWORD")
if not (EMAIL and PASSWORD):
    sys.exit("Set ADMIN_EMAIL and ADMIN_PASSWORD first.")
c = httpx.Client(base_url=BASE, timeout=20)
results = []
def check(name, ok, detail=""):
    results.append(ok); print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  -> {detail}"))
def png(color=(160, 110, 60)):
    b = io.BytesIO(); Image.new("RGB", (80, 60), color).save(b, "PNG"); return b.getvalue()

r = c.post("/api/v1/auth/login", json={"email": EMAIL, "password": PASSWORD}); check("admin login", r.status_code == 200, r.text)
H = {"Authorization": "Bearer " + r.json()["access_token"]}
check("anonymous cannot list orders", c.get("/api/v1/orders").status_code == 401)

phone = "0300 7770001"; due = str(date.today() + timedelta(days=30))
r = c.post("/api/v1/orders", headers=H, json={"customer_name": "SMOKE TEST Customer", "customer_phone": phone, "customer_email": "smoke@example.com",
        "work_type": "Kitchen", "description": "SMOKE TEST order", "agreed_completion_date": due})
check("admin creates order for a guest customer", r.status_code == 201, r.text); o = r.json()
check("order number is random AUS-XXXXXXXX", o["order_number"].startswith("AUS-") and len(o["order_number"]) == 12)
oid = o["id"]
r = c.post(f"/api/v1/orders/{oid}/status", headers=H, json={"new_status": "in_progress", "update_message": "Production started", "internal_note": "SMOKE-INTERNAL"})
check("status update to in_progress", r.status_code == 200 and r.json()["current_status"] == "in_progress", r.text)
r = c.post(f"/api/v1/orders/{oid}/status", headers=H, json={"update_message": "Delayed", "is_delayed": True})
check("delay without explanation rejected", r.status_code == 422)
r = c.post(f"/api/v1/orders/{oid}/status", headers=H, json={"update_message": "Delayed", "is_delayed": True, "delay_reason": "Smoke test supplier delay"})
check("delay with explanation accepted, status kept", r.status_code == 200 and r.json()["is_delayed"] and r.json()["current_status"] == "in_progress")
new_due = str(date.today() + timedelta(days=40))
r = c.post(f"/api/v1/orders/{oid}/revise-date", headers=H, json={"revised_date": new_due, "reason": "Smoke test revision"})
check("date revision keeps original agreed date", r.status_code == 200 and r.json()["agreed_completion_date"] == due and r.json()["estimated_completion_date"] == new_due)
r = c.post(f"/api/v1/orders/{oid}/commitments", headers=H, json={"commitment_text": "SMOKE TEST commitment", "agreed_date": str(date.today())})
check("commitment added", r.status_code == 201)

r = c.post("/api/v1/tracking/lookup", json={"order_number": o["order_number"], "phone": "+92 300 7770001"})
t = r.json(); check("customer tracking works (different phone format)", r.status_code == 200 and t["is_delayed"] and t["date_revised"] and len(t["commitments"]) == 1, r.text)
check("tracking leaks nothing internal", all(x not in r.text for x in ("SMOKE-INTERNAL", "SMOKE TEST Customer", "smoke@example.com", oid, "internal_note")))
check("wrong phone -> generic 404", c.post("/api/v1/tracking/lookup", json={"order_number": o["order_number"], "phone": "0300 1110000"}).status_code == 404)
check("seeded demo order is trackable", c.post("/api/v1/tracking/lookup", json={"order_number": "AUS-DEMO0001", "phone": "03000000001"}).status_code == 200)

r = c.get("/api/v1/admin/notifications", headers=H, params={"order_id": oid}); n = r.json()
check("notifications recorded for the order", r.status_code == 200 and n["total"] >= 6, r.text)
check("mock providers never claim 'sent'", all(i["delivery_status"] == "not_sent" for i in n["items"]), str({i["delivery_status"] for i in n["items"]}))

cat = c.post("/api/v1/admin/categories", headers=H, json={"name": f"Smoke Cat {os.getpid()}"}).json()
d = c.post("/api/v1/admin/designs", headers=H, json={"category_id": cat["id"], "title": "SMOKE TEST design", "description": "Smoke test design", "publication_status": "draft"}).json()
check("draft design hidden from public", c.get(f"/api/v1/designs/{d['slug']}").status_code == 404)
r = c.post(f"/api/v1/admin/designs/{d['id']}/images", headers=H, files={"file": ("x.png", png(), "image/png")}, data={"alt_text": "smoke"})
check("design image upload", r.status_code == 201, r.text); url = r.json()["image_url"]
r = c.post(f"/api/v1/admin/designs/{d['id']}/images", headers=H, files={"file": ("evil.jpg", b"not really an image", "image/jpeg")})
check("fake image rejected", r.status_code == 422)
c.patch(f"/api/v1/admin/designs/{d['id']}", headers=H, json={"publication_status": "published"})
check("published design visible + image served", c.get(f"/api/v1/designs/{d['slug']}").status_code == 200 and c.get(url).status_code == 200)

r = c.post("/api/v1/enquiries", data={"full_name": "SMOKE Guest", "email": "g@example.com", "phone": "0321 5550000", "work_type": "Wardrobe", "description": "SMOKE TEST enquiry with image"},
           files=[("files", ("ref.png", png((50, 90, 140)), "image/png"))])
check("guest enquiry with reference image", r.status_code == 201 and len(r.json()["attachments"]) == 1, r.text); e = r.json()
adm = c.get(f"/api/v1/admin/enquiries/{e['id']}", headers=H).json(); att = adm["attachments"][0]
check("reference image is not public", c.get(f"/media/private/enquiries/{e['id']}").status_code == 404 and c.get(f"/api/v1/admin/enquiries/{e['id']}/attachments/{att['id']}/file").status_code == 401)
check("staff can open the reference image", c.get(f"/api/v1/admin/enquiries/{e['id']}/attachments/{att['id']}/file", headers=H).status_code == 200)

r = c.post("/api/v1/auth/signup", json={"full_name": "Smoke Customer", "email": f"smoke{os.getpid()}@example.com", "password": "smoke-password-1"})
check("customer signup (role customer)", r.status_code == 201 and r.json()["user"]["role"] == "customer", r.text); CH = {"Authorization": "Bearer " + r.json()["access_token"]}
check("favourites need login", c.post(f"/api/v1/favourites/{d['id']}").status_code == 401)
check("customer adds favourite", c.post(f"/api/v1/favourites/{d['id']}", headers=CH).status_code == 201 and c.get("/api/v1/favourites", headers=CH).json()["total"] == 1)
check("customer cannot open admin endpoints", c.get("/api/v1/admin/dashboard/summary", headers=CH).status_code == 403)
r = c.post("/api/v1/admin/users", headers=H, json={"full_name": "Smoke Staff", "email": f"smokestaff{os.getpid()}@example.com", "password": "smoke-staff-pass-1", "role": "staff"})
check("admin creates a staff account", r.status_code == 201, r.text)
SH = {"Authorization": "Bearer " + c.post("/api/v1/auth/login", json={"email": f"smokestaff{os.getpid()}@example.com", "password": "smoke-staff-pass-1"}).json()["access_token"]}
check("staff can list orders and enquiries", c.get("/api/v1/orders", headers=SH).status_code == 200 and c.get("/api/v1/admin/enquiries", headers=SH).status_code == 200)
check("staff cannot manage gallery / users", c.post("/api/v1/admin/categories", headers=SH, json={"name": "Nope"}).status_code == 403 and c.get("/api/v1/admin/users", headers=SH).status_code == 403)
sd = c.get("/api/v1/admin/dashboard/summary", headers=SH).json(); check("staff dashboard is limited", sd["published_designs"] is None and sd["total_orders"] >= 4, str(sd))
ct = c.get("/api/v1/site/contact").json(); check("public contact details (WhatsApp + email)", ct["whatsapp_number"] == "+923003822377" and ct["email"] == "arrianhbk@gmail.com", str(ct))
s = c.get("/api/v1/admin/dashboard/summary", headers=H).json(); check("dashboard summary", s["total_orders"] >= 4 and s["delayed"] >= 2, str(s))
print(f"\n{sum(results)}/{len(results)} checks passed"); sys.exit(0 if all(results) else 1)
