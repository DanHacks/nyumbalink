from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta, datetime, timezone
import hashlib
import random
import uuid
import httpx
from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, verify_token,
)
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.models.user import User, UserRole, UserSession
from app.models.trust import OTPCode
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, RefreshTokenRequest,
    UserResponse, OTPRequest, OTPVerifyRequest, GoogleLoginRequest,
    SelectRoleRequest, SELF_SERVICE_ROLES,
)

router = APIRouter()

OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5


async def _issue_tokens(db: AsyncSession, user: User, session_label: str = "login"):
    role_val = user.role.value if hasattr(user.role, "value") else (user.role or "unset")
    access_token = create_access_token(
        data={"sub": user.id, "role": role_val},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_refresh_token(data={"sub": user.id})

    session = UserSession(
        user_id=user.id,
        refresh_token=refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    user.last_login_at = datetime.now(timezone.utc)
    await db.flush()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(
            (User.email == request.email) | (User.phone == request.phone)
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or phone already registered",
        )

    user = User(
        email=request.email,
        phone=request.phone,
        first_name=request.first_name,
        last_name=request.last_name,
        hashed_password=hash_password(request.password),
        role=UserRole(request.role),
    )
    db.add(user)
    await db.flush()

    return await _issue_tokens(db, user, "register")


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    if not request.email and not request.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or phone is required",
        )

    query = select(User)
    if request.email:
        query = query.where(User.email == request.email.lower())
    else:
        query = query.where(User.phone == request.phone)

    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    return await _issue_tokens(db, user, "login")


@router.post("/otp/request")
async def request_otp(
    request: OTPRequest,
    db: AsyncSession = Depends(get_db),
):
    identifier = request.phone or request.email
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="phone or email is required",
        )

    recent = await db.execute(
        select(OTPCode).where(
            OTPCode.identifier == identifier,
            OTPCode.is_used == False,
            OTPCode.expires_at > datetime.now(timezone.utc),
        )
    )
    if recent.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="An OTP was already sent recently. Wait a minute and try again.",
        )

    code = f"{random.randint(0, 999999):06d}"
    code_hash = hashlib.sha256(code.encode()).hexdigest()

    otp = OTPCode(
        identifier=identifier,
        code_hash=code_hash,
        purpose="phone_verification",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES),
    )
    db.add(otp)
    await db.flush()

    if request.phone:
        print(f"[DEMO OTP] {request.phone} -> {code}")  # noqa: T201 - dev-only delivery channel
    else:
        print(f"[DEMO OTP] {request.email} -> {code}")  # noqa: T201

    return {
        "message": "OTP sent",
        "expires_in_seconds": OTP_TTL_MINUTES * 60,
        "delivery": "dev_console" if settings.DEBUG else "sms/email",
    }


@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(
    request: OTPVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    identifier = request.phone or request.email
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="phone or email is required",
        )

    result = await db.execute(
        select(OTPCode).where(
            OTPCode.identifier == identifier,
            OTPCode.is_used == False,
        ).order_by(OTPCode.created_at.desc()).limit(1)
    )
    otp = result.scalar_one_or_none()

    if not otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No OTP found. Request a new one.")

    if otp.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has expired. Request a new one.")

    otp.attempts += 1
    if otp.attempts > OTP_MAX_ATTEMPTS:
        otp.is_used = True
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Request a new OTP.")

    if not hashlib.sha256(request.otp.strip().encode()).hexdigest() == otp.code_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code")

    otp.is_used = True
    otp.used_at = datetime.now(timezone.utc)

    result = await db.execute(
        select(User).where(
            (User.phone == identifier) if request.phone else (User.email == identifier.lower())
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        base_name = request.phone or (request.email.split("@")[0] if request.email else "User")
        user = User(
            phone=request.phone,
            email=request.email or f"user+{uuid.uuid4().hex[:8]}@nyumbalink.local",
            first_name=base_name,
            last_name="User",
        )
        db.add(user)
        await db.flush()

    return await _issue_tokens(db, user, "otp")


@router.post("/google", response_model=TokenResponse)
async def google_login(
    request: GoogleLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google login is not configured on the server",
        )

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            token_info = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": request.id_token},
            )
            if token_info.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Google token",
                )
            data = token_info.json()
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach Google for token validation",
        )

    if data.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token audience mismatch")

    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google account has no email")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            first_name=data.get("given_name") or email.split("@")[0],
            last_name=data.get("family_name") or "User",
            google_id=data.get("sub"),
            is_email_verified=True,
        )
        db.add(user)
        await db.flush()

    return await _issue_tokens(db, user, "google")


@router.post("/select-role", response_model=UserResponse)
async def select_role(
    request: SelectRoleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set the role for an account that has not yet chosen one (e.g. a user
    who signed up with Google). Caretaker/admin/etc. roles are assigned by
    other flows and cannot be self-selected."""
    current_role = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    if current_role is not None and current_role != request.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account role is already set. Contact support to change it.",
        )

    current_user.role = UserRole(request.role)
    await db.flush()
    return current_user


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    payload = verify_token(request.refresh_token, expected_type="refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    result = await db.execute(
        select(UserSession).where(
            UserSession.refresh_token == request.refresh_token,
            UserSession.is_valid == True,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not found or invalid",
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    new_access_token = create_access_token(
        data={"sub": user.id, "role": user.role.value if hasattr(user.role, "value") else (user.role or "unset")},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    new_refresh_token = create_refresh_token(data={"sub": user.id})

    session.is_valid = False

    new_session = UserSession(
        user_id=user.id,
        refresh_token=new_refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_session)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout")
async def logout(request: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UserSession).where(
            UserSession.refresh_token == request.refresh_token,
            UserSession.is_valid == True,
        )
    )
    session = result.scalar_one_or_none()
    if session:
        session.is_valid = False
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    return current_user
