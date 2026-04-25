import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { Card } from '../components/ui/Card'
import { ReplayOverlay } from '../components/ReplayOverlay'

interface MonthRow { ym: string; actual: number; predicted: number }

export function Historical() {
  const [data, setData] = useState<MonthRow[]>([])
  const [replayOpen, setReplayOpen] = useState(false)

  useEffect(() => {
    const months = 60
    const rows: MonthRow[] = []
    const start = new Date(2020, 0, 1)
    for (let i = 0; i < months; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const seasonal = 50 * Math.sin((d.getMonth() / 12) * 2 * Math.PI - 1)
      const baseline = 420 + seasonal
      const bloomMonth = (d.getMonth() === 6 || d.getMonth() === 7) && d.getFullYear() % 2 === 0
      const actual = Math.round(baseline + (bloomMonth ? 220 : 0) + (Math.random() - 0.5) * 60)
      const predicted = Math.round(baseline + (bloomMonth ? 200 : 0) + (Math.random() - 0.5) * 30)
      rows.push({ ym, actual, predicted })
    }
    setData(rows)
  }, [])

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Historical</h1>
        <button style={replayButton} aria-label="Replay 2005 Genoa outbreak" onClick={() => setReplayOpen(true)}>
          ▶ Replay 2005 Genoa Outbreak
        </button>
      </header>

      {replayOpen && <ReplayOverlay onClose={() => setReplayOpen(false)} />}

      <Card title="Monthly admissions: actual vs predicted" subtitle="Synthetic preview — wire to real Stage-3 outputs after model is trained on real data">
        <div style={{ width: '100%', height: 380 }}>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid stroke="#243047" strokeDasharray="3 3" />
              <XAxis dataKey="ym" stroke="#94a3b8" fontSize={11} minTickGap={32} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ background: '#111a2c', border: '1px solid #243047' }} labelStyle={{ color: '#e6edf7' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="actual" stroke="#38bdf8" dot={false} strokeWidth={2} name="Actual" />
              <Line type="monotone" dataKey="predicted" stroke="#fcd34d" dot={false} strokeWidth={2} strokeDasharray="4 2" name="Predicted" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

const replayButton: React.CSSProperties = {
  background: 'var(--color-accent)',
  color: '#0b1220',
  border: 'none',
  padding: '10px 16px',
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 8,
  cursor: 'pointer',
}
