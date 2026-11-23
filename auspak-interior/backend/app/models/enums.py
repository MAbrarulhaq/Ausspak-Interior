import enum

import sqlalchemy as sa


class UserRole(str, enum.Enum):
    customer = "customer"
    admin = "admin"
    staff = "staff"


class OrderStatus(str, enum.Enum):
    order_received = "order_received"
    designing = "designing"
    in_progress = "in_progress"
    ready_for_collection = "ready_for_collection"
    completed = "completed"


STATUS_ORDER = [s for s in OrderStatus]  # workflow order


class CommitmentStatus(str, enum.Enum):
    active = "active"
    revised = "revised"
    fulfilled = "fulfilled"
    cancelled = "cancelled"


class PublicationStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class EnquiryStatus(str, enum.Enum):
    new = "new"
    in_review = "in_review"
    contacted = "contacted"
    converted = "converted"  # an official order was created from this enquiry
    closed = "closed"


class NotificationChannel(str, enum.Enum):
    email = "email"
    whatsapp = "whatsapp"


class DeliveryStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"  # only set when a real provider confirmed acceptance
    failed = "failed"
    not_sent = "not_sent"  # recorded only: no real provider is configured (mock)


def enum_col(py_enum: type[enum.Enum], name: str) -> sa.Enum:
    """Stored as VARCHAR + CHECK constraint (easy to evolve with Alembic, unlike native PostgreSQL ENUMs)."""
    return sa.Enum(py_enum, name=name, native_enum=False, create_constraint=True, length=30,
                   values_callable=lambda e: [m.value for m in e])
