import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { motion, animate } from "motion/react";
import { useApp } from "../store/AppContext";
import ProgressRing from "../components/ProgressRing";
import { getRandomQuote } from "../data/quotes";
import { Students } from "../api/client";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";
import type { QuizSessionAnswer } from "../data/types";
import MathText from "../components/MathText";
import Confetti from "../components/Confetti";
import { Sounds } from "../data/sounds";

interface ResultsState {
  score: number;
  total: number;
  answers: QuizSessionAnswer[];
  lucky?: "" | "extra" | "double";
}

export default function Results() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentStudent, quizzes } = useApp();

  const state = location.state as ResultsState | null;
  const [displayScore, setDisplayScore] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const quotesRef = useRef<Record<string, string>>({});
  const serverQuotesRef = useRef<string[]>([]);
  // Ensure the fanfare plays exactly once (React StrictMode remounts effects
  // in dev; the timer-count-up effect below can't distinguish the runs).
  const fanfarePlayedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    Students.quotes()
      .then((list) => {
        if (mounted && list.length > 0) {
          serverQuotesRef.current = list.map((q) => q.text);
        }
      })
      .catch(() => {
        // fall back to the bundled static quotes
      });
    return () => {
      mounted = false;
    };
  }, []);

  const pickQuote = () => {
    const pool = serverQuotesRef.current;
    if (pool.length > 0) {
      return pool[Math.floor(Math.random() * pool.length)];
    }
    return getRandomQuote();
  };

  useEffect(() => {
    if (!currentStudent) {
      navigate("/");
      return;
    }
    if (!state) {
      // No summary passed in (direct URL hit / refresh on the results
      // page). The attempt already completed server-side; send a still
      // logged-in student to their quiz list rather than the name screen.
      navigate("/quizzes");
      return;
    }
    if (!fanfarePlayedRef.current) {
      fanfarePlayedRef.current = true;
      Sounds.fanfare(state.total === 0 ? 0 : state.score / state.total);
    }
    if (state.answers) {
      state.answers.forEach((a) => {
        if (!a.correct && !quotesRef.current[a.questionId]) {
          quotesRef.current[a.questionId] = pickQuote();
        }
      });
    }
    const target = state.score;
    if (target === 0) {
      setDisplayScore(0);
      setTimeout(() => setShowBreakdown(true), 800);
      return;
    }
    // motion's animate() tween drives the score count-up. The previous
    // setInterval approach stepped once every 400ms (2.5 ticks/sec) which
    // felt choppy on larger totals; a 60fps tween with a target-scaled
    // duration finishes as briskly for 3 points as for 20, and `stop()` on
    // cleanup replaces clearInterval.
    const controls = animate(0, target, {
      duration: Math.min(1.2, 0.4 + target * 0.05),
      ease: "easeOut",
      onUpdate: (v) => setDisplayScore(Math.round(v)),
      onComplete: () => setTimeout(() => setShowBreakdown(true), 400),
    });
    return () => controls.stop();
  }, [currentStudent, state, navigate]);

  // Once the score count-up finishes and the breakdown cards have cascaded in
  // (each is staggered 0.12s + 0.5s slide-up), glide down to the bottom of the
  // page so the "Back to my quizzes" button comes into view on its own.
  useEffect(() => {
    if (!showBreakdown || !state) return;
    const delay = 700 + Math.max(0, state.answers.length - 1) * 120;
    const t = window.setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
    }, delay);
    return () => window.clearTimeout(t);
  }, [showBreakdown, state]);

  if (!state || !currentStudent) return null;

  const { score, total, answers } = state;
  const pct = total === 0 ? 0 : score / total;
  const quiz = quizzes.find((q) => q.id === quizId);

  const getHeading = () => {
    if (pct === 1) return "Clean sweep 🧹";
    if (pct >= 0.67) return "Solid work 💪";
    if (pct >= 0.34) return "You got some.";
    return "You've been sponsored by wrong answers™";
  };

  const getSubheading = () => {
    if (pct === 1) return "Every question, correct. That's not luck — that's the material clicking.";
    if (pct >= 0.67) return "More right than wrong. The misses are worth reviewing.";
    if (pct >= 0.34) return "Mixed bag. The breakdown below is the useful part.";
    return "Not today — but you've officially made the Wall of Shame list. Review below and come back swinging.";
  };

  // Resolve the full Question object (prompt + 5 options) for breakdown display.
  const { questions, attemptSummary } = useApp();
  const lucky = state.lucky ?? attemptSummary?.lucky ?? "";
  const breakdown =
    attemptSummary?.breakdown ??
    answers.map((a) => {
      const q = questions.find((qq) => qq.id === a.questionId);
      return {
        questionId: a.questionId,
        prompt: q?.prompt ?? "(question removed)",
        imageUrl: q?.imageUrl ?? null,
        options: q?.options ?? [],
        correctOptionIndex: q?.correctOptionIndex ?? -1,
        chosenOptionIndex: a.chosenOptionIndex,
        tries: a.tries,
        correct: a.correct,
        trolled: a.trolled,
      };
    });

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream)" }}>
      {/* Celebration routine tiers with the score: perfect = full burst +
      ring flash, solid = a healthy shower, mixed = a light dusting, and a
      single commemorative piece for zero points. The fanfare sound plays
      alongside in the mount effect. */}
      {pct === 1 ? (
        <Confetti pieces={110} burst />
      ) : pct >= 0.67 ? (
        <Confetti pieces={60} />
      ) : pct >= 0.34 ? (
        <Confetti pieces={24} />
      ) : (
        /* Zero points: one lonely piece of confetti. Commemorative. */
        <Confetti pieces={1} />
      )}
      <div
        className="h-2"
        style={{
          background:
            "repeating-linear-gradient(90deg, #D94F1E 0px, #D94F1E 30px, #F0A500 30px, #F0A500 60px, #0D6E6E 60px, #0D6E6E 90px, #1C0F00 90px, #1C0F00 105px)",
        }}
      />

      <div className="max-w-2xl mx-auto px-6 py-12">
        {lucky && (
          <div
            className="flex items-center justify-center gap-2 px-4 py-2.5 mb-6 animate-pop-in"
            style={{
              background: "#2A1800",
              border: "2px solid var(--color-amber)",
              boxShadow: "4px 4px 0 var(--color-amber)",
              color: "var(--color-amber)",
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              letterSpacing: "0.06em",
            }}
          >
            🎁 LUCKY DOUBLE
          </div>
        )}
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
              className="text-base font-700 mb-2"
              style={{
                color: "var(--color-amber-light)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.02em",
              }}
            >
              {score} of {total} correct
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{
                color: "rgba(255,255,255,0.6)",
                fontFamily: "var(--font-body)",
              }}
            >
              {getSubheading()}
            </p>
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

        {showBreakdown && (
          <motion.div
            className="flex flex-col gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h2
              className="text-lg font-700"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-ink)",
              }}
            >
              Question breakdown
            </h2>

            {breakdown.map((b, i) => {
              const quote = !b.correct ? (quotesRef.current[b.questionId] ?? pickQuote()) : null;
              const correctOpt = b.options[b.correctOptionIndex];
              return (
                <motion.div
                  key={b.questionId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    background: b.correct ? "#E6F5F5" : "white",
                    border: `2px solid ${b.correct ? "var(--color-teal-dark)" : "var(--color-cream-dark)"}`,
                    borderLeft: `5px solid ${b.correct ? "var(--color-teal-dark)" : "var(--color-ember)"}`,
                  }}
                >
                  <div className="flex items-start gap-4 p-5">
                    <div
                      className="shrink-0 flex items-center justify-center text-xs font-700 mt-0.5"
                      style={{
                        width: 28,
                        height: 28,
                        background: b.correct
                          ? "var(--color-teal-dark)"
                          : "var(--color-ember)",
                        color: "#fff",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {b.correct ? <CheckCircle size={16} color="#fff" /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-[10px] font-700 px-2 py-0.5"
                          style={{
                            background: b.correct
                              ? "var(--color-teal-dark)"
                              : "var(--color-ember)",
                            color: "#fff",
                            fontFamily: "var(--font-mono)",
                            letterSpacing: "0.1em",
                          }}
                        >
                          {b.correct ? "CORRECT" : "WRONG"}
                        </span>
                        <span
                          className="text-xs"
                          style={{
                            color: "var(--color-ink-muted)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          Question {i + 1}
                        </span>
                      </div>
                      <p
                        className="text-sm font-500 leading-relaxed mb-3"
                        style={{
                          fontFamily: "var(--font-body)",
                          color: "var(--color-ink)",
                        }}
                      >
                        <MathText text={b.prompt} />
                      </p>

                      <div className="flex flex-col gap-1.5">
                        {b.chosenOptionIndex !== null && b.options[b.chosenOptionIndex] && (
                          <div className="flex items-center gap-2">
                            {b.correct ? (
                              <CheckCircle
                                size={14}
                                style={{
                                  color: "var(--color-teal-dark)",
                                  flexShrink: 0,
                                }}
                              />
                            ) : (
                              <XCircle
                                size={14}
                                style={{
                                  color: "var(--color-ember)",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <span
                              className="text-xs"
                              style={{
                                color: b.correct
                                  ? "var(--color-teal-dark)"
                                  : "var(--color-ember-dark)",
                                fontFamily: "var(--font-body)",
                              }}
                            >
                              Your answer: <MathText text={b.options[b.chosenOptionIndex]} />
                            </span>
                          </div>
                        )}

                        {!b.correct && correctOpt && (
                          <div className="flex items-center gap-2">
                            <CheckCircle
                              size={14}
                              style={{
                                color: "var(--color-teal-dark)",
                                flexShrink: 0,
                              }}
                            />
                            <span
                              className="text-xs font-500"
                              style={{
                                color: "var(--color-teal-dark)",
                                fontFamily: "var(--font-body)",
                              }}
                            >
                              Correct: <MathText text={correctOpt} />
                            </span>
                          </div>
                        )}
                      </div>

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
                          {b.tries} {b.tries === 1 ? "try" : "tries"}
                        </span>
                        {b.trolled && (
                          <span
                            className="text-xs px-2 py-0.5 font-500"
                            style={{
                              background: "#2A1800",
                              color: "var(--color-amber)",
                              border: "1px solid var(--color-amber-dark)",
                              fontFamily: "var(--font-body)",
                            }}
                          >
                            Troll'd
                          </span>
                        )}
                      </div>

                      {!b.correct && quote && (
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
                            “{quote}”
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {showBreakdown && (
          <motion.div
            className="flex gap-3 mt-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "translate(-2px, -2px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "6px 6px 0 var(--color-ink)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "none";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "4px 4px 0 var(--color-ink)";
              }}
            >
              Back to my quizzes
              <ArrowRight size={18} />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}