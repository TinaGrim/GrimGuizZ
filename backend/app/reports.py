"""Shared report aggregation. Used by both the student and teacher report
endpoints so the two surfaces always compute metrics the same way.

Mastery thresholds (stricter rule per the addendum decision):
  - firstTryCorrectRate >= 0.85 → "Strong"
  - >= 0.50                    → "Getting there"
  - else                       → "Needs practice"
"""

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId

# Public so client and tests can render the same labels.
MASTERY_THRESHOLDS = {
    "strong": 0.85,
    "getting_there": 0.50,
}

# Goal line used by the student dashboard for "am I on track?" copy. No
# teacher-set goal exists yet — this is a sane default aligned with the
# amber/teal band boundary the UI already draws at ~60%.
PASS_THRESHOLD = 60.0

# Weakest-chapter / weakest-lesson gate: don't call anything "weak" when every
# area sits at or above this latest-only percent.
WEAKEST_MIN_PERCENT = 90.0


def mastery_label(first_try_correct_rate: float | None, attempts: int = 0) -> str:
    """Return the qualitative mastery label for a student or lesson.

    `first_try_correct_rate` is the proportion of answers (or questions) the
    student got right on the first try. `attempts` lets us return "Needs
    practice" instead of "Strong" when there's almost no signal.
    """
    if attempts == 0 or first_try_correct_rate is None:
        return "Needs practice"
    if first_try_correct_rate >= MASTERY_THRESHOLDS["strong"]:
        return "Strong"
    if first_try_correct_rate >= MASTERY_THRESHOLDS["getting_there"]:
        return "Getting there"
    return "Needs practice"


def trend_label(scores: list[float]) -> str:
    """Classify a series of scores (oldest first) into improving / steady /
    declining. Uses a simple delta threshold of 0.05 over the series halves."""
    if len(scores) < 2:
        return "flat"
    half = len(scores) // 2
    first = sum(scores[:half]) / max(half, 1)
    second = sum(scores[half:]) / max(len(scores) - half, 1)
    if second - first > 0.05:
        return "improving"
    if first - second > 0.05:
        return "declining"
    return "steady"


def _two_window_delta(scores: list[float]) -> float | None:
    """Delta (later half minus earlier half) in percent points; the magnitude
    behind a trend label. Returns None when there isn't enough signal."""
    if len(scores) < 4:
        return None
    half = len(scores) // 2
    earlier = scores[:half]
    later = scores[half:]
    if len(earlier) < 2 or len(later) < 2:
        return None
    return (sum(later) / len(later) - sum(earlier) / len(earlier)) * 100


def status_flag(recent_scores: list[float], prior_scores: list[float] | None = None) -> str:
    """Compute a student's status from their score trend with hysteresis.

    Recent vs prior windows. Defaults to "on_track" if there's not enough
    history to make a call.
    """
    if not recent_scores:
        return "needs_attention" if prior_scores else "on_track"
    recent = sum(recent_scores) / len(recent_scores)
    if not prior_scores or not prior_scores:
        return "on_track" if recent >= 0.5 else "needs_attention"
    prior = sum(prior_scores) / len(prior_scores)
    if recent < 0.4 or (prior - recent) > 0.15:
        return "needs_attention"
    if recent < 0.6 or (prior - recent) > 0.05:
        return "falling_behind"
    return "on_track"


def date_bucket(iso: str, period: str) -> str:
    """Bucket an ISO timestamp into a YYYY-MM-DD string for trend charts."""
    try:
        d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except Exception:
        return ""
    if period == "week" or period == "month":
        return d.strftime("%Y-%m-%d")
    return d.strftime("%Y-%m")  # coarser bucket for year view


async def _completed_attempts(
    db,
    *,
    user_id: str | None = None,
    since_iso: str | None = None,
    until_iso: str | None = None,
) -> list[dict]:
    """Return all completed attempts, optionally filtered by user + window."""
    query: dict[str, Any] = {"status": "completed"}
    if user_id is not None:
        query["userId"] = user_id
    window: dict[str, Any] = {}
    if since_iso is not None:
        window["$gte"] = since_iso
    if until_iso is not None:
        window["$lt"] = until_iso
    if window:
        query["completedAt"] = window
    cursor = db.attempts.find(query)
    return [a async for a in cursor]


async def _fetch_by_ids(db, coll: str, ids) -> dict[str, dict]:
    """Fetch docs by _id in ONE `$in` query instead of one find_one per id.

    Returns a dict keyed by str(_id) with an extra "id" field (the string
    form) copied onto every doc, mirroring what the old per-id helpers added
    before they were replaced. Invalid/non-ObjectId strings are skipped.
    """
    if not ids:
        return {}
    oids: list[ObjectId] = []
    for raw in ids:
        i = (raw or "").strip()
        if not i:
            continue
        try:
            oids.append(ObjectId(i))
        except Exception:
            continue
    if not oids:
        return {}
    out: dict[str, dict] = {}
    async for d in db[coll].find({"_id": {"$in": oids}}):
        d["id"] = str(d["_id"])
        out[d["id"]] = d
    return out


def _attempt_percent(a: dict) -> float:
    total = a.get("total", 0) or 0
    if not total:
        return 0.0
    return (a.get("score", 0) or 0) / total


