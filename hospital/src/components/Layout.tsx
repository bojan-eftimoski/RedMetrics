import { NavLink, Outlet } from 'react-router-dom'
import type { CSSProperties } from 'react'

const NAV = [
  { to: '/', label: 'Overview', icon: '◉' },
  { to: '/forecast', label: '7-Day Forecast', icon: '▤' },
  { to: '/sensors', label: 'Sensors', icon: '✦' },
  { to: '/historical', label: 'Historical', icon: '▦' },
]

export function Layout() {
  return (
    <div style={shell}>
      <aside style={sidebar} aria-label="Primary">
        <div style={brand}>
          <span style={{ color: 'var(--color-accent)', fontSize: 20 }}>◉</span>
          <span style={{ fontWeight: 700, fontSize: 18 }}>TideAlert</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Hospital</span>
        </div>
        <nav style={nav}>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({ ...navLink, ...(isActive ? navActive : null) })}
            >
              <span aria-hidden="true" style={{ width: 18, display: 'inline-block' }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={footer}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Genoa Ligurian Coast</div>
        </div>
      </aside>
      <main style={main}>
        <Outlet />
      </main>
    </div>
  )
}

const shell: CSSProperties = { display: 'flex', height: '100vh', overflow: 'hidden' }
const sidebar: CSSProperties = {
  width: 240,
  background: 'var(--color-surface)',
  borderRight: '1px solid var(--color-border)',
  display: 'flex',
  flexDirection: 'column',
  padding: 16,
  gap: 24,
  flexShrink: 0,
}
const brand: CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 8 }
const nav: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }
const navLink: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  borderRadius: 8,
  color: 'var(--color-text-muted)',
  textDecoration: 'none',
  fontSize: 14,
  transition: 'background 0.15s, color 0.15s',
}
const navActive: CSSProperties = {
  background: 'var(--color-surface-2)',
  color: 'var(--color-text)',
  borderLeft: '3px solid var(--color-accent)',
  paddingLeft: 9,
}
const main: CSSProperties = { flex: 1, padding: 24, overflowY: 'auto', overflowX: 'hidden' }
const footer: CSSProperties = { borderTop: '1px solid var(--color-border)', paddingTop: 12 }
