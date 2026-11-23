from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.permissions import OptionalUser
from app.db.session import get_db
from app.models.design import Design, DesignCategory
from app.models.enums import PublicationStatus
from app.schemas.common import Page
from app.schemas.design import CategoryOut, DesignDetail, DesignListItem
from app.services import design_service as svc

router = APIRouter(tags=["public gallery"])


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return [svc.category_with_count(db, c) for c in db.scalars(select(DesignCategory).order_by(DesignCategory.name))]


@router.get("/designs", response_model=Page[DesignListItem])
def list_designs(user: OptionalUser, db: Session = Depends(get_db),
                 category: str | None = Query(None, max_length=120, description="Category slug"),
                 style: str | None = Query(None, max_length=100), q: str | None = Query(None, max_length=100),
                 page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=60)):
    """Published designs only. Drafts and archived designs are never returned."""
    stmt = svc.design_query().where(Design.publication_status == PublicationStatus.published)
    if category:
        stmt = stmt.join(DesignCategory).where(DesignCategory.slug == category)
    if style:
        stmt = stmt.where(func.lower(Design.style) == style.strip().lower())
    if q:
        stmt = stmt.where(Design.title.icontains(q.strip(), autoescape=True))
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).with_only_columns(Design.id).subquery())) or 0
    rows = list(db.scalars(stmt.order_by(Design.created_at.desc(), Design.id).offset((page - 1) * page_size).limit(page_size)))
    favs = svc.favourite_ids(db, user.id if user else None, [d.id for d in rows])
    return Page(items=[svc.to_list_item(d, d.id in favs) for d in rows], total=total, page=page, page_size=page_size)


@router.get("/designs/{slug}", response_model=DesignDetail)
def get_design(slug: str, user: OptionalUser, db: Session = Depends(get_db)):
    d = db.scalar(svc.design_query().where(Design.slug == slug, Design.publication_status == PublicationStatus.published))
    if d is None:
        raise HTTPException(404, "Design not found.")
    favs = svc.favourite_ids(db, user.id if user else None, [d.id])
    return svc.to_detail(d, d.id in favs)
