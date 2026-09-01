// Lightweight SVG chart primitives — single-hue ember on cream-dark track,
// no harsh outlines, no traffic-light colors.

interface SparklineProps {
  points: number[];
  color?: string;
  height?: number;
  width?: number;
}

export function Sparkline({
  points,
  color = "var(--color-ember)",
  height = 32,
  width = 100,
}: SparklineProps) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p - min) / range) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
      {/* End-point dot */}
      <circle
        cx={(points.length - 1) * stepX}
        cy={height - ((points[points.length - 1] - min) / range) * (height - 4) - 2}
        r={2.2}
        fill={color}
      />
    </svg>
  );
}

interface MiniBarProps {
  percent: number;
  color?: string;
  height?: number;
}

export function MiniBar({
  percent,
  color = "var(--color-ember)",
  height = 6,
}: MiniBarProps) {
  const w = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="w-full overflow-hidden"
      style={{ height, background: "var(--color-cream-dark)" }}
    >
      <div
        className="h-full"
        style={{ width: `${w}%`, background: color, transition: "width 0.6s ease" }}
      />
    </div>
  );
}
