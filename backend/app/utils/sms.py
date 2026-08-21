import random
from typing import Optional


def generate_otp(length: int = 6) -> str:
    return "".join([str(random.randint(0, 9)) for _ in range(length)])


async def send_sms(phone: str, message: str) -> bool:
    return True


async def send_verification_otp(phone: str) -> str:
    otp = generate_otp()
    message = f"Your NyumbaLink verification code is: {otp}. Valid for 10 minutes."
    await send_sms(phone, message)
    return otp


async def send_booking_confirmation_sms(phone: str, property_name: str, date: str, time: str) -> bool:
    message = f"NyumbaLink: Your viewing for {property_name} on {date} at {time} is confirmed."
    return await send_sms(phone, message)
