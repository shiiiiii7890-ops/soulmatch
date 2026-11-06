"""Public (no-auth) endpoints: form status, uploads, single-step submission."""

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import Response

from lib.db import db
from lib.ratelimit import rate_limit
from lib.service import check_answers, get_questions, get_settings, new_app_code, new_id, now_iso, store_image
from models.schemas import ApplicationCreated, ApplicationIn, PublicForm, UploadOut

router = APIRouter()


@router.get("/public/form", response_model=PublicForm)
async def public_form():
    s = await get_settings()
    return PublicForm(open=s["form_open"], fee=s["fee"], upi_id=s["upi_id"], payee_name=s["payee_name"], has_qr=bool(s["qr_file_id"]), questions=await get_questions())


@router.get("/public/qr")
async def public_qr():
    s = await get_settings()
    doc = await db.files.find_one({"id": s["qr_file_id"], "kind": "qr"}) if s["qr_file_id"] else None
    if not doc:
        raise HTTPException(status_code=404, detail="QR not configured")
    return Response(content=bytes(doc["data"]), media_type=doc["content_type"], headers={"Cache-Control": "no-cache"})


@router.post("/public/upload", response_model=UploadOut, dependencies=[rate_limit("upload", 40, 600)])
async def public_upload(kind: str = Query(pattern="^(photo|payment)$"), file: UploadFile = File(...)):
    if not (await get_settings())["form_open"]:
        raise HTTPException(status_code=400, detail="Forms are closed")
    return UploadOut(file_id=await store_image(file, kind))


@router.post("/applications", response_model=ApplicationCreated, dependencies=[rate_limit("register", 15, 600)])
async def create_application(body: ApplicationIn):
    if not (await get_settings())["form_open"]:
        raise HTTPException(status_code=400, detail="Forms are closed")
    check_answers(body, await get_questions())
    dup = await db.applications.find_one({"$or": [{"email": body.email}, {"mobile": body.mobile}]}, {"_id": 0, "id": 1})
    if dup:
        raise HTTPException(status_code=409, detail="You've already submitted the form with this email or mobile number.")
    free_entry = body.gender == "Female"  # registration is free for women: no payment proof, auto-verified
    utr = "" if free_entry else (body.utr or "").upper()
    if utr and await db.applications.find_one({"payment.utr": utr}, {"_id": 0, "id": 1}):
        raise HTTPException(status_code=409, detail="This UTR / transaction reference has already been used")
    photo = await db.files.find_one({"id": body.photo_id, "kind": "photo", "claimed": False}, {"_id": 0, "id": 1})
    if not photo:
        raise HTTPException(status_code=400, detail="Please upload your profile photo again")
    shot_id = None
    if not free_entry:
        shot = await db.files.find_one({"id": body.screenshot_id, "kind": "payment", "claimed": False}, {"_id": 0, "id": 1})
        if not shot:
            raise HTTPException(status_code=400, detail="Please upload your payment screenshot again")
        shot_id = body.screenshot_id
    now = now_iso()
    payment = (
        {"status": "verified", "utr": "", "screenshot_id": None, "submitted_at": now, "reviewed_at": now, "note": "Free entry (female)"}
        if free_entry
        else {"status": "pending", "utr": utr, "screenshot_id": shot_id, "submitted_at": now, "reviewed_at": None, "note": ""}
    )
    doc = body.model_dump(exclude={"utr", "screenshot_id"})
    doc.update({"id": new_id(), "app_code": new_app_code(), "created_at": now, "email_state": None, "payment": payment})
    await db.applications.insert_one(doc)
    await db.files.update_many({"id": {"$in": [x for x in (body.photo_id, shot_id) if x]}}, {"$set": {"claimed": True, "owner": doc["id"]}})
    return ApplicationCreated(app_code=doc["app_code"], free_entry=free_entry)
