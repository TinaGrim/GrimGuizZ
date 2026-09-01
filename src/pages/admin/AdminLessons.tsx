import { useState } from "react";
import { useApp } from "../../store/AppContext";
import { Teacher } from "../../api/client";
import { useConfirm } from "../../components/ConfirmDialog";
import {
  Plus,
  Check,
  X,
  BookOpen,
  FolderTree,
  Edit3,
  Trash2,
  ChevronDown,
} from "lucide-react";

export default function AdminLessons() {
  const {
    chapters,
    lessons,
    quizzes,
    refreshLessons,
    refreshChapters,
    refreshQuizzes,
  } = useApp();
  const { confirm } = useConfirm();

  // New-lesson form state
  const [newChapterId, setNewChapterId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Per-row edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editChapterId, setEditChapterId] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ─── Create ─────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newChapterId) {
      setError("Pick a chapter first.");
      return;
    }
    if (!newTitle.trim()) {
      setError("Lesson title is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await Teacher.createLesson({
        chapterId: newChapterId,
        title: newTitle.trim(),
      });
      await refreshLessons();
      await refreshChapters();
      setNewTitle("");
      setNewChapterId("");
      setShowForm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // ─── Edit ───────────────────────────────────────────────────────────────

  const startEdit = (id: string) => {
    const l = lessons.find((x) => x.id === id);
    if (!l) return;
    setEditingId(id);
    setEditTitle(l.title);
    setEditChapterId(l.chapterId);
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editTitle.trim()) {
      setError("Lesson title is required.");
      return;
    }
    if (!editChapterId) {
      setError("Pick a chapter first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await Teacher.updateLesson(editingId, {
        title: editTitle.trim(),
        chapterId: editChapterId,
      });
      await refreshLessons();
      await refreshChapters();
      setEditingId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    const l = lessons.find((x) => x.id === id);
    if (!l) return;
    const ok = await confirm({
      title: "Delete this lesson?",
      message:
        "It will be blocked if any quizzes still reference it — you'll see a clear error if so.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setError("");
    try {
      await Teacher.deleteLesson(id);
      await refreshLessons();
      await refreshChapters();
      await refreshQuizzes();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="font-900 text-3xl mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Lessons
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
          >
            {lessons.length} lesson{lessons.length !== 1 ? "s" : ""} across{" "}
            {chapters.length} chapter{chapters.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setError("");
          }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-600"
          style={{
            background: "var(--color-ember)",
            color: "#fff",
            border: "2px solid var(--color-ink)",
            boxShadow: "3px 3px 0 var(--color-ink)",
            fontFamily: "var(--font-body)",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "5px 5px 0 var(--color-ink)";
            e.currentTarget.style.transform = "translate(-2px, -2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "3px 3px 0 var(--color-ink)";
            e.currentTarget.style.transform = "none";
          }}
        >
          <Plus size={15} />
          {showForm ? "Cancel" : "New Lesson"}
        </button>
      </div>

      {error && (
        <div
          className="mb-4 p-3 text-sm"
          style={{
            background: "#FDECEA",
            border: "1px solid var(--color-ember)",
            color: "var(--color-ember-dark)",
            fontFamily: "var(--font-body)",
          }}
        >
          {error}
        </div>
      )}

      {showForm && (
        <div
          className="p-5 mb-6 animate-slide-up flex flex-col gap-3"
          style={{
            background: "white",
            border: "2px solid var(--color-ink)",
            boxShadow: "4px 4px 0 var(--color-amber)",
          }}
        >
          <label
            className="text-xs font-600 uppercase tracking-wider"
            style={{
              color: "var(--color-ink-muted)",
              fontFamily: "var(--font-body)",
              letterSpacing: "0.1em",
            }}
          >
            Chapter *
          </label>
          <select
            value={newChapterId}
            onChange={(e) => setNewChapterId(e.target.value)}
            className="px-3 py-2.5 text-sm outline-none"
            style={{
              border: "2px solid var(--color-cream-dark)",
              fontFamily: "var(--font-body)",
              color: "var(--color-ink)",
              background: "white",
              borderRadius: 0,
            }}
          >
            <option value="">Pick a chapter…</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <label
            className="text-xs font-600 uppercase tracking-wider mt-1"
            style={{
              color: "var(--color-ink-muted)",
              fontFamily: "var(--font-body)",
              letterSpacing: "0.1em",
            }}
          >
            Lesson title *
          </label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Newton's Third Law"
            autoFocus={!!newChapterId}
            className="px-3 py-2.5 text-sm outline-none"
            style={{
              border: "2px solid var(--color-cream-dark)",
              fontFamily: "var(--font-body)",
              color: "var(--color-ink)",
              borderRadius: 0,
            }}
          />

          <div className="flex gap-2 mt-1">
            <button
              onClick={handleCreate}
              disabled={!newChapterId || !newTitle.trim() || busy}
              className="flex items-center gap-1 px-3 py-2 text-sm font-600"
              style={{
                background: "var(--color-teal-dark)",
                color: "#fff",
                border: "none",
                cursor:
                  newChapterId && newTitle.trim() && !busy ? "pointer" : "not-allowed",
                fontFamily: "var(--font-body)",
                opacity:
                  newChapterId && newTitle.trim() && !busy ? 1 : 0.5,
              }}
            >
              <Check size={14} /> {busy ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setNewTitle("");
                setNewChapterId("");
              }}
              className="px-3 py-2"
              style={{
                background: "var(--color-cream-dark)",
                border: "none",
                cursor: "pointer",
                color: "var(--color-ink-muted)",
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {chapters.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-12 text-center"
            style={{ border: "2px dashed var(--color-cream-dark)" }}
          >
            <FolderTree
              size={28}
              style={{ color: "var(--color-cream-dark)", marginBottom: 8 }}
            />
            <p
              className="text-sm"
              style={{
                color: "var(--color-ink-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              No chapters yet — create one first.
            </p>
          </div>
        )}
        {chapters.map((c) => {
          const lessonsHere = lessons.filter((l) => l.chapterId === c.id);
          if (lessonsHere.length === 0) return null;
          const isExpanded = expandedId === c.id;
          return (
            <div
              key={c.id}
              style={{
                background: "white",
                border: "2px solid var(--color-cream-dark)",
                borderLeft: "5px solid var(--color-teal-dark)",
              }}
            >
              <div
                className="px-4 py-3 border-b lesson-header"
                style={{
                  borderBottom: "1px solid var(--color-cream-dark)",
                  background: "var(--color-cream)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onClick={() => setExpandedId(isExpanded ? null : c.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "3px 3px 0 var(--color-ink)";
                  e.currentTarget.style.transform = "translate(-1px, -1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <p
                    className="text-sm font-700"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--color-ink)",
                    }}
                  >
                    {c.name}
                  </p>
                  <p
                    className="text-xs"
                    style={{
                      color: "var(--color-ink-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {lessonsHere.length} lesson{lessonsHere.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className="lesson-chevron"
                  style={{
                    color: "var(--color-ink)",
                    transform: isExpanded ? "rotate(180deg)" : "none",
                    transition: "transform 0.15s, opacity 0.15s",
                    opacity: isExpanded ? 1 : undefined,
                  }}
                />
              </div>
              {isExpanded && (
                <div className="flex flex-col animate-slide-up">
                  {lessonsHere.map((l, idx) => {
                    const qs = quizzes.filter((q) => q.lessonId === l.id);
                  const isEditing = editingId === l.id;
                  return (
                    <div
                      key={l.id}
                      className="px-4 py-2.5 flex items-center justify-between gap-2"
                      style={{
                        borderTop: idx === 0 ? "none" : "1px solid var(--color-cream-dark)",
                      }}
                    >
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            autoFocus
                            className="flex-1 min-w-[160px] px-2 py-1 text-sm outline-none"
                            style={{
                              border: "2px solid var(--color-ink)",
                              fontFamily: "var(--font-body)",
                              color: "var(--color-ink)",
                              borderRadius: 0,
                            }}
                          />
                          <select
                            value={editChapterId}
                            onChange={(e) => setEditChapterId(e.target.value)}
                            className="px-2 py-1 text-xs outline-none"
                            style={{
                              border: "2px solid var(--color-cream-dark)",
                              fontFamily: "var(--font-body)",
                              color: "var(--color-ink)",
                              background: "white",
                              borderRadius: 0,
                            }}
                          >
                            {chapters.map((cc) => (
                              <option key={cc.id} value={cc.id}>
                                {cc.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={saveEdit}
                            disabled={!editTitle.trim() || busy}
                            className="p-1.5"
                            style={{
                              background: "var(--color-teal-dark)",
                              color: "#fff",
                              border: "none",
                              cursor:
                                !editTitle.trim() || busy ? "not-allowed" : "pointer",
                              opacity: !editTitle.trim() || busy ? 0.5 : 1,
                            }}
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5"
                            style={{
                              background: "var(--color-cream-dark)",
                              color: "var(--color-ink-muted)",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 min-w-0">
                            <BookOpen
                              size={13}
                              style={{ color: "var(--color-ink-muted)", flexShrink: 0 }}
                            />
                            <span
                              className="text-sm truncate"
                              style={{
                                fontFamily: "var(--font-body)",
                                color: "var(--color-ink)",
                              }}
                            >
                              {l.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span
                              className="text-xs"
                              style={{
                                color: "var(--color-ink-muted)",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {qs.length} quiz{qs.length !== 1 ? "zes" : ""}
                            </span>
                            <button
                              onClick={() => startEdit(l.id)}
                              className="p-1.5"
                              title="Edit lesson"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--color-ink-muted)",
                                opacity: 0.5,
                              }}
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(l.id)}
                              className="p-1.5"
                              title="Delete lesson"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--color-ink-muted)",
                                opacity: 0.5,
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          );
        })}
        {chapters.length > 0 &&
          chapters.every((c) => lessons.filter((l) => l.chapterId === c.id).length === 0) && (
            <div
              className="flex flex-col items-center justify-center py-12 text-center"
              style={{ border: "2px dashed var(--color-cream-dark)" }}
            >
              <p
                className="text-sm"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                No lessons yet — create one above.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}