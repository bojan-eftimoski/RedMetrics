import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { BloomTimelineFrame } from '../types'

/**
 * iPhone overlay that slides in during the last act of the sequence:
 * lock screen → push notification → simulated tap → app screen reveal.
 *
 * Timing (relative to sequence tSec):
 *   22.0  phone starts sliding in from off-screen left
 *   23.5  settled at left edge (~30px from screen left), lock screen visible
 *   24.5  notification banner slides in
 *   26.5  map starts blurring + phone slides toward centre, scaling up
 *   27.5  cursor arrives over notification
 *   27.8  tap ripple
 *   28.0  app screen reveals (cross-fade)
 *   28→32 holds in foreground; loop restarts cleanly
 */

interface Props {
  tSec: number
  frame: BloomTimelineFrame
}

const T_ENTER_START = 22.0
const T_ENTER_END = 23.5
const T_NOTIF_START = 24.5
const T_BLUR_START = 26.5
const T_CENTER_END = 27.5
const T_POINTER_AT_TARGET = 27.5
const T_TAP_START = 27.8
const T_TAP_END = 28.1
const T_APP_FADE_START = 28.0
const T_APP_FADE_END = 28.6
const T_FADE_OUT_START = 31.4

const PHONE_WIDTH = 280
const PHONE_HEIGHT = 580
const REST_LEFT_MARGIN_PX = 30 // distance from screen left to phone left edge at rest
const OFFSCREEN_LEFT_PX = -PHONE_WIDTH - 80 // fully off-screen left
const CENTER_SCALE = 1.15

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

export function IPhoneOverlay({ tSec, frame }: Props) {
  const [vw, setVw] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1920,
  )
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (tSec < T_ENTER_START - 0.05) return null

  const enterT = smoothstep(T_ENTER_START, T_ENTER_END, tSec)
  const centerT = smoothstep(T_BLUR_START, T_CENTER_END, tSec)
  const outT = smoothstep(T_FADE_OUT_START, 32, tSec)

  const scale = lerp(1, CENTER_SCALE, centerT)
  // Pixel position of phone's LEFT EDGE.
  const restLeftEdge = lerp(OFFSCREEN_LEFT_PX, REST_LEFT_MARGIN_PX, enterT)
  const centerLeftEdge = vw / 2 - (PHONE_WIDTH * scale) / 2
  const leftEdgePx = lerp(restLeftEdge, centerLeftEdge, centerT)
  const opacity = enterT * (1 - outT)

  const phoneStyle: CSSProperties = {
    position: 'absolute',
    left: `${leftEdgePx}px`,
    top: '50%',
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    transform: `translateY(-50%) scale(${scale})`,
    transformOrigin: 'left center',
    opacity,
    willChange: 'transform, left, opacity',
  }

  const showNotif = tSec >= T_NOTIF_START && tSec < T_APP_FADE_END
  const showPointer = tSec >= T_POINTER_AT_TARGET - 0.6 && tSec < T_TAP_END + 0.2
  const tapping = tSec >= T_TAP_START && tSec < T_TAP_END
  const appT = smoothstep(T_APP_FADE_START, T_APP_FADE_END, tSec)

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div style={phoneStyle}>
        <PhoneShell>
          <LockScreen show={appT < 1} appT={appT} />
          <AppScreen show={appT > 0} appT={appT} frame={frame} />
          <NotificationBanner
            show={showNotif}
            tappedT={smoothstep(T_TAP_START, T_TAP_END, tSec)}
          />
          {showPointer && <Cursor tSec={tSec} tapping={tapping} />}
        </PhoneShell>
      </div>
    </div>
  )
}

function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative h-full w-full"
      style={{
        background: 'linear-gradient(145deg, #2a2a2c 0%, #0a0a0c 60%, #1a1a1c 100%)',
        borderRadius: 44,
        padding: 7,
        boxShadow:
          '0 0 0 2px #353537, 0 0 0 3px #0a0a0a, 0 32px 80px -10px rgba(0,0,0,0.85), 0 18px 36px -18px rgba(0, 209, 255, 0.18)',
      }}
    >
      <div
        className="relative h-full w-full overflow-hidden"
        style={{ borderRadius: 38, background: '#1B1E26' }}
      >
        {/* Dynamic island */}
        <div
          className="absolute z-30"
          style={{
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 105,
            height: 30,
            background: 'black',
            borderRadius: 16,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        />
        {/* Status bar */}
        <div
          className="absolute z-20 flex items-center justify-between px-7"
          style={{ top: 12, left: 0, right: 0, height: 28, fontSize: 11, color: 'white' }}
        >
          <span className="font-semibold">9:42</span>
          <span className="flex items-center gap-1 text-[10px]">
            <span>●●●●</span>
            <span style={{ color: '#00D1FF' }}>●</span>
            <span className="ml-1 inline-block h-2 w-4 rounded-sm border border-white/70">
              <span className="block h-full w-3/4 rounded-[1px] bg-white/90" />
            </span>
          </span>
        </div>
        {children}
      </div>
      {/* Side buttons (subtle) */}
      <div className="absolute left-[-2px] top-[120px] h-[26px] w-[3px] rounded-l bg-[#1a1a1c]" />
      <div className="absolute left-[-2px] top-[170px] h-[44px] w-[3px] rounded-l bg-[#1a1a1c]" />
      <div className="absolute left-[-2px] top-[226px] h-[44px] w-[3px] rounded-l bg-[#1a1a1c]" />
      <div className="absolute right-[-2px] top-[180px] h-[70px] w-[3px] rounded-r bg-[#1a1a1c]" />
    </div>
  )
}

