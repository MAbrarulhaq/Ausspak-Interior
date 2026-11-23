import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.permissions import AdminUser
from app.db.session import get_db
from app.models.design import Design, DesignCategory, DesignImage
from app.models.enums import PublicationStatus
from app.schemas.common import Page
from app.schemas.design import (AdminDesign, CategoryCreate, CategoryOut, CategoryPatch, DesignCreate, DesignPatch, ImageOut, ImagePatch)
from app.services import design_service as svc
from app.services.storage_service import get_storage
from app.utils.images import validate_image

router = APIRouter(prefix="/admin", tags=["gallery management (admin only)"])
MAX_IMAGES_PER_DESIGN = 20


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, user: AdminUser, db: Session = Depends(get_db)):
    if db.scalar(select(DesignCategory.id).where(func.lower(DesignCategory.name) == payload.name.strip().lower())):
        raise HTTPException(409, "A category with this name already exists.")
    c = DesignCategory(name=payload.name.strip(), slug=svc.unique_slug(db, DesignCategory, payload.name), description=payload.description)
    db.add(c)
    db.commit()
    return svc.category_with_count(db, c)


@router.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: uuid.UUID, payload: CategoryPatch, user: AdminUser, db: Session = Depends(get_db)):
    c = db.get(DesignCategory, category_id)
    if c is None:
        raise HTTPException(404, "Category not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, k, v)  # the slug is kept stable so existing links keep working
    db.commit()
    return svc.category_with_count(db, c)


@router.get("/designs", response_model=Page[AdminDesign])
def admin_list_designs(user: AdminUser, db: Session = Depends(get_db), publication_status: PublicationStatus | None = None,
                       category: str | None = Query(None, max_length=120), page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    """All designs including drafts and archived ones."""
    stmt = svc.design_query()
    if publication_status:
        stmt = stmt.where(Design.publication_status == publication_status)
    if category:
        stmt = stmt.join(DesignCategory).where(DesignCategory.slug == category)
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).with_only_columns(Design.id).subquery())) or 0
    rows = list(db.scalars(stmt.order_by(Design.created_at.desc(), Design.id).offset((page - 1) * page_size).limit(page_size)))
    return Page(items=[svc.to_detail(d, admin=True) for d in rows], total=total, page=page, page_size=page_size)


@router.get("/designs/{design_id}", response_model=AdminDesign)
def admin_get_design(design_id: uuid.UUID, user: AdminUser, db: Session = Depends(get_db)):
    """One design in any publication state (for the editor)."""
    return svc.to_detail(svc.get_design_or_404(db, design_id), admin=True)


@router.post("/designs", response_model=AdminDesign, status_code=status.HTTP_201_CREATED)
def create_design(payload: DesignCreate, user: AdminUser, db: Session = Depends(get_db)):
    if db.get(DesignCategory, payload.category_id) is None:
        raise HTTPException(422, "category_id does not match any category.")
    d = Design(category_id=payload.category_id, title=payload.title.strip(), slug=svc.unique_slug(db, Design, payload.title),
               description=payload.description.strip(), style=payload.style.strip() if payload.style else None,
               publication_status=payload.publication_status, is_demonstration=payload.is_demonstration)
    db.add(d)
    db.commit()
    return svc.to_detail(svc.get_design_or_404(db, d.id), admin=True)


@router.patch("/designs/{design_id}", response_model=AdminDesign)
def update_design(design_id: uuid.UUID, payload: DesignPatch, user: AdminUser, db: Session = Depends(get_db)):
    d = svc.get_design_or_404(db, design_id)
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("category_id") and db.get(DesignCategory, changes["category_id"]) is None:
        raise HTTPException(422, "category_id does not match any category.")
    for k, v in changes.items():
        if v is None and k != "style":
            continue
        setattr(d, k, v.strip() if isinstance(v, str) else v)  # slug stays stable
    db.commit()
    return svc.to_detail(svc.get_design_or_404(db, design_id), admin=True)


@router.delete("/designs/{design_id}", response_model=AdminDesign)
def archive_design(design_id: uuid.UUID, user: AdminUser, db: Session = Depends(get_db)):
    """Archives the design (it disappears from the public site). Nothing is physically deleted, so links such as
    favourites and past enquiries stay intact. Re-publish with PATCH publication_status."""
    d = svc.get_design_or_404(db, design_id)
    d.publication_status = PublicationStatus.archived
    db.commit()
    return svc.to_detail(svc.get_design_or_404(db, design_id), admin=True)


@router.post("/designs/{design_id}/images", response_model=ImageOut, status_code=status.HTTP_201_CREATED)
async def add_design_image(design_id: uuid.UUID, user: AdminUser, db: Session = Depends(get_db), file: UploadFile = File(...),
                           alt_text: str = Form("", max_length=200), display_order: int | None = Form(None, ge=0, le=1000)):
    d = svc.get_design_or_404(db, design_id)
    if len(d.images) >= MAX_IMAGES_PER_DESIGN:
        raise HTTPException(422, f"A design can have at most {MAX_IMAGES_PER_DESIGN} images.")
    data = await file.read(get_settings().MAX_IMAGE_BYTES + 1)
    info = validate_image(data, file.filename)
    stored = get_storage().save(data, "designs", info.ext, private=False)
    order = display_order if display_order is not None else (max((i.display_order for i in d.images), default=-1) + 1)
    img = DesignImage(design_id=d.id, image_url=stored.url, storage_key=stored.key, alt_text=alt_text.strip() or d.title, display_order=order)
    db.add(img)
    db.commit()
    return img


@router.patch("/designs/{design_id}/images/{image_id}", response_model=ImageOut)
def update_design_image(design_id: uuid.UUID, image_id: uuid.UUID, payload: ImagePatch, user: AdminUser, db: Session = Depends(get_db)):
    img = db.scalar(select(DesignImage).where(DesignImage.id == image_id, DesignImage.design_id == design_id))
    if img is None:
        raise HTTPException(404, "Image not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(img, k, v)
    db.commit()
    return img


@router.delete("/designs/{design_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_design_image(design_id: uuid.UUID, image_id: uuid.UUID, user: AdminUser, db: Session = Depends(get_db)):
    img = db.scalar(select(DesignImage).where(DesignImage.id == image_id, DesignImage.design_id == design_id))
    if img is None:
        raise HTTPException(404, "Image not found.")
    key = img.storage_key
    db.delete(img)
    db.commit()
    if key:
        get_storage().delete(key)
