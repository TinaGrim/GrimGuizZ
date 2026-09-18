import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../../store/AppContext";
import { Teacher, type ClassReport, type ClassLessonDifficulty, type ClassStudent, type ClassVsPrevious } from "../../api/client";
import {
  MessageSquare,
  Check,
  X,
  UserCheck,
  History,
  RotateCcw,
} from "lucide-react";
import { MiniBar } from "../../components/Chart";
import { accentColor } from "../../components/StudentProgressPanel";
import { Hoverable } from "../../components/AdminHoverable";

// ─── Period selector ───────────────────────────────────────────────────────

type Range = "week" | "month" | "year";

const RANGE_LABELS: Record<Range, { selector: string; echo: string; prev: string }> = {
  week: { selector: "This week", echo: "this week", prev: "last week" },
  month: { selector: "This month", echo: "this month", prev: "last month" },
  year: { selector: "This term", echo: "this term", prev: "last term" },
};

function rangeStart(range: Range): Date {
  const d = new Date();
  if (range === "week") d.setDate(d.getDate() - 7);
  else if (range === "month") d.setDate(d.getDate() - 30);
  else d.setDate(d.getDate() - 365);
  return d;
}

function PeriodSelector({
  value,
  onChange,
}: {
  value: Range;
  onChange: (r: Range) => void;
}) {
  return (
    <div className="flex gap-1">
      {(["week", "month", "year"] as Range[]).map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className="px-3 py-1.5 text-[11px] font-600 uppercase tracking-wider"
          style={{
            background: value === r ? "var(--color-ink)" : "white",
            color: value === r ? "var(--color-amber)" : "var(--color-ink-muted)",
            border: `2px solid ${value === r ? "var(--color-ink)" : "var(--color-cream-dark)"}`,
            fontFamily: "var(--font-body)",
            cursor: "pointer",
            letterSpacing: "0.08em",
            transition: "all 0.15s",
            borderRadius: 0,
          }}
          onMouseEnter={(e) => {
            if (value !== r) {
              e.currentTarget.style.borderColor = "var(--color-ink)";
              e.currentTarget.style.boxShadow = "3px 3px 0 var(--color-ink)";
              e.currentTarget.style.transform = "translate(-1px, -1px)";
            }
          }}
          onMouseLeave={(e) => {
            if (value !== r) {
              e.currentTarget.style.borderColor = "var(--color-cream-dark)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "none";
            }
          }}
        >
          {RANGE_LABELS[r].selector}
        </button>
      ))}
    </div>
  );
}

// ─── Delta badge ───────────────────────────────────────────────────────────

function DeltaChip({
  delta,
  format,
  goodWhenUp = true,
}: {
  delta: number | null | undefined;
  format: (d: number) => string;
  goodWhenUp?: boolean;
}) {
  if (delta == null) {
    return (
      <span
        className="text-[10px] font-600"
        style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}
      >
        · no prior data
      </span>
    );
  }
  const arrow = delta > 0 ? "▴" : delta < 0 ? "▾" : "·";
  const sign = delta > 0 ? "+" : delta < 0 ? "" : "±";
  const improving = delta > 0;
  const worse = delta < 0;
  let color: string;
  if (improving) color = goodWhenUp ? "var(--color-teal-dark)" : "var(--color-ember-dark)";
  else if (worse) color = goodWhenUp ? "var(--color-ember-dark)" : "var(--color-teal-dark)";
  else color = "var(--color-ink-muted)";
  return (
    <span
      className="text-[10px] font-700"
      style={{ color, fontFamily: "var(--font-mono)" }}
    >
      {arrow} {sign}
      {format(Math.abs(delta))}
    </span>
  );
}

// ─── Featured insight ("start here") ───────────────────────────────────────

