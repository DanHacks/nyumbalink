from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import init_db, close_db
from app.api.v1 import (
    auth, properties, rooms, bookings, verification, reviews, search, maps,
    analytics, ads, payments, admin, ai, reports, media, favorites,
    notifications, services,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["Authentication"])
app.include_router(properties.router, prefix=f"{settings.API_V1_PREFIX}/properties", tags=["Properties"])
app.include_router(rooms.router, prefix=f"{settings.API_V1_PREFIX}/rooms", tags=["Rooms"])
app.include_router(bookings.router, prefix=f"{settings.API_V1_PREFIX}/bookings", tags=["Bookings"])
app.include_router(verification.router, prefix=f"{settings.API_V1_PREFIX}/verification", tags=["Verification"])
app.include_router(reviews.router, prefix=f"{settings.API_V1_PREFIX}/reviews", tags=["Reviews"])
app.include_router(search.router, prefix=f"{settings.API_V1_PREFIX}/search", tags=["Search"])
app.include_router(maps.router, prefix=f"{settings.API_V1_PREFIX}/maps", tags=["Maps"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_PREFIX}/analytics", tags=["Analytics"])
app.include_router(ads.router, prefix=f"{settings.API_V1_PREFIX}/ads", tags=["Ads"])
app.include_router(payments.router, prefix=f"{settings.API_V1_PREFIX}/payments", tags=["Payments"])
app.include_router(admin.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["Admin"])
app.include_router(ai.router, prefix=f"{settings.API_V1_PREFIX}/ai", tags=["AI"])
app.include_router(reports.router, prefix=f"{settings.API_V1_PREFIX}/reports", tags=["Reports"])
app.include_router(media.router, prefix=f"{settings.API_V1_PREFIX}/media", tags=["Media"])
app.include_router(favorites.router, prefix=f"{settings.API_V1_PREFIX}/favorites", tags=["Favorites"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_PREFIX}/notifications", tags=["Notifications"])
app.include_router(services.router, prefix=f"{settings.API_V1_PREFIX}/services", tags=["Services"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "NyumbaLink API", "version": settings.VERSION}
