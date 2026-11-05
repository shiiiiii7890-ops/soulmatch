"""Shared domain helpers used by routers."""

import hashlib
import secrets
import uuid
from datetime import datetime, timezone

from bson import Binary
from fastapi import HTTPException, UploadFile

from lib.db import db
from models.schemas import Application

MAX_UPLOAD = 5 * 1024 * 1024
DEFAULT_SETTINGS = {"form_open": False, "fee": 199, "upi_id": "", "payee_name": "SoulMatch", "qr_file_id": None}
_ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def new_app_code() -> str:
    return "SM-" + "".join(secrets.choice(_ALPHA) for _ in range(7))


async def get_settings() -> dict:
    doc = await db.settings.find_one({"id": "global"}, {"_id": 0, "id": 0}) or {}
    return {**DEFAULT_SETTINGS, **{k: v for k, v in doc.items() if k in DEFAULT_SETTINGS}}


def signature(match_ids: list[str]) -> str:
    return hashlib.sha256(",".join(sorted(match_ids)).encode()).hexdigest()[:16]


def email_status(doc: dict, match_ids: list[str]) -> str:
    if not match_ids:
        return "no_matches"
    st = doc.get("email_state") or {}
    if st.get("status") == "sent" and st.get("signature") == signature(match_ids):
        return "sent"
    return "pending"


async def assignment_map(applicant_ids: list[str] | None = None) -> dict[str, list[str]]:
    match: dict = {} if applicant_ids is None else {"applicant_id": {"$in": applicant_ids}}
    out: dict[str, list[str]] = {}
    async for row in db.match_assignments.aggregate([
        {"$match": match}, {"$group": {"_id": "$applicant_id", "ids": {"$push": "$match_id"}}},
    ]):
        out[row["_id"]] = row["ids"]
    return out


APP_FIELDS = set(Application.model_fields) - {"match_count", "email_status", "email_sent_at"}


def to_model(doc: dict, amap: dict[str, list[str]]) -> Application:
    ids = amap.get(doc["id"], [])
    st = doc.get("email_state") or {}
    return Application(
        **{k: v for k, v in doc.items() if k in APP_FIELDS},
        match_count=len(ids), email_status=email_status(doc, ids), email_sent_at=st.get("sent_at"),
    )


async def get_app_or_404(app_id: str) -> dict:
    doc = await db.applications.find_one({"id": app_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Entry not found")
    return doc


def _sniff(data: bytes) -> str | None:
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


async def store_image(file: UploadFile, kind: str) -> str:
    data = await file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="Image must be 5 MB or smaller")
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    ctype = _sniff(data)
    if not ctype:
        raise HTTPException(status_code=415, detail="Only JPG, PNG or WEBP images are allowed")
    fid = new_id()
    await db.files.insert_one({
        "id": fid, "kind": kind, "content_type": ctype, "size": len(data), "data": Binary(data),
        "claimed": False, "created_at": now_iso(),
    })
    return fid
