import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../store/AppContext";
import { QuizTaking } from "../api/client";
import type { SpinResponse, LuckyMode } from "../api/client";
import SpinWheel from "../components/SpinWheel";
import FadeUp from "../components/FadeUp";

function detectDeviceType(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  if (mobileUA) return "mobile";
  // Coarse viewport heuristic: anything under 768px wide is "mobile" for
  // reporting purposes even on a desktop browser resized narrow.
  if (window.innerWidth < 768) return "mobile";
  return "desktop";
}

export default function WheelSpin() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { currentStudent, quizzes, setWheelResult, startQuiz } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [spin, setSpin] = useState<SpinResponse | null>(null);
  // +1 bonus-question count-up: `extraCount` is the new (persistent) count
  // once bumped in, `bump` only drives the transient "+1" tag + pop.
  const [extraCount, setExtraCount] = useState<number | null>(null);
  const [bump, setBump] = useState(false);

  const quiz = quizzes.find((q) => q.id === quizId);
  // Primitive IDs instead of object references for the effect's deps — the
  // result of `quizzes.find(...)` is a new object on every render, which
  // would re-trigger the effect (and its cleanup) on every parent update,
  // cancelling the in-flight spin request and leaving the page stuck on
  // "Loading…". Primitive IDs are stable across renders.
  const studentId = currentStudent?.id ?? null;
  const quizIdForFetch = quiz?.id ?? null;

  useEffect(() => {
    if (!currentStudent) navigate("/");
  }, [currentStudent, navigate]);

  // Probe the server ONCE to learn the wheel's max value AND commit to the
  // actual wheelResult. With only 1 question in the pool we skip the wheel
  // entirely — there's nothing to spin for — and head straight into the
  // question. With 2+ questions we remember the server's wheelResult so the
  // wheel can land on the exact same segment the server picked. The actual
  // served questions are picked authoritatively by `createAttempt` (not by
  // the spin preview) so a stale client can't inject prompts.
  //
  // React StrictMode runs effects twice in dev (run → cleanup → run again).
  // The local `ignore` flag is set to `true` on cleanup so the first run's
  // in-flight fetch is allowed to be silently discarded; the second run
  // starts a fresh fetch with its own `ignore` flag. This replaces the
  // previous `inFlight` ref + `cancelled` closure pattern, which suffered
  // from a deadlock: the first run set inFlight=true, the cleanup ran,
  // and the second run's `if (inFlight.current) return;` short-circuited
  // so no new fetch ever started, while the first run's `if (cancelled)
  // return;` discarded the only fetch in flight. The page was then stuck
  // on "Loading…" forever in dev. Each StrictMode run gets its own
  // `ignore` flag via the effect's local scope, so the second run is
  // independent of the first.
  useEffect(() => {
    if (spin !== null) return;
    if (!studentId || !quizIdForFetch) return;
    setBusy(true);
    const qid = quizIdForFetch;
    let ignore = false;
    (async () => {
      try {
        const result = await QuizTaking.spin(qid);
        if (ignore) return;
        setSpin(result);
        if (result.maxWheelValue === 1) {
          await startAttempt(result.wheelResult, result.lucky ?? "");
        }
      } catch (e) {
        if (!ignore) setError((e as Error).message);
      } finally {
        if (!ignore) setBusy(false);
      }
    })();
    return () => {
      ignore = true;
    };
    // startAttempt is intentionally omitted — it closes over the latest
    // currentStudent/quiz/handlers and is recreated on every render. The
    // [spin, studentId, quizIdForFetch] deps are enough to gate the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin, studentId, quizIdForFetch]);

  // Once we've started an attempt, navigate to the question screen. The
  // attempt is considered started as soon as `revealed` flips to true and
  // the spin effect has produced a `spin` value. Driving the transition
  // from a useEffect (rather than a setTimeout inside `startAttempt`) means
  // the navigation is a React-managed side effect that survives React
  // StrictMode double-invocation and any unrelated state updates that
  // re-render the component — the previous `setTimeout(navigate, 1200)`
  // approach was fragile if the timer was lost during a hot reload.
  //
  // A LUCKY DOUBLE spin holds the reveal for ~2s so the popup is actually
  // readable — otherwise the banner mounted and unmounted within a single
  // paint and the bonus went unnoticed.
  useEffect(() => {
    if (!revealed || !spin) return;
    if (!spin.lucky) {
      navigate(`/quiz/${quizId}/question`, { replace: true });
      return;
    }
    const t = setTimeout(
      () => navigate(`/quiz/${quizId}/question`, { replace: true }),
      5000,
    );
    return () => clearTimeout(t);
  }, [revealed, spin, quizId, navigate]);

  // LUCKY DOUBLE "+1": once the reveal is on screen, tick the landed count
  // up by one with a "+1" tag dropping in from the top — 2 becomes 3 in
  // front of the player. Only applies to the `extra` (bonus question) mode.
  useEffect(() => {
    if (!revealed || spin?.lucky !== "extra") return;
    const t = setTimeout(() => {
      setExtraCount((spin?.wheelResult ?? 1) + 1);
      setBump(true);
      setTimeout(() => setBump(false), 900);
    }, 3000);
    return () => clearTimeout(t);
  }, [revealed, spin]);

  const startAttempt = async (wheelResult: 1 | 2 | 3, lucky: LuckyMode = "") => {
    if (!quiz) return;
    setWheelResult(wheelResult);
    const attempt = await QuizTaking.createAttempt({
      quizId: quiz.id,
      wheelResult,
      lucky: lucky || undefined,
      deviceType: detectDeviceType(),
    });
    startQuiz(attempt.questionsServed, attempt.id, attempt.lucky ?? lucky ?? "");
    // Flip revealed last so the navigation effect above is the one that
    // drives the transition. Reveal is shown for as long as it takes
    // React to commit the state and unmount this component — typically
    // a single paint, so the user barely sees the "X Questions!" before
    // the question screen replaces it.
    setRevealed(true);
  };

  // The wheel calls this when its animation finishes. We pass the server's
  // committed wheelResult down to the wheel so it lands on the matching
  // segment, then start the attempt.
  const handleLanded = async () => {
    if (!spin || busy) return;
    setBusy(true);
    setError(null);
    try {
      await startAttempt(spin.wheelResult, spin.lucky ?? "");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  // Pool size is still loading (or student/quiz not yet resolved).
  if (spin === null || !quiz || !currentStudent) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
        style={{ background: "var(--color-ink)" }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{
            background:
              "repeating-linear-gradient(90deg, #D94F1E 0px, #D94F1E 30px, #F0A500 30px, #F0A500 60px, #0D6E6E 60px, #0D6E6E 90px)",
          }}
        />
        <p
          className="text-sm"
          style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)" }}
        >
          {error ? "" : "Loading…"}
        </p>
        {error && (
          <p
            className="text-sm"
            style={{ color: "#ff8080", fontFamily: "var(--font-body)" }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  const maxValue = spin.maxWheelValue;
  const serverResult = spin.wheelResult;

  return (
    <FadeUp
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{ background: "var(--color-ink)" }}
    >
      <div
        className="absolute top-8 left-8 opacity-5"
        style={{
          width: 180,
          height: 180,
          border: "3px solid var(--color-amber)",
          borderRadius: "50%",
        }}
      />
      <div
        className="absolute bottom-16 right-12 opacity-5"
        style={{
          width: 100,
          height: 100,
          background: "var(--color-ember)",
          transform: "rotate(20deg)",
        }}
      />
      <div
        className="absolute top-1/3 right-6 opacity-5"
        style={{
          width: 0,
          height: 0,
          borderLeft: "40px solid transparent",
          borderRight: "40px solid transparent",
          borderBottom: "70px solid var(--color-teal)",
        }}
      />

      <div
        className="absolute top-0 left-0 right-0 h-2"
        style={{
          background:
            "repeating-linear-gradient(90deg, #D94F1E 0px, #D94F1E 30px, #F0A500 30px, #F0A500 60px, #0D6E6E 60px, #0D6E6E 90px, #1C0F00 90px, #1C0F00 105px)",
        }}
      />

      <div className="flex flex-col items-center gap-8 w-full max-w-md">
        <div className="text-center">
          <p
            className="text-xs font-600 uppercase tracking-widest mb-2"
            style={{
              color: "var(--color-ember)",
              fontFamily: "var(--font-body)",
              letterSpacing: "0.2em",
            }}
          >
            {quiz.title}
          </p>
          <h1
            className="font-900 leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-amber)",
              fontSize: "clamp(2.2rem, 5vw, 3.2rem)",
            }}
          >
            {maxValue === 1 ? "1 question awaits" : (
              <>
                Spin for your
                <br />
                question count
              </>
            )}
          </h1>
        </div>

        {maxValue > 1 && !revealed && (
          <SpinWheel
            onLanded={handleLanded}
            disabled={busy || revealed}
            maxValue={maxValue}
            targetValue={serverResult}
            lucky={spin.lucky ?? ""}
          />
        )}

        {revealed && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            {spin.lucky && (
              <motion.p
                className="font-display font-900 text-4xl mb-2"
                initial={{ rotate: -5, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 15 }}
                style={{
                  color: "var(--color-amber)",
                  textShadow: "0 0 24px rgba(240,165,0,0.7)",
                  fontFamily: "var(--font-display)",
                }}
              >
                🎁 LUCKY DOUBLE!
              </motion.p>
            )}
            <motion.p
              key={extraCount ?? serverResult}
              className="font-display font-900 text-5xl"
              initial={{ opacity: 0, scale: 0.4, y: 24 }}
              animate={
                bump
                  ? { opacity: 1, scale: [1, 1.3, 1], y: 0 }
                  : { opacity: 1, scale: 1, y: 0 }
              }
              transition={
                bump
                  ? { duration: 0.55, times: [0, 0.45, 1], ease: "easeOut" }
                  : { type: "spring", stiffness: 300, damping: 16 }
              }
              style={{ color: "var(--color-ember)", fontFamily: "var(--font-display)" }}
            >
              <span className="relative inline-block">
                {extraCount ?? serverResult}{" "}
                {(extraCount ?? serverResult) === 1 ? "Question" : "Questions"}
                !
                <AnimatePresence>
                  {bump && (
                    <motion.span
                      className="plus-one-tag"
                      aria-hidden
                      initial={{ y: -40, opacity: 0, scale: 0.6 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 10, opacity: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      +1
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </motion.p>
            {spin.lucky === "double" && (
              <p
                className="text-base mt-2 font-600"
                style={{ color: "var(--color-amber)", fontFamily: "var(--font-body)" }}
              >
                Score counts double this round.
              </p>
            )}
            <p
              className="text-base mt-1"
              style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-body)" }}
            >
              Get ready…
            </p>
          </motion.div>
        )}

        {error && (
          <p
            className="text-sm"
            style={{ color: "#ff8080", fontFamily: "var(--font-body)" }}
          >
            {error}
          </p>
        )}
      </div>
    </FadeUp>
  );
}
