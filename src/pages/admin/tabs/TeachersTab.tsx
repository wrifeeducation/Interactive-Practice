/**
 * TeachersTab — list all teacher accounts with their class information.
 */
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

interface TeacherRow {
  id: string
  name: string
  created_at: string
  classes: Array<{ id: string; name: string; invite_code: string }>
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TeachersTab() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, created_at, classes(id, name, invite_code)')
        .eq('role', 'teacher')
        .order('created_at', { ascending: false })
      setTeachers((data as TeacherRow[]) ?? [])
      setLoading(false)
    }
    void load()
  }, [])

  const filtered = teachers.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>Teachers</h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{teachers.length} registered</p>
        </div>
        <input
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          data-testid="teacher-search"
          style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-border)', fontSize: 'var(--font-size-sm)', width: 220, background: 'var(--color-surface)' }}
        />
      </div>

      {loading && <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}

      {!loading && filtered.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No teachers found.</p>
      )}

      {!loading && filtered.map(t => (
        <div key={t.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--color-text)', margin: '0 0 3px' }}>
                📋 {t.name}
              </p>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: 0 }}>Joined {fmt(t.created_at)}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: 'var(--color-world-3-bg)', color: 'var(--color-world-3)', fontWeight: 700, fontSize: 'var(--font-size-xs)', borderRadius: 'var(--radius-full)', padding: '3px 10px' }}>
                {t.classes?.length ?? 0} class{t.classes?.length !== 1 ? 'es' : ''}
              </span>
            </div>
          </div>

          {t.classes && t.classes.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {t.classes.map(c => (
                <div key={c.id} style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{c.name}</span>
                  <span style={{ color: 'var(--color-text-muted)', marginLeft: 6 }}>Code: <strong>{c.invite_code}</strong></span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
