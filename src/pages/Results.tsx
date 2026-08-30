import { useEffect, useState, useRef } from "react"
import { useNavigate, useParams, useLocation } from "react-router"
import { useApp } from "../store/AppContext"
import ProgressRing from "../components/ProgressRing"
import { getRandomQuote } from "../data/quotes"
import { CheckCircle, XCircle, ArrowRight, RotateCcw } from "lucide-react"

interface ResultsState {
  score: number
  total: number
  answers: Array<{
    questionId: string
    chosenOptionIndex: number
    correct: boolean
    tries: number
    trolled: boolean
  }>
}

export default function Results() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { currentStudent, questionsServed, questions, quizzes } = useApp()

  const state = location.state as ResultsState | null
  const [displayScore, setDisplayScore] = useState(0)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const quotesRef = useRef<Record<string, string>>({})

  useEffect(() => {
    if (!currentStudent || !state) {
      navigate("/")
      return
    }

    // Pre-generate quotes for each wrong answer
    if (state.answers) {
      state.answers.forEach((a) => {
        if (!a.correct && !quotesRef.current[a.questionId]) {
          quotesRef.current[a.questionId] = getRandomQuote()
        }
      })
    }

    // Animate score count-up
    let n = 0
    const target = state.score
    if (target === 0) {
      setDisplayScore(0)
      setTimeout(() => setShowBreakdown(true), 800)
      return
    }
    const interval = setInterval(() => {
      n++
      setDisplayScore(n)
      if (n >= target) {
        clearInterval(interval)
        setTimeout(() => setShowBreakdown(true), 400)
      }
    }, 400)
    return () => clearInterval(interval)
  }, [currentStudent, state, navigate])

  if (!state || !currentStudent) return null

  const { score, total, answers } = state
  const pct = total === 0 ? 0 : score / total
  const quiz = quizzes.find((q) => q.id === quizId)

  const getHeading = () => {
    if (pct === 1) return "Clean sweep."
    if (pct >= 0.67) return "Solid work."
    if (pct >= 0.34) return "You got some."
    return "Rough one."
  }

  const getSubheading = () => {
    if (pct === 1)
      return "Every question, correct. That&apos;s not luck — that&apos;s the material clicking."
    if (pct >= 0.67)
      return "More right than wrong. The misses are worth reviewing."
    if (pct >= 0.34) return "Mixed bag. The breakdown below is the useful part."
    return "Didn&apos;t land today — but the review section is where the learning happens."
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream)" }}>
      {/* Top stripe */}
      <div
        className="h-2"
        style={{
          background:
            "repeating-linear-gradient(90deg, #D94F1E 0px, #D94F1E 30px, #F0A500 30px, #F0A500 60px, #0D6E6E 60px, #0D6E6E 90px, #1C0F00 90px, #1C0F00 105px)",
        }}
      />

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Score hero */}
        <div
          className="flex flex-col sm:flex-row items-center gap-8 p-8 mb-8"
          style={{
            background: "var(--color-ink)",
            border: "3px solid var(--color-ink)",
            boxShadow:
              pct === 1
                ? "8px 8px 0 var(--color-teal)"
                : pct >= 0.67
                  ? "8px 8px 0 var(--color-amber)"
                  : "8px 8px 0 var(--color-ember)",
          }}
        >
          <div className="shrink-0 animate-pop-in">
            <ProgressRing score={displayScore} total={total} size={140} />
          </div>
          <div className="text-center sm:text-left">
            <h1
              className="font-900 leading-tight mb-2"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-amber)",
                fontSize: "clamp(2rem, 4vw, 2.8rem)",
              }}
            >
              {getHeading()}
            </h1>
            <p
              className="text-sm leading-relaxed"
              style={{
                color: "rgba(255,255,255,0.6)",
                fontFamily: "var(--font-body)",
              }}
              dangerouslySetInnerHTML={{ __html: getSubheading() }}
            />
            {quiz && (
              <p
                className="text-xs mt-3"
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {quiz.title}
              </p>
            )}
          </div>
        </div>

        {/* Per-question breakdown */}
        {showBreakdown && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <h2
              className="text-lg font-700"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-ink)",
              }}
            >
              Question breakdown
            </h2>

            {answers.map((answer, i) => {
              const q = questions.find((qq) => qq.id === answer.questionId)
              if (!q) return null
              const quote = quotesRef.current[answer.questionId]

              return (
                <div
                  key={answer.questionId}
                  className="animate-slide-up"
                  style={{
                    background: "white",
                    border: "2px solid var(--color-cream-dark)",
                    borderLeft: `5px solid ${
                      answer.correct
                        ? "var(--color-success)"
                        : "var(--color-danger)"
                    }`,
                    animationDelay: `${i * 0.12}s`,
                    animationFillMode: "both",
                  }}
                >
                  <div className="flex items-start gap-4 p-5">
                    <div
                      className="shrink-0 flex items-center justify-center text-xs font-700 mt-0.5"
                      style={{
                        width: 28,
                        height: 28,
                        background: answer.correct
                          ? "var(--color-success)"
                          : "var(--color-danger)",
                        color: "#fff",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-500 leading-relaxed mb-3"
                        style={{
                          fontFamily: "var(--font-body)",
                          color: "var(--color-ink)",
                        }}
                      >
                        {q.prompt}
                      </p>

                      {/* Answer options summary */}
                      <div className="flex flex-col gap-1.5">
                        {/* Student's answer */}
                        <div className="flex items-center gap-2">
                          {answer.correct ? (
                            <CheckCircle
                              size={14}
                              style={{
                                color: "var(--color-success)",
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <XCircle
                              size={14}
                              style={{
                                color: "var(--color-danger)",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <span
                            className="text-xs"
                            style={{
                              color: answer.correct
                                ? "var(--color-success)"
                                : "var(--color-danger)",
                              fontFamily: "var(--font-body)",
                            }}
                          >
                            Your answer: {q.options[answer.chosenOptionIndex]}
                          </span>
                        </div>

                        {/* Correct answer (only on wrong) */}
                        {!answer.correct && (
                          <div className="flex items-center gap-2">
                            <CheckCircle
                              size={14}
                              style={{
                                color: "var(--color-success)",
                                flexShrink: 0,
                              }}
                            />
                            <span
                              className="text-xs font-500"
                              style={{
                                color: "var(--color-success)",
                                fontFamily: "var(--font-body)",
                              }}
                            >
                              Correct: {q.options[q.correctOptionIndex]}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Tries + troll badge */}
                      <div className="flex items-center gap-2 mt-3">
                        <span
                          className="text-xs px-2 py-0.5"
                          style={{
                            background: "var(--color-cream-dark)",
                            color: "var(--color-ink-muted)",
                            border: "1px solid var(--color-cream-dark)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {answer.tries} {answer.tries === 1 ? "try" : "tries"}
                        </span>
                        {answer.trolled && (
                          <span
                            className="text-xs px-2 py-0.5 font-500"
                            style={{
                              background: "#2A1800",
                              color: "var(--color-amber)",
                              border: "1px solid var(--color-amber-dark)",
                              fontFamily: "var(--font-body)",
                            }}
                          >
                            🎵 Troll&apos;d
                          </span>
                        )}
                      </div>

                      {/* Encouraging quote on miss */}
                      {!answer.correct && quote && (
                        <div
                          className="mt-4 px-4 py-3"
                          style={{
                            background: "var(--color-cream)",
                            borderLeft: "3px solid var(--color-amber)",
                          }}
                        >
                          <p
                            className="text-xs leading-relaxed"
                            style={{
                              color: "var(--color-ink-light)",
                              fontFamily: "var(--font-body)",
                              fontStyle: "italic",
                            }}
                          >
                            &ldquo;{quote}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* CTA */}
        {showBreakdown && (
          <div
            className="flex gap-3 mt-8 animate-slide-up"
            style={{ animationDelay: "0.5s", animationFillMode: "both" }}
          >
            <button
              onClick={() => navigate("/quizzes")}
              className="flex-1 flex items-center justify-center gap-2 py-4 text-base font-700"
              style={{
                background: "var(--color-ember)",
                color: "#fff",
                border: "3px solid var(--color-ink)",
                boxShadow: "4px 4px 0 var(--color-ink)",
                fontFamily: "var(--font-display)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.transform =
                  "translate(-2px, -2px)"
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "6px 6px 0 var(--color-ink)"
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = "none"
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "4px 4px 0 var(--color-ink)"
              }}
            >
              Back to my quizzes
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
