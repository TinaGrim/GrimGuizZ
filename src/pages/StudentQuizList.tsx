import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../store/AppContext";
import {
  CheckCircle,
  Clock,
  Lock,
  ChevronRight,
  Star,
  LogOut,
} from "lucide-react";
import type { Quiz } from "../data/types";
import StudentProgressPanel from "../components/StudentProgressPanel";
import MessagesPanel from "../components/MessagesPanel";

const STATUS_CONFIG = {
  active: { label: "Available", color: "var(--color-teal)", bg: "#E6F5F5" },
  scheduled: { label: "Upcoming", color: "var(--color-amber-dark)", bg: "#FFF8E6", icon: Lock },
  draft: { label: "Draft", color: "var(--color-ink-muted)", bg: "var(--color-cream-dark)", icon: Lock },
  closed: { label: "Closed", color: "var(--color-ink-muted)", bg: "var(--color-cream-dark)", icon: null },
  archived: { label: "Archived", color: "var(--color-ink-muted)", bg: "var(--color-cream-dark)", icon: null },
};

export default function StudentQuizList() {
  const navigate = useNavigate();
  const {
    currentStudent,
    logoutStudent,
    chapters,
    lessons,
    quizzes,
    messages,
    selectQuiz,
  } = useApp();
  const [range, setRange] = useState<"week" | "month" | "year">("month");

  useEffect(() => {
    if (!currentStudent) navigate("/");
  }, [currentStudent, navigate]);

  if (!currentStudent) return null;

  const handleSelectQuiz = (quiz: Quiz) => {
    if (quiz.status !== "active") return;
    selectQuiz(quiz.id);
    navigate(`/quiz/${quiz.id}/pre`);
  };

  // Group by chapter → lesson
  const grouped = chapters
    .map((c) => {
      const chapterLessons = lessons.filter((l) => l.chapterId === c.id);
      const chapterQuizzes: { lesson: typeof chapterLessons[number]; quiz: Quiz }[] = [];
      for (const l of chapterLessons) {
        for (const qid of l.quizIds ?? []) {
          const q = quizzes.find((qq) => qq.id === qid);
          if (q && q.status !== "archived") chapterQuizzes.push({ lesson: l, quiz: q });
        }
      }
      return { chapter: c, items: chapterQuizzes };
    })
    .filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream)" }}>
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
            style={{ fontFamily: "var(--font-display)", color: "var(--color-amber)" }}
          >
            Quiz<span style={{ fontSize: "1.2em", lineHeight: 1 }}>Z</span>
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
            logoutStudent();
            navigate("/");
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

      {/* ─── Mobile: Progress on top, then Messages, then Quiz list ─── */}
      <div className="md:hidden flex flex-col gap-5 px-5 py-6 max-w-3xl mx-auto">
        <h2
          className="text-lg font-700"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-ink)",
          }}
        >
          Your Progress
        </h2>
        <StudentProgressPanel
          studentId={currentStudent.id}
          range={range}
        />
        <h2
          className="text-lg font-700"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-ink)",
          }}
        >
          Message
        </h2>
        <MessagesPanel messages={messages} variant="full" />
        <QuizList
          grouped={grouped}
          quizzes={quizzes}
          onSelect={handleSelectQuiz}
        />
      </div>

      {/* ─── Desktop order per §5.1: Progress | Messages, Quiz list below ─── */}
      <div className="hidden md:block max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2
                className="text-lg font-700"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-ink)",
                }}
              >
                Your Progress
              </h2>
              <RangePicker value={range} onChange={setRange} />
            </div>
            <StudentProgressPanel
              studentId={currentStudent.id}
              range={range}
            />
          </div>
          <div className="flex flex-col gap-4">
            <h2
              className="text-lg font-700"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-ink)",
              }}
            >
              Message
            </h2>
            <MessagesPanel messages={messages} variant="full" />
          </div>
        </div>

        <QuizList
          grouped={grouped}
          quizzes={quizzes}
          onSelect={handleSelectQuiz}
        />
      </div>
    </div>
  );
}

