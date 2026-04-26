import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { RriScore, TriggerEvent } from '../../lib/types'
import { Card } from '../../components/ui/Card'
import { KpiCard } from '../../components/ui/KpiCard'
import { SeverityBadge } from '../../components/ui/SeverityBadge'
import { Skeleton } from '../../components/ui/Skeleton'

const HOSPITALS = [
  { id: 'OSP_SAN_MARTINO',  name: 'Ospedale San Martino',  lat: 44.4109, lng: 8.9626, dailyCost: 22000 },
  { id: 'OSP_GALLIERA',     name: 'Ospedale Galliera',     lat: 44.4030, lng: 8.9420, dailyCost: 16000 },
  { id: 'OSP_VILLA_SCASSI', name: 'Ospedale Villa Scassi', lat: 44.4180, lng: 8.8820, dailyCost: 12000 },
]

export function Portfolio() {
  const [latestRri, setLatestRri] = useState<RriScore | null>(null)
  const [recentTriggers, setRecentTriggers] = useState<TriggerEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [rriRes, trigRes] = await Promise.all([
        supabase.from('rri_scores').select('*').order('date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('trigger_events').select('*').order('triggered_at', { ascending: false }).limit(20),
      ])
      if (cancelled) return
      setLatestRri(rriRes.data as RriScore | null)
      setRecentTriggers((trigRes.data ?? []) as TriggerEvent[])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const totalInsured = HOSPITALS.reduce((sum, h) => sum + h.dailyCost, 0)
  const triggeredHospitals = new Set(recentTriggers.filter(t => t.trigger_fired).map(t => t.hospital_id))

  if (loading) return <Skeleton height={400} />

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Portfolio</h1>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
          3 insured hospitals · Genoa Ligurian Coast
        </div>
      </header>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <KpiCard label="Aggregate exposure" value={`€${(totalInsured / 1000).toFixed(0)}k`} unit="/ day" hint="Sum of insured daily operational cost" />
        <KpiCard label="Zone RRI" value={latestRri ? latestRri.rri_score.toFixed(1) : '—'} hint={latestRri ? `Severity ${latestRri.severity}` : 'No data'} />
        <KpiCard label="Triggered (24h)" value={triggeredHospitals.size} unit={`/ ${HOSPITALS.length}`} hint="Hospitals with active payout trigger" />
        <KpiCard label="Recent events" value={recentTriggers.length} hint="Last 20 trigger evaluations" />
      </div>

      <Card title="Insured hospitals" subtitle="Mapbox token not set — list view">
        <div style={{ display: 'grid', gap: 8 }}>
          {HOSPITALS.map(h => {
            const triggered = triggeredHospitals.has(h.id)
            return (
              <div key={h.id} style={hospitalRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: triggered ? '#dc2626' : (latestRri ? severityDot(latestRri.severity) : '#16a34a'),
                  }} aria-hidden="true" />
                  <div>
                    <div style={{ fontWeight: 600 }}>{h.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{h.id} · {h.lat.toFixed(3)}, {h.lng.toFixed(3)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span className="tabular" style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>€{(h.dailyCost / 1000).toFixed(0)}k/day</span>
                  {triggered && <SeverityBadge severity="CRITICAL" size="sm" />}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

function severityDot(s: RriScore['severity']): string {
  return { GREEN: '#16a34a', AMBER: '#d97706', RED: '#dc2626', CRITICAL: '#7f1d1d' }[s]
}

const hospitalRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
}