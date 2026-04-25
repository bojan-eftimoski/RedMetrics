import type { ReactNode, CSSProperties } from 'react'

export function Card({
  title,
  subtitle,
  actions,
  children,
  style,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <section style={{ ...card, ...style }}>
      {(title || actions) && (
        <header style={header}>
          <div>
            {title && <h2 style={titleStyle}>{title}</h2>}
            {subtitle && <div style={subtitleStyle}>{subtitle}</div>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

const card: CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}
const header: CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }
const titleStyle: CSSProperties = { fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--color-text)' }
const subtitleStyle: CSSProperties = { fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }
