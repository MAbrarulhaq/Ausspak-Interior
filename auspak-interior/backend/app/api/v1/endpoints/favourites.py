import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.permissions import CustomerUser
from app.db.session import get_db
from app.models.design import Design, Favourite
from app.models.enums import PublicationStatus
from app.schemas.common import Message, Page
from app.schemas.design import DesignListItem
from app.services import design_service as svc

router = APIRouter(prefix="/favourites", tags=["favourites (login required)"])


@router.get("", response_model=Page[DesignListItem])
def my_favourites(user: CustomerUser, db: Session = Depends(get_db), page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=60)):
    stmt = (svc.design_query().join(Favourite, Favourite.design_id == Design.id)
            .where(Favourite.user_id == user.id, Design.publication_status == PublicationStatus.published))
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).with_only_columns(Design.id).subquery())) or 0
    rows = list(db.scalars(stmt.order_by(Favourite.created_at.desc()).offset((page - 1) * page_size).limit(page_size)))
    return Page(items=[svc.to_list_item(d, True) for d in rows], total=total, page=page, page_size=page_size)


@router.post("/{design_id}", response_model=Message, status_code=status.HTTP_201_CREATED)
def add_favourite(design_id: uuid.UUID, user: CustomerUser, response: Response, db: Session = Depends(get_db)):
    """Saving the same design twice is safe: it never creates a duplicate."""
    svc.get_published_by_id(db, design_id)
    if db.scalar(select(Favourite.id).where(Favourite.user_id == user.id, Favourite.design_id == design_id)):
        response.status_code = status.HTTP_200_OK
        return Message(message="Already in your favourites.")
    db.add(Favourite(user_id=user.id, design_id=design_id))
    try:
        db.commit()
    except IntegrityError:  # two simultaneous requests: the unique constraint protects us
        db.rollback()
        response.status_code = status.HTTP_200_OK
        return Message(message="Already in your favourites.")
    return Message(message="Added to your favourites.")


@router.delete("/{design_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favourite(design_id: uuid.UUID, user: CustomerUser, db: Session = Depends(get_db)):
    fav = db.scalar(select(Favourite).where(Favourite.user_id == user.id, Favourite.design_id == design_id))
    if fav is None:
        raise HTTPException(404, "This design is not in your favourites.")
    db.delete(fav)
    db.commit()
