import random

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo import ASCENDING

from ..auth import get_current_teacher
from ..db import get_db
from ..schemas import now_iso, serialize

router = APIRouter(prefix="/api/teacher/quotes", tags=["quotes"])

# Router for the student-facing random quote is registered separately in main.py
# (as a public endpoint) so Results can fetch without a teacher token.


def _public_router():
    r = APIRouter(prefix="/api/quotes", tags=["quotes"])

    @r.get("/random")
    async def random_quote():
        db = get_db()
        quote = await db.quotes.aggregate([{"$sample": {"size": 1}}]).to_list(1)
        if quote:
            q = quote[0]
            return {"id": str(q["_id"]), "text": q["text"]}
        return {"id": "", "text": ""}

    @r.get("")
    async def public_quotes():
        db = get_db()
        out = []
        async for q in db.quotes.find().sort("createdAt", 1):
            out.append({"id": str(q["_id"]), "text": q["text"]})
        return out

    return r


@router.get("")
async def list_quotes(teacher_id: str = Depends(get_current_teacher)):
    db = get_db()
    out = []
    async for q in db.quotes.find().sort("createdAt", ASCENDING):
        q["id"] = str(q.pop("_id"))
        out.append(q)
    return out


@router.post("")
async def create_quote(
    payload: dict, teacher_id: str = Depends(get_current_teacher)
):
    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Quote text is required.")
    if len(text) > 300:
        raise HTTPException(status_code=400, detail="Quote is too long (max 300 chars).")

    db = get_db()
    qid = ObjectId()
    doc = {"_id": qid, "text": text, "createdAt": now_iso()}
    await db.quotes.insert_one(doc)
    return serialize(doc)


@router.patch("/{quote_id}")
async def update_quote(
    quote_id: str, payload: dict, teacher_id: str = Depends(get_current_teacher)
):
    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Quote text is required.")
    if len(text) > 300:
        raise HTTPException(status_code=400, detail="Quote is too long (max 300 chars).")

    db = get_db()
    result = await db.quotes.update_one(
        {"_id": ObjectId(quote_id)}, {"$set": {"text": text}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    q = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    return serialize(q)


@router.delete("/{quote_id}")
async def delete_quote(quote_id: str, teacher_id: str = Depends(get_current_teacher)):
    db = get_db()
    result = await db.quotes.delete_one({"_id": ObjectId(quote_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"ok": True}


public_router = _public_router()
