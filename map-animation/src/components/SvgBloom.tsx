import type { CSSProperties } from 'react'

interface Props {
  /** Centre on screen, in pixels (from map.project). */
  cx: number
  cy: number
  /** Radius in pixels (computed from km via map.project of two points). */
  rPx: number
  /** 0..1 opacity multiplier driven by the timeline. */
  intensity: number
}

/**
 * The animated red-tide bloom, rendered as a stack of blurred SVG circles
 * with a turbulence-driven distortion filter so the edge looks like an
 * organic, wispy mass rather than a perfect circle.
 *
 * Renders into a fullscreen pointer-events:none SVG; the position and radius
 * are recomputed every frame from map.project() in the parent.
 */
export function SvgBloom({ cx, cy, rPx, intensity }: Props) {
  if (intensity <= 0.01 || rPx < 2) return null

  const filterId = 'ta-bloom-distort'
  const coreId = 'ta-bloom-core'
  const haloId = 'ta-bloom-halo'

  // Outer halo extends past the visible edge so coast wash looks gradual.
  const halo = rPx * 1.45
  const core = rPx * 0.55

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: 'visible' }}>
      <defs>
        <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012"
            numOctaves="3"
            seed="7"
          >
            <animate
              attributeName="baseFrequency"
              dur="14s"
              values="0.010;0.018;0.010"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale={Math.min(60, rPx * 0.55)} />
          <feGaussianBlur stdDeviation={Math.max(2, rPx * 0.04)} />
        </filter>

        <radialGradient id={haloId}>
          <stop offset="0%"   stopColor="rgba(220, 38, 38, 0.65)" />
          <stop offset="45%"  stopColor="rgba(180, 24, 24, 0.45)" />
          <stop offset="80%"  stopColor="rgba(120, 14, 24, 0.18)" />
          <stop offset="100%" stopColor="rgba(80, 0, 14, 0)" />
        </radialGradient>

        <radialGradient id={coreId}>
          <stop offset="0%"   stopColor="rgba(255, 90, 50, 0.95)" />
          <stop offset="40%"  stopColor="rgba(220, 38, 38, 0.85)" />
          <stop offset="100%" stopColor="rgba(140, 12, 16, 0.0)" />
        </radialGradient>
      </defs>

      <g filter={`url(#${filterId})`} style={{ opacity: intensity } as CSSProperties}>
        {/* Soft outer halo. */}
        <circle cx={cx} cy={cy} r={halo} fill={`url(#${haloId})`} />
        {/* Mid mass. */}
        <circle cx={cx} cy={cy} r={rPx} fill={`url(#${haloId})`} />
        {/* Hot core. */}
        <circle
          cx={cx}
          cy={cy}
          r={core}
          fill={`url(#${coreId})`}
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: 'ta-bloom-pulse 3.4s ease-in-out infinite',
          }}
        />
      </g>
    </svg>
  )
}
