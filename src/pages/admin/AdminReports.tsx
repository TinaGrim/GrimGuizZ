import { useEffect, useState } from "react";
import { Teacher } from "../../api/client";
import type { ClassReport, StudentReport, AttemptSummary } from "../../api/client";
import { TrendingUp, TrendingDown, MessageSquare, Clock, ChevronRight, Target, Zap, CheckCircle2, Download } from "lucide-react";
import { useApp } from "../../store/AppContext";
import { accentColor } from "../../components/StudentProgressPanel";
import { Hoverable } from "../../components/AdminHoverable";
import MathText from "../../components/MathText";

type Range = "week" | "month" | "year";

export default function AdminReports() {
  const { students } = useApp();
  const [range, setRange] = useState<Range>("month");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [classReport, setClassReport] = useState<ClassReport | null>(null);
  const [studentReports, setStudentReports] = useState<
    Record<string, StudentReport>
  >({});
  const [openAttemptId, setOpenAttemptId] = useState<string | null>(null);
  const [openAttempt, setOpenAttempt] = useState<AttemptSummary | null>(null);
  const [openClassStudent, setOpenClassStudent] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Teacher.classReport(range).then((r) => {
      if (!cancelled) setClassReport(r);
    });
    return () => {
      cancelled = true;
    };
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    /*** Per-student detail reports — fetched in PARALLEL, one request per
     * student, instead of chaining them sequentially (N sequential round-trips
     * made this page feel like it was loading one student at a time). A
     * single missing/failed report is skipped without killing the batch. ***/
    Promise.all(
      students.map((s) =>
        Teacher.studentReport(s.id, range).then((r) => ({ s, r })),
      ),
    )
      .then((rows) => {
        if (cancelled) return;
        const out: Record<string, StudentReport> = {};
        for (const { s, r } of rows) out[s.id] = r;
        setStudentReports(out);
      })
      .catch((e) => console.error("student reports failed", e));
    return () => {
      cancelled = true;
    };
  }, [students, range]);

  // Fetch attempt detail when a row is expanded.
  useEffect(() => {
    if (!openAttemptId || !selectedStudent) {
      setOpenAttempt(null);
      return;
    }
    let cancelled = false;
    Teacher.studentAttempt(selectedStudent, openAttemptId)
      .then((a) => {
        if (!cancelled) setOpenAttempt(a);
      })
      .catch(() => {
        if (!cancelled) setOpenAttempt(null);
      });
    return () => {
      cancelled = true;
    };
  }, [openAttemptId, selectedStudent]);

  const handleReportDownload = async () => {
    // Class-wide gradebook matrix export (every student × every quiz).
    // The addendum refactor replaces the old single-student narrative export
    // as the primary export; this button now lives on the class report view.
    try {
      const { blob, filename } = await Teacher.classReportXlsx(range);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `QuizZ-ClassReport-${range}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("class xlsx export failed", e);
    }
  };

  // Build stat cards + the class "Recent Attempts" list straight off the
  // single class-report request (it already ships per-student rollups) so the
  // page paints after ONE request; the per-student batch below only feeds the
  // chapter averages and the single-student detail view.
  const studentsInRange = classReport?.students ?? [];
  const attemptsThisPeriod = studentsInRange.reduce(
    (sum, s) => sum + s.attemptCount,
    0,
  );
  const activeStudents = studentsInRange.filter((s) => s.attemptCount > 0);
  const avgScore =
    activeStudents.length === 0
      ? 0
      : Math.round(
          activeStudents.reduce((s, x) => s + x.averageScore, 0) /
            activeStudents.length,
        );

  // Group attempts for the expandable class list from the class report (the
  // backend computes these — no reason to wait for the per-student calls).
  const studentsWithRecent = studentsInRange
    .map((s) => ({
      studentId: s.id,
      studentName: s.name,
      attempts: (s.recent ?? [])
        .slice()
        .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1)),
    }))
    .filter((s) => s.attempts.length > 0)
    .sort((a, b) => (b.attempts[0].completedAt < a.attempts[0].completedAt ? 1 : -1));

  return (
    <div className="px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="font-900 text-3xl mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Reports
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
          >
            Performance analytics and improvement areas
          </p>
        </div>
        <button
          onClick={handleReportDownload}
          disabled={!students.length}
          className="flex items-center gap-2 px-3 py-2 text-xs font-600"
          style={{
            background: "white",
            border: "2px solid var(--color-ink)",
            color: "var(--color-ink)",
            fontFamily: "var(--font-body)",
            cursor: "pointer",
            boxShadow: "2px 2px 0 var(--color-ink)",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.boxShadow = "5px 5px 0 var(--color-ink)";
              e.currentTarget.style.transform = "translate(-2px, -2px)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "2px 2px 0 var(--color-ink)";
            e.currentTarget.style.transform = "none";
          }}
        >
          <Download size={13} /> Export to Excel
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex gap-1">
          {(["week", "month", "year"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-4 py-2 text-xs font-600 uppercase tracking-wider"
              style={{
                background: range === r ? "var(--color-ink)" : "white",
                color: range === r ? "var(--color-amber)" : "var(--color-ink-muted)",
                border: `2px solid ${range === r ? "var(--color-ink)" : "var(--color-cream-dark)"}`,
                fontFamily: "var(--font-body)",
                cursor: "pointer",
                letterSpacing: "0.08em",
                transition: "all 0.15s",
                borderRadius: 0,
              }}
              onMouseEnter={(e) => {
                if (range !== r) {
                  e.currentTarget.style.borderColor = "var(--color-ink)";
                  e.currentTarget.style.boxShadow = "3px 3px 0 var(--color-ink)";
                  e.currentTarget.style.transform = "translate(-2px, -2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (range !== r) {
                  e.currentTarget.style.borderColor = "var(--color-cream-dark)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "none";
                }
              }}
            >
              {r}
            </button>
          ))}
        </div>
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="px-3 py-2 text-sm outline-none"
          style={{
            border: "2px solid var(--color-cream-dark)",
            fontFamily: "var(--font-body)",
            color: "var(--color-ink)",
            background: "white",
            borderRadius: 0,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--color-ink)";
            e.currentTarget.style.boxShadow = "3px 3px 0 var(--color-ink)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--color-cream-dark)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <option value="all">All Students</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Attempts this period",
            value: attemptsThisPeriod,
            icon: Zap,
            color: "var(--color-amber-dark)",
          },
          {
            label: "Avg score (active students)",
            value: attemptsThisPeriod === 0 ? "—" : `${avgScore}%`,
            icon: Target,
            color: "var(--color-teal-dark)",
          },
          {
            label: "Class completion rate",
            value: `${classReport?.completionRate ?? 0}%`,
            icon: TrendingUp,
            color: "var(--color-ink)",
          },
        ].map((s) => (
          <Hoverable
            key={s.label}
            disabled
            className="p-5"
            style={{
              background: "white",
              border: "2px solid var(--color-cream-dark)",
            }}
          >
            <div
              className="flex items-center justify-center mb-3"
              style={{ width: 36, height: 36, background: s.color, color: "#fff" }}
            >
              <s.icon size={16} />
            </div>
            <p
              className="text-3xl font-900 leading-none mb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
            >
              {s.value}
            </p>
            <p
              className="text-xs"
              style={{
                color: "var(--color-ink-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              {s.label}
            </p>
          </Hoverable>
        ))}
      </div>

      {/* Per-chapter overall */}
      <div
        className="p-6 mb-6"
        style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
      >
        <h2
          className="text-base font-700 mb-5"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          Avg Score by Chapter
        </h2>
        <div className="flex flex-col gap-3">
          {(() => {
            const byChapter: Record<string, { sum: number; count: number }> = {};
            for (const r of Object.values(studentReports)) {
              for (const c of r.perChapter) {
                const entry = byChapter[c.chapterName] ?? { sum: 0, count: 0 };
                entry.sum += c.percent;
                entry.count += 1;
                byChapter[c.chapterName] = entry;
              }
            }
            const chapters = Object.entries(byChapter);
            if (chapters.length === 0)
              return (
                <p
                  className="text-sm"
                  style={{
                    color: "var(--color-ink-muted)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  No chapter data yet — students need to attempt some quizzes.
                </p>
              );
            return chapters.map(([chapter, e]) => {
              const avg = Math.round(e.sum / e.count);
              return (
                <div key={chapter}>
                  <div className="flex items-center justify-between mb-1">
                    <p
                      className="text-sm font-500"
                      style={{
                        fontFamily: "var(--font-body)",
                        color: "var(--color-ink)",
                      }}
                    >
                      {chapter}
                    </p>
                    <span
                      className="text-sm font-700"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: accentColor(avg),
                      }}
                    >
                      {avg}%
                    </span>
                  </div>
                  <Hoverable
                    disabled
                    className="h-3 w-full overflow-hidden"
                    style={{ background: "var(--color-cream-dark)" }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${avg}%`,
                        background: accentColor(avg),
                        transition: "width 1s ease",
                      }}
                    />
                  </Hoverable>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {selectedStudent === "all" ? (
        <div
          className="p-6"
          style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
        >
          <h2
            className="text-base font-700 mb-5"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Recent Attempts
          </h2>
          {studentsWithRecent.length === 0 ? (
            <p
              className="text-sm"
              style={{
                color: "var(--color-ink-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              No attempts in this period.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {studentsWithRecent.map((s) => {
                const isOpen = openClassStudent === s.studentId;
                const ftTotal = s.attempts.reduce((n, a) => n + a.total, 0);
                const ftCorrect = s.attempts.reduce(
                  (n, a) => n + a.firstTryCorrectCount,
                  0,
                );
                return (
                  <Hoverable
                    key={s.studentId}
                    fullBorder
                    style={{
                      background: "var(--color-cream)",
                      borderLeft: `3px solid ${
                        ftTotal > 0
                          ? accentColor((ftCorrect / ftTotal) * 100)
                          : "var(--color-cream-dark)"
                      }`,
                    }}
                  >
                    <button
                      onClick={() =>
                        setOpenClassStudent(isOpen ? null : s.studentId)
                      }
                      className="w-full flex items-center justify-between gap-3 py-2.5 px-3 text-sm"
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
                          {s.studentName}
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
                          {s.attempts.length} attempt
                          {s.attempts.length === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span
                        className="text-[10px]"
                        style={{
                          color: "var(--color-ink-muted)",
                          fontFamily: "var(--font-mono)",
                          flexShrink: 0,
                        }}
                      >
                        {ftCorrect}/{ftTotal || 0} first try · last{" "}
                        {new Date(s.attempts[0].completedAt).toLocaleDateString()}
                      </span>
                    </button>

                    {isOpen && (
                      <div
                        className="px-3 pb-3"
                        style={{ borderTop: "1px solid var(--color-cream-dark)" }}
                      >
                        <ul className="mt-1.5 flex flex-col gap-1.5">
                          {s.attempts.map((a) => {
                            const pct =
                              a.total === 0
                                ? 0
                                : Math.round((a.score / a.total) * 100);
                            return (
                              <li
                                key={a.attemptId}
                                className="flex items-center justify-between gap-2 py-1.5 px-2 text-xs"
                                style={{
                                  background: "white",
                                  border: "1px solid var(--color-cream-dark)",
                                }}
                              >
                                <span
                                  className="flex items-center gap-2 min-w-0"
                                  style={{
                                    color: "var(--color-ink)",
                                    fontFamily: "var(--font-body)",
                                  }}
                                >
                                  <span
                                    className="font-700 text-sm flex-shrink-0"
                                    style={{
                                      color: accentColor(pct),
                                      fontFamily: "var(--font-mono)",
                                    }}
                                  >
                                    {a.score}/{a.total}
                                  </span>
                                  <span className="truncate">
                                    {a.lessonTitle ?? a.quizTitle ?? "Quiz"}
                                  </span>
                                  {a.chapterName && (
                                    <span
                                      className="text-[10px] flex-shrink-0"
                                      style={{
                                        color: "var(--color-ink-muted)",
                                        fontFamily: "var(--font-body)",
                                      }}
                                    >
                                      · {a.chapterName}
                                    </span>
                                  )}
                                </span>
                                <span
                                  className="flex items-center gap-3 flex-shrink-0"
                                  style={{
                                    color: "var(--color-ink-muted)",
                                    fontFamily: "var(--font-mono)",
                                  }}
                                >
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 size={10} />{" "}
                                    {a.firstTryCorrectCount} FT
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock size={10} />{" "}
                                    {Math.round(a.timeSpentSeconds)}s
                                  </span>
                                  <span className="text-[10px]">
                                    {new Date(a.completedAt).toLocaleDateString()}
                                  </span>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </Hoverable>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <StudentDetail
          studentId={selectedStudent}
          report={studentReports[selectedStudent]}
          onBack={() => setSelectedStudent("all")}
          openAttemptId={openAttemptId}
          setOpenAttemptId={setOpenAttemptId}
          openAttempt={openAttempt}
        />
      )}
    </div>
  );
}

function StatusFlagChip({ status }: { status?: "on_track" | "falling_behind" | "needs_attention" }) {
  if (!status) return null;
  // Per §6 — calm tone variation within the ember accent, never traffic-light.
  const tone =
    status === "on_track"
      ? { label: "On track", bg: "var(--color-teal-dark)", text: "#fff" }
      : status === "falling_behind"
        ? { label: "Falling behind", bg: "#E47A55", text: "#1C0F00" }
        : { label: "Needs attention", bg: "var(--color-ember)", text: "#fff" };
  return (
    <span
      className="text-[10px] font-700 px-2 py-1"
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

function MasteryPill({ label }: { label: "Strong" | "Getting there" | "Needs practice" }) {
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

function TrendIcon({ trend }: { trend: "improving" | "declining" | "steady" }) {
  if (trend === "improving")
    return <TrendingUp size={11} style={{ color: "var(--color-ember)" }} />;
  if (trend === "declining")
    return <TrendingDown size={11} style={{ color: "var(--color-ember-dark)" }} />;
  return <span style={{ color: "var(--color-ink-muted)" }}>·</span>;
}

function StudentDetail({
  studentId,
  report,
  onBack,
  openAttemptId,
  setOpenAttemptId,
  openAttempt,
}: {
  studentId: string;
  report: StudentReport | undefined;
  onBack: () => void;
  openAttemptId: string | null;
  setOpenAttemptId: (v: string | null) => void;
  openAttempt: AttemptSummary | null;
}) {
  const { students } = useApp();
  const student = students.find((s) => s.id === studentId);

  // Group chapters by subject for the Math / Physics split.
  const bySubject: Record<string, typeof report extends undefined ? never : NonNullable<typeof report>["perChapter"]> = {
    math: [],
    physics: [],
    other: [],
  };
  if (report) {
    for (const c of report.perChapter) {
      bySubject[c.subject] = [...(bySubject[c.subject] ?? []), c];
    }
  }

  return (
    <div
      className="p-6"
      style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2
            className="text-base font-700"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            {student?.name ?? "Student"} — Detail
          </h2>
          {report?.student && <StatusFlagChip status={report.student.status} />}
        </div>
        <button
          onClick={onBack}
          className="text-xs px-3 py-1.5 font-500"
          style={{
            border: "1px solid var(--color-cream-dark)",
            background: "var(--color-cream)",
            color: "var(--color-ink-muted)",
            fontFamily: "var(--font-body)",
            cursor: "pointer",
            borderRadius: 0,
          }}
        >
          ← All students
        </button>
      </div>

      {!report || report.attemptCount === 0 ? (
        <p
          className="text-sm"
          style={{
            color: "var(--color-ink-muted)",
            fontFamily: "var(--font-body)",
          }}
        >
          No attempts in this period.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Header summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric label="Attempts" value={String(report.attemptCount)} />
            <Metric
              label="Solved first try"
              value={firstTryCountLabel(report)}
              sub="of questions answered on the first pick"
            />
            <Metric
              label="Best recent score"
              value={bestRecentScoreLabel(report)}
              sub="single attempt, not an average"
            />
            <Metric
              label="Last active"
              value={
                report.student?.lastActiveAt
                  ? new Date(report.student.lastActiveAt).toLocaleDateString()
                  : "—"
              }
            />
          </div>

          {/* Time on task */}
          {report.timeOnTask && (
            <div
              className="p-4"
              style={{
                background: "var(--color-cream)",
                border: "1px solid var(--color-cream-dark)",
              }}
            >
              <h3
                className="text-sm font-700 mb-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
              >
                Time on task
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span style={{ color: "var(--color-ink-muted)" }}>This student</span>
                  <div
                    className="text-base font-700"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--color-ink)" }}
                  >
                    {report.timeOnTask.perQuestionMedianSeconds.toFixed(1)}s
                    <span
                      className="text-xs ml-1"
                      style={{ color: "var(--color-ink-muted)", fontWeight: 400 }}
                    >
                      per question
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--color-ink-muted)" }}>Class median</span>
                  <div
                    className="text-base font-700"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--color-ink)" }}
                  >
                    {report.timeOnTask.classMedianSeconds.toFixed(1)}s
                  </div>
                </div>
              </div>
              {(report.timeOnTask.flagFast || report.timeOnTask.flagSlow) && (
                <p
                  className="text-xs mt-2"
                  style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
                >
                  {report.timeOnTask.flagFast
                    ? "Markedly faster than peers — may be rushing."
                    : "Markedly slower than peers — may need more time / support."}
                </p>
              )}
            </div>
          )}

          {/* Subject × Chapter mastery */}
          <div>
            <h3
              className="text-sm font-700 mb-2"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
            >
              Mastery by subject
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(["math", "physics"] as const).map((subj) => (
                <div
                  key={subj}
                  className="p-3"
                  style={{
                    background: "var(--color-cream)",
                    border: "1px solid var(--color-cream-dark)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-xs font-600 uppercase tracking-wider"
                      style={{
                        color: "var(--color-ink-muted)",
                        fontFamily: "var(--font-body)",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {subj === "math" ? "Math" : "Physics"}
                    </span>
                    <span
                      className="text-xs"
                      style={{
                        color: "var(--color-ink-muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {(bySubject[subj] ?? []).length} chapter
                      {(bySubject[subj] ?? []).length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {(bySubject[subj] ?? []).map((c) => (
                      <div
                        key={c.chapterId}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className="flex-1 truncate"
                          style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}
                        >
                          {c.chapterName}
                        </span>
                        <MasteryPill label={c.mastery} />
                        <TrendIcon trend={c.trend} />
                        <span
                          className="font-700 w-9 text-right"
                          style={{
                            color: accentColor(c.percent),
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {c.percent}%
                        </span>
                      </div>
                    ))}
                    {(bySubject[subj] ?? []).length === 0 && (
                      <p
                        className="text-xs italic"
                        style={{
                          color: "var(--color-ink-muted)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        No attempts in this subject.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wrong-answer patterns */}
          {report.wrongAnswerPatterns && report.wrongAnswerPatterns.length > 0 && (
            <div
              className="p-4"
              style={{
                background: "var(--color-cream)",
                border: "1px solid var(--color-cream-dark)",
                borderLeft: "4px solid var(--color-ember)",
              }}
            >
              <h3
                className="text-sm font-700 mb-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
              >
                Repeated wrong picks
              </h3>
              <p
                className="text-xs mb-3"
                style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
              >
                Lessons where the same option is being chosen incorrectly — likely a specific misconception.
              </p>
              <ul className="flex flex-col gap-2">
                {report.wrongAnswerPatterns.map((p) => (
                  <li
                    key={`${p.lessonId}-${p.wrongOptionIndex}`}
                    className="px-3 py-2"
                    style={{ background: "white", border: "1px solid var(--color-cream-dark)" }}
                  >
                    <p
                      className="text-xs font-600"
                      style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}
                    >
                      {p.lessonTitle}{" "}
                      {p.chapterName && (
                        <span style={{ color: "var(--color-ink-muted)", fontWeight: 400 }}>
                          · {p.chapterName}
                        </span>
                      )}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--color-ink-light)", fontFamily: "var(--font-body)" }}
                    >
                      Option {String.fromCharCode(65 + p.wrongOptionIndex)} picked{" "}
                      <strong>{p.frequency}×</strong> — "{p.samplePrompt}"
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recent attempts (clickable → expand to show per-question detail) */}
          <div>
            <h3
              className="text-sm font-700 mb-2"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
            >
              Recent attempts
            </h3>
            <ul className="flex flex-col gap-1.5">
                            {report.recent.slice(0, 8).map((r) => {
                const pct = r.total === 0 ? 0 : Math.round((r.score / r.total) * 100);
                const isOpen = openAttemptId === r.attemptId;
                return (
                  <Hoverable
                    as="li"
                    key={r.attemptId}
                    fullBorder
                    style={{
                      background: "var(--color-cream)",
                      borderLeft: `3px solid ${accentColor(pct)}`,
                    }}
                  >
                    <button
                      onClick={() =>
                        setOpenAttemptId(isOpen ? null : r.attemptId)
                      }
                      className="w-full flex items-center justify-between text-xs py-2 px-2"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-ink)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <ChevronRight
                          size={11}
                          style={{
                            transform: isOpen ? "rotate(90deg)" : "none",
                            transition: "transform 0.15s",
                          }}
                        />
                        <span style={{ color: "var(--color-ink)" }}>
                          {r.quizTitle ?? r.quizId}
                        </span>
                        {r.chapterName && (
                          <span style={{ color: "var(--color-ink-muted)" }}>
                            · {r.chapterName}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-3">
                        <span
                          className="flex items-center gap-1"
                          style={{
                            color: "var(--color-ink-muted)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          <Clock size={10} /> {Math.round(r.timeSpentSeconds)}s
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5"
                          style={{
                            background: "var(--color-cream-dark)",
                            color: "var(--color-ink-muted)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {r.firstTryCorrectCount}/{r.total} first try
                        </span>
                        <span
                          className="font-700 text-xs"
                          style={{
                            color: accentColor(pct),
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {r.score}/{r.total}
                        </span>
                      </span>
                    </button>
                    {isOpen && openAttempt && openAttempt.id === r.attemptId && (
                      <div
                        className="px-3 pb-3 pt-1"
                        style={{ borderTop: "1px solid var(--color-cream-dark)" }}
                      >
                        <AttemptDetail attempt={openAttempt} />
                      </div>
                    )}
                  </Hoverable>
                );
              })}
            </ul>
          </div>

          {/* Message history */}
          {report.messageHistory && report.messageHistory.length > 0 && (
            <div
              className="p-4"
              style={{
                background: "var(--color-cream)",
                border: "1px solid var(--color-cream-dark)",
              }}
            >
              <h3
                className="text-sm font-700 mb-2 flex items-center gap-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
              >
                <MessageSquare size={13} /> Message history
              </h3>
              <ul className="flex flex-col gap-2">
                {report.messageHistory.slice(0, 6).map((m) => (
                  <li
                    key={m.id}
                    className="text-xs px-3 py-2"
                    style={{ background: "white", border: "1px solid var(--color-cream-dark)" }}
                  >
                    <p style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}>{m.text}</p>
                    <p
                      className="mt-1"
                      style={{
                        color: "var(--color-ink-muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="p-3"
      style={{ background: "var(--color-cream)", border: "1px solid var(--color-cream-dark)" }}
    >
      <p
        className="text-[10px] font-600 uppercase tracking-wider"
        style={{
          color: "var(--color-ink-muted)",
          fontFamily: "var(--font-body)",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </p>
      <p
        className="text-lg font-900 mt-0.5"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="text-[10px] mt-0.5"
          style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// First-try correct shown as a count ("X of Y") across the recent attempts,
// so teachers see the raw number rather than a hard-to-interpret percentage.
function firstTryCountLabel(r: StudentReport): string {
  let correct = 0;
  let total = 0;
  for (const a of r.recent) {
    correct += a.firstTryCorrectCount;
    total += a.total;
  }
  if (total === 0) return "—";
  return `${correct} / ${total}`;
}

// Single best score across recent attempts — avoids the misleading "average"
// that mixes retries and only ever records the final attempt.
function bestRecentScoreLabel(r: StudentReport): string {
  let best = 0;
  let total = 0;
  for (const a of r.recent) {
    const pct = a.total > 0 ? a.score / a.total : 0;
    if (pct > best) {
      best = pct;
      total = a.total;
    }
  }
  if (total === 0) return "—";
  return `${Math.round(best * 100)}%`;
}

function AttemptDetail({ attempt }: { attempt: AttemptSummary }) {
  return (
    <div className="flex flex-col gap-1.5">
      {attempt.breakdown.map((b, i) => {
        return (
          <div
            key={b.questionId}
            className="px-2 py-1.5 text-xs"
            style={{
              background: "white",
              border: "1px solid var(--color-cream-dark)",
            }}
          >
            <div className="flex items-center justify-between">
              <span
                style={{
                  color: b.correct ? "var(--color-teal-dark)" : "var(--color-ember-dark)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Q{i + 1} · {b.correct ? "✓" : "✗"} · {b.tries} try{b.tries === 1 ? "" : "s"}
                {b.firstTryCorrect ? " · first try" : ""}
              </span>
              <span
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {b.timeSpentSeconds.toFixed(1)}s
              </span>
            </div>
            <p
              className="mt-1"
              style={{
                color: "var(--color-ink-light)",
                fontFamily: "var(--font-body)",
                fontSize: 11,
              }}
            >
              <MathText text={b.prompt} />
            </p>
          </div>
        );
      })}
    </div>
  );
}