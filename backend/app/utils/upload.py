import os
import uuid
import hashlib
from typing import Optional
from fastapi import UploadFile
from app.core.config import settings


async def save_upload_file(file: UploadFile, subdirectory: str = "general") -> str:
    file_ext = file.filename.split(".")[-1] if file.filename else "jpg"
    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, subdirectory, file_name)

    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    return file_path


def get_file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def generate_thumbnail_url(original_url: str) -> str:
    base, ext = os.path.splitext(original_url)
    return f"{base}_thumb{ext}"


def validate_image_type(content_type: Optional[str]) -> bool:
    if not content_type:
        return False
    return content_type in settings.ALLOWED_IMAGE_TYPES


def validate_video_type(content_type: Optional[str]) -> bool:
    if not content_type:
        return False
    return content_type in settings.ALLOWED_VIDEO_TYPES