function LockScreen({ show, appT }: { show: boolean; appT: number }) {
  if (!show) return null
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-start"
      style={{
        opacity: 1 - appT,
        background:
          'radial-gradient(ellipse at top, rgba(0,209,255,0.12) 0%, transparent 60%), radial-gradient(ellipse at bottom, rgba(255,0,0,0.10) 0%, transparent 55%), #1B1E26',
      }}
    >
      <div className="mt-[68px] text-center">
        <div className="text-[11px] uppercase tracking-widest" style={{ color: '#64748B' }}>
          Saturday, July 23
        </div>
        <div
          className="mt-1 font-light leading-none"
          style={{ fontSize: 78, color: 'white', letterSpacing: '-0.02em' }}
        >
          9:42
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[10px]" style={{ color: '#64748B' }}>
        <span>🔒</span>
        <span>Locked</span>
      </div>

      {/* Lock indicator at bottom */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center">
        <div className="h-1 w-[110px] rounded-full bg-white/40" />
      </div>
    </div>
  )
}

/**
 * App screen layout — explicit pixel positions chosen so nothing overlaps:
 *   header        50–86
 *   hero card     96–214   (height 118)
 *   mini map     224–312   (height  88)
 *   stats grid   322–432   (height 110)
 *   CTA button   bottom-anchored
 *   home bar     bottom 4
 */
function AppScreen({
  show,
  appT,
  frame,
}: {
  show: boolean
  appT: number
  frame: BloomTimelineFrame
}) {
  if (!show) return null
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        opacity: appT,
        background: '#1B1E26',
        transform: `scale(${lerp(0.96, 1, appT)})`,
        transition: 'transform 80ms linear',
      }}
    >
      {/* App nav header */}
      <div
        className="absolute left-0 right-0 flex items-center justify-between px-5"
        style={{ top: 50, height: 36 }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              background: 'linear-gradient(145deg, #FF0000 0%, #000080 100%)',
              boxShadow: '0 4px 12px -4px rgba(255,0,0,0.6)',
            }}
          >
            <span className="text-[12px]">🌊</span>
          </div>
          <div>
            <div className="text-[14px] font-bold leading-tight" style={{ color: 'white' }}>
              TideAlert
            </div>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: '#64748B' }}>
              Live · Genoa
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full px-2 py-1"
          style={{ background: 'rgba(255,0,0,0.15)' }}
        >
          <span
            className="block h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ background: '#FF0000' }}
          />
          <span className="text-[9px] font-bold uppercase" style={{ color: '#FF0000' }}>
            Critical
          </span>
        </div>
      </div>

      {/* Hero alert card */}
      <div
        className="absolute left-4 right-4 overflow-hidden rounded-2xl p-4"
        style={{
          top: 96,
          height: 118,
          background:
            'linear-gradient(135deg, rgba(255,0,0,0.25) 0%, rgba(0,0,128,0.45) 100%)',
          border: '1px solid rgba(255,0,0,0.35)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: '#FF0000' }}
        >
          Stage 2 RRI Alert
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="font-bold leading-none" style={{ fontSize: 40, color: 'white' }}>
            {frame.rri.toFixed(0)}
          </div>
          <div className="text-[12px]" style={{ color: '#64748B' }}>
            / 100 RRI
          </div>
        </div>
        <div className="mt-2 text-[10px] leading-snug" style={{ color: '#00D1FF' }}>
          Bloom probability {(frame.bloomProbability * 100).toFixed(0)}% · onshore wind {frame.windSpeedMs.toFixed(1)} m/s
        </div>
      </div>

      {/* Mini location card */}
      <div
        className="absolute left-4 right-4 overflow-hidden rounded-2xl"
        style={{
          top: 224,
          height: 88,
          background: 'rgba(0, 209, 255, 0.06)',
          border: '1px solid rgba(0, 209, 255, 0.18)',
        }}
      >
        <MiniMap frame={frame} />
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold leading-tight" style={{ color: 'white' }}>
              Voltri → Boccadasse
            </div>
            <div className="text-[9px]" style={{ color: '#64748B' }}>
              {frame.center[1].toFixed(2)}°N · {frame.center[0].toFixed(2)}°E
            </div>
          </div>
          <div className="text-[9px] font-bold" style={{ color: '#00D1FF' }}>
            {frame.radiusKm.toFixed(0)} km
          </div>
        </div>
      </div>

      {/* Stats grid 2x2 */}
      <div
        className="absolute left-4 right-4 grid grid-cols-2 gap-2"
        style={{ top: 322 }}
      >
        <Stat label="Fish kills" value="12,400" accent="#FF0000" />
        <Stat label="Admissions" value="+87" accent="#FF0000" />
        <Stat label="Coastline closed" value="11 km" accent="#00D1FF" />
        <Stat label="Payout" value="€187K" accent="#00D1FF" />
      </div>

      {/* CTA button (bottom-anchored) */}
      <div className="absolute bottom-12 left-4 right-4">
        <div
          className="flex items-center justify-center gap-2 rounded-full py-3 text-[12px] font-bold uppercase tracking-wider"
          style={{
            background: '#00D1FF',
            color: '#000080',
            boxShadow: '0 8px 24px -8px rgba(0,209,255,0.6)',
          }}
        >
          <span>📍</span>
          <span>View live map</span>
        </div>
        <div className="mt-2 text-center text-[9px]" style={{ color: '#64748B' }}>
          Powered by Sentinel-2 + ERA5 + CMEMS
        </div>
      </div>

      {/* Home indicator */}
      <div className="absolute bottom-1 left-0 right-0 flex justify-center">
        <div className="h-1 w-[110px] rounded-full bg-white/40" />
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="rounded-xl p-2.5"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="text-[9px] uppercase tracking-wider leading-tight"
        style={{ color: '#64748B' }}
      >
        {label}
      </div>
      <div className="mt-0.5 text-[16px] font-bold leading-tight" style={{ color: accent }}>
        {value}
      </div>
    </div>
  )
}

