import { useApp } from "../../store/AppContext";
import { Users, BookOpen, TrendingUp, AlertTriangle } from "lucide-react";

export default function AdminDashboard() {
  const { students, quizzes, attempts } = useApp();

  const activeQuizzes = quizzes.filter((q) => q.status === "active").length;
  const thisWeekAttempts = attempts.filter((a) => {
    const d = new Date(a.completedAt);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });
  const avgScore =
    attempts.length === 0
      ? 0
      : Math.round(
          (attempts.reduce((s, a) => s + a.score / a.total, 0) / attempts.length) * 100,
        );

  // Students needing attention = worst recent scores
  const studentScores = students.map((s) => {
    const sAttempts = attempts.filter((a) => a.userId === s.id);
    const recent = sAttempts.slice(-3);
    const avg =
      recent.length === 0
        ? null
        : Math.round((recent.reduce((sum, a) => sum + a.score / a.total, 0) / recent.length) * 100);
    return { ...s, avg, attemptCount: sAttempts.length };
  });
  const needAttention = studentScores
    .filter((s) => s.avg !== null && s.avg < 60)
    .sort((a, b) => (a.avg ?? 100) - (b.avg ?? 100))
    .slice(0, 3);

  const statCards = [
    { label: "Total Students", value: students.length, icon: Users, color: "var(--color-teal)", bg: "#E6F5F5" },
    { label: "Active Quizzes", value: activeQuizzes, icon: BookOpen, color: "var(--color-ember)", bg: "#FDECEA" },
    { label: "This Week's Attempts", value: thisWeekAttempts.length, icon: TrendingUp, color: "var(--color-amber-dark)", bg: "#FFF3CD" },
    { label: "Overall Avg Score", value: `${avgScore}%`, icon: AlertTriangle, color: attempts.length === 0 ? "var(--color-ink-muted)" : avgScore >= 70 ? "var(--color-success)" : "var(--color-ember)", bg: "var(--color-cream-dark)" },
  ];

  // Recent attempts
  const recentAttempts = [...attempts]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 8);

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Page header */}
      <div className="mb-8">
        <h1
          className="font-900 text-3xl mb-1"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          Dashboard
        </h1>
        <p className="text-sm" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
          Overview for the ITC platform
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="p-5"
            style={{
              background: card.bg,
              border: "2px solid var(--color-cream-dark)",
              boxShadow: "2px 2px 0 var(--color-cream-dark)",
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="flex items-center justify-center"
                style={{ width: 36, height: 36, background: card.color, color: "#fff" }}
              >
                <card.icon size={16} />
              </div>
            </div>
            <p
              className="text-3xl font-900 leading-none mb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
            >
              {card.value}
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
            >
              {card.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div
          className="p-5"
          style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
        >
          <h2
            className="text-base font-700 mb-4"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Recent Attempts
          </h2>
          {recentAttempts.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
              No attempts yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentAttempts.map((a) => {
                const student = students.find((s) => s.id === a.userId);
                const quiz = quizzes.find((q) => q.id === a.quizId);
                const pct = Math.round((a.score / a.total) * 100);
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between py-2.5 px-3"
                    style={{
                      background: "var(--color-cream)",
                      borderLeft: `3px solid ${pct === 100 ? "var(--color-success)" : pct >= 67 ? "var(--color-teal)" : pct >= 34 ? "var(--color-amber)" : "var(--color-ember)"}`,
                    }}
                  >
                    <div>
                      <p className="text-sm font-500" style={{ fontFamily: "var(--font-body)", color: "var(--color-ink)" }}>
                        {student?.name ?? "Unknown"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
                        {quiz?.title ?? a.quizId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-sm font-700"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: pct === 100 ? "var(--color-success)" : pct >= 67 ? "var(--color-teal)" : "var(--color-ember)",
                        }}
                      >
                        {a.score}/{a.total}
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}>
                        {new Date(a.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Students needing attention */}
        <div
          className="p-5"
          style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
        >
          <h2
            className="text-base font-700 mb-4"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Needs Attention
          </h2>
          {needAttention.length === 0 ? (
            <div
              className="py-8 text-center"
              style={{ border: "2px dashed var(--color-cream-dark)" }}
            >
              <p className="text-sm font-500" style={{ color: "var(--color-success)", fontFamily: "var(--font-body)" }}>
                All students performing well
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
                Nobody below 60% recently.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {needAttention.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3"
                  style={{
                    background: "#FDECEA",
                    border: "1px solid var(--color-danger)",
                    borderLeft: "4px solid var(--color-danger)",
                  }}
                >
                  <div>
                    <p className="text-sm font-600" style={{ fontFamily: "var(--font-body)", color: "var(--color-ink)" }}>
                      {s.name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
                      {s.attemptCount} attempt{s.attemptCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className="text-sm font-700 px-2 py-1"
                    style={{
                      background: "var(--color-danger)",
                      color: "#fff",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {s.avg}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* All student scores */}
          <div className="mt-5">
            <h3
              className="text-xs font-600 uppercase tracking-wider mb-3"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
            >
              All Students
            </h3>
            {studentScores.map((s) => (
              <div key={s.id} className="flex items-center gap-3 mb-2">
                <span
                  className="text-xs w-28 shrink-0 truncate"
                  style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}
                >
                  {s.name}
                </span>
                <div className="flex-1 h-2 overflow-hidden" style={{ background: "var(--color-cream-dark)" }}>
                  {s.avg !== null && (
                    <div
                      className="h-full"
                      style={{
                        width: `${s.avg}%`,
                        background:
                          s.avg >= 80
                            ? "var(--color-success)"
                            : s.avg >= 60
                              ? "var(--color-teal)"
                              : s.avg >= 40
                                ? "var(--color-amber)"
                                : "var(--color-ember)",
                        transition: "width 0.8s ease",
                      }}
                    />
                  )}
                </div>
                <span
                  className="text-xs w-10 text-right shrink-0"
                  style={{
                    color: s.avg === null ? "var(--color-ink-muted)" : "var(--color-ink)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {s.avg === null ? "—" : `${s.avg}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
