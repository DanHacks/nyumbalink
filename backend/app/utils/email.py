from typing import List, Optional


async def send_email(
    to: str,
    subject: str,
    body: str,
    html_body: Optional[str] = None,
    attachments: Optional[List[str]] = None,
) -> bool:
    return True


async def send_welcome_email(email: str, first_name: str) -> bool:
    subject = "Welcome to NyumbaLink!"
    body = f"Hi {first_name}, welcome to NyumbaLink - Kenya's trusted property verification platform."
    return await send_email(email, subject, body)


async def send_verification_email(email: str, code: str) -> bool:
    subject = "Verify your NyumbaLink email"
    body = f"Your verification code is: {code}"
    return await send_email(email, subject, body)


async def send_password_reset_email(email: str, reset_link: str) -> bool:
    subject = "Reset your NyumbaLink password"
    body = f"Click here to reset your password: {reset_link}"
    return await send_email(email, subject, body)
