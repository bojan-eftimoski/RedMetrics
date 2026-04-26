import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import clsx from 'clsx'

import type { BloomTimelineFrame, SeverityTier, TideAlertMapProps } from './types'
import { DEFAULT_BLOOM_TIMELINE, sampleTimeline } from './data/bloomTimeline'
import { DEFAULT_IMPACT_EVENTS, type ImpactEvent, type ImpactKind } from './data/impactEvents'
import { startCameraSequence } from './cameraSequence'
import { SvgBloom } from './components/SvgBloom'
import { WindCanvas } from './components/WindCanvas'
import { IPhoneOverlay } from './components/IPhoneOverlay'
import { Stage2Inset } from './components/Stage2Inset'
import { WaveOverlay } from './components/WaveOverlay'

const DEFAULT_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12'
const DEFAULT_DURATION_MS = 32_000

/** When (in seconds) the iPhone "centres + map blurs" transition starts. */
const T_BLUR_START = 26.5

interface ProjectedImpact {
  event: ImpactEvent
  x: number
  y: number
  age: number
}

interface BloomScreen {
  cx: number
  cy: number
  rPx: number
  intensity: number
}

interface MapError {
  message: string
  hint?: string
}

const log = (...args: unknown[]) => console.log('[TideAlert]', ...args)

/**
 * Drop-in 3D animated map for the TideAlert pitch site.
 *
 * Renders a Mapbox globe view of Europe, flies down to the Ligurian coast,
 * and animates a synthetic harmful-algal-bloom forming offshore, drifting
 * onto Genoa, and triggering coastal impact events (fish kills, hospital
 * admissions, beach closures) — all driven by a JSON timeline.
 *
 * @example
 *   <TideAlertMap autoplay loop showControls={false} />
 */
