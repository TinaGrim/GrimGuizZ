"""Idempotent startup migrations.

Currently:
  - Rename `categories` collection -> `chapters`, drop the old collection once
    every document has been copied. Also rewrite `lessons.categoryId` ->
    `lessons.chapterId` (keep the same value).
  - Backfill `subject` on every chapter: heuristic by name keyword match.
"""

from bson import ObjectId

from .db import get_db

MIGRATION_FLAG = "migrated_v2_chapters"


SUBJECT_KEYWORDS = (
    ("math", ["algebra", "geometry", "trigonometry", "statistics", "probability", "functions & graphs", "functions and graphs"]),
    ("physics", ["motion", "forces", "energy", "work", "electricity", "ohm", "waves", "sound", "heat", "temperature"]),
)


def _infer_subject(name: str) -> str:
    n = (name or "").lower()
    for subject, words in SUBJECT_KEYWORDS:
        if any(w in n for w in words):
            return subject
    return "other"


async def run_migrations() -> None:
    db = get_db()

    flag = await db.meta.find_one({"_id": MIGRATION_FLAG})
    if flag:
        return

    # 1. Copy `categories` documents to `chapters` (idempotent: never overwrite).
    legacy = db["categories"]
    target = db["chapters"]
    legacy_count = await legacy.count_documents({})
    copied = 0
    if legacy_count > 0:
        async for doc in legacy.find():
            doc = dict(doc)
            new_doc = dict(doc)
            new_doc["subject"] = _infer_subject(doc.get("name", ""))
            await target.update_one(
                {"_id": doc["_id"]},
                {"$setOnInsert": new_doc},
                upsert=True,
            )
            copied += 1

        # 2. Rewrite `lessons.categoryId` -> `lessons.chapterId`.
        # First add a chapterId mirroring categoryId, then drop categoryId.
        async for lesson in db["lessons"].find({"categoryId": {"$exists": True}}):
            await db["lessons"].update_one(
                {"_id": lesson["_id"]},
                {
                    "$set": {"chapterId": lesson["categoryId"]},
                    "$unset": {"categoryId": ""},
                },
            )

        # 3. Rewrite `attempts.answers[].chapterId` (was categoryId, now properly
        # populated by Phase A instrumentation). Phase A writes `chapterId`
        # directly; nothing else references the old name.

        # 4. Drop the legacy collection once data has been copied.
        await legacy.drop()

    # 5. Backfill subject on chapters that don't have one (covers seed data
    # that landed in chapters directly without going through the migration).
    async for ch in target.find({"subject": {"$exists": False}}):
        await target.update_one(
            {"_id": ch["_id"]},
            {"$set": {"subject": _infer_subject(ch.get("name", ""))}},
        )

    await db.meta.insert_one(
        {"_id": MIGRATION_FLAG, "ranAt": _now_iso(), "copied": copied}
    )
    print(
        f"[migrate] chapters migration complete — {copied} chapter(s) copied, "
        f"legacy `categories` collection dropped."
    )


def _now_iso() -> str:
    from datetime import datetime
    return datetime.utcnow().isoformat() + "Z"