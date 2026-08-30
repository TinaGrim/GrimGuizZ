import { useState, type FormEvent } from "react"
import { Link } from "react-router"
import { useApp } from "../../store/AppContext"
import {
  BookMarked,
  Plus,
  Send,
  ArrowLeft,
  ImageOff,
  Search,
} from "lucide-react"
import type { Quiz } from "../../data/mockData"

export default function TeacherDashboard() {
  const { quizzes, students, addMessage, getLessonForQuiz } = useApp()

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  )
  const [messageText, setMessageText] = useState("")
  const [sent, setSent] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | Quiz["status"]>(
    "all",
  )

  const selectedStudent = students.find((s) => s.id === selectedStudentId)

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch =
      search.trim() === "" ||
      quiz.title.toLowerCase().includes(search.trim().toLowerCase())
    const matchesStatus = statusFilter === "all" || quiz.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleSend = (e: FormEvent) => {
    e.preventDefault()
    if (!selectedStudentId || !messageText.trim()) return
    addMessage(selectedStudentId, messageText.trim())
    setMessageText("")
    setSent(true)
    setTimeout(() => setSent(false), 2000)
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--color-cream)" }}
    >
      {/* Sidebar */}
      <nav
        className="w-60 shrink-0 flex flex-col"
        style={{
          background: "var(--color-ink)",
          borderRight: "2px solid var(--color-ember)",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div
          className="h-2 w-full"
          style={{
            background:
              "repeating-linear-gradient(90deg, #D94F1E 0px, #D94F1E 20px, #F0A500 20px, #F0A500 40px, #0D6E6E 40px, #0D6E6E 60px)",
          }}
        />

        <div className="px-5 py-5 flex items-center gap-3">
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 36, height: 36, background: "var(--color-ember)" }}
          >
            <BookMarked size={18} color="#fff" />
          </div>
          <div>
            <p
              className="text-base font-900 leading-none"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-amber)",
              }}
            >
              QuizZ
            </p>
            <p
              className="text-xs mt-0.5"
              style={{
                color: "rgba(255,255,255,0.3)",
                fontFamily: "var(--font-body)",
              }}
            >
              Teacher
            </p>
          </div>
        </div>

        <div
          className="mx-5 my-1"
          style={{ height: 1, background: "rgba(255,255,255,0.06)" }}
        />

        <div className="flex-1 px-3 py-4 flex flex-col gap-1">
          <span
            className="text-[10px] font-600 uppercase tracking-widest px-3 mb-1"
            style={{
              color: "rgba(255,255,255,0.25)",
              fontFamily: "var(--font-body)",
            }}
          >
            Quizzes
          </span>
          <Link
            to="/teacher/new-quiz"
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-500"
            style={{
              color: "var(--color-ink)",
              background: "var(--color-amber)",
              fontFamily: "var(--font-body)",
              boxShadow: "2px 2px 0 var(--color-amber-dark)",
            }}
          >
            <Plus size={16} />
            New Quiz
          </Link>
        </div>

        <div className="px-3 pb-5">
          <div
            className="mx-0 mb-3"
            style={{ height: 1, background: "rgba(255,255,255,0.06)" }}
          />
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-500"
            style={{
              color: "rgba(255,255,255,0.4)",
              fontFamily: "var(--font-body)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <ArrowLeft size={16} />
            Back to app
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">
        <h1
          className="text-3xl font-900 mb-1"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-ink)",
          }}
        >
          Teacher Dashboard
        </h1>
        <p
          className="mb-8 text-sm"
          style={{
            color: "var(--color-ink-muted)",
            fontFamily: "var(--font-body)",
          }}
        >
          Manage quizzes and send messages to your students.
        </p>

        {/* Quizzes section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-700"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-ink)",
              }}
            >
              Your Quizzes ({filteredQuizzes.length})
            </h2>
            <Link
              to="/teacher/new-quiz"
              className="flex items-center gap-2 text-sm font-600 px-4 py-2"
              style={{
                background: "var(--color-ember)",
                color: "#fff",
                border: "2px solid var(--color-ink)",
                boxShadow: "3px 3px 0 var(--color-ink)",
                fontFamily: "var(--font-body)",
              }}
            >
              <Plus size={16} />
              New Quiz
            </Link>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div
              className="flex items-center gap-2 px-3 flex-1 min-w-[220px]"
              style={{
                border: "2px solid var(--color-cream-dark)",
                background: "white",
              }}
            >
              <Search size={16} style={{ color: "var(--color-ink-muted)" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by quiz name…"
                className="py-2.5 outline-none flex-1 text-sm"
                style={{
                  background: "transparent",
                  border: "none",
                  fontFamily: "var(--font-body)",
                  color: "var(--color-ink)",
                }}
              />
            </div>
            <div className="flex gap-2">
              {(["all", "active", "draft", "scheduled", "closed"] as const).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className="px-3 py-2 text-xs font-600 capitalize"
                    style={{
                      background:
                        statusFilter === s ? "var(--color-ink)" : "white",
                      color: statusFilter === s ? "#fff" : "var(--color-ink)",
                      border: "2px solid var(--color-ink)",
                      fontFamily: "var(--font-body)",
                      cursor: "pointer",
                    }}
                  >
                    {s}
                  </button>
                ),
              )}
            </div>
          </div>

          {filteredQuizzes.length === 0 ? (
            <p
              className="text-sm"
              style={{
                color: "var(--color-ink-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              No quizzes match your filters.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuizzes.map((quiz) => {
                const lesson = getLessonForQuiz(quiz.id)
                return (
                  <div
                    key={quiz.id}
                    className="overflow-hidden"
                    style={{
                      background: "white",
                      border: "2px solid var(--color-cream-dark)",
                      boxShadow: "3px 3px 0 var(--color-cream-dark)",
                    }}
                  >
                    {/* Cover */}
                    <div
                      className="flex items-center justify-center"
                      style={{
                        height: 120,
                        background: "var(--color-cream-dark)",
                      }}
                    >
                      {quiz.coverImageDataUrl ? (
                        <img
                          src={quiz.coverImageDataUrl}
                          alt={`${quiz.title} cover`}
                          className="w-full h-full object-cover"
                          style={{ display: "block" }}
                        />
                      ) : (
                        <ImageOff
                          size={28}
                          style={{
                            color: "var(--color-ink-muted)",
                            opacity: 0.4,
                          }}
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <p
                        className="font-700 text-base mb-1"
                        style={{
                          fontFamily: "var(--font-display)",
                          color: "var(--color-ink)",
                        }}
                      >
                        {quiz.title}
                      </p>
                      {lesson ? (
                        <p
                          className="text-xs"
                          style={{
                            color: "var(--color-ink-muted)",
                            fontFamily: "var(--font-body)",
                          }}
                        >
                          {lesson.title}
                        </p>
                      ) : (
                        <p
                          className="text-xs"
                          style={{
                            color: "var(--color-ember)",
                            fontFamily: "var(--font-body)",
                          }}
                        >
                          Your own quiz
                        </p>
                      )}
                      <span
                        className="inline-block mt-2 px-2 py-0.5 text-[10px] font-700 uppercase tracking-wide"
                        style={{
                          background:
                            quiz.status === "active"
                              ? "var(--color-emerald)"
                              : "var(--color-cream-dark)",
                          color:
                            quiz.status === "active"
                              ? "#fff"
                              : "var(--color-ink-muted)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {quiz.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Students section */}
        <section>
          <h2
            className="text-lg font-700 mb-4"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-ink)",
            }}
          >
            Students
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Student list */}
            <div className="flex flex-col gap-2">
              {students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => {
                    setSelectedStudentId(student.id)
                    setMessageText("")
                  }}
                  className="flex items-center justify-between p-3 text-left"
                  style={{
                    background:
                      selectedStudentId === student.id
                        ? "white"
                        : "transparent",
                    border:
                      selectedStudentId === student.id
                        ? "2px solid var(--color-ink)"
                        : "2px solid var(--color-cream-dark)",
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center text-sm font-700"
                      style={{
                        width: 34,
                        height: 34,
                        background: "var(--color-ember)",
                        color: "#fff",
                        borderRadius: "50%",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p
                        className="text-sm font-600"
                        style={{ color: "var(--color-ink)" }}
                      >
                        {student.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--color-ink-muted)" }}
                      >
                        {student.messages.length} message
                        {student.messages.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Message composer */}
            <div
              className="p-5"
              style={{
                background: "var(--color-ink)",
                border: "2px solid var(--color-amber)",
                boxShadow: "4px 4px 0 var(--color-amber-dark)",
              }}
            >
              {selectedStudent ? (
                <>
                  <p
                    className="text-sm font-600 mb-1"
                    style={{ fontFamily: "var(--font-display)", color: "#fff" }}
                  >
                    Message {selectedStudent.name}
                  </p>
                  <p
                    className="text-xs mb-4"
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    Latest messages are shown first.
                  </p>

                  {selectedStudent.messages.length > 0 && (
                    <div className="flex flex-col gap-2 mb-4">
                      {selectedStudent.messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className="p-3"
                          style={{ background: "rgba(255,255,255,0.06)" }}
                        >
                          <p
                            className="text-sm"
                            style={{
                              color: "rgba(255,255,255,0.8)",
                              fontFamily: "var(--font-body)",
                            }}
                          >
                            {msg.text}
                          </p>
                          <p
                            className="text-xs mt-1"
                            style={{
                              color: "rgba(255,255,255,0.3)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {new Date(msg.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSend} className="flex flex-col gap-3">
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      rows={3}
                      placeholder="Write an encouraging message…"
                      style={{
                        padding: 12,
                        border: "2px solid var(--color-amber)",
                        background: "white",
                        color: "var(--color-ink)",
                        fontFamily: "var(--font-body)",
                        resize: "vertical",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!messageText.trim()}
                      className="flex items-center justify-center gap-2 py-2.5 text-sm font-600"
                      style={{
                        background: messageText.trim()
                          ? "var(--color-ember)"
                          : "rgba(255,255,255,0.15)",
                        color: messageText.trim()
                          ? "#fff"
                          : "rgba(255,255,255,0.4)",
                        border: "2px solid var(--color-ink)",
                        boxShadow: messageText.trim()
                          ? "3px 3px 0 var(--color-ink)"
                          : "none",
                        fontFamily: "var(--font-body)",
                        cursor: messageText.trim() ? "pointer" : "not-allowed",
                      }}
                    >
                      <Send size={16} />
                      {sent ? "Sent!" : "Send message"}
                    </button>
                  </form>
                </>
              ) : (
                <p
                  className="text-sm"
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Select a student to send them a message.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