function RangePicker({
  value,
  onChange,
}: {
  value: "week" | "month" | "year";
  onChange: (v: "week" | "month" | "year") => void;
}) {
  const opts: ("week" | "month" | "year")[] = ["week", "month", "year"];
  return (
    <div
      className="flex text-xs"
      style={{ border: "1px solid var(--color-cream-dark)" }}
    >
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className="px-3 py-1.5"
          style={{
            background: value === o ? "var(--color-ink)" : "transparent",
            color: value === o ? "var(--color-cream)" : "var(--color-ink-muted)",
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
  );
}

function QuizList({
  grouped,
  onSelect,
}: {
  grouped: { chapter: { id: string; name: string }; items: { lesson: { id: string; title: string }; quiz: Quiz }[] }[];
  quizzes: Quiz[];
  onSelect: (q: Quiz) => void;
}) {
  if (grouped.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center"
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
          Your teacher hasn't assigned any quizzes to your account yet. Check
          back soon.
        </p>
      </div>
    );
  }

  return (
    <section>
      <h2
        className="text-lg font-700 mb-4"
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--color-ink)",
        }}
      >
        Your Quizzes
      </h2>
      <div className="flex flex-col gap-8">
        {grouped.map(({ chapter, items }, ci) => (
          <div key={chapter.id}>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-7 h-7 flex items-center justify-center text-xs font-700"
                style={{
                  background: "var(--color-ember)",
                  color: "#fff",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {ci + 1}
              </div>
              <h3
                className="text-lg font-700"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-ink)",
                }}
              >
                {chapter.name}
              </h3>
              <div
                className="flex-1 h-px"
                style={{ background: "var(--color-cream-dark)" }}
              />
            </div>

            <div
              className="flex flex-col gap-3 pl-4"
              style={{ borderLeft: "2px solid var(--color-cream-dark)" }}
            >
              {items.map(({ lesson: l, quiz }) => (
                <div key={quiz.id} className="ml-4">
                  <p
                    className="text-xs font-600 uppercase tracking-wider mb-2"
                    style={{
                      color: "var(--color-ink-muted)",
                      fontFamily: "var(--font-body)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {l.title}
                  </p>
                  <QuizCard quiz={quiz} onClick={() => onSelect(quiz)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuizCard({ quiz, onClick }: { quiz: Quiz; onClick: () => void }) {
  const cfg = STATUS_CONFIG[quiz.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = (cfg as { icon?: typeof Lock }).icon;
  const isActive = quiz.status === "active";
  // If the student has completed the quiz at least once, surface a "Done"
  // label rather than the raw "Available" status.
  const isDone =
    quiz.bestScore !== null && quiz.bestScore !== undefined;
  const displayLabel = isDone ? "Done" : cfg.label;
  const displayColor = isDone
    ? "var(--color-teal-dark)"
    : cfg.color;
  const displayBg = isDone ? "#E6F5F5" : cfg.bg;
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-4 mb-2"
      style={{
        background: "white",
        border: "2px solid var(--color-cream-dark)",
        cursor: isActive ? "pointer" : "default",
        transition: "all 0.15s",
        boxShadow: "2px 2px 0 var(--color-cream-dark)",
      }}
      onMouseEnter={(e) => {
        if (isActive) {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-ink)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "4px 4px 0 var(--color-ink)";
          (e.currentTarget as HTMLDivElement).style.transform = "translate(-2px, -2px)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-cream-dark)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "2px 2px 0 var(--color-cream-dark)";
        (e.currentTarget as HTMLDivElement).style.transform = "none";
      }}
    >
      <div className="flex items-start gap-3 flex-1">
        <div className="flex flex-col gap-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
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
              className="text-xs px-2 py-0.5 font-500 flex items-center gap-1"
              style={{
                background: displayBg,
                color: displayColor,
                border: `1px solid ${displayColor}`,
                fontFamily: "var(--font-body)",
              }}
            >
              {StatusIcon && <StatusIcon size={10} />}
              {displayLabel}
            </span>
          </div>

          {/* Schedule — "Closes Mar 14, 9:00 AM" or "Opens Mar 12, 1:00 PM" */}
          {quiz.scheduledEnd && (
            <div
              className="flex items-center gap-1.5 mt-0.5"
              style={{
                color:
                  quiz.status === "closed"
                    ? "var(--color-ink-muted)"
                    : "var(--color-ink-light)",
                fontFamily: "var(--font-body)",
              }}
            >
              <Clock size={11} style={{ flexShrink: 0 }} />
              <span className="text-xs">
                {quiz.status === "scheduled" && quiz.scheduledStart
                  ? `Opens ${formatSchedule(quiz.scheduledStart)}`
                  : `Closes ${formatSchedule(quiz.scheduledEnd)}`}
              </span>
            </div>
          )}

          {quiz.bestScore !== null && quiz.bestScore !== undefined && (
            <div className="flex items-center gap-1 mt-0.5">
              <Star
                size={12}
                style={{ color: "var(--color-amber)" }}
                fill="var(--color-amber)"
              />
              <span
                className="text-xs font-600"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Best: {quiz.bestScore}%
              </span>
              <Clock
                size={12}
                style={{ color: "var(--color-ink-muted)", marginLeft: 8 }}
              />
              <span
                className="text-xs"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {quiz.questionPoolIds.length} questions in pool
              </span>
            </div>
          )}
        </div>
      </div>
      {isActive && (
        <ChevronRight
          size={18}
          style={{ color: "var(--color-ink-muted)", flexShrink: 0 }}
        />
      )}
    </div>
  );
}

function formatSchedule(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// Status keys used elsewhere
void CheckCircle;