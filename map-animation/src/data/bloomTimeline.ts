import type { BloomTimelineFrame } from '../types'

/**
 * 30-second bloom progression off the Ligurian coast (Genoa).
 *
 * Modelled on the documented 2005 Genoa _Ostreopsis ovata_ outbreak. Numbers
 * are calibrated against the actual TideAlert pipeline (see
 * RedMetrics/models/):
 *
 *   • Severity tiers (severity.py): GREEN ≤30, AMBER ≤60, RED ≤85, CRITICAL >85
 *   • Stage 2 RRI inputs (calculate.py):
 *       LIGURIAN_SHORE_NORMAL = 160°  (coast faces SE → wind FROM 160° = onshore)
 *       WIND_REFERENCE_MAX_MS = 15.0  (saturates at 15 m/s)
 *       WAVE_REFERENCE_M      = 0.5   (1.0 m wave → factor 2.0, capped)
 *       TOXIN_MULTIPLIER_DECLINING = 1.5 when chl_a_7d_rate < 0
 *   • Stage 4 trigger (trigger.py):
 *       Fires when RRI > 70 AND consecutive_days ≥ 5 AND DO < 5.0 AND pH < 7.95
 *
 * RRI in this timeline is what `calculate_rri()` would return for the same
 * (bloom_probability, wind_speed, wind_direction=160°, wave_height) inputs —
 * verified by hand for spot-check frames.
 *
 * To swap in real Stage 1 + Stage 2 pipeline output, replace this array with
 * frames generated from rri_scores rows (see ../README.md).
 */
export const DEFAULT_BLOOM_TIMELINE: BloomTimelineFrame[] = [
  // Pre-bloom: low chl-a, low wind. RRI green.
  { t: 0,  center: [8.95, 44.00], intensity: 0.00, radiusKm: 0,  bloomProbability: 0.05, windSpeedMs: 4.0,  windDirectionDeg: 145, waveHeightM: 0.4, rri: 0,  severity: 'GREEN' },
  // Bloom forms; Stage 1 probability climbing as chl-a + SST cross thresholds.
  { t: 2,  center: [8.95, 44.02], intensity: 0.25, radiusKm: 12, bloomProbability: 0.32, windSpeedMs: 6.5,  windDirectionDeg: 152, waveHeightM: 0.6, rri: 18, severity: 'GREEN' },
  // Onshore push picking up; chl_a 7-day rate still positive (no toxin boost yet).
  { t: 4,  center: [8.96, 44.06], intensity: 0.45, radiusKm: 18, bloomProbability: 0.58, windSpeedMs: 8.5,  windDirectionDeg: 158, waveHeightM: 0.7, rri: 34, severity: 'AMBER' },
  // Bloom drifting north; bloom_probability above 0.7, wave height crosses reference.
  { t: 7,  center: [8.97, 44.12], intensity: 0.65, radiusKm: 24, bloomProbability: 0.74, windSpeedMs: 9.5,  windDirectionDeg: 160, waveHeightM: 0.9, rri: 52, severity: 'AMBER' },
  // Stage 1 ≈ 0.85; chl_a starts declining → toxin multiplier kicks in (×1.5).
  { t: 10, center: [8.97, 44.18], intensity: 0.80, radiusKm: 28, bloomProbability: 0.85, windSpeedMs: 10.5, windDirectionDeg: 162, waveHeightM: 1.0, rri: 64, severity: 'RED' },
  // Crosses RRI 70 — Stage 4 trigger countdown begins.
  { t: 13, center: [8.98, 44.24], intensity: 0.92, radiusKm: 30, bloomProbability: 0.91, windSpeedMs: 11.5, windDirectionDeg: 161, waveHeightM: 1.1, rri: 74, severity: 'RED' },
  // RED tier sustained.
  { t: 16, center: [8.97, 44.30], intensity: 1.00, radiusKm: 32, bloomProbability: 0.95, windSpeedMs: 12.0, windDirectionDeg: 160, waveHeightM: 1.2, rri: 82, severity: 'RED' },
  // Crosses CRITICAL threshold; Stage 4 will escalate from RED to CRITICAL payout if duration ≥ 7d.
  { t: 19, center: [8.96, 44.35], intensity: 1.00, radiusKm: 33, bloomProbability: 0.97, windSpeedMs: 12.5, windDirectionDeg: 159, waveHeightM: 1.3, rri: 88, severity: 'CRITICAL' },
  // Bloom impacting coast.
  { t: 22, center: [8.95, 44.39], intensity: 1.00, radiusKm: 34, bloomProbability: 0.98, windSpeedMs: 12.5, windDirectionDeg: 158, waveHeightM: 1.4, rri: 92, severity: 'CRITICAL' },
  // Peak — coastline saturated.
  { t: 26, center: [8.93, 44.41], intensity: 0.98, radiusKm: 34, bloomProbability: 0.97, windSpeedMs: 12.0, windDirectionDeg: 157, waveHeightM: 1.4, rri: 94, severity: 'CRITICAL' },
  // Wind starts to ease; bloom slowly disperses west.
  { t: 30, center: [8.91, 44.42], intensity: 0.95, radiusKm: 34, bloomProbability: 0.96, windSpeedMs: 11.0, windDirectionDeg: 155, waveHeightM: 1.3, rri: 93, severity: 'CRITICAL' },
]

export function sampleTimeline(
  frames: BloomTimelineFrame[],
  tSeconds: number,
): BloomTimelineFrame {
  if (tSeconds <= frames[0].t) return frames[0]
  const last = frames[frames.length - 1]
  if (tSeconds >= last.t) return last

  let i = 0
  while (i < frames.length - 1 && frames[i + 1].t < tSeconds) i++
  const a = frames[i]
  const b = frames[i + 1]
  const u = (tSeconds - a.t) / (b.t - a.t)
  const lerp = (x: number, y: number) => x + (y - x) * u

  return {
    t: tSeconds,
    center: [lerp(a.center[0], b.center[0]), lerp(a.center[1], b.center[1])],
    intensity: lerp(a.intensity, b.intensity),
    radiusKm: lerp(a.radiusKm, b.radiusKm),
    bloomProbability: lerp(a.bloomProbability, b.bloomProbability),
    windSpeedMs: lerp(a.windSpeedMs, b.windSpeedMs),
    windDirectionDeg: lerp(a.windDirectionDeg, b.windDirectionDeg),
    waveHeightM: lerp(a.waveHeightM, b.waveHeightM),
    rri: lerp(a.rri, b.rri),
    severity: u < 0.5 ? a.severity : b.severity,
  }
}
