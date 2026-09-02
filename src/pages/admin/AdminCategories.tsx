import { useState } from "react";
import { useApp } from "../../store/AppContext";
import { Teacher } from "../../api/client";
import { useConfirm } from "../../components/ConfirmDialog";
import {
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  FolderTree,
  BookOpen,
  ChevronDown,
} from "lucide-react";

export default function AdminCategories() {
  const {
    chapters,
    lessons,
    quizzes,
    refreshChapters,
    refreshLessons,
  } = useApp();
  const { confirm } = useConfirm();
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    setError("");
    try {
      await Teacher.createChapter({ name: newName.trim(), description: newDesc.trim() });
      await refreshChapters();
      setNewName("");
      setNewDesc("");
      setShowForm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete this chapter?",
      message:
        "It will be blocked if any lessons still reference it — you'll see a clear error message if so.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setError("");
    try {
      await Teacher.deleteChapter(id);
      await Promise.all([refreshChapters(), refreshLessons()]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const startEdit = (id: string, name: string, description: string) => {
    setEditing(id);
    setEditName(name);
    setEditDesc(description ?? "");
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      await Teacher.updateChapter(editing, {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      await refreshChapters();
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="font-900 text-3xl mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Chapters
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
          >
            {chapters.length} chapter{chapters.length !== 1 ? "s" : ""} ·{" "}
            {lessons.length} lesson{lessons.length !== 1 ? "s" : ""} (Math, Physics, or anything else)
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
          }}
        >
          <Plus size={15} />
          {showForm ? "Cancel" : "New Chapter"}
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
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Chapter name (e.g. Algebra)"
            autoFocus
            className="px-3 py-2 text-sm outline-none"
            style={{
              border: "2px solid var(--color-cream-dark)",
              fontFamily: "var(--font-body)",
              color: "var(--color-ink)",
              borderRadius: 0,
            }}
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Short description"
            rows={2}
            className="px-3 py-2 text-sm outline-none resize-none"
            style={{
              border: "2px solid var(--color-cream-dark)",
              fontFamily: "var(--font-body)",
              color: "var(--color-ink)",
              borderRadius: 0,
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || busy}
              className="flex items-center gap-1 px-3 py-2 text-sm font-600"
              style={{
                background: "var(--color-teal-dark)",
                color: "#fff",
                border: "none",
                cursor: newName.trim() && !busy ? "pointer" : "not-allowed",
                fontFamily: "var(--font-body)",
                opacity: newName.trim() && !busy ? 1 : 0.5,
              }}
            >
              <Check size={14} /> Save
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setNewName("");
                setNewDesc("");
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

      <div className="flex flex-col gap-3">
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
              No chapters yet — add one to start building.
            </p>
          </div>
        )}
        {chapters.map((c) => {
          const lessonsHere = lessons.filter((l) => l.chapterId === c.id);
          const quizzesHere = quizzes.filter((q) =>
            lessonsHere.some((l) => l.id === q.lessonId),
          );
          const isEditing = editing === c.id;
          const isExpanded = expandedId === c.id;
          return (
            <div
              key={c.id}
              style={{
                background: "white",
                border: "2px solid var(--color-cream-dark)",
                borderLeft: "5px solid var(--color-ember)",
              }}
            >
              <div
                className="flex items-center justify-between p-4 chapter-header"
                onMouseEnter={(e) => {
                  if (isEditing) return;
                  e.currentTarget.style.boxShadow = "3px 3px 0 var(--color-ink)";
                  e.currentTarget.style.transform = "translate(-1px, -1px)";
                }}
                onMouseLeave={(e) => {
                  if (isEditing) return;
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "none";
                }}
              >
                {isEditing ? (
                  <div className="flex-1 flex flex-col gap-2 pr-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-2 py-1.5 text-sm outline-none"
                      style={{
                        border: "2px solid var(--color-ink)",
                        fontFamily: "var(--font-body)",
                        color: "var(--color-ink)",
                        borderRadius: 0,
                      }}
                    />
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={2}
                      className="px-2 py-1.5 text-sm outline-none resize-none"
                      style={{
                        border: "2px solid var(--color-cream-dark)",
                        fontFamily: "var(--font-body)",
                        color: "var(--color-ink)",
                        borderRadius: 0,
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="flex-1 pr-3"
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <p
                      className="text-base font-700"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "var(--color-ink)",
                      }}
                    >
                      {c.name}
                    </p>
                    {c.description && (
                      <p
                        className="text-xs"
                        style={{
                          color: "var(--color-ink-muted)",
                          fontFamily: "var(--font-body)",
                          marginTop: 2,
                        }}
                      >
                        {c.description}
                      </p>
                    )}
                    <p
                      className="text-xs mt-1"
                      style={{
                        color: "var(--color-ink-muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {lessonsHere.length} lesson{lessonsHere.length !== 1 ? "s" : ""} ·{" "}
                      {quizzesHere.length} quiz{quizzesHere.length !== 1 ? "zes" : ""}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        onClick={saveEdit}
                        disabled={!editName.trim() || busy}
                        className="p-1.5"
                        style={{
                          background: "var(--color-teal-dark)",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="p-1.5"
                        style={{
                          background: "var(--color-cream-dark)",
                          color: "var(--color-ink-muted)",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        className="p-1 chapter-chevron-btn"
                        title={isExpanded ? "Collapse chapter" : "Expand chapter"}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-ink)",
                        }}
                      >
                        <ChevronDown
                          size={16}
                          className="chapter-chevron"
                          style={{
                            transform: isExpanded ? "rotate(180deg)" : "none",
                            transition: "transform 0.15s, opacity 0.15s",
                            opacity: isExpanded ? 1 : undefined,
                          }}
                        />
                      </button>
                      <button
                        onClick={() => startEdit(c.id, c.name, c.description ?? "")}
                        className="p-1.5"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-ink-muted)",
                          opacity: 0.5,
                        }}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-ink-muted)",
                          opacity: 0.5,
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Inline lesson list (read-only — use the Lessons panel to edit) */}
              {isExpanded && lessonsHere.length > 0 && (
                <div
                  className="px-4 pb-4 pt-0 border-t animate-slide-up"
                  style={{ borderTop: "1px solid var(--color-cream-dark)" }}
                >
                  <div
                    className="flex items-center gap-1.5 mt-3 mb-2"
                    style={{
                      color: "var(--color-ink-muted)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    <BookOpen size={11} />
                    <span className="text-xs font-600 uppercase tracking-wider" style={{ letterSpacing: "0.1em" }}>
                      Lessons
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {lessonsHere.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between px-3 py-1.5"
                        style={{
                          background: "var(--color-cream)",
                          border: "1px solid var(--color-cream-dark)",
                        }}
                      >
                        <span
                          className="text-xs"
                          style={{ fontFamily: "var(--font-body)", color: "var(--color-ink)" }}
                        >
                          {l.title}
                        </span>
                        <span
                          className="text-[10px] font-500"
                          style={{
                            color: "var(--color-ink-muted)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {quizzes.filter((q) => q.lessonId === l.id).length} quiz
                          {quizzes.filter((q) => q.lessonId === l.id).length !== 1 ? "zes" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}