function MiniMap({ frame }: { frame: BloomTimelineFrame }) {
  // Stylised SVG of the Ligurian coastline with a pulsing red dot at the
  // bloom centre. Not interactive — purely decorative.
  const xPct = clamp01((frame.center[0] - 8.7) / 0.5) * 100
  const yPct = clamp01(1 - (frame.center[1] - 43.95) / 0.5) * 100
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <rect x="0" y="0" width="100" height="100" fill="#0c1a2c" />
      <path
        d="M 0,30 C 18,28 28,22 38,18 C 50,14 60,18 72,16 C 84,15 92,18 100,22 L 100,0 L 0,0 Z"
        fill="rgba(0,209,255,0.16)"
        stroke="#00D1FF"
        strokeWidth="0.6"
      />
      <circle cx={xPct} cy={yPct} r="4" fill="#FF0000" opacity="0.85">
        <animate
          attributeName="r"
          values="3;6;3"
          dur="1.6s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.9;0.4;0.9"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx={xPct} cy={yPct} r="2" fill="#FF0000" />
    </svg>
  )
}

function NotificationBanner({ show, tappedT }: { show: boolean; tappedT: number }) {
  if (!show) return null
  return (
    <div
      className="ta-notif-banner absolute z-20"
      style={{
        top: 110,
        left: 12,
        right: 12,
        opacity: 1 - tappedT * 0.85,
        transform: `scale(${lerp(1, 0.94, tappedT)})`,
      }}
    >
      <div
        className="rounded-2xl p-3"
        style={{
          background: 'rgba(28, 30, 38, 0.78)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 12px 28px -8px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-start gap-2.5">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{
              background: 'linear-gradient(145deg, #FF0000 0%, #000080 100%)',
            }}
          >
            <span className="text-[14px]">🌊</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'white' }}
              >
                TideAlert
              </span>
              <span className="text-[9px]" style={{ color: '#64748B' }}>
                now
              </span>
            </div>
            <div
              className="mt-0.5 text-[11px] font-bold leading-tight"
              style={{ color: 'white' }}
            >
              🔴 Red Tide Alert · Genoa Coast
            </div>
            <div
              className="mt-0.5 text-[10px] leading-snug"
              style={{ color: '#94a3b8' }}
            >
              RRI 88 · CRITICAL · Beaches closing. Tap to view live map.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Cursor({ tSec, tapping }: { tSec: number; tapping: boolean }) {
  const enterT = smoothstep(T_POINTER_AT_TARGET - 0.6, T_POINTER_AT_TARGET, tSec)
  const fromX = 240
  const fromY = 460
  const toX = 200
  const toY = 145
  const x = lerp(fromX, toX, enterT)
  const y = lerp(fromY, toY, enterT)

  return (
    <div
      className="absolute z-40"
      style={{
        left: x,
        top: y,
        transform: 'translate(-25%, -25%)',
        transition: 'left 180ms ease-out, top 180ms ease-out',
      }}
    >
      <div className="relative">
        <div
          className="h-7 w-7 rounded-full"
          style={{
            background: 'rgba(255,255,255,0.92)',
            boxShadow:
              '0 4px 14px -2px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(0,0,0,0.08)',
            transform: tapping ? 'scale(0.78)' : 'scale(1)',
            transition: 'transform 100ms ease-out',
          }}
        />
        {tapping && <span className="ta-tap-ripple absolute" style={{ inset: -4 }} />}
      </div>
    </div>
  )
}
