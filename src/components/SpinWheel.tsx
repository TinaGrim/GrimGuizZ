import { useState, useRef, useMemo } from "react";
import { motion } from "motion/react";
import { Sounds } from "../data/sounds";

interface SpinWheelProps {
  // Spin is purely cosmetic — server is authoritative. The parent will
  // call the spin endpoint and reveal the real wheelResult after we land.
  onLanded: () => void;
  // Pool size from the server (1..3). When 1 the page should skip this
  // component entirely, but we still clamp defensively.
  maxValue: 1 | 2 | 3;
  // The exact segment value the wheel must land on (the server's committed
  // wheelResult). This guarantees the arrow points at the same segment the
  // student will actually be served — no visual / count mismatch.
  targetValue: 1 | 2 | 3;
  // "Lucky Double" golden spin: renders a golden shimmer so the player
  // knows the spin is special before the reveal lands.
  lucky?: string;
  disabled?: boolean;
}

const SEGMENT_COLORS = ["#D94F1E", "#F0A500", "#0D6E6E"];
const SEGMENT_TEXT_COLORS = ["#fff", "#1C0F00", "#fff"];

// The spin's CSS transition uses cubic-bezier(0.17, 0.67, 0.12, 0.99).
// We mirror it here so the tick sound follows the *actual* angular velocity
// of the wheel: rapid-fire at the launch, slowing to a crawl as it coasts,
// instead of a constant-rate metronome from the old fixed setInterval.
const SPIN_MS = 4200;
const EASING = [0.17, 0.67, 0.12, 0.99] as const;
const EASE_LUT_STEPS = 120;
const TICK_EVERY_DEG = 30; // one tick per N° of swept rotation

function sampleCubicBezier(x1: number, y1: number, x2: number, y2: number, t: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  return {
    x: ((ax * t + bx) * t + cx) * t,
    y: ((ay * t + by) * t + cy) * t,
    dx: (3 * ax * t + 2 * bx) * t + cx,
  };
}

// Precomputed eased progress samples so each spin skips the bezier solve.
const EASE_LUT = Array.from({ length: EASE_LUT_STEPS + 1 }, (_, i) => {
  const target = i / EASE_LUT_STEPS;
  let t = target;
  for (let iter = 0; iter < 8; iter++) {
    const s = sampleCubicBezier(...EASING, t);
    const diff = s.x - target;
    if (Math.abs(diff) < 1e-6 || Math.abs(s.dx) < 1e-6) break;
    t -= diff / s.dx;
  }
  return sampleCubicBezier(...EASING, t).y;
});

const easeProgress = (elapsed: number) =>
  EASE_LUT[Math.min(EASE_LUT_STEPS, Math.round(elapsed * EASE_LUT_STEPS))];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return [`M ${cx} ${cy}`, `L ${start.x} ${start.y}`, `A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`, "Z"].join(" ");
}

