import { useEffect, useState } from "react";
import { useApp } from "../../store/AppContext";
import { Teacher, type Asset } from "../../api/client";
import { useConfirm } from "../../components/ConfirmDialog";
import { AssetLibraryModal } from "../../components/AssetLibraryModal";
import UploadProgress from "../../components/UploadProgress";
import MathText from "../../components/MathText";
import {
  Plus,
  Trash2,
  Edit3,
  Check,
  ImageIcon,
  Video,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Upload,
} from "lucide-react";
import type { Question } from "../../data/types";

type FormState = {
  quizId: string;
  prompt: string;
  options: [string, string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3 | 4;
  imageUrl: string;
  trollVideoId: string;
  timeLimitMinutes: string;
};

const EMPTY_FORM: FormState = {
  quizId: "",
  prompt: "",
  options: ["", "", "", "", ""],
  correctOptionIndex: 0,
  imageUrl: "",
  trollVideoId: "",
  timeLimitMinutes: "",
};

const TIME_LIMIT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function emptyEditState(q: Question) {
  return {
    prompt: q.prompt,
    options: [
      q.options[0] ?? "",
      q.options[1] ?? "",
      q.options[2] ?? "",
      q.options[3] ?? "",
      q.options[4] ?? "",
    ] as [string, string, string, string, string],
    correctOptionIndex: q.correctOptionIndex as 0 | 1 | 2 | 3 | 4,
    imageUrl: q.imageUrl ?? "",
    trollVideoId: q.trollVideoId ?? "",
    timeLimitMinutes: q.timeLimitMinutes ? String(q.timeLimitMinutes) : "",
    quizId: q.quizId,
  };
}

export default function AdminQuestions() {
  const { quizzes, questions, lessons, chapters, refreshQuestions } = useApp();
  const { confirm } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filterChapterId, setFilterChapterId] = useState("all");
  const [filterLessonId, setFilterLessonId] = useState("all");
  const [filterQuizId, setFilterQuizId] = useState("all");
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [imageAssets, setImageAssets] = useState<Asset[]>([]);
  const [videoAssets, setVideoAssets] = useState<Asset[]>([]);
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState<"create" | "edit">("create");
  const [videoLibraryOpen, setVideoLibraryOpen] = useState<"create" | "edit" | null>(null);

  // Edit state
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [editState, setEditState] = useState<ReturnType<typeof emptyEditState> | null>(null);

  // Load the asset library so questions can reference an existing asset
  // (image library picker + per-question troll video select) without re-uploading.
  useEffect(() => {
    Teacher.assets()
      .then((assets) => {
        setImageAssets(assets.filter((a) => a.type === "image"));
        setVideoAssets(assets.filter((a) => a.type === "video"));
      })
      .catch(() => {
        setImageAssets([]);
        setVideoAssets([]);
      });
  }, [questions.length]);

  // When the category changes, reset the lesson + quiz filter so the user
  // doesn't stay stuck looking at a lesson/quiz that no longer matches.
  useEffect(() => {
    setFilterLessonId("all");
    setFilterQuizId("all");
  }, [filterChapterId]);

  // When the lesson changes, reset the quiz filter so it stays in scope.
  useEffect(() => {
    setFilterQuizId("all");
  }, [filterLessonId]);

  // Build the lesson list scoped to the current category selection.
  const lessonsForChapter = lessons.filter(
    (l) => filterChapterId === "all" || l.chapterId === filterChapterId,
  );

  // Quiz-id set used to filter the question list — derived from category/lesson.
  const scopeQuizIds = new Set(
    quizzes
      .filter((q) => {
        if (filterChapterId === "all" && filterLessonId === "all") return true;
        const lesson = lessons.find((l) => l.id === q.lessonId);
        if (!lesson) return false;
        if (filterChapterId !== "all" && lesson.chapterId !== filterChapterId) return false;
        if (filterLessonId !== "all" && lesson.id !== filterLessonId) return false;
        return true;
      })
      .map((q) => q.id),
  );

  // Quizzes within the current chapter/lesson scope (for the quiz filter dropdown).
  const quizzesForScope = quizzes.filter((q) => scopeQuizIds.has(q.id));

  const visibleQuizIds = filterQuizId === "all" ? scopeQuizIds : new Set([filterQuizId]);

  const filtered = questions.filter((q) => visibleQuizIds.has(q.quizId));

  const handleFile = async (file: File) => {
    setUploading(true);
    setImageProgress(0);
    setError("");
    try {
      const asset = await Teacher.uploadAsset(file, setImageProgress);
      setForm((f) => ({ ...f, imageUrl: asset.url }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleVideoFile = async (file: File) => {
    setVideoUploading(true);
    setVideoProgress(0);
    setError("");
    try {
      const asset = await Teacher.uploadAsset(file, setVideoProgress);
      setForm((f) => ({ ...f, trollVideoId: asset.url }));
      // Keep the dropdown in sync so the freshly-uploaded video is selectable
      // (and, if it was a replace, does not show a stale duplicate).
      setVideoAssets((prev) => [
        { ...asset, type: "video" as const },
        ...prev.filter((a) => a.url !== asset.url),
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setVideoUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.prompt.trim()) {
      setError("Prompt is required.");
      return;
    }
    if (form.options.some((o) => !o.trim())) {
      setError("All 5 options must be filled in.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await Teacher.createQuestion({
        quizId: form.quizId,
        prompt: form.prompt.trim(),
        imageUrl: form.imageUrl || null,
        trollVideoId: form.trollVideoId || null,
        timeLimitMinutes: form.timeLimitMinutes ? Number(form.timeLimitMinutes) : null,
        options: form.options.map((o) => o.trim()),
        correctOptionIndex: form.correctOptionIndex,
        order: 99,
      });
      await refreshQuestions();
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete this question?",
      message:
        "It must not be attached to any non-archived quiz — otherwise deletion is blocked and you'll see a clear error.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setError("");
    try {
      await Teacher.deleteQuestion(id);
      await refreshQuestions();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const startEditQuestion = (q: Question) => {
    setEditingQId(q.id);
    setEditState(emptyEditState(q));
    setExpandedQ(q.id);
  };

  const cancelEditQuestion = () => {
    setEditingQId(null);
    setEditState(null);
  };

  const submitEditQuestion = async () => {
    if (!editingQId || !editState) return;
    if (!editState.prompt.trim()) {
      setError("Prompt is required.");
      return;
    }
    if (editState.options.some((o) => !o.trim())) {
      setError("All 5 options must be filled in.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await Teacher.updateQuestion(editingQId, {
        quizId: editState.quizId,
        prompt: editState.prompt.trim(),
        imageUrl: editState.imageUrl || null,
        trollVideoId: editState.trollVideoId || null,
        timeLimitMinutes: editState.timeLimitMinutes
          ? Number(editState.timeLimitMinutes)
          : null,
        options: editState.options.map((o) => o.trim()),
        correctOptionIndex: editState.correctOptionIndex,
      });
      await refreshQuestions();
      setEditingQId(null);
      setEditState(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="font-900 text-3xl mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Questions
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
          >
            {questions.length} question{questions.length !== 1 ? "s" : ""} across{" "}
            {quizzes.length} quizz{quizzes.length !== 1 ? "es" : ""}
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
          {showForm ? "Cancel" : "New Question"}
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
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-600 uppercase tracking-wider"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                }}
              >
                Quiz (optional)
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
                <option value="">Unassigned — add to a quiz later</option>
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-600 uppercase tracking-wider"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                }}
              >
                Question Prompt *
              </label>
              <textarea
                value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                placeholder="e.g. A car accelerates from rest — which law explains why passengers feel pushed back into their seats?"
                rows={2}
                className="px-3 py-2.5 text-sm outline-none resize-none"
                style={{
                  border: "2px solid var(--color-cream-dark)",
                  fontFamily: "var(--font-body)",
                  color: "var(--color-ink)",
                  borderRadius: 0,
                  lineHeight: 1.6,
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-600 uppercase tracking-wider flex items-center gap-1.5"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                }}
              >
                <ImageIcon size={11} /> Image (optional — uploads are 16:9 cropped)
              </label>
              <div className="flex items-center gap-2">
                <label
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer"
                  style={{
                    border: "2px dashed var(--color-cream-dark)",
                    color: "var(--color-ink-muted)",
                    fontFamily: "var(--font-body)",
                    background: "white",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-ink)";
                    e.currentTarget.style.color = "var(--color-ink)";
                    e.currentTarget.style.boxShadow = "2px 2px 0 var(--color-ink)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-cream-dark)";
                    e.currentTarget.style.color = "var(--color-ink-muted)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <Upload size={13} />
                  {uploading ? "Uploading…" : "Choose image…"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowImageLibrary(true);
                    setLibraryTarget("create");
                  }}
                  disabled={imageAssets.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm"
                  style={{
                    border: "2px solid var(--color-cream-dark)",
                    background: "white",
                    color:
                      imageAssets.length === 0
                        ? "var(--color-ink-muted)"
                        : "var(--color-teal-dark)",
                    fontFamily: "var(--font-body)",
                    cursor: imageAssets.length === 0 ? "not-allowed" : "pointer",
                    opacity: imageAssets.length === 0 ? 0.5 : 1,
                  }}
                  title={
                    imageAssets.length === 0
                      ? "No uploaded images yet — upload one first"
                      : "Pick an existing image from your asset library"
                  }
                >
                  <ImageIcon size={13} /> From library
                </button>
                {form.imageUrl && (
                  <button
                    onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                    className="text-xs"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-ember)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    <X size={12} /> clear
                  </button>
                )}
              </div>
              {uploading && <UploadProgress percent={imageProgress} label="Uploading image…" />}
              {form.imageUrl && (
                <div
                  style={{
                    aspectRatio: "16/9",
                    background: "var(--color-cream-dark)",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-600 uppercase tracking-wider flex items-center gap-1.5"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                }}
              >
                <Video size={11} /> Troll video (optional — plays when a student gets this question wrong 3×)
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={form.trollVideoId}
                  onChange={(e) => setForm((f) => ({ ...f, trollVideoId: e.target.value }))}
                  className="flex-1 px-3 py-2.5 text-sm outline-none"
                  style={{
                    border: "2px solid var(--color-cream-dark)",
                    fontFamily: "var(--font-body)",
                    color: "var(--color-ink)",
                    background: "white",
                    borderRadius: 0,
                  }}
                >
                  <option value="">No troll video (plays a random one / falls back)</option>
                  {videoAssets.map((v) => (
                    <option key={v.id} value={v.url}>
                      {v.url}
                    </option>
                  ))}
                </select>
                <label
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer shrink-0"
                  style={{
                    border: "2px dashed var(--color-cream-dark)",
                    color: "var(--color-ink-muted)",
                    fontFamily: "var(--font-body)",
                    background: "white",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-ink)";
                    e.currentTarget.style.color = "var(--color-ink)";
                    e.currentTarget.style.boxShadow = "2px 2px 0 var(--color-ink)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-cream-dark)";
                    e.currentTarget.style.color = "var(--color-ink-muted)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <Upload size={13} />
                  {videoUploading ? "Uploading…" : "Upload…"}
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleVideoFile(f);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setVideoLibraryOpen("create")}
                  disabled={videoAssets.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm shrink-0"
                  style={{
                    border: "2px solid var(--color-cream-dark)",
                    background: "white",
                    color:
                      videoAssets.length === 0
                        ? "var(--color-ink-muted)"
                        : "var(--color-ember)",
                    fontFamily: "var(--font-body)",
                    cursor: videoAssets.length === 0 ? "not-allowed" : "pointer",
                    opacity: videoAssets.length === 0 ? 0.5 : 1,
                  }}
                  title={
                    videoAssets.length === 0
                      ? "No uploaded videos yet — upload one first"
                      : "Pick an existing video from your asset library"
                  }
                >
                  <Video size={13} /> From library
                </button>
                {form.trollVideoId && (
                  <button
                    onClick={() => setForm((f) => ({ ...f, trollVideoId: "" }))}
                    className="text-xs shrink-0"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-ember)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    <X size={12} /> clear
                  </button>
                )}
              </div>
              {videoUploading && <UploadProgress percent={videoProgress} label="Uploading video…" />}
              {form.trollVideoId && (
                <video
                  src={form.trollVideoId}
                  controls
                  className="w-full"
                  style={{
                    background: "var(--color-ink)",
                    border: "2px solid var(--color-cream-dark)",
                  }}
                />
              )}
              {videoAssets.length === 0 && (
                <p
                  className="text-xs"
                  style={{
                    color: "var(--color-ink-muted)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  No videos uploaded yet — upload one above or add some in the Asset Library page.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-600 uppercase tracking-wider flex items-center gap-1.5"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                }}
              >
                <Clock size={11} /> Time limit (optional — counts down on the student&apos;s screen)
              </label>
              <select
                value={form.timeLimitMinutes}
                onChange={(e) => setForm((f) => ({ ...f, timeLimitMinutes: e.target.value }))}
                className="px-3 py-2.5 text-sm outline-none"
                style={{
                  border: "2px solid var(--color-cream-dark)",
                  fontFamily: "var(--font-body)",
                  color: "var(--color-ink)",
                  background: "white",
                  borderRadius: 0,
                }}
              >
                <option value="">No time limit</option>
                {TIME_LIMIT_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} minute{m !== 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-600 uppercase tracking-wider"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                }}
              >
                Options — pick the correct one (must be exactly 5) *
              </label>
              <div className="flex flex-col gap-2">
                {(["A", "B", "C", "D", "E"] as const).map((letter, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          correctOptionIndex: i as 0 | 1 | 2 | 3 | 4,
                        }))
                      }
                      className="flex items-center justify-center shrink-0 text-xs font-700"
                      style={{
                        width: 30,
                        height: 30,
                        background:
                          form.correctOptionIndex === i
                            ? "var(--color-teal-dark)"
                            : "var(--color-cream-dark)",
                        color: form.correctOptionIndex === i ? "#fff" : "var(--color-ink-muted)",
                        border: `2px solid ${form.correctOptionIndex === i ? "var(--color-teal-dark)" : "var(--color-cream-dark)"}`,
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
                        const next = [...form.options] as typeof form.options;
                        next[i] = e.target.value;
                        setForm((f) => ({ ...f, options: next }));
                      }}
                      placeholder={`Option ${letter}`}
                      className="flex-1 px-3 py-2 text-sm outline-none"
                      style={{
                        border: `2px solid ${form.correctOptionIndex === i ? "var(--color-teal-dark)" : "var(--color-cream-dark)"}`,
                        fontFamily: "var(--font-body)",
                        color: "var(--color-ink)",
                        background:
                          form.correctOptionIndex === i
                            ? "#E6F5F5"
                            : "white",
                        borderRadius: 0,
                        transition: "all 0.15s",
                      }}
                    />
                  </div>
                ))}
              </div>
              <p
                className="text-xs mt-1"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                Click a letter to mark it as the correct answer.
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={busy}
              className="self-start flex items-center gap-2 px-5 py-2.5 text-sm font-600"
              style={{
                background: busy ? "var(--color-ink-muted)" : "var(--color-teal-dark)",
                color: "#fff",
                border: "2px solid var(--color-teal-dark)",
                fontFamily: "var(--font-body)",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              <Plus size={14} /> {busy ? "Saving…" : "Save Question"}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span
          className="text-xs font-600 uppercase tracking-wider"
          style={{
            color: "var(--color-ink-muted)",
            fontFamily: "var(--font-body)",
            letterSpacing: "0.1em",
          }}
        >
          Filter by:
        </span>
        <select
          value={filterChapterId}
          onChange={(e) => setFilterChapterId(e.target.value)}
          className="px-3 py-1.5 text-xs outline-none"
          style={{
            border: "2px solid var(--color-cream-dark)",
            background: "white",
            color: "var(--color-ink)",
            fontFamily: "var(--font-body)",
            borderRadius: 0,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--color-ink)";
            e.currentTarget.style.boxShadow = "2px 2px 0 var(--color-ink)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--color-cream-dark)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <option value="all">All chapters</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={filterLessonId}
          onChange={(e) => setFilterLessonId(e.target.value)}
          className="px-3 py-1.5 text-xs outline-none"
          style={{
            border: "2px solid var(--color-cream-dark)",
            background: "white",
            color: "var(--color-ink)",
            fontFamily: "var(--font-body)",
            borderRadius: 0,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--color-ink)";
            e.currentTarget.style.boxShadow = "2px 2px 0 var(--color-ink)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--color-cream-dark)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <option value="all">All lessons</option>
          {lessonsForChapter.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
        <select
          value={filterQuizId}
          onChange={(e) => setFilterQuizId(e.target.value)}
          className="px-3 py-1.5 text-xs outline-none"
          style={{
            border: "2px solid var(--color-cream-dark)",
            background: "white",
            color: "var(--color-ink)",
            fontFamily: "var(--font-body)",
            borderRadius: 0,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--color-ink)";
            e.currentTarget.style.boxShadow = "2px 2px 0 var(--color-ink)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--color-cream-dark)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <option value="all">All quizzes</option>
          {quizzesForScope.map((qz) => (
            <option key={qz.id} value={qz.id}>
              {qz.title}
            </option>
          ))}
        </select>
        <span
          className="text-xs ml-auto"
          style={{
            color: "var(--color-ink-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {filtered.length} question{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
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
              No questions yet.
            </p>
          </div>
        )}
        {filtered.map((q) => {
          const quiz = quizzes.find((qz) => qz.id === q.quizId);
          const isExpanded = expandedQ === q.id;
          const isEditingThis = editingQId === q.id;
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
                onClick={() => {
                  if (isEditingThis) return;
                  setExpandedQ(isExpanded ? null : q.id);
                }}
                onMouseEnter={(e) => {
                  if (isEditingThis) return;
                  e.currentTarget.style.boxShadow = "3px 3px 0 var(--color-ink)";
                  e.currentTarget.style.transform = "translate(-1px, -1px)";
                }}
                onMouseLeave={(e) => {
                  if (isEditingThis) return;
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "none";
                }}
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
                  <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                    {q.trollVideoId && (
                      <span
                        className="text-[10px] font-600 px-1.5 py-0.5 inline-flex items-center gap-1"
                        style={{
                          background: "rgba(217,79,30,0.1)",
                          color: "var(--color-ember-dark, var(--color-ember))",
                          fontFamily: "var(--font-body)",
                          border: "1px solid rgba(217,79,30,0.35)",
                        }}
                      >
                        <Video size={9} /> troll video
                      </span>
                    )}
                    {q.timeLimitMinutes && (
                      <span
                        className="text-[10px] font-600 px-1.5 py-0.5 inline-flex items-center gap-1"
                        style={{
                          background: "rgba(13,110,110,0.1)",
                          color: "var(--color-teal-dark)",
                          fontFamily: "var(--font-body)",
                          border: "1px solid rgba(13,110,110,0.35)",
                        }}
                      >
                        <Clock size={9} /> {q.timeLimitMinutes} min
                      </span>
                    )}
                  </div>
                  <p
                    className="text-sm font-500 leading-relaxed"
                    style={{
                      fontFamily: "var(--font-body)",
                      color: "var(--color-ink)",
                    }}
                  >
                    <MathText text={q.prompt} />
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditQuestion(q);
                    }}
                    disabled={isEditingThis}
                    className="p-1.5"
                    title="Edit question"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: isEditingThis ? "not-allowed" : "pointer",
                      color: "var(--color-ink-muted)",
                      opacity: isEditingThis ? 0.3 : 0.5,
                    }}
                    onMouseEnter={(e) => {
                      if (!isEditingThis) {
                        (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--color-ember-dark)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.opacity = isEditingThis ? "0.3" : "0.5";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--color-ink-muted)";
                    }}
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(q.id);
                    }}
                    disabled={isEditingThis}
                    className="p-1.5"
                    title="Delete question"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: isEditingThis ? "not-allowed" : "pointer",
                      color: "var(--color-ink-muted)",
                      opacity: isEditingThis ? 0.3 : 0.5,
                    }}
                    onMouseEnter={(e) => {
                      if (!isEditingThis) {
                        (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--color-ember)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.opacity = isEditingThis ? "0.3" : "0.5";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--color-ink-muted)";
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                  {isExpanded ? (
                    <ChevronUp
                      size={14}
                      style={{ color: "var(--color-ink-muted)" }}
                    />
                  ) : (
                    <ChevronDown
                      size={14}
                      style={{ color: "var(--color-ink-muted)" }}
                    />
                  )}
                </div>
              </div>

              {isExpanded && !isEditingThis && (
                <div className="px-4 pb-4 animate-slide-up">
                  {q.imageUrl && (
                    <div
                      className="mb-3"
                      style={{
                        aspectRatio: "16/9",
                        overflow: "hidden",
                        background: "var(--color-cream-dark)",
                      }}
                    >
                      <img
                        src={q.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    {q.options.map((opt, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-2"
                        style={{
                          background:
                            i === q.correctOptionIndex
                              ? "var(--color-cream)"
                              : "transparent",
                          border: `1px solid ${i === q.correctOptionIndex ? "var(--color-teal-dark)" : "var(--color-cream-dark)"}`,
                        }}
                      >
                        <span
                          className="text-xs font-700 w-5 text-center shrink-0"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color:
                              i === q.correctOptionIndex
                                ? "var(--color-teal-dark)"
                                : "var(--color-ink-muted)",
                          }}
                        >
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span
                          className="text-xs"
                          style={{
                            fontFamily: "var(--font-body)",
                            color: "var(--color-ink)",
                          }}
                        >
                          <MathText text={opt} />
                        </span>
                        {i === q.correctOptionIndex && (
                          <span
                            className="ml-auto text-xs font-500"
                            style={{
                              color: "var(--color-teal-dark)",
                              fontFamily: "var(--font-body)",
                            }}
                          >
                            ✓ correct
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isEditingThis && editState && (
                <div
                  className="px-4 pb-4 animate-slide-up flex flex-col gap-3"
                  style={{
                    borderTop: "1px solid var(--color-cream-dark)",
                  }}
                >
                  <div
                    className="pt-3 -mx-4 px-4"
                    style={{ borderTop: "1px solid var(--color-cream-dark)" }}
                  >
                    <div className="flex flex-col gap-1.5">
                      <label
                        className="text-xs font-600 uppercase tracking-wider"
                        style={{
                          color: "var(--color-ink-muted)",
                          fontFamily: "var(--font-body)",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Quiz *
                      </label>
                      <select
                        value={editState.quizId}
                        onChange={(e) =>
                          setEditState((s) => (s ? { ...s, quizId: e.target.value } : s))
                        }
                        className="px-3 py-2 text-sm outline-none"
                        style={{
                          border: "2px solid var(--color-cream-dark)",
                          fontFamily: "var(--font-body)",
                          color: "var(--color-ink)",
                          background: "white",
                          borderRadius: 0,
                        }}
                      >
                        <option value="">Select a quiz…</option>
                        {quizzes.map((qz) => (
                          <option key={qz.id} value={qz.id}>
                            {qz.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-3">
                      <label
                        className="text-xs font-600 uppercase tracking-wider"
                        style={{
                          color: "var(--color-ink-muted)",
                          fontFamily: "var(--font-body)",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Question Prompt *
                      </label>
                      <textarea
                        value={editState.prompt}
                        onChange={(e) =>
                          setEditState((s) => (s ? { ...s, prompt: e.target.value } : s))
                        }
                        rows={2}
                        className="px-3 py-2 text-sm outline-none resize-none"
                        style={{
                          border: "2px solid var(--color-cream-dark)",
                          fontFamily: "var(--font-body)",
                          color: "var(--color-ink)",
                          borderRadius: 0,
                          lineHeight: 1.6,
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 mt-3">
                      <label
                        className="text-xs font-600 uppercase tracking-wider flex items-center gap-1.5"
                        style={{
                          color: "var(--color-ink-muted)",
                          fontFamily: "var(--font-body)",
                          letterSpacing: "0.1em",
                        }}
                      >
                        <ImageIcon size={11} /> Image (optional)
                      </label>
                      <div className="flex items-center gap-2">
                        <label
                          className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer"
                          style={{
                            border: "2px dashed var(--color-cream-dark)",
                            color: "var(--color-ink-muted)",
                            fontFamily: "var(--font-body)",
                            background: "white",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-ink)";
                            e.currentTarget.style.color = "var(--color-ink)";
                            e.currentTarget.style.boxShadow = "2px 2px 0 var(--color-ink)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-cream-dark)";
                            e.currentTarget.style.color = "var(--color-ink-muted)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <Upload size={13} />
                          {uploading ? "Uploading…" : "Replace image…"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              setUploading(true);
                              setImageProgress(0);
                              setError("");
                              Teacher.uploadAsset(f, setImageProgress)
                                .then((asset) => {
                                  setEditState((s) => (s ? { ...s, imageUrl: asset.url } : s));
                                })
                                .catch((err) => setError((err as Error).message))
                                .finally(() => setUploading(false));
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowImageLibrary(true);
                            setLibraryTarget("edit");
                          }}
                          disabled={imageAssets.length === 0}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm"
                          style={{
                            border: "2px solid var(--color-cream-dark)",
                            background: "white",
                            color:
                              imageAssets.length === 0
                                ? "var(--color-ink-muted)"
                                : "var(--color-teal-dark)",
                            fontFamily: "var(--font-body)",
                            cursor: imageAssets.length === 0 ? "not-allowed" : "pointer",
                            opacity: imageAssets.length === 0 ? 0.5 : 1,
                          }}
                        >
                          <ImageIcon size={13} /> From library
                        </button>
                        {editState.imageUrl && (
                          <button
                            onClick={() =>
                              setEditState((s) => (s ? { ...s, imageUrl: "" } : s))
                            }
                            className="text-xs flex items-center gap-1"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--color-ember)",
                              fontFamily: "var(--font-body)",
                            }}
                          >
                            <X size={12} /> clear
                          </button>
                        )}
                      </div>
                      {uploading && (
                        <UploadProgress percent={imageProgress} label="Uploading image…" />
                      )}
                      {editState.imageUrl && (
                        <div
                          style={{
                            aspectRatio: "16/9",
                            background: "var(--color-cream-dark)",
                            overflow: "hidden",
                          }}
                        >
                          <img
                            src={editState.imageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 mt-3">
                      <label
                        className="text-xs font-600 uppercase tracking-wider flex items-center gap-1.5"
                        style={{
                          color: "var(--color-ink-muted)",
                          fontFamily: "var(--font-body)",
                          letterSpacing: "0.1em",
                        }}
                      >
                        <Video size={11} /> Troll video (optional — plays when this question is missed 3×)
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={editState.trollVideoId}
                          onChange={(e) =>
                            setEditState((s) => (s ? { ...s, trollVideoId: e.target.value } : s))
                          }
                          className="flex-1 px-3 py-2 text-sm outline-none"
                          style={{
                            border: "2px solid var(--color-cream-dark)",
                            fontFamily: "var(--font-body)",
                            color: "var(--color-ink)",
                            background: "white",
                            borderRadius: 0,
                          }}
                        >
                          <option value="">No troll video (random / fallback)</option>
                          {videoAssets.map((v) => (
                            <option key={v.id} value={v.url}>
                              {v.url}
                            </option>
                          ))}
                        </select>
                        <label
                          className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer shrink-0"
                          style={{
                            border: "2px dashed var(--color-cream-dark)",
                            color: "var(--color-ink-muted)",
                            fontFamily: "var(--font-body)",
                            background: "white",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-ink)";
                            e.currentTarget.style.color = "var(--color-ink)";
                            e.currentTarget.style.boxShadow = "2px 2px 0 var(--color-ink)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-cream-dark)";
                            e.currentTarget.style.color = "var(--color-ink-muted)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <Upload size={13} />
                          {videoUploading ? "Uploading…" : "Replace…"}
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              setVideoUploading(true);
                              setVideoProgress(0);
                              setError("");
                              Teacher.uploadAsset(f, setVideoProgress)
                                .then((asset) => {
                                  setEditState((s) =>
                                    s ? { ...s, trollVideoId: asset.url } : s,
                                  );
                                  setVideoAssets((prev) => [
                                    { ...asset, type: "video" as const },
                                    ...prev.filter((a) => a.url !== asset.url),
                                  ]);
                                })
                                .catch((err) => setError((err as Error).message))
                                .finally(() => setVideoUploading(false));
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setVideoLibraryOpen("edit")}
                          disabled={videoAssets.length === 0}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm shrink-0"
                          style={{
                            border: "2px solid var(--color-cream-dark)",
                            background: "white",
                            color:
                              videoAssets.length === 0
                                ? "var(--color-ink-muted)"
                                : "var(--color-ember)",
                            fontFamily: "var(--font-body)",
                            cursor: videoAssets.length === 0 ? "not-allowed" : "pointer",
                            opacity: videoAssets.length === 0 ? 0.5 : 1,
                          }}
                          title={
                            videoAssets.length === 0
                              ? "No uploaded videos yet — upload one first"
                              : "Pick an existing video from your asset library"
                          }
                        >
                          <Video size={13} /> From library
                        </button>
                        {editState.trollVideoId && (
                          <button
                            onClick={() =>
                              setEditState((s) => (s ? { ...s, trollVideoId: "" } : s))
                            }
                            className="text-xs shrink-0"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--color-ember)",
                              fontFamily: "var(--font-body)",
                            }}
                          >
                            <X size={12} /> clear
                          </button>
                        )}
                      </div>
                      {videoUploading && (
                        <UploadProgress percent={videoProgress} label="Uploading video…" />
                      )}
                      {editState.trollVideoId && (
                        <video
                          src={editState.trollVideoId}
                          controls
                          className="w-full"
                          style={{
                            background: "var(--color-ink)",
                            border: "2px solid var(--color-cream-dark)",
                          }}
                        />
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 mt-3">
                      <label
                        className="text-xs font-600 uppercase tracking-wider flex items-center gap-1.5"
                        style={{
                          color: "var(--color-ink-muted)",
                          fontFamily: "var(--font-body)",
                          letterSpacing: "0.1em",
                        }}
                      >
                        <Clock size={11} /> Time limit (optional)
                      </label>
                      <select
                        value={editState.timeLimitMinutes}
                        onChange={(e) =>
                          setEditState((s) =>
                            s ? { ...s, timeLimitMinutes: e.target.value } : s,
                          )
                        }
                        className="px-3 py-2 text-sm outline-none"
                        style={{
                          border: "2px solid var(--color-cream-dark)",
                          fontFamily: "var(--font-body)",
                          color: "var(--color-ink)",
                          background: "white",
                          borderRadius: 0,
                        }}
                      >
                        <option value="">No time limit</option>
                        {TIME_LIMIT_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m} minute{m !== 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-3">
                      <label
                        className="text-xs font-600 uppercase tracking-wider"
                        style={{
                          color: "var(--color-ink-muted)",
                          fontFamily: "var(--font-body)",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Options — pick the correct one *
                      </label>
                      <div className="flex flex-col gap-2">
                        {(["A", "B", "C", "D", "E"] as const).map((letter, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setEditState((s) =>
                                  s ? { ...s, correctOptionIndex: i as 0 | 1 | 2 | 3 | 4 } : s,
                                )
                              }
                              className="flex items-center justify-center shrink-0 text-xs font-700"
                              style={{
                                width: 30,
                                height: 30,
                                background:
                                  editState.correctOptionIndex === i
                                    ? "var(--color-teal-dark)"
                                    : "var(--color-cream-dark)",
                                color:
                                  editState.correctOptionIndex === i ? "#fff" : "var(--color-ink-muted)",
                                border: `2px solid ${editState.correctOptionIndex === i ? "var(--color-teal-dark)" : "var(--color-cream-dark)"}`,
                                cursor: "pointer",
                                fontFamily: "var(--font-mono)",
                                borderRadius: 0,
                              }}
                            >
                              {letter}
                            </button>
                            <input
                              type="text"
                              value={editState.options[i]}
                              onChange={(e) => {
                                const next = [...editState.options] as typeof editState.options;
                                next[i] = e.target.value;
                                setEditState((s) => (s ? { ...s, options: next } : s));
                              }}
                              placeholder={`Option ${letter}`}
                              className="flex-1 px-3 py-2 text-sm outline-none"
                              style={{
                                border: `2px solid ${editState.correctOptionIndex === i ? "var(--color-teal-dark)" : "var(--color-cream-dark)"}`,
                                fontFamily: "var(--font-body)",
                                color: "var(--color-ink)",
                                background:
                                  editState.correctOptionIndex === i ? "#E6F5F5" : "white",
                                borderRadius: 0,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={submitEditQuestion}
                        disabled={busy}
                        className="flex items-center gap-1 px-4 py-2 text-sm font-600"
                        style={{
                          background: busy ? "var(--color-ink-muted)" : "var(--color-teal-dark)",
                          color: "#fff",
                          border: "2px solid var(--color-teal-dark)",
                          cursor: busy ? "not-allowed" : "pointer",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        <Check size={13} /> {busy ? "Saving…" : "Save Question"}
                      </button>
                      <button
                        onClick={cancelEditQuestion}
                        className="px-3 py-2 text-xs"
                        style={{
                          background: "var(--color-cream-dark)",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-ink-muted)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showImageLibrary && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
          style={{
            background: "rgba(28, 15, 0, 0.7)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowImageLibrary(false)}
        >
          <div
            className="relative w-full max-w-3xl my-8 animate-pop-in"
            style={{
              background: "white",
              border: "3px solid var(--color-ink)",
              boxShadow: "8px 8px 0 var(--color-amber)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: "var(--color-cream-dark)" }}>
              <div>
                <h3
                  className="text-lg font-700"
                  style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
                >
                  Choose from library
                </h3>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
                >
                  {imageAssets.length} image{imageAssets.length !== 1 ? "s" : ""} — click one to attach it
                </p>
              </div>
              <button
                onClick={() => setShowImageLibrary(false)}
                className="p-1.5"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-ink-muted)" }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
              {imageAssets.length === 0 && (
                <p
                  className="col-span-full text-sm text-center py-8"
                  style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
                >
                  No images yet — upload one from the Asset Library page first.
                </p>
              )}
              {imageAssets.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    if (libraryTarget === "edit") {
                      setEditState((s) => (s ? { ...s, imageUrl: a.url } : s));
                    } else {
                      setForm((f) => ({ ...f, imageUrl: a.url }));
                    }
                    setShowImageLibrary(false);
                  }}
                  className="text-left overflow-hidden"
                  style={{
                    background: "var(--color-cream)",
                    border: "2px solid var(--color-cream-dark)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <div style={{ aspectRatio: "16/9", overflow: "hidden", background: "var(--color-cream-dark)" }}>
                    <img src={a.url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2">
                    {a.usedIn.length > 0 ? (
                      <p className="text-xs" style={{ color: "var(--color-teal-dark)", fontFamily: "var(--font-body)" }}>
                        Used by {a.usedIn.length} question{a.usedIn.length !== 1 ? "s" : ""}
                      </p>
                    ) : (
                      <p className="text-xs" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
                        Not used yet
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <AssetLibraryModal
        open={videoLibraryOpen !== null}
        onClose={() => setVideoLibraryOpen(null)}
        assets={videoAssets}
        kind="video"
        onSelect={(url) => {
          if (videoLibraryOpen === "create") {
            setForm((f) => ({ ...f, trollVideoId: url }));
          } else if (videoLibraryOpen === "edit") {
            setEditState((s) => (s ? { ...s, trollVideoId: url } : s));
          }
        }}
      />
    </div>
  );
}