def _first_try_correct_count(answers: list[dict]) -> tuple[int, int]:
    """Return (first_try_correct, total_questions) across an attempt's answers."""
    total = 0
    ftc = 0
    for ans in answers or []:
        total += 1
        if ans.get("firstTryCorrect"):
            ftc += 1
    return ftc, total


def _aggregate_lesson(lesson_attempts: list[dict]) -> dict:
    """Compute per-lesson metrics from the attempts that touched a lesson."""
    if not lesson_attempts:
        return {
            "attempts": 0,
            "avgScore": 0.0,
            "firstTryCorrectRate": 0.0,
            "medianTimeSeconds": 0.0,
            "trend": "flat",
        }
    n = len(lesson_attempts)
    percents = [_attempt_percent(a) for a in lesson_attempts]
    times: list[float] = []
    ftc_total = 0
    ftc_questions = 0
    for a in lesson_attempts:
        ftc, tot = _first_try_correct_count(a.get("answers", []))
        ftc_total += ftc
        ftc_questions += tot
        t = a.get("totalTimeSpentSeconds", 0.0) or 0.0
        if tot:
            times.append(t / tot)
    return {
        "attempts": n,
        "avgScore": round(sum(percents) / n, 4),
        "firstTryCorrectRate": round(ftc_total / ftc_questions, 4) if ftc_questions else 0.0,
        "medianTimeSeconds": round(_median(times), 2) if times else 0.0,
        "trend": trend_label(percents),
    }


def _median(xs: list[float]) -> float:
    if not xs:
        return 0.0
    s = sorted(xs)
    mid = len(s) // 2
    if len(s) % 2:
        return s[mid]
    return (s[mid - 1] + s[mid]) / 2


def _range_days(period: str) -> int:
    """Days covered by a class/report range selector."""
    return {"week": 7, "month": 30, "year": 365}.get(period, 30)


def _window_summary(
    window_attempts: list[dict],
    *,
    quiz_map: dict[str, dict],
    lesson_map: dict[str, dict],
    quiet_cutoff_iso: str,
) -> dict:
    """Compact aggregate for a completed-attempt window — no DB calls.

    Used to compute the `vsPrevious` deltas on the class report without
    re-running the whole per-student rollup a second time. All lookups hit
    the preloaded quiz/lesson maps, which the caller builds to cover both the
    current and previous windows.
    """
    n = len(window_attempts)
    ftc_total = 0
    ftc_questions = 0
    percs: list[float] = []
    by_student_avg: dict[str, list[float]] = defaultdict(list)
    by_student_last: dict[str, str] = {}
    by_lesson: dict[str, list[dict]] = defaultdict(list)
    for a in window_attempts:
        ft, fq = _first_try_correct_count(a.get("answers", []))
        ftc_total += ft
        ftc_questions += fq
        pct = _attempt_percent(a)
        percs.append(pct)
        uid = a.get("userId", "")
        if uid:
            by_student_avg[uid].append(pct)
            last = a.get("completedAt", "") or ""
            if last and last > by_student_last.get(uid, ""):
                by_student_last[uid] = last
        q = quiz_map.get(a.get("quizId") or "")
        if q:
            lesson = lesson_map.get(q.get("lessonId") or "")
            if lesson:
                by_lesson[str(lesson["_id"])].append(a)

    lesson_rates: dict[str, float] = {}
    for lid, atts in by_lesson.items():
        agg = _aggregate_lesson(atts)
        if agg["firstTryCorrectRate"] > 0:
            lesson_rates[lid] = round(agg["firstTryCorrectRate"], 4)

    attention = 0
    active = 0
    for uid, pcs in by_student_avg.items():
        active += 1
        if sum(pcs) / len(pcs) < 0.5:
            attention += 1

    quiet = sum(1 for last in by_student_last.values() if last < quiet_cutoff_iso)

    return {
        "attempts": n,
        "firstTryCorrect": ftc_total,
        "firstTryQuestions": ftc_questions,
        "avgScore": round(sum(percs) / len(percs) * 100, 1) if percs else 0.0,
        "activeStudents": active,
        "attentionCount": attention,
        "quietCount": quiet,
        "lessonRates": lesson_rates,
    }


def _wrong_answer_patterns(
    answers_by_lesson: dict[str, list[dict]],
    lesson_lookup,
) -> list[dict]:
    """Detect lessons where a student repeatedly picks the same wrong option.

    Returns at most one pattern per lesson, only when frequency >= 2.
    """
    out: list[dict] = []
    for lesson_id, answers in answers_by_lesson.items():
        # Tally (wrongOptionIndex, prompt) -> count.
        wrong_picks: dict[tuple[int, str], int] = defaultdict(int)
        sample_prompt: dict[tuple[int, str], str] = {}
        for ans in answers:
            if ans.get("correct"):
                continue
            history = ans.get("chosenOptionsHistory") or []
            if not history:
                continue
            pick = history[-1]
            prompt = ans.get("prompt", "")
            key = (pick, prompt)
            wrong_picks[key] += 1
            sample_prompt.setdefault(key, prompt)
        if not wrong_picks:
            continue
        # Find the most common wrong option.
        top_key, freq = max(wrong_picks.items(), key=lambda kv: kv[1])
        if freq < 2:
            continue
        lesson = lesson_lookup(lesson_id)
        out.append(
            {
                "lessonId": lesson_id,
                "lessonTitle": lesson.get("title") if lesson else None,
                "chapterName": lesson.get("chapterName") if lesson else None,
                "wrongOptionIndex": top_key[0],
                "frequency": freq,
                "samplePrompt": sample_prompt[top_key],
            }
        )
    return out


