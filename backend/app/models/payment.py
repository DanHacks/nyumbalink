import enum
from datetime import datetime

from sqlalchemy import (
    Column, String, Boolean, Text, DateTime, Float, Enum as SAEnum,
    ForeignKey, JSON, Integer, Numeric
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, IdMixin, utcnow


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class PaymentType(str, enum.Enum):
    PREMIUM_SUBSCRIPTION = "premium_subscription"
    FEATURED_LISTING = "featured_listing"
    AD_CAMPAIGN = "ad_campaign"
    VERIFICATION_FEE = "verification_fee"
    WITHDRAWAL = "withdrawal"
    REFUND = "refund"
    OTHER = "other"


class Payment(IdMixin, TimestampMixin, Base):
    __tablename__ = "payments"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    payment_type: Mapped[PaymentType] = mapped_column(
        SAEnum(PaymentType), nullable=False
    )
    status: Mapped[PaymentStatus] = mapped_column(
        SAEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False
    )

    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="KES")
    fee: Mapped[float] = mapped_column(Float, default=0.0)
    net_amount: Mapped[float] = mapped_column(Float, nullable=True)

    payment_method: Mapped[str] = mapped_column(String(50), nullable=True)
    mpesa_transaction_id: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=True
    )
    stripe_payment_intent_id: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=True
    )

    description: Mapped[str] = mapped_column(String(500), nullable=True)
    reference_id: Mapped[str] = mapped_column(String(100), nullable=True)
    reference_type: Mapped[str] = mapped_column(String(50), nullable=True)

    paid_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    refunded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    refund_reason: Mapped[str] = mapped_column(Text, nullable=True)

    payment_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

    mpesa = relationship("MpesaTransaction", back_populates="payment", uselist=False)


class MpesaTransaction(IdMixin, TimestampMixin, Base):
    __tablename__ = "mpesa_transactions"

    payment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("payments.id"), nullable=False, index=True
    )
    merchant_request_id: Mapped[str] = mapped_column(String(100), nullable=True)
    checkout_request_id: Mapped[str] = mapped_column(String(100), nullable=True)
    response_code: Mapped[str] = mapped_column(String(20), nullable=True)
    response_description: Mapped[str] = mapped_column(String(500), nullable=True)
    customer_message: Mapped[str] = mapped_column(String(500), nullable=True)

    result_code: Mapped[str] = mapped_column(String(20), nullable=True)
    result_description: Mapped[str] = mapped_column(String(500), nullable=True)

    transaction_id: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=True
    )
    transaction_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    phone_number: Mapped[str] = mapped_column(String(20), nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=True)
    balance: Mapped[float] = mapped_column(Float, nullable=True)

    receipt_number: Mapped[str] = mapped_column(String(100), nullable=True)
    raw_callback: Mapped[dict] = mapped_column(JSON, default=dict)

    payment = relationship("Payment", back_populates="mpesa")


class PremiumSubscription(IdMixin, TimestampMixin, Base):
    __tablename__ = "premium_subscriptions"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    plan_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="active", nullable=False
    )

    amount_paid: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="KES")

    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    cancelled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)

    features: Mapped[dict] = mapped_column(JSON, default=dict)
    payment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("payments.id"), nullable=True
    )


class Invoice(IdMixin, TimestampMixin, Base):
    __tablename__ = "invoices"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    payment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("payments.id"), nullable=True
    )
    invoice_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="KES")
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="unpaid")
    due_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    paid_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    pdf_url: Mapped[str] = mapped_column(String(1000), nullable=True)


class Payout(IdMixin, TimestampMixin, Base):
    __tablename__ = "payouts"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="KES")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)
    mpesa_number: Mapped[str] = mapped_column(String(20), nullable=True)
    mpesa_transaction_id: Mapped[str] = mapped_column(String(100), nullable=True)
    bank_account: Mapped[str] = mapped_column(String(100), nullable=True)
    bank_code: Mapped[str] = mapped_column(String(20), nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
