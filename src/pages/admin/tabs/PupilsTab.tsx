/**
 * PupilsTab — searchable list of all pupil accounts with XP, streak, and join date.
 */
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

interface PupilRow {
  id: string
  name: string
  created_at: string
  streaks: Array<{ current_streak: number; last_activity_date: string | null }>
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function HealthDot({ streak }: { streak: number }) {
  const color = streak >= 7 ? 'var(--color-correct)' : streak >= 1 ? 'var(--color-hint)' : 'var(--color-border)'
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 5 }} />
}

export default function PupilsTab() {
  const [pupils, setPupils]   = useState<PupilRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(0)
  const PAGE_SIZE = 30

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, name, created_at, streaks(current_streak, last_activity_date)')
      .eq('role', 'pupil')
      .ilike('name', search ? `%${search}%` : '%')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    setPupils((data as PupilRow[]) ?? [])
    setLoading(false)
  }, [search, page])

  useEffect(() => { void load() }, [load])

  function handleSearch(v: string) {
    setSearch(v)
    setPage(0)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>Pupils</h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Showing up to {PAGE_SIZE} per page</p>
        </div>
        <input
          placeholder="Search by name…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          data-testid="pupil-search"
          style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-border)', fontSize: 'var(--font-size-sm)', width: 220, background: 'var(--color-surface)' }}
        />
      </div>

      {loading && <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}

      {!loading && pupils.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No pupils found.</p>
      )}

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {pupils.map(p => {
            const streak = p.streaks?.[0]?.current_streak ?? 0
            const lastActive = p.streaks?.[0]?.last_activity_date
            return (
              <div key={p.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                <p style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', margin: '0 0 6px', display: 'flex', alignItems: 'center' }}>
                  <HealthDot streak={streak} />
                  🎒 {p.name}
                </p>
                <div style={{ display: 'flex', gap: 12, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  <span>🔥 {streak} day streak</span>
                  <span>Joined {fmt(p.created_at)}</span>
                </div>
                {lastActive && (
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                    Last active {fmt(lastActive)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && (pupils.length === PAGE_SIZE || page > 0) && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            data-testid="pupil-prev"
            style={{ padding: '8px 18px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)', background: page === 0 ? 'var(--color-border)' : 'var(--color-surface)', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 'var(--font-size-sm)' }}>
            ← Prev
          </button>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', padding: '8px 0' }}>Page {page + 1}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={pupils.length < PAGE_SIZE}
            data-testid="pupil-next"
            style={{ padding: '8px 18px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)', background: pupils.length < PAGE_SIZE ? 'var(--color-border)' : 'var(--color-surface)', cursor: pupils.length < PAGE_SIZE ? 'not-allowed' : 'pointer', fontSize: 'var(--font-size-sm)' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
