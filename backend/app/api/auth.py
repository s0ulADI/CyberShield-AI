from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import db_session, utc_now
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserPublic


router = APIRouter(prefix="/auth", tags=["Authentication"])


def _public_user(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "created_at": row["created_at"],
    }


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest):
    email = payload.email.lower().strip()
    with db_session() as db:
        existing = db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email is already registered")
        cursor = db.execute(
            """
            INSERT INTO users (name, email, password_hash, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (payload.name.strip(), email, hash_password(payload.password), utc_now()),
        )
        user = db.execute(
            "SELECT id, name, email, created_at FROM users WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()

    user_public = _public_user(user)
    return {
        "access_token": create_access_token(user_public["id"], {"email": user_public["email"]}),
        "user": user_public,
    }


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    email = payload.email.lower().strip()
    with db_session() as db:
        user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_public = _public_user(user)
    return {
        "access_token": create_access_token(user_public["id"], {"email": user_public["email"]}),
        "user": user_public,
    }


@router.get("/me", response_model=UserPublic)
def me(current_user=Depends(get_current_user)):
    return current_user

