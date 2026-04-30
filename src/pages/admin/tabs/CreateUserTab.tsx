/**
 * CreateUserTab — Admin tool to create any user type (pupil, teacher, admin).
 * Calls the create-user Supabase Edge Function (service-role key stays server-side).
 */
import { useState, type FormEvent } from 'react'
import { supabase } from '../../../lib/supabase'
import type { UserRole } from '../../../types'

type CreateStatus = 'idle' | 'loading' | 'success' | 'error'

const ROLES: Array<{ value: UserRole; label: string; icon: string; description: string }> = [
  { value: 'pupil',   label: 'Pupil',   icon: '🎒', description: 'Access to World Map and lessons' },
  { value: 'teacher', label: 'Teacher', icon: '📚', description: 'Access to class dashboard' },
  { value: 'admin',   label: 'Admin',   icon: '👑', description: 'Full admin access' },
]

export default function CreateUserTab() {
  const [email, setEmail]       = useState('')
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState<UserRole>('pupil')
  const [status, setStatus]     = useState<CreateStatus>('idle')
  const [message, setMessage]   = useState('')
  const [createdUsers, setCreatedUsers] = useState<Array<{ name: string; email: string; role: string; createdAt: string }>>([])

  function reset() {
    setEmail('')
    setName('')
    setPassword('')
    setRole('pupil')
    setStatus('idle')
    setMessage('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage('')

    if (!email.trim() || !name.trim() || !password.trim()) {
      setStatus('error')
      setMessage('All fields are required.')
      return
    }
    if (password.length < 8) {
      setStatus('error')
      setMessage('Password must be at least 8 characters.')
      return
    }

    setStatus('loading')

    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { email: email.trim(), name: name.trim(), password, role },
    })

    if (error || !data?.success) {
      setStatus('error')
      setMessage(
        (data as { error?: string } | null)?.error ??
        error?.message ??
        'Failed to create user. Check Edge Function logs.'
      )
      return
    }

    // Record in local session list
    setCreatedUsers(prev => [
      { name: name.trim(), email: email.trim(), role, createdAt: new Date().toLocaleString() },
      ...prev,
    ])

    setStatus('success')
    setMessage(`✅ ${role.charAt(0).toUpperCase() + role.slice(1)} account created for ${email.trim()}`)
  }

  return (
    <div style={{ maxWidth: 580 }}>
      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
        👤 Create User
      </h2>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 24 }}>
        Create any user type directly — account is confirmed immediately, no email required.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Role selector */}
        <div style={{ marginBottom: 20 }}>
          <p style={labelStyle}>Account type</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {ROLES.map(r => (
              <button
                key={r.value}
                type="button"
                data-testid={`create-user-role-${r.value}`}
                onClick={() => setRole(r.value)}
                style={{
                  padding: '14px 10px',
                  border: `2px solid ${role === r.value ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: role === r.value ? 'var(--color-background)' : 'var(--color-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 150ms ease',
                }}
              >
                <span style={{ fontSize: 24 }}>{r.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{r.label}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.3 }}>{r.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Full name */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="cu-name" style={labelStyle}>Full Name</label>
          <input
            id="cu-name"
            data-testid="create-user-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Jane Smith"
            disabled={status === 'loading'}
            style={inputStyle}
          />
        </div>

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="cu-email" style={labelStyle}>Email Address</label>
          <input
            id="cu-email"
            data-testid="create-user-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="user@school.com"
            disabled={status === 'loading'}
            style={inputStyle}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="cu-password" style={labelStyle}>Password</label>
          <input
            id="cu-password"
            data-testid="create-user-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            disabled={status === 'loading'}
            style={inputStyle}
          />
        </div>

        {/* Status message */}
        {message && (
          <div
            role="alert"
            data-testid="create-user-status"
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              marginBottom: 16,
              background: status === 'success' ? 'var(--color-correct-bg)' : 'var(--color-incorrect-bg)',
              color: status === 'success' ? 'var(--color-correct)' : 'var(--color-incorrect)',
              border: `1px solid ${status === 'success' ? 'var(--color-correct)' : 'var(--color-incorrect)'}`,
            }}
          >
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="submit"
            data-testid="create-user-submit"
            disabled={status === 'loading'}
            style={{
              flex: 1,
              padding: '12px 20px',
              fontSize: 16,
              fontWeight: 600,
              color: '#fff',
              background: 'var(--color-brand-primary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              opacity: status === 'loading' ? 0.7 : 1,
              minHeight: 44,
              transition: 'opacity 150ms',
            }}
          >
            {status === 'loading' ? 'Creating account…' : 'Create Account'}
          </button>

          {(status === 'success' || status === 'error') && (
            <button
              type="button"
              onClick={reset}
              data-testid="create-user-reset"
              style={{
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--color-text-muted)',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              Create another
            </button>
          )}
        </div>
      </form>

      {/* Session log */}
      {createdUsers.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Created this session
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {createdUsers.map((u, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  background: 'var(--color-background)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontSize: 20 }}>
                  {ROLES.find(r => r.value === u.role)?.icon ?? '👤'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{u.email} · {u.role}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{u.createdAt}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 14px',
  fontSize: 16,
  border: '2px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text)',
  background: 'var(--color-surface)',
  outline: 'none',
  minHeight: 44,
}
