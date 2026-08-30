import { useState } from "react";
import { useApp } from "../../store/AppContext";
import { TrendingUp, Target, Zap } from "lucide-react";

type Range = "week" | "month" | "year";

export default function AdminReports() {
  const { students, quizzes, attempts } = useApp();
  const [range, setRange] = useState<Range>("month");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");

  const now = new Date();
  const rangeMs = { week: 7, month: 30, year: 365 };

  const filteredAttempts = attempts.filter((a) => {
    const d = new Date(a.completedAt);
    const daysAgo = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    const inRange = daysAgo <= rangeMs[range];
    const inStudent = selectedStudent === "all" || a.userId === selectedStudent;
    return inRange && inStudent;
  });

  // Per-quiz completion and avg score
  const quizStats = quizzes.map((q) => {
    const qAttempts = filteredAttempts.filter((a) => a.quizId === q.id);
    const avg =
      qAttempts.length === 0
        ? null
        : Math.round(
            (qAttempts.reduce((s, a) => s + a.score / a.total, 0) / qAttempts.length) * 100,
          );
    return { quiz: q, attempts: qAttempts.length, avg };
  });

  // Per-student overview
  const studentStats = students.map((s) => {
    const sAttempts = filteredAttempts.filter((a) => a.userId === s.id);
    const avg =
      sAttempts.length === 0
        ? null
        : Math.round(
            (sAttempts.reduce((sum, a) => sum + a.score / a.total, 0) / sAttempts.length) * 100,
          );

    // Per-lesson: find worst quiz
    const quizScores = quizzes
      .map((q) => {
        const qAttempts = sAttempts.filter((a) => a.quizId === q.id);
        if (qAttempts.length === 0) return null;
        const qAvg = Math.round(
          (qAttempts.reduce((sum, a) => sum + a.score / a.total, 0) / qAttempts.length) * 100,
        );
        return { quiz: q, avg: qAvg, attempts: qAttempts.length };
      })
      .filter(Boolean) as { quiz: (typeof quizzes)[0]; avg: number; attempts: number }[];

    const weakest = [...quizScores].sort((a, b) => a.avg - b.avg).slice(0, 2);

    return { student: s, avg, attempts: sAttempts.length, quizScores, weakest };
  });

  const selectedStudentStats =
    selectedStudent === "all"
      ? null
      : studentStats.find((s) => s.student.id === selectedStudent);

  // Class timeline (simple bar chart data) — group by quiz
  const maxAttempts = Math.max(...quizStats.map((q) => q.attempts), 1);

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="font-900 text-3xl mb-1"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          Reports
        </h1>
        <p className="text-sm" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
          Performance analytics and improvement areas
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        {/* Range filter */}
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
            >
              {r}
            </button>
          ))}
        </div>

        {/* Student filter */}
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
          }}
        >
          <option value="all">All Students</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Attempts this period",
            value: filteredAttempts.length,
            icon: Zap,
            color: "var(--color-amber-dark)",
          },
          {
            label: "Avg score",
            value:
              filteredAttempts.length === 0
                ? "—"
                : `${Math.round((filteredAttempts.reduce((s, a) => s + a.score / a.total, 0) / filteredAttempts.length) * 100)}%`,
            icon: Target,
            color: "var(--color-teal)",
          },
          {
            label: "Perfect scores",
            value: filteredAttempts.filter((a) => a.score === a.total).length,
            icon: TrendingUp,
            color: "var(--color-success)",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="p-5"
            style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
          >
            <div
              className="flex items-center justify-center mb-3"
              style={{
                width: 36,
                height: 36,
                background: s.color,
                color: "#fff",
              }}
            >
              <s.icon size={16} />
            </div>
            <p
              className="text-3xl font-900 leading-none mb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
            >
              {s.value}
            </p>
            <p className="text-xs" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Per-quiz bar chart */}
      <div
        className="p-6 mb-6"
        style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
      >
        <h2
          className="text-base font-700 mb-5"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          Avg Score per Quiz
        </h2>
        <div className="flex flex-col gap-4">
          {quizStats.map(({ quiz, avg, attempts: att }) => (
            <div key={quiz.id}>
              <div className="flex items-center justify-between mb-1">
                <p
                  className="text-sm font-500 truncate"
                  style={{ fontFamily: "var(--font-body)", color: "var(--color-ink)", maxWidth: "60%" }}
                >
                  {quiz.title}
                </p>
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
                  >
                    {att} attempt{att !== 1 ? "s" : ""}
                  </span>
                  <span
                    className="text-sm font-700 w-12 text-right"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: avg === null ? "var(--color-ink-muted)" : avg >= 80 ? "var(--color-success)" : avg >= 60 ? "var(--color-teal)" : "var(--color-ember)",
                    }}
                  >
                    {avg === null ? "—" : `${avg}%`}
                  </span>
                </div>
              </div>
              <div className="h-3 w-full overflow-hidden" style={{ background: "var(--color-cream-dark)" }}>
                {avg !== null && (
                  <div
                    className="h-full"
                    style={{
                      width: `${avg}%`,
                      background:
                        avg >= 80
                          ? "var(--color-success)"
                          : avg >= 60
                            ? "var(--color-teal)"
                            : avg >= 40
                              ? "var(--color-amber)"
                              : "var(--color-ember)",
                      transition: "width 1s ease",
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-student breakdown */}
      {selectedStudent === "all" ? (
        <div
          className="p-6"
          style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
        >
          <h2
            className="text-base font-700 mb-5"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Student Breakdown
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {studentStats.map((s) => (
              <div
                key={s.student.id}
                className="p-4 cursor-pointer"
                style={{
                  background: "var(--color-cream)",
                  border: "2px solid var(--color-cream-dark)",
                  transition: "all 0.15s",
                }}
                onClick={() => setSelectedStudent(s.student.id)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-ink)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "3px 3px 0 var(--color-ink)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-cream-dark)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-600" style={{ fontFamily: "var(--font-body)", color: "var(--color-ink)" }}>
                    {s.student.name}
                  </p>
                  <span
                    className="text-sm font-700 px-2 py-0.5"
                    style={{
                      background: s.avg === null ? "var(--color-cream-dark)" : s.avg >= 80 ? "var(--color-success)" : s.avg >= 60 ? "var(--color-teal)" : "var(--color-ember)",
                      color: s.avg === null ? "var(--color-ink-muted)" : "#fff",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {s.avg === null ? "—" : `${s.avg}%`}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
                  {s.attempts} attempt{s.attempts !== 1 ? "s" : ""}
                  {s.weakest.length > 0 && ` · Weakest: ${s.weakest[0].quiz.title}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        selectedStudentStats && (
          <div
            className="p-6"
            style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-base font-700"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
              >
                {selectedStudentStats.student.name} — Detail
              </h2>
              <button
                onClick={() => setSelectedStudent("all")}
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

            {selectedStudentStats.quizScores.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
                No attempts in this period.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-4 mb-6">
                  {selectedStudentStats.quizScores.map(({ quiz, avg, attempts: att }) => (
                    <div key={quiz.id}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-500" style={{ fontFamily: "var(--font-body)", color: "var(--color-ink)" }}>
                          {quiz.title}
                        </p>
                        <span
                          className="text-sm font-700"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: avg >= 80 ? "var(--color-success)" : avg >= 60 ? "var(--color-teal)" : "var(--color-ember)",
                          }}
                        >
                          {avg}%
                        </span>
                      </div>
                      <div className="h-3 w-full" style={{ background: "var(--color-cream-dark)" }}>
                        <div
                          className="h-full"
                          style={{
                            width: `${avg}%`,
                            background: avg >= 80 ? "var(--color-success)" : avg >= 60 ? "var(--color-teal)" : avg >= 40 ? "var(--color-amber)" : "var(--color-ember)",
                            transition: "width 1s ease",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {selectedStudentStats.weakest.length > 0 && (
                  <div
                    className="p-4"
                    style={{
                      background: "#FFF3CD",
                      border: "1px solid var(--color-amber-dark)",
                      borderLeft: "4px solid var(--color-amber)",
                    }}
                  >
                    <p
                      className="text-xs font-600 uppercase tracking-wider mb-2"
                      style={{ color: "var(--color-amber-dark)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
                    >
                      Areas to improve
                    </p>
                    <ul className="flex flex-col gap-1">
                      {selectedStudentStats.weakest.map((w) => (
                        <li key={w.quiz.id} className="text-sm" style={{ color: "var(--color-ink-light)", fontFamily: "var(--font-body)" }}>
                          · {w.quiz.title} — {w.avg}% avg ({w.attempts} attempt{w.attempts !== 1 ? "s" : ""})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )
      )}
    </div>
  );
}
