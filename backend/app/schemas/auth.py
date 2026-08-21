from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime


class RegisterRequest(BaseModel):
    email: str = Field(..., max_length=255)
    phone: str = Field(..., max_length=20)
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="tenant")

    @validator("email")
    def validate_email(cls, v):
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address")
        return v.lower().strip()

    @validator("phone")
    def validate_phone(cls, v):
        cleaned = v.strip().lstrip("+")
        if not cleaned.isdigit() or len(cleaned) < 10:
            raise ValueError("Invalid phone number")
        return f"+{cleaned}"


class LoginRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str


class GoogleLoginRequest(BaseModel):
    id_token: str


class OTPRequest(BaseModel):
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    purpose: str = Field(default="login")


class OTPVerifyRequest(BaseModel):
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    otp: str = Field(..., min_length=4, max_length=8)
    purpose: str = Field(default="login")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: str
    phone: Optional[str]
    first_name: str
    last_name: str
    role: str
    is_email_verified: bool
    is_phone_verified: bool
    is_verified_owner: bool
    verification_badge: bool
    avatar_url: Optional[str]
    trust_score: float
    is_premium: bool
    created_at: datetime

    class Config:
        from_attributes = True
