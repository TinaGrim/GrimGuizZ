import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../../store/AppContext";
import { Lock, ArrowLeft } from "lucide-react";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { adminLogin } = useApp();
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      const ok = adminLogin(username, password);
      setLoading(false);
      if (ok) {
        navigate("/admin/panel/dashboard");
      } else {
        setError("Wrong credentials. Hint: admin / password123");
      }
    }, 500);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-ink)" }}
    >
      {/* Stripe */}
      <div
        className="h-2 shrink-0"
        style={{
          background:
            "repeating-linear-gradient(90deg, #D94F1E 0px, #D94F1E 30px, #F0A500 30px, #F0A500 60px, #0D6E6E 60px, #0D6E6E 90px)",
        }}
      />

      {/* Memphis shapes */}
      <div className="absolute top-20 right-20 opacity-5" style={{ width: 200, height: 200, border: "3px solid var(--color-amber)", borderRadius: "50%" }} />
      <div className="absolute bottom-32 left-16 opacity-5" style={{ width: 80, height: 80, background: "var(--color-ember)", transform: "rotate(25deg)" }} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        {/* Back link */}
        <div className="w-full max-w-sm mb-8">
          <a
            href="/"
            className="flex items-center gap-1.5 text-sm font-500"
            style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)" }}
          >
            <ArrowLeft size={14} />
            Student login
          </a>
        </div>

        <div className="w-full max-w-sm">
          {/* Logo mark */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="flex items-center justify-center"
              style={{
                width: 48,
                height: 48,
                background: "var(--color-ember)",
                border: "2px solid rgba(255,255,255,0.1)",
              }}
            >
              <Lock size={22} color="#fff" />
            </div>
            <div>
              <h1
                className="text-2xl font-900 leading-tight"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-amber)" }}
              >
                Admin Panel
              </h1>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-body)" }}>
                QuizWheel — ITC Platform
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-600 uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                placeholder="admin"
                autoFocus
                className="w-full px-4 py-3 text-base outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "2px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontFamily: "var(--font-body)",
                  borderRadius: 0,
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-amber)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-600 uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                className="w-full px-4 py-3 text-base outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "2px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontFamily: "var(--font-body)",
                  borderRadius: 0,
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-amber)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              />
            </div>

            {error && (
              <p className="text-sm animate-slide-up" style={{ color: "#ff8080", fontFamily: "var(--font-body)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!username || !password || loading}
              className="w-full py-3.5 text-base font-700 mt-2"
              style={{
                background: !username || !password || loading ? "rgba(255,255,255,0.1)" : "var(--color-ember)",
                color: !username || !password || loading ? "rgba(255,255,255,0.3)" : "#fff",
                border: "2px solid var(--color-ember)",
                fontFamily: "var(--font-body)",
                cursor: !username || !password || loading ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                letterSpacing: "0.02em",
                boxShadow: !username || !password || loading ? "none" : "4px 4px 0 var(--color-ember-dark)",
              }}
            >
              {loading ? "Checking…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
