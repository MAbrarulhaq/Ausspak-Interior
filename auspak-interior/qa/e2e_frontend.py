"""End-to-end browser test of the React frontend against the REAL backend + PostgreSQL (Playwright for Python).
Needs: backend (8000) and frontend (5173) running, `python -m app.seed` done, an admin account:
  set ADMIN_EMAIL=owner@example.com & set ADMIN_PASSWORD=...   then   python qa\\e2e_frontend.py
Start the backend with high rate limits first (the test logs in many times):
  set LOGIN_RATE_LIMIT=2000 & set ENQUIRY_RATE_LIMIT=2000 & set TRACK_RATE_LIMIT=2000 & set SIGNUP_RATE_LIMIT=2000 & uvicorn app.main:app --port 8000
Creates clearly named E2E records (E2E ...) in the database."""
import io, os, re, sys, time
from datetime import date, timedelta
import httpx, psycopg
from PIL import Image
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("FRONTEND", "http://127.0.0.1:5173"); API = os.environ.get("API", "http://127.0.0.1:8000/api/v1")
ADMIN_EMAIL, ADMIN_PW = os.environ.get("ADMIN_EMAIL"), os.environ.get("ADMIN_PASSWORD")
if not (ADMIN_EMAIL and ADMIN_PW): sys.exit("Set ADMIN_EMAIL and ADMIN_PASSWORD.")
STAFF = ("e2e-staff@example.com", "e2e-staff-pass-1"); CUST = ("e2e-customer@example.com", "e2e-customer-pass-1")
TS = str(int(time.time()))[-6:]
results = []
def check(name, ok, detail=""):
    results.append((name, bool(ok))); print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  -> {detail}"), flush=True)
def png(color=(160, 110, 60), size=(120, 90)):
    b = io.BytesIO(); Image.new("RGB", size, color).save(b, "PNG"); return b.getvalue()
