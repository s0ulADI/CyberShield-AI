from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import alerts, auth, scans
from app.core.config import ALLOWED_ORIGINS, APP_NAME, API_PREFIX
from app.core.database import init_db


app = FastAPI(
    title=APP_NAME,
    description="AI-powered phishing, scam, and malicious URL detection API.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/")
def root():
    return {
        "name": APP_NAME,
        "status": "online",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    return {"status": "healthy", "service": APP_NAME}


app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(scans.router, prefix=API_PREFIX)
app.include_router(alerts.router, prefix=API_PREFIX)

