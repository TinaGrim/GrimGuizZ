import random

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_student
from ..db import get_db
from ..schemas import AnswerCreate, CreateAttempt, now_iso

router = APIRouter(prefix="/api", tags=["quiz-taking"])

WHEEL_VALUES = [1, 2, 3]


async def _pick_serve(db, quiz: dict, wheel_result: int) -> list[dict]:
    """Pick `wheel_result` random questions from a quiz's pool, ordered.

    Used by both `spin_quiz` (preview) and `create_attempt` (authoritative).
    A shared helper guarantees both routes agree on the same RNG behaviour.
    """
    pool_ids = quiz.get("questionPoolIds", [])
    questions = []
    for qid in pool_ids:
        try:
            q = await db.questions.find_one({"_id": ObjectId(qid)})
        except Exception:
            continue
        if q:
            questions.append(q)
    random.shuffle(questions)
    return questions[:wheel_result]


def _served_view(q: dict) -> dict:
    """Project a stored question into the shape a student sees — never the
    correct option index."""
    return {
        "questionId": str(q["_id"]),
        "prompt": q["prompt"],
        "imageUrl": q.get("imageUrl"),
        "trollVideoId": q.get("trollVideoId"),
        "timeLimitMinutes": q.get("timeLimitMinutes"),
        "options": q["options"],
        "order": q.get("order", 0),
    }


async def _resolve_troll_video(db, quiz: dict, question: dict | None) -> str | None:
    """Resolve the troll video URL for a question.

    Precedence: the question's own troll video -> the quiz's troll video ->
    a random video from the asset library. Returns the upload URL or None.
    """
    if question:
        qv = question.get("trollVideoId")
        if qv:
            return qv if qv.startswith("/uploads/") else None

    if quiz:
        zv = quiz.get("trollVideoId")
        if zv:
            if zv.startswith("/uploads/"):
                return zv
            try:
                asset = await db.assets.find_one({"_id": ObjectId(zv)})
            except Exception:
                asset = None
            if asset:
                return asset.get("url")

    videos = [a for a in await db.assets.find({"type": "video"}).to_list(None)]
    if videos:
        return random.choice(videos).get("url")

    return None


async def _load_quiz(quiz_id: str) -> dict:
    try:
        quiz = await get_db().quizzes.find_one({"_id": ObjectId(quiz_id)})
    except Exception:
        quiz = None
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.get("status") in ("draft", "archived"):
        raise HTTPException(status_code=403, detail="Quiz is not available")
    return quiz


@router.post("/quizzes/{quiz_id}/spin")
async def spin_quiz(
    quiz_id: str,
    student_id: str = Depends(get_current_student),
):
    """Preview the wheel spin: returns the questions a `create_attempt` with
    the same quiz + wheel value would serve. Does not persist anything."""
    db = get_db()
    quiz = await _load_quiz(quiz_id)

    pool_ids = quiz.get("questionPoolIds", [])
    if not pool_ids:
        raise HTTPException(
            status_code=400,
            detail="This quiz has no questions yet — ask your teacher to add some.",
        )
    max_serve = min(3, len(pool_ids))
    wheel_result = random.choice(list(range(1, max_serve + 1)))

    picked = await _pick_serve(db, quiz, wheel_result)
    return {
        "wheelResult": wheel_result,
        "maxWheelValue": max_serve,
        "questionsServed": [_served_view(q) for q in picked],
    }


