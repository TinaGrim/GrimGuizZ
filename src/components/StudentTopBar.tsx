import { motion } from "motion/react";
import { ArrowLeft, LogOut } from "lucide-react";

type StudentTopBarProps =
  | {
      kind: "home";
      studentName: string;
      onLeave: () => void;
    }
  | {
      kind: "back";
      onBack: () => void;
      trailing?: string;
    };

// Shared student chrome: one sticky header for the quiz section, so every
// screen reads as the same app. "home" = QuizZ logo + student chip (ink,
// ember underline). "back" = back-link + optional trailing label (cream).
export default function StudentTopBar(props: StudentTopBarProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 md:px-6 md:py-4"
      style={
        props.kind === "home"
          ? {
              background: "var(--color-ink)",
              borderBottom: "2px solid var(--color-ember)",
            }
          : { borderBottom: "1px solid var(--color-cream-dark)" }
      }
    >
      {props.kind === "home" ? (
        <>
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="text-xl font-900 leading-none"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-amber)",
              }}
            >
              Quiz<span style={{ fontSize: "1.2em", lineHeight: 1 }}>Z</span>
            </span>
            <span
              className="text-sm px-2 py-0.5 truncate max-w-[40vw]"
              style={{
                background: "rgba(240,165,0,0.15)",
                color: "var(--color-amber)",
                border: "1px solid rgba(240,165,0,0.3)",
                fontFamily: "var(--font-body)",
              }}
            >
              {props.studentName}
            </span>
          </div>
          <button
            onClick={props.onLeave}
            className="flex items-center gap-1.5 text-sm font-500 shrink-0"
            style={{
              color: "rgba(255,255,255,0.4)",
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              background: "none",
              border: "none",
            }}
          >
            <LogOut size={14} />
            Leave
          </button>
        </>
      ) : (
        <>
          <button
            onClick={props.onBack}
            className="flex items-center gap-2 text-sm font-500"
            style={{
              color: "var(--color-ink-muted)",
              fontFamily: "var(--font-body)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} />
            Back to quizzes
          </button>
          {props.trailing && (
            <span
              className="text-sm truncate max-w-[45vw]"
              style={{
                color: "var(--color-ink-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              {props.trailing}
            </span>
          )}
        </>
      )}
    </motion.header>
  );
}