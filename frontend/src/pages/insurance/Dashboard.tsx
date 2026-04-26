import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { RriScore, TriggerEvent } from '../../lib/types'
import { calculatePayout, tierColor } from '../../lib/payout'

const HOSPITALS = [
  { id: 'OSP_SAN_MARTINO',  name: 'Ospedale San Martino',  dailyCost: 22000 },
  { id: 'OSP_GALLIERA',     name: 'Ospedale Galliera',     dailyCost: 16000 },
  { id: 'OSP_VILLA_SCASSI', name: 'Ospedale Villa Scassi', dailyCost: 12000 },
]

export function Dashboard() {
  const navigate = useNavigate()
  const [latestRri, setLatestRri] = useState<RriScore | null>(null)
  const [events, setEvents] = useState<TriggerEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [rri, setRri] = useState(75)
  const [days, setDays] = useState(6)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [rriRes, eventRes] = await Promise.all([
        supabase.from('rri_scores').select('*').order('date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('trigger_events').select('*').order('triggered_at', { ascending: false }).limit(10),
      ])
      if (cancelled) return
      setLatestRri(rriRes.data as RriScore | null)
      setEvents((eventRes.data ?? []) as TriggerEvent[])
      if (rriRes.data) {
        setRri((rriRes.data as RriScore).rri_score)
      }
      setLoading(false)
    }
    load()
    const channel = supabase
      .channel('insurance-dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trigger_events' }, payload => {
        setEvents(prev => [payload.new as TriggerEvent, ...prev].slice(0, 10))
      })
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [])

  const payoutResult = calculatePayout({ rri, bloomDays: days, insuredDailyCostEur: 22000 })

  const totalInsured = HOSPITALS.reduce((sum, h) => sum + h.dailyCost, 0)
  const triggeredHospitals = new Set(events.filter(t => t.trigger_fired).map(t => t.hospital_id))
  const latestFired = events.find(e => e.trigger_fired)

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Insurance Dashboard</h1>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
          3 insured hospitals · Parametric HAB Cover
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {/* Box 1: Portfolio KPIs */}
        <div style={bentoBox}>
          <div style={bentoHeader}>
            <span style={bentoTitle}>Portfolio Overview</span>
          </div>
          {loading ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={statCard}>
                <div style={statLabel}>Aggregate Exposure</div>
                <div style={statValue}>€{(totalInsured / 1000).toFixed(0)}k<span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>/day</span></div>
              </div>
              <div style={statCard}>
                <div style={statLabel}>Current Zone RRI</div>
                <div style={{ ...statValue, color: 'var(--color-secondary)' }}>{latestRri?.rri_score.toFixed(1) ?? '—'}</div>
              </div>
              <div style={statCard}>
                <div style={statLabel}>Triggered (24h)</div>
                <div style={{ ...statValue, color: triggeredHospitals.size > 0 ? '#EF4444' : '#10B981' }}>
                  {triggeredHospitals.size}<span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>/{HOSPITALS.length}</span>
                </div>
              </div>
              <div style={statCard}>
                <div style={statLabel}>Recent Events</div>
                <div style={statValue}>{events.length}</div>
              </div>
            </div>
          )}
        </div>

        {/* Box 2: Trigger Monitor */}
        <div style={bentoBox}>
          <div style={bentoHeader}>
            <span style={bentoTitle}>Live Trigger Monitor</span>
            <button onClick={() => navigate('/insurance/monitor')} style={linkBtn}>View Details →</button>
          </div>
          {latestFired ? (
            <div style={triggerAlert}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 12, color: '#EF4444', textTransform: 'uppercase' }}>Trigger Fired</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{latestFired.hospital_id}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#EF4444' }}>€{latestFired.calculated_payout_eur.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{latestFired.payout_tier} tier</div>
              </div>
            </div>
          ) : (
            <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
              <span style={{ fontSize: 24, marginRight: 8 }}>✓</span>
              No active triggers
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--color-text-muted)' }}>
            {events.slice(0, 3).map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>{e.hospital_id}</span>
                <span style={{ color: e.trigger_fired ? '#EF4444' : 'var(--color-text-muted)' }}>
                  {e.trigger_fired ? `€${e.calculated_payout_eur.toLocaleString()}` : '—no payout'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Box 3: Recent Events */}
        <div style={bentoBox}>
          <div style={bentoHeader}>
            <span style={bentoTitle}>Recent Events</span>
            <button onClick={() => navigate('/insurance/events')} style={linkBtn}>View All →</button>
          </div>
          <div style={{ overflow: 'auto', maxHeight: 150 }}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Time</th>
                  <th style={th}>Hospital</th>
                  <th style={th}>RRI</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 5).map(e => (
                  <tr key={e.id} style={tr}>
                    <td style={td}>{new Date(e.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={td}>{e.hospital_id.slice(0, 10)}</td>
                    <td style={td}>{e.rri_score.toFixed(0)}</td>
                    <td style={{ ...td, color: e.trigger_fired ? '#EF4444' : '#10B981' }}>{e.trigger_fired ? 'FIRED' : 'OK'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Box 4: Payout Simulator */}
        <div style={bentoBox}>
          <div style={bentoHeader}>
            <span style={bentoTitle}>Payout Simulator</span>
            <button onClick={() => navigate('/insurance/simulate')} style={linkBtn}>Full Simulator →</button>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>RRI: {rri.toFixed(0)}</div>
              <input type="range" min={0} max={100} step={1} value={rri} onChange={e => setRri(+e.target.value)} style={range} />
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, marginTop: 8 }}>Days: {days}</div>
              <input type="range" min={0} max={14} step={1} value={days} onChange={e => setDays(+e.target.value)} style={range} />
            </div>
            <div style={{ textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Estimated Payout</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-secondary)' }}>€{payoutResult.payout_eur.toLocaleString()}</div>
              <div style={{ 
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 600,
                background: tierColor(payoutResult.tier) + '20',
                color: tierColor(payoutResult.tier),
              }}>
                {payoutResult.tier}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hospital List */}
      <div style={bentoBox}>
        <div style={bentoHeader}>
          <span style={bentoTitle}>Insured Hospitals</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {HOSPITALS.map(h => {
            const triggered = triggeredHospitals.has(h.id)
            return (
              <div key={h.id} style={{ ...hospitalCard, borderColor: triggered ? '#EF4444' : 'var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ 
                    width: 8, height: 8, borderRadius: '50%', 
                    background: triggered ? '#EF4444' : '#10B981' 
                  }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{h.id}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600 }}>€{(h.dailyCost / 1000).toFixed(0)}k</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>/day</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const bentoBox: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 220,
}

const bentoHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
}

const bentoTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--color-text)',
}

const linkBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--color-secondary)',
  fontSize: 12,
  cursor: 'pointer',
}

const statCard: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  borderRadius: 8,
  padding: 12,
}

const statLabel: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}

const statValue: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--color-text)',
}

const triggerAlert: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid #EF4444',
  borderRadius: 8,
  padding: 12,
}

const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 11 }
const th: React.CSSProperties = { textAlign: 'left', padding: '4px 8px', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }
const tr: React.CSSProperties = {}
const td: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid var(--color-border)' }

const range: React.CSSProperties = { width: '100%', accentColor: '#00D1FF' }

const hospitalCard: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'var(--color-surface-2)',
  border: '1px solid',
  borderRadius: 8,
  padding: 12,
}