@router.post("/attempts")
async def create_attempt(
    payload: CreateAttempt,
    student_id: str = Depends(get_current_student),
):
    """Authoritatively start an attempt for the calling student.

    `studentId` and `questionsServed` in the payload are ignored — the student
    is identified by the bearer token, and the served set is re-derived
    server-side from `quizId` + `wheelResult` so a malicious client can't
    inject their own prompts or skip the randomisation.
    """
    if payload.wheelResult not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Invalid wheel result")

    db = get_db()
    quiz = await _load_quiz(payload.quizId)
    picked = await _pick_serve(db, quiz, payload.wheelResult)
    if not picked:
        raise HTTPException(
            status_code=400,
            detail="This quiz has no questions yet — ask your teacher to add some.",
        )
    if len(picked) != payload.wheelResult:
        raise HTTPException(
            status_code=400,
            detail=(
                f"This quiz only has {len(picked)} question(s) available, "
                f"not {payload.wheelResult}."
            ),
        )

    served = [_served_view(q) for q in picked]
    attempt_id = ObjectId()
    await db.attempts.insert_one({
        "_id": attempt_id,
        "userId": student_id,
        "quizId": payload.quizId,
        "wheelResult": payload.wheelResult,
        "questionsServed": served,
        "answers": [],
        "score": 0,
        "total": len(served),
        "startedAt": now_iso(),
        "completedAt": None,
        "status": "in_progress",
        "totalTimeSpentSeconds": 0.0,
        "deviceType": payload.deviceType or "unknown",
    })
    return {
        "id": str(attempt_id),
        "wheelResult": payload.wheelResult,
        "questionsServed": served,
        "total": len(served),
    }


async def _denormalize_qdb(db, q: dict, quiz_id: str) -> tuple[str | None, str | None]:
    """Resolve chapterId/lessonId for a question via its quiz."""
    if not q:
        return None, None
    try:
        quiz = await db.quizzes.find_one({"_id": ObjectId(quiz_id)})
    except Exception:
        quiz = None
    if not quiz:
        return None, None
    try:
        lesson = await db.lessons.find_one({"_id": ObjectId(quiz["lessonId"])})
    except Exception:
        lesson = None
    if not lesson:
        return None, None
    return str(lesson.get("chapterId") or ""), str(lesson.get("_id") or "")