async def build_student_report(
    db,
    student_id: str,
    period: str,
) -> dict:
    """The full expanded report shape for a student (compact + deep fields)."""
    now = datetime.now(timezone.utc)
    if period == "week":
        since = now - __import__("datetime").timedelta(days=7)
    elif period == "month":
        since = now - __import__("datetime").timedelta(days=30)
    else:
        since = now - __import__("datetime").timedelta(days=365)
    since_iso = since.isoformat()

    student = await db.students.find_one({"_id": __import__("bson").ObjectId(student_id)})
    if student is None:
        return None  # type: ignore[return-value]

    # 1) Per-lesson aggregation: resolve quiz -> lesson, group attempts by lesson.
    attempts = await _completed_attempts(db, user_id=student_id, since_iso=since_iso)

    # Class average for the same range (per-student mean, then mean across
    # students — same math as build_class_report) so the student can see where
    # they stand against the room. Requires a second pass over all attempts.
    class_attempts = await _completed_attempts(db, since_iso=since_iso)
    by_student_scores: dict[str, list[float]] = defaultdict(list)
    for a in class_attempts:
        uid = a.get("userId", "")
        if uid:
            by_student_scores[uid].append(_attempt_percent(a))
    class_average = 0.0
    if by_student_scores:
        class_average = (
            sum(sum(v) / len(v) for v in by_student_scores.values())
            / len(by_student_scores)
        )

    # Preload the catalog in a handful of batched $in queries (a handful of
    # round-trips instead of N sequential find_one calls). Then all lookups
    # below are plain dict hits.
    quiz_map = await _fetch_by_ids(db, "quizzes", {str(a.get("quizId") or "") for a in attempts})
    lesson_map = await _fetch_by_ids(db, "lessons", {str(q.get("lessonId") or "") for q in quiz_map.values()})
    chapter_map = await _fetch_by_ids(db, "chapters", {str(l.get("chapterId") or "") for l in lesson_map.values()})
    question_map = await _fetch_by_ids(
        db,
        "questions",
        {str(ans.get("questionId") or "") for a in attempts for ans in (a.get("answers") or [])},
    )

    # Assigned-quiz lookup (ALL assigned, not just attempted ones) so the
    # "recommended next quiz" can point at an active quiz the student can
    # actually start, plus a per-quiz best-score map for headroom ordering.
    assigned_ids = {str(q) for q in (student.get("assignedQuizIds") or [])}
    assigned_quiz_map = await _fetch_by_ids(db, "quizzes", assigned_ids)
    quiz_best: dict[str, float] = {}
    for a in attempts:
        qid = a.get("quizId") or ""
        if qid:
            quiz_best[qid] = max(quiz_best.get(qid, 0.0), _attempt_percent(a))

    # Group attempts by lessonId, building chapter info per lesson.
    by_lesson: dict[str, list[dict]] = defaultdict(list)
    answers_by_lesson: dict[str, list[dict]] = defaultdict(list)
    latest_per_lesson: dict[str, dict[str, tuple[int, int]]] = defaultdict(dict)
    latest_per_quiz_global: dict[str, tuple[int, int]] = {}
    score_history: list[dict] = []
    per_chapter: dict[str, dict] = defaultdict(
        lambda: {"chapterId": "", "chapterName": "", "subject": "other", "attempts": 0, "correct": 0, "total": 0, "firstTryCorrectRate": 0.0, "mastery": "Needs practice", "trend": "flat", "_ftc": 0, "_ftcQ": 0, "_percs": [], "_latest_per_quiz": {}}
    )
    # Sort ascending by completedAt so the LAST seen attempt per quiz is the
    # most recent one — used to compute "latest-only" percent per chapter.
    attempts_sorted = sorted(
        attempts, key=lambda a: a.get("completedAt", "") or ""
    )

    for a in attempts_sorted:
        q = quiz_map.get(a.get("quizId") or "")
        if not q:
            continue
        lesson = lesson_map.get(q.get("lessonId") or "")
        if not lesson:
            continue
        chapter = chapter_map.get(lesson.get("chapterId") or "")
        chapter_id = chapter["id"] if chapter else ""
        lesson_id = lesson["id"]
        by_lesson[lesson_id].append(a)
        score_history.append(
            {"bucket": date_bucket(a.get("completedAt", ""), period), "percent": round(_attempt_percent(a) * 100, 1)}
        )
        # Per-chapter accumulation (cumulative across attempts — used for
        # attempt count, first-try-correct rate, trend, and per-chapter total
        # attempts).
        ch = per_chapter[chapter_id]
        ch["chapterId"] = chapter_id
        ch["chapterName"] = chapter.get("name", "Other") if chapter else "Other"
        ch["subject"] = chapter.get("subject", "other") if chapter else "other"
        ch["attempts"] += 1
        ch["correct"] += a.get("score", 0) or 0
        ch["total"] += a.get("total", 0) or 0
        ftc, ftcQ = _first_try_correct_count(a.get("answers", []))
        ch["_ftc"] += ftc
        ch["_ftcQ"] += ftcQ
        ch["_percs"].append(_attempt_percent(a))
        # Overwrite with the latest attempt's score/total for this quiz.
        quiz_id = str(a.get("quizId") or "")
        if quiz_id:
            ch["_latest_per_quiz"][quiz_id] = (
                a.get("score", 0) or 0,
                a.get("total", 0) or 0,
            )
            latest_per_lesson[lesson_id][quiz_id] = (
                a.get("score", 0) or 0,
                a.get("total", 0) or 0,
            )
            latest_per_quiz_global[quiz_id] = (
                a.get("score", 0) or 0,
                a.get("total", 0) or 0,
            )
        # Per-answer (for wrong-answer pattern detection)
        for ans in a.get("answers", []):
            ans2 = dict(ans)
            ans2["prompt"] = ""
            # Attach the question prompt from the preloaded map (used by the
            # wrong-answer pattern view) — no per-answer DB query.
            qdoc = question_map.get(ans.get("questionId") or "")
            if qdoc:
                ans2["prompt"] = qdoc.get("prompt", "")
            answers_by_lesson[lesson_id].append(ans2)

    # 2) Per-lesson summaries
    per_lesson: list[dict] = []
    for lesson_id, l_attempts in by_lesson.items():
        lesson = lesson_map.get(lesson_id)
        if not lesson:
            continue
        chapter = chapter_map.get(lesson.get("chapterId") or "")
        agg = _aggregate_lesson(l_attempts)
        ftc = agg["firstTryCorrectRate"]
        # Latest-only percent: average each quiz's most recent (score, total)
        # within this lesson — so the number reflects the student's latest
        # take per quiz, not all attempts.
        latest = latest_per_lesson.get(lesson_id, {}) or {}
        latest_correct = sum(s for s, _ in latest.values())
        latest_total = sum(t for _, t in latest.values())
        latest_percent = (latest_correct / latest_total) if latest_total else 0.0
        display_percent = (
            latest_percent * 100
            if latest
            else (l_attempts and sum(_attempt_percent(a) for a in l_attempts) / len(l_attempts) * 100 or 0.0)
        )
        agg_out = {
            "lessonId": lesson_id,
            "lessonTitle": lesson.get("title"),
            "chapterId": chapter["id"] if chapter else None,
            "chapterName": chapter.get("name") if chapter else None,
            "subject": chapter.get("subject", "other") if chapter else "other",
            **agg,
            "avgScore": round(display_percent, 1),
            "percent": round(display_percent, 1),
            "mastery": mastery_label(ftc, agg["attempts"]),
        }
        per_lesson.append(agg_out)

    per_lesson.sort(key=lambda l: (-(l["firstTryCorrectRate"] or 0), l["lessonTitle"] or ""))

    # 3) Per-chapter summaries (finalize accumulated fields)
    per_chapter_list: list[dict] = []
    for cid, ch in per_chapter.items():
        if not cid:
            continue
        ftc = (ch["_ftc"] / ch["_ftcQ"]) if ch["_ftcQ"] else 0.0
        # Latest-only percent: sum each quiz's most recent (score, total) and
        # divide. If the latest attempt is 2/2, the chapter counts that as 100%.
        latest = ch.get("_latest_per_quiz", {}) or {}
        latest_correct = sum(s for s, _ in latest.values())
        latest_total = sum(t for _, t in latest.values())
        latest_percent = (latest_correct / latest_total) if latest_total else 0.0
        # If we have no latest data (no attempts in this chapter), fall back
        # to the cumulative percent so the row still shows something.
        display_percent = (
            latest_percent * 100 if latest else (ch["correct"] / ch["total"] * 100 if ch["total"] else 0.0)
        )
        per_chapter_list.append({
            "chapterId": ch["chapterId"],
            "chapterName": ch["chapterName"],
            "subject": ch["subject"],
            "attempts": ch["attempts"],
            "correct": ch["correct"],
            "total": ch["total"],
            "percent": round(display_percent, 1),
            "firstTryCorrectRate": round(ftc, 4),
            "mastery": mastery_label(ftc, ch["attempts"]),
            "trend": trend_label(ch["_percs"]),
        })
    per_chapter_list.sort(key=lambda c: c["chapterName"])

    # 4) Overall header — average of each quiz's LATEST attempt (consistent
    # with the "By Chapter" / "By Lesson" latest-only views).
    latest_correct_global = sum(s for s, _ in latest_per_quiz_global.values())
    latest_total_global = sum(t for _, t in latest_per_quiz_global.values())
    overall_percent = (
        (latest_correct_global / latest_total_global) if latest_total_global else 0.0
    )
    first_try_total = 0
    first_try_questions = 0
    for a in attempts:
        ftc, ftcQ = _first_try_correct_count(a.get("answers", []))
        first_try_total += ftc
        first_try_questions += ftcQ
    first_try_rate = (first_try_total / first_try_questions) if first_try_questions else 0.0

    # 5) Streak (consecutive calendar days with at least one completed attempt)
    day_keys = set()
    for a in attempts:
        try:
            d = datetime.fromisoformat(a.get("completedAt", "").replace("Z", "+00:00"))
            day_keys.add(d.date().isoformat())
        except Exception:
            continue
    streak_days = 0
    completed_today = False
    best_streak_days = 0
    if day_keys:
        today = datetime.now(timezone.utc).date()
        completed_today = today.isoformat() in day_keys
        d = today
        # Count back from today while we keep finding attempts on that day.
        while d.isoformat() in day_keys:
            streak_days += 1
            d = d.fromordinal(d.toordinal() - 1)
        # Longest-ever run of consecutive days — powers the streak milestone
        # callout ("new 7-day milestone") and keeps the badge honest when the
        # current streak just reset.
        best_run = 0
        run = 0
        prev = None
        for day in sorted(day_keys):
            cur = datetime.fromisoformat(day).date()
            run = run + 1 if prev and (cur - prev).days == 1 else 1
            best_run = max(best_run, run)
            prev = cur
        best_streak_days = best_run

    # 6) Most-improved chapter: real two-window comparison (per addendum §1.5).
    # For each chapter, split its attempts in the selected range by completion
    # time into two halves and compute delta = avg(later) - avg(earlier), in
    # percent points. Require at least 2 attempts in EACH half — single-attempt
    # halves are noise and would let weakest/most-improved collide.
    most_improved = None
    most_improved_delta = None
    if per_chapter_list:
        best = None
        for ch in per_chapter_list:
            percs = list(ch.get("_percs", []))
            if len(percs) < 4:
                continue
            half = len(percs) // 2
            earlier = percs[:half]
            later = percs[half:]
            if len(earlier) < 2 or len(later) < 2:
                continue
            delta = (sum(later) / len(later) - sum(earlier) / len(earlier)) * 100
            if delta <= 0:
                continue
            if best is None or delta > best[0]:
                best = (delta, ch)
        if best is not None:
            most_improved = best[1]["chapterName"]
            most_improved_delta = round(best[0], 1)

    # 6b) Weakest chapter: lowest latest-only percent, attempts floor, and
    # must not be the same chapter picked as most-improved (per §1.5 — they
    # must be genuinely different logic / different fields, not collide).
    # If every chapter is at or above WEAKEST_MIN_PERCENT, suppress — calling
    # the chapter with the *least high* score "weakest" is misleading.
    weakest_chapter = None
    if per_chapter_list:
        candidates = [c for c in per_chapter_list if c.get("attempts", 0) >= 2]
        if not candidates:
            candidates = per_chapter_list
        if most_improved is not None:
            candidates = [c for c in candidates if c.get("chapterName") != most_improved]
        if candidates:
            pick = min(candidates, key=lambda c: c.get("percent", 0))
            if pick.get("percent", 0) < WEAKEST_MIN_PERCENT:
                weakest_chapter = pick

    # 6c) Weakest lesson + "recommended next quiz" (action lane). Pick the
    # lowest latest-only percent among attempted lessons, resolve an active
    # ASSIGNED quiz in that lesson (lowest best score first = most headroom).
    # Suppressed when every attempted lesson sits at/above WEAKEST_MIN_PERCENT.
    weakest_lesson: dict | None = None

    def _active_assigned_quiz(lesson_id: str) -> dict | None:
        candidates = []
        for qid in assigned_ids:
            q = assigned_quiz_map.get(qid)
            if q is None or q.get("status") != "active":
                continue
            if str(q.get("lessonId") or "") != lesson_id:
                continue
            candidates.append(q)
        if not candidates:
            return None
        # Unattempted quizzes (best 1.0) sort last; lowest attempted best first.
        candidates.sort(key=lambda q: quiz_best.get(str(q["id"]), 1.0))
        return candidates[0]

    if per_lesson:
        lesson_candidates = [l for l in per_lesson if l.get("attempts", 0) >= 1]
        if lesson_candidates:
            pick = min(
                lesson_candidates,
                key=lambda l: (l.get("percent", 0), l.get("firstTryCorrectRate", 0)),
            )
            if pick.get("percent", 0) < WEAKEST_MIN_PERCENT:
                rec = _active_assigned_quiz(pick["lessonId"])
                weakest_lesson = {
                    "lessonId": pick["lessonId"],
                    "lessonTitle": pick.get("lessonTitle"),
                    "chapterName": pick.get("chapterName"),
                    "percent": pick.get("percent", 0),
                    "attempts": pick.get("attempts", 0),
                    "firstTryCorrectRate": pick.get("firstTryCorrectRate", 0),
                    "recommendedQuizId": rec["id"] if rec else None,
                    "recommendedQuizTitle": rec.get("title") if rec else None,
                    "reason": f"lowest score this {period}",
                }

    # 6d) Overall trend magnitude — same two-window delta used for chapter
    # "most improved", applied to the whole range's attempt series.
    overall_percs = [_attempt_percent(a) for a in attempts]
    trend_delta = _two_window_delta(overall_percs)

    # 7) Recent activity (newest first): `history` carries every attempt in
    # range (powers "view all attempts"), `recent` stays capped for existing
    # consumers.
    history: list[dict] = []
    sorted_attempts = sorted(attempts, key=lambda a: a.get("completedAt", ""), reverse=True)

    def _attempt_entry(a: dict) -> dict:
        q = quiz_map.get(a.get("quizId") or "")
        lesson = lesson_map.get(q.get("lessonId") or "") if q else None
        chapter = chapter_map.get(lesson.get("chapterId") or "") if lesson else None
        return {
            "attemptId": str(a["_id"]),
            "quizId": a.get("quizId"),
            "quizTitle": q.get("title") if q else None,
            "lessonId": lesson.get("id") if lesson else None,
            "chapterName": chapter.get("name") if chapter else None,
            "lessonTitle": lesson.get("title") if lesson else None,
            "score": a.get("score", 0),
            "total": a.get("total", 0),
            "completedAt": a.get("completedAt"),
            "timeSpentSeconds": a.get("totalTimeSpentSeconds", 0.0) or 0.0,
            "firstTryCorrectCount": _first_try_correct_count(a.get("answers", []))[0],
        }

    history = [_attempt_entry(a) for a in sorted_attempts]
    recent = history[:10]

    return {
        "range": period,
        "attemptCount": len(attempts),
        "overallPercent": round(overall_percent * 100, 1),
        "firstTryCorrectRate": round(first_try_rate, 4),
        "trend": trend_label(overall_percs),
        "trendDeltaPercent": round(trend_delta, 1) if trend_delta is not None else None,
        "streakDays": streak_days,
        "completedToday": completed_today,
        "bestStreakDays": best_streak_days,
        "classAveragePercent": round(class_average * 100, 1),
        "passThreshold": PASS_THRESHOLD,
        "mostImprovedChapterName": most_improved,
        "mostImprovedDeltaPercent": most_improved_delta,
        "weakestChapterName": (weakest_chapter or {}).get("chapterName") if weakest_chapter else None,
        "weakestLesson": weakest_lesson,
        "perChapter": per_chapter_list,
        "perLesson": per_lesson,
        "scoreHistory": score_history,
        "recent": recent,
        "history": history,
    }


