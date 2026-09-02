import { useEffect, useState } from "react";
import { Check, Lock, Shield, User, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useApp } from "../../store/AppContext";
import { Teacher } from "../../api/client";

export default function AdminSecurity() {
  const {
    teacherName,
    teacherUpdateUsername,
    teacherUpdatePassword,
  } = useApp();

  // ─── Username form state ───────────────────────────────────────────────
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [usernameOk, setUsernameOk] = useState(false);
  const [usernameErr, setUsernameErr] = useState("");

  // ─── Password form state ───────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordOk, setPasswordOk] = useState(false);
  const [passwordErr, setPasswordErr] = useState("");

  // Pre-fill the username field with the current value the first time the
  // page loads. We don't reset it on every render — only when the page is
  // first opened or `teacherName` changes (which happens after a save).
  useEffect(() => {
    setUsernameDraft(teacherName);
  }, [teacherName]);

  const handleUsernameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameBusy(true);
    setUsernameOk(false);
    setUsernameErr("");
    const r = await teacherUpdateUsername(usernameDraft);
    setUsernameBusy(false);
    if (r.ok) {
      setUsernameOk(true);
      setUsernameErr("");
    } else {
      setUsernameErr(r.error || "Could not update username");
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPasswordErr("New password and confirmation do not match");
      return;
    }
    setPasswordBusy(true);
    setPasswordOk(false);
    setPasswordErr("");
    const r = await teacherUpdatePassword(currentPw, newPw);
    setPasswordBusy(false);
    if (r.ok) {
      setPasswordOk(true);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPasswordErr("");
    } else {
      setPasswordErr(r.error || "Could not update password");
    }
  };

  // Pull a fresh "me" so the username field reflects the canonical value
  // when the page first mounts (in case teacherName hasn't been loaded
  // yet by the AppContext auto-load effect).
  useEffect(() => {
    if (!teacherName) {
      Teacher.me()
        .then((m) => setUsernameDraft(m.username || m.displayName || ""))
        .catch(() => {});
    }
  }, [teacherName]);

  return (
    <div className="px-3 sm:px-6 md:px-10 py-4 sm:py-6 md:py-8 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Shield size={22} color="var(--color-ember)" />
          <h1
            className="text-3xl font-900 leading-none"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Security
          </h1>
        </div>
        <p
          className="text-sm mt-2"
          style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
        >
          Change your sign-in username and password. These credentials gate
          access to this entire teacher panel.
        </p>
      </div>

      {/* ─── Username card ─────────────────────────────────────────── */}
      <div
        className="mb-6 p-6"
        style={{
          background: "#fff",
          border: "2px solid var(--color-ink)",
          boxShadow: "4px 4px 0 var(--color-ember)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <User size={18} color="var(--color-ember)" />
          <h2
            className="text-xl font-700"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Username
          </h2>
        </div>

        <form onSubmit={handleUsernameSave}>
          <label
            className="block text-xs font-600 uppercase tracking-wider mb-2"
            style={{
              color: "var(--color-ink-muted)",
              fontFamily: "var(--font-body)",
            }}
          >
            Sign-in username
          </label>
          <input
            type="text"
            value={usernameDraft}
            onChange={(e) => {
              setUsernameDraft(e.target.value);
              setUsernameOk(false);
              setUsernameErr("");
            }}
            autoComplete="username"
            spellCheck={false}
            disabled={usernameBusy}
            className="w-full px-3 py-2.5 text-sm outline-none"
            style={{
              border: "2px solid var(--color-ink)",
              background: "var(--color-cream)",
              fontFamily: "var(--font-body)",
              color: "var(--color-ink)",
              borderRadius: 0,
            }}
          />
          <p
            className="text-xs mt-2"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
          >
            Sign-in is case-insensitive — <code>teacher</code>, <code>TEACHER</code>,
            and <code>Teacher</code> all work.
          </p>

          {usernameErr && (
            <div
              className="mt-3 flex items-start gap-2 px-3 py-2 text-sm"
              style={{
                background: "#FBE3D6",
                border: "1px solid var(--color-ember)",
                color: "var(--color-ember-dark)",
                fontFamily: "var(--font-body)",
              }}
            >
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{usernameErr}</span>
            </div>
          )}
          {usernameOk && (
            <div
              className="mt-3 flex items-center gap-2 px-3 py-2 text-sm"
              style={{
                background: "#E0F0EE",
                border: "1px solid var(--color-teal)",
                color: "var(--color-teal-dark)",
                fontFamily: "var(--font-body)",
              }}
            >
              <Check size={14} />
              <span>Username updated.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={usernameBusy || !usernameDraft.trim() || usernameDraft.trim() === teacherName}
            className="mt-4 px-5 py-2.5 text-sm font-600 flex items-center gap-2"
            style={{
              background: "var(--color-ember)",
              color: "#fff",
              fontFamily: "var(--font-body)",
              border: "2px solid var(--color-ink)",
              boxShadow: "3px 3px 0 var(--color-ink)",
              borderRadius: 0,
              cursor:
                usernameBusy || !usernameDraft.trim() || usernameDraft.trim() === teacherName
                  ? "not-allowed"
                  : "pointer",
              opacity:
                usernameBusy || !usernameDraft.trim() || usernameDraft.trim() === teacherName
                  ? 0.5
                  : 1,
            }}
          >
            <Check size={14} />
            {usernameBusy ? "Saving…" : "Save username"}
          </button>
        </form>
      </div>

      {/* ─── Password card ─────────────────────────────────────────── */}
      <div
        className="p-6"
        style={{
          background: "#fff",
          border: "2px solid var(--color-ink)",
          boxShadow: "4px 4px 0 var(--color-amber)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Lock size={18} color="var(--color-amber-dark)" />
          <h2
            className="text-xl font-700"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Password
          </h2>
        </div>

        <form onSubmit={handlePasswordSave}>
          <div className="grid gap-4">
            <PasswordField
              label="Current password"
              value={currentPw}
              onChange={(v) => {
                setCurrentPw(v);
                setPasswordOk(false);
                setPasswordErr("");
              }}
              show={showCurrent}
              onToggle={() => setShowCurrent((s) => !s)}
              disabled={passwordBusy}
              autoComplete="current-password"
            />
            <PasswordField
              label="New password"
              value={newPw}
              onChange={(v) => {
                setNewPw(v);
                setPasswordOk(false);
                setPasswordErr("");
              }}
              show={showNew}
              onToggle={() => setShowNew((s) => !s)}
              disabled={passwordBusy}
              autoComplete="new-password"
            />
            <PasswordField
              label="Confirm new password"
              value={confirmPw}
              onChange={(v) => {
                setConfirmPw(v);
                setPasswordOk(false);
                setPasswordErr("");
              }}
              show={showNew}
              onToggle={() => setShowNew((s) => !s)}
              disabled={passwordBusy}
              autoComplete="new-password"
            />
          </div>

          {newPw && confirmPw && newPw !== confirmPw && (
            <p
              className="text-xs mt-2"
              style={{ color: "var(--color-ember-dark)", fontFamily: "var(--font-body)" }}
            >
              Passwords don't match yet.
            </p>
          )}

          {passwordErr && (
            <div
              className="mt-3 flex items-start gap-2 px-3 py-2 text-sm"
              style={{
                background: "#FBE3D6",
                border: "1px solid var(--color-ember)",
                color: "var(--color-ember-dark)",
                fontFamily: "var(--font-body)",
              }}
            >
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{passwordErr}</span>
            </div>
          )}
          {passwordOk && (
            <div
              className="mt-3 flex items-center gap-2 px-3 py-2 text-sm"
              style={{
                background: "#E0F0EE",
                border: "1px solid var(--color-teal)",
                color: "var(--color-teal-dark)",
                fontFamily: "var(--font-body)",
              }}
            >
              <Check size={14} />
              <span>Password updated. Use the new one next time you sign in.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={
              passwordBusy ||
              !currentPw ||
              !newPw ||
              !confirmPw ||
              newPw !== confirmPw
            }
            className="mt-4 px-5 py-2.5 text-sm font-600 flex items-center gap-2"
            style={{
              background: "var(--color-amber)",
              color: "var(--color-ink)",
              fontFamily: "var(--font-body)",
              border: "2px solid var(--color-ink)",
              boxShadow: "3px 3px 0 var(--color-ink)",
              borderRadius: 0,
              cursor:
                passwordBusy || !currentPw || !newPw || !confirmPw || newPw !== confirmPw
                  ? "not-allowed"
                  : "pointer",
              opacity:
                passwordBusy || !currentPw || !newPw || !confirmPw || newPw !== confirmPw
                  ? 0.5
                  : 1,
            }}
          >
            <Check size={14} />
            {passwordBusy ? "Saving…" : "Save password"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  disabled,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  disabled: boolean;
  autoComplete: string;
}) {
  return (
    <div>
      <label
        className="block text-xs font-600 uppercase tracking-wider mb-2"
        style={{
          color: "var(--color-ink-muted)",
          fontFamily: "var(--font-body)",
        }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          className="w-full px-3 py-2.5 pr-10 text-sm outline-none"
          style={{
            border: "2px solid var(--color-ink)",
            background: "var(--color-cream)",
            fontFamily: "var(--font-body)",
            color: "var(--color-ink)",
            borderRadius: 0,
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute top-0 right-0 h-full px-3 flex items-center"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-ink-muted)",
          }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
