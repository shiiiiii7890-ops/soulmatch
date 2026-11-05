"""Admin-only endpoints. Every route here requires the admin session cookie."""

import csv
import io
import re
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from pymongo.errors import DuplicateKeyError

from lib.auth import require_admin
from lib.compat import compatibility
from lib.db import db
from lib.email_tpl import build_email
from lib.service import (
    assignment_map, email_status, get_app_or_404, get_settings, new_id, now_iso, signature, store_image, to_model,
)
from models.schemas import (
    Application, AssignedMatch, AssignIn, AssignOut, Candidate, CompatPart, EmailMarkOut, EmailPreview, EndRoundIn,
    EndRoundOut, OkOut, PaymentReview, Settings, SettingsIn,
)

router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])


# ---------------- Entries ----------------
def filter_args(q: Optional[str] = None, gender: Optional[str] = None, payment_status: Optional[str] = None) -> dict:
    f: dict = {}
    if gender:
        f["gender"] = gender
    if payment_status:
        f["payment.status"] = payment_status
    if q and q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        f["$or"] = [{"full_name": rx}, {"email": rx}, {"mobile": rx}, {"app_code": rx}]
    return f


async def _list(f: dict) -> list[Application]:
    docs = await db.applications.find(f, {"_id": 0}).sort("created_at", -1).to_list(5000)
    amap = await assignment_map([d["id"] for d in docs])
    return [to_model(d, amap) for d in docs]


@router.get("/applications", response_model=list[Application])
async def list_applications(f: dict = Depends(filter_args)):
    return await _list(f)


EXPORT_COLS = [
    ("Application ID", "app_code"), ("Name", "full_name"), ("Age", "age"), ("Gender", "gender"), ("Height (cm)", "height_cm"),
    ("Mobile", "mobile"), ("Email", "email"), ("College", "college"), ("Course", "course"), ("City", "city"),
    ("Hometown", "hometown"), ("Instagram", "instagram"), ("Personality", "personality"), ("Qualities", "qualities"),
    ("Dating Vibe", "dating_vibe"), ("Lifestyle", "lifestyle"), ("Intention", "intention"),
    ("Payment Status", "payment_status"), ("UTR", "utr"), ("Matches", "match_count"), ("Email Status", "email_status"),
    ("Submitted At", "created_at"),
]