export function TideAlertMap({
  mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined,
  autoplay = true,
  durationMs = DEFAULT_DURATION_MS,
  loop = true,
  onComplete,
  showControls = false,
  bloomTimeline = DEFAULT_BLOOM_TIMELINE,
  styleUrl = DEFAULT_STYLE,
  showWind = true,
  className,
}: TideAlertMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const sequenceStartMsRef = useRef<number>(0)
  const rafRef = useRef<number | null>(null)
  const cameraRef = useRef<ReturnType<typeof startCameraSequence> | null>(null)

  const [tokenMissing, setTokenMissing] = useState(false)
  const [mapError, setMapError] = useState<MapError | null>(null)
  const [styleLoaded, setStyleLoaded] = useState(false)
  const [currentFrame, setCurrentFrame] = useState<BloomTimelineFrame>(
    bloomTimeline[0],
  )
  const [progress, setProgress] = useState(0)
  const [activeImpacts, setActiveImpacts] = useState<ProjectedImpact[]>([])
  const [bloomScreen, setBloomScreen] = useState<BloomScreen | null>(null)
  const [tSec, setTSec] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return
    if (!mapboxToken) {
      setTokenMissing(true)
      return
    }
    log('init: token length', mapboxToken.length)
    mapboxgl.accessToken = mapboxToken

    let map: mapboxgl.Map
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: [12.0, 48.0],
        zoom: 3.6,
        pitch: 0,
        bearing: 0,
        // antialias intentionally off — caused black-render on some
        // Mac GPU/driver combos. Visual quality is fine without it.
        antialias: false,
        attributionControl: false,
        preserveDrawingBuffer: false,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[TideAlert] Map init failed:', err)
      setMapError({
        message,
        hint: 'Mapbox failed to initialise. Check that WebGL is enabled in your browser.',
      })
      return
    }
    mapRef.current = map

    map.on('error', (e: { error?: Error }) => {
      const raw = e.error?.message ?? 'Unknown Mapbox error'
      console.error('[TideAlert] Mapbox error:', raw, e)
      const lower = raw.toLowerCase()
      const hint =
        lower.includes('401') || lower.includes('unauthor') || lower.includes('token')
          ? 'Your Mapbox token is missing, invalid, or restricted. Generate a fresh public token at https://account.mapbox.com/access-tokens/, paste into .env as VITE_MAPBOX_TOKEN, and restart npm run dev.'
          : lower.includes('style')
            ? 'Mapbox style failed to load — usually a token problem.'
            : undefined
      setMapError({ message: raw, hint })
    })

    map.on('style.load', () => {
      log('style.load fired')
      setStyleLoaded(true)
      // Force resize — on some setups the canvas is created at 0×0 before the
      // container has finished layout, and Mapbox renders to that bad size
      // until something nudges it. resize() reads the container size again.
      map.resize()
      const canvas = map.getCanvas()
      log('canvas size after resize:', canvas.width, '×', canvas.height)
      if (autoplay) startSequence()
    })

    map.on('load', () => log('full load fired'))
    map.on('idle', () => log('idle (all tiles + render done)'))

    return () => {
      cameraRef.current?.cancel()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken, styleUrl])

  function startSequence() {
    const map = mapRef.current
    if (!map) return
    log('sequence start')

    cameraRef.current?.cancel()
    cameraRef.current = startCameraSequence(map, durationMs)
    sequenceStartMsRef.current = performance.now()

    const tick = () => {
      const elapsed = performance.now() - sequenceStartMsRef.current
      const tSecLocal = (elapsed / 1000) % (durationMs / 1000)
      const wrapped = elapsed >= durationMs

      if (wrapped) {
        onComplete?.()
        if (!loop) return
        sequenceStartMsRef.current = performance.now()
        cameraRef.current?.cancel()
        cameraRef.current = startCameraSequence(map, durationMs)
      }

      const frame = sampleTimeline(bloomTimeline, tSecLocal)
      setCurrentFrame(frame)
      setProgress(elapsed / durationMs)
      setTSec(tSecLocal)

      // Project bloom centre + radius edge to screen pixels.
      if (frame.intensity > 0.005 && frame.radiusKm > 0) {
        const center = map.project(frame.center)
        // 1° latitude ≈ 111 km — project a point at radius distance to the east
        // and measure the on-screen pixel distance for the current zoom/pitch.
        const radiusDeg = frame.radiusKm / 111
        const cosLat = Math.cos((frame.center[1] * Math.PI) / 180)
        const edgePoint: [number, number] = [
          frame.center[0] + radiusDeg / Math.max(cosLat, 0.1),
          frame.center[1],
        ]
        const edge = map.project(edgePoint)
        const rPx = Math.hypot(edge.x - center.x, edge.y - center.y)
        setBloomScreen({
          cx: center.x,
          cy: center.y,
          rPx,
          intensity: frame.intensity,
        })
      } else {
        setBloomScreen(null)
      }

      // Project impact events.
      const projected: ProjectedImpact[] = []
      for (const ev of DEFAULT_IMPACT_EVENTS) {
        if (tSecLocal < ev.t) continue
        const p = map.project(ev.position as [number, number])
        projected.push({ event: ev, x: p.x, y: p.y, age: tSecLocal - ev.t })
      }
      setActiveImpacts(projected)

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function handleReplay() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    cameraRef.current?.cancel()
    setActiveImpacts([])
    setBloomScreen(null)
    setTSec(0)
    startSequence()
  }

  const mapBlurred = tSec >= T_BLUR_START && tSec < (durationMs / 1000) - 0.4

  if (tokenMissing) {
    return <TokenMissingPanel className={className} />
  }

  return (
    <div
      className={clsx(
        'relative h-full w-full overflow-hidden bg-black',
        mapBlurred && 'ta-map-blurred',
        className,
      )}
    >
      {/* Everything map-related goes inside ta-map-content so they all blur
          together when the iPhone takes over the foreground. */}
      <div className="ta-map-content absolute inset-0">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Wind particles (separate Canvas2D, no GL conflict with Mapbox) */}
        {showWind && styleLoaded && <WindCanvas map={mapRef.current} />}

        {/* Cinematic vignette */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.45)_100%)]" />

        {/* Animated red-tide bloom */}
        {bloomScreen && (
          <SvgBloom
            cx={bloomScreen.cx}
            cy={bloomScreen.cy}
            rPx={bloomScreen.rPx}
            intensity={bloomScreen.intensity}
          />
        )}

        {/* Coastal impact pins + popup cards */}
        {activeImpacts.map((p) => (
          <ImpactPin key={p.event.t} projected={p} />
        ))}
      </div>

      {/* Dimming layer that fades in alongside the iPhone reveal. */}
      <div
        className="pointer-events-none absolute inset-0 bg-black"
        style={{
          opacity: mapBlurred ? 0.4 : 0,
          transition: 'opacity 800ms ease-out',
        }}
      />

      {/* Wave overlay — fades in over the camera zoom-in on the bloom water,
          showing surface ripples + carried particles. */}
      {styleLoaded && !mapError && <WaveOverlay tSec={tSec} />}

      {/* Stage 2 educational inset (wave + wind cards), brief AMBER pop. */}
      {styleLoaded && !mapError && (
        <Stage2Inset tSec={tSec} frame={currentFrame} />
      )}

      {/* iPhone overlay (lock screen → notification → tap → app reveal) */}
      {styleLoaded && !mapError && (
        <IPhoneOverlay tSec={tSec} frame={currentFrame} />
      )}

      {!styleLoaded && !mapError && <LoadingPanel />}

      {mapError && <ErrorPanel error={mapError} />}

      {showControls && styleLoaded && !mapError && (
        <ControlOverlay
          frame={currentFrame}
          progress={progress}
          onReplay={handleReplay}
        />
      )}
    </div>
  )
}

