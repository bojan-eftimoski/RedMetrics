import type { Severity } from '../../lib/types'

const ICON: Record<Severity, string> = {
  GREEN: '●',
  AMBER: '▲',
  RED: '■',
  CRITICAL: '✖',
}

const STYLES: Record<Severity, { bg: string; fg: string; border: string }> = {
  GREEN:    { bg: 'rgba(22,163,74,0.15)',  fg: '#86efac', border: '#16a34a' },
  AMBER:    { bg: 'rgba(217,119,6,0.18)',  fg: '#fcd34d', border: '#d97706' },
  RED:      { bg: 'rgba(220,38,38,0.20)',  fg: '#fca5a5', border: '#dc2626' },
  CRITICAL: { bg: 'rgba(127,29,29,0.30)',  fg: '#fecaca', border: '#7f1d1d' },
}

export function SeverityBadge({ severity, size = 'md' }: { severity: Severity; size?: 'sm' | 'md' | 'lg' }) {
  const s = STYLES[severity]
  const padding = size === 'sm' ? '2px 8px' : size === 'lg' ? '8px 16px' : '4px 12px'
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14
  return (
    <span
      role="status"
      aria-label={`Severity ${severity}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding,
        fontSize,
        fontWeight: 600,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        borderRadius: 999,
      }}
    >
      <span aria-hidden="true">{ICON[severity]}</span>
      {severity}
    </span>
  )
}