async def build_class_report(db, period: str) -> dict:
    """Class-wide aggregates for the teacher dashboard / reports.

    Includes per-student status flags (feeds the "needs attention" queue), a
    range-relative engagement drop-off, and a `vsPrevious` block so the
    dashboard can render deltas vs the preceding window in one request.
    """
    now = datetime.now(timezone.utc)
    days = _range_days(period)
    since = now - timedelta(days=days)
    since_iso = since.isoformat()
    prev_since_iso = (since - timedelta(days=days)).isoformat()

    # Students (scaffold incl. check-in marker for the action queue)
    students: list[dict] = []
    student_ids: list[str] = []
    async for s in db.students.find().sort("name", 1):
        sid = str(s["_id"])
        student_ids.append(sid)
        students.append(
            {
                "id": sid,
                "name": s["name"],
                "assignedCount": len(s.get("assignedQuizIds", [])),
                "attemptCount": 0,
                "completedAny": False,
                "averageScore": 0,
                "bestScore": 0,
                "firstTryCorrectRate": 0.0,
                "firstTryCorrectCount": 0,
                "firstTryQuestions": 0,
                "lastActiveAt": None,
                "status": "on_track",
                "overallPercent": 0,
                "trend": "steady",
                "checkedInAt": s.get("checkedInAt") or None,
            }
        )

    # Attempt windows: current + immediately previous (for trend deltas).
    all_attempts = await _completed_attempts(db, since_iso=since_iso)
    prev_attempts = await _completed_attempts(
        db, since_iso=prev_since_iso, until_iso=since_iso
    )

    # Preload the catalog ONCE, covering BOTH windows, with a few batched $in
    # queries — lookups below become synchronous dict hits.
    quiz_ids = {str(a.get("quizId") or "") for a in (*all_attempts, *prev_attempts)}
    quiz_map = await _fetch_by_ids(db, "quizzes", quiz_ids)
    lesson_map = await _fetch_by_ids(db, "lessons", {str(q.get("lessonId") or "") for q in quiz_map.values()})
    chapter_map = await _fetch_by_ids(db, "chapters", {str(l.get("chapterId") or "") for l in lesson_map.values()})

    sindex = {s["id"]: s for s in students}
    by_student: dict[str, list[dict]] = defaultdict(list)
    by_lesson: dict[str, list[dict]] = defaultdict(list)
    ftc_total = 0
    ftc_questions = 0
    for a in all_attempts:
        uid = a.get("userId", "")
        by_student[uid].append(a)
        q = quiz_map.get(a.get("quizId") or "")
        if q:
            lesson = lesson_map.get(q.get("lessonId") or "")
            if lesson:
                by_lesson[str(lesson["_id"])].append(a)
        ftc, ftcQ = _first_try_correct_count(a.get("answers", []))
        ftc_total += ftc
        ftc_questions += ftcQ

    # Per-student rollup (status + trend feed the dashboard action queue)
    for sid, atts in by_student.items():
        if sid not in sindex:
            continue
        s = sindex[sid]
        s["attemptCount"] = len(atts)
        s["completedAny"] = True
        scores = [_attempt_percent(a) for a in atts]
        s["averageScore"] = round(sum(scores) / len(scores) * 100) if scores else 0
        s["overallPercent"] = s["averageScore"]
        s["bestScore"] = round(max(scores) * 100) if scores else 0
        ftt = 0
        ftq = 0
        for a in atts:
            ft, fq = _first_try_correct_count(a.get("answers", []))
            ftt += ft
            ftq += fq
        s["firstTryCorrectRate"] = round((ftt / ftq) if ftq else 0.0, 4)
        s["firstTryCorrectCount"] = ftt
        s["firstTryQuestions"] = ftq
        s["lastActiveAt"] = max((a.get("completedAt") for a in atts if a.get("completedAt")), default=None)
        # Trend + flag from the student's chronological attempt series
        ordered = sorted(atts, key=lambda x: x.get("completedAt", "") or "")
        percs = [_attempt_percent(x) for x in ordered]
        s["trend"] = trend_label(percs)
        s["status"] = status_flag(percs[-3:], percs[-6:-3]) if percs else "on_track"
        # Recent attempts (newest first) so the dashboard can show notable ones
        # without expanding anything.
        recent: list[dict] = []
        for a in sorted(atts, key=lambda x: x.get("completedAt", ""), reverse=True)[:5]:
            q = quiz_map.get(a.get("quizId") or "")
            lesson = lesson_map.get(q.get("lessonId") or "") if q else None
            chapter = chapter_map.get(lesson.get("chapterId") or "") if lesson else None
            recent.append({
                "attemptId": str(a["_id"]),
                "quizId": a.get("quizId"),
                "quizTitle": q.get("title") if q else None,
                "lessonId": str(lesson["_id"]) if lesson else None,
                "lessonTitle": lesson.get("title") if lesson else None,
                "chapterName": chapter.get("name") if chapter else None,
                "score": a.get("score", 0),
                "total": a.get("total", 0),
                "completedAt": a.get("completedAt"),
                "timeSpentSeconds": a.get("totalTimeSpentSeconds", 0.0) or 0.0,
                "firstTryCorrectCount": _first_try_correct_count(a.get("answers", []))[0],
            })
        s["recent"] = recent

    total_students = len(students)
    attempted = sum(1 for s in students if s["attemptCount"] > 0)
    avg_all = round(sum(s["averageScore"] for s in students) / max(total_students, 1)) if total_students else 0
    completion_rate = round(attempted / max(total_students, 1) * 100) if total_students else 0
    first_try_rate_class = (ftc_total / ftc_questions) if ftc_questions else 0.0

    # Per-lesson difficulty ranking (worst first)
    per_lesson_difficulty: list[dict] = []
    for lid, atts in by_lesson.items():
        lesson = lesson_map.get(lid)
        if not lesson:
            continue
        chapter = chapter_map.get(lesson.get("chapterId") or "")
        agg = _aggregate_lesson(atts)
        per_lesson_difficulty.append({
            "lessonId": lid,
            "lessonTitle": lesson.get("title"),
            "chapterName": chapter.get("name") if chapter else None,
            "subject": chapter.get("subject", "other") if chapter else "other",
            "attempts": agg["attempts"],
            "avgScore": round(agg["avgScore"] * 100, 1),
            "firstTryCorrectRate": round(agg["firstTryCorrectRate"], 4),
            "firstTryCorrectRateLabel": mastery_label(agg["firstTryCorrectRate"], agg["attempts"]),
        })
    per_lesson_difficulty.sort(key=lambda l: (l["firstTryCorrectRate"], l["avgScore"]))

    # Engagement drop-off: active this period but quiet in its final quarter —
    # range-relative so the period selector scopes every card honestly.
    quarter = max(int(days / 4), 1)
    quiet_cutoff_iso = (now - timedelta(days=quarter)).isoformat()
    drop_off: list[dict] = []
    for s in students:
        last = s["lastActiveAt"]
        if not last:
            continue
        if last >= quiet_cutoff_iso:
            continue  # active in the final quarter
        try:
            d = datetime.fromisoformat(last.replace("Z", "+00:00"))
            days_since = (now - d).days
        except Exception:
            days_since = 0
        drop_off.append({"studentId": s["id"], "name": s["name"], "lastActiveAt": last, "daysSince": days_since})
    drop_off.sort(key=lambda d: -d["daysSince"])

    # Trend context: deltas vs the immediately-previous window of equal length.
    prev = _window_summary(
        prev_attempts,
        quiz_map=quiz_map,
        lesson_map=lesson_map,
        quiet_cutoff_iso=(since - timedelta(days=quarter)).isoformat(),
    )
    attention_count = sum(1 for s in students if s["status"] == "needs_attention")

    def _pd(cur: float, prev_val: float) -> float | None:
        if prev_val <= 0:
            return None
        return round((cur - prev_val) / prev_val * 100, 1)

    has_prev = prev["attempts"] > 0
    per_lesson_delta: dict[str, float] = {}
    for l in per_lesson_difficulty:
        prev_rate = prev["lessonRates"].get(l["lessonId"])
        if prev_rate is None:
            continue
        per_lesson_delta[l["lessonId"]] = round((l["firstTryCorrectRate"] - prev_rate) * 100, 1)

    vs_previous = {
        "hasPrevious": has_prev,
        "attemptsDeltaPct": _pd(len(all_attempts), prev["attempts"]),
        "firstTryDeltaPct": _pd(ftc_total, prev["firstTryCorrect"]),
        "questionsDeltaPct": _pd(ftc_questions, prev["firstTryQuestions"]),
        "avgScoreDeltaPts": round(avg_all - prev["avgScore"], 1) if has_prev else None,
        "activeStudentsDelta": attempted - prev["activeStudents"] if has_prev else None,
        "attentionCountDelta": attention_count - prev["attentionCount"] if has_prev else None,
        "quietCountDelta": len(drop_off) - prev["quietCount"] if has_prev else None,
        "perLesson": per_lesson_delta,
    }

    return {
        "totalStudents": total_students,
        "completionRate": completion_rate,
        "averageScore": avg_all,
        "firstTryCorrectRate": round(first_try_rate_class, 4),
        "students": students,
        "perLessonDifficulty": per_lesson_difficulty,
        "engagementDropOff": drop_off,
        "vsPrevious": vs_previous,
    }


