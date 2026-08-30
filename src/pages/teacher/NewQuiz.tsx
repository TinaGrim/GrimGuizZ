import { useState, type FormEvent, type ChangeEvent } from "react"
import { Link, useNavigate } from "react-router"
import { useApp } from "../../store/AppContext"
import {
  ImagePlus,
  ArrowLeft,
  Save,
  CheckCircle,
  Plus,
  Trash2,
} from "lucide-react"
import type { Quiz } from "../../data/mockData"

const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2 MB

type DraftQuestion = {
  prompt: string
  options: [string, string, string, string, string]
  correctOptionIndex: number
}

const EMPTY_QUESTION: DraftQuestion = {
  prompt: "",
  options: ["", "", "", "", ""],
  correctOptionIndex: 0,
}

export default function NewQuiz() {
  const navigate = useNavigate()
  const { lessons, addQuizWithQuestions } = useApp()

  const [title, setTitle] = useState("")
  const [lessonId, setLessonId] = useState<string>("")
  const [status, setStatus] = useState<Quiz["status"]>("active")
  const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null)
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    { ...EMPTY_QUESTION },
  ])

  const [imageError, setImageError] = useState("")
  const [saved, setSaved] = useState(false)

  const updateQuestion = (idx: number, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    )
  }

  const updateOption = (idx: number, optionIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === idx
          ? {
              ...q,
              options: q.options.map((opt, oi) =>
                oi === optionIdx ? value : opt,
              ) as DraftQuestion["options"],
            }
          : q,
      ),
    )
  }

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { ...EMPTY_QUESTION }])
  }

  const removeQuestion = (idx: number) => {
    setQuestions((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx),
    )
  }

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setImageError("")
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file.")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Image is too large. Please keep it under 2 MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCoverDataUrl(reader.result as string)
    }
    reader.onerror = () => {
      setImageError("Could not read that image. Try another one.")
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const cleanQuestions = questions
      .map((q) => ({
        ...q,
        prompt: q.prompt.trim(),
        options: q.options.map((o) => o.trim()) as DraftQuestion["options"],
      }))
      .filter(
        (q) => q.prompt.length > 0 && q.options.every((o) => o.length > 0),
      )

    if (!title.trim() || cleanQuestions.length === 0) return

    addQuizWithQuestions({
      title: title.trim(),
      lessonId: lessonId || null,
      coverImageDataUrl: coverDataUrl,
      status,
      questions: cleanQuestions,
    })

    setSaved(true)
    setTimeout(() => navigate("/teacher"), 1200)
  }

  const hasValidQuestion = questions.some(
    (q) =>
      q.prompt.trim().length > 0 && q.options.every((o) => o.trim().length > 0),
  )

  const canSave = title.trim().length > 0 && hasValidQuestion

  const LESSON_OPTIONS = [
    { id: "", label: "No category (your own quiz)" },
  ].concat(lessons.map((l) => ({ id: l.id, label: l.title })))

  const LETTERS = ["A", "B", "C", "D", "E"]

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream)" }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
        style={{
          background: "var(--color-ink)",
          borderBottom: "2px solid var(--color-ember)",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-xl font-900"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-amber)",
            }}
          >
            QuizZ
          </span>
          <span
            className="text-sm"
            style={{
              color: "rgba(255,255,255,0.4)",
              fontFamily: "var(--font-body)",
            }}
          >
            New Quiz
          </span>
        </div>
        <Link
          to="/teacher"
          className="flex items-center gap-1.5 text-sm"
          style={{
            color: "rgba(255,255,255,0.4)",
            fontFamily: "var(--font-body)",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1
          className="font-900 text-3xl mb-1"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-ink)",
          }}
        >
          Create a New Quiz
        </h1>
        <p
          className="mb-8 text-sm"
          style={{
            color: "var(--color-ink-muted)",
            fontFamily: "var(--font-body)",
          }}
        >
          Build your own math or physics quiz. Add a name, pick a lesson (or
          none), and write at least one question with 5 answer options.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Title */}
          <div>
            <label
              className="block text-sm font-600 mb-2"
              style={{
                color: "var(--color-ink)",
                fontFamily: "var(--font-body)",
              }}
            >
              Quiz name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Foundation Math — Multiplication"
              className="w-full px-4 py-3 outline-none"
              style={{
                border: "2px solid var(--color-ink)",
                background: "white",
                fontFamily: "var(--font-body)",
                color: "var(--color-ink)",
                boxShadow: "3px 3px 0 var(--color-ink)",
              }}
            />
          </div>

          {/* Lesson (optional) */}
          <div>
            <label
              className="block text-sm font-600 mb-2"
              style={{
                color: "var(--color-ink)",
                fontFamily: "var(--font-body)",
              }}
            >
              Lesson / category{" "}
              <span style={{ color: "var(--color-ink-muted)" }}>
                (optional)
              </span>
            </label>
            <select
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
              className="w-full px-4 py-3 outline-none"
              style={{
                border: "2px solid var(--color-ink)",
                background: "white",
                fontFamily: "var(--font-body)",
                color: "var(--color-ink)",
                boxShadow: "3px 3px 0 var(--color-ink)",
              }}
            >
              {LESSON_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label
              className="block text-sm font-600 mb-2"
              style={{
                color: "var(--color-ink)",
                fontFamily: "var(--font-body)",
              }}
            >
              Status
            </label>
            <div className="flex gap-3">
              {(["active", "draft"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-500"
                  style={{
                    background: status === s ? "var(--color-ember)" : "white",
                    color: status === s ? "#fff" : "var(--color-ink)",
                    border: "2px solid var(--color-ink)",
                    boxShadow:
                      status === s ? "3px 3px 0 var(--color-ink)" : "none",
                    fontFamily: "var(--font-body)",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {s === "active" ? "Available (active)" : "Draft"}
                </button>
              ))}
            </div>
          </div>

          {/* Cover image upload */}
          <div>
            <label
              className="block text-sm font-600 mb-2"
              style={{
                color: "var(--color-ink)",
                fontFamily: "var(--font-body)",
              }}
            >
              Cover image (optional)
            </label>
            {coverDataUrl ? (
              <div className="relative mb-3">
                <img
                  src={coverDataUrl}
                  alt="Quiz cover preview"
                  className="w-full object-cover"
                  style={{
                    height: 180,
                    display: "block",
                    border: "2px solid var(--color-ink)",
                    boxShadow: "3px 3px 0 var(--color-ink)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setCoverDataUrl(null)}
                  className="absolute top-2 right-2 px-3 py-1 text-xs font-600"
                  style={{
                    background: "var(--color-ink)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center gap-2 p-8 text-center cursor-pointer"
                style={{
                  border: "2px dashed var(--color-cream-dark)",
                  background: "rgba(0,0,0,0.02)",
                }}
              >
                <ImagePlus
                  size={28}
                  style={{ color: "var(--color-ink-muted)" }}
                />
                <span
                  className="text-sm font-500"
                  style={{
                    color: "var(--color-ink)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Upload an image from your device
                </span>
                <span
                  className="text-xs"
                  style={{
                    color: "var(--color-ink-muted)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  PNG or JPG, under 2 MB
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
            {imageError && (
              <p
                className="mt-2 text-sm"
                style={{
                  color: "var(--color-danger)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {imageError}
              </p>
            )}
          </div>

          {/* Questions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label
                className="block text-sm font-600"
                style={{
                  color: "var(--color-ink)",
                  fontFamily: "var(--font-body)",
                }}
              >
                Questions{" "}
                <span style={{ color: "var(--color-ink-muted)" }}>
                  (at least one)
                </span>
              </label>
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600"
                style={{
                  background: "var(--color-ink)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                }}
              >
                <Plus size={14} />
                Add question
              </button>
            </div>

            <div className="flex flex-col gap-5">
              {questions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="p-4"
                  style={{
                    background: "white",
                    border: "2px solid var(--color-cream-dark)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-xs font-700"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "var(--color-ember)",
                      }}
                    >
                      Question {qIdx + 1}
                    </span>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIdx)}
                        className="flex items-center gap-1 text-xs"
                        style={{
                          color: "var(--color-danger)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={q.prompt}
                    onChange={(e) =>
                      updateQuestion(qIdx, { prompt: e.target.value })
                    }
                    placeholder="Question prompt (e.g. What is 7 x 8?)"
                    className="w-full px-3 py-2 mb-3 outline-none text-sm"
                    style={{
                      border: "2px solid var(--color-cream-dark)",
                      background: "var(--color-cream)",
                      fontFamily: "var(--font-body)",
                      color: "var(--color-ink)",
                    }}
                  />

                  <div className="flex flex-col gap-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <span
                          className="w-5 text-xs font-700"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: "var(--color-ink-muted)",
                          }}
                        >
                          {LETTERS[oi]}
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) =>
                            updateOption(qIdx, oi, e.target.value)
                          }
                          placeholder={`Option ${LETTERS[oi]}`}
                          className="flex-1 px-3 py-2 outline-none text-sm"
                          style={{
                            border: "2px solid var(--color-cream-dark)",
                            background: "var(--color-cream)",
                            fontFamily: "var(--font-body)",
                            color: "var(--color-ink)",
                          }}
                        />
                        <label
                          className="flex items-center gap-1.5 text-xs shrink-0"
                          style={{
                            fontFamily: "var(--font-body)",
                            color: "var(--color-ink-muted)",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={q.correctOptionIndex === oi}
                            onChange={() =>
                              updateQuestion(qIdx, { correctOptionIndex: oi })
                            }
                          />
                          Correct
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            type="submit"
            disabled={!canSave}
            className="flex items-center justify-center gap-2 w-full py-3.5 text-base font-700"
            style={{
              background: canSave
                ? "var(--color-ember)"
                : "var(--color-cream-dark)",
              color: canSave ? "#fff" : "var(--color-ink-muted)",
              border: "2px solid var(--color-ink)",
              boxShadow: canSave ? "4px 4px 0 var(--color-ink)" : "none",
              fontFamily: "var(--font-body)",
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            {saved ? <CheckCircle size={18} /> : <Save size={18} />}
            {saved ? "Quiz created!" : "Create quiz"}
          </button>
        </form>
      </div>
    </div>
  )
}
