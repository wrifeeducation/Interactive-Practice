/**
 * CreateUserTab — Admin tool to create user accounts.
 *
 * PUPILS:   Name + Class Code → system generates 4-digit PIN.
 *           No email or password required. PIN shown once to admin.
 *           Calls create-pupil Edge Function.
 *
 * TEACHERS / ADMINS: Email + password (existing flow via create-user Edge Function).
 */
import { useState, type FormEvent } from 'react'
import { supabase } from '../../../lib/supabase'
import type { UserRole } from '../../../types'

type CreateStatus = 'idle' | 'loading' | 'success' | 'error'

const ROLES: Array<{ value: UserRole; label: string; icon: string; description: string }> = [
  { value: 'pupil',   label: 'Pupil',   icon: '🎒', description: 'Name + PIN — no email needed' },
  { value: 'teacher', label: 'Teacher', icon: '📚', description: 'Email + password account' },
  { value: 'admin',   label: 'Admin',   icon: '👑', description: 'Full admin access' },
]

/** Generate a random 4-digit PIN string */
function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

/** SHA-256 hash a string using the Web Crypto API */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

interface CreatedUser {
  name: string
  role: string
  detail: string   // email for teachers; "Class: CODE — PIN: XXXX" for pupils
  pin?: string     // only for pupils, shown once
  createdAt: string
}

export default function CreateUserTab() {
  const [role,      setRole]      = useState<UserRole>('pupil')
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [classCode, setClassCode] = useState('')
  const [status,    setStatus]    = useState<CreateStatus>('idle')
  const [message,   setMessage]   = useState('')
  const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([])

  function reset() {
    setName('')
    setEmail('')
    setPassword('')
    setClassCode('')
    setStatus('idle')
    setMessage('')
  }

  // ── Pupil creation ────────────────────────────────────────────────────────
  async function createPupil() {
    if (!name.trim()) {
      setStatus('error')
      setMessage('Please enter the pupil\'s name.')
      return
    }

    setStatus('loading')
    const pin = generatePin()
    const pinHash = await sha256(pin)
    const username = name.trim().toLowerCase().replace(/\s+/g, '')

    // Use create-user Edge Function with pupil-specific fields
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        name: name.trim(),
        role: 'pupil',
        // Internal email — pupils never use this directly
        email: `${username}-${Date.now()}@pupils.wrife.internal`,
        password: pin,           // Supabase password = PIN (fallback)
        username,
        pin_hash: pinHash,
        class_code: classCode.trim().toUpperCase() || null,
      },
    })

    if (error || !data?.success) {
      setStatus('error')
      setMessage(
        (data as { error?: string } | null)?.error ??
        error?.message ??
        'Failed to create pupil.'
      )
      return
    }

    const detail = classCode.trim()
      ? `Class: ${classCode.trim().toUpperCase()}`
      : 'No class assigned'

    setCreatedUsers(prev => [{
      name: name.trim(),
      role: 'pupil',
      detail,
      pin,
      createdAt: new Date().toLocaleString(),
    }, ...prev])

    setStatus('success')
    setMessage(`✅ Pupil account created! PIN: ${pin}`)
  }

  // ── Teacher / Admin creation ───────────────────────────────────────────────
  async function createStaff() {
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
        'Failed to create user.'
      )
      return
    }

    setCreatedUsers(prev => [{
      name: name.trim(),
      role,
      detail: email.trim(),
      createdAt: new Date().toLocaleString(),
    }, ...prev])

    setStatus('success')
    setMessage(`✅ ${role.charAt(0).toUpperCase() + role.slice(1)} account created for ${email.trim()}`)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage('')
    if (role === 'pupil') {
      await createPupil()
    } else {
      await createStaff()
    }
  }

  const isPupil = role === 'pupil'

  return (
    <div style={{ maxWidth: 580 }}>
      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
        👤 Create User
      </h2>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 24 }}>
        Pupils need only their name — a PIN is generated automatically.
        Teachers and admins require an email and password.
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
                onClick={() => { setRole(r.value); reset() }}
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

        {/* Name (all roles) */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="cu-name" style={labelStyle}>
            {isPupil ? "Pupil's First Name" : 'Full Name'}
          </label>
          <input
            id="cu-name"
            data-testid="create-user-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={isPupil ? 'e.g. Jamie' : 'e.g. Jane Smith'}
            disabled={status === 'loading'}
            style={inputStyle}
          />
        </div>

        {/* Class code — pupils only (optional) */}
        {isPupil && (
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="cu-classcode" style={labelStyle}>Class Code (optional)</label>
            <input
              id="cu-classcode"
              data-testid="create-user-classcode"
              type="text"
              value={classCode}
              onChange={e => setClassCode(e.target.value.toUpperCase())}
              placeholder="e.g. WRIFE01"
              disabled={status === 'loading'}
              style={{ ...inputStyle, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}
            />
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Leave blank to add to a class later.
            </p>
          </div>
        )}

        {/* Email — teachers / admins only */}
        {!isPupil && (
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
        )}

        {/* Password — teachers / admins only */}
        {!isPupil && (
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
        )}

        {/* PIN info banner for pupils */}
        {isPupil && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            fontSize: 13,
            color: 'var(--color-text-muted)',
            marginBottom: 20,
            lineHeight: 1.5,
          }}>
            🔑 A 4-digit PIN will be generated automatically. <strong>Show it to the pupil — it won't be shown again.</strong>
          </div>
        )}

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
              color:      status === 'success' ? 'var(--color-correct)'    : 'var(--color-incorrect)',
              border:     `1px solid ${status === 'success' ? 'var(--color-correct)' : 'var(--color-incorrect)'}`,
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
            {status === 'loading'
              ? 'Creating…'
              : isPupil ? '🎒 Create Pupil' : '📧 Create Account'}
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
                  background: u.pin ? 'var(--color-correct-bg)' : 'var(--color-background)',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${u.pin ? 'var(--color-correct)' : 'var(--color-border)'}`,
                }}
              >
                <span style={{ fontSize: 20 }}>
                  {ROLES.find(r => r.value === u.role)?.icon ?? '👤'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{u.detail} · {u.role}</div>
                  {u.pin && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 4,
                      padding: '3px 10px',
                      background: 'var(--color-gold)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 16,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      letterSpacing: '0.15em',
                      color: '#000',
                    }}>
                      PIN: {u.pin}
                    </div>
                  )}
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
