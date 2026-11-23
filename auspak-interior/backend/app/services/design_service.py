import uuid

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.design import Design, DesignCategory, Favourite
from app.models.enums import PublicationStatus
from app.schemas.design import AdminDesign, CategoryRef, DesignDetail, DesignListItem, ImageOut
from app.utils.text import slugify


def unique_slug(db: Session, model, base: str, exclude_id: uuid.UUID | None = None) -> str:
    slug, n = slugify(base), 1
    while True:
        q = select(model.id).where(model.slug == slug)
        if exclude_id:
            q = q.where(model.id != exclude_id)
        if db.scalar(q) is None:
            return slug
        n += 1
        slug = f"{slugify(base)}-{n}"


def design_query():
    return select(Design).options(selectinload(Design.images), selectinload(Design.category))


def favourite_ids(db: Session, user_id: uuid.UUID | None, design_ids: list[uuid.UUID]) -> set[uuid.UUID]:
    if user_id is None or not design_ids:
        return set()
    return set(db.scalars(select(Favourite.design_id).where(Favourite.user_id == user_id, Favourite.design_id.in_(design_ids))))


def to_list_item(d: Design, fav: bool = False) -> DesignListItem:
    imgs = sorted(d.images, key=lambda i: (i.display_order, i.created_at))
    return DesignListItem(id=d.id, title=d.title, slug=d.slug, description=d.description, style=d.style, is_demonstration=d.is_demonstration,
                          category=CategoryRef.model_validate(d.category), cover_image=ImageOut.model_validate(imgs[0]) if imgs else None,
                          image_count=len(imgs), is_favourite=fav)


def to_detail(d: Design, fav: bool = False, admin: bool = False) -> DesignDetail | AdminDesign:
    base = to_list_item(d, fav).model_dump()
    imgs = [ImageOut.model_validate(i) for i in sorted(d.images, key=lambda i: (i.display_order, i.created_at))]
    extra = dict(images=imgs, created_at=d.created_at, updated_at=d.updated_at)
    return AdminDesign(**base, **extra, publication_status=d.publication_status) if admin else DesignDetail(**base, **extra)


def get_design_or_404(db: Session, design_id: uuid.UUID) -> Design:
    d = db.scalar(design_query().where(Design.id == design_id))
    if d is None:
        raise HTTPException(404, "Design not found.")
    return d


def get_published_by_id(db: Session, design_id: uuid.UUID) -> Design:
    d = db.scalar(design_query().where(Design.id == design_id, Design.publication_status == PublicationStatus.published))
    if d is None:
        raise HTTPException(404, "Design not found.")
    return d


def category_with_count(db: Session, c: DesignCategory) -> dict:
    n = db.scalar(select(func.count()).select_from(Design).where(Design.category_id == c.id, Design.publication_status == PublicationStatus.published)) or 0
    return {"id": c.id, "name": c.name, "slug": c.slug, "description": c.description, "design_count": n}
