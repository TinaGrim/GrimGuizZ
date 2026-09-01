import { useEffect, useState } from "react";
import { Teacher, type Quote } from "../../api/client";
import { useConfirm } from "../../components/ConfirmDialog";
import { Plus, Check, X, Trash2, Edit3, MessageSquareQuote, AlertCircle } from "lucide-react";

export default function AdminQuotes() {
  const { confirm } = useConfirm();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [newText, setNewText] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    try {
      setQuotes(await Teacher.quotes());
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async () => {
    const text = newText.trim();
    if (!text) return;
    setBusy(true);
    setError("");
    try {
      await Teacher.createQuote(text);
      setNewText("");
      setShowForm(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (q: Quote) => {
    setEditingId(q.id);
    setEditText(q.text);
  };

  const saveEdit = async (id: string) => {
    const text = editText.trim();
    if (!text) return;
    setBusy(true);
    setError("");
    try {
      await Teacher.updateQuote(id, text);
      setEditingId(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (q: Quote) => {
    const ok = await confirm({
      title: "Delete this quote?",
      message: `"${q.text.length > 60 ? q.text.slice(0, 60) + "…" : q.text}"`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setError("");
    try {
      await Teacher.deleteQuote(q.id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="font-900 text-3xl mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Quote Library
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
          >
            {quotes.length} quote{quotes.length !== 1 ? "s" : ""} — encouraging lines shown to students after a wrong answer
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
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
          <Plus size={14} />
          New quote
        </button>
      </div>

      {error && (
        <div
          className="mb-4 p-3 text-sm flex items-start gap-2"
          style={{
            background: "#FDECEA",
            border: "1px solid var(--color-ember)",
            color: "var(--color-ember-dark)",
            fontFamily: "var(--font-body)",
          }}
        >
          <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          {error}
        </div>
      )}

      {showForm && (
        <div
          className="mb-5 p-4 animate-slide-up"
          style={{
            background: "white",
            border: "2px solid var(--color-ink)",
            boxShadow: "3px 3px 0 var(--color-ink)",
          }}
        >
          <label
            className="block text-xs font-600 mb-1"
            style={{
              color: "var(--color-ink)",
              fontFamily: "var(--font-body)",
            }}
          >
            New quote
          </label>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            rows={2}
            autoFocus
            className="w-full px-3 py-2 text-sm outline-none resize-none"
            placeholder="Write something encouraging a student would believe…"
            style={{
              border: "2px solid var(--color-cream-dark)",
              borderRadius: 0,
              fontFamily: "var(--font-body)",
              color: "var(--color-ink)",
              background: "white",
            }}
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => {
                setShowForm(false);
                setNewText("");
              }}
              className="px-3 py-1.5 text-sm font-500"
              style={{
                background: "var(--color-cream-dark)",
                color: "var(--color-ink-muted)",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newText.trim() || busy}
              className="px-4 py-1.5 text-sm font-600"
              style={{
                background: "var(--color-teal-dark)",
                color: "#fff",
                border: "none",
                cursor: !newText.trim() || busy ? "not-allowed" : "pointer",
                opacity: !newText.trim() || busy ? 0.5 : 1,
                fontFamily: "var(--font-body)",
              }}
            >
              {busy ? "Saving…" : "Add quote"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {quotes.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-14 text-center"
            style={{ border: "2px dashed var(--color-cream-dark)" }}
          >
            <MessageSquareQuote
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
              No quotes yet — add one students will see when they get something wrong.
            </p>
          </div>
        )}

        {quotes.map((q) =>
          editingId === q.id ? (
            <div
              key={q.id}
              className="p-3 animate-slide-up"
              style={{
                background: "white",
                border: "2px solid var(--color-ink)",
                boxShadow: "3px 3px 0 var(--color-ink)",
              }}
            >
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                autoFocus
                className="w-full px-3 py-2 text-sm outline-none resize-none"
                style={{
                  border: "2px solid var(--color-cream-dark)",
                  borderRadius: 0,
                  fontFamily: "var(--font-body)",
                  color: "var(--color-ink)",
                  background: "white",
                }}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setEditingId(null)}
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
                <button
                  onClick={() => saveEdit(q.id)}
                  disabled={!editText.trim() || busy}
                  className="p-1.5"
                  style={{
                    background: "var(--color-teal-dark)",
                    color: "#fff",
                    border: "none",
                    cursor: !editText.trim() || busy ? "not-allowed" : "pointer",
                    opacity: !editText.trim() || busy ? 0.5 : 1,
                  }}
                >
                  <Check size={12} />
                </button>
              </div>
            </div>
          ) : (
            <div
              key={q.id}
              className="px-4 py-3 flex items-start justify-between gap-3"
              style={{
                background: "white",
                border: "2px solid var(--color-cream-dark)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "3px 3px 0 var(--color-ink)";
                e.currentTarget.style.transform = "translate(-1px, -1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "none";
              }}
            >
              <p
                className="text-sm leading-snug"
                style={{
                  color: "var(--color-ink)",
                  fontFamily: "var(--font-body)",
                  flex: 1,
                }}
              >
                “{q.text}”
              </p>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => startEdit(q)}
                  className="p-1.5"
                  title="Edit quote"
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
                  onClick={() => handleDelete(q)}
                  className="p-1.5"
                  title="Delete quote"
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
            </div>
          ),
        )}
      </div>
    </div>
  );
}
