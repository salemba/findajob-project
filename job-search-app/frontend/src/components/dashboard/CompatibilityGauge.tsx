import { useState, useEffect } from 'react'

const R            = 40
const CX           = 50
const CY           = 50
const CIRCUMFERENCE = 2 * Math.PI * R   // ≈ 251.33

interface CompatibilityGaugeProps {
  score: number | null
  size?: number
}

export function CompatibilityGauge({ score, size = 96 }: CompatibilityGaugeProps) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setAnimated(true), 60)
    return () => clearTimeout(id)
  }, [])

  const pct    = score ?? 0
  const offset = animated
    ? CIRCUMFERENCE * (1 - pct / 100)
    : CIRCUMFERENCE

  const color =
    pct >= 80 ? '#22c55e' :
    pct >= 60 ? '#f59e0b' :
    pct >  0  ? '#ef4444' : '#404040'

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* SVG is rotated -90° so progress starts at top */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="-rotate-90"
        aria-hidden
      >
        {/* Track */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="#2c2c2c"
          strokeWidth="8"
        />
        {/* Progress */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1), stroke 0.4s' }}
        />
      </svg>

      {/* Label — counter-rotate to stay upright */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display font-bold leading-none"
          style={{ fontSize: size * 0.22, color }}
        >
          {score != null ? score : '–'}
        </span>
        {score != null && (
          <span className="font-mono text-ink-faint" style={{ fontSize: size * 0.1 }}>
            /100
          </span>
        )}
      </div>
    </div>
  )
}
