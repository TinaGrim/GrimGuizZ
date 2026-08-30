import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useApp } from "../store/AppContext";
import TrollVideoModal from "../components/TrollVideoModal";
import { CheckCircle, XCircle } from "lucide-react";

type OptionState = "default" | "selected" | "correct" | "wrong";

export default function QuestionScreen() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const {
    currentStudent,
    questionsServed,
    currentQuestionIndex,
    currentTries,
    submitAnswer,
    advanceQuestion,
    completeQuiz,
  } = useApp();

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [optionStates, setOptionStates] = useState<OptionState[]>(["default", "default", "default", "default"]);
  const [feedback, setFeedback] = useState<{ type: "wrong" | "correct"; message: string } | null>(null);
  const [showTroll, setShowTroll] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [advancing, setAdvancing] = useState(false);

  const question = questionsServed[currentQuestionIndex];

  useEffect(() => {
    if (!currentStudent || questionsServed.length === 0) {
      navigate("/");
      return;
    }
    // Reset state for each new question
    setSelectedOption(null);
    setOptionStates(["default", "default", "default", "default"]);
    setFeedback(null);
    setSubmitted(false);
    setCorrectIndex(null);
    setAdvancing(false);
  }, [currentQuestionIndex, currentStudent, questionsServed, navigate]);

  // Block browser back-button during quiz
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedOption === null || submitted) return;

    const { correct, tries, shouldTroll } = submitAnswer(question.id, selectedOption);
    setSubmitted(true);

    const newStates: OptionState[] = ["default", "default", "default", "default"];

    if (correct) {
      newStates[selectedOption] = "correct";
      setOptionStates(newStates);
      setFeedback({ type: "correct", message: "That's the one!" });
      setCorrectIndex(selectedOption);

      setTimeout(() => {
        advance();
      }, 1200);
    } else {
      newStates[selectedOption] = "wrong";
      setOptionStates(newStates);
      setShakeKey((k) => k + 1);

      if (shouldTroll) {
        // Show troll video before marking wrong and moving on
        setTimeout(() => {
          setShowTroll(true);
        }, 400);
      } else {
        const msg =
          tries === 1
            ? "Not quite — try again!"
            : "So close — one more try!";
        setFeedback({ type: "wrong", message: msg });

        // Re-enable for next try
        setTimeout(() => {
          setSubmitted(false);
          setSelectedOption(null);
          // Keep wrong option marked
        }, 600);
      }
    }
  }, [selectedOption, submitted, submitAnswer, question]);

  const advance = useCallback(() => {
    if (advancing) return;
    setAdvancing(true);
    const isLast = currentQuestionIndex >= questionsServed.length - 1;
    if (isLast) {
      const result = completeQuiz();
      navigate(`/quiz/${quizId}/results`, { state: result });
    } else {
      advanceQuestion();
    }
  }, [advancing, currentQuestionIndex, questionsServed.length, completeQuiz, navigate, quizId, advanceQuestion]);

  const handleTrollClose = () => {
    setShowTroll(false);
    // Show correct answer
    const newStates: OptionState[] = ["default", "default", "default", "default"];
    newStates[selectedOption!] = "wrong";
    newStates[question.correctOptionIndex] = "correct";
    setOptionStates(newStates);
    setCorrectIndex(question.correctOptionIndex);
    setFeedback({ type: "wrong", message: "Marked wrong. The correct answer is highlighted below." });

    setTimeout(() => advance(), 1800);
  };

  if (!question) return null;

  const isLast = currentQuestionIndex >= questionsServed.length - 1;

  return (
    <>
      {showTroll && <TrollVideoModal onClose={handleTrollClose} />}

      <div
        className="min-h-screen flex flex-col"
        style={{ background: "var(--color-cream)" }}
      >
        {/* Progress header */}
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
              style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-body)" }}
            >
              Question {currentQuestionIndex + 1} of {questionsServed.length}
            </span>

            {/* Progress bar */}
            <div className="flex-1 mx-6 h-2 overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
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

          {/* Attempt pips */}
          <div className="max-w-3xl mx-auto flex items-center gap-2 mt-2">
            <span
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)" }}
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
          {/* Question image */}
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

          {/* Question prompt */}
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
              {question.prompt}
            </p>
          </div>

          {/* Options */}
          <div key={shakeKey} className="flex flex-col gap-3">
            {question.options.map((option, i) => {
              const state = optionStates[i];
              const isDisabled = submitted && state === "default";

              return (
                <div
                  key={i}
                  onClick={() => {
                    if (isDisabled || submitted) return;
                    setSelectedOption(i);
                    const next: OptionState[] = ["default", "default", "default", "default"];
                    next[i] = "selected";
                    setOptionStates(next);
                  }}
                  className={`quiz-option flex items-center gap-4 p-4 ${state === "wrong" ? "animate-shake" : ""} ${isDisabled ? "disabled" : ""}`}
                  style={{
                    ...(state === "selected" && { borderColor: "var(--color-ink)", background: "var(--color-cream)" }),
                    ...(state === "correct" && { borderColor: "var(--color-success)", background: "#EEF8EF" }),
                    ...(state === "wrong" && { borderColor: "var(--color-danger)", background: "#FDECEA" }),
                  }}
                >
                  {/* Option letter */}
                  <div
                    className="shrink-0 flex items-center justify-center text-sm font-700"
                    style={{
                      width: 32,
                      height: 32,
                      background:
                        state === "correct"
                          ? "var(--color-success)"
                          : state === "wrong"
                            ? "var(--color-danger)"
                            : state === "selected"
                              ? "var(--color-ink)"
                              : "var(--color-cream-dark)",
                      color:
                        state === "correct" || state === "wrong" || state === "selected"
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
                    style={{ fontFamily: "var(--font-body)", color: "var(--color-ink)" }}
                  >
                    {option}
                  </span>

                  {state === "correct" && (
                    <CheckCircle size={18} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                  )}
                  {state === "wrong" && (
                    <XCircle size={18} style={{ color: "var(--color-danger)", flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              key={feedback.message}
              className="flex items-center gap-3 px-5 py-3.5 animate-slide-up"
              style={{
                background: feedback.type === "correct" ? "#EEF8EF" : "#FDECEA",
                border: `2px solid ${feedback.type === "correct" ? "var(--color-success)" : "var(--color-danger)"}`,
                borderLeft: `5px solid ${feedback.type === "correct" ? "var(--color-success)" : "var(--color-danger)"}`,
              }}
            >
              {feedback.type === "correct" ? (
                <CheckCircle size={18} style={{ color: "var(--color-success)", flexShrink: 0 }} />
              ) : (
                <XCircle size={18} style={{ color: "var(--color-danger)", flexShrink: 0 }} />
              )}
              <span
                className="text-sm font-500"
                style={{
                  color: feedback.type === "correct" ? "var(--color-success)" : "var(--color-danger)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {feedback.message}
              </span>
            </div>
          )}

          {/* Submit / Next button */}
          {!submitted && (
            <button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              className="w-full py-4 text-base font-700"
              style={{
                background: selectedOption === null ? "var(--color-cream-dark)" : "var(--color-ink)",
                color: selectedOption === null ? "var(--color-ink-muted)" : "white",
                border: "2px solid var(--color-ink)",
                boxShadow: selectedOption === null ? "none" : "4px 4px 0 var(--color-ember)",
                fontFamily: "var(--font-body)",
                cursor: selectedOption === null ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                letterSpacing: "0.02em",
              }}
              onMouseEnter={(e) => {
                if (selectedOption !== null) {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translate(-2px, -2px)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "6px 6px 0 var(--color-ember)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "none";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  selectedOption !== null ? "4px 4px 0 var(--color-ember)" : "none";
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
