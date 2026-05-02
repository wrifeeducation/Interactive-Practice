/**
 * AdminsTab — list all admin accounts and promote other users to admin.
 * Promotion updates profiles.role. Requires the RLS policy to allow
 * admins to update other profiles (set up in Supabase).
 */
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import type { Profile } from '../../../types'

interface AdminRow extends Profile {
  is_current_user: boolean
}

export default function AdminsTab() {
  const { profile: currentUser } = useAuthStore()
  const [admins, setAdmins]       = useState<AdminRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [promoteEmail, setPromoteEmail] = useState('')
  const [promoting, setPromoting] = useState(false)
  const [promoteMsg, setPromoteMsg] = useState<{ text: string; ok: boolean } | null>(null)

  async function loadAdmins() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, role, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: true })
    setAdmins(
      (data as Profile[] ?? []).map(a => ({ ...a, is_current_user: a.id === currentUser?.id }))
    )
    setLoading(false)
  }

  useEffect(() => { void loadAdmins() }, [])

  async function handlePromote() {
    if (!promoteEmail.trim()) return
    setPromoting(true)
    setPromoteMsg(null)

    // Find the profile by name (profiles don't store email; use Supabase edge function for production)
    // For now, update via Supabase dashboard-level RPC or direct row ID.
    // We search by name as a proxy (admin should know the exact name).
    const { data: found, error: findErr } = await supabase
      .from('profiles')
      .select('id, display_name, role')
      .ilike('display_name', promoteEmail.trim())
      .single()

    if (findErr || !found) {
      setPromoteMsg({ text: `No profile found matching "${promoteEmail.trim()}"`, ok: false })
      setPromoting(false)
      return
    }

    if (found.role === 'admin') {
      setPromoteMsg({ text: `${found.display_name} is already an admin.`, ok: false })
      setPromoting(false)
      return
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', found.id)

    if (updateErr) {
      setPromoteMsg({ text: `Failed: ${updateErr.message}`, ok: false })
    } else {
      setPromoteMsg({ text: `✓ ${found.display_name} promoted to admin.`, ok: true })
      setPromoteEmail('')
      void loadAdmins()
    }
    setPromoting(false)
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div>
      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>Admins</h2>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 24 }}>
        Manage who has creator-level access to this dashboard.
      </p>

      {/* Current admins */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>Current admins</h3>
        {loading && <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}
        {!loading && admins.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: a.is_current_user ? 'var(--color-world-1-bg)' : 'var(--color-surface)', border: `1px solid ${a.is_current_user ? 'var(--color-brand-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', margin: '0 0 2px' }}>
                👑 {a.display_name ?? 'Admin'} {a.is_current_user && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-brand-primary)', marginLeft: 6 }}>(you)</span>}
              </p>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: 0 }}>Promoted {fmt(a.created_at)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Promote a user */}
      <div style={{ maxWidth: 480, background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 24 }}>
        <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>Promote a user to admin</h3>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 14 }}>
          Enter the user's exact display name as it appears in WriFe.
        </p>
        <input
          value={promoteEmail}
          onChange={e => setPromoteEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void handlePromote()}
          placeholder="Display name…"
          data-testid="promote-input"
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-border)', fontSize: 'var(--font-size-sm)', marginBottom: 12, background: 'var(--color-background)' }}
        />
        {promoteMsg && (
          <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: promoteMsg.ok ? 'var(--color-correct)' : 'var(--color-incorrect)', marginBottom: 10 }}>
            {promoteMsg.text}
          </p>
        )}
        <button onClick={() => void handlePromote()} disabled={!promoteEmail.trim() || promoting} data-testid="promote-btn"
          style={{ padding: '10px 22px', borderRadius: 'var(--radius-full)', border: 'none', background: !promoteEmail.trim() || promoting ? 'var(--color-border)' : 'var(--color-brand-secondary)', color: '#fff', fontWeight: 700, fontSize: 'var(--font-size-sm)', cursor: !promoteEmail.trim() || promoting ? 'not-allowed' : 'pointer', minHeight: 'var(--touch-target)' }}>
          {promoting ? '⏳ Promoting…' : '👑 Promote to Admin'}
        </button>
      </div>
    </div>
  )
}
