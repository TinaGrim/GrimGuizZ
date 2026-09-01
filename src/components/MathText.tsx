import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

// Renders a string that may contain LaTeX math delimited by:
//   $$...$$  — block (display) math
//   $...$    — inline math
// Plain text passes through unchanged. Invalid math falls back to the raw
// source so a typo never blanks out a prompt or option.

type Segment = { kind: "text" | "inline" | "block"; value: string };

function splitMath(input: string): Segment[] {
  const out: Segment[] = [];
  // Block: $$...$$ on its own line (or just $$...$$). Inline: $...$ with
  // no leading or trailing whitespace (the LaTeX convention) so currency
  // like "$5 and $10" doesn't get swallowed as math.
  const re = /\$\$([\s\S]+?)\$\$|\$(?!\s)([^$\n]+?)(?<!\s)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    if (m.index > last) out.push({ kind: "text", value: input.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: "block", value: m[1] });
    else out.push({ kind: "inline", value: m[2] });
    last = re.lastIndex;
  }
  if (last < input.length) out.push({ kind: "text", value: input.slice(last) });
  return out.length ? out : [{ kind: "text", value: input }];
}

function renderMath(source: string, displayMode: boolean): string {
  try {
    return katex.renderToString(source, {
      displayMode,
      throwOnError: false,
      errorColor: "var(--color-ember, #D94F1E)",
    });
  } catch {
    return source;
  }
}

export default function MathText({
  text,
  className,
  blockClassName,
}: {
  text: string;
  className?: string;
  blockClassName?: string;
}) {
  const segments = useMemo(() => splitMath(text), [text]);
  const hasMath = segments.some((s) => s.kind !== "text");

  if (!hasMath) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.kind === "text") return <span key={i}>{seg.value}</span>;
        const html = renderMath(seg.value, seg.kind === "block");
        return (
          <span
            key={i}
            className={seg.kind === "block" ? blockClassName : undefined}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}