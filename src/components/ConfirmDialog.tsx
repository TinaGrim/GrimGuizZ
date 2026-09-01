import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

// Module-level state — single dialog at a time.
let externalResolve: ((v: boolean) => void) | null = null;
let externalOptions: ConfirmOptions | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function open(opts: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    externalOptions = opts;
    externalResolve = resolve;
    emit();
  });
}

function close(v: boolean) {
  const r = externalResolve;
  externalResolve = null;
  externalOptions = null;
  r?.(v);
  emit();
}

export function useConfirm() {
  const confirm = (opts: ConfirmOptions) => open(opts);
  return { confirm };
}

export function ConfirmHost() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  // tick is read so the linter knows the dep matters; render based on
  // module-level state which the subscription just refreshed.
  void tick;
  if (!externalOptions) return null;
  return <ConfirmDialog options={externalOptions} onResolve={close} />;
}

function ConfirmDialog({
  options,
  onResolve,
}: {
  options: ConfirmOptions;
  onResolve: (v: boolean) => void;
}) {
  const danger = options.danger !== false;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(28, 15, 0, 0.6)", backdropFilter: "blur(2px)" }}
      onClick={() => onResolve(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-6"
        style={{
          background: "white",
          border: "3px solid var(--color-ink)",
          boxShadow: danger
            ? "6px 6px 0 var(--color-ember)"
            : "6px 6px 0 var(--color-amber)",
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              background: danger ? "var(--color-ember)" : "var(--color-amber)",
              color: "#fff",
            }}
          >
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1">
            <h2
              className="text-base font-700 mb-1"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-ink)",
              }}
            >
              {options.title}
            </h2>
            <p
              className="text-sm leading-relaxed"
              style={{
                color: "var(--color-ink-light)",
                fontFamily: "var(--font-body)",
              }}
            >
              {options.message}
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button
            onClick={() => onResolve(false)}
            className="px-4 py-2 text-sm font-600"
            style={{
              background: "var(--color-cream-dark)",
              border: "2px solid var(--color-cream-dark)",
              color: "var(--color-ink-muted)",
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              borderRadius: 0,
            }}
          >
            {options.cancelLabel ?? "Cancel"}
          </button>
          <button
            onClick={() => onResolve(true)}
            className="px-4 py-2 text-sm font-700"
            style={{
              background: danger ? "var(--color-ember)" : "var(--color-teal-dark)",
              border: "2px solid var(--color-ink)",
              color: "#fff",
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              boxShadow: "2px 2px 0 var(--color-ink)",
              borderRadius: 0,
            }}
          >
            {options.confirmLabel ?? "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Reference ReactNode so the type stays exported if anyone imports it.
export type { ReactNode };