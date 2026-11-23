"""Seeds demonstration data. Safe to run repeatedly (it never duplicates anything).

  python -m app.seed

Creates: 3 design categories, 9 clearly labelled DEMONSTRATION designs (with placeholder images) and 3 DEMO orders.
It does NOT create any user. Create the first admin with:  python -m app.cli create-admin --email ... --name ..."""
import io
import json
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.design import Design, DesignCategory, DesignImage
from app.models.enums import CommitmentStatus, OrderStatus, PublicationStatus
from app.models.order import Order, OrderCommitment, OrderDateRevision, OrderStatusHistory
from app.services.design_service import unique_slug
from app.services.storage_service import get_storage

DATA = Path(__file__).parent / "seed_data" / "projects.json"
CATEGORIES = {"Kitchens": "Spanish-style and custom kitchens.", "Wardrobes": "Fitted and walk-in wardrobes.", "Doors": "Interior doors."}
COLORS = {"Kitchens": (176, 138, 96), "Wardrobes": (120, 104, 92), "Doors": (96, 84, 70)}


def placeholder(label: str, color: tuple[int, int, int], n: int) -> bytes:
    im = Image.new("RGB", (1200, 800), tuple(min(255, c + n * 18) for c in color))
    d = ImageDraw.Draw(im)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 44)
    except OSError:
        font = ImageFont.load_default()
    d.text((600, 340), "DEMONSTRATION IMAGE", fill=(50, 35, 20), font=font, anchor="mm")
    d.text((600, 420), label, fill=(50, 35, 20), font=font, anchor="mm")
    d.text((600, 500), f"image {n + 1}", fill=(50, 35, 20), font=font, anchor="mm")
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=80)
    return buf.getvalue()


def seed_designs(db) -> int:
    cats = {}
    for name, desc in CATEGORIES.items():
        c = db.scalar(select(DesignCategory).where(DesignCategory.name == name))
        if c is None:
            c = DesignCategory(name=name, slug=unique_slug(db, DesignCategory, name), description=desc)
            db.add(c)
            db.flush()
        cats[name] = c
    created = 0
    for p in json.loads(DATA.read_text(encoding="utf-8")):
        existing = db.scalar(select(Design).where(Design.title == p["title"], Design.category_id == cats[p["category"]].id))
        if existing is not None:
            existing.is_demonstration = True
            continue
        style = next((x["value"] for x in p["details"] if x["label"] == "Style"), None)
        d = Design(category_id=cats[p["category"]].id, title=p["title"], slug=unique_slug(db, Design, p["title"]),
                   description=p["description"], style=style, publication_status=PublicationStatus.published, is_demonstration=True)
        db.add(d)
        db.flush()
        for n in range(2):
            stored = get_storage().save(placeholder(p["title"], COLORS[p["category"]], n), "designs", "jpg", private=False)
            db.add(DesignImage(design_id=d.id, image_url=stored.url, storage_key=stored.key, alt_text=f"{p['title']} (demonstration image {n + 1})", display_order=n))
        created += 1
    return created


def _at(day: date, hour: int = 10) -> datetime:
    return datetime.combine(day, time(hour), tzinfo=timezone.utc)


def seed_orders(db) -> int:
    today = date.today()
    specs = [
        dict(number="AUS-DEMO0001", name="Demo Customer One", phone="+923000000001", email=None, work="Kitchen (DEMO ORDER)",
             desc="DEMO ORDER: sample kitchen order for testing. Not a real customer.", ordered=today - timedelta(days=21), agreed=today + timedelta(days=14),
             estimated=today + timedelta(days=24), status=OrderStatus.in_progress, delayed="DEMO delay note: a sample material delivery was rescheduled.",
             steps=[(OrderStatus.order_received, 21, "DEMO: order recorded.", False), (OrderStatus.designing, 18, "DEMO: design discussion held.", False),
                    (OrderStatus.in_progress, 10, "DEMO: production started.", False), (OrderStatus.in_progress, 2, "DEMO: delayed, see the explanation.", True)],
             revision=(today + timedelta(days=24), "DEMO: material delivery rescheduled.", 2), commitment="DEMO: countertop delivered first."),
        dict(number="AUS-DEMO0002", name="Demo Customer Two", phone="+923000000002", email=None, work="Wardrobe (DEMO ORDER)",
             desc="DEMO ORDER: sample completed wardrobe order for testing.", ordered=today - timedelta(days=60), agreed=today - timedelta(days=14),
             estimated=today - timedelta(days=14), status=OrderStatus.completed, delayed=None,
             steps=[(OrderStatus.order_received, 60, "DEMO: order recorded.", False), (OrderStatus.in_progress, 45, "DEMO: production started.", False),
                    (OrderStatus.ready_for_collection, 16, "DEMO: ready for collection.", False), (OrderStatus.completed, 14, "DEMO: collected.", False)],
             revision=None, commitment=None),
        dict(number="AUS-DEMO0003", name="Demo Customer Three", phone="+923000000003", email=None, work="Interior doors (DEMO ORDER)",
             desc="DEMO ORDER: sample doors order at the design stage.", ordered=today - timedelta(days=3), agreed=today + timedelta(days=30),
             estimated=today + timedelta(days=30), status=OrderStatus.designing, delayed=None,
             steps=[(OrderStatus.order_received, 3, "DEMO: order recorded.", False), (OrderStatus.designing, 1, "DEMO: design in progress.", False)],
             revision=None, commitment=None),
    ]
    created = 0
    for s in specs:
        if db.scalar(select(Order.id).where(Order.order_number == s["number"])):
            continue
        o = Order(order_number=s["number"], customer_name=s["name"], customer_phone=s["phone"], customer_email=s["email"], work_type=s["work"],
                  description=s["desc"], order_date=s["ordered"], agreed_completion_date=s["agreed"], estimated_completion_date=s["estimated"],
                  current_status=s["status"], is_delayed=bool(s["delayed"]), delay_reason=s["delayed"], created_at=_at(s["ordered"]))
        prev = None
        for st, days_ago, msg, delayed in s["steps"]:
            o.history.append(OrderStatusHistory(previous_status=prev, new_status=st, update_message=msg, is_delayed=delayed,
                                                delay_reason=s["delayed"] if delayed else None, created_at=_at(today - timedelta(days=days_ago))))
            prev = st
        if s["revision"]:
            new_date, reason, days_ago = s["revision"]
            o.revisions.append(OrderDateRevision(previous_date=s["agreed"], revised_date=new_date, reason=reason, created_at=_at(today - timedelta(days=days_ago))))
        if s["commitment"]:
            o.commitments.append(OrderCommitment(commitment_text=s["commitment"], agreed_date=s["ordered"], due_date=s["agreed"], status=CommitmentStatus.active))
        db.add(o)
        created += 1
    return created


def main() -> None:
    with SessionLocal() as db:
        d, o = seed_designs(db), seed_orders(db)
        db.commit()
    print(f"Seeded {d} new demo designs and {o} new demo orders (existing ones are left untouched).")
    print("Demo tracking: order AUS-DEMO0001 with phone 0300 0000001 (also ...0002, ...0003).")
    print("No user was created. Create an admin with: python -m app.cli create-admin --email you@example.com --name \"Your Name\"")


if __name__ == "__main__":
    main()
