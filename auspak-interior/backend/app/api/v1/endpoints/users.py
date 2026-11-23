import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.permissions import AdminUser
from app.core.security import hash_password
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import AdminCreateUser, UserOut, UserPatch
from app.schemas.common import Page

router = APIRouter(prefix="/admin/users", tags=["user management (admin only)"])


@router.get("", response_model=Page[UserOut])
def list_users(admin: AdminUser, db: Session = Depends(get_db), role: UserRole | None = None, q: str | None = Query(None, max_length=100),
               page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    if q:
        stmt = stmt.where(User.email.icontains(q.strip(), autoescape=True) | User.full_name.icontains(q.strip(), autoescape=True))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(db.scalars(stmt.order_by(User.created_at.desc(), User.id).offset((page - 1) * page_size).limit(page_size)))
    return Page(items=rows, total=total, page=page, page_size=page_size)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: AdminCreateUser, admin: AdminUser, db: Session = Depends(get_db)):
    """Create a staff or admin account (public signup can never do this)."""
    user = User(full_name=payload.full_name, email=payload.email, phone=payload.phone,
                password_hash=hash_password(payload.password), role=payload.role)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: uuid.UUID, payload: UserPatch, admin: AdminUser, db: Session = Depends(get_db)):
    """Change a user's name, role, or active state. An admin cannot change their own role or deactivate themselves,
    which guarantees the system always keeps at least one active admin."""
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(404, "User not found.")
    changes = payload.model_dump(exclude_unset=True)
    if target.id == admin.id and (("role" in changes and changes["role"] != target.role) or changes.get("is_active") is False):
        raise HTTPException(409, "You cannot change your own role or deactivate your own account. Ask another admin.")
    for k, v in changes.items():
        if v is not None:
            setattr(target, k, v)
    db.commit()
    return target
