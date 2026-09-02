import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../../store/AppContext";
import { Teacher, type ClassReport, type StudentReport, type ClassStudent } from "../../api/client";
import {
  ArrowRight,
  ChevronRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { MiniBar } from "../../components/Chart";
import { accentColor } from "../../components/StudentProgressPanel";
import { Hoverable } from "../../components/AdminHoverable";

export default function AdminDashboard() {
  const { quizzes, students, teacherName } = useApp();
  const navigate = useNavigate();
  const [classReport, setClassReport] = useState<ClassReport | null>(null);
  const [attention, setAttention] = useState<StudentReport[]>([]);
  const [openStudentId, setOpenStudentId] = useState<string | null>(null);
  const [range] = useState<"week" | "month" | "year">("month");

  useEffect(() => {
    let cancelled = false;
    Teacher.classReport(range)
      .then((r) => {
        if (!cancelled) setClassReport(r);
      })
      .catch((e) => console.warn("classReport", e));

    // Per-student detail reports fetched in parallel — doing these
    // sequentially made the dashboard wait one round-trip per student.
    Promise.all(
      students.map((s) =>
        Teacher.studentReport(s.id, range).catch(() => null),
      ),
    )
      .then((reports) => {
        if (cancelled) return;
        const out = reports
          .filter((r): r is StudentReport => r !== null && r.attemptCount > 0)
          .sort((a, b) => a.overallPercent - b.overallPercent);
        setAttention(
          out
            .filter((r) => (r.student?.status ?? "on_track") === "needs_attention")
            .slice(0, 4),
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [students, range]);

  return (
    <div className="px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="font-900 text-3xl mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Dashboard
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
          >
            {teacherName ? `Welcome back, ${teacherName}.` : "Math & Physics overview"}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Students"
          value={String(classReport?.totalStudents ?? students.length)}
          sub={`${classReport?.students?.filter((s) => s.attemptCount > 0).length ?? 0} active this period`}
          bg="#E6F5F5"
          color="var(--color-teal-dark)"
        />
        <StatCard
          label="Attempts logged"
          value={String(
            (classReport?.students ?? []).reduce((n, s) => n + s.attemptCount, 0),
          )}
          sub={`across ${quizzes.filter((q) => q.status === "active").length} active quizzes`}
          bg="#FDECEA"
          color="var(--color-ember)"
        />
        <StatCard
          label="Questions answered"
          value={String(
            (classReport?.students ?? []).reduce(
              (n, s) => n + (s.firstTryQuestions ?? 0),
              0,
            ),
          )}
          sub="first-try attempts across the class"
          bg="var(--color-cream-dark)"
          color="var(--color-ink)"
        />
        <StatCard
          label="Solved first try"
          value={String(
            (classReport?.students ?? []).reduce(
              (n, s) => n + (s.firstTryCorrectCount ?? 0),
              0,
            ),
          )}
          sub="answered correctly on the first pick"
          bg="#FFF8E6"
          color="var(--color-amber-dark)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Subject × Chapter overview */}
        <div
          className="p-5"
          style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
        >
          <h2
            className="text-base font-700 mb-3"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Subjects at a glance
          </h2>
          {classReport && classReport.perLessonDifficulty.length > 0 ? (
            <SubjectOverview
              bySubject={groupLessonsBySubject(
                classReport.perLessonDifficulty,
              )}
            />
          ) : (
            <Empty>No quiz attempts yet.</Empty>
          )}
        </div>

        {/* Per-lesson difficulty */}
        <div
          className="p-5"
          style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-base font-700"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
            >
              Hardest lessons
            </h2>
            <span
              className="text-xs"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}
            >
              by first-try rate
            </span>
          </div>
          {classReport && classReport.perLessonDifficulty.length > 0 ? (
            <ol className="flex flex-col gap-2">
              {classReport.perLessonDifficulty.slice(0, 5).map((l, i) => (
                <li key={l.lessonId}>
                  <Hoverable
                    disabled
                    className="flex items-center gap-3 px-3 py-2"
                    style={{
                      background: "var(--color-cream)",
                      borderLeft: `4px solid ${accentColor(l.firstTryCorrectRate * 100)}`,
                    }}
                  >
                    <span
                      className="text-xs font-700 w-5"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--color-ink-muted)",
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-500 truncate"
                        style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}
                      >
                        {l.lessonTitle}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
                      >
                        {l.chapterName} · {l.attempts} attempt{l.attempts === 1 ? "" : "s"}
                      </p>
                    </div>
                    <MasteryBadge label={l.firstTryCorrectRateLabel} />
                  </Hoverable>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>No completed lessons yet.</Empty>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Needs attention */}
        <div
          className="p-5"
          style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
        >
          <h2
            className="text-base font-700 mb-3"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Needs attention
          </h2>
          {attention.length === 0 ? (
            <div
              className="py-8 text-center"
              style={{ border: "2px dashed var(--color-cream-dark)" }}
            >
              <p
                className="text-sm font-500"
                style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
              >
                All students on track.
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
              >
                Recent trend above the falling-behind threshold.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {attention.map((r) => (
                <li key={r.student!.id}>
                  <Hoverable
                    className="flex items-center justify-between p-3"
                    fullBorder
                    style={{
                      background: "var(--color-cream)",
                      borderLeft: "4px solid var(--color-ember)",
                    }}
                    onClick={() => navigate("/admin/panel/students")}
                  >
                    <div>
                      <p
                        className="text-sm font-600"
                        style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}
                      >
                        {r.student!.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
                      >
                        {r.attemptCount} attempt{r.attemptCount === 1 ? "" : "s"} ·{" "}
                        {r.recent.length > 0
                          ? `last ${r.recent[0].firstTryCorrectCount}/${r.recent[0].total} first try`
                          : "no recent activity"}
                      </p>
                    </div>
                    <span
                      className="text-xs font-700 px-2 py-1"
                      style={{
                        background: "var(--color-ember)",
                        color: "white",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {r.attemptCount} attempt{r.attemptCount === 1 ? "" : "s"}
                    </span>
                  </Hoverable>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Engagement drop-off */}
        <div
          className="p-5"
          style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
        >
          <h2
            className="text-base font-700 mb-3"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Quiet recently
          </h2>
          {classReport && classReport.engagementDropOff.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {classReport.engagementDropOff.map((d) => (
                <li key={d.studentId}>
                  <Hoverable
                    className="flex items-center justify-between px-3 py-2"
                    style={{ background: "var(--color-cream)" }}
                    onClick={() => navigate("/admin/panel/students")}
                  >
                    <div>
                      <p
                        className="text-sm font-500"
                        style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}
                      >
                        {d.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
                      >
                        last active {new Date(d.lastActiveAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className="text-xs font-700"
                      style={{
                        color: "var(--color-ember)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {d.daysSince}d
                    </span>
                  </Hoverable>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No drop-off detected — every active student has a recent attempt.</Empty>
          )}
        </div>
      </div>

      {/* Recent attempts */}
      <div
        className="p-5 mb-6"
        style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-base font-700"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Recent attempts
          </h2>
          <button
            onClick={() => navigate("/admin/panel/reports")}
            className="flex items-center gap-1 text-xs"
            style={{
              color: "var(--color-ember-dark)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            Open reports <ArrowRight size={11} />
          </button>
        </div>
        {classReport && classReport.students.length > 0 ? (
          <RecentAttempts
            students={classReport.students}
            openStudentId={openStudentId}
            onToggle={setOpenStudentId}
          />
        ) : (
          <Empty>No attempts yet.</Empty>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  bg,
  color,
  sub,
}: {
  label: string;
  value: string;
  bg: string;
  color: string;
  sub?: string;
}) {
  return (
    <Hoverable
      disabled
      className="p-5"
      style={{ background: bg, border: "2px solid var(--color-cream-dark)" }}
    >
      <p
        className="text-3xl font-900 leading-none mb-1"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
      >
        {value}
      </p>
      <p
        className="text-xs"
        style={{ color, fontFamily: "var(--font-body)" }}
      >
        {label}
      </p>
      {sub && (
        <p
          className="text-[10px] mt-1"
          style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
        >
          {sub}
        </p>
      )}
    </Hoverable>
  );
}

function SubjectOverview({
  bySubject,
}: {
  bySubject: Record<
    "math" | "physics" | "other",
    {
      label: string;
      lessons: { lessonId: string; lessonTitle: string; firstTryCorrectRate: number; mastery: "Strong" | "Getting there" | "Needs practice" }[];
    }
  >;
}) {
  const order: ("math" | "physics")[] = ["math", "physics"];
  return (
    <div className="flex flex-col gap-4">
      {order.map((subj) => {
        const s = bySubject[subj];
        if (!s) return null;
        return (
          <div key={subj}>
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-xs font-600 uppercase tracking-wider"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                }}
              >
                {s.label}
              </span>
              <span
                className="text-xs"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {s.lessons.length} lesson{s.lessons.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {s.lessons.slice(0, 4).map((l) => (
                <div key={l.lessonId} className="flex items-center gap-2 text-xs">
                  <span
                    className="flex-1 truncate"
                    style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}
                  >
                    {l.lessonTitle}
                  </span>
                  <span style={{ width: 80 }}>
                    <MiniBar
                      percent={l.firstTryCorrectRate * 100}
                      color={accentColor(l.firstTryCorrectRate * 100)}
                      height={4}
                    />
                  </span>
                  <span
                    className="font-700 w-9 text-right"
                    style={{
                      color: accentColor(l.firstTryCorrectRate * 100),
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {Math.round(l.firstTryCorrectRate * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentAttempts({
  students,
  openStudentId,
  onToggle,
}: {
  students: ClassStudent[];
  openStudentId: string | null;
  onToggle: (id: string | null) => void;
}) {
  const recent = students
    .filter((s) => s.lastActiveAt)
    .sort((a, b) => (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? ""))
    .slice(0, 6);
  if (recent.length === 0) {
    return (
      <p
        className="text-sm"
        style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
      >
        No recent activity.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {recent.map((s) => {
        const isOpen = openStudentId === s.id;
        const ftCount = s.firstTryCorrectCount ?? 0;
        const ftTotal = s.firstTryQuestions ?? 0;
        return (
          <Hoverable
            as="li"
            key={s.id}
            fullBorder
            style={{
              background: "var(--color-cream)",
              borderLeft: `3px solid ${
                ftTotal > 0 ? accentColor((ftCount / ftTotal) * 100) : "var(--color-cream-dark)"
              }`,
            }}
          >
            {/* Collapsed student row */}
            <button
              onClick={() => onToggle(isOpen ? null : s.id)}
              className="w-full flex items-center justify-between gap-3 text-xs py-2.5 px-3"
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
                <span
                  className="font-600 truncate"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {s.name}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5"
                  style={{
                    background: "var(--color-cream-dark)",
                    color: "var(--color-ink-muted)",
                    fontFamily: "var(--font-mono)",
                    flexShrink: 0,
                  }}
                >
                  {s.attemptCount} attempt{s.attemptCount === 1 ? "" : "s"}
                </span>
              </span>
              <span className="flex items-center gap-3 flex-shrink-0">
                <span
                  className="flex items-center gap-1"
                  style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}
                >
                  <CheckCircle2 size={11} />
                  {ftCount}/{ftTotal || 0} first try
                </span>
                <span
                  className="text-[10px]"
                  style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}
                >
                  {new Date(s.lastActiveAt!).toLocaleDateString()}
                </span>
              </span>
            </button>

            {/* Expanded per-attempt rows */}
            {isOpen && (
              <div
                className="px-3 pb-3"
                style={{ borderTop: "1px solid var(--color-cream-dark)" }}
              >
                {s.recent.length === 0 ? (
                  <p
                    className="text-xs mt-2"
                    style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
                  >
                    No individual attempts to show this period.
                  </p>
                ) : (
                  <ul className="mt-1 flex flex-col gap-1.5">
                    {s.recent.map((a) => (
                      <li
                        key={a.attemptId}
                        className="flex items-center justify-between gap-2 py-1.5 px-2 text-xs"
                        style={{ background: "white", border: "1px solid var(--color-cream-dark)" }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="font-700 text-sm"
                            style={{
                              color: accentColor(
                                a.total > 0 ? (a.score / a.total) * 100 : 0,
                              ),
                              fontFamily: "var(--font-mono)",
                              flexShrink: 0,
                            }}
                          >
                            {a.score}/{a.total}
                          </span>
                          <span
                            className="truncate"
                            style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}
                          >
                            {a.lessonTitle ?? a.quizTitle ?? "Quiz"}
                          </span>
                          {a.chapterName && (
                            <span
                              className="text-[10px]"
                              style={{
                                color: "var(--color-ink-muted)",
                                fontFamily: "var(--font-body)",
                              }}
                            >
                              · {a.chapterName}
                            </span>
                          )}
                        </div>
                        <span
                          className="flex items-center gap-3 flex-shrink-0"
                          style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}
                        >
                          <span className="flex items-center gap-1">
                            <CheckCircle2 size={10} /> {a.firstTryCorrectCount} FT
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={10} /> {Math.round(a.timeSpentSeconds)}s
                          </span>
                          <span className="text-[10px]">
                            {new Date(a.completedAt).toLocaleDateString()}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Hoverable>
        );
      })}
    </ul>
  );
}

function MasteryBadge({ label }: { label: string }) {
  const tone =
    label === "Strong"
      ? { bg: "var(--color-teal-dark)", text: "#fff", label: "Strong" }
      : label === "Getting there"
        ? { bg: "#E47A55", text: "#1C0F00", label: "Getting there" }
        : { bg: "var(--color-ember)", text: "#fff", label: "Needs practice" };
  return (
    <span
      className="text-[10px] font-700 px-2 py-0.5 flex-shrink-0"
      style={{
        background: tone.bg,
        color: tone.text,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.05em",
      }}
    >
      {tone.label}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-sm italic"
      style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
    >
      {children}
    </p>
  );
}

function groupLessonsBySubject(
  rows: { lessonId: string; lessonTitle: string; subject: "math" | "physics" | "other"; firstTryCorrectRate: number }[],
) {
  const out: Record<
    "math" | "physics" | "other",
    {
      label: string;
      lessons: { lessonId: string; lessonTitle: string; firstTryCorrectRate: number; mastery: "Strong" | "Getting there" | "Needs practice" }[];
    }
  > = {
    math: { label: "Math", lessons: [] },
    physics: { label: "Physics", lessons: [] },
    other: { label: "Other", lessons: [] },
  };
  for (const r of rows) {
    const mastery: "Strong" | "Getting there" | "Needs practice" =
      r.firstTryCorrectRate >= 0.85
        ? "Strong"
        : r.firstTryCorrectRate >= 0.5
          ? "Getting there"
          : "Needs practice";
    out[r.subject].lessons.push({
      lessonId: r.lessonId,
      lessonTitle: r.lessonTitle,
      firstTryCorrectRate: r.firstTryCorrectRate,
      mastery,
    });
  }
  return out;
}