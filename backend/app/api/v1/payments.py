from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.payment import Payment, MpesaTransaction, PremiumSubscription, PaymentStatus, PaymentType
from app.utils.mpesa import MpesaClient
from app.services.safety_service import record_audit
from datetime import datetime, timezone, timedelta
import re

router = APIRouter()


def _normalize_phone(phone: str) -> str:
    cleaned = re.sub(r"\D", "", phone)
    if cleaned.startswith("0"):
        cleaned = "254" + cleaned[1:]
    elif not cleaned.startswith("254"):
        cleaned = "254" + cleaned
    if not re.fullmatch(r"2547\d{8}", cleaned):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Phone must be a valid Safaricom number (07XX XXX XXX)",
        )
    return cleaned


@router.post("/mpesa/stk-push")
async def mpesa_stk_push(
    amount: float,
    phone: str,
    payment_type: str = "premium_subscription",
    description: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Amount must be greater than zero",
        )
    phone = _normalize_phone(phone)

    payment = Payment(
        user_id=current_user.id,
        payment_type=payment_type,
        status=PaymentStatus.PENDING,
        amount=amount,
        currency="KES",
        payment_method="mpesa",
        description=description,
    )
    db.add(payment)
    await db.flush()

    mpesa = MpesaTransaction(
        payment_id=payment.id,
        phone_number=phone,
        amount=amount,
    )
    db.add(mpesa)
    await db.flush()

    demo_mode = not (
        settings.MPESA_CONSUMER_KEY and settings.MPESA_CONSUMER_SECRET and settings.MPESA_PASSKEY
    )
    checkout_request_id = None

    if not demo_mode:
        client = MpesaClient()
        try:
            result = await client.stk_push(
                phone=phone,
                amount=amount,
                account_reference=payment.id,
                transaction_desc=description or "NyumbaLink payment",
                callback_url=f"{settings.BACKEND_PUBLIC_URL}/api/v1/payments/mpesa/callback",
            )
        except Exception:
            result = {"error": "M-Pesa API unreachable"}
        if "CheckoutRequestID" in result:
            checkout_request_id = result["CheckoutRequestID"]
            mpesa.checkout_request_id = checkout_request_id
            await db.flush()
        else:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=result.get("errorMessage", result.get("error", "STK push failed")),
            )

    return {
        "payment_id": payment.id,
        "message": "STK push sent to your phone. Please enter your M-Pesa PIN."
        if not demo_mode else "M-Pesa is not configured — payment recorded as PENDING (demo mode).",
        "checkout_request_id": checkout_request_id,
        "demo_mode": demo_mode,
    }


