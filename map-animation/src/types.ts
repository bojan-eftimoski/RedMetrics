export type SeverityTier = 'GREEN' | 'AMBER' | 'RED' | 'CRITICAL'

export interface BloomTimelineFrame {
  /** Seconds from sequence start. */
  t: number
  /** Bloom centre, [lon, lat]. Drifts over time. */
  center: [number, number]
  /** 0–1 intensity (peak red opacity). */
  intensity: number
  /** Bloom footprint radius in km. */
  radiusKm: number
  /** Stage 1 LightGBM bloom probability ∈ [0, 1]. */
  bloomProbability: number
  /** ERA5 wind speed at 10 m, m/s. Saturates at 15 (Stage 2 WIND_REFERENCE_MAX_MS). */
  windSpeedMs: number
  /** ERA5 wind direction (deg from N, met convention = direction wind comes FROM). */
  windDirectionDeg: number
  /** ERA5 significant wave height, m. Saturates at 1.0 (Stage 2 WAVE_REFERENCE × cap). */
  waveHeightM: number
  /** Stage 2 RRI score 0–100. Drives the severity badge + Stage 4 trigger. */
  rri: number
  severity: SeverityTier
}

export interface TideAlertMapProps {
  /** Mapbox access token. Falls back to import.meta.env.VITE_MAPBOX_TOKEN. */
  mapboxToken?: string
  /** Start the cinematic sequence on mount. Default true. */
  autoplay?: boolean
  /** Total sequence duration in milliseconds. Default 30000. */
  durationMs?: number
  /** Loop the sequence forever. Default true. */
  loop?: boolean
  /** Callback when one full sequence finishes (still fired in loop mode). */
  onComplete?: () => void
  /** Show timeline scrubber + severity badge. Default false (clean pitch view). */
  showControls?: boolean
  /** Override the default bloom progression. */
  bloomTimeline?: BloomTimelineFrame[]
  /** Mapbox style URL. Default: satellite-streets-v12. */
  styleUrl?: string
  /** Render the wind particle overlay. Default true. */
  showWind?: boolean
  /** Extra wrapper className (Tailwind-friendly). */
  className?: string
}
