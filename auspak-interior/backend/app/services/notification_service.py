"""Creates notification records for order events and tries to deliver them.
Delivery problems are recorded on the notification and never block or undo the order update."""
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.enums import DeliveryStatus, NotificationChannel
from app.models.notification import Notification
from app.models.order import Order
from app.services.providers import get_provider
from app.utils.labels import STATUS_LABELS

log = logging.getLogger("auspak.notifications")

SUBJECTS = {
    "order_created": "Your Auspak Interior order {n} has been recorded",
    "status_changed": "Update on your Auspak Interior order {n}",
    "order_delayed": "Your Auspak Interior order {n} is delayed",
    "date_revised": "New estimated completion date for order {n}",
    "ready_for_collection": "Your order {n} is ready for collection",
    "order_completed": "Your order {n} is completed",
    "commitment_added": "New commitment recorded for order {n}",
    "commitment_updated": "A commitment for order {n} has changed",
    "manual_update": "Message about your Auspak Interior order {n}",
}


def build_message(event: str, order: Order, ctx: dict) -> tuple[str, str]:
    """Customer-safe text only: never includes internal notes."""
    s = get_settings()
    lines = [f"Hello {order.customer_name},", ""]
    status_label = STATUS_LABELS[order.current_status]
    if event == "order_created":
        lines.append(f"Your order {order.order_number} ({order.work_type}) has been recorded.")
    elif event == "ready_for_collection":
        lines.append(f"Good news: your order {order.order_number} is ready for collection.")
    elif event == "order_completed":
        lines.append(f"Your order {order.order_number} is now completed.")
    elif event == "order_delayed":
        lines.append(f"Your order {order.order_number} is delayed.")
        if order.delay_reason:
            lines.append(f"Reason: {order.delay_reason}")
    elif event == "date_revised":
        lines.append(f"The estimated completion date for order {order.order_number} has changed to {order.estimated_completion_date:%d %b %Y}.")
        if ctx.get("reason"):
            lines.append(f"Reason: {ctx['reason']}")
    elif event in ("commitment_added", "commitment_updated"):
        lines.append(f"A commitment for order {order.order_number}: {ctx.get('commitment_text', '')}")
        if ctx.get("due_date"):
            lines.append(f"Due date: {ctx['due_date']:%d %b %Y}")
    else:
        lines.append(f"There is an update on your order {order.order_number}.")
    if ctx.get("message"):
        lines += ["", ctx["message"]]
    lines += ["", f"Current status: {status_label}", f"Estimated completion: {order.estimated_completion_date:%d %b %Y}",
              f"Track your order: {s.FRONTEND_URL}/track-order", "", "Auspak Interior"]
    return SUBJECTS[event].format(n=order.order_number), "\n".join(lines)


def deliver(db: Session, notification: Notification) -> Notification:
    try:
        result = get_provider(notification.channel).send(notification.recipient, notification.subject, notification.message)
        notification.delivery_status = result.status
        notification.provider_message_id = result.provider_message_id
        notification.error_message = result.error
        if result.status == DeliveryStatus.sent:
            notification.sent_at = datetime.now(timezone.utc)
    except Exception as exc:
        log.exception("Notification %s delivery crashed", notification.id)
        notification.delivery_status = DeliveryStatus.failed
        notification.error_message = f"{type(exc).__name__}: {exc}"[:500]
    db.commit()
    return notification


def notify_order_event(db: Session, order: Order, event: str, ctx: dict | None = None,
                       channels: list[NotificationChannel] | None = None) -> list[Notification]:
    """Records one notification per available channel (email if the order has an email, WhatsApp for the phone) and delivers."""
    ctx = ctx or {}
    try:
        subject, text = build_message(event, order, ctx)
        wanted = channels or [NotificationChannel.email, NotificationChannel.whatsapp]
        created: list[Notification] = []
        for ch in wanted:
            recipient = order.customer_email if ch == NotificationChannel.email else order.customer_phone
            if not recipient:
                continue
            n = Notification(user_id=order.customer_id, order_id=order.id, notification_type=event, channel=ch, recipient=recipient,
                             subject=subject if ch == NotificationChannel.email else None, message=text, delivery_status=DeliveryStatus.pending)
            db.add(n)
            created.append(n)
        db.commit()
        return [deliver(db, n) for n in created]
    except Exception:
        db.rollback()
        log.exception("Could not create notifications for order %s (event %s)", order.id, event)
        return []


def retry(db: Session, notification_id: uuid.UUID) -> Notification | None:
    n = db.get(Notification, notification_id)
    if n is None:
        return None
    n.delivery_status = DeliveryStatus.pending
    return deliver(db, n)
