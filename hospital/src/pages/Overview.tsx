import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RriScore } from '../lib/types'
import { Card } from '../components/ui/Card'
import { KpiCard } from '../components/ui/KpiCard'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { Skeleton } from '../components/ui/Skeleton'
import { format } from 'date-fns'

export function Overview() {
  const [latest, setLatest] = useState<RriScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('rri_scores')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (error) setErr(error.message)
      else setLatest(data as RriScore | null)
      setLoading(false)
    }
    load()
    const channel = supabase
      .channel('rri-overview')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rri_scores' }, payload => {
        setLatest(payload.new as RriScore)
      })
      .subscribe()
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <Skeleton height={200} />
        <Skeleton height={160} />
      </div>
    )
  }

  if (err) {
    return (
      <Card title="Connection error">
        <p style={{ color: '#fca5a5' }}>{err}</p>
      </Card>
    )
  }

  if (!latest) {
    return (
      <Card title="No data yet">
        <p style={{ color: 'var(--color-text-muted)' }}>
          Run <code>python pipeline/run_live_rri.py</code> to insert the first RRI score.
        </p>
      </Card>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Overview</h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
            Last updated {format(new Date(latest.created_at), 'PPpp')}
          </div>
        </div>
      </header>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Respiratory Risk Index
            </div>
            <div className="tabular" style={{ fontSize: 96, fontWeight: 700, lineHeight: 1, marginTop: 4 }}>
              {latest.rri_score.toFixed(1)}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SeverityBadge severity={latest.severity_tier} size="lg" />
            <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
              For {latest.date} · zone {latest.zone_id.slice(0, 8)}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <KpiCard
          label="Bloom probability"
          value={(latest.bloom_probability * 100).toFixed(1)}
          unit="%"
          hint="Stage 1 LightGBM (calibrated)"
        />
        <KpiCard
          label="Wind speed"
          value={latest.wind_speed != null ? latest.wind_speed.toFixed(1) : '—'}
          unit="m/s"
          hint={`From bearing ${latest.wind_direction != null ? Math.round(latest.wind_direction) : '—'}°`}
        />
        <KpiCard
          label="Wave height"
          value={latest.wave_height != null ? latest.wave_height.toFixed(2) : '—'}
          unit="m"
          hint="ERA5 significant height"
        />
        <KpiCard
          label="Chl-a mean"
          value={latest.chl_a_mean != null ? latest.chl_a_mean.toFixed(2) : '—'}
          unit="µg/L"
          hint="CMEMS biogeochemistry"
        />
      </div>
    </div>
  )
}
