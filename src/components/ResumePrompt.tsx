import { useNavigate } from "react-router";
import { useApp } from "../store/AppContext";
import { RotateCcw, Trash2 } from "lucide-react";

export default function ResumePrompt() {
  const { pendingResume, loadResume, clearResume } = useApp();
  const navigate = useNavigate();

  if (!pendingResume) return null;

  const handleContinue = () => {
    const attempt = pendingResume;
    loadResume(attempt);
    navigate(`/quiz/${attempt.quizId}/question`);
  };

  const handleCancel = async () => {
    await clearResume();
    navigate("/quizzes");
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: "rgba(28, 15, 0, 0.6)", backdropFilter: "blur(2px)" }}
      onClick={handleCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-6"
        style={{
          background: "white",
          border: "3px solid var(--color-ink)",
          boxShadow: "6px 6px 0 var(--color-amber)",
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              background: "var(--color-amber)",
              color: "#fff",
            }}
          >
            <RotateCcw size={18} />
          </div>
          <div className="flex-1">
            <h2
              className="text-base font-700 mb-1"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-ink)",
              }}
            >
              You left a quiz unfinished
            </h2>
            <p
              className="text-sm leading-relaxed"
              style={{
                color: "var(--color-ink-light)",
                fontFamily: "var(--font-body)",
              }}
            >
              {pendingResume.quizTitle ?? "A quiz"} ·{" "}
              {pendingResume.currentHistory.length + 1} of{" "}
              {pendingResume.questionsServed.length} question
              {pendingResume.questionsServed.length === 1 ? "" : "s"}. Want to
              pick up where you left off?
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 text-sm font-600"
            style={{
              background: "var(--color-cream-dark)",
              border: "2px solid var(--color-cream-dark)",
              color: "var(--color-ink-muted)",
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              borderRadius: 0,
            }}
          >
            <Trash2 size={14} />
            Cancel &amp; start over
          </button>
          <button
            onClick={handleContinue}
            className="flex items-center gap-2 px-4 py-2 text-sm font-700"
            style={{
              background: "var(--color-teal-dark)",
              border: "2px solid var(--color-ink)",
              color: "#fff",
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              boxShadow: "2px 2px 0 var(--color-ink)",
              borderRadius: 0,
            }}
          >
            <RotateCcw size={14} />
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
