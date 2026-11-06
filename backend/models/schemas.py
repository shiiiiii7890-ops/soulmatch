"""Pydantic models — each mirrored by an interface in frontend/src/lib/types.ts."""

import re
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


Gender = Literal["Male", "Female", "Non-binary", "Other"]
# Personality / vibe / intention / qualities / lifestyle options are admin-editable, so they are plain strings here
# and are checked against the current option lists in the /applications route.
Personality = str
DatingVibe = str
Intention = str
PaymentStatus = Literal["pending", "verified", "rejected"]
EmailStatus = Literal["no_matches", "pending", "sent"]


def _norm_mobile(v: str) -> str:
    digits = re.sub(r"[\s\-()]", "", v)
    if digits.startswith("+91"):
        digits = digits[3:]
    elif digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if not re.fullmatch(r"[6-9]\d{9}", digits):
        raise ValueError("Enter a valid 10-digit Indian mobile number")
    return digits


def _norm_ig(v: str) -> str:
    v = v.strip().lstrip("@")
    if not re.fullmatch(r"[A-Za-z0-9._]{1,30}", v):
        raise ValueError("Enter a valid Instagram username")
    return v


def _check_subset(values: list[str], allowed: list[str]) -> list[str]:
    bad = [x for x in values if x not in allowed]
    if bad:
        raise ValueError(f"Invalid option(s): {', '.join(bad)}")
    return list(dict.fromkeys(values))


# ---------- Settings / public form ----------
class SettingsIn(BaseModel):
    form_open: bool = False
    fee: int = Field(default=199, ge=0, le=100000)
    upi_id: str = Field(default="", max_length=80)
    payee_name: str = Field(default="", max_length=80)


class Settings(SettingsIn):
    qr_file_id: Optional[str] = None


class QuestionCfg(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    hint: str = Field(default="", max_length=140)
    options: list[str] = Field(min_length=2, max_length=40)

    @field_validator("options")
    @classmethod
    def _opts(cls, v: list[str]) -> list[str]:
        cleaned = [x.strip() for x in v if x and x.strip()]
        if any(len(x) > 40 for x in cleaned):
            raise ValueError("Each option must be 40 characters or fewer")
        cleaned = list(dict.fromkeys(cleaned))
        if len(cleaned) < 2:
            raise ValueError("Add at least two options")
        return cleaned


class Questions(BaseModel):
    personality: QuestionCfg
    qualities: QuestionCfg
    vibe: QuestionCfg
    lifestyle: QuestionCfg
    intention: QuestionCfg


class PublicForm(BaseModel):
    open: bool
    fee: int
    upi_id: str
    payee_name: str
    has_qr: bool
    questions: Questions


# ---------- Applications ----------
class Preferences(BaseModel):
    surprise_me: bool = False
    genders: list[Gender] = []
    age_min: int = Field(default=18, ge=18, le=99)
    age_max: int = Field(default=35, ge=18, le=99)
    height_min: int = Field(default=140, ge=120, le=230)
    height_max: int = Field(default=200, ge=120, le=230)
    personalities: list[Personality] = []
    qualities: list[str] = []
    vibes: list[DatingVibe] = []
    lifestyles: list[str] = []
    intentions: list[Intention] = []
    college: str = Field(default="", max_length=100)
    location: str = Field(default="", max_length=100)

    @model_validator(mode="after")
    def _ranges(self):
        if self.age_min > self.age_max:
            raise ValueError("Preferred age range is invalid")
        if self.height_min > self.height_max:
            raise ValueError("Preferred height range is invalid")
        return self


class ProfileFields(BaseModel):
    full_name: str = Field(min_length=2, max_length=80)
    age: int = Field(ge=18, le=99)
    gender: Gender
    height_cm: int = Field(ge=120, le=230)
    mobile: str
    email: EmailStr
    college: str = Field(min_length=1, max_length=100)
    course: str = Field(min_length=1, max_length=100)
    city: str = Field(min_length=1, max_length=60)
    hometown: str = Field(min_length=1, max_length=80)
    instagram: str
    religion: str = Field(default="", max_length=40)
    share_religion: bool = False
    personality: str = Field(min_length=1, max_length=40)
    qualities: list[str] = Field(min_length=1, max_length=40)
    dating_vibe: str = Field(min_length=1, max_length=40)
    lifestyle: list[str] = Field(min_length=1, max_length=40)
    intention: str = Field(min_length=1, max_length=40)
    preferences: Preferences

    @field_validator("mobile")
    @classmethod
    def _m(cls, v: str) -> str:
        return _norm_mobile(v)

    @field_validator("instagram")
    @classmethod
    def _i(cls, v: str) -> str:
        return _norm_ig(v)

    @field_validator("email")
    @classmethod
    def _e(cls, v: str) -> str:
        return v.lower()


class ApplicationIn(ProfileFields):
    photo_id: str
    # Registration is free for women, so payment proof is only required for everyone else.
    utr: Optional[str] = Field(default=None, pattern=r"^[A-Za-z0-9]{6,30}$")
    screenshot_id: Optional[str] = None
    consent_accurate: Literal[True]
    consent_matchmaking: Literal[True]
    consent_share_contact: Literal[True]

    @model_validator(mode="after")
    def _payment_required_unless_female(self):
        if self.gender != "Female" and (not self.utr or not self.screenshot_id):
            raise ValueError("Payment proof (UTR and screenshot) is required")
        return self


class Payment(BaseModel):
    status: PaymentStatus = "pending"
    utr: str = ""
    screenshot_id: Optional[str] = None
    submitted_at: Optional[str] = None
    reviewed_at: Optional[str] = None
    note: str = ""


class Application(ProfileFields):
    id: str
    app_code: str
    photo_id: Optional[str] = None
    payment: Payment
    created_at: str
    match_count: int = 0
    email_status: EmailStatus = "no_matches"
    email_sent_at: Optional[str] = None


class ApplicationCreated(BaseModel):
    app_code: str
    free_entry: bool = False


class PaymentReview(BaseModel):
    status: Literal["verified", "rejected"]
    note: str = Field(default="", max_length=300)


class UploadOut(BaseModel):
    file_id: str


class OkOut(BaseModel):
    ok: bool = True
    message: str = ""


class EndRoundIn(BaseModel):
    confirm: Literal["DELETE"]


class EndRoundOut(BaseModel):
    deleted_entries: int
    deleted_files: int


# ---------- Auth ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class AdminOut(BaseModel):
    id: str
    email: str
    name: str


# ---------- Matchmaking ----------
class CompatPart(BaseModel):
    label: str
    score: int
    max: int
    note: str


class Candidate(BaseModel):
    application: Application
    score: int
    breakdown: list[CompatPart]
    warnings: list[str]
    eligible: bool
    issues: list[str]
    assigned: bool
    reverse_assigned: bool


class AssignIn(BaseModel):
    applicant_id: str
    match_ids: list[str] = Field(min_length=1, max_length=50)
    mutual: bool = False
    override: bool = False


class AssignOut(BaseModel):
    created: int
    skipped: list[str]


class AssignedMatch(BaseModel):
    id: str
    override: bool
    created_at: str
    score: int
    match: Application


# ---------- Emails (copy & paste) ----------
class EmailPreview(BaseModel):
    application_id: str
    to: str
    subject: str
    html: str
    text: str
    match_count: int
    status: EmailStatus
    sent_at: Optional[str] = None


class EmailMarkOut(BaseModel):
    status: EmailStatus
    duplicate: bool
