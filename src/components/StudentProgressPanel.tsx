import { useEffect, useState } from "react";
import { useIsCompact } from "../data/useIsCompact";
import { Students, type StudentReport } from "../api/client";
import ProgressRing from "./ProgressRing";
import { Sparkline } from "./Chart";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  ChevronRight,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface DashboardData {
  report: StudentReport | null;
  loading: boolean;
  error: string | null;
}

interface Props {
  studentId: string;
  range: "week" | "month" | "year";
}

export default function StudentProgressPanel({
  studentId,
  range,
}: Props) {
  const isCompact = useIsCompact();
  const [data, setData] = useState<DashboardData>({
    report: null,
    loading: true,
    error: null,
  });
  const [openAttempt, setOpenAttempt] = useState<string | null>(null);

  const fetchReport = () => {
    setData((d) => ({ ...d, loading: true }));
    // Cache-bust so the dev server / browser doesn't serve a stale report
    // when the student returns to /quizzes right after completing a quiz.
    Students.report(studentId, range)
      .then((r) => setData({ report: r, loading: false, error: null }))
      .catch((e) =>
        setData({ report: null, loading: false, error: (e as Error).message }),
      );
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, range]);

  // Also refetch whenever the tab becomes visible again — covers the
  // "completed a quiz, came back to /quizzes" path where the panel was
  // never unmounted but the data is now stale.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchReport();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, range]);

  if (data.loading) {
    return (
      <PanelShell>
        <div className="py-10 text-center" style={{ color: "var(--color-ink-muted)" }}>
          Loading your scores…
        </div>
      </PanelShell>
    );
  }

  if (data.error || !data.report) {
    return (
      <PanelShell>
        <div className="py-10 text-center" style={{ color: "var(--color-ink-muted)" }}>
          {data.error ?? "No progress yet."}
        </div>
      </PanelShell>
    );
  }

  const {
    overallPercent,
    attemptCount,
    trend,
    streakDays,
    mostImprovedChapterName,
    perChapter,
    perLesson,
    scoreHistory,
    recent,
  } = data.report;

  return (
    <PanelShell>
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
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Overall
          </p>
          <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
            last {range}
          </p>
          <div className="flex items-center justify-center gap-2 mt-1 md:justify-start">
            <TrendIndicator trend={trend} />
            {streakDays > 0 && (
              <span
                className="text-xs flex items-center gap-1"
                style={{ color: "var(--color-amber-dark)", fontFamily: "var(--font-body)" }}
                title="Consecutive days with a completed quiz"
              >
                <Flame size={11} style={{ color: "var(--color-amber)" }} />
                {streakDays}-day streak
              </span>
            )}
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

      {mostImprovedChapterName && (
        <div
          className="mb-4 px-3 py-2 text-xs flex items-center gap-2"
          style={{
            background: "var(--color-cream)",
            border: "1px solid var(--color-cream-dark)",
            borderLeft: "3px solid var(--color-ember)",
            color: "var(--color-ink-light)",
            fontFamily: "var(--font-body)",
          }}
        >
          <TrendingUp size={12} style={{ color: "var(--color-ember)" }} />
          Most-improved this period: <strong>{mostImprovedChapterName}</strong>
        </div>
      )}

      <SectionHeader>By Chapter</SectionHeader>
      {perChapter.length === 0 ? (
        <Empty>No chapter scores in this range.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {perChapter.map((c) => (
            <li key={c.chapterId}>
              <ChapterRow
                compact={isCompact}
                chapterName={c.chapterName}
                subject={c.subject}
                percent={c.percent}
                attempts={c.attempts}
                mastery={c.mastery}
                trend={c.trend}
              />
            </li>
          ))}
        </ul>
      )}

      <SectionHeader>By Lesson</SectionHeader>
      {perLesson.length === 0 ? (
        <Empty>No lesson scores in this range.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {perLesson.map((l) => (
            <li key={l.lessonId}>
              <LessonRow
                compact={isCompact}
                lessonTitle={l.lessonTitle}
                chapterName={l.chapterName}
                percent={l.percent}
                attempts={l.attempts}
                mastery={l.mastery}
                trend={l.trend}
              />
            </li>
          ))}
        </ul>
      )}

      <SectionHeader>Recent</SectionHeader>
      {recent.length === 0 ? (
        <Empty>Finish a quiz to see it here.</Empty>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {recent.slice(0, 5).map((r) => {
            const pct = r.total === 0 ? 0 : Math.round((r.score / r.total) * 100);
            const isOpen = openAttempt === r.attemptId;
            return (
              <li
                key={r.attemptId}
                style={{
                  background: "var(--color-cream-dark)",
                  borderLeft: `3px solid ${accentColor(pct)}`,
                }}
              >
                {/* Collapsed row */}
                <button
                  onClick={() => setOpenAttempt(isOpen ? null : r.attemptId)}
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
                    <span className="truncate">{r.quizTitle ?? r.quizId}</span>
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
                {isOpen && (
                  <div
                    className="px-2.5 pb-2.5 flex flex-col gap-1.5"
                    style={{ borderTop: "1px solid rgba(140,112,96,0.25)" }}
                  >
                    <div
                      className="flex items-center justify-between gap-2 py-1.5 px-2 text-xs"
                      style={{ background: "white", border: "1px solid var(--color-cream-dark)" }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        {r.lessonTitle && (
                          <span style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}>
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
                    </div>
                    <div
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 py-1.5 px-2 text-[11px]"
                      style={{ background: "white", border: "1px solid var(--color-cream-dark)" }}
                    >
                      <span className="flex items-center gap-1" style={{ color: "var(--color-ink)", fontFamily: "var(--font-mono)" }}>
                        {r.score}/{r.total} correct
                      </span>
                      <span className="flex items-center gap-1" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
                        <CheckCircle2 size={11} /> {r.firstTryCorrectCount} solved first try
                      </span>
                      <span className="flex items-center gap-1" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
                        <Clock size={11} /> {formatDuration(r.timeSpentSeconds)}
                      </span>
                      <span style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}>
                        {new Date(r.completedAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </PanelShell>
  );
}

function PanelShell({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="p-6"
      style={{
        background: "white",
        border: "2px solid var(--color-cream-dark)",
      }}
    >
      {title && (
        <h2
          className="text-base font-700 mb-4"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-xs font-600 uppercase tracking-wider mt-5 mb-2"
      style={{
        color: "var(--color-ink-muted)",
        fontFamily: "var(--font-body)",
        letterSpacing: "0.1em",
      }}
    >
      {children}
    </h3>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs italic"
      style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
    >
      {children}
    </p>
  );
}

function ChapterRow({
  compact,
  chapterName,
  subject,
  percent,
  attempts,
  mastery,
  trend,
}: {
  compact?: boolean;
  chapterName: string;
  subject: "math" | "physics" | "other";
  percent: number;
  attempts: number;
  mastery: "Strong" | "Getting there" | "Needs practice";
  trend: "improving" | "declining" | "steady";
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-xs font-500 truncate min-w-0"
            style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}
          >
            {chapterName}
          </span>
          {!compact && <MasteryPill label={mastery} />}
        </div>
        <span
          className="text-xs flex items-center gap-1 whitespace-nowrap flex-shrink-0"
          style={{
            color: accentColor(percent),
            fontFamily: "var(--font-mono)",
          }}
        >
          {percent}% · {attempts} attempt{attempts === 1 ? "" : "s"}
          <TrendIcon trend={trend} />
        </span>
      </div>
      <div
        className="h-2 overflow-hidden"
        style={{ background: "var(--color-cream-dark)" }}
      >
        <div
          className="h-full"
          style={{
            width: `${percent}%`,
            background: accentColor(percent),
            transition: "width 0.8s ease",
          }}
        />
      </div>
    </div>
  );
}

function LessonRow({
  compact,
  lessonTitle,
  chapterName,
  percent,
  attempts,
  mastery,
  trend,
}: {
  compact?: boolean;
  lessonTitle: string;
  chapterName: string | null;
  percent: number;
  attempts: number;
  mastery: "Strong" | "Getting there" | "Needs practice";
  trend: "improving" | "declining" | "steady";
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-xs font-500 truncate min-w-0"
            style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}
          >
            {lessonTitle}
          </span>
          {!compact && <MasteryPill label={mastery} />}
          {chapterName && (
            <span
              className="text-[10px] truncate"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
            >
              · {chapterName}
            </span>
          )}
        </div>
        <span
          className="text-xs flex items-center gap-1 whitespace-nowrap flex-shrink-0"
          style={{
            color: accentColor(percent),
            fontFamily: "var(--font-mono)",
          }}
        >
          {percent}% · {attempts} attempt{attempts === 1 ? "" : "s"}
          <TrendIcon trend={trend} />
        </span>
      </div>
      <div
        className="h-2 overflow-hidden"
        style={{ background: "var(--color-cream-dark)" }}
      >
        <div
          className="h-full"
          style={{
            width: `${percent}%`,
            background: accentColor(percent),
            transition: "width 0.8s ease",
          }}
        />
      </div>
    </div>
  );
}

function MasteryPill({ label }: { label: "Strong" | "Getting there" | "Needs practice" }) {
  // Per §6 — tone/shade variation within the ember accent, never traffic-light.
  const tone =
    label === "Strong"
      ? { bg: "#A83A12", text: "#FFF" }
      : label === "Getting there"
        ? { bg: "#E47A55", text: "#1C0F00" }
        : { bg: "#F0C7B5", text: "#4A3520" };
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
  );
}

function TrendIndicator({ trend }: { trend: "improving" | "declining" | "steady" }) {
  if (trend === "improving")
    return (
      <span className="flex items-center gap-1" style={{ color: "var(--color-ember-dark)" }}>
        <TrendingUp size={11} /> improving
      </span>
    );
  if (trend === "declining")
    return (
      <span className="flex items-center gap-1" style={{ color: "var(--color-ink-muted)" }}>
        <TrendingDown size={11} /> slipping
      </span>
    );
  return (
    <span className="flex items-center gap-1" style={{ color: "var(--color-ink-muted)" }}>
      <Minus size={11} /> steady
    </span>
  );
}

function TrendIcon({ trend }: { trend: "improving" | "declining" | "steady" }) {
  const Icon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;
  return <Icon size={10} style={{ marginLeft: 2 }} />;
}

// Three-tier color hint: orange (needs work) → amber/yellow (okay) → teal
// (strong). All three are already in the brand palette so the bar/ring
// never reads as a harsh red/yellow/green traffic light.
export function accentColor(percent: number): string {
  if (percent >= 80) return "#0D6E6E"; // teal — strong
  if (percent >= 60) return "#F0A500"; // amber — okay
  return "#D94F1E"; // orange — needs work
}

function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}