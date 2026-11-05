"""Admin authentication: PBKDF2 password hashes + JWT in an httpOnly cookie."""

import hashlib
import hmac
import os
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, Request

from lib.db import db

COOKIE = "sm_admin"
SECRET = os.environ["JWT_SECRET"]
TTL_HOURS = 12


def hash_pw(pw: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 200_000)
    return f"pbkdf2${salt.hex()}${dk.hex()}"


def verify_pw(pw: str, stored: str) -> bool:
    try:
        _, salt, digest = stored.split("$")
    except ValueError:
        return False
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200_000)
    return hmac.compare_digest(dk.hex(), digest)


def make_token(admin_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=TTL_HOURS)
    return jwt.encode({"sub": admin_id, "role": "admin", "exp": exp}, SECRET, algorithm="HS256")


async def require_admin(request: Request) -> dict:
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Session expired")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    admin = await db.admins.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return admin


async def ensure_admin() -> None:
    email = os.environ.get("ADMIN_EMAIL", "").lower().strip()
    pw = os.environ.get("ADMIN_PASSWORD", "")
    if not email or not pw:
        return
    existing = await db.admins.find_one({"email": email})
    if existing and verify_pw(pw, existing["password_hash"]):
        return
    if existing:
        await db.admins.update_one({"email": email}, {"$set": {"password_hash": hash_pw(pw)}})
        return
    await db.admins.insert_one({
        "id": str(uuid.uuid4()), "email": email, "name": "SoulMatch Admin",
        "password_hash": hash_pw(pw), "created_at": datetime.now(timezone.utc).isoformat(),
    })
