"""Shared Mongo handle — import `client`/`db` from here (server.py, routers, seed.py)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

# One entry per collection: every field a route filters, sorts, or dedupes on. Applied by ensure_indexes() at startup.
INDEXES: dict[str, list[IndexModel]] = {
    "admins": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("email", ASCENDING)], name="email", unique=True)],
    "applications": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("app_code", ASCENDING)], name="app_code", unique=True),
        IndexModel([("email", ASCENDING)], name="email"),
        IndexModel([("mobile", ASCENDING)], name="mobile"),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
        IndexModel([("payment.utr", ASCENDING)], name="utr"),
    ],
    "match_assignments": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("applicant_id", ASCENDING), ("match_id", ASCENDING)], name="pair", unique=True),
        IndexModel([("match_id", ASCENDING)], name="match_id"),
    ],
    "files": [IndexModel([("id", ASCENDING)], name="id", unique=True)],
    "settings": [IndexModel([("id", ASCENDING)], name="id", unique=True)],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)
