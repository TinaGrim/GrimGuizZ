import { useEffect } from "react"
import { useNavigate, Link } from "react-router"
import { useApp } from "../store/AppContext"
import {
  CheckCircle,
  Clock,
  Lock,
  MessageSquare,
  LogOut,
  ChevronRight,
  Star,
  User,
} from "lucide-react"

const STATUS_CONFIG = {
  active: {
    label: "Available",
    color: "var(--color-teal)",
    bg: "#E6F5F5",
    icon: null,
  },
  scheduled: {
    label: "Upcoming",
    color: "var(--color-amber-dark)",
    bg: "#FFF8E6",
    icon: Lock,
  },
  draft: {
    label: "Draft",
    color: "var(--color-ink-muted)",
    bg: "var(--color-cream-dark)",
    icon: Lock,
  },
  closed: {
    label: "Closed",
    color: "var(--color-ink-muted)",
    bg: "var(--color-cream-dark)",
    icon: null,
  },
}

export default function StudentQuizList() {
  const navigate = useNavigate()
  const {
    currentStudent,
    logoutStudent,
    chapters,
    lessons,
    getQuizzesForStudent,
    getAttemptsForStudent,
    getBestScoreForQuiz,
    selectQuiz,
  } = useApp()

  useEffect(() => {
    if (!currentStudent) navigate("/")
  }, [currentStudent, navigate])

  if (!currentStudent) return null

  const assignedQuizzes = getQuizzesForStudent(currentStudent.id)
  const studentAttempts = getAttemptsForStudent(currentStudent.id)

  const handleSelectQuiz = (quizId: string, status: string) => {
    if (status !== "active") return
    selectQuiz(quizId)
    navigate(`/quiz/${quizId}/pre`)
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream)" }}>
      {/* Nav bar */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-6 py-4"
        style={{
          background: "var(--color-ink)",
          borderBottom: "2px solid var(--color-ember)",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-xl font-900"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-amber)",
            }}
          >
            QuizZ
          </span>
          <span
            className="text-sm px-2 py-0.5"
            style={{
              background: "rgba(240,165,0,0.15)",
              color: "var(--color-amber)",
              border: "1px solid rgba(240,165,0,0.3)",
              fontFamily: "var(--font-body)",
            }}
          >
            {currentStudent.name}
          </span>
        </div>
        <button
          onClick={() => {
            logoutStudent()
            navigate("/")
          }}
          className="flex items-center gap-1.5 text-sm font-500"
          style={{
            color: "rgba(255,255,255,0.4)",
            fontFamily: "var(--font-body)",
            cursor: "pointer",
            background: "none",
            border: "none",
          }}
        >
          <LogOut size={14} />
          Leave
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Two-column layout: left progress sidebar, right main */}
        <div className="flex flex-col lg:flex-row gap-10">
          {/* ░░ Left sidebar — student progress ░░ */}
          <aside className="lg:w-72 lg:shrink-0">
            <div
              className="p-6 lg:sticky lg:top-24"
              style={{
                background: "var(--color-ink)",
                border: "2px solid var(--color-amber)",
                boxShadow: "6px 6px 0 var(--color-amber-dark)",
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="flex items-center justify-center text-lg font-900"
                  style={{
                    width: 46,
                    height: 46,
                    background: "var(--color-ember)",
                    color: "#fff",
                    fontFamily: "var(--font-display)",
                    borderRadius: "50%",
                    flexShrink: 0,
                  }}
                >
                  {currentStudent.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p
                    className="font-700 text-base truncate"
                    style={{ fontFamily: "var(--font-display)", color: "#fff" }}
                  >
                    {currentStudent.name}
                  </p>
                  <p
                    className="text-xs"
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    Joined {currentStudent.createdAt}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <p
                    className="text-[10px] font-600 uppercase tracking-widest mb-2"
                    style={{
                      color: "var(--color-amber)",
                      fontFamily: "var(--font-body)",
                      letterSpacing: "0.15em",
                    }}
                  >
                    Attempts
                  </p>
                  <p
                    className="text-3xl font-900 leading-none"
                    style={{ fontFamily: "var(--font-display)", color: "#fff" }}
                  >
                    {studentAttempts.length}
                  </p>
                </div>

                <div>
                  <p
                    className="text-[10px] font-600 uppercase tracking-widest mb-2"
                    style={{
                      color: "var(--color-amber)",
                      fontFamily: "var(--font-body)",
                      letterSpacing: "0.15em",
                    }}
                  >
                    Average Score
                  </p>
                  <p
                    className="text-3xl font-900 leading-none"
                    style={{ fontFamily: "var(--font-display)", color: "#fff" }}
                  >
                    {studentAttempts.length === 0
                      ? "—"
                      : Math.round(
                          (studentAttempts.reduce(
                            (sum, a) => sum + a.score / a.total,
                            0,
                          ) /
                            studentAttempts.length) *
                            100,
                        ) + "%"}
                  </p>
                </div>

                <div>
                  <p
                    className="text-[10px] font-600 uppercase tracking-widest mb-2"
                    style={{
                      color: "var(--color-amber)",
                      fontFamily: "var(--font-body)",
                      letterSpacing: "0.15em",
                    }}
                  >
                    Perfect Scores
                  </p>
                  <p
                    className="text-3xl font-900 leading-none"
                    style={{ fontFamily: "var(--font-display)", color: "#fff" }}
                  >
                    {studentAttempts.filter((a) => a.score === a.total).length}
                  </p>
                </div>
              </div>

              {/* Per-quiz best */}
              {assignedQuizzes.length > 0 && (
                <div
                  className="mt-6 pt-5"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}
                >
                  <p
                    className="text-[10px] font-600 uppercase tracking-widest mb-3"
                    style={{
                      color: "var(--color-amber)",
                      fontFamily: "var(--font-body)",
                      letterSpacing: "0.15em",
                    }}
                  >
                    Best per quiz
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {assignedQuizzes.map((quiz) => {
                      const best = getBestScoreForQuiz(
                        currentStudent.id,
                        quiz.id,
                      )
                      return (
                        <div key={quiz.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className="text-xs truncate pr-2"
                              style={{
                                color: "rgba(255,255,255,0.6)",
                                fontFamily: "var(--font-body)",
                              }}
                            >
                              {quiz.title}
                            </span>
                            <span
                              className="text-xs font-600"
                              style={{
                                color:
                                  best === null
                                    ? "rgba(255,255,255,0.3)"
                                    : "#fff",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {best === null
                                ? "—"
                                : Math.round(best * 100) + "%"}
                            </span>
                          </div>
                          <div
                            className="h-1.5 w-full"
                            style={{ background: "rgba(255,255,255,0.12)" }}
                          >
                            <div
                              className="h-full"
                              style={{
                                width:
                                  best === null
                                    ? "0%"
                                    : `${Math.round(best * 100)}%`,
                                background:
                                  best === null
                                    ? "transparent"
                                    : "var(--color-teal)",
                                transition: "width 0.4s ease",
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* ░░ Right — main content ░░ */}
          <div className="flex-1 min-w-0">
            {/* Teacher messages, latest first */}
            {currentStudent.messages.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare
                    size={16}
                    style={{ color: "var(--color-ember)" }}
                  />
                  <h2
                    className="text-sm font-600 uppercase tracking-wider"
                    style={{
                      color: "var(--color-ink)",
                      fontFamily: "var(--font-body)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Messages from your teacher
                  </h2>
                </div>
                <div className="flex flex-col gap-3">
                  {currentStudent.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 p-4 animate-slide-up"
                      style={{
                        background: "var(--color-ink)",
                        border: "2px solid var(--color-amber)",
                        boxShadow: "3px 3px 0 var(--color-amber-dark)",
                      }}
                    >
                      <div
                        className="shrink-0 flex items-center justify-center"
                        style={{
                          width: 32,
                          height: 32,
                          background: "var(--color-amber)",
                          color: "var(--color-ink)",
                        }}
                      >
                        <MessageSquare size={14} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-sm leading-relaxed"
                          style={{
                            color: "rgba(255,255,255,0.8)",
                            fontFamily: "var(--font-body)",
                          }}
                        >
                          {msg.text}
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{
                            color: "rgba(255,255,255,0.35)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {new Date(msg.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Page header */}
            <div className="mb-8">
              <h1
                className="font-900 text-4xl mb-2"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-ink)",
                }}
              >
                Your Quizzes
              </h1>
              <p
                className="text-base"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {assignedQuizzes.length} quiz
                {assignedQuizzes.length !== 1 ? "zes" : ""} assigned to you
              </p>
            </div>

            {assignedQuizzes.length === 0 ? (
              /* Empty state */
              <div
                className="flex flex-col items-center justify-center py-20 text-center"
                style={{ border: "2px dashed var(--color-cream-dark)" }}
              >
                <div
                  className="text-5xl mb-4"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--color-cream-dark)",
                  }}
                >
                  ∅
                </div>
                <h2
                  className="text-xl font-700 mb-2"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--color-ink-muted)",
                  }}
                >
                  Nothing here yet
                </h2>
                <p
                  className="text-sm max-w-xs"
                  style={{
                    color: "var(--color-ink-muted)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Your teacher hasn&apos;t assigned any quizzes to your account
                  yet. Check back soon.
                </p>
              </div>
            ) : (
              /* Quiz list grouped by chapter/lesson */
              <div className="flex flex-col gap-8">
                {chapters.map((chapter) => {
                  const chapterLessons = lessons.filter(
                    (l) => l.chapterId === chapter.id,
                  )
                  const chapterQuizzes = chapterLessons.flatMap((l) =>
                    l.quizIds.filter((qId) =>
                      assignedQuizzes.some((q) => q.id === qId),
                    ),
                  )
                  if (chapterQuizzes.length === 0) return null

                  return (
                    <div key={chapter.id}>
                      {/* Chapter heading */}
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-7 h-7 flex items-center justify-center text-xs font-700"
                          style={{
                            background: "var(--color-ember)",
                            color: "#fff",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {chapters.indexOf(chapter) + 1}
                        </div>
                        <h2
                          className="text-lg font-700"
                          style={{
                            fontFamily: "var(--font-display)",
                            color: "var(--color-ink)",
                          }}
                        >
                          {chapter.title}
                        </h2>
                        <div
                          className="flex-1 h-px"
                          style={{ background: "var(--color-cream-dark)" }}
                        />
                      </div>

                      <div
                        className="flex flex-col gap-3 pl-4"
                        style={{
                          borderLeft: "2px solid var(--color-cream-dark)",
                        }}
                      >
                        {chapterLessons.map((lesson) => {
                          const lessonQuizIds = lesson.quizIds.filter((qId) =>
                            assignedQuizzes.some((q) => q.id === qId),
                          )
                          if (lessonQuizIds.length === 0) return null

                          return (
                            <div key={lesson.id} className="ml-4">
                              {/* Lesson label */}
                              <p
                                className="text-xs font-600 uppercase tracking-wider mb-2"
                                style={{
                                  color: "var(--color-ink-muted)",
                                  fontFamily: "var(--font-body)",
                                  letterSpacing: "0.1em",
                                }}
                              >
                                {lesson.title}
                              </p>

                              {lessonQuizIds.map((quizId) => {
                                const quiz = assignedQuizzes.find(
                                  (q) => q.id === quizId,
                                )!
                                const cfg = STATUS_CONFIG[quiz.status]
                                const attempts = studentAttempts.filter(
                                  (a) => a.quizId === quizId,
                                )
                                const bestScore = getBestScoreForQuiz(
                                  currentStudent.id,
                                  quizId,
                                )
                                const isActive = quiz.status === "active"

                                return (
                                  <div
                                    key={quizId}
                                    onClick={() =>
                                      handleSelectQuiz(quizId, quiz.status)
                                    }
                                    className="flex items-center justify-between p-4 mb-2"
                                    style={{
                                      background: "white",
                                      border:
                                        "2px solid var(--color-cream-dark)",
                                      cursor: isActive ? "pointer" : "default",
                                      transition: "all 0.15s",
                                      boxShadow:
                                        "2px 2px 0 var(--color-cream-dark)",
                                    }}
                                    onMouseEnter={(e) => {
                                      if (isActive) {
                                        ;(e.currentTarget as HTMLDivElement).style.borderColor =
                                          "var(--color-ink)"
                                        ;(e.currentTarget as HTMLDivElement).style.boxShadow =
                                          "4px 4px 0 var(--color-ink)"
                                        ;(e.currentTarget as HTMLDivElement).style.transform =
                                          "translate(-2px, -2px)"
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      ;(e.currentTarget as HTMLDivElement).style.borderColor =
                                        "var(--color-cream-dark)"
                                      ;(e.currentTarget as HTMLDivElement).style.boxShadow =
                                        "2px 2px 0 var(--color-cream-dark)"
                                      ;(e.currentTarget as HTMLDivElement).style.transform =
                                        "none"
                                    }}
                                  >
                                    <div className="flex items-start gap-3 flex-1">
                                      <div className="flex flex-col gap-1 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className="font-600 text-base"
                                            style={{
                                              fontFamily: "var(--font-body)",
                                              color: "var(--color-ink)",
                                            }}
                                          >
                                            {quiz.title}
                                          </span>
                                          <span
                                            className="text-xs px-2 py-0.5 font-500"
                                            style={{
                                              background: cfg.bg,
                                              color: cfg.color,
                                              border: `1px solid ${cfg.color}`,
                                              fontFamily: "var(--font-body)",
                                            }}
                                          >
                                            {cfg.label}
                                          </span>
                                        </div>

                                        {/* Attempt history */}
                                        {attempts.length > 0 && (
                                          <div className="flex items-center gap-3 mt-0.5">
                                            {bestScore !== null && (
                                              <div className="flex items-center gap-1">
                                                <Star
                                                  size={12}
                                                  style={{
                                                    color: "var(--color-amber)",
                                                  }}
                                                  fill="var(--color-amber)"
                                                />
                                                <span
                                                  className="text-xs font-600"
                                                  style={{
                                                    color:
                                                      "var(--color-ink-muted)",
                                                    fontFamily:
                                                      "var(--font-mono)",
                                                  }}
                                                >
                                                  Best:{" "}
                                                  {Math.round(bestScore * 100)}%
                                                </span>
                                              </div>
                                            )}
                                            <div className="flex items-center gap-1">
                                              <Clock
                                                size={12}
                                                style={{
                                                  color:
                                                    "var(--color-ink-muted)",
                                                }}
                                              />
                                              <span
                                                className="text-xs"
                                                style={{
                                                  color:
                                                    "var(--color-ink-muted)",
                                                  fontFamily:
                                                    "var(--font-body)",
                                                }}
                                              >
                                                {attempts.length} attempt
                                                {attempts.length !== 1
                                                  ? "s"
                                                  : ""}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {isActive && (
                                      <ChevronRight
                                        size={18}
                                        style={{
                                          color: "var(--color-ink-muted)",
                                          flexShrink: 0,
                                        }}
                                      />
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {/* Custom (category-less) teacher quizzes */}
                {(() => {
                  const assignedLessonQuizIds = new Set(
                    lessons.flatMap((l) => l.quizIds),
                  )
                  const customQuizzes = assignedQuizzes.filter(
                    (q) => !assignedLessonQuizIds.has(q.id),
                  )
                  if (customQuizzes.length === 0) return null
                  return (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-7 h-7 flex items-center justify-center text-xs font-700"
                          style={{
                            background: "var(--color-ember)",
                            color: "#fff",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          +
                        </div>
                        <h2
                          className="text-lg font-700"
                          style={{
                            fontFamily: "var(--font-display)",
                            color: "var(--color-ink)",
                          }}
                        >
                          Your teacher's quizzes
                        </h2>
                        <div
                          className="flex-1 h-px"
                          style={{ background: "var(--color-cream-dark)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-3 pl-4">
                        {customQuizzes.map((quiz) => {
                          const attempts = studentAttempts.filter(
                            (a) => a.quizId === quiz.id,
                          )
                          const isActive = quiz.status === "active"
                          return (
                            <div
                              key={quiz.id}
                              onClick={() =>
                                handleSelectQuiz(quiz.id, quiz.status)
                              }
                              className="flex items-center justify-between p-4 mb-2"
                              style={{
                                background: "white",
                                border: "2px solid var(--color-cream-dark)",
                                cursor: isActive ? "pointer" : "default",
                                boxShadow: "2px 2px 0 var(--color-cream-dark)",
                              }}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                {quiz.coverImageDataUrl && (
                                  <img
                                    src={quiz.coverImageDataUrl}
                                    alt=""
                                    className="w-12 h-12 object-cover"
                                    style={{
                                      display: "block",
                                      border:
                                        "2px solid var(--color-cream-dark)",
                                    }}
                                  />
                                )}
                                <div>
                                  <p
                                    className="font-600"
                                    style={{
                                      fontFamily: "var(--font-body)",
                                      color: "var(--color-ink)",
                                    }}
                                  >
                                    {quiz.title}
                                  </p>
                                  <p
                                    className="text-xs"
                                    style={{
                                      color: "var(--color-ink-muted)",
                                      fontFamily: "var(--font-body)",
                                    }}
                                  >
                                    {isActive ? "Available" : quiz.status}{" "}
                                    {attempts.length > 0 &&
                                      `· ${attempts.length} attempt${
                                        attempts.length !== 1 ? "s" : ""
                                      }`}
                                  </p>
                                </div>
                              </div>
                              {isActive && (
                                <ChevronRight
                                  size={18}
                                  style={{
                                    color: "var(--color-ink-muted)",
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Close right column + two-column flex */}
          </div>
        </div>
      </div>
    </div>
  )
}