async def build_class_matrix(db, period: str) -> dict:
    """Class-wide gradebook matrix: every student × every quiz, latest score.

    Returns the data structure the xlsx export needs:
      students     – sorted list of {id, name}
      chapters     – ordered chapter→lesson→quiz tree (for column grouping)
      matrix       – {student_id: {quiz_id: {percent, attemptCount, ...}}}
      column_avg   – {quiz_id: avg_percent_across_students}
      overall_avg  – {student_id: avg_across_attempted_quizzes}
    """
    now = datetime.now(timezone.utc)
    if period == "week":
        since = now - __import__("datetime").timedelta(days=7)
    elif period == "month":
        since = now - __import__("datetime").timedelta(days=30)
    else:
        since = now - __import__("datetime").timedelta(days=365)
    since_iso = since.isoformat()

    # 1. Collect all students (sorted by name).
    students = []
    async for s in db.students.find().sort("name", 1):
        students.append({"id": str(s["_id"]), "name": s["name"]})

    # 2. Build the chapter→lesson→quiz tree (order by chapter/lesson creation).
    chapter_tree: dict[str, dict] = {}
    async for ch in db.chapters.find().sort("order", 1):
        cid = str(ch["_id"])
        chapter_tree[cid] = {
            "id": cid,
            "name": ch.get("name", ""),
            "subject": ch.get("subject", "other"),
            "lessons": {},
        }

    async for les in db.lessons.find().sort("order", 1):
        cid = les.get("chapterId")
        if not cid:
            continue
        cid_str = str(cid) if hasattr(cid, "__str__") else str(cid)
        if cid_str not in chapter_tree:
            continue
        lid = str(les["_id"])
        chapter_tree[cid_str]["lessons"][lid] = {
            "id": lid,
            "title": les.get("title", ""),
            "quizzes": [],
        }

    async for qz in db.quizzes.find({"status": {"$ne": "archived"}}).sort("order", 1):
        lid = qz.get("lessonId")
        if not lid:
            continue
        lid_str = str(lid) if hasattr(lid, "__str__") else str(lid)
        for ch in chapter_tree.values():
            if lid_str in ch["lessons"]:
                qid = str(qz["_id"])
                ch["lessons"][lid_str]["quizzes"].append({
                    "id": qid,
                    "title": qz.get("title", ""),
                })
                break

    # Flatten chapter/lesson/quiz into ordered column list.
    ordered_quizzes: list[dict] = []  # {id, title, lessonTitle, chapterName, chapterId}
    chapter_col_spans: list[dict] = []  # {name, start, end, subject}
    col = 0
    for ch in chapter_tree.values():
        lesson_quizzes = []
        for les in ch["lessons"].values():
            for qz in les["quizzes"]:
                lesson_quizzes.append({
                    "id": qz["id"],
                    "title": qz["title"],
                    "lessonTitle": les["title"],
                    "chapterName": ch["name"],
                    "chapterId": ch["id"],
                    "subject": ch["subject"],
                })
                col += 1
        if lesson_quizzes:
            chapter_col_spans.append({
                "name": ch["name"],
                "subject": ch["subject"],
                "start": col - len(lesson_quizzes),
                "end": col - 1,
            })
        ordered_quizzes.extend(lesson_quizzes)

    # 3. For each attempt in range, compute percent and take latest per student×quiz.
    all_attempts = await _completed_attempts(db, since_iso=since_iso)
    matrix: dict[str, dict[str, dict]] = defaultdict(dict)
    for a in all_attempts:
        uid = a.get("userId", "")
        qid = a.get("quizId", "")
        if not uid or not qid:
            continue
        pct = _attempt_percent(a) * 100
        existing = matrix[uid].get(qid)
        # Keep the latest (highest completedAt wins).
        if existing is None or (a.get("completedAt", "") or "") > (existing.get("completedAt", "") or ""):
            matrix[uid][qid] = {
                "percent": round(pct, 1),
                "attemptCount": (existing["attemptCount"] if existing else 0) + 1,
                "completedAt": a.get("completedAt", ""),
                "score": a.get("score", 0),
                "total": a.get("total", 0),
            }

    # For quizzes attempted in range, add cumulative attempt counts.
    # Re-scan to count all attempts (not just latest).
    attempt_counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for a in all_attempts:
        uid = a.get("userId", "")
        qid = a.get("quizId", "")
        if uid and qid:
            attempt_counts[uid][qid] += 1
    for uid in matrix:
        for qid in matrix[uid]:
            matrix[uid][qid]["attemptCount"] = attempt_counts[uid][qid]

    # 4. Column averages (skip students who never attempted).
    column_avg: dict[str, float] = {}
    for qz in ordered_quizzes:
        scores = [
            matrix[sid][qz["id"]]["percent"]
            for sid in matrix
            if qz["id"] in matrix[sid]
        ]
        column_avg[qz["id"]] = round(sum(scores) / len(scores), 1) if scores else 0

    # 5. Per-student overall averages (across attempted quizzes only).
    overall_avg: dict[str, float] = {}
    for uid, qdata in matrix.items():
        if qdata:
            overall_avg[uid] = round(
                sum(v["percent"] for v in qdata.values()) / len(qdata), 1
            )

    return {
        "students": students,
        "chapters": chapter_col_spans,
        "quizzes": ordered_quizzes,
        "matrix": dict(matrix),
        "columnAvg": column_avg,
        "overallAvg": overall_avg,
    }
