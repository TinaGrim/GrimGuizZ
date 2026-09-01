import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useApp } from "../store/AppContext";
import { ArrowLeft, Dices } from "lucide-react";

export default function PreQuiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { currentStudent, quizzes, lessons, chapters } = useApp();

  useEffect(() => {
    if (!currentStudent) navigate("/");
  }, [currentStudent, navigate]);

  const quiz = quizzes.find((q) => q.id === quizId);
  const lesson = quiz ? lessons.find((l) => l.id === quiz.lessonId) : undefined;
  const chapter = lesson ? chapters.find((c) => c.id === lesson.chapterId) : undefined;

  if (!quiz || !currentStudent) return null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-cream)" }}
    >
      <div
        className="h-2"
        style={{
          background:
            "repeating-linear-gradient(90deg, #D94F1E 0px, #D94F1E 30px, #F0A500 30px, #F0A500 60px, #0D6E6E 60px, #0D6E6E 90px, #1C0F00 90px, #1C0F00 105px)",
        }}
      />

      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--color-cream-dark)" }}
      >
        <button
          onClick={() => navigate("/quizzes")}
          className="flex items-center gap-2 text-sm font-500"
          style={{
            color: "var(--color-ink-muted)",
            fontFamily: "var(--font-body)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={16} />
          Back to quizzes
        </button>
        <span
          className="text-sm"
          style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
        >
          {currentStudent.name}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          {chapter && lesson && (
            <p
              className="text-xs font-500 uppercase tracking-wider mb-4"
              style={{
                color: "var(--color-ink-muted)",
                fontFamily: "var(--font-body)",
                letterSpacing: "0.12em",
              }}
            >
              {chapter.name} / {lesson.title}
            </p>
          )}

          <div
            className="p-8 mb-8"
            style={{
              background: "var(--color-ink)",
              border: "2px solid var(--color-ink)",
              boxShadow: "6px 6px 0 var(--color-ember)",
            }}
          >
            <p
              className="text-xs font-600 uppercase tracking-wider mb-3"
              style={{
                color: "var(--color-ember)",
                fontFamily: "var(--font-body)",
                letterSpacing: "0.12em",
              }}
            >
              Quiz
            </p>
            <h1
              className="font-900 leading-tight"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-amber)",
                fontSize: "clamp(2rem, 4vw, 2.8rem)",
              }}
            >
              {quiz.title}
            </h1>
          </div>

          <button
            onClick={() => navigate(`/quiz/${quizId}/spin`)}
            className="w-full flex items-center justify-center gap-3 py-4 text-lg font-700"
            style={{
              background: "var(--color-ember)",
              color: "#fff",
              border: "3px solid var(--color-ink)",
              boxShadow: "6px 6px 0 var(--color-ink)",
              fontFamily: "var(--font-display)",
              cursor: "pointer",
              transition: "all 0.15s",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translate(-3px, -3px)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "9px 9px 0 var(--color-ink)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "none";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "6px 6px 0 var(--color-ink)";
            }}
          >
            <Dices size={22} />
            Spin the Wheel
          </button>
        </div>
      </div>
    </div>
  );
}