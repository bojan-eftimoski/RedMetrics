import { useMemo, useState } from 'react'
import { Card } from '../components/ui/Card'
import { calculatePayout, tierColor } from '../lib/payout'

export function Simulate() {
  const [rri, setRri] = useState(75)
  const [days, setDays] = useState(6)
  const [dailyCost, setDailyCost] = useState(22000)

  const result = useMemo(() => calculatePayout({ rri, bloomDays: days, insuredDailyCostEur: dailyCost }), [rri, days, dailyCost])

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Payout Simulation</h1>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
          Mirrors Stage 4 logic in <code>models/stage4_insurance_loss/payout.py</code>
        </div>
      </header>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1.2fr)' }}>
        <Card title="Inputs">
          <Field label={`RRI score: ${rri.toFixed(0)}`}>
            <input type="range" min={0} max={100} step={1} value={rri} onChange={e => setRri(+e.target.value)} aria-label="RRI score" style={range} />
          </Field>
          <Field label={`Bloom duration: ${days} days`}>
            <input type="range" min={0} max={14} step={1} value={days} onChange={e => setDays(+e.target.value)} aria-label="Bloom duration days" style={range} />
          </Field>
          <Field label={`Insured daily cost: €${dailyCost.toLocaleString()}`}>
            <input
              type="range"
              min={5000}
              max={50000}
              step={500}
              value={dailyCost}
              onChange={e => setDailyCost(+e.target.value)}
              aria-label="Insured daily cost in euros"
              style={range}
            />
          </Field>
        </Card>

        <Card title="Result">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <span className="tabular" style={{ fontSize: 56, fontWeight: 700 }}>€{result.payout_eur.toLocaleString()}</span>
            <span title="Tier ladder: CRITICAL (RRI>85, ≥7d) · RED (>70, ≥5d) · AMBER (>60, ≥3d) · NONE" style={{ ...tierBadge, background: tierColor(result.tier) }}>
              {result.tier}
            </span>
          </div>
          <dl style={dl}>
            <Row k="Expected surge admissions" v={`${result.expected_surge_admissions.toFixed(1)}`} />
            <Row k="Expected surge cost" v={`€${result.expected_surge_cost_eur.toLocaleString()}`} />
            <Row k="Payout cap (1.2× expected)" v={`€${result.cap_eur.toLocaleString()}`} />
            <Row k="Insured daily cost" v={`€${result.insured_daily_cost_eur.toLocaleString()}`} />
            <Row k="Bloom duration" v={`${result.bloom_duration_days} days`} />
          </dl>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{label}</span>
      {children}
    </label>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{k}</dt>
      <dd style={{ margin: 0, fontWeight: 600 }} className="tabular">{v}</dd>
    </>
  )
}

const range: React.CSSProperties = { width: '100%', accentColor: '#fbbf24' }
const tierBadge: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: 'white',
  padding: '4px 12px', borderRadius: 999, letterSpacing: 0.5, textTransform: 'uppercase',
}
const dl: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'auto 1fr',
  rowGap: 8, columnGap: 16, marginTop: 12, marginBottom: 0,
}
