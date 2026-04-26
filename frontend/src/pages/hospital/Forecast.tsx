import { useEffect, useMemo, useState } from 'react'
import { Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, ComposedChart } from 'recharts'
import { supabase } from '../../lib/supabase'
import type { HospitalSurgeForecast } from '../../lib/types'
import { Card } from '../../components/ui/Card'
import { KpiCard } from '../../components/ui/KpiCard'
import { Skeleton } from '../../components/ui/Skeleton'

const HOSPITALS = [
  { id: 'OSP_SAN_MARTINO', name: 'Ospedale San Martino' },
  { id: 'OSP_GALLIERA', name: 'Ospedale Galliera' },
  { id: 'OSP_VILLA_SCASSI', name: 'Ospedale Villa Scassi' },
]

const tierColor: Record<string, string> = {
  'LOW SURGE': '#16a34a',
  'MODERATE SURGE': '#d97706',
  'HIGH SURGE': '#dc2626',
}

export function Forecast() {
  const [hospitalId, setHospitalId] = useState(HOSPITALS[0].id)
  const [rows, setRows] = useState<HospitalSurgeForecast[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    async function load() {
      const { data, error } = await supabase
        .from('hospital_surge_forecasts')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('forecast_date', { ascending: true })
        .limit(7)
      if (cancelled) return
      if (!error && data) setRows(data as HospitalSurgeForecast[])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [hospitalId])

  const latest = rows[rows.length - 1]
  const chartData = useMemo(
    () =>
      rows.map(r => ({
        date: r.forecast_date.slice(5),
        admissions: r.expected_admissions,
        ciLow: r.ci_low,
        ciHigh: r.ci_high,
      })),
    [rows],
  )

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>7-Day Surge Forecast</h1>
        <select
          aria-label="Select hospital"
          value={hospitalId}
          onChange={e => setHospitalId(e.target.value)}
          style={selectStyle}
        >
          {HOSPITALS.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </header>

      {loading ? (
        <Skeleton height={320} />
      ) : !latest ? (
        <Card title="No forecast yet">
          <p style={{ color: 'var(--color-text-muted)' }}>Run the live RRI pipeline to populate forecasts.</p>
        </Card>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <KpiCard
              label="Tomorrow expected"
              value={latest.expected_admissions}
              unit="admissions"
              delta={{ value: latest.additional_vs_baseline, label: 'vs baseline' }}
            />
            <KpiCard
              label="Severity tier"
              value={
                <span style={{ color: tierColor[latest.severity_tier] }}>
                  {latest.severity_tier}
                </span>
              }
              hint="LOW <50 · MODERATE <120 · HIGH SURGE ≥120 additional"
            />
            <KpiCard
              label="Extra nursing shifts"
              value={latest.extra_nursing_shifts}
              unit="shifts"
              hint="Recommended over next 7 days"
            />
            <KpiCard
              label="Medication stock"
              value={`€${(latest.medication_stock_eur / 1000).toFixed(0)}k`}
              hint="Suggested top-up budget"
            />
          </div>

          <Card title="Daily expected admissions" subtitle="Bars show point estimate · band shows 95% CI">
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <ComposedChart data={chartData}>
                  <CartesianGrid stroke="#243047" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: '#111a2c', border: '1px solid #243047', borderRadius: 8 }}
                    labelStyle={{ color: '#e6edf7' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ciHigh"
                    stroke="none"
                    fill="#38bdf8"
                    fillOpacity={0.12}
                    name="CI high"
                  />
                  <Area
                    type="monotone"
                    dataKey="ciLow"
                    stroke="none"
                    fill="#0b1220"
                    name="CI low"
                  />
                  <Bar dataKey="admissions" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Expected" label={{ position: 'top', fill: '#e6edf7', fontSize: 12 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 14,
}