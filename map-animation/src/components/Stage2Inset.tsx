import type { BloomTimelineFrame } from '../types'

/**
 * Stage 2 educational inset — appears briefly when the bloom enters AMBER
 * (RRI > 30) and explains the two physics multipliers in the Stage 2 RRI
 * formula:
 *
 *   rri = bloom_probability × wind_normalized × wave_factor × toxin_multiplier × 100
 *
 * Constants referenced (from models/stage2_aerosolisation_rri/calculate.py):
 *   LIGURIAN_SHORE_NORMAL = 160°  (coast-facing direction)
 *   WIND_REFERENCE_MAX_MS = 15.0  (wind saturation)
 *   WAVE_REFERENCE_M      = 0.5   (wave reference)
 *   WAVE_FACTOR_CAP       = 2.0
 */

interface Props {
  tSec: number
  frame: BloomTimelineFrame
}

const T_SHOW_START = 3.0
const T_FULL_IN = 3.6
const T_FULL_OUT = 6.0
const T_HIDE_END = 6.6

const SHORE_NORMAL = 160
const WIND_REF_MS = 15
const WAVE_REF_M = 0.5

export function Stage2Inset({ tSec, frame }: Props) {
  if (tSec < T_SHOW_START || tSec > T_HIDE_END) return null

  // Fade in/out
  const fadeIn = clamp01((tSec - T_SHOW_START) / (T_FULL_IN - T_SHOW_START))
  const fadeOut = clamp01((tSec - T_FULL_OUT) / (T_HIDE_END - T_FULL_OUT))
  const opacity = Math.min(fadeIn, 1 - fadeOut)
  const slide = (1 - fadeIn) * 8 - fadeOut * 8 // px translateY for a soft glide

  // Live values from the timeline
  const wave = frame.waveHeightM
  const waveFactor = Math.min(wave / WAVE_REF_M, 2.0)
  const wind = frame.windSpeedMs
  const angleDelta = Math.abs(frame.windDirectionDeg - SHORE_NORMAL)
  const onshoreProj = Math.max(0, Math.cos((angleDelta * Math.PI) / 180))
  const windOnshore = wind * onshoreProj
  const windNorm = Math.min(windOnshore / WIND_REF_MS, 1)

  return (
    <div
      className="pointer-events-none absolute z-20 flex flex-col items-center gap-2"
      style={{
        top: 24,
        left: '50%',
        transform: `translateX(-50%) translateY(${slide}px)`,
        opacity,
        transition: 'opacity 200ms linear, transform 200ms linear',
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">
        Stage 2 · Aerosolisation physics
      </div>
      <div className="flex gap-3">
        <PhysicsCard
          icon="🌊"
          label="Wave-driven aerosol release"
          value={`${waveFactor.toFixed(2)}×`}
          formula={`${wave.toFixed(2)} m / ${WAVE_REF_M} m ref`}
          accent="#00D1FF"
        />
        <PhysicsCard
          icon="💨"
          label="Onshore Sirocco push"
          value={`${(windNorm * 100).toFixed(0)}%`}
          formula={`${wind.toFixed(1)} m/s × cos(${angleDelta.toFixed(0)}°)`}
          accent="#facc15"
        />
      </div>
    </div>
  )
}

function PhysicsCard({
  icon,
  label,
  value,
  formula,
  accent,
}: {
  icon: string
  label: string
  value: string
  formula: string
  accent: string
}) {
  return (
    <div
      className="rounded-xl px-4 py-3 backdrop-blur-md"
      style={{
        background: 'rgba(11, 18, 32, 0.78)',
        border: `1px solid ${accent}33`,
        minWidth: 220,
        boxShadow: `0 8px 24px -8px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.04)`,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>
          {label}
        </span>
      </div>
      <div className="mt-1 text-[22px] font-bold leading-tight text-white">{value}</div>
      <div className="text-[10px] text-white/55">{formula}</div>
    </div>
  )
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}
