from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.permissions import CurrentUser, client_ip
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import LoginRequest, SignupRequest, TokenOut, UserOut
from app.schemas.common import Message
from app.utils.ratelimit import limiter

router = APIRouter(prefix="/auth", tags=["authentication"])


def _token_response(user: User) -> TokenOut:
    token, expires_in = create_access_token(user.id, user.role.value)
    return TokenOut(access_token=token, expires_in=expires_in, user=UserOut.model_validate(user))


@router.post("/signup", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, request: Request, db: Session = Depends(get_db)):
    """Public registration. The role is ALWAYS `customer`; the request cannot choose a role."""
    s = get_settings()
    limiter.check(f"signup:{client_ip(request)}", s.SIGNUP_RATE_LIMIT, s.SIGNUP_RATE_WINDOW_SECONDS)
    user = User(full_name=payload.full_name, email=payload.email, phone=payload.phone,
                password_hash=hash_password(payload.password), role=UserRole.customer)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")
    return _token_response(user)


@router.post("/login", response_model=TokenOut)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    s = get_settings()
    limiter.check(f"login:{client_ip(request)}", s.LOGIN_RATE_LIMIT, s.LOGIN_RATE_WINDOW_SECONDS)
    user = db.scalar(select(User).where(User.email == payload.email))
    ok = verify_password(payload.password, user.password_hash if user else None)
    if not ok or user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    return _token_response(user)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user


@router.post("/logout", response_model=Message)
def logout(user: CurrentUser):
    """Tokens are stateless JWTs, so the server cannot revoke one. The client must delete its stored token;
    the token stays technically valid until it expires (ACCESS_TOKEN_EXPIRE_MINUTES, default 30).
    Disabling a user (is_active=false) blocks that user's tokens immediately."""
    return Message(message="Logged out. Delete the stored token on the client; it expires automatically.")
