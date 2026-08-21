from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse

from app.services.media_service import serve_media_file

router = APIRouter()


@router.get("")
async def get_media(
    path: str = Query(...),
    expires: int = Query(...),
    sig: str = Query(...),
):
    return serve_media_file(path, expires, sig)