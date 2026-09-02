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
  X,
  Calendar,
  Users,
  Clock,
  ChevronDown,
  Upload,
  ImageIcon,
  Video,
} from "lucide-react";
import type { Quiz } from "../../data/types";

// Convert any ISO/UTC string into a Date; returns null if invalid.
function parseLocal(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

// Format a Date as a `<input type="date">` value: "YYYY-MM-DD".
function toDateInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Format a Date as a `<input type="time">` value: "HH:MM".
function toTimeInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Combine a date + time string (both as local) into an ISO string suitable for
// the backend. Returns null if either piece is missing.
function TimePicker({
  value,
  onChange,
}: {
  value: string; // "HH:MM"
  onChange: (v: string) => void;
}) {
  const [hh, mm] = value ? value.split(":") : ["", ""];
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Hour"
        value={hh ?? ""}
        onChange={(e) => onChange(`${e.target.value}:${mm || "00"}`)}
        className="px-2 py-2 text-sm outline-none"
        style={{
          border: "2px solid var(--color-cream-dark)",
          background: "white",
          color: "var(--color-ink)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <option value="">HH</option>
        {hours.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}>:</span>
      <select
        aria-label="Minute"
        value={mm ?? ""}
        onChange={(e) => onChange(`${hh || "00"}:${e.target.value}`)}
        className="px-2 py-2 text-sm outline-none"
        style={{
          border: "2px solid var(--color-cream-dark)",
          background: "white",
          color: "var(--color-ink)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <option value="">MM</option>
        {minutes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}

function combineToIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}:00`);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

type DraftQuestion = {
  key: string; // local temp id, e.g. "draft-1"
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  timeLimitMinutes: number | null;
  imageUrl: string | null;
  trollVideoId: string | null;
};

// A pool slot is either "empty" (pick an existing question) or holds a reference
// to an existing question id OR a locally-authored draft question (not yet saved).
type PoolSlot = {
  key: number;
  value: string; // "" = empty; otherwise an existing question id or a draft temp id
};

type FormState = {
  title: string;
  chapterId: string;
  lessonId: string;
  creatingNewChapter: boolean;
  newChapterName: string;
  creatingNewLesson: boolean;
  newLessonTitle: string;
  pool: PoolSlot[];
  // Locally-authored questions (deferred: created after the quiz is saved).
  drafts: DraftQuestion[];
  status: Quiz["status"];
  scheduledStart: string;
  scheduledStartTime: string;
  scheduledEnd: string;
  scheduledEndTime: string;
};

const EMPTY: FormState = {
  title: "",
  chapterId: "",
  lessonId: "",
  creatingNewChapter: false,
  newChapterName: "",
  creatingNewLesson: false,
  newLessonTitle: "",
  pool: [{ key: 0, value: "" }],
  drafts: [],
  status: "active",
  scheduledStart: "",
  scheduledStartTime: "",
  scheduledEnd: "",
  scheduledEndTime: "",
};

export default function AdminQuizzes() {
  const {
    quizzes,
    lessons,
    chapters,
    questions,
    students,
    refreshQuizzes,
    refreshLessons,
    refreshChapters,
    refreshStudents,
    refreshQuestions,
  } = useApp();
  const { confirm } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [inlineCreateBusy, setInlineCreateBusy] = useState(false);

  // Edit (header fields)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editChapterId, setEditChapterId] = useState("");
  const [editLessonId, setEditLessonId] = useState("");
  const [editCreatingNewChapter, setEditCreatingNewChapter] = useState(false);
  const [editNewChapterName, setEditNewChapterName] = useState("");
  const [editCreatingNewLesson, setEditCreatingNewLesson] = useState(false);
  const [editNewLessonTitle, setEditNewLessonTitle] = useState("");
  const [editPool, setEditPool] = useState<PoolSlot[]>([{ key: 0, value: "" }]);
  const [editDrafts, setEditDrafts] = useState<DraftQuestion[]>([]);
  const [editStatus, setEditStatus] = useState<Quiz["status"]>("active");
  const [editScheduledStart, setEditScheduledStart] = useState("");
  const [editScheduledStartTime, setEditScheduledStartTime] = useState("");
  const [editScheduledEnd, setEditScheduledEnd] = useState("");
  const [editScheduledEndTime, setEditScheduledEndTime] = useState("");

  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

  // Expanded quiz card — reveals its attached questions ("drops down").
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Question-add overlay (New Quiz form)
  const [poolOverlayOpen, setPoolOverlayOpen] = useState(false);
  const [poolOverlaySlotKey, setPoolOverlaySlotKey] = useState<number | null>(null);
  const [qPrompt, setQPrompt] = useState("");
  const [qOptions, setQOptions] = useState<string[]>(["", "", "", "", ""]);
  const [qCorrect, setQCorrect] = useState(0);
const [qTimeLimit, setQTimeLimit] = useState("");
  const [qImageUrl, setQImageUrl] = useState("");
  const [qTrollVideoId, setQTrollVideoId] = useState("");
  const [qUploading, setQUploading] = useState<"image" | "video" | null>(null);
  const [qImageProgress, setQImageProgress] = useState(0);
  const [qVideoProgress, setQVideoProgress] = useState(0);
  const [qError, setQError] = useState("");

  // Question-add overlay (Edit Quiz form)
  const [editPoolOverlayOpen, setEditPoolOverlayOpen] = useState(false);
  const [editPoolOverlaySlotKey, setEditPoolOverlaySlotKey] = useState<
    number | null
  >(null);
  const [eQPrompt, setEQPrompt] = useState("");
  const [eQOptions, setEQOptions] = useState<string[]>(["", "", "", "", ""]);
  const [eQCorrect, setEQCorrect] = useState(0);
  const [eQTimeLimit, setEQTimeLimit] = useState("");
  const [eQImageUrl, setEQImageUrl] = useState("");
  const [eQTrollVideoId, setEQTrollVideoId] = useState("");
  const [eQUploading, setEQUploading] = useState<"image" | "video" | null>(null);
  const [eQImageProgress, setEQImageProgress] = useState(0);
  const [eQVideoProgress, setEQVideoProgress] = useState(0);
  const [eQError, setEQError] = useState("");

  // Asset library (for "From library" picking) — shared by both overlays.
  const [imageAssets, setImageAssets] = useState<Asset[]>([]);
  const [videoAssets, setVideoAssets] = useState<Asset[]>([]);
  const [libraryOpen, setLibraryOpen] = useState<{
    kind: "image" | "video";
    target: "create" | "edit";
  } | null>(null);

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
  }, []);

  // Reset the question pool whenever the lesson changes so stale selections
  // from a different lesson don't leak in.
  useEffect(() => {
    setForm((f) => ({ ...f, pool: [{ key: Date.now(), value: "" }] }));
  }, [form.lessonId]);

  // Same reset for the edit form when its lesson is changed by the user.
  // (Programmatic setEditLessonId from startEdit does NOT trigger this, since
  //  startEdit is called as a one-shot event, not via the picker.)
  const handleEditLessonChange = (v: string) => {
    setEditLessonId(v);
    setEditPool([{ key: Date.now(), value: "" }]);
    setEditDrafts([]);
  };

  // ─── helpers ────────────────────────────────────────────────────────────

  const lessonsForChapter = (chapterId: string) =>
    lessons.filter((l) => l.chapterId === chapterId);

  // Questions that belong to quizzes under the currently selected lesson.
  const lessonQuestionIds = new Set(
    quizzes
      .filter((q) => q.lessonId === form.lessonId)
      .flatMap((q) => q.questionPoolIds ?? []),
  );
  const lessonQuestions = questions.filter((q) => lessonQuestionIds.has(q.id));

  const draftByKey = (key: string) => form.drafts.find((d) => d.key === key);

  const slotLabel = (value: string): string => {
    if (!value) return "Select a question…";
    const draft = draftByKey(value);
    if (draft) return `[new] ${draft.prompt}`;
    const q = questions.find((qq) => qq.id === value);
    return q ? q.prompt : "Select a question…";
  };

  // ─── Create quiz ────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let chapterId = form.chapterId;
      if (form.creatingNewChapter) {
        if (!form.newChapterName.trim()) {
          setError("Chapter name is required.");
          setBusy(false);
          return;
        }
        const created = await Teacher.createChapter({
          name: form.newChapterName.trim(),
        });
        chapterId = created.id;
        // Fire-and-forget — don't block the flow on the UI refresh; the next
        // dependent call (createLesson) can start straight away.
        void refreshChapters();
      }
      let lessonId = form.lessonId;
      if (form.creatingNewLesson) {
        if (!chapterId) {
          setError("Pick or create a chapter first.");
          setBusy(false);
          return;
        }
        if (!form.newLessonTitle.trim()) {
          setError("Lesson title is required.");
          setBusy(false);
          return;
        }
        const created = await Teacher.createLesson({
          chapterId,
          title: form.newLessonTitle.trim(),
        });
        lessonId = created.id;
        void refreshLessons();
      }
      if (!chapterId || !lessonId) {
        setError("Pick or create a chapter and lesson first.");
        setBusy(false);
        return;
      }
      // Resolve pool: real existing question ids plus any locally-authored drafts.
      const existingPoolIds = form.pool
        .map((s) => s.value)
        .filter((v) => v && !v.startsWith("draft-"));
      const draftSlots = form.pool.filter((s) => s.value.startsWith("draft-"));

      const quiz = await Teacher.createQuiz({
        lessonId,
        title: form.title.trim(),
        questionPoolIds: existingPoolIds,
        status: form.status,
        scheduledStart:
          form.status === "scheduled"
            ? combineToIso(form.scheduledStart, form.scheduledStartTime) ??
              combineToIso(form.scheduledStart, "00:00")
            : null,
        scheduledEnd:
          form.status === "scheduled"
            ? combineToIso(form.scheduledEnd, form.scheduledEndTime) ??
              combineToIso(form.scheduledEnd, "23:59")
            : null,
        timerMinutes: null,
        trollVideoId: null,
      });

      // Persist drafts authored in the New Quiz overlay, then attach them to the pool.
      // Drafts are independent — create them all in PARALLEL, not one-by-one.
      const createdIds: string[] = [];
      const draftEntries = draftSlots
        .map((slot) => form.drafts.find((d) => d.key === slot.value))
        .filter((draft): draft is NonNullable<typeof draft> => Boolean(draft));
      if (draftEntries.length > 0) {
        const created = await Promise.all(
          draftEntries.map((draft) =>
            Teacher.createQuestion({
              quizId: quiz.id,
              prompt: draft.prompt,
              options: draft.options,
              correctOptionIndex: draft.correctOptionIndex,
              timeLimitMinutes: draft.timeLimitMinutes,
              imageUrl: draft.imageUrl,
              trollVideoId: draft.trollVideoId,
              order: 99,
            }),
          ),
        );
        createdIds.push(...created.map((c) => c.id));
      }
      if (createdIds.length > 0) {
        await Teacher.updateQuiz(quiz.id, {
          questionPoolIds: [...existingPoolIds, ...createdIds],
        });
      }
      await Promise.all([refreshQuizzes(), refreshQuestions()]);
      setForm(EMPTY);
      setShowForm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Archive this quiz?",
      message:
        "Student attempt history will be preserved, but the quiz will disappear from active quiz lists. You can recreate it later if needed.",
      confirmLabel: "Archive",
    });
    if (!ok) return;
    try {
      await Teacher.deleteQuiz(id);
      await refreshQuizzes();
      await refreshLessons();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // ─── Edit quiz ──────────────────────────────────────────────────────────

  const startEdit = (q: Quiz) => {
    setEditingId(q.id);
    setEditTitle(q.title);
    const currentLesson = lessons.find((l) => l.id === q.lessonId);
    setEditChapterId(currentLesson?.chapterId ?? "");
    setEditLessonId(q.lessonId);
    setEditCreatingNewChapter(false);
    setEditNewChapterName("");
    setEditCreatingNewLesson(false);
    setEditNewLessonTitle("");
    setEditPool(
      (q.questionPoolIds ?? []).map((qid, i) => ({
        key: Date.now() + i,
        value: qid,
      })),
    );
    if (!q.questionPoolIds || q.questionPoolIds.length === 0) {
      setEditPool([{ key: Date.now(), value: "" }]);
    }
    setEditDrafts([]);
    setEditStatus(q.status);
    setEditScheduledStart(q.scheduledStart ?? "");
    setEditScheduledEnd(q.scheduledEnd ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCreatingNewChapter(false);
    setEditCreatingNewLesson(false);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setBusy(true);
    setError("");
    try {
      let chapterId = editChapterId;
      if (editCreatingNewChapter) {
        if (!editNewChapterName.trim()) {
          setError("Chapter name is required.");
          setBusy(false);
          return;
        }
        const created = await Teacher.createChapter({
          name: editNewChapterName.trim(),
        });
        chapterId = created.id;
        await refreshChapters();
      }
      let lessonId = editLessonId;
      if (editCreatingNewLesson) {
        if (!chapterId) {
          setError("Pick or create a chapter first.");
          setBusy(false);
          return;
        }
        if (!editNewLessonTitle.trim()) {
          setError("Lesson title is required.");
          setBusy(false);
          return;
        }
        const created = await Teacher.createLesson({
          chapterId,
          title: editNewLessonTitle.trim(),
        });
        lessonId = created.id;
        await refreshLessons();
      }
      if (!chapterId || !lessonId) {
        setError("Pick or create a chapter and lesson first.");
        setBusy(false);
        return;
      }
      // Resolve pool: real existing question ids plus any locally-authored drafts.
      const existingPoolIds = editPool
        .map((s) => s.value)
        .filter((v) => v && !v.startsWith("draft-"));
      const draftSlots = editPool.filter((s) => s.value.startsWith("draft-"));

      await Teacher.updateQuiz(editingId, {
        title: editTitle.trim(),
        lessonId,
        questionPoolIds: existingPoolIds,
        status: editStatus,
        scheduledStart:
          editStatus === "scheduled"
            ? combineToIso(editScheduledStart, editScheduledStartTime) ??
              combineToIso(editScheduledStart, "00:00")
            : null,
        scheduledEnd:
          editStatus === "scheduled"
            ? combineToIso(editScheduledEnd, editScheduledEndTime) ??
              combineToIso(editScheduledEnd, "23:59")
            : null,
      });
      // Persist drafts authored in the edit overlay, then attach them to the pool.
      // Drafts are independent — create them all in PARALLEL, not one-by-one.
      const createdIds: string[] = [];
      const draftEntries = draftSlots
        .map((slot) => editDrafts.find((d) => d.key === slot.value))
        .filter((draft): draft is NonNullable<typeof draft> => Boolean(draft));
      if (draftEntries.length > 0) {
        const created = await Promise.all(
          draftEntries.map((draft) =>
            Teacher.createQuestion({
              quizId: editingId,
              prompt: draft.prompt,
              options: draft.options,
              correctOptionIndex: draft.correctOptionIndex,
              timeLimitMinutes: draft.timeLimitMinutes,
              imageUrl: draft.imageUrl,
              trollVideoId: draft.trollVideoId,
              order: 99,
            }),
          ),
        );
        createdIds.push(...created.map((c) => c.id));
      }
      if (createdIds.length > 0) {
        await Teacher.updateQuiz(editingId, {
          questionPoolIds: [...existingPoolIds, ...createdIds],
        });
      }
      await Promise.all([refreshQuizzes(), refreshQuestions()]);
      setEditingId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const lessonForQuiz = (q: Quiz) => lessons.find((l) => l.id === q.lessonId);

  const handleAssign = async (quizId: string, studentId: string) => {
    try {
      await Teacher.assignOne(studentId, quizId);
      await refreshStudents();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // ─── Question-pool overlay (New Quiz form) ───────────────────────────────

  const handleQImageUpload = async (file: File) => {
    setQUploading("image");
    setQImageProgress(0);
    setQError("");
    try {
      const asset = await Teacher.uploadAsset(file, setQImageProgress);
      setQImageUrl(asset.url);
    } catch (e) {
      setQError((e as Error).message);
    } finally {
      setQUploading(null);
    }
  };

  const handleQVideoUpload = async (file: File) => {
    setQUploading("video");
    setQVideoProgress(0);
    setQError("");
    try {
      const asset = await Teacher.uploadAsset(file, setQVideoProgress);
      setQTrollVideoId(asset.url);
    } catch (e) {
      setQError((e as Error).message);
    } finally {
      setQUploading(null);
    }
  };

  const handleEQImageUpload = async (file: File) => {
    setEQUploading("image");
    setEQImageProgress(0);
    setEQError("");
    try {
      const asset = await Teacher.uploadAsset(file, setEQImageProgress);
      setEQImageUrl(asset.url);
    } catch (e) {
      setEQError((e as Error).message);
    } finally {
      setEQUploading(null);
    }
  };

  const handleEQVideoUpload = async (file: File) => {
    setEQUploading("video");
    setEQVideoProgress(0);
    setEQError("");
    try {
      const asset = await Teacher.uploadAsset(file, setEQVideoProgress);
      setEQTrollVideoId(asset.url);
    } catch (e) {
      setEQError((e as Error).message);
    } finally {
      setEQUploading(null);
    }
  };

  const openPoolOverlay = (slotKey: number) => {
    setPoolOverlaySlotKey(slotKey);
    setQPrompt("");
    setQOptions(["", "", "", "", ""]);
    setQCorrect(0);
    setQTimeLimit("");
    setQImageUrl("");
    setQTrollVideoId("");
    setQUploading(null);
    setQError("");
    setPoolOverlayOpen(true);
  };

  const closePoolOverlay = () => {
    setPoolOverlayOpen(false);
    setPoolOverlaySlotKey(null);
    setQError("");
  };

  const submitPoolOverlay = () => {
    if (!qPrompt.trim()) {
      setQError("Prompt is required.");
      return;
    }
    if (qOptions.some((o) => !o.trim())) {
      setQError("All 5 options must be filled in.");
      return;
    }
    setQError("");
    // Allocate a new draft temp id and append a fresh empty slot.
    const nextDraftNumber = form.drafts.length + 1;
    const newDraftKey = `draft-${nextDraftNumber}`;
    const newDraft: DraftQuestion = {
      key: newDraftKey,
      prompt: qPrompt.trim(),
      options: qOptions.map((o) => o.trim()),
      correctOptionIndex: qCorrect,
      timeLimitMinutes: qTimeLimit ? Number(qTimeLimit) : null,
      imageUrl: qImageUrl || null,
      trollVideoId: qTrollVideoId || null,
    };
    setForm((f) => ({
      ...f,
      drafts: [...f.drafts, newDraft],
      pool: [...f.pool, { key: Date.now(), value: "" }],
    }));
    // If invoked from a specific slot, also mark that slot as the new draft so
    // the teacher sees their newly-authored question reflected in the form.
    if (poolOverlaySlotKey !== null) {
      setForm((f) => ({
        ...f,
        pool: f.pool.map((s) =>
          s.key === poolOverlaySlotKey ? { ...s, value: newDraftKey } : s,
        ),
      }));
    }
    closePoolOverlay();
  };

  const setSlotValue = (slotKey: number, value: string) => {
    setForm((f) => ({
      ...f,
      pool: f.pool.map((s) => (s.key === slotKey ? { ...s, value } : s)),
    }));
  };

  const removePoolSlot = (slotKey: number) => {
    setForm((f) => {
      // Always keep at least one slot in the list.
      if (f.pool.length <= 1) {
        return { ...f, pool: [{ key: Date.now(), value: "" }] };
      }
      return { ...f, pool: f.pool.filter((s) => s.key !== slotKey) };
    });
  };

  // ─── Edit-form question-pool overlay ───────────────────────────────────

const openEditPoolOverlay = (slotKey: number) => {
    setEditPoolOverlaySlotKey(slotKey);
    setEQPrompt("");
    setEQOptions(["", "", "", "", ""]);
    setEQCorrect(0);
    setEQTimeLimit("");
    setEQImageUrl("");
    setEQTrollVideoId("");
    setEQUploading(null);
    setEQError("");
    setEditPoolOverlayOpen(true);
  };

  const closeEditPoolOverlay = () => {
    setEditPoolOverlayOpen(false);
    setEditPoolOverlaySlotKey(null);
    setEQError("");
  };

  const submitEditPoolOverlay = () => {
    if (!eQPrompt.trim()) {
      setEQError("Prompt is required.");
      return;
    }
    if (eQOptions.some((o) => !o.trim())) {
      setEQError("All 5 options must be filled in.");
      return;
    }
    setEQError("");
    const nextDraftNumber = editDrafts.length + 1;
    const newDraftKey = `draft-${nextDraftNumber}`;
    const newDraft: DraftQuestion = {
      key: newDraftKey,
      prompt: eQPrompt.trim(),
      options: eQOptions.map((o) => o.trim()),
      correctOptionIndex: eQCorrect,
      timeLimitMinutes: eQTimeLimit ? Number(eQTimeLimit) : null,
      imageUrl: eQImageUrl || null,
      trollVideoId: eQTrollVideoId || null,
    };
    setEditDrafts((d) => [...d, newDraft]);
    setEditPool((p) => [...p, { key: Date.now(), value: "" }]);
    if (editPoolOverlaySlotKey !== null) {
      setEditPool((p) =>
        p.map((s) =>
          s.key === editPoolOverlaySlotKey ? { ...s, value: newDraftKey } : s,
        ),
      );
    }
    closeEditPoolOverlay();
  };

  const setEditSlotValue = (slotKey: number, value: string) => {
    setEditPool((p) => p.map((s) => (s.key === slotKey ? { ...s, value } : s)));
  };

  const removeEditPoolSlot = (slotKey: number) => {
    setEditPool((p) =>
      p.length <= 1 ? [{ key: Date.now(), value: "" }] : p.filter((s) => s.key !== slotKey),
    );
  };

  const editDraftByKey = (key: string) => editDrafts.find((d) => d.key === key);

  const editLessonQuestionIds = new Set(
    quizzes
      .filter((q) => q.lessonId === editLessonId)
      .flatMap((q) => q.questionPoolIds ?? []),
  );
  const editLessonQuestions = questions.filter((q) => editLessonQuestionIds.has(q.id));

  // ─── Render helpers (shared between create + edit forms) ────────────────

  const renderChapterLessonPickers = (
    catId: string,
    setCatId: (v: string) => void,
    lessonId: string,
    setLessonId: (v: string) => void,
    creatingCat: boolean,
    setCreatingCat: (v: boolean) => void,
    newCatName: string,
    setNewCatName: (v: string) => void,
    creatingLesson: boolean,
    setCreatingLesson: (v: boolean) => void,
    newLessonTitle: string,
    setNewLessonTitle: (v: string) => void,
    compact: boolean,
  ) => {
    const lessonsHere = lessonsForChapter(catId);

    const handleInlineCreateChapter = async () => {
      const name = newCatName.trim();
      if (!name || inlineCreateBusy) return;
      setInlineCreateBusy(true);
      setError("");
      try {
        const created = await Teacher.createChapter({ name });
        void refreshChapters();
        setCatId(created.id);
        setNewCatName("");
        setCreatingCat(false);
        setLessonId("");
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setInlineCreateBusy(false);
      }
    };

    const handleInlineCreateLesson = async () => {
      const title = newLessonTitle.trim();
      if (!title || !catId || inlineCreateBusy) return;
      setInlineCreateBusy(true);
      setError("");
      try {
        const created = await Teacher.createLesson({
          chapterId: catId,
          title,
        });
        await Promise.all([refreshLessons(), refreshChapters()]);
        setLessonId(created.id);
        setNewLessonTitle("");
        setCreatingLesson(false);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setInlineCreateBusy(false);
      }
    };

    return (
      <div className={compact ? "flex flex-col gap-3" : "flex flex-col gap-1.5"}>
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs font-600 uppercase tracking-wider"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
          >
            Chapter *
          </label>
          {!creatingCat ? (
            <div className="flex gap-2">
              <select
                value={catId}
                onChange={(e) => {
                  setCatId(e.target.value);
                  setLessonId("");
                  if (creatingLesson) {
                    setCreatingLesson(false);
                    setNewLessonTitle("");
                  }
                }}
                className="flex-1 px-3 py-2.5 text-sm outline-none"
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
              <button
                onClick={() => {
                  setCreatingCat(true);
                  setCatId("");
                  setLessonId("");
                  if (creatingLesson) {
                    setCreatingLesson(false);
                    setNewLessonTitle("");
                  }
                }}
                className="flex items-center gap-1 px-3 text-xs font-600"
                style={{
                  background: "var(--color-ember)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  whiteSpace: "nowrap",
                }}
              >
                <Plus size={12} /> New
              </button>
            </div>
          ) : (
            <div
              className="flex gap-2 p-2"
              style={{
                border: "2px dashed var(--color-ember)",
                background: "rgba(217, 79, 30, 0.04)",
              }}
            >
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCatName.trim()) {
                    e.preventDefault();
                    handleInlineCreateChapter();
                  }
                }}
                placeholder="e.g. Algebra"
                autoFocus
                className="flex-1 px-3 py-2 text-sm outline-none"
                style={{
                  border: "2px solid var(--color-cream-dark)",
                  fontFamily: "var(--font-body)",
                  color: "var(--color-ink)",
                  background: "white",
                  borderRadius: 0,
                }}
              />
              <button
                onClick={handleInlineCreateChapter}
                disabled={!newCatName.trim() || inlineCreateBusy}
                className="flex items-center gap-1 px-3 text-xs font-600"
                style={{
                  background:
                    newCatName.trim() && !inlineCreateBusy
                      ? "var(--color-teal-dark)"
                      : "var(--color-cream-dark)",
                  color:
                    newCatName.trim() && !inlineCreateBusy ? "#fff" : "var(--color-ink-muted)",
                  border: "none",
                  cursor:
                    newCatName.trim() && !inlineCreateBusy ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-body)",
                  whiteSpace: "nowrap",
                }}
              >
                <Check size={12} /> Create
              </button>
              <button
                onClick={() => {
                  setCreatingCat(false);
                  setNewCatName("");
                }}
                className="px-3 text-xs"
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
            </div>
          )}
        </div>

        {creatingCat && (
          <p className="text-xs italic" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
            Chapter will be created and become available for picking.
          </p>
        )}

        {!creatingCat && (
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-600 uppercase tracking-wider"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
            >
              Lesson *
            </label>
            {!creatingLesson ? (
              <div className="flex gap-2">
                <select
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                  disabled={!catId}
                  className="flex-1 px-3 py-2.5 text-sm outline-none"
                  style={{
                    border: "2px solid var(--color-cream-dark)",
                    fontFamily: "var(--font-body)",
                    color: "var(--color-ink)",
                    background: "white",
                    borderRadius: 0,
                    opacity: catId ? 1 : 0.5,
                  }}
                >
                  <option value="">{catId ? "Pick a lesson…" : "Pick a chapter first"}</option>
                  {lessonsHere.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setCreatingLesson(true);
                    setLessonId("");
                    setNewLessonTitle("");
                  }}
                  disabled={!catId}
                  className="flex items-center gap-1 px-3 text-xs font-600"
                  style={{
                    background: catId ? "var(--color-ember)" : "var(--color-cream-dark)",
                    color: catId ? "#fff" : "var(--color-ink-muted)",
                    border: "none",
                    cursor: catId ? "pointer" : "not-allowed",
                    fontFamily: "var(--font-body)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Plus size={12} /> New
                </button>
              </div>
            ) : (
              <div
                className="flex gap-2 p-2"
                style={{
                  border: "2px dashed var(--color-ember)",
                  background: "rgba(217, 79, 30, 0.04)",
                }}
              >
                <input
                  type="text"
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newLessonTitle.trim() && catId) {
                      e.preventDefault();
                      handleInlineCreateLesson();
                    }
                  }}
                  placeholder="e.g. Newton's Third Law"
                  autoFocus
                  className="flex-1 px-3 py-2 text-sm outline-none"
                  style={{
                    border: "2px solid var(--color-cream-dark)",
                    fontFamily: "var(--font-body)",
                    color: "var(--color-ink)",
                    background: "white",
                    borderRadius: 0,
                  }}
                />
                <button
                  onClick={handleInlineCreateLesson}
                  disabled={!newLessonTitle.trim() || !catId || inlineCreateBusy}
                  className="flex items-center gap-1 px-3 text-xs font-600"
                  style={{
                    background:
                      newLessonTitle.trim() && catId && !inlineCreateBusy
                        ? "var(--color-teal-dark)"
                        : "var(--color-cream-dark)",
                    color:
                      newLessonTitle.trim() && catId && !inlineCreateBusy
                        ? "#fff"
                        : "var(--color-ink-muted)",
                    border: "none",
                    cursor:
                      newLessonTitle.trim() && catId && !inlineCreateBusy
                        ? "pointer"
                        : "not-allowed",
                    fontFamily: "var(--font-body)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Check size={12} /> Create
                </button>
                <button
                  onClick={() => {
                    setCreatingLesson(false);
                    setNewLessonTitle("");
                  }}
                  className="px-3 text-xs"
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
              </div>
            )}
            {creatingLesson && (
              <p className="text-xs italic" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
                Lesson will be created and added to the chosen chapter.
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

const renderStatusBlock = (
    status: Quiz["status"],
    setStatus: (s: Quiz["status"]) => void,
    scheduledStart: string,
    setScheduledStart: (v: string) => void,
    scheduledStartTime: string,
    setScheduledStartTime: (v: string) => void,
    scheduledEnd: string,
    setScheduledEnd: (v: string) => void,
    scheduledEndTime: string,
    setScheduledEndTime: (v: string) => void,
  ) => (
    <>
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-600 uppercase tracking-wider"
          style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
        >
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Quiz["status"])}
          className="px-3 py-2 text-sm outline-none"
          style={{
            border: "2px solid var(--color-cream-dark)",
            fontFamily: "var(--font-body)",
            color: "var(--color-ink)",
            background: "white",
            borderRadius: 0,
          }}
        >
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      {status === "scheduled" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-600 uppercase tracking-wider"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
            >
              Opens — date
            </label>
            <input
              type="date"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              className="px-3 py-2 text-sm outline-none"
              style={{ border: "2px solid var(--color-cream-dark)" }}
            />
            <label
              className="text-xs font-600 uppercase tracking-wider mt-1"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
            >
              Opens — hour:minute
            </label>
            <TimePicker value={scheduledStartTime} onChange={setScheduledStartTime} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-600 uppercase tracking-wider"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
            >
              Closes — date
            </label>
            <input
              type="date"
              value={scheduledEnd}
              onChange={(e) => setScheduledEnd(e.target.value)}
              className="px-3 py-2 text-sm outline-none"
              style={{ border: "2px solid var(--color-cream-dark)" }}
            />
            <label
              className="text-xs font-600 uppercase tracking-wider mt-1"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
            >
              Closes — hour:minute
            </label>
            <TimePicker value={scheduledEndTime} onChange={setScheduledEndTime} />
          </div>
        </div>
      )}
    </>
  );

  // ─── JSX ────────────────────────────────────────────────────────────────

  return (
    <div className="px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="font-900 text-3xl mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Quizzes
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
          >
            {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""} across{" "}
            {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setError("");
            setForm(EMPTY);
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
          {showForm ? "Cancel" : "New Quiz"}
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
          className="p-6 mb-6 animate-slide-up flex flex-col gap-4"
          style={{
            background: "white",
            border: "3px solid var(--color-ink)",
            boxShadow: "6px 6px 0 var(--color-amber)",
          }}
        >
          <h2
            className="text-lg font-700"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            New Quiz
          </h2>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-600 uppercase tracking-wider"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
            >
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Linear Equations Quick Check"
              className="px-3 py-2.5 text-sm outline-none"
              style={{
                border: "2px solid var(--color-cream-dark)",
                fontFamily: "var(--font-body)",
                color: "var(--color-ink)",
                borderRadius: 0,
              }}
            />
          </div>

          {renderChapterLessonPickers(
            form.chapterId,
            (v) => setForm((f) => ({ ...f, chapterId: v })),
            form.lessonId,
            (v) => setForm((f) => ({ ...f, lessonId: v })),
            form.creatingNewChapter,
            (v) => setForm((f) => ({ ...f, creatingNewChapter: v })),
            form.newChapterName,
            (v) => setForm((f) => ({ ...f, newChapterName: v })),
            form.creatingNewLesson,
            (v) => setForm((f) => ({ ...f, creatingNewLesson: v })),
            form.newLessonTitle,
            (v) => setForm((f) => ({ ...f, newLessonTitle: v })),
            false,
          )}

          {/* Question pool (optional) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-600 uppercase tracking-wider"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                }}
              >
                Questions (optional — add or pick from the selected lesson)
              </label>
            </div>

            {form.pool.length === 0 && (
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, pool: [{ key: Date.now(), value: "" }] }))
                }
                className="self-start flex items-center gap-2 px-3 py-1.5 text-xs"
                style={{
                  background: "var(--color-amber)",
                  color: "var(--color-ink)",
                  border: "2px solid var(--color-ink)",
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                }}
              >
                <Plus size={12} /> Add a question
              </button>
            )}

            <div className="flex flex-col gap-2">
              {form.pool.map((slot, i) => (
                <div key={slot.key} className="flex items-center gap-2">
                  <span
                    className="text-xs shrink-0"
                    style={{
                      color: "var(--color-ink-muted)",
                      fontFamily: "var(--font-mono)",
                      minWidth: 18,
                    }}
                  >
                    {i + 1}.
                  </span>
                  <select
                    value={slot.value}
                    onChange={(e) => setSlotValue(slot.key, e.target.value)}
                    className="flex-1 px-3 py-2 text-sm outline-none"
                    style={{
                      border: "2px solid var(--color-cream-dark)",
                      fontFamily: "var(--font-body)",
                      color: "var(--color-ink)",
                      background: "white",
                      borderRadius: 0,
                    }}
                    disabled={!form.lessonId}
                    title={
                      !form.lessonId
                        ? "Pick a lesson first to see its questions."
                        : ""
                    }
                  >
                    <option value="">Select a question…</option>
                    {slot.value.startsWith("draft-") &&
                      draftByKey(slot.value) && (
                        <option value={slot.value}>
                          [new] {draftByKey(slot.value)!.prompt}
                        </option>
                      )}
                    {lessonQuestions.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.prompt}
                      </option>
                    ))}
                    {form.drafts
                      .filter((d) => d.key !== slot.value)
                      .map((d) => (
                        <option key={d.key} value={d.key}>
                          [new] {d.prompt}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => openPoolOverlay(slot.key)}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-2 text-xs"
                    style={{
                      background: "var(--color-amber)",
                      color: "var(--color-ink)",
                      border: "2px solid var(--color-ink)",
                      fontFamily: "var(--font-body)",
                      cursor: "pointer",
                    }}
                    title="Author a new question in an overlay"
                  >
                    <Plus size={12} /> Add
                  </button>
                  <button
                    type="button"
                    onClick={() => removePoolSlot(slot.key)}
                    className="shrink-0 p-1.5"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-ink-muted)",
                    }}
                    title="Remove this slot"
                    disabled={form.pool.length <= 1}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            <p
              className="text-xs"
              style={{
                color: "var(--color-ink-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              {form.lessonId
                ? `Showing ${lessonQuestions.length} existing question${
                    lessonQuestions.length === 1 ? "" : "s"
                  } on the selected lesson. Click "Add" to author a new one — it'll be created when you save.`
                : "Pick a lesson to populate the question list."}
            </p>
          </div>

          {renderStatusBlock(
            form.status,
            (s) => setForm((f) => ({ ...f, status: s })),
            form.scheduledStart,
            (v) => setForm((f) => ({ ...f, scheduledStart: v })),
            form.scheduledStartTime,
            (v) => setForm((f) => ({ ...f, scheduledStartTime: v })),
            form.scheduledEnd,
            (v) => setForm((f) => ({ ...f, scheduledEnd: v })),
            form.scheduledEndTime,
            (v) => setForm((f) => ({ ...f, scheduledEndTime: v })),
          )}

          <button
            onClick={handleCreate}
            disabled={busy || !form.title.trim()}
            className="self-start flex items-center gap-2 px-5 py-2.5 text-sm font-600"
            style={{
              background: "var(--color-teal-dark)",
              color: "#fff",
              border: "none",
              cursor: !busy && form.title.trim() ? "pointer" : "not-allowed",
              fontFamily: "var(--font-body)",
              opacity: !busy && form.title.trim() ? 1 : 0.5,
            }}
          >
            <Plus size={14} /> {busy ? "Saving…" : "Save Quiz"}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {quizzes.length === 0 && (
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
              No quizzes yet.
            </p>
          </div>
        )}
        {quizzes.map((q) => {
          const l = lessonForQuiz(q);
          const cat = l ? chapters.find((c) => c.id === l.chapterId) : undefined;
          const isEditing = editingId === q.id;
          const isExpanded = expandedId === q.id;
          const questionCount = questions.filter((qq) => qq.quizId === q.id).length;
          return (
            <div
              key={q.id}
              style={{
                background: "white",
                border: "2px solid var(--color-cream-dark)",
                borderLeft: "5px solid var(--color-teal-dark)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div
                className="flex items-center justify-between p-4 quiz-header"
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "3px 3px 0 var(--color-ink)";
                  e.currentTarget.style.transform = "translate(-1px, -1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div className="flex-1 pr-3" onClick={() => !isEditing && setExpandedId(isExpanded ? null : q.id)}>
                  {isEditing ? (
                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Quiz title"
                        className="px-2 py-1.5 text-base outline-none"
                        style={{
                          border: "2px solid var(--color-ink)",
                          fontFamily: "var(--font-display)",
                          color: "var(--color-ink)",
                          borderRadius: 0,
                        }}
                      />
                      {renderChapterLessonPickers(
                        editChapterId,
                        setEditChapterId,
                        editLessonId,
                        handleEditLessonChange,
                        editCreatingNewChapter,
                        setEditCreatingNewChapter,
                        editNewChapterName,
                        setEditNewChapterName,
                        editCreatingNewLesson,
                        setEditCreatingNewLesson,
                        editNewLessonTitle,
                        setEditNewLessonTitle,
                        true,
                      )}

                      {/* Question pool (optional) — edit form */}
                      <div className="flex flex-col gap-1.5">
                        <label
                          className="text-xs font-600 uppercase tracking-wider"
                          style={{
                            color: "var(--color-ink-muted)",
                            fontFamily: "var(--font-body)",
                            letterSpacing: "0.1em",
                          }}
                        >
                          Questions (optional — edit the selected lesson&apos;s pool)
                        </label>

                        <div className="flex flex-col gap-2">
                          {editPool.map((slot, i) => (
                            <div key={slot.key} className="flex items-center gap-2">
                              <span
                                className="text-xs shrink-0"
                                style={{
                                  color: "var(--color-ink-muted)",
                                  fontFamily: "var(--font-mono)",
                                  minWidth: 18,
                                }}
                              >
                                {i + 1}.
                              </span>
                              <select
                                value={slot.value}
                                onChange={(e) => setEditSlotValue(slot.key, e.target.value)}
                                className="flex-1 px-3 py-2 text-sm outline-none"
                                style={{
                                  border: "2px solid var(--color-cream-dark)",
                                  fontFamily: "var(--font-body)",
                                  color: "var(--color-ink)",
                                  background: "white",
                                  borderRadius: 0,
                                }}
                                disabled={!editLessonId}
                                title={
                                  !editLessonId
                                    ? "Pick a lesson first to see its questions."
                                    : ""
                                }
                              >
                                <option value="">Select a question…</option>
                                {slot.value.startsWith("draft-") &&
                                  editDraftByKey(slot.value) && (
                                    <option value={slot.value}>
                                      [new] {editDraftByKey(slot.value)!.prompt}
                                    </option>
                                  )}
                                {editLessonQuestions.map((qq) => (
                                  <option key={qq.id} value={qq.id}>
                                    {qq.prompt}
                                  </option>
                                ))}
                                {editDrafts
                                  .filter((d) => d.key !== slot.value)
                                  .map((d) => (
                                    <option key={d.key} value={d.key}>
                                      [new] {d.prompt}
                                    </option>
                                  ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => openEditPoolOverlay(slot.key)}
                                className="shrink-0 flex items-center gap-1 px-2.5 py-2 text-xs"
                                style={{
                                  background: "var(--color-amber)",
                                  color: "var(--color-ink)",
                                  border: "2px solid var(--color-ink)",
                                  fontFamily: "var(--font-body)",
                                  cursor: "pointer",
                                }}
                                title="Author a new question in an overlay"
                              >
                                <Plus size={12} /> Add
                              </button>
                              <button
                                type="button"
                                onClick={() => removeEditPoolSlot(slot.key)}
                                className="shrink-0 p-1.5"
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "var(--color-ink-muted)",
                                }}
                                title="Remove this slot"
                                disabled={editPool.length <= 1}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <p
                          className="text-xs"
                          style={{
                            color: "var(--color-ink-muted)",
                            fontFamily: "var(--font-body)",
                          }}
                        >
                          {editLessonId
                            ? `Showing ${editLessonQuestions.length} existing question${
                                editLessonQuestions.length === 1 ? "" : "s"
                              } on the selected lesson. Click "Add" to author a new one — it'll be created when you save.`
                            : "Pick a lesson to populate the question list."}
                        </p>
                      </div>

                      {renderStatusBlock(
                        editStatus,
                        setEditStatus,
                        editScheduledStart,
                        setEditScheduledStart,
                        editScheduledStartTime,
                        setEditScheduledStartTime,
                        editScheduledEnd,
                        setEditScheduledEnd,
                        editScheduledEndTime,
                        setEditScheduledEndTime,
                      )}
                    </div>
                  ) : (
                    <>
                      {cat && l && (
                        <p
                          className="text-xs mb-1"
                          style={{
                            color: "var(--color-ink-muted)",
                            fontFamily: "var(--font-body)",
                          }}
                        >
                          {cat.name} / {l.title}
                        </p>
                      )}
                      <p
                        className="text-base font-700"
                        style={{
                          fontFamily: "var(--font-display)",
                          color: "var(--color-ink)",
                        }}
                      >
                        {q.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className="text-xs px-2 py-0.5"
                          style={{
                            background:
                              q.status === "active"
                                ? "#E6F5F5"
                                : q.status === "closed"
                                  ? "var(--color-cream-dark)"
                                  : q.status === "scheduled"
                                    ? "#FFF8E6"
                                    : "transparent",
                            color:
                              q.status === "active"
                                ? "var(--color-teal-dark)"
                                : q.status === "closed"
                                  ? "var(--color-ink-muted)"
                                  : q.status === "scheduled"
                                    ? "var(--color-amber-dark)"
                                    : "var(--color-ink-muted)",
                            fontFamily: "var(--font-body)",
                            border: "1px solid var(--color-cream-dark)",
                          }}
                        >
                          {q.status}
                        </span>
                        <span
                          className="text-xs"
                          style={{
                            color: "var(--color-ink-muted)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {questionCount} question{questionCount !== 1 ? "s" : ""} · pool {q.questionPoolIds.length}
                        </span>
                        {q.status === "scheduled" && q.scheduledStart && (
                          <span
                            className="text-xs"
                            style={{
                              color: "var(--color-ink-muted)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            opens {new Date(q.scheduledStart).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        onClick={saveEdit}
                        disabled={!editTitle.trim() || busy}
                        className="p-1.5"
                        style={{
                          background: "var(--color-teal-dark)",
                          color: "#fff",
                          border: "none",
                          cursor: !editTitle.trim() || busy ? "not-allowed" : "pointer",
                          opacity: !editTitle.trim() || busy ? 0.5 : 1,
                        }}
                      >
                        <Check size={13} />
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
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : q.id)}
                        className="p-1 quiz-chevron-btn"
                        title={isExpanded ? "Collapse quiz" : "Expand quiz"}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-ink)",
                        }}
                      >
                        <ChevronDown
                          size={16}
                          className="quiz-chevron"
                          style={{
                            transform: isExpanded ? "rotate(180deg)" : "none",
                            transition: "transform 0.15s, opacity 0.15s",
                            opacity: isExpanded ? 1 : undefined,
                          }}
                        />
                      </button>
                      <button
                        onClick={() => setSelectedQuiz(q)}
                        className="p-1.5"
                        title="Assign to students"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-ink-muted)",
                          opacity: 0.5,
                        }}
                      >
                        <Users size={13} />
                      </button>
                      <button
                        onClick={() => startEdit(q)}
                        className="p-1.5"
                        title="Edit quiz"
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
                        onClick={() => handleDelete(q.id)}
                        className="p-1.5"
                        title="Archive quiz"
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
              {isExpanded && !isEditing && (
                <div
                  className="px-4 pb-4"
                  style={{ borderTop: "1px solid var(--color-cream-dark)" }}
                >
                  <p
                    className="text-xs font-600 uppercase tracking-wider mb-2 pt-3"
                    style={{
                      color: "var(--color-ink-muted)",
                      fontFamily: "var(--font-body)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Questions ({questionCount})
                  </p>
                  {questionCount === 0 ? (
                    <p
                      className="text-sm italic"
                      style={{
                        color: "var(--color-ink-muted)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      No questions attached yet.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {questions
                        .filter((qq) => qq.quizId === q.id)
                        .sort((a, b) => a.order - b.order)
                        .map((qq) => (
                          <li
                            key={qq.id}
                            className="flex items-start gap-2 px-3 py-2 text-sm"
                            style={{
                              background: "var(--color-cream)",
                              border: "1px solid var(--color-cream-dark)",
                            }}
                          >
                            <span
                              className="text-xs font-700 mt-0.5"
                              style={{
                                color: "var(--color-ink-muted)",
                                fontFamily: "var(--font-mono)",
                                flexShrink: 0,
                              }}
                            >
                              {qq.order}.
                            </span>
                            <span
                              style={{
                                color: "var(--color-ink)",
                                fontFamily: "var(--font-body)",
                              }}
                            >
                              <MathText text={qq.prompt} />
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedQuiz && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: "rgba(28, 15, 0, 0.6)", backdropFilter: "blur(2px)" }}
          onClick={() => setSelectedQuiz(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md p-5"
            style={{
              background: "white",
              border: "3px solid var(--color-ink)",
              boxShadow: "8px 8px 0 var(--color-amber)",
            }}
          >
            <h3
              className="text-base font-700 mb-3 flex items-center gap-2"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-ink)",
              }}
            >
              <Calendar size={15} /> Assign “{selectedQuiz.title}”
            </h3>
            <p
              className="text-xs mb-3"
              style={{
                color: "var(--color-ink-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              Pick students to add this quiz to their dashboard.
            </p>
            <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
              {students.map((s) => {
                const assigned = s.assignedQuizIds.includes(selectedQuiz.id);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2"
                    style={{
                      background: assigned
                        ? "var(--color-cream)"
                        : "transparent",
                      border: `1px solid ${assigned ? "var(--color-teal-dark)" : "var(--color-cream-dark)"}`,
                    }}
                  >
                    <span
                      className="text-sm"
                      style={{
                        fontFamily: "var(--font-body)",
                        color: "var(--color-ink)",
                      }}
                    >
                      {s.name}
                    </span>
                    {assigned ? (
                      <span
                        className="text-xs"
                        style={{
                          color: "var(--color-teal-dark)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        Assigned
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAssign(selectedQuiz.id, s.id)}
                        className="text-xs px-3 py-1 font-600"
                        style={{
                          background: "var(--color-ember)",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        Assign
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setSelectedQuiz(null)}
                className="text-xs px-3 py-1.5 font-500"
                style={{
                  background: "var(--color-cream-dark)",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question pool overlay — add a new question while building a quiz */}
      {poolOverlayOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(28, 15, 0, 0.6)", backdropFilter: "blur(2px)" }}
          onClick={closePoolOverlay}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg p-5 flex flex-col gap-3"
            style={{
              background: "white",
              border: "3px solid var(--color-ink)",
              boxShadow: "8px 8px 0 var(--color-amber)",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <div className="flex items-center justify-between">
              <h3
                className="text-base font-700 flex items-center gap-2"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-ink)",
                }}
              >
                <Plus size={15} /> Add a question
              </h3>
              <button
                onClick={closePoolOverlay}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-ink-muted)",
                }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <p
              className="text-xs"
              style={{
                color: "var(--color-ink-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              Authored questions are saved together with the quiz. They will
              appear as a fresh empty slot in the pool when you finish.
            </p>

            {qError && (
              <div
                className="p-2 text-xs"
                style={{
                  background: "#FDECEA",
                  border: "1px solid var(--color-ember)",
                  color: "var(--color-ember-dark)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {qError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-600 uppercase tracking-wider"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                }}
              >
                Prompt *
              </label>
              <input
                type="text"
                value={qPrompt}
                onChange={(e) => setQPrompt(e.target.value)}
                placeholder="e.g. Solve for x: 2x + 6 = 14"
                className="px-3 py-2 text-sm outline-none"
                style={{
                  border: "2px solid var(--color-cream-dark)",
                  fontFamily: "var(--font-body)",
                  color: "var(--color-ink)",
                  borderRadius: 0,
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
                  {qUploading === "image" ? "Uploading…" : "Choose image…"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleQImageUpload(f);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setLibraryOpen({ kind: "image", target: "create" })}
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
                {qImageUrl && (
                  <button
                    onClick={() => setQImageUrl("")}
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
              {qUploading === "image" && (
                <UploadProgress percent={qImageProgress} label="Uploading image…" />
              )}
              {qImageUrl && (
                <div
                  style={{
                    aspectRatio: "16/9",
                    background: "var(--color-cream-dark)",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={qImageUrl}
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
                <Video size={11} /> Video (optional — plays when a student gets this wrong 3×)
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
                  {qUploading === "video" ? "Uploading…" : "Choose video…"}
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleQVideoUpload(f);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setLibraryOpen({ kind: "video", target: "create" })}
                  disabled={videoAssets.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm"
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
                {qTrollVideoId && (
                  <button
                    onClick={() => setQTrollVideoId("")}
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
              {qUploading === "video" && (
                <UploadProgress percent={qVideoProgress} label="Uploading video…" />
              )}
              {qTrollVideoId && (
                <video
                  src={qTrollVideoId}
                  controls
                  className="w-full"
                  style={{
                    background: "var(--color-ink)",
                    border: "2px solid var(--color-cream-dark)",
                  }}
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-xs font-600 uppercase tracking-wider"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                }}
              >
                Options (exactly 5) *
              </label>
              {qOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="text-xs font-700 shrink-0"
                    style={{
                      width: 22,
                      color: qCorrect === i ? "var(--color-ember)" : "var(--color-ink-muted)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const next = [...qOptions];
                      next[i] = e.target.value;
                      setQOptions(next);
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="flex-1 px-3 py-2 text-sm outline-none"
                    style={{
                      border: "2px solid var(--color-cream-dark)",
                      fontFamily: "var(--font-body)",
                      color: "var(--color-ink)",
                      borderRadius: 0,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setQCorrect(i)}
                    className="shrink-0 p-1.5"
                    style={{
                      background: qCorrect === i ? "var(--color-teal-dark)" : "none",
                      color: qCorrect === i ? "white" : "var(--color-ink-muted)",
                      border: "2px solid var(--color-teal-dark)",
                      cursor: "pointer",
                    }}
                    title="Mark as correct"
                  >
                    <Check size={12} />
                  </button>
                </div>
              ))}
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
                <Clock size={11} /> Time limit (optional)
              </label>
              <select
                value={qTimeLimit}
                onChange={(e) => setQTimeLimit(e.target.value)}
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
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((m) => (
                  <option key={m} value={m}>
                    {m} minute{m !== 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={closePoolOverlay}
                className="px-4 py-2 text-sm font-600"
                style={{
                  background: "none",
                  color: "var(--color-ink-muted)",
                  border: "2px solid var(--color-cream-dark)",
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitPoolOverlay}
                className="px-4 py-2 text-sm font-600 flex items-center gap-1"
                style={{
                  background: "var(--color-teal-dark)",
                  color: "white",
                  border: "none",
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                }}
              >
                <Plus size={13} /> Add to pool
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question pool overlay — Edit Quiz form */}
      {editPoolOverlayOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(28, 15, 0, 0.6)", backdropFilter: "blur(2px)" }}
          onClick={closeEditPoolOverlay}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg p-5 flex flex-col gap-3"
            style={{
              background: "white",
              border: "3px solid var(--color-ink)",
              boxShadow: "8px 8px 0 var(--color-amber)",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <div className="flex items-center justify-between">
              <h3
                className="text-base font-700 flex items-center gap-2"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-ink)",
                }}
              >
                <Plus size={15} /> Add a question
              </h3>
              <button
                onClick={closeEditPoolOverlay}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-ink-muted)",
                }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <p
              className="text-xs"
              style={{
                color: "var(--color-ink-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              Authored questions are saved together with this quiz. A fresh
              empty slot will appear in the pool when you finish.
            </p>

            {eQError && (
              <div
                className="p-2 text-xs"
                style={{
                  background: "#FDECEA",
                  border: "1px solid var(--color-ember)",
                  color: "var(--color-ember-dark)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {eQError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-600 uppercase tracking-wider"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                }}
              >
                Prompt *
              </label>
              <input
                type="text"
                value={eQPrompt}
                onChange={(e) => setEQPrompt(e.target.value)}
                placeholder="e.g. Solve for x: 2x + 6 = 14"
                className="px-3 py-2 text-sm outline-none"
                style={{
                  border: "2px solid var(--color-cream-dark)",
                  fontFamily: "var(--font-body)",
                  color: "var(--color-ink)",
                  borderRadius: 0,
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
                  {eQUploading === "image" ? "Uploading…" : "Choose image…"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleEQImageUpload(f);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setLibraryOpen({ kind: "image", target: "edit" })}
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
                {eQImageUrl && (
                  <button
                    onClick={() => setEQImageUrl("")}
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
              {eQUploading === "image" && (
                <UploadProgress percent={eQImageProgress} label="Uploading image…" />
              )}
              {eQImageUrl && (
                <div
                  style={{
                    aspectRatio: "16/9",
                    background: "var(--color-cream-dark)",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={eQImageUrl}
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
                <Video size={11} /> Video (optional — plays when a student gets this wrong 3×)
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
                  {eQUploading === "video" ? "Uploading…" : "Choose video…"}
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleEQVideoUpload(f);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setLibraryOpen({ kind: "video", target: "edit" })}
                  disabled={videoAssets.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm"
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
                {eQTrollVideoId && (
                  <button
                    onClick={() => setEQTrollVideoId("")}
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
              {eQUploading === "video" && (
                <UploadProgress percent={eQVideoProgress} label="Uploading video…" />
              )}
              {eQTrollVideoId && (
                <video
                  src={eQTrollVideoId}
                  controls
                  className="w-full"
                  style={{
                    background: "var(--color-ink)",
                    border: "2px solid var(--color-cream-dark)",
                  }}
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-xs font-600 uppercase tracking-wider"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                }}
              >
                Options (exactly 5) *
              </label>
              {eQOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="text-xs font-700 shrink-0"
                    style={{
                      width: 22,
                      color: eQCorrect === i ? "var(--color-ember)" : "var(--color-ink-muted)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const next = [...eQOptions];
                      next[i] = e.target.value;
                      setEQOptions(next);
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="flex-1 px-3 py-2 text-sm outline-none"
                    style={{
                      border: "2px solid var(--color-cream-dark)",
                      fontFamily: "var(--font-body)",
                      color: "var(--color-ink)",
                      borderRadius: 0,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setEQCorrect(i)}
                    className="shrink-0 p-1.5"
                    style={{
                      background: eQCorrect === i ? "var(--color-teal-dark)" : "none",
                      color: eQCorrect === i ? "white" : "var(--color-ink-muted)",
                      border: "2px solid var(--color-teal-dark)",
                      cursor: "pointer",
                    }}
                    title="Mark as correct"
                  >
                    <Check size={12} />
                  </button>
                </div>
              ))}
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
                <Clock size={11} /> Time limit (optional)
              </label>
              <select
                value={eQTimeLimit}
                onChange={(e) => setEQTimeLimit(e.target.value)}
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
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((m) => (
                  <option key={m} value={m}>
                    {m} minute{m !== 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={closeEditPoolOverlay}
                className="px-4 py-2 text-sm font-600"
                style={{
                  background: "none",
                  color: "var(--color-ink-muted)",
                  border: "2px solid var(--color-cream-dark)",
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitEditPoolOverlay}
                className="px-4 py-2 text-sm font-600 flex items-center gap-1"
                style={{
                  background: "var(--color-teal-dark)",
                  color: "white",
                  border: "none",
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                }}
              >
                <Plus size={13} /> Add to pool
              </button>
            </div>
          </div>
        </div>
      )}

      <AssetLibraryModal
        open={libraryOpen !== null}
        onClose={() => setLibraryOpen(null)}
        assets={libraryOpen?.kind === "video" ? videoAssets : imageAssets}
        kind={libraryOpen?.kind ?? "image"}
        onSelect={(url) => {
          if (!libraryOpen) return;
          if (libraryOpen.target === "create") {
            if (libraryOpen.kind === "image") setQImageUrl(url);
            else setQTrollVideoId(url);
          } else {
            if (libraryOpen.kind === "image") setEQImageUrl(url);
            else setEQTrollVideoId(url);
          }
        }}
      />
    </div>
  );
}