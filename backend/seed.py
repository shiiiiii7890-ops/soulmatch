"""Idempotent demo seed for the preview: 12 sample entries + form open.
Run: cd /app/backend && python seed.py   (admin 'End round & delete data' wipes them)
"""

import asyncio
import random

from lib.auth import ensure_admin
from lib.db import db, ensure_indexes
from lib.service import new_id, now_iso

random.seed(7)

PEOPLE = [
    ("Aarav Mehta", 22, "Male", 178, "Introvert", ["Loyal", "Intellectual", "Nerd"], "Deep Conversations", ["Book Lover", "Gamer"], "Serious Relationship"),
    ("Ananya Rao", 21, "Female", 162, "Ambivert", ["Kind", "Creative", "Romantic"], "Hopeless Romantic", ["Book Lover", "Music Lover"], "Serious Relationship"),
    ("Kabir Singh", 23, "Male", 182, "Extrovert", ["Funny", "Confident", "Adventurous"], "Casual & Fun", ["Party Lover", "Traveller"], "Getting to Know Someone"),
    ("Ishita Verma", 20, "Female", 158, "Extrovert", ["Humorous", "Foodie", "Adventurous"], "Gen Z", ["Food Explorer", "Traveller"], "Open to Connections"),
    ("Rohan Iyer", 24, "Male", 175, "Ambivert", ["Ambitious", "Caring", "Kind"], "Friends First", ["Fitness Enthusiast", "Movie Buff"], "Friendship First"),
    ("Meera Nair", 22, "Female", 165, "Introvert", ["Loyal", "Emotional", "Intellectual"], "Deep Conversations", ["Book Lover", "Movie Buff"], "Serious Relationship"),
    ("Vihaan Kapoor", 21, "Male", 172, "Introvert", ["Shy", "Creative", "Romantic"], "Old School", ["Music Lover", "Book Lover"], "Serious Relationship"),
    ("Sara Khan", 23, "Female", 168, "Ambivert", ["Confident", "Ambitious", "Funny"], "Casual & Fun", ["Fitness Enthusiast", "Party Lover"], "Getting to Know Someone"),
    ("Arjun Desai", 22, "Male", 180, "Extrovert", ["Foodie", "Humorous", "Caring"], "Gen Z", ["Food Explorer", "Gamer"], "Open to Connections"),
    ("Diya Malhotra", 20, "Female", 160, "Ambivert", ["Kind", "Caring", "Romantic"], "Friends First", ["Music Lover", "Traveller"], "Friendship First"),
    ("Neel Joshi", 25, "Male", 176, "Ambivert", ["Loyal", "Ambitious", "Confident"], "Deep Conversations", ["Traveller", "Book Lover"], "Serious Relationship"),
    ("Tara Bhatt", 21, "Female", 163, "Extrovert", ["Adventurous", "Funny", "Creative"], "Gen Z", ["Party Lover", "Movie Buff"], "Getting to Know Someone"),
]
COLLEGES = [("IIT Bombay", "Computer Science"), ("Delhi University", "Economics"), ("NMIMS", "BBA"), ("Christ University", "Psychology"), ("BITS Pilani", "Mechanical")]
CITIES = [("Mumbai", "Pune, Maharashtra"), ("Delhi", "Jaipur, Rajasthan"), ("Bengaluru", "Kochi, Kerala"), ("Hyderabad", "Indore, MP")]


def person(i: int, p: tuple, status: str) -> dict:
    name, age, gender, h, pers, quals, vibe, life, intent = p
    college, course = COLLEGES[i % len(COLLEGES)]
    city, home = CITIES[i % len(CITIES)]
    handle = name.lower().replace(" ", ".") + str(10 + i)
    return {
        "id": new_id(), "app_code": f"SM-D{i:04d}", "full_name": name, "age": age, "gender": gender, "height_cm": h,
        "mobile": f"98{random.randint(10000000, 99999999)}", "email": f"{handle}@example.com", "photo_id": None,
        "college": college, "course": course, "year": ["1st Year", "2nd Year", "3rd Year", "4th Year"][i % 4], "city": city, "hometown": home, "instagram": handle, "religion": "",
        "share_religion": False, "personality": pers, "qualities": quals, "dating_vibe": vibe, "lifestyle": life, "intention": intent,
        "preferences": {
            "surprise_me": False, "genders": ["Female"] if gender == "Male" else ["Male"], "age_min": 19, "age_max": 26,
            "height_min": 150, "height_max": 195, "personalities": [], "qualities": random.sample(quals + ["Kind", "Loyal", "Funny"], 3),
            "vibes": [vibe], "lifestyles": life[:1], "intentions": [intent], "college": "", "location": "",
        },
        "consent_accurate": True, "consent_matchmaking": True, "consent_share_contact": True,
        "payment": {"status": status, "utr": f"UTR{random.randint(10**9, 10**10)}", "screenshot_id": None,
                    "submitted_at": now_iso(), "reviewed_at": now_iso() if status == "verified" else None, "note": ""},
        "created_at": now_iso(), "email_state": None, "seeded": True,
    }


async def main() -> None:
    await ensure_indexes()
    await ensure_admin()
    for coll in ("rounds", "deletion_requests", "email_logs", "status_checks"):
        await db.drop_collection(coll)
    old = [d["id"] async for d in db.applications.find({"seeded": True}, {"id": 1})]
    await db.match_assignments.delete_many({"$or": [{"applicant_id": {"$in": old}}, {"match_id": {"$in": old}}]})
    await db.applications.delete_many({"seeded": True})
    statuses = ["verified"] * 10 + ["pending", "pending"]
    await db.applications.insert_many([person(i, p, statuses[i]) for i, p in enumerate(PEOPLE)])
    await db.settings.update_one({"id": "global"}, {"$set": {"form_open": True}, "$setOnInsert": {"payee_name": "SoulMatch", "fee": 199}}, upsert=True)
    print(f"Seeded {len(PEOPLE)} sample entries; form open")


if __name__ == "__main__":
    asyncio.run(main())
