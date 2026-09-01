interface ProgressRingProps {
  score: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
  // When true (default), render "score/total" inside the ring. Set to false
  // for contexts like the progress panel where the surrounding copy already
  // expresses the percent and the denominator just causes overflow.
  showTotal?: boolean;
}

export default function ProgressRing({
  score,
  total,
  size = 140,
  strokeWidth = 10,
  animate = true,
  showTotal = true,
}: ProgressRingProps) {
  const pct = Math.max(0, Math.min(1, total === 0 ? 0 : score / total));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  // Three pie-slice colors, all from the established brand palette.
  const SLICE_COLORS = ["#D94F1E", "#F0A500", "#0D6E6E"] as const;

  // The visible portion of the ring is divided into 3 equal pie slices,
  // one per color. Each slice is its own circle with a dasharray that
  // covers exactly 1/3 of the remaining circumference, offset so the
  // three slices sit side-by-side starting at 12 o'clock and going
  // clockwise. The full stroke sweeps `pct` of the way around; the
  // unfilled portion is left as the soft amber track.
  const slice = circumference / 3;
  const visibleArcLength = circumference * pct;
  const slices = SLICE_COLORS.map((color, i) => {
    // The slice's start position (clockwise from 12 o'clock) in length units.
    const sliceStart = i * slice;
    // The slice's *visible* portion = max(0, min(slice, visibleArcLength - sliceStart))
    const vis = Math.max(0, Math.min(slice, visibleArcLength - sliceStart));
    return { color, dasharray: `${vis} ${circumference - vis}` };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      {/* Track — soft amber for the unfilled portion */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(240, 165, 0, 0.25)"
        strokeWidth={strokeWidth}
      />

      {/* Three pie-slice arcs, one per color, drawn on top of the track.
          Each starts at 12 o'clock and covers its 1/3 segment clockwise. */}
      {slices.map(({ color, dasharray }, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          strokeDasharray={dasharray}
          strokeDashoffset={-i * slice}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={
            animate
              ? {
                  transition: "stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  transitionDelay: "0.3s",
                }
              : {}
          }
        />
      ))}

      {/* Score text — uses the design-system display font, rendered in
          the warm amber accent (constant) so the number and the
          pie-slice arc each carry their own visual signal. */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-display)"
        fontWeight="900"
        fill="var(--color-amber)"
      >
        <tspan fontSize={size * (showTotal ? 0.34 : 0.42)}>
          {score}
        </tspan>
        {showTotal && (
          <tspan fontSize={size * 0.18} dx={size * 0.02}>
            /{total}
          </tspan>
        )}
      </text>
    </svg>
  );
}