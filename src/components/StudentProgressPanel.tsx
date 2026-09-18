import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { motion, AnimatePresence } from "motion/react"
import { useApp } from "../store/AppContext"
import { useIsCompact } from "../data/useIsCompact"
import { Students, type StudentReport } from "../api/client"
import ProgressRing from "./ProgressRing"
import { Sparkline } from "./Chart"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  ChevronRight,
  Clock,
  CheckCircle2,
  ArrowRight,
  Target,
} from "lucide-react"

interface DashboardData {
  report: StudentReport | null
  loading: boolean
  error: string | null
}

interface Props {
  studentId: string
}

// Module-level stale-while-revalidate cache: keeps the last fetched report
// per (student, range) so remounting the panel (returning to /quizzes,
// re-focusing the tab, finishing a quiz) paints instantly with the previous
// numbers while a background fetch revalidates. Cached values never go
// stale enough to matter — they're always refreshed on mount/tab-visible.
const reportCache = new Map<string, { report: StudentReport }>()

export default function StudentProgressPanel({ studentId }: Props) {
  const isCompact = useIsCompact()
  const navigate = useNavigate()
  const { chapters, lessons, quizzes, selectQuiz } = useApp()
  const [range, setRange] = useState<"week" | "month" | "year">("month")
  const [data, setData] = useState<DashboardData>({
    report: null,
    loading: true,
    error: null,
  })
  const [openAttempt, setOpenAttempt] = useState<string | null>(null)
  const [showAllRecent, setShowAllRecent] = useState(false)

  // One master "show all" toggle: the whole progress body (By Chapter / By
  // Lesson / Recent) expands together — not each section folding separately.
  // Hidden by default on every breakpoint for a minimal summary; the summary
  // header (ring, goals, streak, recommended quiz) stays pinned at the top.
  const [showAllProgress, setShowAllProgress] = useState(false)

  // ── Action lane: resolve a quiz from an insight and start it ──────────────
  const startQuiz = (quizId: string | null | undefined): boolean => {
    if (!quizId) return false
    const q = quizzes.find((x) => x.id === quizId)
    if (!q || q.status !== "active") return false
    selectQuiz(q.id)
    navigate(`/quiz/${q.id}/pre`)
    return true
  }

  // Prefer the attempted-lowest-scoring active quiz in a lesson (most headroom).
  const quizForLesson = (lessonId: string | null | undefined) => {
    if (!lessonId) return null
    const qs = quizzes
      .filter((q) => q.lessonId === lessonId && q.status === "active")
      .sort((a, b) => (a.bestScore ?? 101) - (b.bestScore ?? 101))
    return qs[0] ?? null
  }

  const quizForChapter = (chapterId: string | null | undefined) => {
    if (!chapterId) return null
    for (const l of lessons) {
      if (l.chapterId !== chapterId) continue
      const q = quizForLesson(l.id)
      if (q) return q
    }
    return null
  }

  const firstQuiz = () => {
    const active = quizzes.filter((q) => q.status === "active")
    if (active.length === 0) return null
    return [...active].sort(
      (a, b) => (a.bestScore ?? 101) - (b.bestScore ?? 101),
    )[0]
  }

  // Issue 8: scroll to + briefly flash the lesson group in the quiz list below.
  // window.scrollTo is more widely supported than scrollIntoView options, and
  // falls back to a dumb scroll when smooth isn't available.
  const selectVisible = (id: string) =>
    Array.from(document.querySelectorAll<HTMLElement>(`[id="${id}"]`)).find(
      (n) => n.offsetWidth || n.offsetHeight || n.getClientRects().length,
    )

  const scrollToLesson = (lessonId: string | null | undefined) => {
    if (!lessonId) return
    const el = selectVisible(`lesson-${lessonId}`)
    if (el) {
      const top = Math.max(
        window.scrollY +
          el.getBoundingClientRect().top -
          (window.innerHeight - el.getBoundingClientRect().height) / 2,
        0,
      )
      try {
        window.scrollTo({ top, behavior: "smooth" })
      } catch {
        window.scrollTo(0, top)
      }
      el.classList.add("progress-flash")
      window.setTimeout(() => el.classList.remove("progress-flash"), 1800)
    } else {
      // Lesson isn't on this page (no assigned quiz in the list) — head to the
      // quiz list header instead of silently doing nothing.
      selectVisible("quiz-list-anchor")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }

  const fetchReport = (showLoading = true) => {
    const key = `${studentId}:${range}`
    const cached = reportCache.get(key)
    // Stale-while-revalidate: if we already have numbers for this panel,
    // render them immediately and skip the "Loading your scores…" gate.
    // Subsequent refreshes (tab re-focus, return to /quizzes) also skip the
    // loading flash instead of blanking the panel.
    if (cached) {
      setData({ report: cached.report, loading: false, error: null })
    } else if (showLoading) {
      setData((d) => ({ ...d, loading: true }))
    }
    // Cache-bust so the dev server / browser doesn't serve a stale report
    // when the student returns to /quizzes right after completing a quiz.
    Students.report(studentId, range)
      .then((r) => {
        reportCache.set(key, { report: r })
        setData({ report: r, loading: false, error: null })
      })
      .catch((e) => {
        if (cached) {
          // Refresh failed but we have a previous snapshot — keep showing it
          // rather than replacing the panel with an error banner.
          setData({ report: cached.report, loading: false, error: null })
        } else {
          setData({ report: null, loading: false, error: (e as Error).message })
        }
      })
  }

  useEffect(() => {
    fetchReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, range])

  // Also refetch whenever the tab becomes visible again — covers the
  // "completed a quiz, came back to /quizzes" path where the panel was
  // never unmounted but the data is now stale.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchReport()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, range])

  if (data.loading) {
    return (
      <PanelShell>
        <div
          className="py-10 text-center"
          style={{ color: "var(--color-ink-muted)" }}
        >
          Loading your scores…
        </div>
      </PanelShell>
    )
  }

  if (data.error || !data.report) {
    return (
      <PanelShell>
        <div
          className="py-10 text-center"
          style={{ color: "var(--color-ink-muted)" }}
        >
          {data.error ?? "No progress yet."}
        </div>
      </PanelShell>
    )
  }

  const report = data.report
  const {
    overallPercent,
    attemptCount,
    trend,
    trendDeltaPercent,
    streakDays,
    completedToday,
    mostImprovedChapterName,
    mostImprovedDeltaPercent,
    weakestLesson,
    perChapter,
    perLesson,
    scoreHistory,
    history,
  } = report

  // Recent list draws from the full history (newest first); `recent` stays as
  // the capped shape for backward compatibility.
  const attemptList = history

  // ── Streak with stakes (issue 4) ──
  const streakMilestone =
    streakDays > 0 && streakDays % 7 === 0 && streakDays >= 7
  const streakAtRisk = streakDays > 0 && !completedToday

  const handleStreak = () => {
    if (
      weakestLesson?.recommendedQuizId &&
      startQuiz(weakestLesson.recommendedQuizId)
    )
      return
    const fq = firstQuiz()
    if (fq && startQuiz(fq.id)) return
    if (weakestLesson?.lessonId) scrollToLesson(weakestLesson.lessonId)
  }

  const recommendedQuiz = weakestLesson?.recommendedQuizId
    ? (quizzes.find((q) => q.id === weakestLesson.recommendedQuizId) ?? null)
    : null
  const recommendedActive =
    !!recommendedQuiz && recommendedQuiz.status === "active"

  const mostImprovedChapterQuiz = mostImprovedChapterName
    ? (() => {
        const ch = chapters.find((c) => c.name === mostImprovedChapterName)
        return ch ? quizForChapter(ch.id) : null
      })()
    : null

  const isWeak = (percent: number, mastery: string) =>
    percent < 60 || mastery === "Needs practice"

  return (
    <PanelShell>
      {/* Range control — inline segmented control, full width on mobile, right-aligned on desktop */}
      <div className="mb-5 flex md:justify-end">
        <RangePicker value={range} onChange={setRange} compact={isCompact} />
      </div>

      {/* Header strip */}
      <div className="flex flex-col items-center gap-5 mb-5 md:flex-row md:items-center">
        <ProgressRing
          score={Math.round(overallPercent)}
          total={100}
          size={132}
          animate
          showTotal={false}
        />
        <div className="flex flex-col items-center gap-1 md:items-start">
          <p
            className="text-3xl font-900 leading-none"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-ink)",
            }}
          >
            Overall
          </p>
          <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
            last {range}
          </p>
          <div className="flex items-center justify-center gap-2 mt-1 md:justify-start flex-wrap">
            <TrendIndicator trend={trend} delta={trendDeltaPercent} />
            {streakDays > 0 &&
              (streakAtRisk || streakMilestone ? (
                <button
                  onClick={handleStreak}
                  className="text-xs flex items-center gap-1"
                  title={
                    streakMilestone
                      ? "New milestone — keep the run alive"
                      : "Complete a quiz today to keep your streak"
                  }
                  style={{
                    color: "var(--color-amber-dark)",
                    fontFamily: "var(--font-body)",
                    background: "none",
                    border: "1px solid var(--color-amber-dark)",
                    padding: "2px 6px",
                    cursor:
                      streakAtRisk || streakMilestone ? "pointer" : "default",
                  }}
                >
                  <Flame size={11} style={{ color: "var(--color-amber)" }} />
                  {streakDays}-day streak
                  {streakMilestone
                    ? " · new milestone"
                    : streakAtRisk
                      ? " · 1 quiz today keeps it"
                      : ""}
                </button>
              ) : (
                <span
                  className="text-xs flex items-center gap-1"
                  style={{
                    color: "var(--color-amber-dark)",
                    fontFamily: "var(--font-body)",
                  }}
                  title="Consecutive days with a completed quiz"
                >
                  <Flame size={11} style={{ color: "var(--color-amber)" }} />
                  {streakDays}-day streak
                </span>
              ))}
          </div>
        </div>
        {!isCompact && scoreHistory.length >= 2 && (
          <div className="ml-auto" style={{ width: 110 }}>
            <Sparkline
              points={scoreHistory.map((p) => p.percent)}
              color="var(--color-ember)"
              height={36}
            />
          </div>
        )}
      </div>

      {/* Recommended next quiz — featured action card (issues 2 & 5) */}
      {weakestLesson && (
        <div
          className="mb-5 p-4"
          style={{
            background: "var(--color-cream)",
            border: "2px solid var(--color-cream-dark)",
            boxShadow: "4px 4px 0 var(--color-ink)",
          }}
        >
          <div
            className="flex items-center gap-1.5 mb-1"
            style={{ color: "var(--color-ember-dark)" }}
          >
            <Target size={12} style={{ flexShrink: 0 }} />
            <span
              className="text-[10px] font-700 uppercase tracking-wider"
              style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}
            >
              Recommended next
            </span>
          </div>
          <p
            className="text-sm font-700 mb-1"
            style={{ fontFamily: "var(--font-body)", color: "var(--color-ink)" }}
          >
            {weakestLesson.lessonTitle ?? "Your weakest area"}
            <span
              style={{
                color: "var(--color-ember-dark)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {" · "}
              {Math.round(weakestLesson.percent)}%
            </span>
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {recommendedActive && (
              <button
                type="button"
                onClick={() => startQuiz(weakestLesson.recommendedQuizId)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-700"
                style={{
                  background: "var(--color-ember)",
                  color: "#fff",
                  border: "2px solid var(--color-ink)",
                  boxShadow: "2px 2px 0 var(--color-ink)",
                  fontFamily: "var(--font-display)",
                  cursor: "pointer",
                }}
              >
                Start quiz <ArrowRight size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() => scrollToLesson(weakestLesson.lessonId)}
              className="px-3 py-2 text-xs font-600"
              style={{
                background: "transparent",
                color: "var(--color-ink-light)",
                border: "2px solid var(--color-ink-muted)",
                fontFamily: "var(--font-body)",
                cursor: "pointer",
              }}
            >
              See it in my list
            </button>
          </div>
        </div>
      )}

      {/* First-move card — new student, nothing graded yet (issue 7) */}
      {!weakestLesson && attemptCount === 0 && firstQuiz() && (
        <div
          className="mb-5 p-4"
          style={{
            background: "var(--color-ink)",
            border: "2px solid var(--color-ink)",
            boxShadow: "4px 4px 0 var(--color-ember)",
          }}
        >
          <p
            className="text-sm font-700 mb-1"
            style={{ fontFamily: "var(--font-body)", color: "#fff" }}
          >
            Your first quiz awaits
          </p>
          <p
            className="text-xs mb-3"
            style={{
              color: "rgba(255,255,255,0.6)",
              fontFamily: "var(--font-body)",
            }}
          >
            Nothing graded yet — taking a quiz today sets your starting score
            and starts your streak.
          </p>
          <button
            onClick={() => {
              const fq = firstQuiz()
              if (fq) startQuiz(fq.id)
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-700"
            style={{
              background: "var(--color-ember)",
              color: "#fff",
              border: "2px solid var(--color-ink)",
              boxShadow: "2px 2px 0 var(--color-ink)",
              fontFamily: "var(--font-display)",
              cursor: "pointer",
            }}
          >
            Take your first quiz <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Most-improved — congrats plus a "keep it up" action (issue 2) */}
      {mostImprovedChapterName && (
        <div
          className="mb-4 px-3 py-2 text-xs flex items-center justify-between gap-2 flex-wrap"
          style={{
            background: "var(--color-cream)",
            border: "1px solid var(--color-cream-dark)",
            borderLeft: "3px solid var(--color-ember)",
            color: "var(--color-ink-light)",
            fontFamily: "var(--font-body)",
          }}
        >
          <span className="flex items-center gap-2">
            <TrendingUp size={12} style={{ color: "var(--color-ember)" }} />
            Most-improved this period:{" "}
            <strong>{mostImprovedChapterName}</strong>
            {mostImprovedDeltaPercent != null && (
              <>
                {" · "}
                <span
                  style={{
                    color: "var(--color-teal-dark)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  +{Math.round(mostImprovedDeltaPercent)} pts
                </span>
              </>
            )}
          </span>
          {mostImprovedChapterQuiz && (
            <button
              onClick={() => startQuiz(mostImprovedChapterQuiz.id)}
              className="flex items-center gap-1 text-[11px] font-700 px-2 py-1"
              style={{
                background: "var(--color-teal-dark)",
                color: "#fff",
                border: "1px solid var(--color-teal-dark)",
                fontFamily: "var(--font-body)",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Keep it up <ChevronRight size={11} />
            </button>
          )}
        </div>
      )}

      <ShowAllDisclosure
        open={showAllProgress}
        onToggle={() => setShowAllProgress((v) => !v)}
      >
        <SectionHeader>By Chapter</SectionHeader>
        {perChapter.length === 0 ? (
          <EmptyWithAction
            text="No chapter scores in this range."
            onTryWeek={range !== "week" ? () => setRange("week") : undefined}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {perChapter.map((c, i) => {
              const q = quizForChapter(c.chapterId)
              return (
                <motion.li
                  key={c.chapterId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ChapterRow
                    compact={isCompact}
                    chapterName={c.chapterName}
                    subject={c.subject}
                    percent={c.percent}
                    attempts={c.attempts}
                    mastery={c.mastery}
                    trend={c.trend}
                    actionable={isWeak(c.percent, c.mastery) && !!q}
                    onPractice={q ? () => startQuiz(q.id) : undefined}
                  />
                </motion.li>
              )
            })}
          </ul>
        )}
        <SectionHeader>By Lesson</SectionHeader>
        {perLesson.length === 0 ? (
          <EmptyWithAction
            text="No lesson scores in this range."
            onTryWeek={range !== "week" ? () => setRange("week") : undefined}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {perLesson.map((l, i) => {
              const q = quizForLesson(l.lessonId)
              return (
                <motion.li
                  key={l.lessonId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <LessonRow
                    compact={isCompact}
                    lessonTitle={l.lessonTitle}
                    chapterName={l.chapterName}
                    percent={l.percent}
                    attempts={l.attempts}
                    mastery={l.mastery}
                    trend={l.trend}
                    actionable={isWeak(l.percent, l.mastery) && !!q}
                    onPractice={q ? () => startQuiz(q.id) : undefined}
                  />
                </motion.li>
              )
            })}
          </ul>
        )}
        <SectionHeader>Recent</SectionHeader>
        {attemptList.length === 0 ? (
          <div className="flex flex-col gap-2 items-start">
            <Empty>Finish a quiz to see it here.</Empty>
            {firstQuiz() && (
              <button
                onClick={() => {
                  const fq = firstQuiz()
                  if (fq) startQuiz(fq.id)
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-700"
                style={{
                  background: "var(--color-ember)",
                  color: "#fff",
                  border: "2px solid var(--color-ink)",
                  boxShadow: "2px 2px 0 var(--color-ink)",
                  fontFamily: "var(--font-display)",
                  cursor: "pointer",
                }}
              >
                Take a quiz <ArrowRight size={14} />
              </button>
            )}
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-1.5">
              {attemptList.slice(0, showAllRecent ? undefined : 5).map((r, i) => {
                const pct =
                  r.total === 0 ? 0 : Math.round((r.score / r.total) * 100)
                const isOpen = openAttempt === r.attemptId
                const canRetake =
                  !!r.quizId &&
                  quizzes.some(
                    (q) => q.id === r.quizId && q.status === "active",
                  )
                return (
                  <motion.li
                    key={r.attemptId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      background: "var(--color-cream-dark)",
                      borderLeft: `3px solid ${accentColor(pct)}`,
                    }}
                  >
                    {/* Collapsed row */}
                    <button
                      onClick={() =>
                        setOpenAttempt(isOpen ? null : r.attemptId)
                      }
                      className="w-full flex items-center justify-between gap-3 text-xs py-2 px-2.5"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-ink)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <ChevronRight
                          size={12}
                          style={{
                            color: "var(--color-ink-muted)",
                            transform: isOpen ? "rotate(90deg)" : "none",
                            transition: "transform 0.15s",
                            flexShrink: 0,
                          }}
                        />
                        <span className="truncate">
                          {r.quizTitle ?? r.quizId}
                        </span>
                      </span>
                      <span
                        style={{
                          color: accentColor(pct),
                          fontFamily: "var(--font-mono)",
                          flexShrink: 0,
                        }}
                      >
                        {r.score}/{r.total}
                      </span>
                    </button>

                    {/* Expanded detail */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          className="px-2.5 pb-2.5 flex flex-col gap-1.5"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: "easeInOut" }}
                          style={{ borderTop: "1px solid rgba(140,112,96,0.25)", overflow: "hidden" }}
                        >
                        <div
                          className="flex items-center justify-between gap-2 py-1.5 px-2 text-xs"
                          style={{
                            background: "white",
                            border: "1px solid var(--color-cream-dark)",
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            {r.lessonTitle && (
                              <span
                                style={{
                                  color: "var(--color-ink)",
                                  fontFamily: "var(--font-body)",
                                }}
                              >
                                {r.lessonTitle}
                              </span>
                            )}
                            {r.chapterName && (
                              <span
                                className="text-[10px]"
                                style={{
                                  color: "var(--color-ink-muted)",
                                  fontFamily: "var(--font-body)",
                                }}
                              >
                                · {r.chapterName}
                              </span>
                            )}
                          </div>
                          {r.lessonId && (
                            <button
                              onClick={() => scrollToLesson(r.lessonId)}
                              className="text-[10px] font-600 underline"
                              style={{
                                color: "var(--color-ember-dark)",
                                fontFamily: "var(--font-body)",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                flexShrink: 0,
                              }}
                            >
                              See in list
                            </button>
                          )}
                        </div>
                        <div
                          className="flex flex-wrap items-center gap-x-4 gap-y-1 py-1.5 px-2 text-[11px]"
                          style={{
                            background: "white",
                            border: "1px solid var(--color-cream-dark)",
                          }}
                        >
                          <span
                            className="flex items-center gap-1"
                            style={{
                              color: "var(--color-ink)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {r.score}/{r.total} correct
                          </span>
                          <span
                            className="flex items-center gap-1"
                            style={{
                              color: "var(--color-ink-muted)",
                              fontFamily: "var(--font-body)",
                            }}
                          >
                            <CheckCircle2 size={11} /> {r.firstTryCorrectCount}{" "}
                            solved first try
                          </span>
                          <span
                            className="flex items-center gap-1"
                            style={{
                              color: "var(--color-ink-muted)",
                              fontFamily: "var(--font-body)",
                            }}
                          >
                            <Clock size={11} />{" "}
                            {formatDuration(r.timeSpentSeconds)}
                          </span>
                          <span
                            style={{
                              color: "var(--color-ink-muted)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {new Date(r.completedAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                          {canRetake && (
                            <button
                              onClick={() => startQuiz(r.quizId)}
                              className="ml-auto flex items-center gap-1 text-[10px] font-700 px-2 py-1"
                              style={{
                                background: "var(--color-teal-dark)",
                                color: "#fff",
                                border: "1px solid var(--color-teal-dark)",
                                fontFamily: "var(--font-body)",
                                cursor: "pointer",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              Retake <ChevronRight size={10} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                    </AnimatePresence>
                  </motion.li>
                )
              })}
            </ul>
            {attemptList.length > 5 && (
              <button
                onClick={() => setShowAllRecent((v) => !v)}
                className="w-full text-center text-[11px] font-600 py-2 mt-1"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                  background: "var(--color-cream)",
                  border: "1px solid var(--color-cream-dark)",
                  cursor: "pointer",
                }}
              >
                {showAllRecent
                  ? "Show fewer"
                  : `View all attempts (${attemptList.length})`}
              </button>
            )}
          </>
        )}
      </ShowAllDisclosure>
    </PanelShell>
  )
}

// Range control — week / month / year. Full width on compact (mobile), compact
// inline on desktop. Lives inside the panel so both breakpoints have control
// (previously it only rendered next to the desktop heading).
function RangePicker({
  value,
  onChange,
  compact,
}: {
  value: "week" | "month" | "year"
  onChange: (v: "week" | "month" | "year") => void
  compact?: boolean
}) {
  const opts: ("week" | "month" | "year")[] = ["week", "month", "year"]
  return (
    <div
      className={compact ? "flex text-xs w-full" : "flex text-xs"}
      style={{ border: "1px solid var(--color-cream-dark)" }}
    >
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={compact ? "flex-1 px-3 py-1.5" : "px-3 py-1.5"}
          style={{
            background: value === o ? "var(--color-ink)" : "transparent",
            color:
              value === o ? "var(--color-cream)" : "var(--color-ink-muted)",
            fontFamily: "var(--font-body)",
            border: "none",
            cursor: "pointer",
            textTransform: "capitalize",
          }}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

function PanelShell({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  const isCompact = useIsCompact()
  return (
    <section
      className={isCompact ? "p-3" : "p-6"}
      style={{
        background: "white",
        border: "2px solid var(--color-cream-dark)",
      }}
    >
      {title && (
        <h2
          className="text-base font-700 mb-4"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-ink)",
          }}
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

// Master "show all" toggle — expands/collapses the whole progress body (By
// Chapter / By Lesson / Recent) in one tap instead of per section.
function ShowAllDisclosure({
  open,
  onToggle,
  children,
}: {
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className="mt-5">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 pt-3"
        style={{
          background: "none",
          border: "none",
          borderTop: "1px solid var(--color-cream-dark)",
          cursor: "pointer",
        }}
      >
        <span
          className="text-xs font-700 uppercase tracking-wider"
          style={{
            color: open ? "var(--color-ink)" : "var(--color-ink-muted)",
            fontFamily: "var(--font-body)",
            letterSpacing: "0.1em",
          }}
        >
          {open ? "Hide all progress" : "Show all progress"}
        </span>
        <ChevronRight
          size={14}
          style={{
            color: "var(--color-ink-muted)",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="mt-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-xs font-600 uppercase tracking-wider mt-4 mb-2"
      style={{
        color: "var(--color-ink-muted)",
        fontFamily: "var(--font-body)",
        letterSpacing: "0.1em",
      }}
    >
      {children}
    </h3>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs italic"
      style={{
        color: "var(--color-ink-muted)",
        fontFamily: "var(--font-body)",
      }}
    >
      {children}
    </p>
  )
}

// Empty state with a direct next step: jump the range control to "week" when
// the student is looking at a wider, empty window (issue 7).
function EmptyWithAction({
  text,
  onTryWeek,
}: {
  text: string
  onTryWeek?: () => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Empty>{text}</Empty>
      {onTryWeek && (
        <button
          onClick={onTryWeek}
          className="text-[11px] font-600 underline"
          style={{
            color: "var(--color-ember-dark)",
            fontFamily: "var(--font-body)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Try this week
        </button>
      )}
    </div>
  )
}

// Big-number percent tile with a slim matching progress bar. Gives each row a
// stable visual anchor so the stats never float mid-sentence.
function PercentTile({ percent }: { percent: number }) {
  const color = accentColor(percent)
  const pct = Math.max(0, Math.min(100, percent))
  return (
    <div
      className="w-16 flex-shrink-0 flex flex-col items-center gap-1 px-1 py-2"
      style={{
        background: `${color}14`,
        border: `1px solid ${color}45`,
      }}
    >
      <span
        className="text-lg font-700 leading-none"
        style={{ color, fontFamily: "var(--font-mono)" }}
      >
        {Math.round(pct)}%
      </span>
      <div className="w-full h-1.5" style={{ background: `${color}2B` }}>
        <div
          className="h-full"
          style={{ width: `${pct}%`, background: color, transition: "width 0.8s ease" }}
        />
      </div>
    </div>
  )
}

function ChapterRow({
  compact,
  chapterName,
  subject,
  percent,
  attempts,
  mastery,
  trend,
  actionable,
  onPractice,
}: {
  compact?: boolean
  chapterName: string
  subject: "math" | "physics" | "other"
  percent: number
  attempts: number
  mastery: "Strong" | "Getting there" | "Needs practice"
  trend: "improving" | "declining" | "steady"
  actionable?: boolean
  onPractice?: () => void
}) {
  void subject
  return (
    <div
      className="flex items-center gap-3 p-3"
      style={{ background: "white", border: "1px solid var(--color-cream-dark)" }}
    >
      <PercentTile percent={percent} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-sm font-600 truncate min-w-0"
            style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}
          >
            {chapterName}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {!compact && <MasteryPill label={mastery} />}
          <span
            className="text-[10px] flex items-center gap-0.5"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}
          >
            {attempts} attempt{attempts === 1 ? "" : "s"}
            <TrendIcon trend={trend} />
          </span>
        </div>
      </div>
      {actionable && onPractice && (
        <button
          onClick={onPractice}
          className="flex items-center gap-0.5 text-[11px] font-700 px-2.5 py-1.5 flex-shrink-0"
          style={{
            background: "var(--color-ember)",
            color: "#fff",
            border: "1px solid var(--color-ember-dark)",
            fontFamily: "var(--font-body)",
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Practice <ChevronRight size={11} />
        </button>
      )}
    </div>
  )
}

function LessonRow({
  compact,
  lessonTitle,
  chapterName,
  percent,
  attempts,
  mastery,
  trend,
  actionable,
  onPractice,
}: {
  compact?: boolean
  lessonTitle: string
  chapterName: string | null
  percent: number
  attempts: number
  mastery: "Strong" | "Getting there" | "Needs practice"
  trend: "improving" | "declining" | "steady"
  actionable?: boolean
  onPractice?: () => void
}) {
  return (
    <div
      className="flex items-center gap-3 p-3"
      style={{ background: "white", border: "1px solid var(--color-cream-dark)" }}
    >
      <PercentTile percent={percent} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-sm font-600 truncate"
            style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}
          >
            {lessonTitle}
          </span>
          {chapterName && (
            <span
              className="text-[10px] px-1.5 py-0.5 truncate"
              style={{
                background: "var(--color-cream)",
                border: "1px solid var(--color-cream-dark)",
                color: "var(--color-ink-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {chapterName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {!compact && <MasteryPill label={mastery} />}
          <span
            className="text-[10px] flex items-center gap-0.5"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}
          >
            {attempts} attempt{attempts === 1 ? "" : "s"}
            <TrendIcon trend={trend} />
          </span>
        </div>
      </div>
      {actionable && onPractice && (
        <button
          onClick={onPractice}
          className="flex items-center gap-0.5 text-[11px] font-700 px-2.5 py-1.5 flex-shrink-0"
          style={{
            background: "var(--color-ember)",
            color: "#fff",
            border: "1px solid var(--color-ember-dark)",
            fontFamily: "var(--font-body)",
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Practice <ChevronRight size={11} />
        </button>
      )}
    </div>
  )
}

function MasteryPill({
  label,
}: {
  label: "Strong" | "Getting there" | "Needs practice"
}) {
  // Per §6 — tone/shade variation within the ember accent, never traffic-light.
  const tone =
    label === "Strong"
      ? { bg: "#A83A12", text: "#FFF" }
      : label === "Getting there"
        ? { bg: "#E47A55", text: "#1C0F00" }
        : { bg: "#F0C7B5", text: "#4A3520" }
  return (
    <span
      className="text-[10px] font-700 px-2 py-0.5"
      style={{
        background: tone.bg,
        color: tone.text,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </span>
  )
}

function TrendIndicator({
  trend,
  delta,
}: {
  trend: "improving" | "declining" | "steady"
  delta?: number | null
}) {
  const magnitude =
    delta != null && Math.abs(delta) >= 0.5
      ? `${delta >= 0 ? "+" : ""}${Math.round(delta)}`
      : ""
  if (trend === "improving")
    return (
      <span
        className="flex items-center gap-1"
        style={{ color: "var(--color-ember-dark)" }}
      >
        <TrendingUp size={11} /> improving{magnitude && ` ${magnitude}`}
      </span>
    )
  if (trend === "declining")
    return (
      <span
        className="flex items-center gap-1"
        style={{ color: "var(--color-ink-muted)" }}
      >
        <TrendingDown size={11} /> slipping{magnitude && ` ${magnitude}`}
      </span>
    )
  return (
    <span
      className="flex items-center gap-1"
      style={{ color: "var(--color-ink-muted)" }}
    >
      <Minus size={11} /> steady{magnitude && ` ${magnitude}`}
    </span>
  )
}

function TrendIcon({ trend }: { trend: "improving" | "declining" | "steady" }) {
  const Icon =
    trend === "improving"
      ? TrendingUp
      : trend === "declining"
        ? TrendingDown
        : Minus
  return <Icon size={10} style={{ marginLeft: 2 }} />
}

// Three-tier color hint: orange (needs work) → amber/yellow (okay) → teal
// (strong). All three are already in the brand palette so the bar/ring
// never reads as a harsh red/yellow/green traffic light.
export function accentColor(percent: number): string {
  if (percent >= 80) return "#0D6E6E" // teal — strong
  if (percent >= 60) return "#F0A500" // amber — okay
  return "#D94F1E" // orange — needs work
}

function formatDuration(seconds: number): string {
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r > 0 ? `${m}m ${r}s` : `${m}m`
}
