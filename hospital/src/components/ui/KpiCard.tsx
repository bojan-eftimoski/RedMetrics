import type { ReactNode } from 'react'

interface KpiCardProps {
  label: string
  value: ReactNode
  unit?: string
  hint?: string
  delta?: { value: number; label: string }
}

export function KpiCard({ label, value, unit, hint, delta }: KpiCardProps) {
  const deltaColor = !delta ? undefined : delta.value > 0 ? '#fca5a5' : delta.value < 0 ? '#86efac' : '#94a3b8'
  return (
    <div style={card}>
      <div style={labelStyle}>{label}</div>
      <div style={valueRow}>
        <span className="tabular" style={valueStyle}>{value}</span>
        {unit && <span style={unitStyle}>{unit}</span>}
      </div>
      {delta && (
        <div className="tabular" style={{ ...deltaStyle, color: deltaColor }}>
          {delta.value > 0 ? '+' : ''}{delta.value.toFixed(1)} <span style={{ color: '#94a3b8' }}>{delta.label}</span>
        </div>
      )}
      {hint && <div style={hintStyle}>{hint}</div>}
    </div>
  )
}

const card: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minHeight: 120,
}
const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }
const valueRow: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 6 }
const valueStyle: React.CSSProperties = { fontSize: 32, fontWeight: 600, color: 'var(--color-text)' }
const unitStyle: React.CSSProperties = { fontSize: 14, color: 'var(--color-text-muted)' }
const deltaStyle: React.CSSProperties = { fontSize: 13 }
const hintStyle: React.CSSProperties = { fontSize: 12, color: 'var(--color-text-muted)' }
