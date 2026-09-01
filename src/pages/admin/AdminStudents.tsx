import { useState } from "react";
import { useApp } from "../../store/AppContext";
import { Teacher } from "../../api/client";
import { useConfirm } from "../../components/ConfirmDialog";
import { Plus, Trash2, MessageSquare, Check, X, UserPlus, BookOpen } from "lucide-react";
import type { Student } from "../../data/types";
import { Hoverable } from "../../components/AdminHoverable";

export default function AdminStudents() {
  const {
    students,
    quizzes,
    refreshStudents,
  } = useApp();
  const { confirm } = useConfirm();
  const [newName, setNewName] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageSent, setMessageSent] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    try {
      await Teacher.createStudent({ name: trimmed });
      await refreshStudents();
      setNewName("");
      setShowAddForm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete this student?",
      message:
        "Their attempt history and teacher messages will also be removed. This can't be undone.",
      confirmLabel: "Delete student",
    });
    if (!ok) return;
    try {
      await Teacher.deleteStudent(id);
      if (selectedStudent === id) setSelectedStudent(null);
      await refreshStudents();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleAssign = async (studentId: string, quizId: string, currentlyAssigned: boolean) => {
    try {
      if (currentlyAssigned) {
        await Teacher.unassignOne(studentId, quizId);
      } else {
        await Teacher.assignOne(studentId, quizId);
      }
      await refreshStudents();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleSendMessage = async (studentId: string) => {
    if (!messageText.trim()) return;
    setBusy(true);
    try {
      await Teacher.sendMessage(studentId, messageText.trim());
      setMessageText("");
      setMessageSent(true);
      setTimeout(() => setMessageSent(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const selected: Student | undefined = students.find((s) => s.id === selectedStudent);

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="font-900 text-3xl mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Students
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
          >
            {students.length} registered student{students.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm((v) => !v);
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
            (e.currentTarget as HTMLButtonElement).style.transform = "translate(-1px,-1px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "5px 5px 0 var(--color-ink)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "none";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "3px 3px 0 var(--color-ink)";
          }}
        >
          <UserPlus size={15} />
          Add Student
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

      {showAddForm && (
        <div
          className="flex gap-3 p-4 mb-6 animate-slide-up"
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
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Student full name"
            autoFocus
            className="flex-1 px-3 py-2 text-sm outline-none"
            style={{
              border: "2px solid var(--color-cream-dark)",
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
            onClick={handleAdd}
            disabled={!newName.trim() || busy}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-600"
            style={{
              background: "var(--color-teal-dark)",
              color: "#fff",
              border: "none",
              cursor: newName.trim() && !busy ? "pointer" : "not-allowed",
              fontFamily: "var(--font-body)",
              opacity: newName.trim() && !busy ? 1 : 0.5,
            }}
          >
            <Plus size={14} /> {busy ? "Saving…" : "Add"}
          </button>
          <button
            onClick={() => {
              setShowAddForm(false);
              setNewName("");
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="flex flex-col gap-2">
            {students.length === 0 ? (
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
                  No students yet. Add one to get started.
                </p>
              </div>
            ) : (
              students.map((student) => {
                const isSelected = selectedStudent === student.id;
                // Selected row keeps its custom ink/amber treatment (intentional
                // emphasis, not just a hover). Unselected rows use <Hoverable>
                // so they pick up the standard lift-on-hover affordance.
                if (isSelected) {
                  return (
                    <div
                      key={student.id}
                      onClick={() => {
                        setSelectedStudent(student.id);
                        setMessageText("");
                        setMessageSent(false);
                      }}
                      className="flex items-center justify-between p-3.5 cursor-pointer"
                      style={{
                        background: "var(--color-ink)",
                        border: "2px solid var(--color-amber)",
                        boxShadow: "3px 3px 0 var(--color-amber-dark)",
                        transition: "all 0.15s",
                      }}
                    >
                      <div>
                        <p
                          className="text-sm font-600"
                          style={{
                            fontFamily: "var(--font-body)",
                            color: "var(--color-amber)",
                          }}
                        >
                          {student.name}
                        </p>
                        <p
                          className="text-xs"
                          style={{
                            color: "rgba(255,255,255,0.4)",
                            fontFamily: "var(--font-body)",
                          }}
                        >
                          {student.assignedQuizIds.length} quiz
                          {student.assignedQuizIds.length !== 1 ? "zes" : ""}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(student.id);
                        }}
                        className="p-1.5"
                        style={{
                          color: "rgba(255,255,255,0.3)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          opacity: 0.5,
                          transition: "opacity 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "var(--color-ember)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.opacity = "0.5";
                          (e.currentTarget as HTMLButtonElement).style.color = "";
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                }
                return (
                  <Hoverable
                    key={student.id}
                    restBorderColor="var(--color-cream-dark)"
                    restShadow="1px 1px 0 var(--color-cream-dark)"
                    onClick={() => {
                      setSelectedStudent(student.id);
                      setMessageText("");
                      setMessageSent(false);
                    }}
                    className="flex items-center justify-between p-3.5"
                    style={{
                      background: "white",
                      border: "2px solid var(--color-cream-dark)",
                    }}
                  >
                    <div>
                      <p
                        className="text-sm font-600"
                        style={{
                          fontFamily: "var(--font-body)",
                          color: "var(--color-ink)",
                        }}
                      >
                        {student.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{
                          color: "var(--color-ink-muted)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {student.assignedQuizIds.length} quiz
                        {student.assignedQuizIds.length !== 1 ? "zes" : ""}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(student.id);
                      }}
                      className="p-1.5"
                      style={{
                        color: "var(--color-ink-muted)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        opacity: 0.5,
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "var(--color-ember)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.opacity = "0.5";
                        (e.currentTarget as HTMLButtonElement).style.color = "";
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </Hoverable>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          {!selected ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              style={{ border: "2px dashed var(--color-cream-dark)" }}
            >
              <p
                className="text-sm"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                Select a student to manage their quizzes and messages.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div
                className="p-5"
                style={{
                  background: "var(--color-ink)",
                  border: "2px solid var(--color-ember)",
                  boxShadow: "4px 4px 0 var(--color-ember-dark)",
                }}
              >
                <h2
                  className="text-xl font-900"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--color-amber)",
                  }}
                >
                  {selected.name}
                </h2>
                <p
                  className="text-xs mt-0.5"
                  style={{
                    color: "rgba(255,255,255,0.35)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Added {selected.createdAt?.split("T")[0] ?? selected.createdAt}
                </p>
              </div>

              <div
                className="p-5"
                style={{
                  background: "white",
                  border: "2px solid var(--color-cream-dark)",
                }}
              >
                <h3
                  className="text-sm font-700 mb-3 flex items-center gap-2"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--color-ink)",
                  }}
                >
                  <BookOpen size={15} /> Quiz Assignment
                </h3>
                <div className="flex flex-col gap-2">
                  {quizzes.length === 0 && (
                    <p
                      className="text-sm"
                      style={{
                        color: "var(--color-ink-muted)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      No quizzes yet — create one first.
                    </p>
                  )}
                  {quizzes.map((quiz) => {
                    const assigned = selected.assignedQuizIds.includes(quiz.id);
                    return (
                      <div
                        key={quiz.id}
                        className="flex items-center justify-between px-3 py-2.5"
                        style={{
                          background: assigned
                            ? "var(--color-cream)"
                            : "white",
                          border: `1px solid ${assigned ? "var(--color-teal-dark)" : "var(--color-cream-dark)"}`,
                        }}
                      >
                        <div>
                          <p
                            className="text-sm font-500"
                            style={{
                              fontFamily: "var(--font-body)",
                              color: "var(--color-ink)",
                            }}
                          >
                            {quiz.title}
                          </p>
                          <p
                            className="text-xs"
                            style={{
                              color: "var(--color-ink-muted)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {quiz.status}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAssign(selected.id, quiz.id, assigned)}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 font-600"
                          style={{
                            background: assigned
                              ? "var(--color-teal-dark)"
                              : "var(--color-ember)",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "var(--font-body)",
                          }}
                        >
                          {assigned ? (
                            <>
                              <Check size={11} /> Assigned
                            </>
                          ) : (
                            <>
                              <Plus size={11} /> Assign
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                className="p-5"
                style={{
                  background: "white",
                  border: "2px solid var(--color-cream-dark)",
                }}
              >
                <h3
                  className="text-sm font-700 mb-3 flex items-center gap-2"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--color-ink)",
                  }}
                >
                  <MessageSquare size={15} /> Send Message
                </h3>
                <p
                  className="text-xs mb-3"
                  style={{
                    color: "var(--color-ink-muted)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Messages are appended — the student sees your full history on their dashboard.
                </p>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Write a note…"
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm outline-none resize-none mb-3"
                  style={{
                    border: "2px solid var(--color-cream-dark)",
                    fontFamily: "var(--font-body)",
                    color: "var(--color-ink)",
                    borderRadius: 0,
                    lineHeight: 1.6,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-ink)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-cream-dark)";
                  }}
                />
                <button
                  onClick={() => handleSendMessage(selected.id)}
                  disabled={!messageText.trim() || busy}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-600"
                  style={{
                    background: messageSent ? "var(--color-teal-dark)" : "var(--color-ember)",
                    color: "#fff",
                    border: "none",
                    cursor: messageText.trim() && !busy ? "pointer" : "not-allowed",
                    fontFamily: "var(--font-body)",
                    opacity: messageText.trim() && !busy ? 1 : 0.5,
                    transition: "background 0.2s",
                  }}
                >
                  {messageSent ? (
                    <>
                      <Check size={14} /> Sent!
                    </>
                  ) : (
                    <>
                      <MessageSquare size={14} /> Send Message
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}