import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TriggerEvent } from '../lib/types'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { format } from 'date-fns'

type SortKey = 'triggered_at' | 'payout_eur' | 'hospital_id' | 'payout_tier'
type SortDir = 'asc' | 'desc'

export function Events() {
  const [events, setEvents] = useState<TriggerEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'DISPUTED'>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('triggered_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<TriggerEvent | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('trigger_events').select('*').order('triggered_at', { ascending: false }).limit(200)
      if (!cancelled) {
        setEvents((data ?? []) as TriggerEvent[])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const sorted = useMemo(() => {
    const filtered = filter === 'ALL' ? events : events.filter(e => e.status === filter)
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] as number | string
      const bv = b[sortKey] as number | string
      if (av === bv) return 0
      const dir = sortDir === 'asc' ? 1 : -1
      return av > bv ? dir : -dir
    })
  }, [events, filter, sortKey, sortDir])

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('desc') }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Events Log</h1>
        <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} style={selectStyle} aria-label="Filter status">
          <option value="ALL">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="DISPUTED">Disputed</option>
        </select>
      </header>

      <Card>
        {loading ? (
          <Skeleton height={300} />
        ) : sorted.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No events match the filter.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={table}>
              <thead>
                <tr>
                  {[
                    { k: 'triggered_at', label: 'Triggered' },
                    { k: 'event_certificate_id', label: 'Certificate' },
                    { k: 'hospital_id', label: 'Hospital' },
                    { k: 'payout_tier', label: 'Tier' },
                    { k: 'payout_eur', label: 'Payout' },
                    { k: 'status', label: 'Status' },
                  ].map(col => {
                    const sortable = (['triggered_at', 'payout_eur', 'hospital_id', 'payout_tier'] as string[]).includes(col.k)
                    const isActive = sortKey === col.k
                    return (
                      <th
                        key={col.k}
                        scope="col"
                        aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        onClick={sortable ? () => toggleSort(col.k as SortKey) : undefined}
                        style={{ ...th, cursor: sortable ? 'pointer' : 'default' }}
                      >
                        {col.label}{isActive ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {sorted.map(e => (
                  <tr key={e.id} onClick={() => setSelected(e)} style={tr}>
                    <td style={td} className="tabular">{format(new Date(e.triggered_at), 'yyyy-MM-dd HH:mm')}</td>
                    <td style={td}>{e.event_certificate_id}</td>
                    <td style={td}>{e.hospital_id}</td>
                    <td style={td}>{e.payout_tier}</td>
                    <td style={{ ...td, textAlign: 'right' }} className="tabular">€{e.payout_eur.toLocaleString()}</td>
                    <td style={td}>{e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <div role="dialog" aria-modal="true" style={modalBackdrop} onClick={() => setSelected(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>{selected.event_certificate_id}</h2>
              <button onClick={() => setSelected(null)} style={selectStyle} aria-label="Close">✕</button>
            </header>
            <pre style={preStyle}>{JSON.stringify(selected, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  background: 'var(--color-surface)', color: 'var(--color-text)',
  border: '1px solid var(--color-border)', borderRadius: 8,
  padding: '6px 10px', fontSize: 13, cursor: 'pointer',
}
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const th: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }
const tr: React.CSSProperties = { cursor: 'pointer' }
const td: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--color-border)' }
const modalBackdrop: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }
const modal: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20, maxWidth: 720, width: '100%', maxHeight: '80vh', overflowY: 'auto' }
const preStyle: React.CSSProperties = { background: 'var(--color-bg)', padding: 16, borderRadius: 8, fontSize: 12, color: 'var(--color-text-muted)', overflow: 'auto' }
