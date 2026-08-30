import { useState } from "react";
import { useApp } from "../../store/AppContext";
import { Plus, Trash2, ImageIcon, ChevronDown, ChevronUp, X } from "lucide-react";

type FormState = {
  quizId: string;
  prompt: string;
  imageUrl: string;
  options: [string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3;
};

const EMPTY_FORM: FormState = {
  quizId: "",
  prompt: "",
  imageUrl: "",
  options: ["", "", "", ""],
  correctOptionIndex: 0,
};

export default function AdminQuestions() {
  const { quizzes, questions, addQuestion, deleteQuestion } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filterQuiz, setFilterQuiz] = useState("all");
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filtered =
    filterQuiz === "all" ? questions : questions.filter((q) => q.quizId === filterQuiz);

  const handleSubmit = () => {
    if (!form.quizId || !form.prompt.trim()) {
      setError("Quiz and prompt are required.");
      return;
    }
    if (form.options.some((o) => !o.trim())) {
      setError("All 4 options must be filled in.");
      return;
    }
    addQuestion({
      quizId: form.quizId,
      prompt: form.prompt.trim(),
      imageUrl: form.imageUrl.trim() || undefined,
      options: form.options.map((o) => o.trim()) as [string, string, string, string],
      correctOptionIndex: form.correctOptionIndex,
      order: 99,
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    setError("");
  };

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="font-900 text-3xl mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Questions
          </h1>
          <p className="text-sm" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
            {questions.length} question{questions.length !== 1 ? "s" : ""} across {quizzes.length} quizzes
          </p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError(""); }}
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
            (e.currentTarget as HTMLButtonElement).style.transform = "translate(-1px,-1px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "5px 5px 0 var(--color-ink)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "none";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "3px 3px 0 var(--color-ink)";
          }}
        >
          <Plus size={15} />
          {showForm ? "Cancel" : "New Question"}
        </button>
      </div>

      {/* New question form */}
      {showForm && (
        <div
          className="p-6 mb-6 animate-slide-up"
          style={{
            background: "white",
            border: "3px solid var(--color-ink)",
            boxShadow: "6px 6px 0 var(--color-amber)",
          }}
        >
          <h2
            className="text-lg font-700 mb-5"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            New Question
          </h2>

          <div className="flex flex-col gap-4">
            {/* Quiz select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-600 uppercase tracking-wider" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}>
                Quiz *
              </label>
              <select
                value={form.quizId}
                onChange={(e) => setForm((f) => ({ ...f, quizId: e.target.value }))}
                className="px-3 py-2.5 text-sm outline-none"
                style={{
                  border: "2px solid var(--color-cream-dark)",
                  fontFamily: "var(--font-body)",
                  color: "var(--color-ink)",
                  background: "white",
                  borderRadius: 0,
                }}
              >
                <option value="">Select a quiz…</option>
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
            </div>

            {/* Prompt */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-600 uppercase tracking-wider" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}>
                Question Prompt *
              </label>
              <textarea
                value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                placeholder="What does ARP stand for?"
                rows={2}
                className="px-3 py-2.5 text-sm outline-none resize-none"
                style={{
                  border: "2px solid var(--color-cream-dark)",
                  fontFamily: "var(--font-body)",
                  color: "var(--color-ink)",
                  borderRadius: 0,
                  lineHeight: 1.6,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-ink)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-cream-dark)"; }}
              />
            </div>

            {/* Image URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-600 uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}>
                <ImageIcon size={11} /> Image URL (optional, 16:9 recommended)
              </label>
              <input
                type="text"
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://images.unsplash.com/photo-..."
                className="px-3 py-2.5 text-sm outline-none"
                style={{
                  border: "2px solid var(--color-cream-dark)",
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-ink)",
                  borderRadius: 0,
                  fontSize: 12,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-ink)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-cream-dark)"; }}
              />
              {form.imageUrl && (
                <div style={{ aspectRatio: "16/9", background: "var(--color-cream-dark)", overflow: "hidden" }}>
                  <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Options */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-600 uppercase tracking-wider" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}>
                Options — select the correct one *
              </label>
              <div className="flex flex-col gap-2">
                {(["A", "B", "C", "D"] as const).map((letter, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, correctOptionIndex: i as 0 | 1 | 2 | 3 }))}
                      className="flex items-center justify-center shrink-0 text-xs font-700"
                      style={{
                        width: 30,
                        height: 30,
                        background: form.correctOptionIndex === i ? "var(--color-success)" : "var(--color-cream-dark)",
                        color: form.correctOptionIndex === i ? "#fff" : "var(--color-ink-muted)",
                        border: `2px solid ${form.correctOptionIndex === i ? "var(--color-success)" : "var(--color-cream-dark)"}`,
                        cursor: "pointer",
                        fontFamily: "var(--font-mono)",
                        transition: "all 0.15s",
                        borderRadius: 0,
                      }}
                    >
                      {letter}
                    </button>
                    <input
                      type="text"
                      value={form.options[i]}
                      onChange={(e) => {
                        const next = [...form.options] as [string, string, string, string];
                        next[i] = e.target.value;
                        setForm((f) => ({ ...f, options: next }));
                      }}
                      placeholder={`Option ${letter}`}
                      className="flex-1 px-3 py-2 text-sm outline-none"
                      style={{
                        border: `2px solid ${form.correctOptionIndex === i ? "var(--color-success)" : "var(--color-cream-dark)"}`,
                        fontFamily: "var(--font-body)",
                        color: "var(--color-ink)",
                        background: form.correctOptionIndex === i ? "#EEF8EF" : "white",
                        borderRadius: 0,
                        transition: "all 0.15s",
                      }}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
                Click a letter to mark it as the correct answer.
              </p>
            </div>

            {error && (
              <p className="text-sm" style={{ color: "var(--color-danger)", fontFamily: "var(--font-body)" }}>
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              className="self-start flex items-center gap-2 px-5 py-2.5 text-sm font-600"
              style={{
                background: "var(--color-teal)",
                color: "#fff",
                border: "2px solid var(--color-teal-dark)",
                fontFamily: "var(--font-body)",
                cursor: "pointer",
              }}
            >
              <Plus size={14} /> Save Question
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-xs font-600 uppercase tracking-wider" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}>
          Filter:
        </span>
        {[{ id: "all", title: "All Quizzes" }, ...quizzes].map((q) => (
          <button
            key={q.id}
            onClick={() => setFilterQuiz(q.id)}
            className="text-xs px-3 py-1.5 font-500"
            style={{
              background: filterQuiz === q.id ? "var(--color-ink)" : "white",
              color: filterQuiz === q.id ? "var(--color-amber)" : "var(--color-ink-muted)",
              border: `2px solid ${filterQuiz === q.id ? "var(--color-ink)" : "var(--color-cream-dark)"}`,
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              transition: "all 0.15s",
              borderRadius: 0,
            }}
          >
            {q.title}
          </button>
        ))}
      </div>

      {/* Questions list */}
      <div className="flex flex-col gap-3">
        {filtered.map((q) => {
          const quiz = quizzes.find((qz) => qz.id === q.quizId);
          const isExpanded = expandedQ === q.id;
          return (
            <div
              key={q.id}
              style={{
                background: "white",
                border: "2px solid var(--color-cream-dark)",
                borderLeft: "5px solid var(--color-ember)",
              }}
            >
              <div
                className="flex items-start justify-between p-4 cursor-pointer"
                onClick={() => setExpandedQ(isExpanded ? null : q.id)}
              >
                <div className="flex-1 min-w-0 pr-3">
                  {quiz && (
                    <span
                      className="text-xs font-500 px-2 py-0.5 mb-1.5 inline-block"
                      style={{
                        background: "var(--color-cream-dark)",
                        color: "var(--color-ink-muted)",
                        fontFamily: "var(--font-body)",
                        border: "1px solid var(--color-cream-dark)",
                      }}
                    >
                      {quiz.title}
                    </span>
                  )}
                  <p
                    className="text-sm font-500 leading-relaxed"
                    style={{ fontFamily: "var(--font-body)", color: "var(--color-ink)" }}
                  >
                    {q.prompt}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id); }}
                    className="p-1.5"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-ink-muted)", opacity: 0.5 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-danger)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.5"; (e.currentTarget as HTMLButtonElement).style.color = ""; }}
                  >
                    <Trash2 size={13} />
                  </button>
                  {isExpanded ? <ChevronUp size={14} style={{ color: "var(--color-ink-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--color-ink-muted)" }} />}
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 animate-slide-up">
                  {q.imageUrl && (
                    <div className="mb-3" style={{ aspectRatio: "16/9", overflow: "hidden", background: "var(--color-cream-dark)" }}>
                      <img src={q.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    {q.options.map((opt, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-2"
                        style={{
                          background: i === q.correctOptionIndex ? "#EEF8EF" : "var(--color-cream)",
                          border: `1px solid ${i === q.correctOptionIndex ? "var(--color-success)" : "var(--color-cream-dark)"}`,
                        }}
                      >
                        <span
                          className="text-xs font-700 w-5 text-center shrink-0"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: i === q.correctOptionIndex ? "var(--color-success)" : "var(--color-ink-muted)",
                          }}
                        >
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="text-xs" style={{ fontFamily: "var(--font-body)", color: "var(--color-ink)" }}>
                          {opt}
                        </span>
                        {i === q.correctOptionIndex && (
                          <span className="ml-auto text-xs font-500" style={{ color: "var(--color-success)", fontFamily: "var(--font-body)" }}>
                            ✓ correct
                          </span>
                        )}
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