export default function SpinWheel({ onLanded, maxValue, targetValue, lucky = "", disabled }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(false);
  const hasSpun = useRef(false);

  // Build segments dynamically based on maxValue (2 or 3 supported — 1 is
  // unreachable here because the page skips the wheel entirely when pool=1).
  const segments = useMemo(() => {
    const count = Math.max(2, Math.min(3, maxValue));
    const span = 360 / count;
    return Array.from({ length: count }, (_, i) => ({
      value: (i + 1) as 1 | 2 | 3,
      label: String(i + 1),
      color: SEGMENT_COLORS[i] ?? "#D94F1E",
      textColor: SEGMENT_TEXT_COLORS[i] ?? "#fff",
      startAngle: i * span,
      endAngle: (i + 1) * span,
    }));
  }, [maxValue]);

  const handleSpin = () => {
    if (spinning || hasSpun.current || disabled) return;
    hasSpun.current = true;
    setSpinning(true);
    setLanded(false);
    Sounds.click();

    // The server has already committed to a wheelResult. We MUST land on
    // that exact segment so the arrow visually matches the count the
    // student will be served. The animation still feels random because of
    // the extra spins and the per-frame timing, but the final position is
    // determined by `targetValue`.
    const extraSpins = Math.floor(Math.random() * 3) + 5; // 5–7 full rotations
    const span = 360 / segments.length;
    // Segment with value `v` has center `(v - 0.5) * span`. To bring that
    // center to the top (angle 0°) we rotate by `-(center)` mod 360.
    const center = (targetValue - 0.5) * span;
    const segmentOffset = ((-center) % 360 + 360) % 360;
    const totalRotation = rotation + extraSpins * 360 + segmentOffset;

    setRotation(totalRotation);

    // Tick cadence mirrors rotational speed: sample the same easing the CSS
    // transition runs, and play a tick every `TICK_EVERY_DEG` of swept angle.
    // Fast start → dense ticks; decelerating end → ticks space out.
    const start = performance.now();
    let lastTickSweep = 0;
    let rafId = 0;
    const driveTicks = (now: number) => {
      const elapsed = Math.min((now - start) / SPIN_MS, 1);
      const sweep = easeProgress(elapsed) * totalRotation;
      const crossed = Math.floor(sweep / TICK_EVERY_DEG);
      if (crossed > lastTickSweep) {
        lastTickSweep = crossed;
        Sounds.tick();
      }
      if (elapsed < 1) rafId = requestAnimationFrame(driveTicks);
    };
    rafId = requestAnimationFrame(driveTicks);

    setTimeout(() => {
      cancelAnimationFrame(rafId);
      setSpinning(false);
      setLanded(true);
      Sounds.land();
      // Hand control back to the parent so it can reveal the real count
      // and start the attempt.
      setTimeout(() => onLanded(), 400);
    }, SPIN_MS);
  };

  const CX = 150;
  const CY = 150;
  const R = 138;
  const LABEL_R = 88;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Wheel container */}
      <motion.div
        className="relative"
        style={{ width: 320, height: 320 }}
        initial={false}
        animate={landed ? { scale: [1, 1.05, 0.985, 1] } : { scale: 1 }}
        transition={{ duration: 0.45, times: [0, 0.3, 0.6, 1] }}
      >
        {/* Pointer — fixed triangle at top */}
        <div
          className="absolute left-1/2 -top-3 z-10"
          style={{ transform: "translateX(-50%)" }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "18px solid transparent",
              borderRight: "18px solid transparent",
              borderTop: "30px solid var(--color-amber)",
              filter:
                "drop-shadow(0 0 4px rgba(240,165,0,0.6)) drop-shadow(0 3px 6px rgba(0,0,0,0.5))",
            }}
          />
          {/* small dark notch under the amber triangle so it reads against any segment */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              transform: "translateX(-50%)",
              width: 6,
              height: 8,
              background: "var(--color-ink)",
              borderRadius: 1,
            }}
          />
        </div>

        {/* Wheel SVG */}
        <svg
          viewBox="0 0 300 300"
          width="320"
          height="320"
          style={{ display: "block" }}
        >
          {/* Drop shadow filter */}
          <defs>
            <filter id="wheelShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#1C0F00" floodOpacity="0.25" />
            </filter>
            {/* Memphis dot pattern fill for each segment */}
            <pattern id="dotsLight" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="6" cy="6" r="1.5" fill="rgba(255,255,255,0.15)" />
            </pattern>
            <pattern id="dotsDark" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="6" cy="6" r="1.5" fill="rgba(0,0,0,0.08)" />
            </pattern>
          </defs>

          {/* Outer ring background */}
          <circle
            cx={CX}
            cy={CY}
            r={R + 8}
            fill="none"
            stroke="#1C0F00"
            strokeWidth="4"
            filter="url(#wheelShadow)"
          />

          {/* Spinning group */}
          <g
            style={{
              transformOrigin: `${CX}px ${CY}px`,
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? "transform 4.2s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
                : "none",
            }}
          >
            {segments.map((seg) => {
              const center = (seg.startAngle + seg.endAngle) / 2;
              const lPos = polarToCartesian(CX, CY, LABEL_R, center);
              return (
                <g key={seg.value}>
                  <path
                    d={describeArc(CX, CY, R, seg.startAngle, seg.endAngle)}
                    fill={seg.color}
                    stroke="#1C0F00"
                    strokeWidth="2.5"
                  />
                  {/* Overlay dots for texture */}
                  <path
                    d={describeArc(CX, CY, R, seg.startAngle, seg.endAngle)}
                    fill={seg.value === 2 ? "url(#dotsDark)" : "url(#dotsLight)"}
                  />
                  {/* Number label */}
                  <text
                    x={lPos.x}
                    y={lPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={seg.textColor}
                    fontSize="44"
                    fontFamily="Fraunces, serif"
                    fontWeight="900"
                    style={{ userSelect: "none" }}
                  >
                    {seg.label}
                  </text>
                  {/* Sub-label */}
                  <text
                    x={lPos.x}
                    y={lPos.y + 28}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={seg.textColor}
                    fontSize="11"
                    fontFamily="Outfit, sans-serif"
                    fontWeight="600"
                    opacity="0.75"
                    style={{ userSelect: "none" }}
                  >
                    {seg.value === 1 ? "QUESTION" : "QUESTIONS"}
                  </text>
                </g>
              );
            })}

            {/* Center circle */}
            <circle cx={CX} cy={CY} r="24" fill="#FFF8F0" stroke="#1C0F00" strokeWidth="2.5" />
            <circle cx={CX} cy={CY} r="8" fill="#1C0F00" />
          </g>

          {/* Tick marks around the rim */}
          {Array.from({ length: 24 }, (_, i) => {
            const angle = i * 15;
            const inner = polarToCartesian(CX, CY, R + 2, angle);
            const outer = polarToCartesian(CX, CY, R + 9, angle);
            const isMajor = i % 8 === 0;
            return (
              <line
                key={i}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="#1C0F00"
                strokeWidth={isMajor ? 2 : 1}
                opacity={isMajor ? 0.6 : 0.25}
              />
            );
          })}
        </svg>

        {/* Lucky Double — golden shimmer so the special spin reads instantly */}
        {lucky && !landed && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: "4px solid transparent",
              background:
                "conic-gradient(from 0deg, rgba(240,165,0,0.9), rgba(255,217,168,0.15), rgba(240,165,0,0.9), rgba(255,217,168,0.15), rgba(240,165,0,0.9)) border-box",
              WebkitMask:
                "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              animation: "landingRing 1.2s ease-in-out infinite",
              boxShadow: "0 0 30px rgba(240,165,0,0.65)",
            }}
          >
            <span
              className="absolute -top-4 left-1/2"
              style={{
                transform: "translateX(-50%)",
                fontSize: 28,
                filter: "drop-shadow(0 0 8px rgba(240,165,0,0.9))",
              }}
            >
              🎁
            </span>
          </div>
        )}

        {/* Landing indicator — persistent so the winning segment stays obvious */}
        {landed && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: "4px solid var(--color-amber)",
              boxShadow: "0 0 24px rgba(240,165,0,0.55)",
              animation: "landingRing 0.6s ease forwards",
            }}
          />
        )}
      </motion.div>

      {/* Spin button */}
      {!landed && (
        <motion.button
          onClick={handleSpin}
          disabled={spinning || disabled}
          className="relative overflow-hidden font-display font-700 text-xl px-10 py-4 rounded-none"
          style={{
            background: spinning ? "var(--color-ink-muted)" : "var(--color-ember)",
            color: "#fff",
            border: "3px solid var(--color-ink)",
            cursor: spinning ? "not-allowed" : "pointer",
            boxShadow: spinning ? "none" : "4px 4px 0 var(--color-ink)",
            transition: "all 0.15s ease",
            letterSpacing: "0.04em",
            fontFamily: "var(--font-display)",
          }}
          whileHover={spinning ? {} : { y: -2, x: -2, boxShadow: "6px 6px 0 var(--color-ink)" }}
          whileTap={spinning ? {} : { y: 2, x: 2, boxShadow: "2px 2px 0 var(--color-ink)" }}
        >
          {spinning ? "Spinning…" : "Spin the Wheel"}
        </motion.button>
      )}
    </div>
  );
}