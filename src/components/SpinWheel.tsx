import { useState, useRef } from "react"

interface SpinWheelProps {
  onResult: (result: 1 | 2 | 3) => void
}

const SEGMENTS = [
  {
    value: 1 as const,
    label: "1",
    color: "#D94F1E",
    textColor: "#fff",
    startAngle: -60,
    endAngle: 60,
  },
  {
    value: 2 as const,
    label: "2",
    color: "#F0A500",
    textColor: "#1C0F00",
    startAngle: 60,
    endAngle: 180,
  },
  {
    value: 3 as const,
    label: "3",
    color: "#0D6E6E",
    textColor: "#fff",
    startAngle: 180,
    endAngle: 300,
  },
]

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ")
}

export default function SpinWheel({ onResult }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<1 | 2 | 3 | null>(null)
  const [landed, setLanded] = useState(false)
  const hasSpun = useRef(false)

  const handleSpin = () => {
    if (spinning || hasSpun.current) return
    hasSpun.current = true
    setSpinning(true)
    setLanded(false)

    const r = (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3
    const extraSpins = Math.floor(Math.random() * 3) + 5 // 5–7 full rotations
    const segmentOffset = (r - 1) * 120 // 0°, 120°, 240° for results 1, 2, 3
    const totalRotation = rotation + extraSpins * 360 + segmentOffset

    setRotation(totalRotation)

    setTimeout(() => {
      setSpinning(false)
      setResult(r)
      setLanded(true)
      setTimeout(() => onResult(r), 800)
    }, 4200)
  }

  const CX = 150
  const CY = 150
  const R = 138
  const LABEL_R = 88

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Wheel container */}
      <div className="relative" style={{ width: 320, height: 320 }}>
        {/* Pointer — fixed triangle at top */}
        <div
          className="absolute left-1/2 -top-2 z-10"
          style={{ transform: "translateX(-50%)" }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "14px solid transparent",
              borderRight: "14px solid transparent",
              borderTop: "24px solid #1C0F00",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
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
            <filter
              id="wheelShadow"
              x="-10%"
              y="-10%"
              width="120%"
              height="120%"
            >
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="8"
                floodColor="#1C0F00"
                floodOpacity="0.25"
              />
            </filter>
            {/* Memphis dot pattern fill for each segment */}
            <pattern
              id="dots1"
              x="0"
              y="0"
              width="12"
              height="12"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="6" cy="6" r="1.5" fill="rgba(255,255,255,0.15)" />
            </pattern>
            <pattern
              id="dots2"
              x="0"
              y="0"
              width="12"
              height="12"
              patternUnits="userSpaceOnUse"
            >
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
            {SEGMENTS.map((seg) => {
              const center = (seg.startAngle + seg.endAngle) / 2
              const lPos = polarToCartesian(CX, CY, LABEL_R, center)
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
                    fill={seg.value === 2 ? "url(#dots2)" : "url(#dots1)"}
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
              )
            })}

            {/* Center circle */}
            <circle
              cx={CX}
              cy={CY}
              r="24"
              fill="#FFF8F0"
              stroke="#1C0F00"
              strokeWidth="2.5"
            />
            <circle cx={CX} cy={CY} r="8" fill="#1C0F00" />
          </g>

          {/* Tick marks around the rim */}
          {Array.from({ length: 24 }, (_, i) => {
            const angle = i * 15
            const inner = polarToCartesian(CX, CY, R + 2, angle)
            const outer = polarToCartesian(CX, CY, R + 9, angle)
            const isMajor = i % 8 === 0
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
            )
          })}
        </svg>

        {/* Landing pulse ring */}
        {landed && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: "3px solid var(--color-amber)",
              animation: "confettiBurst 0.6s ease forwards",
            }}
          />
        )}
      </div>

      {/* Spin button */}
      {!result && (
        <button
          onClick={handleSpin}
          disabled={spinning}
          className="relative overflow-hidden font-display font-700 text-xl px-10 py-4 rounded-none"
          style={{
            background: spinning
              ? "var(--color-ink-muted)"
              : "var(--color-ember)",
            color: "#fff",
            border: "3px solid var(--color-ink)",
            cursor: spinning ? "not-allowed" : "pointer",
            transform: spinning ? "none" : "translateY(0)",
            boxShadow: spinning ? "none" : "4px 4px 0 var(--color-ink)",
            transition: "all 0.15s ease",
            letterSpacing: "0.04em",
            fontFamily: "var(--font-display)",
          }}
          onMouseEnter={(e) => {
            if (!spinning) {
              ;(e.currentTarget as HTMLButtonElement).style.transform =
                "translate(-2px, -2px)"
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                "6px 6px 0 var(--color-ink)"
            }
          }}
          onMouseLeave={(e) => {
            if (!spinning) {
              ;(e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(0)"
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                "4px 4px 0 var(--color-ink)"
            }
          }}
        >
          {spinning ? "Spinning…" : "Spin the Wheel"}
        </button>
      )}

      {/* Result reveal */}
      {result && !spinning && (
        <div
          className="text-center animate-pop-in"
          style={{ animationDelay: "0.1s", opacity: 0 }}
        >
          <p
            className="font-display font-900 text-5xl"
            style={{
              color: "var(--color-ember)",
              fontFamily: "var(--font-display)",
            }}
          >
            {result} {result === 1 ? "Question" : "Questions"}!
          </p>
          <p
            className="text-base mt-1"
            style={{
              color: "var(--color-ink-muted)",
              fontFamily: "var(--font-body)",
            }}
          >
            Get ready — loading your question{result > 1 ? "s" : ""}…
          </p>
        </div>
      )}
    </div>
  )
}
