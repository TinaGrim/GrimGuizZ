import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { useApp } from "../store/AppContext";
import StudentTopBar from "../components/StudentTopBar";
import StudentAvatar from "../components/StudentAvatar";
import FadeUp from "../components/FadeUp";
import { Clock, Lock, ChevronRight, Star } from "lucide-react";
import type { Quiz } from "../data/types";
import StudentProgressPanel from "../components/StudentProgressPanel";
import MessagesPanel from "../components/MessagesPanel";

const QUIZ_LIST_SCROLL_KEY = "quizzz:quizListScrollY";

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

  useEffect(() => {
    if (!currentStudent) navigate("/");
  }, [currentStudent, navigate]);

  // Track the list's scroll continuously (rAF-throttled) so "previous
  // position" means where the student was reading, not where the tapped card
  // happens to sit. Only restores when they actually left into a quiz.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        sessionStorage.setItem(
          QUIZ_LIST_SCROLL_KEY,
          JSON.stringify({ y: window.scrollY, leaving: false }),
        );
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Restore the spot the student left from when they went into a quiz, then
  // clear it so a fresh visit starts at the top again.
  useEffect(() => {
    const raw = sessionStorage.getItem(QUIZ_LIST_SCROLL_KEY);
    sessionStorage.removeItem(QUIZ_LIST_SCROLL_KEY);
    if (!raw) return;
    try {
      const { y, leaving } = JSON.parse(raw) as { y: number; leaving: boolean };
      if (leaving && y > 0) window.scrollTo(0, y);
    } catch {
      // malformed/stale — treat as a fresh visit
    }
  }, []);

  if (!currentStudent) return null;

  const handleLeave = () => {
    logoutStudent();
    navigate("/");
  };

  const handleSelectQuiz = (quiz: Quiz) => {
    if (quiz.status !== "active") return;
    sessionStorage.setItem(
      QUIZ_LIST_SCROLL_KEY,
      JSON.stringify({ y: window.scrollY, leaving: true }),
    );
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
      <StudentTopBar kind="home" studentName={currentStudent.name} onLeave={handleLeave} />

      {/* Single responsive layout — one tree for every breakpoint (the old
          dual md:hidden / hidden md:block branches were identical to the
          pixel, and duplicated the lesson anchors the progress panel flashes). */}
      <div className="max-w-5xl lg:max-w-6xl mx-auto px-4 py-4 md:px-6 md:py-8 flex flex-col gap-5 md:gap-8">
        <FadeUp className="flex items-center gap-4">
          <StudentAvatar name={currentStudent.name} size={56} />
          <div>
            <p
              className="font-900 leading-none"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-ink)",
                fontSize: "clamp(1.25rem, 4vw, 1.6rem)",
              }}
            >
              Hi, {currentStudent.name.split(" ")[0]}!
            </p>
            <p className="mt-1.5 text-sm" style={{ color: "var(--color-ink-muted)" }}>
              Pick a quiz and keep the streak going
            </p>
          </div>
        </FadeUp>

        {/* Progress | Messages — side-by-side from md up (noted order §5.1),
            stacked below it the quiz list. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          <section className="flex flex-col gap-3">
            <SectionHeading>Your Progress</SectionHeading>
            <StudentProgressPanel studentId={currentStudent.id} />
          </section>
          <section className="flex flex-col gap-3">
            <SectionHeading>Message</SectionHeading>
            <MessagesPanel messages={messages} variant="full" cap={260} />
          </section>
        </div>

        <QuizList grouped={grouped} onSelect={handleSelectQuiz} />
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-lg font-700 flex items-center gap-2"
      style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
    >
      {children}
    </h2>
  );
}

// Lesson groups can hold several quiz cards; collect them under one anchor
// (`lesson-{id}`) so the progress panel can scroll to + flash the right spot.
function groupByLesson(
  items: { lesson: { id: string; title: string }; quiz: Quiz }[],
): { lesson: { id: string; title: string }; quizzes: { quiz: Quiz }[] }[] {
  const seen = new Map<string, { lesson: { id: string; title: string }; quizzes: { quiz: Quiz }[] }>();
  for (const item of items) {
    const cur = seen.get(item.lesson.id) ?? {
      lesson: item.lesson,
      quizzes: [] as { quiz: Quiz }[],
    };
    cur.quizzes.push({ quiz: item.quiz });
    seen.set(item.lesson.id, cur);
  }
  return [...seen.values()];
}

function QuizList({
  grouped,
  onSelect,
}: {
  grouped: { chapter: { id: string; name: string }; items: { lesson: { id: string; title: string }; quiz: Quiz }[] }[];
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
        id="quiz-list-anchor"
        className="text-lg font-700 mb-4 flex items-center gap-2"
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--color-ink)",
        }}
      >
        Your Quizzes
      </h2>
      <div className="flex flex-col gap-8">
        {grouped.map(({ chapter, items }, ci) => (
          <FadeUp key={chapter.id} delay={ci * 0.06}>
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
              {groupByLesson(items).map(({ lesson: l, quizzes: lessonQuizzes }) => (
                <div key={l.id} id={`lesson-${l.id}`} className="ml-4">
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
                  {lessonQuizzes.map(({ quiz }, qi) => (
                    <QuizCard
                      key={quiz.id}
                      quiz={quiz}
                      index={qi}
                      onClick={() => onSelect(quiz)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

function QuizCard({ quiz, onClick, index }: { quiz: Quiz; onClick: () => void; index: number }) {
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
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.05,
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={
        isActive
          ? { x: -2, y: -2, boxShadow: "4px 4px 0 var(--color-ink)", borderColor: "var(--color-ink)" }
          : {}
      }
      whileTap={isActive ? { scale: 0.99 } : {}}
      className="flex items-center justify-between p-3 mb-2 md:p-4"
      style={{
        background: "white",
        border: "2px solid var(--color-cream-dark)",
        cursor: isActive ? "pointer" : "default",
        boxShadow: "2px 2px 0 var(--color-cream-dark)",
      }}
    >
      <div className="flex-1 min-w-0">
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
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span
              className="text-xs flex items-center gap-1"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
            >
              <Star
                size={12}
                style={{ color: "var(--color-amber)" }}
                fill="var(--color-amber)"
              />
              <span className="font-600" style={{ fontFamily: "var(--font-mono)" }}>
                Best: {quiz.bestScore}%
              </span>
            </span>
            <span
              className="text-xs flex items-center gap-1"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
            >
              <Clock size={11} style={{ color: "var(--color-ink-muted)" }} />
              {quiz.questionPoolIds.length} questions in pool
            </span>
          </div>
        )}
      </div>
      {quiz.lastScore !== null && quiz.lastScore !== undefined && (
        <div
          className="flex flex-col items-center px-4 py-1.5 flex-shrink-0"
          style={{
            background: "var(--color-cream)",
            border: "1px solid var(--color-cream-dark)",
          }}
        >
          <span
            className="text-[9px] uppercase"
            style={{
              color: "var(--color-ink-muted)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.1em",
            }}
          >
            Last
          </span>
          <span
            className="text-lg font-900 leading-none"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}
          >
            {quiz.lastScore}%
          </span>
        </div>
      )}
      {isActive && (
        <ChevronRight
          size={18}
          style={{ color: "var(--color-ink-muted)", flexShrink: 0 }}
        />
      )}
    </motion.div>
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