const SEVERITY_STYLE: Record<SeverityTier, { label: string; bg: string; text: string }> = {
  GREEN:    { label: 'GREEN',    bg: 'bg-[var(--color-severity-green)]',    text: 'text-white' },
  AMBER:    { label: 'AMBER',    bg: 'bg-[var(--color-severity-amber)]',    text: 'text-white' },
  RED:      { label: 'RED',      bg: 'bg-[var(--color-severity-red)]',      text: 'text-white' },
  CRITICAL: { label: 'CRITICAL', bg: 'bg-[var(--color-severity-critical)]', text: 'text-white' },
}

const KIND_ICON: Record<ImpactKind, string> = {
  rri_alert: '⚠️',
  fish_kill: '🐟',
  hospital_surge: '🏥',
  trigger_fired: '💸',
  beach_closed: '🚫',
  tourism: '🏖️',
}

function ImpactPin({ projected }: { projected: ProjectedImpact }) {
  const { event, x, y, age } = projected
  const showCard = age > 0.45
  return (
    <>
      <div
        className="pointer-events-none absolute z-10"
        style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      >
        <div className="relative h-3.5 w-3.5">
          <div className="ta-pin-ring" />
          <div className="ta-pin-dot" />
        </div>
      </div>
      {showCard && (
        <div
          className="ta-impact-card pointer-events-none absolute z-20 w-[260px] rounded-xl border border-red-500/40 bg-black/85 px-4 py-3 shadow-2xl backdrop-blur-md"
          style={{ left: x, top: y - 14, transform: 'translate(-50%, -100%)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">{KIND_ICON[event.kind]}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
              {event.headline}
            </span>
          </div>
          <div className="mt-1 text-2xl font-bold leading-tight text-white">
            {event.stat}
          </div>
          <div className="mt-0.5 text-[11px] text-white/60">{event.subline}</div>
          <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[8px] border-x-transparent border-t-red-500/40" />
        </div>
      )}
    </>
  )
}

function ControlOverlay({
  frame,
  onReplay,
}: {
  frame: BloomTimelineFrame
  progress: number
  onReplay: () => void
}) {
  const sev = SEVERITY_STYLE[frame.severity]
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
      <div className="pointer-events-auto flex items-start justify-between">
        <div className="flex items-center gap-3 rounded-lg bg-black/60 px-4 py-2 backdrop-blur-md">
          <span className={clsx('rounded-md px-2 py-0.5 text-xs font-bold tracking-wider', sev.bg, sev.text)}>
            {sev.label}
          </span>
          <span className="text-sm text-[var(--color-text)]">RRI {frame.rri.toFixed(0)}</span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {frame.center[1].toFixed(2)}°N · {frame.center[0].toFixed(2)}°E · {frame.radiusKm.toFixed(0)} km
          </span>
        </div>
        <button
          onClick={onReplay}
          className="rounded-md bg-black/60 px-3 py-1.5 text-xs text-[var(--color-text)] backdrop-blur-md hover:bg-black/80"
        >
          Replay
        </button>
      </div>
    </div>
  )
}

function LoadingPanel() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
      <div className="rounded-lg bg-black/70 px-5 py-3 text-sm text-white/80 backdrop-blur-md">
        Loading satellite imagery…
      </div>
    </div>
  )
}

function ErrorPanel({ error }: { error: MapError }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-8">
      <div className="max-w-lg rounded-xl border border-red-500/40 bg-[var(--color-bg)] p-6 shadow-2xl">
        <div className="text-xs font-bold uppercase tracking-widest text-red-400">
          Map error
        </div>
        <div className="mt-2 text-base text-white">{error.message}</div>
        {error.hint && (
          <div className="mt-3 text-sm text-white/70">{error.hint}</div>
        )}
        <div className="mt-4 text-xs text-white/40">
          Open the browser console for more detail (errors are prefixed{' '}
          <code className="rounded bg-white/10 px-1">[TideAlert]</code>).
        </div>
      </div>
    </div>
  )
}

function TokenMissingPanel({ className }: { className?: string }) {
  return (
    <div className={clsx('flex h-full items-center justify-center bg-[var(--color-bg)] p-8 text-center', className)}>
      <div className="max-w-md">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">
          Mapbox token required
        </h2>
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Set <code className="rounded bg-black/40 px-1.5 py-0.5">VITE_MAPBOX_TOKEN</code> in
          your <code className="rounded bg-black/40 px-1.5 py-0.5">.env</code> file (in this
          folder, next to <code className="rounded bg-black/40 px-1.5 py-0.5">package.json</code>),
          then restart <code className="rounded bg-black/40 px-1.5 py-0.5">npm run dev</code>.
          Free tokens at{' '}
          <a
            className="underline"
            href="https://account.mapbox.com/access-tokens/"
            target="_blank"
            rel="noreferrer"
          >
            account.mapbox.com
          </a>
          .
        </p>
      </div>
    </div>
  )
}
