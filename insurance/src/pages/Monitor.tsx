import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TriggerEvent } from '../lib/types'
import { Card } from '../components/ui/Card'
import { format } from 'date-fns'

export function Monitor() {
  const [events, setEvents] = useState<TriggerEvent[]>([])
  const [muted, setMuted] = useState(true)
  const [latestFired, setLatestFired] = useState<TriggerEvent | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('trigger_events').select('*').order('triggered_at', { ascending: false }).limit(20)
      if (!cancelled) setEvents((data ?? []) as TriggerEvent[])
    }
    load()
    const channel = supabase
      .channel('trigger-monitor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trigger_events' }, payload => {
        const e = payload.new as TriggerEvent
        setEvents(prev => [e, ...prev].slice(0, 20))
        if (e.trigger_fired) {
          setLatestFired(e)
          if (!muted) beep()
        }
      })
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [muted])

  function beep() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = 880
      o.connect(g); g.connect(ctx.destination)
      g.gain.setValueAtTime(0.001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      o.start(); o.stop(ctx.currentTime + 0.4)
    } catch { /* audio not available */ }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Trigger Monitor</h1>
        <button
          onClick={() => setMuted(m => !m)}
          aria-pressed={!muted}
          style={{ ...buttonStyle, background: muted ? 'var(--color-surface-2)' : '#dc2626', color: muted ? 'var(--color-text-muted)' : 'white' }}
        >
          {muted ? '🔕 Muted' : '🔔 Alert sound on'}
        </button>
      </header>

      {latestFired && (
        <div style={firedBanner} role="alert">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.6 }}>Trigger fired</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              {latestFired.event_certificate_id}
            </div>
            <div style={{ color: '#fee2e2', fontSize: 14, marginTop: 4 }}>
              {latestFired.hospital_id} · payout tier {latestFired.payout_tier}
            </div>
          </div>
          <div className="tabular" style={{ fontSize: 36, fontWeight: 700 }}>
            €{latestFired.payout_eur.toLocaleString()}
          </div>
        </div>
      )}

      <Card title="Live evaluations" subtitle="Realtime feed from trigger_events">
        {events.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No trigger evaluations yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {events.map(e => (
              <div key={e.id} style={evRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ConditionDot ok={e.rri_score > 70 && e.rri_consecutive_days >= 5} label="RRI" />
                  <ConditionDot ok={e.trigger_fired} label="IoT" />
                  <div>
                    <div style={{ fontWeight: 600 }}>{e.hospital_id}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {format(new Date(e.triggered_at), 'PPpp')} · {e.event_certificate_id}
                    </div>
                  </div>
                </div>
                <div className="tabular" style={{ fontSize: 14 }}>
                  RRI <strong>{e.rri_score.toFixed(1)}</strong> · {e.rri_consecutive_days}d
                  <span style={{ marginLeft: 12, color: e.trigger_fired ? '#fca5a5' : '#94a3b8', fontWeight: 600 }}>
                    {e.trigger_fired ? `€${e.payout_eur.toLocaleString()}` : 'no payout'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function ConditionDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }} aria-label={`${label} ${ok ? 'pass' : 'fail'}`}>
      <span aria-hidden="true" style={{
        width: 12, height: 12, borderRadius: '50%',
        background: ok ? '#16a34a' : 'var(--color-surface-2)',
        border: `1px solid ${ok ? '#16a34a' : '#dc2626'}`,
      }} />
      <span style={{ color: ok ? '#86efac' : 'var(--color-text-muted)' }}>{label} {ok ? '✓' : '✗'}</span>
    </span>
  )
}

const firedBanner: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'linear-gradient(135deg, rgba(127,29,29,0.6), rgba(220,38,38,0.4))',
  border: '1px solid #dc2626',
  borderRadius: 12,
  padding: 20,
  animation: 'pulse-red 2.5s ease-out infinite',
}
const buttonStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 13,
  cursor: 'pointer',
}
const evRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
}
