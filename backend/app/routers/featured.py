""""Hall of Fame / Wall of Shame" daily quip for the student landing page.

Public endpoint. The quip is deterministic per calendar day so the whole
class sees the same troll-worthy attempt all day. Teacher moderation lives
in teacher.py and writes to a config doc below.
"""

import zlib
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter

from ..db import get_db

router = APIRouter(prefix="/api/featured", tags=["featured"])

# Shared with teacher.py so moderation persists to the same config doc.
WALL_OF_SHAME_CONFIG_ID = "wall_of_shame"

# First name + quiz title are formatting into templates ("«Wars»" quotes
# keep the title from melting into the sentence).
QUIPS = [
    "Wrong answers, generously sponsored by {name} on «{quiz}».",
    "{name} met the troll face on «{quiz}» — and asked for an autograph.",
    "«{quiz}» humbled {name}: three strikes, one troll, zero mercy.",
    "The troll would like to thank {name} for choosing «{quiz}» tonight.",
    "{name} turned «{quiz}» into a 0-star review. Bold strategy.",
    "Questionable decisions were made by {name} during «{quiz}».",
    "Sources say {name} believes «{quiz}» is a personality test.",
]

_HIDE_FIELDS = ["hiddenStudentIds"]


def _to_oid(value: str) -> ObjectId | None:
    try:
        return ObjectId(value)
    except Exception:
        return None


async def _hidden_ids(db) -> set[str]:
    """Ids of students the teacher has hidden from the Wall of Shame."""
    conf = await db.config.find_one({"_id": WALL_OF_SHAME_CONFIG_ID})
    return set((conf or {}).get("hiddenStudentIds") or [])


@router.get("/quip")
async def featured_quip():
    db = get_db()
    hidden = await _hidden_ids(db)
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    query: dict = {
        "status": "completed",
        "completedAt": {"$gte": cutoff},
        "answers": {"$elemMatch": {"trolled": True}},
    }
    if hidden:
        query["userId"] = {"$nin": list(hidden)}

    attempts = await db.attempts.find(query).to_list(500)
    if not attempts:
        return None

    user_ids = {a["userId"] for a in attempts}
    quiz_ids = {a["quizId"] for a in attempts}
    user_oids = [oid for oid in (_to_oid(x) for x in user_ids) if oid is not None]
    quiz_oids = [oid for oid in (_to_oid(x) for x in quiz_ids) if oid is not None]

    students: dict[ObjectId, str] = {}
    async for s in db.students.find({"_id": {"$in": user_oids}}):
        students[s["_id"]] = s.get("name") or "someone"
    quizzes: dict[ObjectId, str] = {}
    async for q in db.quizzes.find({"_id": {"$in": quiz_oids}}):
        quizzes[q["_id"]] = q.get("title") or "an unknown quiz"

    # Deterministic pick for the day: hash the date, use it to index a
    # stable-sorted candidate list, then pick a template with a second hash.
    attempts.sort(
        key=lambda a: (a.get("userId", ""), a.get("quizId", ""), a.get("completedAt", ""))
    )
    day = datetime.now(timezone.utc).date().isoformat()
    pick_seed = zlib.crc32(day.encode())
    quip_seed = zlib.crc32(f"quip:{day}".encode())

    attempt = attempts[pick_seed % len(attempts)]
    full_name = students.get(_to_oid(attempt["userId"]) or ObjectId(), "someone")
    first = full_name.strip().split(" ")[0] if full_name.strip() else "someone"
    quiz = quizzes.get(_to_oid(attempt["quizId"]) or ObjectId(), "an unknown quiz")
    template = QUIPS[quip_seed % len(QUIPS)]

    return {
        "name": first,
        "quiz": quiz,
        "quip": template.format(name=first, quiz=quiz),
        "date": day,
    }