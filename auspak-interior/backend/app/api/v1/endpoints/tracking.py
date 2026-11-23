import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.permissions import client_ip
from app.db.session import get_db
from app.schemas.order import TrackingOut, TrackingRequest
from app.services import order_service as svc
from app.utils.ratelimit import limiter

router = APIRouter(prefix="/tracking", tags=["public tracking"])
log = logging.getLogger("auspak.tracking")


@router.post("/lookup", response_model=TrackingOut)
def lookup(payload: TrackingRequest, request: Request, db: Session = Depends(get_db)):
    """Public. Order number + the phone number registered on the order. Failures are always the same generic 404."""
    s = get_settings()
    limiter.check(f"track-ip:{client_ip(request)}", s.TRACK_RATE_LIMIT, s.TRACK_RATE_WINDOW_SECONDS)
    # Also limit per order number, so guessing phones for one order is slow even from many IP addresses.
    limiter.check(f"track-order:{payload.order_number}", s.TRACK_RATE_LIMIT * 3, 3600)
    order = svc.verify_tracking(db, payload.order_number, payload.phone)
    if order is None:
        log.info("Tracking lookup failed for %s", payload.order_number)
        raise HTTPException(404, "Order not found. Check your order number and the phone number registered on the order.")
    return svc.build_tracking(order)