@router.get("/applications/export")
async def export_applications(f: dict = Depends(filter_args)):
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow([h for h, _ in EXPORT_COLS])
    for a in await _list(f):
        d = a.model_dump()
        d["payment_status"], d["utr"] = a.payment.status, a.payment.utr
        w.writerow([", ".join(d[k]) if isinstance(d[k], list) else d[k] for _, k in EXPORT_COLS])
    return StreamingResponse(iter([out.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": 'attachment; filename="soulmatch-entries.csv"'})


@router.get("/applications/{app_id}", response_model=Application)
async def get_application(app_id: str):
    return to_model(await get_app_or_404(app_id), await assignment_map([app_id]))


@router.delete("/applications/{app_id}", response_model=OkOut)
async def delete_application(app_id: str):
    doc = await get_app_or_404(app_id)
    await db.files.delete_many({"id": {"$in": [x for x in (doc.get("photo_id"), doc["payment"].get("screenshot_id")) if x]}})
    await db.match_assignments.delete_many({"$or": [{"applicant_id": app_id}, {"match_id": app_id}]})
    await db.applications.delete_one({"id": app_id})
    return OkOut(message="Entry deleted")


@router.post("/applications/{app_id}/payment", response_model=Application)
async def review_payment(app_id: str, body: PaymentReview):
    await get_app_or_404(app_id)
    await db.applications.update_one({"id": app_id}, {"$set": {
        "payment.status": body.status, "payment.note": body.note, "payment.reviewed_at": now_iso(),
    }})
    return await get_application(app_id)


@router.get("/files/{file_id}")
async def get_file(file_id: str):
    doc = await db.files.find_one({"id": file_id})
    if not doc:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(bytes(doc["data"]), media_type=doc["content_type"], headers={"Cache-Control": "private, max-age=3600"})


# ---------------- Matching ----------------
def _issues(a: dict, b: dict) -> list[str]:
    out = []
    if b["payment"]["status"] != "verified":
        out.append("Payment not verified")
    if a["payment"]["status"] != "verified":
        out.append("Selected person's payment not verified")
    return out


@router.get("/matchmaking/{app_id}/candidates", response_model=list[Candidate])
async def candidates(app_id: str, include_all: bool = False):
    a = await get_app_or_404(app_id)
    f: dict = {"id": {"$ne": app_id}}
    if not include_all:
        f["payment.status"] = "verified"
    docs = await db.applications.find(f, {"_id": 0}).to_list(3000)
    assigned = {x["match_id"] async for x in db.match_assignments.find({"applicant_id": app_id}, {"match_id": 1})}
    reverse = {x["applicant_id"] async for x in db.match_assignments.find({"match_id": app_id}, {"applicant_id": 1})}
    amap = await assignment_map([d["id"] for d in docs])
    out = []
    for d in docs:
        score, parts, warns = compatibility(a, d)
        issues = _issues(a, d)
        out.append(Candidate(
            application=to_model(d, amap), score=score, breakdown=[CompatPart(**p) for p in parts], warnings=warns,
            eligible=not issues, issues=issues, assigned=d["id"] in assigned, reverse_assigned=d["id"] in reverse,
        ))
    out.sort(key=lambda c: (-c.eligible, -c.score))
    return out


@router.get("/applications/{app_id}/matches", response_model=list[AssignedMatch])
async def assigned_matches(app_id: str):
    a = await get_app_or_404(app_id)
    rows = await db.match_assignments.find({"applicant_id": app_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    docs = {d["id"]: d async for d in db.applications.find({"id": {"$in": [r["match_id"] for r in rows]}}, {"_id": 0})}
    amap = await assignment_map(list(docs))
    return [
        AssignedMatch(id=r["id"], override=r.get("override", False), created_at=r["created_at"],
                      score=compatibility(a, docs[r["match_id"]])[0], match=to_model(docs[r["match_id"]], amap))
        for r in rows if r["match_id"] in docs
    ]


@router.post("/matches", response_model=AssignOut)
async def assign(body: AssignIn):
    a = await get_app_or_404(body.applicant_id)
    created, skipped = 0, []
    for mid in dict.fromkeys(body.match_ids):
        if mid == a["id"]:
            skipped.append("Cannot match someone with themselves")
            continue
        b = await db.applications.find_one({"id": mid}, {"_id": 0})
        if not b:
            skipped.append(f"{mid}: not found")
            continue
        issues = _issues(a, b)
        if issues and not body.override:
            skipped.append(f"{b['full_name']}: {issues[0]} (tick 'Show unverified too' to override)")
            continue
        for x, y in [(a, b)] + ([(b, a)] if body.mutual else []):
            try:
                await db.match_assignments.insert_one({
                    "id": new_id(), "applicant_id": x["id"], "match_id": y["id"], "override": bool(issues), "created_at": now_iso(),
                })
                created += 1
            except DuplicateKeyError:
                skipped.append(f"{y['full_name']} is already matched to {x['full_name']}")
    return AssignOut(created=created, skipped=skipped)


@router.delete("/matches/{assignment_id}", response_model=OkOut)
async def unassign(assignment_id: str):
    res = await db.match_assignments.delete_one({"id": assignment_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Match not found")
    return OkOut(message="Match removed")


# ---------------- Copy-paste email ----------------
async def _match_docs(app_id: str) -> list[dict]:
    rows = await db.match_assignments.find({"applicant_id": app_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    docs = {d["id"]: d async for d in db.applications.find({"id": {"$in": [r["match_id"] for r in rows]}}, {"_id": 0})}
    return [docs[r["match_id"]] for r in rows if r["match_id"] in docs]


@router.get("/emails/{app_id}/preview", response_model=EmailPreview)
async def email_preview(app_id: str):
    a = await get_app_or_404(app_id)
    matches = await _match_docs(app_id)
    subject, html, text = build_email(a, matches)
    return EmailPreview(
        application_id=app_id, to=a["email"], subject=subject, html=html, text=text, match_count=len(matches),
        status=email_status(a, [m["id"] for m in matches]), sent_at=(a.get("email_state") or {}).get("sent_at"),
    )


@router.post("/emails/{app_id}/mark-sent", response_model=EmailMarkOut)
async def email_mark_sent(app_id: str):
    matches = await _match_docs(app_id)
    if not matches:
        raise HTTPException(status_code=400, detail="No matches assigned yet")
    sig = signature([m["id"] for m in matches])
    res = await db.applications.update_one(  # atomic guard against double-clicks
        {"id": app_id, "$or": [{"email_state.status": {"$ne": "sent"}}, {"email_state.signature": {"$ne": sig}}]},
        {"$set": {"email_state": {"status": "sent", "signature": sig, "sent_at": now_iso()}}},
    )
    return EmailMarkOut(status="sent", duplicate=not res.modified_count)


# ---------------- Settings & round end ----------------
@router.get("/settings", response_model=Settings)
async def read_settings():
    return Settings(**await get_settings())


@router.put("/settings", response_model=Settings)
async def write_settings(body: SettingsIn):
    await db.settings.update_one({"id": "global"}, {"$set": body.model_dump()}, upsert=True)
    return Settings(**await get_settings())


@router.post("/settings/qr", response_model=Settings)
async def upload_qr(file: UploadFile = File(...)):
    fid = await store_image(file, "qr")
    old = (await get_settings())["qr_file_id"]
    await db.settings.update_one({"id": "global"}, {"$set": {"qr_file_id": fid}}, upsert=True)
    if old:
        await db.files.delete_one({"id": old})
    return Settings(**await get_settings())


@router.post("/end-round", response_model=EndRoundOut)
async def end_round(body: EndRoundIn):
    """Closes the form and permanently deletes every entry, photo, payment screenshot and match."""
    entries = await db.applications.delete_many({})
    files = await db.files.delete_many({"kind": {"$in": ["photo", "payment"]}})
    await db.match_assignments.delete_many({})
    await db.settings.update_one({"id": "global"}, {"$set": {"form_open": False}}, upsert=True)
    return EndRoundOut(deleted_entries=entries.deleted_count, deleted_files=files.deleted_count)