@router.patch("/attempts/{attempt_id}/answer")
async def submit_answer(
    attempt_id: str,
    payload: AnswerCreate,
    student_id: str = Depends(get_current_student),
):
    db = get_db()
    try:
        attempt = await db.attempts.find_one({"_id": ObjectId(attempt_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt is None:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.get("userId") != student_id:
        raise HTTPException(status_code=403, detail="Not your attempt")
    if attempt.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Attempt already completed")

    served = attempt.get("questionsServed", [])
    question = None
    for sq in served:
        if sq.get("questionId") == payload.questionId:
            question = sq
            break
    if question is None:
        raise HTTPException(status_code=400, detail="Question not in this attempt")

    q = await db.questions.find_one({"_id": ObjectId(payload.questionId)})
    correct_index = q["correctOptionIndex"] if q else -1
    chapter_id, lesson_id = await _denormalize_qdb(db, q, attempt["quizId"])

    answers = attempt.get("answers", [])
    existing = next(
        (a for a in answers if a.get("questionId") == payload.questionId), None
    )
    tries = (existing.get("tries", 0) if existing else 0) + 1
    correct = payload.chosenOptionIndex == correct_index

    # Build the per-question choice history. Always include the current pick.
    incoming_history = list(payload.chosenOptionsHistory or [])
    if not incoming_history or incoming_history[-1] != payload.chosenOptionIndex:
        incoming_history = [*incoming_history, payload.chosenOptionIndex]

    # First-try-correct: True iff the student got it right on the very first PATCH
    # for this question. Server is the source of truth — clients cannot lie.
    first_try_correct = (
        existing.get("firstTryCorrect")
        if existing and "firstTryCorrect" in existing
        else (correct if tries == 1 else False)
    )

    if existing:
        existing["tries"] = tries
        existing["chosenOptionIndex"] = payload.chosenOptionIndex
        existing["chosenOptionsHistory"] = incoming_history
        existing["correct"] = correct
        existing["trolled"] = existing.get("trolled", False)
        existing["firstTryCorrect"] = first_try_correct
        existing["timeSpentSeconds"] = (
            float(existing.get("timeSpentSeconds", 0.0) or 0.0)
            + float(payload.timeSpentSeconds or 0.0)
        )
    else:
        answers.append(
            {
                "questionId": payload.questionId,
                "chapterId": chapter_id,
                "lessonId": lesson_id,
                "chosenOptionIndex": payload.chosenOptionIndex,
                "chosenOptionsHistory": incoming_history,
                "tries": tries,
                "correct": correct,
                "trolled": False,
                "firstTryCorrect": first_try_correct,
                "timeSpentSeconds": float(payload.timeSpentSeconds or 0.0),
            }
        )

    answered = correct or tries >= 3
    if answered and existing is None:
        existing = answers[-1]
    if answered and not existing.get("trolled") and tries >= 3:
        existing["trolled"] = not correct

    await db.attempts.update_one(
        {"_id": attempt["_id"]},
        {"$set": {"answers": answers}},
    )

    should_troll = not correct and tries >= 3
    troll_video_url = None
    if should_troll:
        quiz = await db.quizzes.find_one({"_id": ObjectId(attempt["quizId"])})
        troll_video_url = await _resolve_troll_video(db, quiz, q)

    return {
        "correct": correct,
        "tries": tries,
        "shouldTroll": should_troll,
        "trollVideoUrl": troll_video_url,
        "questionId": payload.questionId,
        "answered": answered,
    }


@router.delete("/attempts/{attempt_id}")
async def abandon_attempt(
    attempt_id: str,
    student_id: str = Depends(get_current_student),
):
    """Abandon an in-progress attempt (student chose to cancel resume)."""
    db = get_db()
    try:
        attempt = await db.attempts.find_one({"_id": ObjectId(attempt_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt is None:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.get("userId") != student_id:
        raise HTTPException(status_code=403, detail="Not your attempt")
    if attempt.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Attempt already completed")

    await db.attempts.update_one(
        {"_id": attempt["_id"]},
        {"$set": {"status": "abandoned", "completedAt": now_iso()}},
    )
    return {"ok": True}


@router.post("/attempts/{attempt_id}/complete")
async def complete_attempt(
    attempt_id: str,
    student_id: str = Depends(get_current_student),
):
    db = get_db()
    try:
        attempt = await db.attempts.find_one({"_id": ObjectId(attempt_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt is None:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.get("userId") != student_id:
        raise HTTPException(status_code=403, detail="Not your attempt")

    answers = attempt.get("answers", [])
    served = attempt.get("questionsServed", [])
    total = len(served)
    score = sum(1 for a in answers if a.get("correct"))
    total_time = sum(float(a.get("timeSpentSeconds", 0.0) or 0.0) for a in answers)

    breakdown = []
    for sq in served:
        q = await db.questions.find_one({"_id": ObjectId(sq["questionId"])})
        answer = next(
            (a for a in answers if a.get("questionId") == sq["questionId"]), None
        )
        breakdown.append(
            {
                "questionId": sq["questionId"],
                "prompt": sq["prompt"],
                "imageUrl": sq.get("imageUrl"),
                "trollVideoId": sq.get("trollVideoId"),
                "timeLimitMinutes": sq.get("timeLimitMinutes"),
                "options": sq["options"],
                "correctOptionIndex": q["correctOptionIndex"] if q else -1,
                "chosenOptionIndex": answer.get("chosenOptionIndex") if answer else None,
                "chosenOptionsHistory": answer.get("chosenOptionsHistory", []) if answer else [],
                "tries": answer.get("tries", 0) if answer else 0,
                "correct": bool(answer and answer.get("correct")),
                "trolled": bool(answer and answer.get("trolled")),
                "firstTryCorrect": bool(answer and answer.get("firstTryCorrect")),
                "timeSpentSeconds": float(answer.get("timeSpentSeconds", 0.0) or 0.0)
                if answer
                else 0.0,
            }
        )

    await db.attempts.update_one(
        {"_id": attempt["_id"]},
        {
            "$set": {
                "status": "completed",
                "score": score,
                "total": total,
                "completedAt": now_iso(),
                "totalTimeSpentSeconds": total_time,
            }
        },
    )

    return {
        "id": str(attempt["_id"]),
        "score": score,
        "total": total,
        "wheelResult": attempt.get("wheelResult"),
        "totalTimeSpentSeconds": total_time,
        "breakdown": breakdown,
        "completedAt": now_iso(),
    }
