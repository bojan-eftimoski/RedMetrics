import { useState, createContext, useContext, type CSSProperties } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

type ViewMode = 'hospital' | 'insurance'

interface ViewContextType {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

const ViewContext = createContext<ViewContextType | null>(null)

export function useViewMode() {
  const ctx = useContext(ViewContext)
  if (!ctx) throw new Error('useViewMode must be used within ViewProvider')
  return ctx
}

const HOSPITAL_NAV = [
  { to: '/hospital/dashboard', label: 'Dashboard', icon: '◉' },
  { to: '/hospital/forecast', label: '7-Day Forecast', icon: '▤' },
  { to: '/hospital/sensors', label: 'Sensors', icon: '✦' },
  { to: '/hospital/historical', label: 'Historical', icon: '▦' },
]

const INSURANCE_NAV = [
  { to: '/insurance/dashboard', label: 'Dashboard', icon: '◉' },
  { to: '/insurance/monitor', label: 'Trigger Monitor', icon: '⚡' },
  { to: '/insurance/events', label: 'Events Log', icon: '☰' },
  { to: '/insurance/simulate', label: 'Payout Simulation', icon: '€' },
]

const Logo = () => (
  <img src="/RedMarine-Logo.png" alt="RedMetrics" style={{ width: 32, height: 32, borderRadius: 6 }} />
)

export function Layout() {
  const [viewMode, setViewMode] = useState<ViewMode>('hospital')
  const [showPayoutPopup, setShowPayoutPopup] = useState(false)
  const navigate = useNavigate()

  const handleViewModeChange = (newMode: ViewMode) => {
    if (newMode === 'insurance' && viewMode === 'hospital') {
      setShowPayoutPopup(true)
    }
    setViewMode(newMode)
    navigate(newMode === 'hospital' ? '/hospital/dashboard' : '/insurance/simulate')
  }

  const handlePopupClose = () => {
    setShowPayoutPopup(false)
  }

  const handleViewDetails = () => {
    setShowPayoutPopup(false)
    navigate('/insurance/simulate')
  }

  const accentColor = viewMode === 'hospital' ? 'var(--color-accent)' : 'var(--color-accent-insurance)'
  const navItems = viewMode === 'hospital' ? HOSPITAL_NAV : INSURANCE_NAV
  const footerText = viewMode === 'hospital' ? 'Genoa Ligurian Coast' : 'Parametric HAB Cover'

  return (
    <ViewContext.Provider value={{ viewMode, setViewMode: handleViewModeChange }}>
      <div style={shell}>
        <header style={header}>
          <div style={brand}>
            <Logo />
            <div style={brandText}>
              <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-text)' }}>RedMetrics</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{viewMode === 'hospital' ? 'Hospital' : 'Insurance'}</span>
            </div>
          </div>
          
          <div style={viewToggle}>
            <button
              onClick={() => handleViewModeChange('hospital')}
              style={{
                ...toggleBtn,
                background: viewMode === 'hospital' ? 'var(--color-surface-2)' : 'transparent',
                color: viewMode === 'hospital' ? 'var(--color-text)' : 'var(--color-text-muted)',
              }}
            >
              Hospital
            </button>
            <button
              onClick={() => handleViewModeChange('insurance')}
              style={{
                ...toggleBtn,
                background: viewMode === 'insurance' ? 'var(--color-surface-2)' : 'transparent',
                color: viewMode === 'insurance' ? 'var(--color-text)' : 'var(--color-text-muted)',
              }}
            >
              Insurance
            </button>
          </div>

          <nav style={nav}>
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/hospital/dashboard' || item.to === '/insurance/dashboard'}
                style={({ isActive }) => ({ ...navLink, ...(isActive ? { ...navActive, borderLeftColor: accentColor } : {}) })}
              >
                <span aria-hidden="true" style={{ width: 18, display: 'inline-block' }}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div style={footer}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{footerText}</div>
          </div>
        </header>
        <main style={main}>
          <Outlet />
        </main>

        {showPayoutPopup && (
          <div style={popupOverlay}>
            <div style={popupContent}>
              <div style={popupHeader}>
                <span style={{ fontSize: 24 }}>⚠️</span>
                <span style={{ fontWeight: 600, fontSize: 16 }}>Payout Required</span>
              </div>
              <p style={{ margin: '12px 0', color: 'var(--color-text-muted)' }}>
                Hospital has triggered a payout event - immediate action needed.
              </p>
              <div style={popupActions}>
                <button onClick={handleViewDetails} style={primaryBtn}>
                  View Details
                </button>
                <button onClick={handlePopupClose} style={secondaryBtn}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ViewContext.Provider>
  )
}

const shell: CSSProperties = { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }
const header: CSSProperties = {
  width: '100%',
  background: 'var(--color-surface)',
  borderBottom: '1px solid var(--color-border)',
  display: 'flex',
  alignItems: 'center',
  padding: '12px 24px',
  gap: 32,
  flexShrink: 0,
}
const brand: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 }
const brandText: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 0 }
const viewToggle: CSSProperties = {
  display: 'flex',
  background: 'var(--color-bg)',
  borderRadius: 8,
  padding: 4,
  gap: 4,
}
const toggleBtn: CSSProperties = {
  border: 'none',
  padding: '8px 16px',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
  transition: 'all 0.15s',
}
const nav: CSSProperties = { display: 'flex', gap: 8 }
const navLink: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 8,
  color: 'var(--color-text-muted)',
  textDecoration: 'none',
  fontSize: 14,
  transition: 'background 0.15s, color 0.15s',
}
const navActive: CSSProperties = {
  background: 'var(--color-surface-2)',
  color: 'var(--color-text)',
  borderBottom: '2px solid',
  borderRadius: '8px 8px 0 0',
}
const main: CSSProperties = { flex: 1, padding: 24, overflowY: 'auto', overflowX: 'hidden' }
const footer: CSSProperties = { marginLeft: 'auto', fontSize: 11 }

const popupOverlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}
const popupContent: CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  padding: 24,
  maxWidth: 400,
  width: '90%',
}
const popupHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  color: '#00D1FF',
}
const popupActions: CSSProperties = {
  display: 'flex',
  gap: 12,
  marginTop: 20,
}
const primaryBtn: CSSProperties = {
  flex: 1,
  padding: '10px 16px',
  background: '#00D1FF',
  color: '#000',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  cursor: 'pointer',
}
const secondaryBtn: CSSProperties = {
  flex: 1,
  padding: '10px 16px',
  background: 'var(--color-surface-2)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  cursor: 'pointer',
}