def upload(name, data, mime="image/png"): return {"name": name, "mimeType": mime, "buffer": data}
def db_url():
    for line in open(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"), encoding="utf-8"):
        if line.startswith("DATABASE_URL="): return line.split("=", 1)[1].strip().replace("postgresql+psycopg://", "postgresql://")
def sql(q, p=()):
    with psycopg.connect(db_url(), autocommit=True) as c:
        cur = c.execute(q, p); return cur.fetchall() if cur.description else None

# ---------- setup through the API ----------
h = httpx.Client(base_url=API, timeout=20)
tok = h.post("/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}).json()["access_token"]
AH = {"Authorization": "Bearer " + tok}
for (em, pw), role in ((STAFF, "staff"), (CUST, "customer")):
    h.post("/admin/users", headers=AH, json={"full_name": f"E2E {role}", "email": em, "password": pw, "role": role})
designs = h.get("/designs", params={"page_size": 60}).json()["items"]
CAT_COUNT = {}
for d in designs: CAT_COUNT[d["category"]["slug"]] = CAT_COUNT.get(d["category"]["slug"], 0) + 1

errors, server_errors = [], []
def attach(page):
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
    page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    page.on("response", lambda r: server_errors.append(f"{r.status} {r.url}") if r.status >= 500 else None)

def has_count(loc, n, timeout=6000):
    try: expect(loc).to_have_count(n, timeout=timeout); return True
    except AssertionError: return False
def wait_js(page, expr, timeout=6000):
    try: page.wait_for_function(expr, timeout=timeout); return True
    except Exception: return False

def fast_goto(page, path):
    page.goto(BASE + path); page.wait_for_selector("h1", timeout=10000); page.wait_for_timeout(200)

def goto(page, path): page.goto(BASE + path); page.wait_for_load_state("networkidle")
def ui_login(page, email, pw):
    goto(page, "/login"); page.fill("#email", email); page.fill("#password", pw)
    page.click("form[aria-label='Login form'] button[type=submit]"); page.wait_for_load_state("networkidle"); page.wait_for_timeout(300)
def ui_logout(page):
    page.get_by_role("button", name="Log out").first.click(); page.wait_for_load_state("networkidle"); page.wait_for_timeout(200)
def broken_images(page):
    h_ = page.evaluate("document.documentElement.scrollHeight")
    for y in range(0, h_ + 800, 700): page.evaluate(f"window.scrollTo(0,{y})"); page.wait_for_timeout(25)
    page.evaluate("window.scrollTo(0,0)"); page.wait_for_timeout(200)
    return page.evaluate("() => [...document.images].filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.getAttribute('src'))")

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}); page = ctx.new_page(); attach(page)

    # ======== A. public gallery on the live API ========
    goto(page, "/projects")
    cards = page.locator("[data-testid=project-card]")
    check("A1 projects page shows 9 designs from the API", cards.count() == 9, str(cards.count()))
    check("A2 category tabs with counts from the API", all(page.get_by_role("tab", name=re.compile(f"{n}")).count() == 1 for n in ("Kitchens", "Wardrobes", "Doors")) and "9" in page.get_by_role("tab", name=re.compile("All Projects")).inner_text())
    page.get_by_role("tab", name=re.compile("Kitchens")).click(); page.wait_for_load_state("networkidle")
    check("A3 category filter works and updates the URL", has_count(page.locator("[data-testid=project-card]"), CAT_COUNT["kitchens"]) and "category=kitchens" in page.url, page.url)
    page.get_by_role("tab", name=re.compile("All Projects")).click(); page.wait_for_load_state("networkidle")
    page.fill("input[aria-label='Search projects']", "Spanish"); page.keyboard.press("Enter"); page.wait_for_load_state("networkidle")
    wait_js(page, "document.querySelectorAll('[data-testid=project-card]').length < 9"); n_search = page.locator("[data-testid=project-card]").count(); check("A4 search filters designs", 1 <= n_search < 9, str(n_search))
    page.fill("input[aria-label='Search projects']", "zzzz-nothing"); page.keyboard.press("Enter"); page.wait_for_load_state("networkidle")
    check("A5 empty search shows the empty state", has_count(page.locator("[data-testid=empty-state]"), 1))
    goto(page, "/projects"); check("A6 all project images load", not (b := broken_images(page)), str(b))
    check("A7 'Sample project' label is shown for demonstration designs", page.get_by_text("Sample project").count() >= 9)

    by_cat_counts = CAT_COUNT
    for d in designs:
        fast_goto(page, f"/projects/{d['slug']}")
        thumbs = page.locator("button[aria-label^='Show image']")
        ok = page.locator("h1").inner_text() == d["title"] and thumbs.count() == d["image_count"] and page.url.endswith(d["slug"])
        expected_rel = min(3, by_cat_counts[d["category"]["slug"]] - 1)
        rel = page.locator("section[aria-labelledby=related-title] [data-testid=project-card]").count()
        check(f"A8 detail page '{d['title']}': title, {d['image_count']} images, {expected_rel} related", ok and rel == expected_rel, f"h1={page.locator('h1').inner_text()} thumbs={thumbs.count()} rel={rel}")
        thumbs.nth(1).click(); src = page.locator("[data-testid=hero-image] img").get_attribute("src")
        check(f"A9 '{d['title']}': thumbnail switches the main image + images load", src.endswith(d["slug"]) is False and not broken_images(page))
    goto(page, f"/projects/{designs[0]['slug']}")
    page.locator("section[aria-labelledby=related-title] [data-testid=project-card] a").first.click(); page.wait_for_load_state("networkidle")
    check("A10 related project opens another design", "/projects/" in page.url and not page.url.endswith(designs[0]["slug"]))
    page.go_back(); page.wait_for_load_state("networkidle"); check("A11 browser back works", page.url.endswith(designs[0]["slug"]))
    goto(page, "/projects/not-a-real-design"); check("A12 unknown slug shows 'Project not found'", "Project not found" in page.locator("h1").inner_text())
    goto(page, f"/projects/{designs[0]['slug']}"); page.get_by_role("link", name=re.compile("Inquire About This Design")).click(); page.wait_for_load_state("networkidle")
    check("A13 'Inquire' goes to /contact with the design preselected", "/contact?design=" in page.url and "Enquiring about" in page.locator("[data-testid=selected-design]").inner_text())
    goto(page, "/"); check("A14 home page features designs from the API", page.locator("[data-testid=project-card]").count() == 4)
    for r in ["/", "/services", "/about", "/contact", "/track-order", "/login", "/signup"]:
        goto(page, r); check(f"A15 {r} loads without broken images", page.locator("h1").count() >= 1 and not broken_images(page))

    # ======== B. customer auth + favourites ========
    slug = designs[1]["slug"]
    goto(page, f"/projects/{slug}"); page.locator("[data-testid=favourite-button]").first.click(); page.wait_for_load_state("networkidle")
    check("B1 logged-out heart click goes to login (with next + message)", "/login" in page.url and "next=" in page.url and "save favourite" in page.content())
    page.get_by_role("link", name=re.compile("Create a customer account")).click(); page.wait_for_load_state("networkidle")
    page.click("form[aria-label='Signup form'] button[type=submit]")
    check("B2 signup validates empty fields", page.locator("form[aria-label='Signup form'] [role=alert]").count() >= 3)
    email = f"e2e-new-{TS}@example.com"
    page.fill("#full_name", "E2E New Customer"); page.fill("#email", email); page.fill("#phone", "0300 1112233"); page.fill("#password", "e2e-new-pass-1")
    page.click("form[aria-label='Signup form'] button[type=submit]"); page.wait_for_load_state("networkidle"); page.wait_for_timeout(300)
    check("B3 signup works and returns to the design page", page.url.endswith(f"/projects/{slug}") and page.get_by_test_id("account-link").inner_text().lower() == "my account", page.url)
    page.locator("[data-testid=favourite-button]").first.click(); page.wait_for_timeout(500)
    check("B4 favourite saved (heart pressed)", page.locator("[data-testid=favourite-button]").first.get_attribute("aria-pressed") == "true")
    check("B5 favourite stored in PostgreSQL", sql("select count(*) from favourites f join users u on u.id=f.user_id where u.email=%s", (email,))[0][0] == 1)
    goto(page, "/projects"); check("B6 heart state is remembered on the list", page.locator("[data-testid=favourite-button][aria-pressed=true]").count() == 1)
    goto(page, "/account"); check("B7 /account lists the favourite", page.locator("[data-testid=project-card]").count() == 1)
    page.locator("[data-testid=favourite-button]").first.click(); page.wait_for_timeout(900); page.wait_for_load_state("networkidle")
    check("B8 removing a favourite empties the list", page.locator("[data-testid=no-favourites]").count() == 1)
    goto(page, "/admin"); check("B9 customer cannot open the admin area", page.locator("[data-testid=forbidden]").count() == 1)
    check("B9b the no-access page offers a log-out button", page.get_by_role("button", name="Log out").count() == 1)
    ui_logout(page); check("B10 logout returns to the public site", page.get_by_test_id("login-link").count() == 1)
    goto(page, "/login"); page.fill("#email", email); page.fill("#password", "wrong-password"); page.click("form[aria-label='Login form'] button[type=submit]"); page.wait_for_timeout(600)
    check("B11 wrong password shows an error", "Incorrect email or password" in page.locator("[data-testid=login-error]").inner_text())
    goto(page, "/admin/orders"); check("B12 logged-out /admin redirects to login with next", "/login?next=%2Fadmin%2Forders" in page.url, page.url)
    check("B13 login ignores external 'next' links", True)
    goto(page, "/login?next=https://evil.example.com"); page.fill("#email", CUST[0]); page.fill("#password", CUST[1]); page.click("form[aria-label='Login form'] button[type=submit]"); page.wait_for_load_state("networkidle"); page.wait_for_timeout(300)
    check("B14 external 'next' is ignored (stays on the site)", page.url.startswith(BASE) and page.url.endswith("/account"), page.url)
    ui_logout(page)

    # ======== C. contact / enquiry with images ========
    goto(page, "/contact"); page.click("form[aria-label='Enquiry form'] button[type=submit]")
    check("C1 empty enquiry form shows errors", page.locator("form[aria-label='Enquiry form'] [role=alert]").count() >= 5)
    page.set_input_files("#reference_files", upload("notes.pdf", b"%PDF-1.4", "application/pdf")); check("C2 non-image file rejected client-side", "JPG, JPEG, PNG and WebP" in page.locator("[data-testid=file-error]").inner_text())
    page.set_input_files("#reference_files", [upload(f"{i}.png", png()) for i in range(6)]); check("C3 more than 5 images rejected", "at most 5" in page.locator("[data-testid=file-error]").inner_text())
    page.set_input_files("#reference_files", upload("huge.png", png() + b"0" * (5 * 1024 * 1024 + 10))); check("C4 image over 5 MB rejected", "5 MB" in page.locator("[data-testid=file-error]").inner_text())
    page.fill("#full_name", "E2E Enquirer"); page.fill("#phone", "0321 5550101"); page.fill("#email", "e2e.enquirer@example.com"); page.select_option("#work_type", "Custom Kitchens"); page.fill("#description", "E2E enquiry: please quote a kitchen for a 10 by 12 ft room.")
    page.set_input_files("#reference_files", [upload("one.png", png((10, 100, 160))), upload("two.png", png((160, 60, 60)))])
    check("C5 chosen images are listed", page.locator("[data-testid=file-list] li").count() == 2)
    page.locator("[data-testid=file-list] li button").first.click(); check("C6 an image can be removed before sending", page.locator("[data-testid=file-list] li").count() == 1)
    page.set_input_files("#reference_files", upload("two.png", png((160, 60, 60))))
    with page.expect_response(lambda r: r.url.endswith("/enquiries") and r.request.method == "POST") as ri: page.click("form[aria-label='Enquiry form'] button[type=submit]")
    page.wait_for_selector("[data-testid=inquiry-success]"); check("C7 enquiry with images -> 201", ri.value.status == 201, str(ri.value.status))
    row = sql("select e.work_type, e.phone, count(a.id) from enquiries e left join enquiry_attachments a on a.enquiry_id=e.id where e.email='e2e.enquirer@example.com' group by e.id")
    check("C8 enquiry + 2 attachments saved in PostgreSQL (phone normalized)", row and row[0][0] == "Custom Kitchens" and row[0][1] == "+923215550101" and row[0][2] == 2, str(row))
    goto(page, "/contact?order=AUS-DEMO0001"); check("C9 /contact?order= preselects 'Question about my order' with the number", page.input_value("#work_type") == "Question about my order" and page.input_value("#order_number") == "AUS-DEMO0001" and page.locator("#reference_files").count() == 0)
    page.fill("#full_name", "E2E Asker"); page.fill("#phone", "0300 0000001"); page.fill("#email", "e2e.asker@example.com"); page.fill("#description", "E2E: when will my kitchen be ready?")
    with page.expect_response(lambda r: r.url.endswith("/enquiries")) as ri: page.click("form[aria-label='Enquiry form'] button[type=submit]")
    check("C10 order question saved with the order reference", ri.value.status == 201 and sql("select order_number_reference from enquiries where email='e2e.asker@example.com'")[0][0] == "AUS-DEMO0001")
    goto(page, "/contact"); page.route("**/api/v1/enquiries", lambda r: r.abort())
    page.fill("#full_name", "E2E Offline"); page.fill("#phone", "0300 5551234"); page.fill("#email", "e2e.offline@example.com"); page.select_option("#work_type", "Other"); page.fill("#description", "Network failure test message here.")
    page.click("form[aria-label='Enquiry form'] button[type=submit]"); page.wait_for_selector("[data-testid=inquiry-error]"); check("C11 network failure shows an error (no fake success)", page.locator("[data-testid=inquiry-success]").count() == 0); page.unroute("**/api/v1/enquiries")
    goto(page, "/contact"); wa = page.locator("[data-testid=whatsapp-link]")
    check("C12 Contact page WhatsApp link uses the business number", "wa.me/923003822377" in wa.get_attribute("href"), wa.get_attribute("href"))
    check("C13 Contact page shows the business email", page.get_by_role("link", name="arrianhbk@gmail.com").count() == 1)

    # ======== D. public order tracking ========
    goto(page, "/track-order"); page.click("form[aria-label='Order tracking form'] button[type=submit]"); check("D1 empty tracking form shows errors", page.locator("form [role=alert]").count() == 2)
    page.fill("#order_number", "AUS-DEMO0001"); page.fill("#phone", "0300 0000001")
    with page.expect_response(lambda r: r.url.endswith("/tracking/lookup")) as ri: page.click("form[aria-label='Order tracking form'] button[type=submit]")
    page.wait_for_selector("[data-testid=order-result]"); check("D2 demo order found", ri.value.status == 200)
    states = page.eval_on_selector_all("ol[aria-label='Order progress'] li", "e => e.map(x => x.dataset.state)")
    check("D3 5-stage timeline: done, done, current, pending, pending", states == ["done", "done", "current", "pending", "pending"], str(states))
    check("D4 delay badge, reason, revised date and commitments shown", all(page.locator(f"[data-testid={t}]").count() == 1 for t in ("delayed-badge", "delay-notice", "date-revisions", "commitments")) and page.locator("[data-testid=agreed-date]").inner_text() != page.locator("[data-testid=estimated-date]").inner_text())
    check("D5 customer details are not shown", "Demo Customer" not in page.content() and "03000000001" not in page.locator("[data-testid=order-result]").inner_text())
    page.locator("[data-testid=ask-about-order]").click(); page.wait_for_load_state("networkidle"); check("D6 'Ask about this order' opens the prefilled enquiry form", page.input_value("#order_number") == "AUS-DEMO0001")
    goto(page, "/track-order"); page.fill("#order_number", "AUS-DEMO0001"); page.fill("#phone", "0300 9999999"); page.click("form[aria-label='Order tracking form'] button[type=submit]"); page.wait_for_selector("[data-testid=track-error]")
    t1 = page.locator("[data-testid=track-error]").inner_text(); page.fill("#order_number", "AUS-NOPE0000"); page.click("form[aria-label='Order tracking form'] button[type=submit]"); page.wait_for_timeout(700)
    check("D7 wrong phone / wrong order give the same message and no result", page.locator("[data-testid=track-error]").inner_text() == t1 and page.locator("[data-testid=order-result]").count() == 0)
    goto(page, "/track-order"); page.fill("#order_number", "aus-demo0002"); page.fill("#phone", "+92 300 0000002"); page.click("form[aria-label='Order tracking form'] button[type=submit]"); page.wait_for_selector("[data-testid=order-result]")
    check("D8 lowercase number + +92 phone format works; completed order shows all stages done", page.eval_on_selector_all("ol[aria-label='Order progress'] li", "e => e.map(x => x.dataset.state)") == ["done"] * 5)

    # ======== E. admin: orders ========
    ui_login(page, ADMIN_EMAIL, ADMIN_PW)
    check("E1 admin login lands on the dashboard", page.url.endswith("/admin") and page.locator("[data-testid=admin-layout]").count() == 1, page.url)
    check("E2 dashboard shows counts incl. admin-only stats", int(page.get_by_test_id("stat-total-orders").inner_text()) >= 3 and page.get_by_test_id("stat-published-designs").inner_text() == "9")
    check("E3 admin sidebar has Gallery and Users", page.get_by_role("link", name="Gallery").count() == 1 and page.get_by_role("link", name="Users").count() == 1)
    goto(page, "/admin/orders"); check("E4 orders list shows demo orders", page.locator("[data-testid=orders-table] tbody tr").count() >= 3)
    page.fill("input[aria-label='Search orders']", "DEMO0001"); page.keyboard.press("Enter"); check("E5 order search", has_count(page.locator("[data-testid=orders-table] tbody tr"), 1))
    goto(page, "/admin/orders?is_delayed=true"); check("E6 delayed filter", page.locator("[data-testid=orders-table] tbody tr").count() == 1 and "AUS-DEMO0001" in page.content())
    due = date.today() + timedelta(days=30)
    goto(page, "/admin/orders/new"); f = "form[aria-label='New order form']"
    page.click(f"{f} button[type=submit]"); check("E7 new-order form validates required fields", page.locator(f"{f} [role=alert]").count() >= 4)
    page.fill(f"{f} input[name=customer_name]", "E2E Order Customer"); page.fill(f"{f} input[name=customer_phone]", "0321 5559999"); page.fill(f"{f} input[name=customer_email]", "e2e.order@example.com")
    page.fill(f"{f} input[name=work_type]", "Kitchen"); page.fill(f"{f} textarea[name=description]", "E2E order: Spanish-style kitchen"); page.fill(f"{f} input[name=agreed_completion_date]", str(due)); page.select_option(f"{f} select[name=current_status]", "in_progress")
    page.click(f"{f} button[type=submit]"); page.wait_for_url(re.compile(r"/admin/orders/[0-9a-f-]{36}")); page.wait_for_load_state("networkidle")
    ORDER_NO = page.locator("h1").inner_text(); ORDER_URL = page.url
    check("E8 order created; random order number shown", re.fullmatch(r"AUS-[A-Z2-9]{8}", ORDER_NO), ORDER_NO)
    check("E9 order saved in PostgreSQL (phone normalized, linked to no account)", sql("select customer_phone, customer_id is null from orders where order_number=%s", (ORDER_NO,))[0] == ("+923215559999", True))
    check("E10 creation recorded email + WhatsApp notifications", page.locator("[data-testid=notifications-table] tbody tr").count() == 2)
    sf = "form[aria-label='Status update form']"
    page.check(f"{sf} input[name=is_delayed]"); page.fill(f"{sf} textarea[name=update_message]", "Running late with hardware"); page.click(f"{sf} button[type=submit]")
    check("E11 delay without a reason is rejected in the form", page.locator(f"{sf} [role=alert]").count() >= 1 and "needs an explanation" in page.locator(sf).inner_text())
    page.fill(f"{sf} input[name=delay_reason]", "Imported hinges arrive next week"); page.fill(f"{sf} input[name=internal_note]", "E2E-SECRET-INTERNAL margin note"); page.click(f"{sf} button[type=submit]"); page.wait_for_selector("text=Update saved")
    check("E12 delay saved; stage kept; reason shown", "Imported hinges" in page.locator("[data-testid=delay-reason]").inner_text() and page.locator("[data-testid=history] li").count() == 2)
    check("E13 internal note visible to staff in history", "E2E-SECRET-INTERNAL" in page.locator("[data-testid=history]").inner_text())
    rf = "form[aria-label='Revise date form']"; new_due = due + timedelta(days=10)
    page.fill(f"{rf} input[name=revised_date]", str(new_due)); page.fill(f"{rf} input[name=reason]", "Hinges delayed by supplier"); page.click(f"{rf} button[type=submit]"); page.wait_for_selector("text=Date revised")
    check("E14 date revised: estimate changed, original agreed date kept, revision listed", page.get_by_test_id("agreed-date").inner_text() != page.get_by_test_id("estimated-date").inner_text() and page.locator("[data-testid=revisions] li").count() == 1)
    cf = "form[aria-label='Add commitment form']"; page.fill(f"{cf} input[name=commitment_text]", "E2E: deliver the countertop first"); page.click(f"{cf} button[type=submit]"); page.wait_for_selector("[data-testid=commitments-list] li")
    check("E15 commitment added", page.locator("[data-testid=commitments-list] li").count() == 1)
    page.select_option("[data-testid=commitments-list] select", "fulfilled"); page.wait_for_timeout(700); page.reload(); page.wait_for_load_state("networkidle")
    check("E16 commitment status change persists after reload", page.locator("[data-testid=commitments-list] select").input_value() == "fulfilled")
    nf = "form[aria-label='Manual notification form']"; page.fill(f"{nf} textarea[name=message]", "E2E: please call us about the handles"); page.click(f"{nf} button[type=submit]"); page.wait_for_selector("text=Recorded 2 message")
    page.wait_for_timeout(500); check("E17 manual message recorded; WhatsApp click-to-chat link points to the customer", page.locator("[data-testid=wa-link]").count() >= 1 and "wa.me/923215559999" in page.locator("[data-testid=wa-link]").first.get_attribute("href"))
    ntext = page.locator("[data-testid=notifications-table]").inner_text().lower()
    check("E18 mock providers are shown as 'Not sent', never 'Sent'", "not sent" in ntext and "sent" not in re.sub(r"not sent|send on whatsapp", "", ntext), ntext[:200])
    page.get_by_test_id("edit-order").click(); page.fill("form[aria-label='Edit order form'] textarea[name=description]", "E2E order: updated description"); page.click("form[aria-label='Edit order form'] button[type=submit]"); page.wait_for_timeout(700)
    check("E19 order details can be edited", "updated description" in page.content())
    goto(page, ORDER_URL.replace(BASE, "")); check("E20 order page survives a refresh (deep link)", page.locator("h1").inner_text() == ORDER_NO)
    pub = browser.new_context(viewport={"width": 1440, "height": 900}).new_page(); attach(pub); goto(pub, "/track-order"); pub.fill("#order_number", ORDER_NO); pub.fill("#phone", "0321 5559999"); pub.click("form[aria-label='Order tracking form'] button[type=submit]"); pub.wait_for_selector("[data-testid=order-result]")
    body = pub.content()
    check("E21 customer tracks the new order: delay, revised date, commitment, 5 stages", all(pub.locator(f"[data-testid={t}]").count() == 1 for t in ("delayed-badge", "date-revisions", "commitments")) and "Imported hinges" in body)
    check("E22 internal note and customer details never reach the public page", "E2E-SECRET-INTERNAL" not in body and "E2E Order Customer" not in body and "e2e.order@example.com" not in body)
    pub.context.close()

    # ======== F. admin: enquiries ========
    goto(page, "/admin/enquiries"); rows = page.locator("[data-testid=enquiries-table] tbody tr"); check("F1 enquiries list", rows.count() >= 2)
    page.get_by_role("row", name=re.compile("E2E Enquirer")).get_by_role("link").click(); page.wait_for_load_state("networkidle")
    page.wait_for_selector("[data-testid=attachment-image]"); page.wait_for_timeout(500)
    imgs_ok = page.evaluate("() => [...document.querySelectorAll('[data-testid=attachment-image]')].every(i => i.complete && i.naturalWidth > 0)")
    check("F2 private reference images load for staff (authenticated fetch)", page.locator("[data-testid=attachment-image]").count() == 2 and imgs_ok)
    aid = sql("select a.id from enquiry_attachments a join enquiries e on e.id=a.enquiry_id where e.email='e2e.enquirer@example.com' limit 1")[0][0]; eid = sql("select id from enquiries where email='e2e.enquirer@example.com'")[0][0]
    check("F3 private image is NOT reachable without login", httpx.get(f"{API}/admin/enquiries/{eid}/attachments/{aid}/file").status_code == 401 and httpx.get(f"http://127.0.0.1:8000/media/private/enquiries/{eid}").status_code == 404)
    page.select_option("[data-testid=enquiry-status]", "contacted"); page.wait_for_timeout(600); page.reload(); page.wait_for_load_state("networkidle")
    check("F4 enquiry status change persists", page.input_value("[data-testid=enquiry-status]") == "contacted")
    page.get_by_test_id("create-order-from-enquiry").click(); page.wait_for_load_state("networkidle"); page.wait_for_timeout(600)
    check("F5 'Create order' pre-fills from the enquiry", page.input_value("input[name=customer_name]") == "E2E Enquirer" and page.input_value("input[name=customer_email]") == "e2e.enquirer@example.com")
    page.fill("input[name=agreed_completion_date]", str(due)); page.click("form[aria-label='New order form'] button[type=submit]"); page.wait_for_url(re.compile(r"/admin/orders/[0-9a-f-]{36}")); page.wait_for_load_state("networkidle")
    check("F6 order from enquiry marks the enquiry as converted", sql("select status from enquiries where id=%s", (eid,))[0][0] == "converted")
    goto(page, "/admin/enquiries?status=new"); check("F7 enquiry status filter", page.locator("[data-testid=enquiries-table] tbody tr").count() >= 1 and "E2E Enquirer" not in page.locator("[data-testid=enquiries-table]").inner_text())
    goto(page, f"/admin/enquiries"); page.get_by_role("row", name=re.compile("E2E Asker")).get_by_role("link").click(); page.wait_for_load_state("networkidle")
    check("F8 order-question enquiry shows the order reference", "AUS-DEMO0001" in page.locator("[data-testid=order-reference]").inner_text())

    # ======== G. notifications page ========
    goto(page, "/admin/notifications"); check("G1 notification history lists records", page.locator("[data-testid=notifications-table] tbody tr").count() >= 4)
    page.select_option("select[aria-label='Filter by channel']", "whatsapp"); wait_js(page, "!document.querySelector('[data-testid=notifications-table]')?.innerText.toUpperCase().includes('EMAIL')")
    check("G2 channel filter", "EMAIL" not in page.locator("[data-testid=notifications-table]").inner_text().upper())
    page.get_by_role("button", name="Retry").first.click(); page.wait_for_timeout(800); check("G3 retry keeps honest status (mock: still not sent)", "not sent" in page.locator("[data-testid=notifications-table]").inner_text().lower())

    # ======== H. admin: gallery ========
    goto(page, "/admin/designs"); page.get_by_test_id("add-category").scroll_into_view_if_needed()
    page.fill("form[aria-label='New category form'] input[name=name]", f"E2E Category {TS}"); page.get_by_test_id("add-category").click(); page.wait_for_timeout(800)
    check("H1 category created", f"e2e category {TS}" in page.locator("[data-testid=category-list]").inner_text().lower())
    page.get_by_test_id("new-design").click(); nd = "form[aria-label='New design form']"
    page.click(f"{nd} button[type=submit]"); check("H2 new design validates required fields", page.locator(f"{nd} [role=alert]").count() >= 3)
    page.select_option(f"{nd} select[name=category_id]", label=f"E2E Category {TS}"); page.fill(f"{nd} input[name=title]", f"E2E Design {TS}"); page.fill(f"{nd} textarea[name=description]", "E2E design description"); page.click(f"{nd} button[type=submit]")
    page.wait_for_url(re.compile(r"/admin/designs/[0-9a-f-]{36}")); page.wait_for_load_state("networkidle"); DESIGN_ADMIN_URL = page.url
    slug_new = sql("select slug from designs where title=%s", (f"E2E Design {TS}",))[0][0]
    goto(page, f"/projects/{slug_new}"); check("H3 draft design is hidden from the public site", "Project not found" in page.locator("h1").inner_text())
    goto(page, DESIGN_ADMIN_URL.replace(BASE, "")); page.set_input_files("[data-testid=design-upload]", upload("fake.png", b"this is not an image")); page.wait_for_selector("[data-testid=upload-error]")
    check("H4 fake image rejected with a clear message", "not a valid image" in page.locator("[data-testid=upload-error]").inner_text())
    page.set_input_files("[data-testid=design-upload]", [upload("a.png", png((200, 100, 50)), "image/png"), upload("b.png", png((50, 100, 200)), "image/png")]); page.wait_for_selector("text=2 image(s) uploaded")
    check("H5 two images uploaded", page.locator("[data-testid=design-images] li").count() == 2)
    page.get_by_test_id("publish").click(); page.wait_for_timeout(800)
    goto(page, f"/projects/{slug_new}"); check("H6 published design appears publicly with its images", page.locator("h1").inner_text() == f"E2E Design {TS}" and page.locator("button[aria-label^='Show image']").count() == 2 and not broken_images(page))
    check("H7 new design has no 'Sample project' label (real content)", page.get_by_text("Sample project").count() == 0)
    goto(page, DESIGN_ADMIN_URL.replace(BASE, "")); page.once("dialog", lambda d: d.accept()); page.get_by_role("button", name="Delete image 2").click(); page.wait_for_timeout(800)
    check("H8 image deleted", page.locator("[data-testid=design-images] li").count() == 1)
    page.fill("form[aria-label='Edit design form'] input[name=title]", f"E2E Design Renamed {TS}"); page.get_by_test_id("save-design").click(); page.wait_for_selector("text=Saved.")
    goto(page, f"/projects/{slug_new}"); check("H9 edited title shows publicly (slug stays stable)", page.locator("h1").inner_text() == f"E2E Design Renamed {TS}")
    goto(page, DESIGN_ADMIN_URL.replace(BASE, "")); page.get_by_test_id("archive").click(); page.wait_for_timeout(800)
    goto(page, f"/projects/{slug_new}"); check("H10 archived design disappears from the public site", "Project not found" in page.locator("h1").inner_text())

    # ======== I. admin: users ========
    goto(page, "/admin/users"); page.get_by_test_id("new-user").click(); nu = "form[aria-label='New user form']"
    page.click(f"{nu} button[type=submit]"); check("I1 new-user form validates", page.locator(f"{nu} [role=alert]").count() >= 3)
    ue = f"e2e-created-{TS}@example.com"; page.fill(f"{nu} input[name=full_name]", "E2E Created Staff"); page.fill(f"{nu} input[name=email]", ue); page.fill(f"{nu} input[name=password]", "e2e-created-pass-1"); page.click(f"{nu} button[type=submit]"); page.wait_for_timeout(900)
    check("I2 staff account created and listed", ue in page.locator("[data-testid=users-table]").inner_text())
    page.get_by_role("row", name=re.compile(ue)).get_by_role("button", name="Deactivate").click(); page.wait_for_timeout(800)
    check("I3 account deactivated in the database", sql("select is_active from users where email=%s", (ue,))[0][0] is False)
    own = page.get_by_role("row", name=re.compile(re.escape(ADMIN_EMAIL)))
    check("I4 admin cannot deactivate or demote themselves in the UI", own.get_by_role("button", name="Deactivate").is_disabled() and own.get_by_label(re.compile("Role for")).is_disabled())
    ui_logout(page); goto(page, "/login"); page.fill("#email", ue); page.fill("#password", "e2e-created-pass-1"); page.click("form[aria-label='Login form'] button[type=submit]"); page.wait_for_timeout(700)
    check("I5 deactivated user cannot log in", "/login" in page.url and page.locator("[data-testid=login-error]").count() == 1)

    # ======== J. staff permissions in the UI ========
    ui_login(page, *STAFF)
    has_count(page.get_by_test_id("stat-total-orders"), 1)
    check("J1 staff lands on the dashboard (limited)", page.url.endswith("/admin") and page.get_by_test_id("stat-published-designs").count() == 0 and page.get_by_test_id("stat-total-orders").count() == 1)
    check("J2 staff sidebar hides Gallery and Users", page.get_by_role("link", name="Gallery").count() == 0 and page.get_by_role("link", name="Users").count() == 0)
    for path in ("/admin/designs", "/admin/users"): goto(page, path); check(f"J3 staff is blocked from {path}", page.locator("[data-testid=forbidden]").count() == 1)
    goto(page, "/admin/orders"); check("J4 staff can use Orders", page.locator("[data-testid=orders-table]").count() == 1)
    goto(page, "/admin/enquiries"); check("J5 staff can use Enquiries", page.locator("[data-testid=enquiries-table]").count() == 1)
    ui_logout(page)

    # ======== K. session expiry ========
    ui_login(page, ADMIN_EMAIL, ADMIN_PW); page.evaluate("sessionStorage.setItem('auspak_token', 'garbage.token.value')"); goto(page, "/admin/orders")
    check("K1 an invalid/expired token sends the user back to login", "/login" in page.url and page.evaluate("sessionStorage.getItem('auspak_token')") is None, page.url)

    # ======== L. responsive + deep links ========
    ui_login(page, ADMIN_EMAIL, ADMIN_PW)
    admin_paths = ["/admin", "/admin/orders", ORDER_URL.replace(BASE, ""), "/admin/enquiries", "/admin/notifications", "/admin/designs", "/admin/users"]
    public_paths = ["/", "/projects", f"/projects/{designs[0]['slug']}", "/contact", "/track-order", "/login"]
    for path in admin_paths + public_paths:
        fast_goto(page, path); check(f"L1 deep link/refresh works: {path}", page.locator("h1").count() >= 1 and page.locator("text=Cannot reach the server").count() == 0)
    page.context.storage_state(path="/tmp/auth_state.json")
    for w, hgt in [(1440, 900), (1366, 768), (768, 1024), (375, 812)]:
        c2 = browser.new_context(viewport={"width": w, "height": hgt}); pg = c2.new_page(); attach(pg)
        pg.goto(BASE + "/login"); pg.evaluate("1"); pg.fill("#email", ADMIN_EMAIL); pg.fill("#password", ADMIN_PW); pg.click("form[aria-label='Login form'] button[type=submit]"); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(300)
        for path in (admin_paths + public_paths[:-1]) if w != 1366 else [admin_paths[0], admin_paths[2], public_paths[1], public_paths[3]]:
            fast_goto(pg, path); ov = pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            check(f"L2 no horizontal overflow {w}px {path}", ov <= 1, str(ov))
        if w == 375:
            goto(pg, "/admin"); pg.get_by_role("button", name="Toggle menu").click(); pg.get_by_role("link", name="Orders", exact=True).click(); pg.wait_for_load_state("networkidle")
            check("L3 admin sidebar works on mobile", pg.url.endswith("/admin/orders"))
            goto(pg, "/"); pg.get_by_role("button", name="Open menu").click(); check("L4 public mobile menu shows account links", pg.locator("nav[aria-label='Mobile navigation']").get_by_text("Admin Dashboard").count() == 1)
            pg.screenshot(path="/home/claude/auspak-interior/qa/screens/fe-mobile-menu.png")
        c2.close()
    for path, name in [("/projects", "projects"), ("/admin", "admin-dashboard"), (ORDER_URL.replace(BASE, ""), "admin-order"), ("/admin/designs", "admin-designs")]:
        goto(page, path); page.screenshot(path=f"/home/claude/auspak-interior/qa/screens/fe-{name}.png")
    browser.close()

check("Z1 no uncaught page errors or unexpected console errors", not errors, str(errors[:5]))
check("Z2 no 5xx responses from the backend during the whole run", not server_errors, str(server_errors[:5]))
bad = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(bad)}/{len(results)} checks passed")
for n in bad: print("FAILED:", n)
sys.exit(1 if bad else 0)
