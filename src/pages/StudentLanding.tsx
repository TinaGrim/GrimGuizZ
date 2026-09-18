import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../store/AppContext";
import { ArrowRight } from "lucide-react";

export default function StudentLanding() {
  const [name, setName] = useState(() => localStorage.getItem("quizz.lastStudentName") ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginStudent, lastStudentName, clearLastStudentName } = useApp();
  const navigate = useNavigate();

  const savedName = lastStudentName.trim();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const student = await loginStudent(name);
      if (student) {
        navigate("/quizzes");
      } else {
        setError("We don't have any quizzes for that name yet. Check back soon — or double-check the spelling.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleNotYou = () => {
    clearLastStudentName();
    setName("");
    setError("");
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-cream)" }}
    >
      <div
        className="h-3 w-full shrink-0"
        style={{
          background:
            "repeating-linear-gradient(90deg, #D94F1E 0px, #D94F1E 40px, #F0A500 40px, #F0A500 80px, #0D6E6E 80px, #0D6E6E 120px, #1C0F00 120px, #1C0F00 140px)",
        }}
      />

      <div className="flex flex-1 flex-col lg:flex-row">
        <div
          className="relative flex flex-col justify-between p-10 lg:p-16 lg:w-1/2"
          style={{ background: "var(--color-ink)" }}
        >
          <div
            className="absolute top-12 right-12 opacity-10"
            style={{
              width: 120,
              height: 120,
              border: "3px solid var(--color-amber)",
              borderRadius: "50%",
            }}
          />
          <div
            className="absolute bottom-24 left-8 opacity-8"
            style={{
              width: 60,
              height: 60,
              background: "var(--color-ember)",
              transform: "rotate(15deg)",
            }}
          />
          <div
            className="absolute bottom-40 right-20 opacity-10"
            style={{
              width: 0,
              height: 0,
              borderLeft: "35px solid transparent",
              borderRight: "35px solid transparent",
              borderBottom: "60px solid var(--color-teal)",
            }}
          />

          <div className="relative z-10 my-auto">
            <h1
              className="font-900 leading-none mb-6"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(3.5rem, 7vw, 5.5rem)",
                color: "var(--color-amber)",
                letterSpacing: "-0.02em",
              }}
            >
              Quiz<span style={{ fontSize: "1.2em", lineHeight: 1 }}>Z</span>
            </h1>
            <p
              className="text-lg leading-relaxed max-w-sm"
              style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-body)" }}
            >
              Spin the wheel. Get your questions. Prove what you know — or get
              acquainted with the troll video.
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center p-10 lg:p-16">
          <div className="w-full max-w-sm">
            <h2
              className="text-3xl font-700 mb-2"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
            >
              Enter your name
            </h2>
            <p
              className="mb-6 text-base"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
            >
              {savedName
                ? `Welcome back, ${savedName}! Just hit "See my quizzes" to jump in.`
                : "Your teacher has set up your quizzes. Just type the name they have on file — case doesn't matter."}
            </p>

            {savedName && (
              <button
                type="button"
                onClick={handleNotYou}
                className="text-xs mb-4 underline underline-offset-2"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                Not {savedName}?
              </button>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  placeholder="e.g. jamie chen"
                  autoFocus
                  className="w-full text-lg px-4 py-3 outline-none"
                  style={{
                    border: "2px solid var(--color-ink)",
                    background: "white",
                    fontFamily: "var(--font-body)",
                    color: "var(--color-ink)",
                    borderRadius: 0,
                    boxShadow: "4px 4px 0 var(--color-ink)",
                    transition: "box-shadow 0.15s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = "6px 6px 0 var(--color-ember)";
                    e.currentTarget.style.borderColor = "var(--color-ember)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "4px 4px 0 var(--color-ink)";
                    e.currentTarget.style.borderColor = "var(--color-ink)";
                  }}
                />
                {error && (
                  <p
                    className="mt-2 text-sm animate-slide-up"
                    style={{
                      color: "var(--color-ink-light)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!name.trim() || loading}
                className="flex items-center justify-center gap-2 w-full py-3.5 text-base font-600"
                style={{
                  background:
                    !name.trim() || loading
                      ? "var(--color-ink-muted)"
                      : "var(--color-ember)",
                  color: "#fff",
                  border: "2px solid var(--color-ink)",
                  borderRadius: 0,
                  boxShadow:
                    !name.trim() || loading ? "none" : "4px 4px 0 var(--color-ink)",
                  fontFamily: "var(--font-body)",
                  cursor: !name.trim() || loading ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={(e) => {
                  if (name.trim() && !loading) {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translate(-2px, -2px)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "6px 6px 0 var(--color-ink)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "none";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    name.trim() && !loading ? "4px 4px 0 var(--color-ink)" : "none";
                }}
              >
                {loading ? "Checking…" : "See my quizzes"}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div
        className="relative shrink-0"
        style={{ background: "var(--color-ink)" }}
      >
        <div
          className="absolute top-6 left-1/4 opacity-8"
          style={{
            width: 48,
            height: 48,
            background: "var(--color-ember)",
            transform: "rotate(15deg)",
          }}
        />
        <div
          className="absolute top-5 right-1/4 opacity-10"
          style={{
            width: 0,
            height: 0,
            borderLeft: "26px solid transparent",
            borderRight: "26px solid transparent",
            borderBottom: "44px solid var(--color-teal)",
          }}
        />
        <div
          className="absolute bottom-6 right-12 opacity-10"
          style={{
            width: 88,
            height: 88,
            border: "3px solid var(--color-amber)",
            borderRadius: "50%",
          }}
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-10 py-6 lg:px-16">
          <div className="flex flex-wrap gap-2">
            {[
              "Spin to pick questions",
              "3 attempts per question",
              "Math & Physics",
              "Instant feedback",
            ].map((f) => (
              <span
                key={f}
                className="text-xs px-3 py-1.5 font-500"
                style={{
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {f}
              </span>
            ))}
          </div>

          <a
            href="/admin"
            className="text-xs font-500 underline underline-offset-2 opacity-30 hover:opacity-60 transition-opacity"
            style={{ color: "#fff", fontFamily: "var(--font-body)" }}
          >
            Teacher login →
          </a>
        </div>
      </div>
    </div>
  );
}