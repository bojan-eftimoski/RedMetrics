import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { supabase } from '../lib/supabase'
import type { SensorReading } from '../lib/types'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'

const SENSORS = ['LIG_001', 'LIG_002', 'LIG_003', 'LIG_004', 'LIG_005']

const SERIES = [
  { key: 'water_temperature', color: '#f97316', unit: '°C' },
  { key: 'ph', color: '#a78bfa', unit: '' },
  { key: 'humidity', color: '#22d3ee', unit: '%' },
  { key: 'conductivity', color: '#facc15', unit: 'mS/cm' },
  { key: 'dissolved_oxygen', color: '#34d399', unit: 'mg/L' },
  { key: 'nitrate', color: '#fb7185', unit: 'µM' },
  { key: 'phosphate', color: '#60a5fa', unit: 'µM' },
] as const

type SeriesKey = typeof SERIES[number]['key']

export function Sensors() {
  const [sensorId, setSensorId] = useState(SENSORS[0])
  const [rows, setRows] = useState<SensorReading[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<Record<SeriesKey, boolean>>(
    Object.fromEntries(SERIES.map(s => [s.key, true])) as Record<SeriesKey, boolean>,
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    async function load() {
      const since = new Date(); since.setDate(since.getDate() - 30)
      const { data } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('sensor_id', sensorId)
        .gte('timestamp', since.toISOString())
        .order('timestamp', { ascending: true })
        .limit(720)
      if (cancelled) return
      setRows((data ?? []) as SensorReading[])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [sensorId])

  const chartData = useMemo(
    () =>
      rows.map(r => ({
        ts: r.timestamp.slice(5, 16).replace('T', ' '),
        water_temperature: r.water_temperature,
        ph: r.ph,
        humidity: r.humidity,
        conductivity: r.conductivity,
        dissolved_oxygen: r.dissolved_oxygen,
        nitrate: r.nitrate,
        phosphate: r.phosphate,
      })),
    [rows],
  )

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Sensor Data</h1>
        <select
          aria-label="Select sensor"
          value={sensorId}
          onChange={e => setSensorId(e.target.value)}
          style={selectStyle}
        >
          {SENSORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </header>

      <Card title="Last 30 days" subtitle="Click a series in the legend to toggle it">
        {loading ? (
          <Skeleton height={360} />
        ) : chartData.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No readings yet for {sensorId}.</p>
        ) : (
          <div style={{ width: '100%', height: 380 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#243047" strokeDasharray="3 3" />
                <XAxis dataKey="ts" stroke="#94a3b8" fontSize={11} minTickGap={40} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: '#111a2c', border: '1px solid #243047' }} labelStyle={{ color: '#e6edf7' }} />
                <Legend
                  onClick={e => {
                    const k = e.dataKey as SeriesKey
                    setActive(prev => ({ ...prev, [k]: !prev[k] }))
                  }}
                  wrapperStyle={{ fontSize: 12 }}
                />
                {SERIES.map(s => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    stroke={s.color}
                    dot={false}
                    strokeWidth={1.5}
                    hide={!active[s.key]}
                    name={`${s.key} (${s.unit})`}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
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
