import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, ComposedChart, Line, LineChart } from 'recharts'
import { supabase } from '../../lib/supabase'
import type { RriScore, HospitalSurgeForecast, SensorReading } from '../../lib/types'

const HOSPITALS = [
  { id: 'OSP_SAN_MARTINO', name: 'Ospedale San Martino' },
]

const SENSORS = ['LIG_001']

export function Dashboard() {
  const navigate = useNavigate()
  const [latestRri, setLatestRri] = useState<RriScore | null>(null)
  const [forecasts, setForecasts] = useState<HospitalSurgeForecast[]>([])
  const [sensorData, setSensorData] = useState<SensorReading[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [rriRes, forecastRes, sensorRes] = await Promise.all([
        supabase.from('rri_scores').select('*').order('date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('hospital_surge_forecasts').select('*').eq('hospital_id', HOSPITALS[0].id).order('forecast_date', { ascending: true }).limit(7),
        supabase.from('sensor_readings').select('*').eq('sensor_id', SENSORS[0]).order('timestamp', { ascending: false }).limit(50),
      ])
      if (cancelled) return
      setLatestRri(rriRes.data as RriScore | null)
      setForecasts((forecastRes.data ?? []) as HospitalSurgeForecast[])
      setSensorData((sensorRes.data ?? []) as SensorReading[])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const forecastChartData = useMemo(() => {
    return forecasts.map(r => ({
      date: r.forecast_date.slice(5),
      admissions: r.expected_admissions,
      ciLow: r.ci_low,
      ciHigh: r.ci_high,
    }))
  }, [forecasts])

  const sensorChartData = useMemo(() => {
    return [...sensorData].reverse().slice(-30).map(r => ({
      time: r.timestamp.slice(11, 16),
      dissolved_oxygen: r.dissolved_oxygen_mg_l,
      ph: r.ph,
    }))
  }, [sensorData])

  const latest = forecasts[forecasts.length - 1]

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Hospital Dashboard</h1>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
          {HOSPITALS[0].name} · Genoa Ligurian Coast
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {/* Box 1: RRI Score & Severity */}
        <div style={bentoBox}>
          <div style={bentoHeader}>
            <span style={bentoTitle}>Current RRI Score</span>
          </div>
          {loading ? (
            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>
          ) : latestRri ? (
            <div>
              <div className="tabular" style={{ 
                fontSize: 80, 
                fontWeight: 700, 
                color: latestRri.severity === 'RED' || latestRri.severity === 'CRITICAL' ? '#EF4444' : 'var(--color-secondary)' 
              }}>
                {latestRri.rri_score.toFixed(1)}
              </div>
              
              {(latestRri.severity === 'RED' || latestRri.severity === 'CRITICAL') && (
                <div style={{ 
                  marginTop: 12, 
                  padding: '12px 16px', 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  border: '1px solid #EF4444', 
                  borderRadius: 8,
                  color: '#EF4444',
                  fontWeight: 600,
                  fontSize: 14
                }}>
                  ⚠️ Higher Risk period detected from 10-15 May
                </div>
              )}
              
              <div style={{ 
                marginTop: 16, 
                fontSize: 18, 
                fontWeight: 600, 
                color: 'var(--color-text)' 
              }}>
                Estimated visits for respiratory cases: 200-250
              </div>
            </div>
          ) : (
            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>No data</div>
          )}
        </div>

        {/* Box 2: 7-Day Forecast */}
        <div style={bentoBox}>
          <div style={bentoHeader}>
            <span style={bentoTitle}>7-Day Forecast</span>
            <button onClick={() => navigate('/hospital/forecast')} style={linkBtn}>View Details →</button>
          </div>
          {loading || forecastChartData.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>Loading forecast...</div>
          ) : (
            <div style={{ height: 160 }}>
              <ResponsiveContainer>
                <ComposedChart data={forecastChartData}>
                  <CartesianGrid stroke="#3A4050" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={10} />
                  <YAxis stroke="#64748B" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#232730', border: '1px solid #3A4050', borderRadius: 8 }} labelStyle={{ color: '#E8ECF1' }} />
                  <Area type="monotone" dataKey="ciHigh" stroke="none" fill="#00D1FF" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="ciLow" stroke="none" fill="#1B1E26" />
                  <Bar dataKey="admissions" fill="#00D1FF" radius={[2, 2, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Box 3: Sensor Readings */}
        <div style={bentoBox}>
          <div style={bentoHeader}>
            <span style={bentoTitle}>Sensor Readings</span>
            <button onClick={() => navigate('/hospital/sensors')} style={linkBtn}>View Details →</button>
          </div>
          {loading || sensorChartData.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>Loading sensors...</div>
          ) : (
            <div style={{ height: 160 }}>
              <ResponsiveContainer>
                <LineChart data={sensorChartData}>
                  <CartesianGrid stroke="#3A4050" strokeDasharray="3 3" />
                  <XAxis dataKey="time" stroke="#64748B" fontSize={9} />
                  <YAxis stroke="#64748B" fontSize={9} />
                  <Tooltip contentStyle={{ background: '#232730', border: '1px solid #3A4050', borderRadius: 8 }} labelStyle={{ color: '#E8ECF1' }} />
                  <Line type="monotone" dataKey="dissolved_oxygen" stroke="#10B981" strokeWidth={1.5} dot={false} name="DO (mg/L)" />
                  <Line type="monotone" dataKey="ph" stroke="#8B5CF6" strokeWidth={1.5} dot={false} name="pH" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Box 4: Historical & Replay */}
        <div style={bentoBox}>
          <div style={bentoHeader}>
            <span style={bentoTitle}>Historical Data</span>
            <button onClick={() => navigate('/hospital/historical')} style={linkBtn}>View Details →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={miniStat}>
                <div style={miniStatLabel}>Avg Admissions</div>
                <div style={miniStatValue}>462</div>
              </div>
              <div style={miniStat}>
                <div style={miniStatLabel}>Bloom Events</div>
                <div style={miniStatValue}>12</div>
              </div>
            </div>
            <button 
              onClick={() => navigate('/hospital/historical')}
              style={replayButton}
            >
              ▶ Replay 2005 Genoa Outbreak
            </button>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div style={kpiBox}>
          <div style={kpiLabel}>Tomorrow Expected</div>
          <div style={kpiValue}>{latest?.expected_admissions ?? '—'}</div>
          <div style={kpiHint}>admissions</div>
        </div>
        <div style={kpiBox}>
          <div style={kpiLabel}>Additional vs Baseline</div>
          <div style={{ ...kpiValue, color: (latest?.additional_vs_baseline ?? 0) > 50 ? '#EF4444' : '#10B981' }}>
            {latest?.additional_vs_baseline ?? '—'}
          </div>
          <div style={kpiHint}>patients</div>
        </div>
        <div style={kpiBox}>
          <div style={kpiLabel}>Extra Nursing Shifts</div>
          <div style={kpiValue}>{latest?.extra_nursing_shifts ?? '—'}</div>
          <div style={kpiHint}>recommended</div>
        </div>
        <div style={kpiBox}>
          <div style={kpiLabel}>Medication Stock</div>
          <div style={kpiValue}>{latest ? `€${(latest.medication_stock_eur / 1000).toFixed(0)}k` : '—'}</div>
          <div style={kpiHint}>suggested budget</div>
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

const replayButton: React.CSSProperties = {
  background: 'var(--color-secondary)',
  color: '#000',
  border: 'none',
  padding: '12px 16px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const miniStat: React.CSSProperties = {
  flex: 1,
  background: 'var(--color-surface-2)',
  borderRadius: 8,
  padding: 12,
  textAlign: 'center',
}

const miniStatLabel: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--color-text-muted)',
  marginBottom: 4,
}

const miniStatValue: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: 'var(--color-text)',
}

const kpiBox: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  padding: 16,
  textAlign: 'center',
}

const kpiLabel: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 4,
}

const kpiValue: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: 'var(--color-text)',
}

const kpiHint: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--color-text-muted)',
  marginTop: 2,
}