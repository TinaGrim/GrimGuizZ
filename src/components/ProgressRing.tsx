interface ProgressRingProps {
  score: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
}

export default function ProgressRing({
  score,
  total,
  size = 140,
  strokeWidth = 10,
  animate = true,
}: ProgressRingProps) {
  const pct = total === 0 ? 0 : score / total;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  let color = "#D94F1E";
  if (pct >= 1) color = "#2D7A3A";
  else if (pct >= 0.67) color = "#0D6E6E";
  else if (pct >= 0.34) color = "#F0A500";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--color-cream-dark)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={`${circumference * (1 - pct)}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={
          animate
            ? {
                transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                transitionDelay: "0.3s",
              }
            : {}
        }
      />
      {/* Score text */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.22}
        fontFamily="Fraunces, serif"
        fontWeight="900"
        fill="var(--color-ink)"
      >
        {score}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.1}
        fontFamily="Outfit, sans-serif"
        fontWeight="500"
        fill="var(--color-ink-muted)"
      >
        of {total}
      </text>
    </svg>
  );
}
