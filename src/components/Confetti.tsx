import { useMemo, type CSSProperties } from "react";

interface ConfettiProps {
  pieces?: number;
  colors?: string[];
  burst?: boolean;
}

const PALETTE = ["#D94F1E", "#F0A500", "#0D6E6E", "#FFD9A8", "#1C0F00"];

export default function Confetti({
  pieces = 40,
  colors = PALETTE,
  burst = false,
}: ConfettiProps) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        duration: 2.4 + Math.random() * 1.6,
        drift: (Math.random() * 2 - 1) * 160,
        spin: 360 + Math.round(Math.random() * 540),
        size: 7 + Math.round(Math.random() * 6),
        color: colors[i % colors.length],
        rotate: Math.random() * 360,
      })),
    [pieces, colors],
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden z-50"
      aria-hidden
    >
      {burst && <div className="confetti-burst" />}
      {items.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.6,
              background: p.color,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              transform: `rotate(${p.rotate}deg)`,
              "--confetti-drift": `${p.drift}px`,
              "--confetti-spin": `${p.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}