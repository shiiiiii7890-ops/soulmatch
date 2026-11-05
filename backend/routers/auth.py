"""Admin auth: login sets an httpOnly cookie; logout clears it."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from lib.auth import COOKIE, TTL_HOURS, make_token, require_admin, verify_pw
from lib.db import db
from lib.ratelimit import rate_limit
from models.schemas import AdminOut, LoginIn, OkOut

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=AdminOut, dependencies=[rate_limit("login", 10, 600)])
async def login(body: LoginIn, request: Request, response: Response):
    admin = await db.admins.find_one({"email": body.email.lower()}, {"_id": 0})
    if not admin or not verify_pw(body.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    secure = request.headers.get("x-forwarded-proto", request.url.scheme) == "https"
    response.set_cookie(
        COOKIE, make_token(admin["id"]), httponly=True, samesite="lax", secure=secure,
        max_age=TTL_HOURS * 3600, path="/",
    )
    return AdminOut(id=admin["id"], email=admin["email"], name=admin["name"])


@router.post("/logout", response_model=OkOut)
async def logout(response: Response):
    response.delete_cookie(COOKIE, path="/")
    return OkOut()


@router.get("/me", response_model=AdminOut)
async def me(admin: dict = Depends(require_admin)):
    return AdminOut(**admin)
