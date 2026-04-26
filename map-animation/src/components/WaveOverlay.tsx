/**
 * Wave overlay — fades in when the camera zooms in on the bloom water at
 * t≈3s, plays for ~3s, then fades out as the camera zooms back out.
 *
 * Visual: 6 SVG wave crests rising up the screen (pitched view → up = toward
 * shore = NW), plus 18 particles riding along, half tinted red (toxin /
 * bloom material) and half cyan (water spray). Gives the eye a clear "the
 * waves are carrying material toward the coast" read while the Stage 2
 * physics cards explain why.
 */

interface Props {
  tSec: number
}

const T_START = 3.0
const T_FULL_IN = 3.7
const T_FULL_OUT = 5.6
const T_END = 6.3

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

const WAVE_PATH =
  'M 0,15 Q 25,5 50,15 T 100,15 T 150,15 T 200,15'

const WAVE_BANDS = [0, 1, 2, 3, 4, 5]
const PARTICLE_COUNT = 18

export function WaveOverlay({ tSec }: Props) {
  if (tSec < T_START - 0.05 || tSec > T_END + 0.05) return null

  const fadeIn = clamp01((tSec - T_START) / (T_FULL_IN - T_START))
  const fadeOut = clamp01((tSec - T_FULL_OUT) / (T_END - T_FULL_OUT))
  const opacity = Math.min(fadeIn, 1 - fadeOut)

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      style={{ opacity }}
    >
      {WAVE_BANDS.map((i) => (
        <div key={`wave-${i}`} className={`ta-wave-band ta-wave-band-${i}`}>
          <svg
            viewBox="0 0 200 20"
            preserveAspectRatio="none"
            className="block h-full w-full"
          >
            <path
              d={WAVE_PATH}
              stroke={
                i < 2
                  ? 'rgba(255, 90, 60, 0.6)'
                  : 'rgba(220, 240, 255, 0.55)'
              }
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ))}

      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const xPct = (i * 11 + 7) % 100
        const isBloom = i % 3 === 0
        const size = 4 + (i % 3) * 2
        return (
          <div
            key={`p-${i}`}
            className="ta-wave-particle"
            style={{
              left: `${xPct}%`,
              width: size,
              height: size,
              background: isBloom ? '#FF0000' : '#00D1FF',
              color: isBloom ? '#FF0000' : '#00D1FF',
              animationDuration: `${3.5 + (i % 4) * 0.4}s`,
              animationDelay: `${-i * 0.25}s`,
            }}
          />
        )
      })}
    </div>
  )
}
