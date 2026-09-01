"""Seed the database on first run (idempotent)."""
from .db import get_db
from .seed import build_quotes, build_seed

SEED_FLAG = "seeded_v1"
QUOTES_FLAG = "seeded_quotes_v1"


async def _seed_quotes(db):
    """Backfill the quote library if it isn't populated (idempotent)."""
    if await db.meta.count_documents({"_id": QUOTES_FLAG}):
        return
    if await db.quotes.count_documents({}) == 0:
        quotes = build_quotes()
        if quotes:
            await db.quotes.insert_many(quotes)
    await db.meta.insert_one({"_id": QUOTES_FLAG, "seededAt": __import__("datetime").datetime.utcnow().isoformat() + "Z"})


async def seed_if_empty():
    db = get_db()
    if await db.meta.count_documents({"_id": SEED_FLAG}):
        await _seed_quotes(db)
        return

    seed = build_seed()

    teacher_doc = seed["teacher"]
    await db.teachers.insert_one(teacher_doc)

    for collection, docs in [
        ("students", seed["students"]),
        ("chapters", seed["chapters"]),
        ("lessons", seed["lessons"]),
        ("quizzes", seed["quizzes"]),
        ("questions", seed["questions"]),
        ("messages", seed["messages"]),
    ]:
        if docs:
            await db[collection].insert_many(docs)

    await _seed_quotes(db)

    await db.meta.insert_one({"_id": SEED_FLAG, "seededAt": __import__("datetime").datetime.utcnow().isoformat() + "Z"})
    print(f"[seed] QuizZ database seeded: {len(seed['chapters'])} chapters, {len(seed['questions'])} questions, {len(seed['students'])} students")
