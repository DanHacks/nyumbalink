import hashlib
import hmac
import os
import time
from urllib.parse import quote

from fastapi import HTTPException, status
from fastapi.responses import FileResponse
from starlette.requests import Request

from app.core.config import settings

MEDIA_TTL_SECONDS = 60 * 60 * 12


def _sign(path: str, expires: int) -> str:
    message = f"{path}:{expires}"
    return hmac.new(
        settings.SECRET_KEY.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()


def build_media_url(path: str, request: Request = None, ttl: int = MEDIA_TTL_SECONDS) -> str:
    """Build a signed, expiring media URL. For localhost dev this is served
    through the API media endpoint; in production it would map to private
    object storage with the same signed-token scheme."""
    if not path:
        return None
    expires = int(time.time()) + ttl
    sig = _sign(path, expires)
    return f"/api/v1/media?path={quote(path)}&expires={expires}&sig={sig}"


def verify_media_token(path: str, expires: int, sig: str) -> bool:
    if int(time.time()) > expires:
        return False
    expected = _sign(path, expires)
    return hmac.compare_digest(expected, sig)


def save_upload(content: bytes, property_id: str, filename: str) -> str:
    """Store an upload on disk and return the relative storage path."""
    ext = os.path.splitext(filename)[1].lower() or ".bin"
    file_hash = hashlib.sha256(content).hexdigest()
    directory = os.path.join(settings.UPLOAD_DIR, "media", property_id)
    os.makedirs(directory, exist_ok=True)
    storage_name = f"{file_hash}{ext}"
    full_path = os.path.join(directory, storage_name)
    with open(full_path, "wb") as f:
        f.write(content)
    relative = os.path.join("media", property_id, storage_name).replace("\\", "/")
    return relative


def serve_media_file(path: str, expires: int, sig: str) -> FileResponse:
    if not verify_media_token(path, expires, sig):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Media link expired or invalid. Refresh the page to get a new link.",
        )
    safe_path = os.path.normpath(path)
    if safe_path.startswith("..") or os.path.isabs(safe_path):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid path")
    full_path = os.path.join(settings.UPLOAD_DIR, safe_path)
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return FileResponse(full_path)