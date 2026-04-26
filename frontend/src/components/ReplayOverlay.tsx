import { useEffect, useMemo, useRef, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts'
import { SeverityBadge } from './ui/SeverityBadge'
import type { Severity } from '../lib/types'

interface ReplayRow {
  date: string
  bloom_probability: number
  wind_speed: number
  wind_direction: number
  wave_height: number
  chl_a_rate: number
  rri_score: number
  severity_tier: Severity
  bloom_duration_days: number
}

interface ReplayPayload { event: string; rows: ReplayRow[] }

const STEP_MS = 800

export function ReplayOverlay({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<ReplayPayload | null>(null)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    fetch('/genoa_2005_rri_sequence.json')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((p: ReplayPayload) => setData(p))
      .catch(e => setErr(String(e)))
  }, [])

  useEffect(() => {
    if (!playing || !data) return
    intervalRef.current = window.setInterval(() => {
      setStep(s => {
        if (s + 1 >= data.rows.length) {
          setPlaying(false)
          return s
        }
        return s + 1
      })
    }, STEP_MS)
    return () => {
      if (intervalRef.current != null) window.clearInterval(intervalRef.current)
    }
  }, [playing, data])

  const visible = useMemo(() => data?.rows.slice(0, step + 1) ?? [], [data, step])
  const current = visible[visible.length - 1]
  const triggerStep = data?.rows.findIndex(r => r.bloom_duration_days >= 5 && r.rri_score > 70) ?? -1
  const triggerFired = triggerStep >= 0 && step >= triggerStep

  if (err) {
    return (
      <Backdrop onClose={onClose}>
        <h2>Replay error</h2>
        <p style={{ color: '#fca5a5' }}>{err}</p>
      </Backdrop>
    )
  }

  if (!data || !current) {
    return (
      <Backdrop onClose={onClose}>
        <p>Loading 2005 sequence…</p>
      </Backdrop>
    )
  }

  return (
    <Backdrop onClose={onClose}>
      <header style={header}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Replay</div>
          <h2 style={{ margin: 0, fontSize: 22 }}>{data.event}</h2>
        </div>
        <button onClick={onClose} style={closeBtn} aria-label="Close replay">✕</button>
      </header>

      <section style={hero}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{current.date}</div>
          <div className="tabular" style={{ fontSize: 96, fontWeight: 700, lineHeight: 1, marginTop: 4 }}>{current.rri_score.toFixed(1)}</div>
          <div style={{ marginTop: 8 }}><SeverityBadge severity={current.severity_tier} size="lg" /></div>
        </div>
        <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
          <Stat label="Bloom probability" value={`${(current.bloom_probability * 100).toFixed(0)}%`} />
          <Stat label="Wind speed" value={`${current.wind_speed.toFixed(1)} m/s`} />
          <Stat label="Wave height" value={`${current.wave_height.toFixed(1)} m`} />
          <Stat label="Bloom duration" value={`${current.bloom_duration_days} days`} />
        </div>
      </section>

      {triggerFired && (
        <div style={triggerBanner} role="alert">
          ⚡ Parametric trigger fired on day {triggerStep + 1} ({data.rows[triggerStep].date}) — payout calculated for OSP_SAN_MARTINO
        </div>
      )}

      <div style={{ height: 200, marginTop: 12 }}>
        <ResponsiveContainer>
          <LineChart data={visible}>
            <CartesianGrid stroke="#243047" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: '#111a2c', border: '1px solid #243047' }} labelStyle={{ color: '#e6edf7' }} />
            <ReferenceLine y={70} stroke="#dc2626" strokeDasharray="4 4" label={{ value: 'Trigger threshold (70)', position: 'insideTopRight', fill: '#fca5a5', fontSize: 11 }} />
            <Line type="monotone" dataKey="rri_score" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <footer style={footer}>
        <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-muted)' }}>
          Day {step + 1} / {data.rows.length}
        </div>
        <button onClick={() => setStep(0)} style={ctrlBtn} aria-label="Reset">⟲</button>
        <button onClick={() => setPlaying(p => !p)} style={ctrlBtn} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
      </footer>
    </Backdrop>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', minWidth: 220, gap: 16 }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <strong className="tabular">{value}</strong>
    </div>
  )
}

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" style={backdrop} onClick={onClose}>
      <div style={panel} onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  )
}

const backdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
}
const panel: React.CSSProperties = {
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 16, padding: 24, maxWidth: 720, width: '100%',
  display: 'flex', flexDirection: 'column', gap: 12,
}
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }
const closeBtn: React.CSSProperties = {
  background: 'var(--color-surface-2)', color: 'var(--color-text-muted)',
  border: '1px solid var(--color-border)', borderRadius: 8,
  padding: '6px 10px', fontSize: 14, cursor: 'pointer',
}
const hero: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', padding: '12px 0' }
const triggerBanner: React.CSSProperties = {
  background: 'rgba(220,38,38,0.18)', border: '1px solid #dc2626',
  borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fecaca',
}
const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }
const ctrlBtn: React.CSSProperties = {
  background: 'var(--color-accent)', color: '#0b1220', border: 'none',
  width: 40, height: 40, borderRadius: 999, fontSize: 16, fontWeight: 700, cursor: 'pointer',
}