@router.post("/mpesa/callback")
async def mpesa_callback(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    body_data = body.get("Body", {})
    stk_callback = body_data.get("stkCallback", {})

    checkout_request_id = stk_callback.get("CheckoutRequestID")
    result_code = stk_callback.get("ResultCode")
    result_desc = stk_callback.get("ResultDesc")

    metadata = stk_callback.get("CallbackMetadata", {}).get("Item", [])

    receipt_number = None
    transaction_date = None
    phone_number = None
    amount = None

    for item in metadata:
        name = item.get("Name")
        value = item.get("Value")
        if name == "MpesaReceiptNumber":
            receipt_number = value
        elif name == "TransactionDate":
            transaction_date = value
        elif name == "PhoneNumber":
            phone_number = value
        elif name == "Amount":
            amount = value

    result = await db.execute(
        select(MpesaTransaction).where(
            MpesaTransaction.checkout_request_id == checkout_request_id
        )
    )
    mpesa = result.scalar_one_or_none()

    if mpesa:
        # Idempotency: ignore repeat delivery of an already-final callback.
        if mpesa.result_code is not None and mpesa.raw_callback:
            return {"ResultCode": 0, "ResultDesc": "Success"}
        mpesa.result_code = str(result_code)
        mpesa.result_description = result_desc
        mpesa.receipt_number = receipt_number
        if transaction_date and len(str(transaction_date)) == 14:
            try:
                mpesa.transaction_date = datetime.strptime(str(transaction_date), "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
            except ValueError:
                mpesa.transaction_date = datetime.now(timezone.utc)
        mpesa.phone_number = str(phone_number) if phone_number else mpesa.phone_number
        if amount:
            try:
                if abs(float(amount) - float(mpesa.amount or 0)) > 0.01:
                    mpesa.amount = float(amount)
            except (TypeError, ValueError):
                pass
        mpesa.raw_callback = body

        payment_result = await db.execute(
            select(Payment).where(Payment.id == mpesa.payment_id)
        )
        payment = payment_result.scalar_one_or_none()
        if result_code == 0:
            if payment:
                payment.status = PaymentStatus.COMPLETED
                payment.paid_at = datetime.now(timezone.utc)
                payment.mpesa_transaction_id = receipt_number
                await record_audit(
                    db, payment.user_id, "payment_completed",
                    resource_type="payment", resource_id=payment.id,
                    details={"receipt": receipt_number, "amount": amount},
                )

                if payment.payment_type == PaymentType.PREMIUM_SUBSCRIPTION:
                    sub_result = await db.execute(
                        select(PremiumSubscription).where(
                            PremiumSubscription.payment_id == payment.id
                        )
                    )
                    subscription = sub_result.scalar_one_or_none()
                    if subscription:
                        subscription.status = "active"
                        user_result = await db.execute(
                            select(User).where(User.id == payment.user_id)
                        )
                        user = user_result.scalar_one_or_none()
                        if user:
                            user.is_premium = True
                            user.premium_expires_at = subscription.expires_at
        else:
            if payment and payment.status == PaymentStatus.PENDING:
                payment.status = PaymentStatus.FAILED
                await record_audit(
                    db, payment.user_id, "payment_failed",
                    resource_type="payment", resource_id=payment.id,
                    details={"result_code": result_code, "result_desc": result_desc},
                )

        await db.flush()

    return {"ResultCode": 0, "ResultDesc": "Success"}


@router.get("/mpesa/status/{payment_id}")
async def mpesa_payment_status(
    payment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Payment).where(
            Payment.id == payment_id,
            Payment.user_id == current_user.id,
        )
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    txn_result = await db.execute(
        select(MpesaTransaction).where(MpesaTransaction.payment_id == payment_id)
    )
    txn = txn_result.scalar_one_or_none()
    return {
        "payment_id": payment.id,
        "status": payment.status.value if hasattr(payment.status, "value") else payment.status,
        "amount": payment.amount,
        "paid_at": payment.paid_at,
        "receipt_number": txn.receipt_number if txn else None,
        "checkout_request_id": txn.checkout_request_id if txn else None,
    }


@router.get("/history")
async def get_payment_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Payment).where(
            Payment.user_id == current_user.id
        ).order_by(Payment.created_at.desc())
    )
    payments = result.scalars().all()

    return [
        {
            "id": p.id,
            "type": p.payment_type.value if hasattr(p.payment_type, 'value') else p.payment_type,
            "status": p.status.value if hasattr(p.status, 'value') else p.status,
            "amount": p.amount,
            "currency": p.currency,
            "method": p.payment_method,
            "description": p.description,
            "paid_at": p.paid_at,
            "created_at": p.created_at,
        }
        for p in payments
    ]


@router.post("/premium/subscribe")
async def subscribe_premium(
    plan_type: str,
    amount: float,
    phone: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    valid_plans = ["basic", "standard", "premium"]
    if plan_type not in valid_plans:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"plan_type must be one of {valid_plans}",
        )

    if current_user.is_premium and current_user.premium_expires_at and current_user.premium_expires_at > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active premium subscription",
        )

    payment = Payment(
        user_id=current_user.id,
        payment_type=PaymentType.PREMIUM_SUBSCRIPTION,
        status=PaymentStatus.PENDING,
        amount=amount,
        currency="KES",
        payment_method="mpesa",
    )
    db.add(payment)
    await db.flush()

    subscription = PremiumSubscription(
        user_id=current_user.id,
        plan_type=plan_type,
        status="pending",
        amount_paid=amount,
        starts_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        payment_id=payment.id,
    )
    db.add(subscription)
    await db.flush()

    if phone:
        orphan_payment_id = payment.id
        stk = await mpesa_stk_push(
            amount=amount, phone=phone, payment_type="premium_subscription",
            description=f"NyumbaLink {plan_type} plan", db=db, current_user=current_user,
        )
        # Link the pending subscription to the real STK payment (STK creates its own Payment row).
        subscription.payment_id = stk["payment_id"]
        # Remove the placeholder payment created above to avoid orphans.
        orphan = await db.get(Payment, orphan_payment_id)
        if orphan is not None:
            await db.delete(orphan)
        await db.flush()
        return {
            "subscription_id": subscription.id,
            "payment_id": stk["payment_id"],
            "message": stk["message"],
            "checkout_request_id": stk.get("checkout_request_id"),
            "demo_mode": stk.get("demo_mode"),
        }

    return {
        "subscription_id": subscription.id,
        "payment_id": payment.id,
        "message": "Subscription initiated. Complete payment to activate.",
    }