function FeaturedInsight({
  hero,
  range,
  onCheckIn,
  quizzesForAssign,
  onAssign,
  lessonMap,
}: {
  hero: ClassStudent | null;
  range: Range;
  onCheckIn?: (s: ClassStudent) => void;
  quizzesForAssign: { id: string; title: string }[];
  onAssign?: (studentId: string, quizId: string) => void;
  lessonMap: Record<string, ClassLessonDifficulty>;
}) {
  const navigate = useNavigate();
  const [showComposer, setShowComposer] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || !hero) return;
    setBusy(true);
    try {
      await Teacher.sendMessage(hero.id, text.trim());
      setText("");
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setShowComposer(false);
      }, 2000);
    } finally {
      setBusy(false);
    }
  };

  if (!hero) {
    return (
      <div
        className="p-4 text-center"
        style={{
          border: "2px solid var(--color-teal-dark)",
          background: "#E0F0EE",
        }}
      >
        <p
          className="text-sm font-600"
          style={{ color: "var(--color-teal-dark)", fontFamily: "var(--font-body)" }}
        >
          All caught up — no students below the on-track line.
        </p>
        <p
          className="text-xs mt-1"
          style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
        >
          Every student has been active this {RANGE_LABELS[range].echo}.
        </p>
      </div>
    );
  }

  // Find the hardest lesson that appears in this student's recent attempts.
  const recentLessons = (hero.recent ?? [])
    .map((r) => r.lessonId)
    .filter((id): id is string => !!id);
  let connectionLesson: ClassLessonDifficulty | null = null;
  for (const lid of recentLessons) {
    const l = lessonMap[lid];
    if (l && (connectionLesson == null || l.firstTryCorrectRate < connectionLesson.firstTryCorrectRate)) {
      connectionLesson = l;
    }
  }
  let connectionRank = 0;
  if (connectionLesson) {
    connectionRank =
      Object.values(lessonMap)
        .sort((a, b) => a.firstTryCorrectRate - b.firstTryCorrectRate)
        .findIndex((l) => l.lessonId === connectionLesson!.lessonId) + 1;
  }
  const latestAttempt = hero.recent?.length ? hero.recent[0] : null;
  const ON_TRACK_LINE = 50;
  const delta = hero.overallPercent - ON_TRACK_LINE;
  const barPct = Math.max(0, Math.min(100, hero.overallPercent));

  return (
    <div
      className="p-5 sm:p-6"
      style={{
        background: "var(--color-ink)",
        border: "2px solid var(--color-ember)",
        boxShadow: "4px 4px 0 var(--color-ember-dark)",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-600 uppercase tracking-wider mb-1"
            style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}
          >
            ⚠ Needs your attention
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h2
              className="text-xl sm:text-2xl font-900 leading-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-amber)" }}
            >
              {hero.name}
            </h2>
            {hero.status !== "on_track" && (
              <span
                className="px-2 py-0.5 text-[10px] font-700 uppercase tracking-wide"
                style={{
                  background: "rgba(240,165,0,0.12)",
                  border: "1px solid var(--color-amber)",
                  color: "var(--color-amber)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {hero.status.replace(/_/g, " ")}
              </span>
            )}
          </div>

          {/* Overall bar vs the on-track line */}
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-[10px] font-700 uppercase tracking-wider"
              style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}
            >
              Overall
            </span>
            <span
              className="text-[10px]"
              style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono)" }}
            >
              {ON_TRACK_LINE}% on-track line
            </span>
          </div>
          <div
            className="relative h-2 w-full"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${barPct}%`,
                background:
                  hero.overallPercent >= ON_TRACK_LINE
                    ? "var(--color-teal)"
                    : "var(--color-ember)",
              }}
            />
            <div
              className="absolute inset-y-0"
              style={{ left: `${ON_TRACK_LINE}%`, width: 2, background: "rgba(255,255,255,0.6)" }}
            />
          </div>
          <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className="text-2xl font-700 leading-none"
              style={{ fontFamily: "var(--font-mono)", color: "var(--color-amber)" }}
            >
              {hero.overallPercent}%
            </span>
            <span
              className="text-[11px] font-700"
              style={{
                color:
                  delta > 0
                    ? "var(--color-teal-light)"
                    : delta < 0
                      ? "var(--color-ember-light)"
                      : "rgba(255,255,255,0.4)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▾ ${delta}` : "≈"} vs {ON_TRACK_LINE}%
            </span>
            <span
              className="text-[11px]"
              style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}
            >
              {hero.attemptCount} attempt{hero.attemptCount === 1 ? "" : "s"}
            </span>
          </div>

          {connectionLesson ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className="text-[10px] font-700 uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}
              >
                Focus
              </span>
              <span
                className="flex items-center gap-2 px-2.5 py-1 text-xs font-600"
                style={{
                  background: "rgba(217,79,30,0.14)",
                  border: "1px solid rgba(217,79,30,0.45)",
                  color: "#fff",
                  fontFamily: "var(--font-body)",
                }}
              >
                {connectionLesson.lessonTitle}
                <span
                  className="text-[10px] font-500"
                  style={{
                    color: "var(--color-ember-light)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  #{connectionRank} hardest ·{" "}
                  {Math.round(connectionLesson.firstTryCorrectRate * 100)}% first-try
                </span>
              </span>
            </div>
          ) : latestAttempt ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className="text-[10px] font-700 uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}
              >
                Latest
              </span>
              <span
                className="px-2.5 py-1 text-xs font-600"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontFamily: "var(--font-body)",
                }}
              >
                {latestAttempt.score}/{latestAttempt.total} on{" "}
                {latestAttempt.lessonTitle ?? latestAttempt.quizTitle ?? "Quiz"}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setShowComposer((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600"
            style={{
              background: showComposer ? "var(--color-ember)" : "rgba(255,255,255,0.15)",
              color: "#fff",
              border: "none",
              fontFamily: "var(--font-body)",
              cursor: "pointer",
            }}
          >
            <MessageSquare size={12} /> Message
          </button>
          <div className="relative">
            <select
              className="appearance-none text-xs font-600 px-3 py-1.5 pr-7 outline-none"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                fontFamily: "var(--font-body)",
                cursor: "pointer",
              }}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) onAssign?.(hero.id, e.target.value);
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                Assign quiz ▾
              </option>
              {quizzesForAssign.map((q) => (
                <option key={q.id} value={q.id} style={{ color: "var(--color-ink)" }}>
                  {q.title}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => onCheckIn?.(hero)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600"
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
              fontFamily: "var(--font-body)",
              cursor: "pointer",
            }}
          >
            <UserCheck size={12} /> Checked in
          </button>
          <button
            onClick={() => navigate(`/admin/panel/reports?student=${hero.id}&range=${range}`)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-500"
            style={{
              color: "var(--color-amber)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            → Full report
          </button>
        </div>
      </div>
      {/* Inline message composer */}
      {showComposer && hero && (
        <div
          className="mt-3 pt-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${hero.name}…`}
            rows={2}
            autoFocus
            className="w-full px-2 py-1.5 text-xs outline-none resize-none mb-2"
            style={{
              border: "1px solid rgba(255,255,255,0.2)",
              fontFamily: "var(--font-body)",
              color: "#fff",
              background: "rgba(255,255,255,0.1)",
              borderRadius: 0,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || busy}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-600"
            style={{
              background: sent ? "var(--color-teal-dark)" : "var(--color-ember)",
              color: "#fff",
              border: "none",
              cursor: text.trim() && !busy ? "pointer" : "not-allowed",
              fontFamily: "var(--font-body)",
              opacity: text.trim() && !busy ? 1 : 0.5,
              transition: "background 0.2s",
            }}
          >
            {sent ? (
              <>
                <Check size={12} /> Sent!
              </>
            ) : (
              <>
                <MessageSquare size={12} /> Send
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Review queue (needs attention + quiet recently) ───────────────────────

function ReviewQueue({
  attention,
  quiet,
  range,
  handledIds,
  checkedInIds,
  handledRows,
  vsPrevious,
  onCheckIn,
  onSnooze,
  onRestore,
  quizzesForAssign,
  onAssign,
}: {
  attention: ClassStudent[];
  quiet: { studentId: string; name: string; daysSince: number }[];
  range: Range;
  handledIds: Set<string>;
  checkedInIds: Set<string>;
  handledRows: { id: string; name: string; reason: "check_in" | "snoozed" }[];
  vsPrevious?: ClassVsPrevious;
  onCheckIn: (s: ClassStudent) => void;
  onSnooze: (id: string) => void;
  onRestore: (id: string) => void;
  quizzesForAssign: { id: string; title: string }[];
  onAssign: (studentId: string, quizId: string) => void;
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"attention" | "quiet" | "handled">("attention");

  const openAttention = attention.filter(
    (a) => !handledIds.has(a.id) && !checkedInIds.has(a.id),
  );
  const openQuiet = quiet.filter(
    (q) => !handledIds.has(q.studentId) && !checkedInIds.has(q.studentId),
  );

  return (
    <div
      className="p-5"
      style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
    >
      {/* Tabs */}
      <div className="flex items-center gap-0 mb-3 border-b" style={{ borderColor: "var(--color-cream-dark)" }}>
        <button
          onClick={() => setTab("attention")}
          className="px-3 py-2 text-xs font-700 -mb-[1px] flex items-center gap-1.5"
          style={{
            borderBottom: tab === "attention" ? "2px solid var(--color-ember)" : "2px solid transparent",
            color: tab === "attention" ? "var(--color-ember)" : "var(--color-ink-muted)",
            background: "none",
            border: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            transition: "color 0.15s",
          }}
        >
          Needs attention ({openAttention.length})
          {vsPrevious?.hasPrevious && vsPrevious.attentionCountDelta != null && (
            <DeltaChip
              delta={-vsPrevious.attentionCountDelta}
              format={(d) => `−${d}`}
              goodWhenUp={false}
            />
          )}
        </button>
        <button
          onClick={() => setTab("quiet")}
          className="px-3 py-2 text-xs font-700 -mb-[1px] flex items-center gap-1.5"
          style={{
            borderBottom: tab === "quiet" ? "2px solid var(--color-ember)" : "2px solid transparent",
            color: tab === "quiet" ? "var(--color-ember)" : "var(--color-ink-muted)",
            background: "none",
            border: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            transition: "color 0.15s",
          }}
        >
          Quiet recently ({openQuiet.length})
          {vsPrevious?.hasPrevious && vsPrevious.quietCountDelta != null && (
            <DeltaChip
              delta={-vsPrevious.quietCountDelta}
              format={(d) => `−${d}`}
              goodWhenUp={false}
            />
          )}
        </button>
        <button
          onClick={() => setTab("handled")}
          className="px-3 py-2 text-xs font-700 -mb-[1px] flex items-center gap-1.5 ml-auto"
          style={{
            borderBottom: tab === "handled" ? "2px solid var(--color-ember)" : "2px solid transparent",
            color: tab === "handled" ? "var(--color-ember)" : "var(--color-ink-muted)",
            background: "none",
            border: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            transition: "color 0.15s",
          }}
        >
          <History size={12} />
          Handled ({handledRows.length})
        </button>
      </div>

      {/* Attention tab */}
      {tab === "attention" && (
        <div className="flex flex-col gap-2">
          {openAttention.length === 0 ? (
            <div className="py-8 text-center" style={{ border: "2px dashed var(--color-cream-dark)" }}>
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
                No student's recent trend is below the on-track threshold.
              </p>
            </div>
          ) : (
            openAttention.map((s) => (
              <AttentionRow
                key={s.id}
                student={s}
                onCheckIn={() => onCheckIn(s)}
                onSnooze={() => onSnooze(s.id)}
                quizzesForAssign={quizzesForAssign}
                onAssign={(quizId) => onAssign(s.id, quizId)}
              />
            ))
          )}
        </div>
      )}

      {/* Quiet tab */}
      {tab === "quiet" && (
        <div className="flex flex-col gap-2">
          {openQuiet.length === 0 ? (
            <div className="py-8 text-center" style={{ border: "2px dashed var(--color-cream-dark)" }}>
              <p
                className="text-sm font-500"
                style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
              >
                No drop-off detected.
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
              >
                Every active student has a recent attempt in the final quarter of{" "}
                {RANGE_LABELS[range].echo}.
              </p>
            </div>
          ) : (
            openQuiet.map((d) => (
              <Hoverable
                key={d.studentId}
                className="flex items-center justify-between px-3 py-2.5"
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
                    Last active {d.daysSince} day{d.daysSince === 1 ? "" : "s"} ago
                  </p>
                </div>
                <span
                  className="text-xs font-700"
                  style={{ color: "var(--color-ember)", fontFamily: "var(--font-mono)" }}
                >
                  {d.daysSince}d
                </span>
              </Hoverable>
            ))
          )}
        </div>
      )}

      {/* Handled tab — per-student undo */}
      {tab === "handled" && (
        <div className="flex flex-col gap-2">
          {handledRows.length === 0 ? (
            <div className="py-8 text-center" style={{ border: "2px dashed var(--color-cream-dark)" }}>
              <p
                className="text-sm font-500"
                style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
              >
                Nothing handled yet.
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
              >
                Check-in or snooze a student to move them here for a per-student undo.
              </p>
            </div>
          ) : (
            handledRows.map((h) => (
              <Hoverable
                key={h.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
                style={{ background: "var(--color-cream)" }}
                onClick={() => navigate("/admin/panel/students")}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <p
                    className="text-sm font-500 truncate"
                    style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}
                  >
                    {h.name}
                  </p>
                  <span
                    className="text-[10px] font-700 px-1.5 py-0.5 whitespace-nowrap"
                    style={{
                      background: "var(--color-cream-dark)",
                      color: "var(--color-ink-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {h.reason === "check_in" ? "Checked in" : "Snoozed"}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore(h.id);
                  }}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 font-600"
                  style={{
                    background: "white",
                    color: "var(--color-ember-dark)",
                    border: "2px solid var(--color-cream-dark)",
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-ink)";
                    e.currentTarget.style.boxShadow = "3px 3px 0 var(--color-ink)";
                    e.currentTarget.style.transform = "translate(-1px, -1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-cream-dark)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <RotateCcw size={11} /> Undo
                </button>
              </Hoverable>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function AttentionRow({
  student,
  onCheckIn,
  onSnooze,
  quizzesForAssign,
  onAssign,
}: {
  student: ClassStudent;
  onCheckIn: () => void;
  onSnooze: () => void;
  quizzesForAssign: { id: string; title: string }[];
  onAssign: (quizId: string) => void;
}) {
  const [showComposer, setShowComposer] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await Teacher.sendMessage(student.id, text.trim());
      setText("");
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setShowComposer(false);
      }, 2000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Hoverable
        className="flex items-center justify-between p-3"
        fullBorder
        style={{
          background: "var(--color-cream)",
          borderLeft: "4px solid var(--color-ember)",
        }}
        onClick={() => {}}
      >
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-600"
            style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}
          >
            {student.name}
          </p>
          <p
            className="text-xs"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
          >
            {student.overallPercent}% overall · {student.attemptCount} attempt
            {student.attemptCount === 1 ? "" : "s"}
            {student.recent?.length
              ? ` · last ${student.recent[0].firstTryCorrectCount}/${student.recent[0].total} first try`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowComposer((v) => !v);
            }}
            className="p-1.5"
            title="Message"
            style={{
              color: showComposer ? "var(--color-ember)" : "var(--color-ink-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <MessageSquare size={13} />
          </button>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <select
              className="appearance-none text-[10px] font-600 px-2 py-1 pr-4 outline-none"
              defaultValue=""
              style={{
                color: "var(--color-ink-muted)",
                background: "white",
                border: "1px solid var(--color-cream-dark)",
                fontFamily: "var(--font-body)",
                cursor: "pointer",
              }}
              onChange={(e) => {
                if (e.target.value) {
                  onAssign(e.target.value);
                  e.target.value = "";
                }
              }}
            >
              <option value="" disabled>
                + Quiz
              </option>
              {quizzesForAssign.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCheckIn();
            }}
            className="p-1.5"
            title="Checked in"
            style={{
              color: "var(--color-teal-dark)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Check size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSnooze();
            }}
            className="p-1.5"
            title="Snooze 3 days"
            style={{
              color: "var(--color-ink-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <X size={13} />
          </button>
        </div>
      </Hoverable>
      {showComposer && (
        <div
          className="px-3 pb-3 pt-2"
          style={{
            borderTop: "1px solid var(--color-cream-dark)",
            background: "white",
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a note…"
            rows={2}
            autoFocus
            className="w-full px-2 py-1.5 text-xs outline-none resize-none mb-2"
            style={{
              border: "1px solid var(--color-cream-dark)",
              fontFamily: "var(--font-body)",
              color: "var(--color-ink)",
              borderRadius: 0,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-ink)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--color-cream-dark)";
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || busy}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-600"
            style={{
              background: sent ? "var(--color-teal-dark)" : "var(--color-ember)",
              color: "#fff",
              border: "none",
              cursor: text.trim() && !busy ? "pointer" : "not-allowed",
              fontFamily: "var(--font-body)",
              opacity: text.trim() && !busy ? 1 : 0.5,
              transition: "background 0.2s",
            }}
          >
            {sent ? (
              <>
                <Check size={12} /> Sent!
              </>
            ) : (
              <>
                <MessageSquare size={12} /> Send
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Notable attempts ──────────────────────────────────────────────────────

function notableAttempts(students: ClassStudent[]): {
  studentId: string;
  studentName: string;
  attemptId: string;
  quizTitle: string | null;
  lessonTitle: string | null;
  score: number;
  total: number;
  pct: number;
  reason: "lowest" | "biggest-improvement" | "biggest-drop";
  deltaText: string | null;
}[] {
  type FlatAttempt = {
    studentId: string;
    studentName: string;
    attemptId: string;
    quizTitle: string | null;
    lessonTitle: string | null;
    score: number;
    total: number;
    pct: number;
    completedAt: string;
    reason: "lowest" | "biggest-improvement" | "biggest-drop";
    deltaText: string | null;
  };

  // Flatten all in-period attempts, tagged with the student.
  const flat: FlatAttempt[] = [];
  for (const s of students) {
    for (const a of s.recent ?? []) {
      if (a.total <= 0) continue;
      flat.push({
        studentId: s.id,
        studentName: s.name,
        attemptId: a.attemptId,
        quizTitle: a.quizTitle,
        lessonTitle: a.lessonTitle,
        score: a.score,
        total: a.total,
        pct: a.score / a.total,
        completedAt: a.completedAt,
        reason: "lowest" as const,
        deltaText: null,
      });
    }
  }
  if (flat.length === 0) return [];

  // Build per-student ordered lists for improvement / drop detection.
  const byStudent: Record<string, FlatAttempt[]> = {};
  for (const f of flat) {
    (byStudent[f.studentId] ??= []).push(f);
  }
  for (const arr of Object.values(byStudent)) {
    arr.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  }

  const candidates: FlatAttempt[] = [];

  // 1) Lowest score
  let lowest = flat[0];
  for (const f of flat) if (f.pct < lowest.pct) lowest = f;
  candidates.push({ ...lowest, reason: "lowest", deltaText: null });

  // 2) Biggest improvement & drop (consecutive attempts for same student)
  let bestImprov: FlatAttempt | null = null;
  let bestImprovDelta = 0;
  let worstDrop: FlatAttempt | null = null;
  let worstDropDelta = 0;
  for (const arr of Object.values(byStudent)) {
    for (let i = 1; i < arr.length; i++) {
      const prev = arr[i - 1];
      const cur = arr[i];
      const delta = cur.pct - prev.pct;
      if (delta > bestImprovDelta) {
        bestImprovDelta = delta;
        bestImprov = {
          ...cur,
          reason: "biggest-improvement",
          deltaText: `▲ +${Math.round(delta * 100)}% vs prior run`,
        };
      }
      if (delta < worstDropDelta) {
        worstDropDelta = delta;
        worstDrop = {
          ...cur,
          reason: "biggest-drop",
          deltaText: `▼ ${Math.round(delta * 100)}% vs prior run`,
        };
      }
    }
  }
  if (bestImprov) candidates.push(bestImprov);
  if (worstDrop) candidates.push(worstDrop);

  // Deduplicate by studentId — keep the first occurrence (priority = lowest, improv, drop).
  const seen = new Set<string>();
  const out: FlatAttempt[] = [];
  for (const c of candidates) {
    if (seen.has(c.studentId)) continue;
    seen.add(c.studentId);
    out.push(c);
  }
  return out.slice(0, 3);
}

function NotableAttempts({
  attempts,
  range,
}: {
  attempts: ReturnType<typeof notableAttempts>;
  range: Range;
}) {
  const navigate = useNavigate();
  if (attempts.length === 0) {
    return (
      <div
        className="p-5"
        style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
      >
        <h2
          className="text-base font-700 mb-3"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          Notable attempts
        </h2>
        <p
          className="text-sm italic"
          style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
        >
          No completed attempts in {RANGE_LABELS[range].echo}.
        </p>
      </div>
    );
  }
  return (
    <div
      className="p-5"
      style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}
    >
      <h2
        className="text-base font-700 mb-3"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
      >
        Notable attempts
      </h2>
      <div className="flex flex-col gap-1.5">
        {attempts.map((a) => (
          <button
            key={`${a.studentId}-${a.attemptId}`}
            onClick={() =>
              navigate(
                `/admin/panel/reports?student=${a.studentId}&range=${range}&attempt=${a.attemptId}`,
              )
            }
            className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-left"
            style={{
              background: "var(--color-cream)",
              border: `1px solid var(--color-cream-dark)`,
              borderLeft: `3px solid ${accentColor(a.pct * 100)}`,
              borderRadius: 0,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              color: "var(--color-ink)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-ink)";
              e.currentTarget.style.boxShadow = "3px 3px 0 var(--color-ink)";
              e.currentTarget.style.transform = "translate(-1px, -1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-cream-dark)";
              e.currentTarget.style.borderLeftColor = accentColor(a.pct * 100);
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "none";
            }}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="font-600 truncate">{a.studentName}</span>
              <span className="text-[10px] text-ellipsis" style={{ color: "var(--color-ink-muted)" }}>
                {a.lessonTitle ?? a.quizTitle ?? "Quiz"}
              </span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              {a.deltaText && (
                <span
                  className="text-[10px] font-600"
                  style={{
                    color: a.reason === "biggest-improvement" ? "var(--color-teal-dark)" : "var(--color-ember-dark)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {a.deltaText}
                </span>
              )}
              <span
                className="text-[10px] px-1.5 py-0.5 font-700"
                style={{
                  background: accentColor(a.pct * 100),
                  color: "#fff",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {a.score}/{a.total}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Stat cards ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  bg,
  color,
  sub,
  delta,
  deltaFormat,
  deltaGoodWhenUp = true,
}: {
  label: string;
  value: string;
  bg: string;
  color: string;
  sub?: string;
  delta?: number | null;
  deltaFormat?: (d: number) => string;
  deltaGoodWhenUp?: boolean;
}) {
  return (
    <Hoverable
      disabled
      className="p-4 sm:p-5"
      style={{ background: bg, border: "2px solid var(--color-cream-dark)" }}
    >
      <p
        className="text-2xl sm:text-3xl font-900 leading-none mb-1"
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
      <div className="flex items-center gap-2 mt-1.5">
        {sub && (
          <p
            className="text-[10px]"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
          >
            {sub}
          </p>
        )}
        {delta != null && deltaFormat && (
          <DeltaChip delta={delta} format={deltaFormat} goodWhenUp={deltaGoodWhenUp} />
        )}
      </div>
    </Hoverable>
  );
}

// ─── Mastery badge ─────────────────────────────────────────────────────────

function MasteryBadge({ label }: { label: string }) {
  const tone =
    label === "Strong"
      ? { bg: "var(--color-teal-dark)", text: "#fff" }
      : label === "Getting there"
        ? { bg: "#E47A55", text: "#1C0F00" }
        : { bg: "var(--color-ember)", text: "#fff" };
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
      {label}
    </span>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────

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

// ─── Subject overview (read-only, demoted) ────────────────────────────────

function SubjectOverview({
  bySubject,
}: {
  bySubject: Record<
    "math" | "physics",
    {
      label: string;
      lessons: { lessonId: string; lessonTitle: string; firstTryCorrectRate: number }[];
    }
  >;
}) {
  return (
    <div className="flex flex-col gap-4">
      {(["math", "physics"] as const).map((subj) => {
        const s = bySubject[subj];
        if (!s || s.lessons.length === 0) return null;
        return (
          <div key={subj}>
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-xs font-600 uppercase tracking-wider"
                style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
              >
                {s.label}
              </span>
              <span
                className="text-xs"
                style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}
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
                    style={{ color: accentColor(l.firstTryCorrectRate * 100), fontFamily: "var(--font-mono)" }}
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

// ─── Main dashboard ────────────────────────────────────────────────────────

const SNOOZE_KEY = "quizz:dash-snooze";
const SNOOZE_DAYS = 3;

function readSnoozed(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SNOOZE_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeSnoozed(m: Record<string, string>) {
  try {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(m));
  } catch { /* */ }
}

export default function AdminDashboard() {
  const { quizzes, students, teacherName } = useApp();
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>("month");
  const [classReport, setClassReport] = useState<ClassReport | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Client-side state for action results (no refetch needed).
  const [handledIds, setHandledIds] = useState<Set<string>>(new Set());
  const [snoozed, setSnoozed] = useState<Record<string, string>>(readSnoozed);
  // Quizzes assigned from the dashboard during this session, keyed "studentId:quizId".
  const [justAssigned, setJustAssigned] = useState<Set<string>>(new Set());

  // Fetch the (potentially heavy) class report on mount + range change.
  useEffect(() => {
    let cancelled = false;
    setClassReport(null);
    Teacher.classReport(range)
      .then((r) => {
        if (!cancelled) setClassReport(r);
      })
      .catch((e) => console.warn("classReport", e));
    return () => {
      cancelled = true;
    };
  }, [range]);

  // ── Derived data ──

  const now = new Date();

  const flagged = useMemo(() => {
    if (!classReport) return [];
    return classReport.students
      .filter(
        (s) =>
          s.status === "needs_attention" &&
          !handledIds.has(s.id) &&
          !s.checkedInAt &&
          (!snoozed[s.id] || new Date(snoozed[s.id]) < now),
      )
      .sort((a, b) => a.overallPercent - b.overallPercent);
  }, [classReport, handledIds, snoozed, now]);

  const hero = flagged[0] ?? null;

  // Server-persisted check-ins (stored on the student doc, returned by the
  // class report) so a check-in survives a refresh or a different device.
  // Handled rows fold out of both the featured hero and the review queue.
  const checkedInIds = useMemo(() => {
    return new Set(
      (classReport?.students ?? [])
        .filter((s) => s.checkedInAt != null)
        .map((s) => s.id),
    );
  }, [classReport]);

  // Handled rows for the per-student undo tab: students from the attention or
  // quiet queues who are hidden because of a check-in or an active snooze.
  const handledRows = useMemo(() => {
    if (!classReport) return [];
    const quietIds = new Set(
      (classReport.engagementDropOff ?? []).map((d) => d.studentId),
    );
    const rows: { id: string; name: string; reason: "check_in" | "snoozed" }[] = [];
    for (const s of classReport.students) {
      if (s.status !== "needs_attention" && !quietIds.has(s.id)) continue;
      if (!handledIds.has(s.id) && !checkedInIds.has(s.id)) {
        const until = snoozed[s.id];
        if (!until || new Date(until) < now) continue;
      }
      rows.push({
        id: s.id,
        name: s.name,
        reason: checkedInIds.has(s.id) || handledIds.has(s.id) ? "check_in" : "snoozed",
      });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [classReport, handledIds, checkedInIds, snoozed, now]);

  const attentionMap = useMemo(() => {
    const m: Record<string, ClassStudent> = {};
    for (const s of classReport?.students ?? []) m[s.id] = s;
    return m;
  }, [classReport]);

  const lessonMap = useMemo(() => {
    const m: Record<string, ClassLessonDifficulty> = {};
    for (const l of classReport?.perLessonDifficulty ?? []) m[l.lessonId] = l;
    return m;
  }, [classReport]);

  const quizzesForAssign = useMemo(() => {
    // Filter out quizzes the teacher has already assigned to the hero, using
    // the canonical roster from the app context (ClassStudent doesn't carry it)
    // plus anything assigned from this dashboard session.
    const appStudent = students.find((st) => st.id === hero?.id);
    const alreadyAssigned = new Set(appStudent?.assignedQuizIds ?? []);
    for (const key of justAssigned) {
      if (key.startsWith(`${hero?.id}:`)) alreadyAssigned.add(key.split(":")[1]);
    }
    return quizzes
      .filter((q) => q.status !== "archived" && !alreadyAssigned.has(q.id))
      .map((q) => ({ id: q.id, title: q.title }));
  }, [quizzes, students, hero, justAssigned]);

  // Stats: reduced from classReport.students (same totals the old dashboard computed).
  const statTotals = useMemo(() => {
    const s = classReport?.students ?? [];
    return {
      attempts: s.reduce((n, x) => n + x.attemptCount, 0),
      questionsAnswered: s.reduce((n, x) => n + (x.firstTryQuestions ?? 0), 0),
      solvedFirstTry: s.reduce((n, x) => n + (x.firstTryCorrectCount ?? 0), 0),
      active: s.filter((x) => x.attemptCount > 0).length,
    };
  }, [classReport]);

  // Subject grouping for the demoted subjects card.
  const bySubject = useMemo(() => {
    const out: Record<"math" | "physics", { label: string; lessons: ClassLessonDifficulty[] }> = {
      math: { label: "Math", lessons: [] },
      physics: { label: "Physics", lessons: [] },
    };
    for (const l of classReport?.perLessonDifficulty ?? []) {
      if (l.subject === "math" || l.subject === "physics") {
        out[l.subject].lessons.push(l);
      }
    }
    return out;
  }, [classReport]);

  // Notable attempts (collapsed rows so the teacher doesn't need to expand).
  const notable = useMemo(
    () => notableAttempts(classReport?.students ?? []),
    [classReport],
  );

  // ── Action handlers ──

  const handleAssign = useCallback(
    async (studentId: string, quizId: string) => {
      try {
        await Teacher.assignOne(studentId, quizId);
        // Track in the local "recently assigned" set so the quiz disappears
        // from the dropdown; the roster list is refreshed on next load.
        setJustAssigned((prev) => new Set(prev).add(`${studentId}:${quizId}`));
      } catch (e) {
        console.warn("assign", e);
      }
    },
    [],
  );

  const handleCheckIn = useCallback(async (s: ClassStudent) => {
    try {
      await Teacher.checkIn(s.id, true);
      setHandledIds((prev) => new Set(prev).add(s.id));
    } catch (e) {
      console.warn("check-in", e);
    }
  }, []);

  const handleSnooze = useCallback((id: string) => {
    const until = new Date();
    until.setDate(until.getDate() + SNOOZE_DAYS);
    const next = { ...readSnoozed(), [id]: until.toISOString() };
    writeSnoozed(next);
    setSnoozed(next);
  }, []);

  const handleRestore = useCallback(async (id: string) => {
    // Clear the server check-in marker (the persistent source of truth) so
    // the student stays restored after a refresh, then drop local snooze.
    await Teacher.checkIn(id, false).catch(() => {});
    setHandledIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSnoozed((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      writeSnoozed(next);
      return next;
    });
  }, []);

  // ── Range echo ──

  const rangeEcho = useMemo(() => {
    const start = rangeStart(range);
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(now)}`;
  }, [range, now]);

  if (!classReport) {
    return (
      <div className="px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 max-w-5xl">
        <div className="flex items-center justify-center py-20">
          <p
            className="text-sm"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
          >
            Loading dashboard…
          </p>
        </div>
      </div>
    );
  }

  const activeStudentCount = statTotals.active;

  return (
    <div className="px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 max-w-5xl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
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
        <div className="flex items-center gap-3">
          <PeriodSelector value={range} onChange={setRange} />
        </div>
      </div>
      <p
        className="text-[11px] -mt-3 mb-5"
        style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}
      >
        Showing: {RANGE_LABELS[range].echo} · {rangeEcho}
      </p>

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* Featured insight — full width, always first */}
        <section className="order-1 lg:order-1 lg:col-span-6">
          <FeaturedInsight
            hero={hero}
            range={range}
            onCheckIn={hero ? () => handleCheckIn(hero) : undefined}
            quizzesForAssign={quizzesForAssign}
            onAssign={hero ? (quizId) => handleAssign(hero.id, quizId) : undefined}
            lessonMap={lessonMap}
          />
        </section>

        {/* Review queue — mobile 2nd, desktop row 2 left */}
        <section className="order-2 lg:order-2 lg:col-span-3">
          <ReviewQueue
            attention={flagged}
            quiet={classReport.engagementDropOff ?? []}
            range={range}
            handledIds={handledIds}
            checkedInIds={checkedInIds}
            handledRows={handledRows}
            vsPrevious={classReport.vsPrevious}
            onCheckIn={handleCheckIn}
            onSnooze={handleSnooze}
            onRestore={handleRestore}
            quizzesForAssign={quizzesForAssign}
            onAssign={(sid, qid) => handleAssign(sid, qid)}
          />
        </section>

        {/* Notable attempts — mobile 3rd, desktop row 3 right */}
        <section className="order-3 lg:order-5 lg:col-span-3">
          <NotableAttempts attempts={notable} range={range} />
        </section>

        {/* Stat cards — mobile 4th, desktop row 2 right */}
        <section className="order-4 lg:order-3 lg:col-span-3">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatCard
              label="Total Students"
              value={String(classReport.totalStudents)}
              sub={`${activeStudentCount} active this period`}
              bg="#E6F5F5"
              color="var(--color-teal-dark)"
              delta={classReport.vsPrevious?.activeStudentsDelta}
              deltaFormat={(d) => `${d > 0 ? "+" : ""}${d} student${Math.abs(d) === 1 ? "" : "s"} vs ${RANGE_LABELS[range].prev}`}
              deltaGoodWhenUp={true}
            />
            <StatCard
              label="Attempts logged"
              value={String(statTotals.attempts)}
              sub={`across ${quizzes.filter((q) => q.status === "active").length} active quizzes`}
              bg="#FDECEA"
              color="var(--color-ember)"
              delta={classReport.vsPrevious?.attemptsDeltaPct}
              deltaFormat={(d) => `${Math.abs(d)}% vs ${RANGE_LABELS[range].prev}`}
              deltaGoodWhenUp={true}
            />
            <StatCard
              label="Questions answered"
              value={String(statTotals.questionsAnswered)}
              sub="first-try attempts across the class"
              bg="var(--color-cream-dark)"
              color="var(--color-ink)"
              delta={classReport.vsPrevious?.questionsDeltaPct}
              deltaFormat={(d) => `${Math.abs(d)}% vs ${RANGE_LABELS[range].prev}`}
              deltaGoodWhenUp={true}
            />
            <StatCard
              label="Solved first try"
              value={String(statTotals.solvedFirstTry)}
              sub="answered correctly on the first pick"
              bg="#FFF8E6"
              color="var(--color-amber-dark)"
              delta={classReport.vsPrevious?.firstTryDeltaPct}
              deltaFormat={(d) => `${Math.abs(d)}% vs ${RANGE_LABELS[range].prev}`}
              deltaGoodWhenUp={true}
            />
          </div>
        </section>

        {/* Hardest lessons — mobile 5th, desktop row 3 left */}
        <section className="order-5 lg:order-4 lg:col-span-3">
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
            {(classReport.perLessonDifficulty?.length ?? 0) > 0 ? (
              <ol className="flex flex-col gap-2">
                {classReport.perLessonDifficulty.slice(0, 5).map((l, i) => {
                  const lessonDelta = classReport.vsPrevious?.perLesson?.[l.lessonId];
                  // Count how many currently-flagged students have recent attempts on this lesson.
                  const flaggedHere = flagged.filter((f) =>
                    (f.recent ?? []).some((r) => r.lessonId === l.lessonId),
                  ).length;
                  return (
                    <li key={l.lessonId}>
                      <Hoverable
                        className="flex items-center gap-3 px-3 py-2"
                        style={{
                          background: "var(--color-cream)",
                          borderLeft: `4px solid ${accentColor(l.firstTryCorrectRate * 100)}`,
                        }}
                        onClick={() =>
                          navigate(`/admin/panel/reports?range=${range}`)
                        }
                      >
                        <span
                          className="text-xs font-700 w-5"
                          style={{ fontFamily: "var(--font-mono)", color: "var(--color-ink-muted)" }}
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
                            {flaggedHere > 0 && (
                              <span style={{ color: "var(--color-ember-dark)" }}>
                                {" "}
                                · {flaggedHere} flagged student{flaggedHere === 1 ? "" : "s"}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {lessonDelta != null && (
                            <DeltaChip
                              delta={lessonDelta}
                              format={(d) => `${d} pts`}
                              goodWhenUp={true}
                            />
                          )}
                          <MasteryBadge label={l.firstTryCorrectRateLabel} />
                        </div>
                      </Hoverable>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <Empty>No quiz attempts yet.</Empty>
            )}
          </div>
        </section>

        {/* Subjects at a glance — read-only, demoted to the bottom */}
        <section className="order-6 lg:order-6 lg:col-span-6">
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
            {(classReport.perLessonDifficulty?.length ?? 0) > 0 ? (
              <SubjectOverview bySubject={bySubject} />
            ) : (
              <Empty>No quiz attempts yet.</Empty>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
