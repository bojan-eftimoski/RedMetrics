import type { Map as MapboxMap } from 'mapbox-gl'

/**
 * Cinematic camera flight: zoom from a Europe-wide view down to the Genoa
 * coast. Pitch values are kept low (≤30°) for maximum compatibility — high
 * pitch in mercator can produce black/missing tiles on some GPU drivers.
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
  // 0s — start: Europe-wide, top-down.
  { startMs: 0,     durMs: 0,    center: [12.0, 48.0], zoom: 3.6, pitch: 0,  bearing: 0 },
  // 0→3s — descend into northern Italy.
  { startMs: 0,     durMs: 3000, center: [10.0, 44.5], zoom: 5.6, pitch: 15, bearing: -4 },
  // 3→6s — Ligurian Sea, light tilt.
  { startMs: 3000,  durMs: 3000, center: [9.0, 44.05], zoom: 7.4, pitch: 25, bearing: 4 },
  // 6→12s — settle on Genoa coast.
  { startMs: 6000,  durMs: 6000, center: [8.97, 44.20], zoom: 8.6, pitch: 30, bearing: 12 },
  // 12→22s — orbit while bloom impacts the coast.
  { startMs: 12000, durMs: 10000, center: [8.96, 44.30], zoom: 8.9, pitch: 30, bearing: 28 },
  // 22→30s — close-in on impacted coastline.
  { startMs: 22000, durMs: 8000, center: [8.93, 44.40], zoom: 9.4, pitch: 30, bearing: 18 },
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
