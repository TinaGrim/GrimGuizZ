import { useState } from "react";
import { useApp } from "../../store/AppContext";
import { Plus, Trash2, MessageSquare, Check, X, UserPlus, BookOpen } from "lucide-react";

export default function AdminStudents() {
  const {
    students,
    quizzes,
    addStudent,
    deleteStudent,
    assignQuiz,
    unassignQuiz,
    sendMessage,
    getAttemptsForStudent,
    getBestScoreForQuiz,
  } = useApp();

  const [newName, setNewName] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageSent, setMessageSent] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (students.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    addStudent(trimmed);
    setNewName("");
    setShowAddForm(false);
  };

  const handleSendMessage = (studentId: string) => {
    if (!messageText.trim()) return;
    sendMessage(studentId, messageText.trim());
    setMessageText("");
    setMessageSent(true);
    setTimeout(() => setMessageSent(false), 2000);
  };

  const selected = students.find((s) => s.id === selectedStudent);

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="font-900 text-3xl mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Students
          </h1>
          <p className="text-sm" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
            {students.length} registered student{students.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
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

      {/* Add student form */}
      {showAddForm && (
        <div
          className="flex gap-3 p-4 mb-6 animate-slide-up"
          style={{ background: "white", border: "2px solid var(--color-ink)", boxShadow: "4px 4px 0 var(--color-amber)" }}
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
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-ink)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-cream-dark)"; }}
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-600"
            style={{
              background: "var(--color-teal)",
              color: "#fff",
              border: "none",
              cursor: newName.trim() ? "pointer" : "not-allowed",
              fontFamily: "var(--font-body)",
              opacity: newName.trim() ? 1 : 0.5,
            }}
          >
            <Plus size={14} /> Add
          </button>
          <button
            onClick={() => { setShowAddForm(false); setNewName(""); }}
            className="px-3 py-2"
            style={{ background: "var(--color-cream-dark)", border: "none", cursor: "pointer", color: "var(--color-ink-muted)" }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Student list */}
        <div className="lg:col-span-2">
          <div className="flex flex-col gap-2">
            {students.map((student) => {
              const sAttempts = getAttemptsForStudent(student.id);
              const isSelected = selectedStudent === student.id;
              return (
                <div
                  key={student.id}
                  onClick={() => { setSelectedStudent(student.id); setMessageText(student.adminMessage?.text ?? ""); setMessageSent(false); }}
                  className="flex items-center justify-between p-3.5 cursor-pointer"
                  style={{
                    background: isSelected ? "var(--color-ink)" : "white",
                    border: isSelected ? "2px solid var(--color-amber)" : "2px solid var(--color-cream-dark)",
                    boxShadow: isSelected ? "3px 3px 0 var(--color-amber-dark)" : "1px 1px 0 var(--color-cream-dark)",
                    transition: "all 0.15s",
                  }}
                >
                  <div>
                    <p
                      className="text-sm font-600"
                      style={{
                        fontFamily: "var(--font-body)",
                        color: isSelected ? "var(--color-amber)" : "var(--color-ink)",
                      }}
                    >
                      {student.name}
                    </p>
                    <p
                      className="text-xs"
                      style={{
                        color: isSelected ? "rgba(255,255,255,0.4)" : "var(--color-ink-muted)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {student.assignedQuizIds.length} quiz{student.assignedQuizIds.length !== 1 ? "zes" : ""} · {sAttempts.length} attempt{sAttempts.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteStudent(student.id); if (isSelected) setSelectedStudent(null); }}
                    className="p-1.5"
                    style={{
                      color: isSelected ? "rgba(255,255,255,0.3)" : "var(--color-ink-muted)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      opacity: 0.5,
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-danger)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.5"; (e.currentTarget as HTMLButtonElement).style.color = ""; }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Student detail panel */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              style={{ border: "2px dashed var(--color-cream-dark)" }}
            >
              <p className="text-sm" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}>
                Select a student to manage their quizzes and messages.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Header */}
              <div
                className="p-5"
                style={{ background: "var(--color-ink)", border: "2px solid var(--color-ember)", boxShadow: "4px 4px 0 var(--color-ember-dark)" }}
              >
                <h2
                  className="text-xl font-900"
                  style={{ fontFamily: "var(--font-display)", color: "var(--color-amber)" }}
                >
                  {selected.name}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-mono)" }}>
                  Added {selected.createdAt}
                </p>
              </div>

              {/* Quiz assignment */}
              <div className="p-5" style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}>
                <h3
                  className="text-sm font-700 mb-3 flex items-center gap-2"
                  style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
                >
                  <BookOpen size={15} /> Quiz Assignment
                </h3>
                <div className="flex flex-col gap-2">
                  {quizzes.map((quiz) => {
                    const assigned = selected.assignedQuizIds.includes(quiz.id);
                    const best = getBestScoreForQuiz(selected.id, quiz.id);
                    return (
                      <div
                        key={quiz.id}
                        className="flex items-center justify-between px-3 py-2.5"
                        style={{
                          background: assigned ? "#EEF8EF" : "var(--color-cream)",
                          border: `1px solid ${assigned ? "var(--color-success)" : "var(--color-cream-dark)"}`,
                        }}
                      >
                        <div>
                          <p className="text-sm font-500" style={{ fontFamily: "var(--font-body)", color: "var(--color-ink)" }}>
                            {quiz.title}
                          </p>
                          {best !== null && (
                            <p className="text-xs" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}>
                              Best: {Math.round(best * 100)}%
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => assigned ? unassignQuiz(selected.id, quiz.id) : assignQuiz(selected.id, quiz.id)}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 font-600"
                          style={{
                            background: assigned ? "var(--color-success)" : "var(--color-teal)",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "var(--font-body)",
                          }}
                        >
                          {assigned ? <><Check size={11} /> Assigned</> : <><Plus size={11} /> Assign</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div className="p-5" style={{ background: "white", border: "2px solid var(--color-cream-dark)" }}>
                <h3
                  className="text-sm font-700 mb-3 flex items-center gap-2"
                  style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
                >
                  <MessageSquare size={15} /> Personal Message
                </h3>
                {selected.adminMessage && (
                  <div
                    className="px-3 py-2 mb-3 text-xs"
                    style={{
                      background: "var(--color-cream)",
                      borderLeft: "3px solid var(--color-amber)",
                      color: "var(--color-ink-light)",
                      fontFamily: "var(--font-body)",
                      fontStyle: "italic",
                    }}
                  >
                    Current: &ldquo;{selected.adminMessage.text.slice(0, 80)}{selected.adminMessage.text.length > 80 ? "…" : ""}&rdquo;
                  </div>
                )}
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Write a personal note — visible only to this student on their quiz list."
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm outline-none resize-none mb-3"
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
                <button
                  onClick={() => handleSendMessage(selected.id)}
                  disabled={!messageText.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-600"
                  style={{
                    background: messageSent ? "var(--color-success)" : "var(--color-teal)",
                    color: "#fff",
                    border: "none",
                    cursor: messageText.trim() ? "pointer" : "not-allowed",
                    fontFamily: "var(--font-body)",
                    opacity: messageText.trim() ? 1 : 0.5,
                    transition: "background 0.2s",
                  }}
                >
                  {messageSent ? <><Check size={14} /> Sent!</> : <><MessageSquare size={14} /> Send Message</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
