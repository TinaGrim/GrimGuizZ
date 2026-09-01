import { useState } from "react";
import type { Message } from "../data/types";
import { ChevronDown, MessageSquare } from "lucide-react";

interface Props {
  messages: Message[];
  variant?: "full" | "compact";
  cap?: number;
}

export default function MessagesPanel({ messages, variant = "full", cap = 200 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isCompact = variant === "compact";
  const visible = isCompact && !expanded ? messages.slice(0, 2) : messages;

  return (
    <section
      className="p-5 flex flex-col"
      style={{
        background: isCompact ? "var(--color-ink)" : "white",
        border: isCompact ? "2px solid var(--color-amber)" : "2px solid var(--color-cream-dark)",
        boxShadow: isCompact ? "4px 4px 0 var(--color-amber-dark)" : "none",
        // §5.2: capped height on mobile variant — scrollable, not full-page.
        maxHeight: isCompact ? `${cap}px` : undefined,
        overflow: "auto",
      }}
    >
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 28,
              height: 28,
              background: isCompact ? "var(--color-amber)" : "var(--color-cream-dark)",
              color: isCompact ? "var(--color-ink)" : "var(--color-ink-muted)",
            }}
          >
            <MessageSquare size={14} />
          </div>
          <h2
            className="text-base font-700"
            style={{
              fontFamily: "var(--font-display)",
              color: isCompact ? "var(--color-amber)" : "var(--color-ink)",
            }}
          >
            Teacher
          </h2>
        </div>
        {isCompact && messages.length > 2 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs"
            style={{
              color: "var(--color-amber)",
              fontFamily: "var(--font-body)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            {expanded ? "Less" : "See all"}
            <ChevronDown
              size={12}
              style={{
                transform: expanded ? "rotate(180deg)" : "none",
                transition: "transform 0.15s",
              }}
            />
          </button>
        )}
      </header>

      {messages.length === 0 ? (
        <p
          className="text-sm italic"
          style={{
            color: isCompact ? "rgba(255,255,255,0.4)" : "var(--color-ink-muted)",
            fontFamily: "var(--font-body)",
          }}
        >
          Nothing here yet. The teacher will write here when there's something to share.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((m) => (
            <li
              key={m.id}
              className="flex flex-col gap-1"
              style={{
                borderLeft: `3px solid ${isCompact ? "var(--color-amber)" : "var(--color-cream-dark)"}`,
                paddingLeft: 12,
              }}
            >
              <p
                className="text-sm leading-relaxed"
                style={{
                  color: isCompact ? "rgba(255,255,255,0.85)" : "var(--color-ink)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {m.text}
              </p>
              <p
                className="text-xs"
                style={{
                  color: isCompact ? "rgba(255,255,255,0.4)" : "var(--color-ink-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {m.teacherName} · {formatTime(m.createdAt)}
                {!m.readAt && (
                  <span
                    className="ml-2"
                    style={{ color: "var(--color-amber)", fontFamily: "var(--font-body)" }}
                  >
                    new
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}