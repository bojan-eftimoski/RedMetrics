import { useEffect, useRef } from 'react'
import type { Map as MapboxMap } from 'mapbox-gl'

/**
 * Animated wind particles, drawn on a STANDALONE Canvas2D layer that sits on
 * top of the Mapbox WebGL canvas. Importantly: this canvas is its own 2D
 * context — it never touches the Mapbox WebGL context, so it cannot corrupt
 * GL state (which is what made the original WebGL custom-layer wind blank
 * out the map).
 *
 * Wind direction is calibrated to the Stage 2 model:
 *   LIGURIAN_SHORE_NORMAL = 160°  (calculate.py)
 *
 * The prevailing wind comes FROM ~160° (Sirocco / SE), which means it pushes
 * particles TOWARD ~340° (NW) — i.e. onshore, toward the Genoa coast. Same
 * vector that drives the bloom drift in the timeline.
 */

interface Particle {
  lon: number
  lat: number
  prevLon: number
  prevLat: number
  age: number
  life: number
}

interface Props {
  map: MapboxMap | null
  /** Particle count. ~600 reads as ambient atmospheric drift, not snowstorm. */
  count?: number
  /** Visual speed multiplier; 1 = realistic, >1 = more dramatic flow. */
  speedScale?: number
}

const SHORE_NORMAL_DEG = 160
const PREVAILING_WIND_FROM_DEG = 160 // wind FROM SE → blows TOWARD NW (onshore)

export function WindCanvas({ map, count = 600, speedScale = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number | null>(null)
  const lastMsRef = useRef<number>(performance.now())

  useEffect(() => {
    if (!map) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    }

    const spawn = (p: Particle) => {
      const bounds = map.getBounds()
      if (!bounds) return
      const sw = bounds.getSouthWest()
      const ne = bounds.getNorthEast()
      // Spawn biased toward the SE half (where the wind enters the frame).
      const u = Math.random()
      const v = Math.random()
      p.lon = sw.lng + u * (ne.lng - sw.lng)
      p.lat = sw.lat + v * (ne.lat - sw.lat)
      p.prevLon = p.lon
      p.prevLat = p.lat
      p.age = 0
      p.life = 50 + Math.random() * 90
    }

    const initParticles = () => {
      particlesRef.current = Array.from({ length: count }, () => {
        const p: Particle = { lon: 0, lat: 0, prevLon: 0, prevLat: 0, age: 0, life: 0 }
        spawn(p)
        return p
      })
    }

    /**
     * Sample wind at (lon, lat) → returns wind vector blowing TOWARD (vx, vy)
     * in degrees-per-second-ish units, suitable for advecting a particle.
     *
     * Built from the Stage 2 onshore-wind model: prevailing wind FROM 160°
     * means particles move TOWARD 340° (north-west), with low-frequency
     * turbulence layered on so the field looks alive.
     */
    const sampleWind = (lon: number, lat: number, tSec: number): [number, number] => {
      // "TOWARD" direction in radians (compass: 0° = N, 90° = E).
      const towardDeg = (PREVAILING_WIND_FROM_DEG + 180) % 360
      const towardRad = (towardDeg * Math.PI) / 180

      // Base flow components in degrees-per-second (visual scale).
      const baseSpeed = 0.05 * speedScale
      let vx = Math.sin(towardRad) * baseSpeed
      let vy = Math.cos(towardRad) * baseSpeed

      // Low-frequency turbulence + slow time evolution.
      const phase = tSec * 0.08
      const swirlA = Math.sin(lon * 0.7 + lat * 0.5 + phase) * 0.018 * speedScale
      const swirlB = Math.cos(lon * 0.5 - lat * 0.6 - phase * 0.7) * 0.018 * speedScale
      vx += swirlA
      vy += swirlB

      return [vx, vy]
    }

    resize()
    initParticles()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const onMove = () => {
      // When the user (or our flyTo) zooms a lot, off-screen particles will
      // never re-enter — re-seed on big camera moves.
      initParticles()
    }
    map.on('zoomend', onMove)

    const tick = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - lastMsRef.current) / 1000)
      lastMsRef.current = now
      const tSec = now / 1000

      // Soft fade trails (motion blur). Higher alpha = shorter trails.
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0,0,0,0.10)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw new segments.
      ctx.globalCompositeOperation = 'source-over'
      ctx.lineWidth = 1.0
      ctx.lineCap = 'round'

      const bounds = map.getBounds()
      if (!bounds) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const sw = bounds.getSouthWest()
      const ne = bounds.getNorthEast()

      for (const p of particlesRef.current) {
        p.prevLon = p.lon
        p.prevLat = p.lat

        const [vx, vy] = sampleWind(p.lon, p.lat, tSec)
        p.lon += vx * dt * 60
        p.lat += vy * dt * 60
        p.age += 1

        const off =
          p.lon < sw.lng - 1 ||
          p.lon > ne.lng + 1 ||
          p.lat < sw.lat - 1 ||
          p.lat > ne.lat + 1
        if (p.age > p.life || off) {
          spawn(p)
          continue
        }

        const a = map.project([p.prevLon, p.prevLat])
        const b = map.project([p.lon, p.lat])
        const speedNorm = Math.min(1, Math.hypot(vx, vy) / 0.07)
        const alpha = 0.09 + 0.28 * speedNorm
        ctx.strokeStyle = `rgba(225, 240, 255, ${alpha})`
        ctx.beginPath()
        ctx.moveTo(a.x * dpr, a.y * dpr)
        ctx.lineTo(b.x * dpr, b.y * dpr)
        ctx.stroke()
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      map.off('zoomend', onMove)
    }
  }, [map, count, speedScale])

  // Reference SHORE_NORMAL_DEG so the constant survives `noUnusedLocals`
  // — it's documented at the top of the file and is the source of truth
  // for the prevailing-wind direction.
  void SHORE_NORMAL_DEG

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ mixBlendMode: 'screen' }}
    />
  )
}
