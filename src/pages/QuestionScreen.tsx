import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useApp } from "../store/AppContext";
import { QuizTaking } from "../api/client";
import TrollVideoModal from "../components/TrollVideoModal";
import MathText from "../components/MathText";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import type { QuestionServed } from "../data/types";

type OptionState = "default" | "selected" | "correct" | "wrong";

const OPTION_COUNT = 5;

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function QuestionScreen() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const {
    currentStudent,
    questionsServed,
    currentQuestionIndex,
    currentTries,
    sessionAnswers,
    attemptId,
    submitAnswer,
    advanceQuestion,
    completeQuiz,
  } = useApp();

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [optionStates, setOptionStates] = useState<OptionState[]>(
    Array(OPTION_COUNT).fill("default") as OptionState[],
  );
  const [feedback, setFeedback] = useState<{ type: "wrong" | "correct"; message: string } | null>(null);
  const [showTroll, setShowTroll] = useState(false);
  const [trollVideoUrl, setTrollVideoUrl] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const timedUpRef = useRef(false);
  const [submitted, setSubmitted] = useState(false);
  // True while the server is grading the answer. Drives an immediate
  // "Checking…" pill so the click is never followed by dead air while the
  // round-trip lands. (Previous behaviour: button hid but nothing else
  // moved until the response came back — felt broken on slow links.)
  const [checking, setChecking] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  // User can tap to advance as soon as the verdict lands. We auto-advance
  // after a short pause so the snack is readable but the quiz still feels
  // snappy.
  const [showNext, setShowNext] = useState(false);
  // Set when we're tearing down the quiz (completing the attempt + heading
  // to results). The completion flow clears `questionsServed` *before* the
  // (transition-priority) results navigation commits, so in between React
  // can re-render this screen with an empty `questionsServed`; without this
  // flag the mount guard below would race that navigation and bounce the
  // student back to the landing page. §finished-attempt vs redirect guard.
  const finishingRef = useRef(false);
  const selectedIndexRef = useRef<number | null>(null);
  const optionStatesRef = useRef<OptionState[]>(
    Array(OPTION_COUNT).fill("default") as OptionState[],
  );
  // Phase A instrumentation: per-question choice history + timing.
  const choicesRef = useRef<number[]>([]);
  const questionShownAtRef = useRef<number>(Date.now());

  // Latest-value refs so the completion callbacks (which are memoized and may
  // outlive the render that created them) always read the current session
  // state, never a stale closure.
  const sessionAnswersRef = useRef(sessionAnswers);
  sessionAnswersRef.current = sessionAnswers;
  const questionsServedRef = useRef(questionsServed);
  questionsServedRef.current = questionsServed;
  const completeQuizRef = useRef(completeQuiz);
  completeQuizRef.current = completeQuiz;
  // Timers that drive the post-correct auto-advance; stashed so an early
  // tap on "Next" can cancel them.
  const advanceTimersRef = useRef<{ nextTimer?: ReturnType<typeof setTimeout>; advanceTimer?: ReturnType<typeof setTimeout> }>({});

  const question: QuestionServed | undefined = questionsServed[currentQuestionIndex];

  // Per-question timer limit in seconds (null when no limit is set).
  const timeLimitSeconds = question?.timeLimitMinutes
    ? question.timeLimitMinutes * 60
    : null;

  // Locally-known result used to paint the results page instantly while the
  // `complete` call syncs in the background. Score/total mirror the server's
  // logic (one point per answered-correctly question, total = served count).
  const optimisticResult = () => {
    const answers = sessionAnswersRef.current;
    return {
      score: answers.filter((a) => a.correct).length,
      total: questionsServedRef.current.length,
      answers: answers.map((a) => ({
        questionId: a.questionId,
        chosenOptionIndex: a.chosenOptionIndex,
        correct: a.correct,
        tries: a.tries,
        trolled: a.trolled,
      })),
    };
  };

  // Fire the server-side completion and, when it lands, stash the canonical
  // summary (drives breakdown / attemptSummary) and refresh the quiz list.
  const syncComplete = (aid: string) => {
    QuizTaking.complete(aid)
      .then((summary) => completeQuizRef.current(summary))
      .catch((err) => console.error("complete sync failed:", err));
  };

  useEffect(() => {
    if (!currentStudent || questionsServed.length === 0) {
      // A quiz is being torn down right now (completeQuiz cleared our
      // questionsServed just before the results navigation). Don't fight
      // the transition — drop out and let the navigation to results land.
      if (finishingRef.current) {
        finishingRef.current = false;
        return;
      }
      navigate("/");
      return;
    }
    setSelectedOption(null);
    selectedIndexRef.current = null;
    const fresh = Array(OPTION_COUNT).fill("default") as OptionState[];
    setOptionStates(fresh);
    optionStatesRef.current = fresh;
    setFeedback(null);
    setSubmitted(false);
    setChecking(false);
    setShowNext(false);
    setAdvancing(false);
    // Drop any pending post-correct advance timers from the previous
    // question (they would otherwise fire against the next question).
    if (advanceTimersRef.current.nextTimer) clearTimeout(advanceTimersRef.current.nextTimer);
    if (advanceTimersRef.current.advanceTimer) clearTimeout(advanceTimersRef.current.advanceTimer);
    advanceTimersRef.current = {};
    setShowTroll(false);
    setTrollVideoUrl(null);
    setTimeUp(false);
    timedUpRef.current = false;
    // Reset per-question instrumentation when the question changes.
    choicesRef.current = [];
    questionShownAtRef.current = Date.now();
  }, [currentQuestionIndex, currentStudent, questionsServed, navigate]);

  // Block browser back-button during quiz — router guard per §10.1.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPop);

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  // Per-question countdown: reset when the question (or its limit) changes.
  useEffect(() => {
    setTimeLeft(
      question?.timeLimitMinutes ? question.timeLimitMinutes * 60 : null,
    );
  }, [currentQuestionIndex, question?.timeLimitMinutes]);

  // Tick down every second while a limit is active and the question is live.
  useEffect(() => {
    if (timeLimitSeconds === null) return;
    if (timeUp || submitted) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timeLimitSeconds, timeUp, submitted]);

  const advance = useCallback(async () => {
    if (advancing) return;
    setAdvancing(true);
    const isLast = currentQuestionIndex >= questionsServed.length - 1;
    if (isLast) {
      finishingRef.current = true;
      // Optimistic: show results the moment the last question resolves, then
      // set the canonical attempt summary + refresh the quiz list when the
      // server confirms. `completeQuiz` (context) clears the session.
      navigate(`/quiz/${quizId}/results`, { state: optimisticResult() });
      if (attemptId) syncComplete(attemptId);
    } else {
      advanceQuestion();
    }
  }, [
    advancing,
    currentQuestionIndex,
    questionsServed.length,
    completeQuiz,
    navigate,
    quizId,
    advanceQuestion,
    attemptId,
  ]);

  const handleSubmit = useCallback(async () => {
    if (selectedIndexRef.current === null || submitted || !question) return;
    setSubmitted(true);
    // Instant acknowledgement — show a "Checking…" pill so the user never
    // sees a gap between click and verdict, even on slow networks.
    setChecking(true);
    setShowNext(false);

    // Phase A instrumentation: per-question choice history + time-on-question.
    const pickedIndex = selectedIndexRef.current;
    choicesRef.current.push(pickedIndex);
    const elapsedMs = Date.now() - questionShownAtRef.current;
    // Reset the per-try clock so subsequent retries only charge for the
    // time spent on that retry, not the cumulative time.
    questionShownAtRef.current = Date.now();

    const { correct, tries, shouldTroll, trollVideoUrl, completedAttempt } =
      await submitAnswer(
        question.questionId,
        pickedIndex,
        choicesRef.current,
        elapsedMs / 1000,
      );
    // Verdict has landed — drop the "Checking…" pill.
    setChecking(false);

    // The attempt is already finished server-side (another tab completed it,
    // or we re-entered this screen after finishing). End the quiz with the
    // server's summary instead of treating this as a wrong answer — that
    // previously unlocked the options and looped "Attempt already completed".
    if (completedAttempt) {
      finishingRef.current = true;
      // The attempt is already finished server-side — don't wait on another
      // round-trip to show the result. Navigate now with the locally-known
      // score and let the summary sync in the background.
      navigate(`/quiz/${quizId}/results`, { state: optimisticResult() });
      if (attemptId) syncComplete(attemptId);
      return;
    }

    // Preserve prior wrong markings — the warning sticks on each option
    // until the question itself finishes (correct, or 3rd-miss troll).
    const prev = optionStatesRef.current;
    const newStates = Array(OPTION_COUNT).fill("default") as OptionState[];
    for (let k = 0; k < OPTION_COUNT; k++) {
      if (prev[k] === "wrong") newStates[k] = "wrong";
    }

    if (correct) {
      newStates[selectedIndexRef.current] = "correct";
      optionStatesRef.current = newStates;
      setOptionStates(newStates);
      setFeedback({ type: "correct", message: "That's the one!" });
      // Let the user read the verdict, but don't make them wait the full
      // pause: the "Next" button appears in 400ms and the auto-advance
      // happens at 600ms. Previously the user was stuck for 1200ms.
      const nextTimer = setTimeout(() => setShowNext(true), 400);
      const advanceTimer = setTimeout(() => advance(), 600);
      // Stash the timers so a tap on "Next" can cancel the auto-advance.
      advanceTimersRef.current = { nextTimer, advanceTimer };
    } else {
      // Mark the chosen option wrong and keep it highlighted + disabled.
      // selectedOption stays set so the user sees which one they got wrong.
      newStates[selectedIndexRef.current] = "wrong";
      optionStatesRef.current = newStates;
      setOptionStates(newStates);
      setShakeKey((k) => k + 1);

      if (shouldTroll) {
        setTrollVideoUrl(trollVideoUrl ?? null);
        setTimeout(() => setShowTroll(true), 400);
      } else {
        const msg =
          tries === 1
            ? "Not quite — try a different answer."
            : "Last try — pick another option.";
        setFeedback({ type: "wrong", message: msg });
        // Unlock selection so the user can pick a different option.
        // The wrong one is locked via its `wrong` state in the renderer.
        setSubmitted(false);
        setSelectedOption(null);
      }
    }
  }, [
    submitted,
    submitAnswer,
    question,
    attemptId,
    quizId,
    completeQuiz,
    navigate,
    advance,
  ]);

  const handleTrollClose = () => {
    setShowTroll(false);
    setTimeout(() => advance(), 600);
  };

  // User taps "Next" instead of waiting for the auto-advance timer.
  const handleNext = useCallback(() => {
    if (advanceTimersRef.current.nextTimer) clearTimeout(advanceTimersRef.current.nextTimer);
    if (advanceTimersRef.current.advanceTimer) clearTimeout(advanceTimersRef.current.advanceTimer);
    advanceTimersRef.current = {};
    setShowNext(false);
    advance();
  }, [advance]);

  // Time's up: auto-submit a selected option, otherwise skip ahead.
  const handleTimeUp = useCallback(() => {
    if (timedUpRef.current) return;
    timedUpRef.current = true;
    setTimeUp(true);
    setTimeLeft(0);
    if (submitted) return;
    if (selectedIndexRef.current !== null) {
      handleSubmit();
    } else {
      setFeedback({ type: "wrong", message: "Time's up — no answer submitted." });
      setTimeout(() => advance(), 900);
    }
  }, [submitted, handleSubmit, advance]);

  // Fire once when the countdown reaches zero.
  useEffect(() => {
    if (timeLeft === 0 && timeLimitSeconds !== null && !timedUpRef.current) {
      handleTimeUp();
    }
  }, [timeLeft, timeLimitSeconds, handleTimeUp]);

  if (!question) return null;

  const isLast = currentQuestionIndex >= questionsServed.length - 1;

  return (
    <>
      {showTroll && (
        <TrollVideoModal onClose={handleTrollClose} videoUrl={trollVideoUrl} />
      )}

      <div
        className="min-h-screen flex flex-col"
        style={{ background: "var(--color-cream)" }}
      >
        <div
          className="sticky top-0 z-10 px-6 py-4"
          style={{
            background: "var(--color-ink)",
            borderBottom: "2px solid var(--color-ember)",
          }}
        >
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <span
              className="text-sm font-600"
              style={{
                color: "rgba(255,255,255,0.5)",
                fontFamily: "var(--font-body)",
              }}
            >
              Question {currentQuestionIndex + 1} of {questionsServed.length}
            </span>

            <div
              className="flex-1 mx-6 h-2 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${((currentQuestionIndex + 1) / questionsServed.length) * 100}%`,
                  background: "var(--color-amber)",
                }}
              />
            </div>

            <div className="flex gap-1.5">
              {questionsServed.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 10,
                    height: 10,
                    background:
                      i < currentQuestionIndex
                        ? "var(--color-teal)"
                        : i === currentQuestionIndex
                          ? "var(--color-amber)"
                          : "rgba(255,255,255,0.15)",
                    transition: "background 0.3s",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="max-w-3xl mx-auto flex items-center gap-2 mt-2">
            <span
              className="text-xs"
              style={{
                color: "rgba(255,255,255,0.3)",
                fontFamily: "var(--font-body)",
              }}
            >
              Attempts:
            </span>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-full transition-all duration-200"
                style={{
                  width: 8,
                  height: 8,
                  background:
                    n <= currentTries
                      ? "var(--color-ember)"
                      : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 flex flex-col gap-6">
          {question.imageUrl && (
            <div
              className="w-full overflow-hidden"
              style={{
                aspectRatio: "16/9",
                background: "var(--color-cream-dark)",
                border: "2px solid var(--color-cream-dark)",
              }}
            >
              <img
                src={question.imageUrl}
                alt="Question visual"
                className="w-full h-full object-cover"
                style={{ display: "block" }}
              />
            </div>
          )}

          <div
            className="p-6"
            style={{
              background: "white",
              border: "2px solid var(--color-cream-dark)",
              borderLeft: "5px solid var(--color-ember)",
            }}
          >
            <p
              className="text-lg leading-relaxed font-500"
              style={{ fontFamily: "var(--font-body)", color: "var(--color-ink)" }}
            >
              <MathText text={question.prompt} />
            </p>
          </div>

          {timeLimitSeconds !== null && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1">
                <span
                  className="text-xs font-600 uppercase tracking-wider flex items-center gap-1.5"
                  style={{
                    color: timeUp ? "var(--color-ember)" : "var(--color-ink-muted)",
                    fontFamily: "var(--font-body)",
                    letterSpacing: "0.1em",
                  }}
                >
                  <Clock size={12} /> Time left
                </span>
                <span
                  className="text-sm font-700 tabular-nums"
                  style={{
                    color:
                      timeLeft !== null && timeLeft <= 30
                        ? "var(--color-ember)"
                        : "var(--color-ink)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {timeUp ? "0:00" : formatTime(timeLeft ?? timeLimitSeconds)}
                </span>
              </div>
              <div
                className="h-2.5 overflow-hidden"
                style={{ background: "var(--color-cream-dark)" }}
              >
                <div
                  className="h-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${((timeLeft ?? timeLimitSeconds) / timeLimitSeconds) * 100}%`,
                    background:
                      timeLeft !== null && timeLeft <= 30
                        ? "var(--color-ember)"
                        : "var(--color-teal)",
                  }}
                />
              </div>
            </div>
          )}

          <div key={shakeKey} className="flex flex-col gap-3">
            {question.options.map((option, i) => {
              const state = optionStates[i] ?? "default";
              // Lock options that are already known-wrong from a prior try,
              // and lock all options briefly while a submit is in flight.
              const isLocked = state === "wrong" || state === "correct";
              const isDisabled = isLocked || (submitted && state === "default");
              return (
                <div
                  key={i}
                  onClick={() => {
                    if (isDisabled || submitted) return;
                    selectedIndexRef.current = i;
                    setSelectedOption(i);
                    const next = Array(OPTION_COUNT).fill(
                      "default",
                    ) as OptionState[];
                    // Preserve any prior "wrong" markings so the user can't
                    // re-pick the same wrong answer.
                    for (let k = 0; k < OPTION_COUNT; k++) {
                      if (optionStates[k] === "wrong") next[k] = "wrong";
                    }
                    next[i] = "selected";
                    optionStatesRef.current = next;
                    setOptionStates(next);
                  }}
                  className={`quiz-option flex items-center gap-4 p-4 ${state === "wrong" ? "animate-shake" : ""} ${isDisabled ? "disabled" : ""}`}
                  style={{
                    position: "relative",
                    ...(state === "selected" && {
                      borderColor: "var(--color-ink)",
                      background: "var(--color-cream)",
                    }),
                    ...(state === "correct" && {
                      borderColor: "var(--color-teal-dark)",
                      background: "#E6F5F5",
                    }),
                    ...(state === "wrong" && {
                      borderColor: "var(--color-ember)",
                      background: "#FDECEA",
                      cursor: "not-allowed",
                      opacity: 0.85,
                      pointerEvents: "none",
                    }),
                  }}
                >
                  <div
                    className="shrink-0 flex items-center justify-center text-sm font-700"
                    style={{
                      width: 32,
                      height: 32,
                      background:
                        state === "correct"
                          ? "var(--color-teal-dark)"
                          : state === "wrong"
                            ? "var(--color-ember)"
                            : state === "selected"
                              ? "var(--color-ink)"
                              : "var(--color-cream-dark)",
                      color:
                        state === "correct" ||
                        state === "wrong" ||
                        state === "selected"
                          ? "#fff"
                          : "var(--color-ink-muted)",
                      fontFamily: "var(--font-mono)",
                      transition: "all 0.15s",
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>

                  <span
                    className="flex-1 text-sm leading-relaxed"
                    style={{
                      fontFamily: "var(--font-body)",
                      color: state === "wrong" ? "var(--color-ember-dark)" : "var(--color-ink)",
                      textDecoration: state === "wrong" ? "line-through" : "none",
                      textDecorationThickness: state === "wrong" ? "2px" : undefined,
                    }}
                  >
                    <MathText text={option} />
                  </span>

                  {state === "correct" && (
                    <CheckCircle
                      size={18}
                      style={{ color: "var(--color-teal-dark)", flexShrink: 0 }}
                    />
                  )}
                  {state === "wrong" && (
                    <XCircle
                      size={18}
                      style={{ color: "var(--color-ember)", flexShrink: 0 }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {(checking || feedback) && (
            <div
              key={feedback?.message ?? "checking"}
              className="flex items-center justify-between gap-3 px-5 py-3.5 animate-slide-up"
              style={{
                background: checking
                  ? "var(--color-cream)"
                  : feedback?.type === "correct"
                    ? "#E6F5F5"
                    : "#FDECEA",
                border: `2px solid ${
                  checking
                    ? "var(--color-ink-muted)"
                    : feedback?.type === "correct"
                      ? "var(--color-teal-dark)"
                      : "var(--color-ember)"
                }`,
                borderLeft: `5px solid ${
                  checking
                    ? "var(--color-ink-muted)"
                    : feedback?.type === "correct"
                      ? "var(--color-teal-dark)"
                      : "var(--color-ember)"
                }`,
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {checking ? (
                  <span
                    className="shrink-0 inline-block rounded-full animate-spin"
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid var(--color-ink-muted)",
                      borderTopColor: "transparent",
                    }}
                    aria-label="Checking answer"
                  />
                ) : feedback?.type === "correct" ? (
                  <CheckCircle
                    size={18}
                    style={{ color: "var(--color-teal-dark)", flexShrink: 0 }}
                  />
                ) : (
                  <XCircle
                    size={18}
                    style={{ color: "var(--color-ember)", flexShrink: 0 }}
                  />
                )}
                <span
                  className="text-sm font-500 truncate"
                  style={{
                    color: checking
                      ? "var(--color-ink-muted)"
                      : feedback?.type === "correct"
                        ? "var(--color-teal-dark)"
                        : "var(--color-ember-dark)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {checking ? "Checking your answer…" : feedback?.message}
                </span>
              </div>
              {showNext && (
                <button
                  onClick={handleNext}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm font-700"
                  style={{
                    background: "var(--color-ink)",
                    color: "white",
                    border: "2px solid var(--color-ink)",
                    boxShadow: "2px 2px 0 var(--color-ember)",
                    fontFamily: "var(--font-body)",
                    cursor: "pointer",
                    letterSpacing: "0.02em",
                  }}
                  onMouseDown={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translate(2px, 2px)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "none";
                  }}
                  onMouseUp={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "none";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "2px 2px 0 var(--color-ember)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "none";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "2px 2px 0 var(--color-ember)";
                  }}
                >
                  Next →
                </button>
              )}
            </div>
          )}

          {!submitted && (
            <button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              className="w-full py-4 text-base font-700"
              style={{
                background:
                  selectedOption === null
                    ? "var(--color-cream-dark)"
                    : "var(--color-ink)",
                color:
                  selectedOption === null
                    ? "var(--color-ink-muted)"
                    : "white",
                border: "2px solid var(--color-ink)",
                boxShadow:
                  selectedOption === null
                    ? "none"
                    : "4px 4px 0 var(--color-ember)",
                fontFamily: "var(--font-body)",
                cursor:
                  selectedOption === null ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                letterSpacing: "0.02em",
              }}
              onMouseEnter={(e) => {
                if (selectedOption !== null) {
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "translate(-2px, -2px)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "6px 6px 0 var(--color-ember)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "none";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  selectedOption !== null
                    ? "4px 4px 0 var(--color-ember)"
                    : "none";
              }}
            >
              Submit Answer
            </button>
          )}
        </div>
      </div>
    </>
  );
}