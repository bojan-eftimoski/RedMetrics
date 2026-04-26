import type { Map as MapboxMap } from 'mapbox-gl'

/**
 * Cinematic camera flight: zoom from a Europe-wide view down to the Genoa
 * coast, with a brief "wave & wind" zoom-in detour over the bloom water at
 * t=3–7s when the bloom enters AMBER.
 *
 * Pacing — total map sequence finishes by t=22s so the iPhone reveal can take
 * over cleanly.
 *
 * Pitch capped at 30° — high pitch in mercator can produce missing tiles on
 * some GPU drivers.
 */

interface Waypoint {
  startMs: number
  durMs: number
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
}

const WAYPOINTS: Waypoint[] = [
  // 0s — start: Europe-wide.
  { startMs: 0,     durMs: 0,    center: [12.0, 48.0], zoom: 3.6, pitch: 0,  bearing: 0 },
  // 0→2s — descend into northern Italy.
  { startMs: 0,     durMs: 2000, center: [10.0, 44.5], zoom: 5.6, pitch: 15, bearing: -4 },
  // 2→3s — Ligurian Sea (AMBER threshold reached).
  { startMs: 2000,  durMs: 1000, center: [9.0, 44.05], zoom: 7.4, pitch: 25, bearing: 4 },
  // 3→4s — ZOOM IN on the bloom water (wave/wind moment begins).
  { startMs: 3000,  durMs: 1000, center: [8.96, 44.06], zoom: 9.8, pitch: 30, bearing: 8 },
  // 4→5.5s — slow drift while waves visibly carry the bloom toward shore.
  { startMs: 4000,  durMs: 1500, center: [8.97, 44.10], zoom: 9.7, pitch: 30, bearing: 14 },
  // 5.5→7s — zoom back out and glide toward Genoa coast.
  { startMs: 5500,  durMs: 1500, center: [8.97, 44.20], zoom: 8.4, pitch: 30, bearing: 16 },
  // 7→9s — settle on Genoa coast.
  { startMs: 7000,  durMs: 2000, center: [8.97, 44.22], zoom: 8.6, pitch: 30, bearing: 18 },
  // 9→16s — slow orbit while bloom impacts coast.
  { startMs: 9000,  durMs: 7000, center: [8.96, 44.30], zoom: 8.9, pitch: 30, bearing: 32 },
  // 16→22s — close-in on impacted coastline; hold for iPhone phase.
  { startMs: 16000, durMs: 6000, center: [8.93, 44.40], zoom: 9.4, pitch: 30, bearing: 18 },
]

export interface CameraController {
  reset: () => void
  cancel: () => void
}

export function startCameraSequence(
  map: MapboxMap,
  durationMs: number,
): CameraController {
  let cancelled = false
  const timeouts: ReturnType<typeof setTimeout>[] = []

  const start = WAYPOINTS[0]
  map.jumpTo({
    center: start.center,
    zoom: start.zoom,
    pitch: start.pitch,
    bearing: start.bearing,
  })

  for (let i = 1; i < WAYPOINTS.length; i++) {
    const wp = WAYPOINTS[i]
    if (wp.startMs >= durationMs) continue
    const handle = setTimeout(() => {
      if (cancelled) return
      map.flyTo({
        center: wp.center,
        zoom: wp.zoom,
        pitch: wp.pitch,
        bearing: wp.bearing,
        duration: wp.durMs,
        essential: true,
        easing: smoothStep,
      })
    }, wp.startMs)
    timeouts.push(handle)
  }

  const reset = (): void => {
    map.jumpTo({
      center: start.center,
      zoom: start.zoom,
      pitch: start.pitch,
      bearing: start.bearing,
    })
  }

  const cancel = (): void => {
    cancelled = true
    timeouts.forEach((h) => clearTimeout(h))
    map.stop()
  }

  return { reset, cancel }
}

function smoothStep(t: number): number {
  return t * t * (3 - 2 * t)
}
