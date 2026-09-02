import json
import re
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Response
from pymongo import ASCENDING, DESCENDING

from ..auth import create_student_token, get_current_student
from ..config import media_url
from ..db import get_db
from ..schemas import SemesterRange, StudentCreate, StudentEnterOut

router = APIRouter(prefix="/api/students", tags=["students"])


def _range_since(period: str) -> datetime:
    now = datetime.now(timezone.utc)
    if period == "week":
        return now - timedelta(days=7)
    if period == "month":
        return now - timedelta(days=30)
    return now - timedelta(days=365)


def _name_filter(name: str) -> dict:
    """Return a case-insensitive exact-match filter for a student name.

    Earlier this used `{"$regex": f"^{name}$"}` without escaping, which let a
    caller enter ".*" and log in as any student. `re.escape` neutralises
    regex metacharacters so the match is now a literal string comparison.
    """
    return {"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}


async def _hydrate_catalog() -> tuple[list[dict], list[dict]]:
    """Return the full chapter + lesson lists so the student dashboard can
    render the chapter/lesson groupings around its assigned quizzes without
    needing an authenticated teacher session."""
    db = get_db()
    chapters: list[dict] = []
    async for c in db.chapters.find().sort("name", 1):
        c["id"] = str(c.pop("_id"))
        chapters.append(c)
    lessons: list[dict] = []
    async for l in db.lessons.find():
        l["id"] = str(l.pop("_id"))
        lessons.append(l)
    return chapters, lessons


async def _resolve_student(student_id: str, caller_id: str) -> dict:
    """Look up a student and verify the caller owns the record.

    All `/api/students/{id}/*` reads are now scoped to the bearer token's
    subject, so a stolen id is useless without the corresponding JWT.
    """
    if student_id != caller_id:
        raise HTTPException(status_code=403, detail="Not your record")
    try:
        oid = ObjectId(student_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Student not found")
    student = await get_db().students.find_one({"_id": oid})
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.post("/enter", response_model=StudentEnterOut)
async def enter_student(payload: StudentCreate):
    db = get_db()
    name = payload.name.strip()
    student = await db.students.find_one(_name_filter(name))

    chapters, lessons = await _hydrate_catalog()

    # Unknown name → friendly empty state (not an error).
    if student is None:
        return StudentEnterOut(
            student={"id": "unknown", "name": name, "createdAt": "", "assignedQuizIds": []},
            quizzes=[],
            hasQuizzes=False,
            chapters=chapters,
            lessons=lessons,
        )

    quizzes = await _assigned_quizzes(student)
    return StudentEnterOut(
        student={
            "id": str(student["_id"]),
            "name": student["name"],
            "createdAt": student.get("createdAt", ""),
            "assignedQuizIds": student.get("assignedQuizIds", []),
            "token": create_student_token(str(student["_id"])),
        },
        quizzes=quizzes,
        hasQuizzes=len(quizzes) > 0,
        chapters=chapters,
        lessons=lessons,
    )


async def _assigned_quizzes(student: dict) -> list:
    db = get_db()
    valid_ids: list[str] = []
    quizzes = []
    for qid in student.get("assignedQuizIds", []):
        try:
            quiz = await db.quizzes.find_one({"_id": ObjectId(qid)})
        except Exception:
            continue
        if quiz is None or quiz.get("status") == "archived":
            continue
        valid_ids.append(qid)
        best = 0.0
        seen_attempt = False
        async for a in db.attempts.find({"userId": str(student["_id"]), "quizId": qid, "status": "completed"}):
            seen_attempt = True
            best = max(best, a.get("score", 0) / max(a.get("total", 1), 1))
        quiz["bestScore"] = round(best * 100) if seen_attempt else None
        quiz["id"] = str(quiz.pop("_id"))
        quizzes.append(quiz)
    # Drop dangling references so the student doesn't keep "having" quizzes
    # that were deleted/archived in another session.
    if len(valid_ids) != len(student.get("assignedQuizIds", [])):
        await db.students.update_one(
            {"_id": student["_id"]},
            {"$set": {"assignedQuizIds": valid_ids}},
        )
        student["assignedQuizIds"] = valid_ids
    return quizzes


@router.get("/{student_id}/quizzes")
async def get_student_quizzes(
    student_id: str,
    caller_id: str = Depends(get_current_student),
):
    student = await _resolve_student(student_id, caller_id)
    return await _assigned_quizzes(student)


@router.get("/{student_id}/messages")
async def get_student_messages(
    student_id: str,
    caller_id: str = Depends(get_current_student),
):
    await _resolve_student(student_id, caller_id)
    db = get_db()
    teacher = await db.teachers.find_one({})
    teacher_name = teacher.get("displayName", "Your teacher") if teacher else "Your teacher"

    out = []
    async for m in db.messages.find({"studentId": student_id}).sort("createdAt", DESCENDING):
        out.append({
            "id": str(m["_id"]),
            "studentId": m["studentId"],
            "teacherId": m.get("teacherId", ""),
            "teacherName": teacher_name,
            "text": m["text"],
            "createdAt": m["createdAt"],
            "readAt": m.get("readAt"),
        })
    return out


@router.get("/{student_id}/active-attempt")
async def get_active_attempt(
    student_id: str,
    caller_id: str = Depends(get_current_student),
):
    """Return the student's in-progress attempt (if any) so they can resume
    after a refresh/reload. Answers are stripped of correctness — client uses
    it to reconstruct the question screen, not to grade itself."""
    await _resolve_student(student_id, caller_id)
    db = get_db()
    attempt = await db.attempts.find_one(
        {"userId": student_id, "status": "in_progress"},
        sort=[("startedAt", DESCENDING)],
    )
    if attempt is None:
        return {"attempt": None}

    quiz = await db.quizzes.find_one({"_id": ObjectId(attempt.get("quizId") or "")})
    lesson = await db.lessons.find_one({"_id": ObjectId(quiz["lessonId"])}) if quiz else None
    chapter = await db.chapters.find_one({"_id": ObjectId(lesson["chapterId"])}) if lesson else None

    served = attempt.get("questionsServed", [])

    # Which answered questions are already resolved (correct or ran out of tries).
    answered_ids = {
        ans["questionId"] for ans in attempt.get("answers", []) if ans.get("correct") or ans.get("tries", 0) >= 3
    }
    # The next question index = number of already-resolved served questions.
    # Walk served in order and stop at the first unresolved one.
    next_index = 0
    for i, sq in enumerate(served):
        if sq["questionId"] in answered_ids:
            next_index = i + 1
        else:
            break

    # Recover per-question tries for the current (possibly in-progress) question.
    current_tries = 0
    current_history: list[int] = []
    if next_index < len(served):
        cur_id = served[next_index]["questionId"]
        ans = next(
            (a for a in attempt.get("answers", []) if a.get("questionId") == cur_id),
            None,
        )
        if ans:
            current_tries = ans.get("tries", 0)
            current_history = list(ans.get("chosenOptionsHistory", []) or [])
            # The last history entry was the submitted (wrong) pick.
            if current_history:
                current_history = current_history[:-1]

    return {
        "attempt": {
            "attemptId": str(attempt["_id"]),
            "quizId": attempt.get("quizId"),
            "quizTitle": quiz.get("title") if quiz else None,
            "lessonTitle": lesson.get("title") if lesson else None,
            "chapterName": chapter.get("name") if chapter else None,
            "wheelResult": attempt.get("wheelResult"),
            "startedAt": attempt.get("startedAt"),
            "questionsServed": [
                {
                    "questionId": sq.get("questionId"),
                    "prompt": sq.get("prompt"),
                    "imageUrl": media_url(sq.get("imageUrl")),
                    "trollVideoId": media_url(sq.get("trollVideoId")),
                    "timeLimitMinutes": sq.get("timeLimitMinutes"),
                    "options": sq.get("options"),
                    "order": sq.get("order", 0),
                }
                for sq in served
            ],
            "nextQuestionIndex": next_index,
            "currentTries": current_tries,
            "currentHistory": current_history,
            "total": len(served),
        }
    }


@router.get("/{student_id}/report")
async def get_student_report(
    student_id: str,
    range: SemesterRange = "month",
    caller_id: str = Depends(get_current_student),
):
    """Expanded student report (addendum §1, §2)."""
    from ..reports import build_student_report

    await _resolve_student(student_id, caller_id)

    report = await build_student_report(get_db(), student_id, range)
    if report is None:
        raise HTTPException(status_code=404, detail="Student not found")
    # Report changes every time the student completes a quiz — never let
    # the browser or the Vite proxy serve a stale copy.
    return Response(
        content=json.dumps(report),
        media_type="application/json",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache"},
    )
