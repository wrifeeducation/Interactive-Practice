/**
 * PupilLogin — PIN-based login for pupils.
 *
 * Pupils only need: Class Code + Username + 4-digit PIN.
 * No email or password required.
 *
 * Flow:
 *   1. POST to pupil-login Edge Function with classCode / username / pin
 *   2. Edge Function verifies credentials and returns Supabase session tokens
 *   3. We call supabase.auth.setSession() so all existing RLS queries work
 *   4. Store human-readable metadata in pupilStore (localStorage)
 *   5. Navigate to /world-map
 */
import { useState, type FormEvent, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usePupilStore } from '../stores/pupilStore'
import { useAuthStore } from '../stores/authStore'

export default function PupilLogin() {
  const navigate        = useNavigate()
  const setPupilSession = usePupilStore((s) => s.setPupilSession)
  const fetchProfile    = useAuthStore((s) => s.fetchProfile)

  const [classCode, setClassCode] = useState('')
  const [username,  setUsername]  = useState('')
  const [pin,       setPin]       = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  // PIN digit refs for auto-advance UX
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  function handlePinInput(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const digits = pin.split('')
    digits[index] = digit
    const newPin = digits.join('').slice(0, 4)
    setPin(newPin)
    // Auto-advance to next box
    if (digit && index < 3) {
      pinRefs[index + 1].current?.focus()
    }
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus()
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!classCode.trim()) { setError('Please enter your class code.'); return }
    if (!username.trim())  { setError('Please enter your name.'); return }
    if (pin.length !== 4)  { setError('Please enter your 4-digit PIN.'); return }

    setLoading(true)

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('pupil-login', {
        body: {
          classCode: classCode.trim().toUpperCase(),
          username:  username.trim(),
          pin:       pin.trim(),
        },
      })

      if (fnErr) throw new Error(fnErr.message)
      if (data?.error) throw new Error(data.error)

      const { access_token, refresh_token, pupil } = data as {
        access_token:  string
        refresh_token: string
        pupil: {
          id:        string
          name:      string
          username:  string
          classId:   string
          className: string
          classCode: string
        }
      }

      // Set the Supabase session so all existing queries / RLS work
      const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      })
      if (sessionErr) throw new Error(sessionErr.message)
      if (!sessionData.session) throw new Error('Failed to establish session.')

      // Fetch the profile so authStore knows the role (pupil) and RoleRedirect passes
      await fetchProfile(sessionData.session.user.id)

      // Store display metadata for UI components
      setPupilSession({
        pupilId:    pupil.id,
        name:       pupil.name,
        username:   pupil.username,
        classId:    pupil.classId,
        className:  pupil.className,
        classCode:  pupil.classCode,
        loggedInAt: new Date().toISOString(),
      })

      navigate('/world-map', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Logo + heading */}
        <div style={styles.logoBlock}>
          <div style={styles.logoRow}>
            <span style={styles.logoEmoji}>✏️</span>
            <span style={styles.logoText}>WriFe</span>
          </div>
          <h1 style={styles.heading}>Pupil Sign In</h1>
          <p style={styles.subheading}>Enter your class code, name, and PIN to start learning!</p>
        </div>

        <div style={styles.card}>
          <form onSubmit={handleSubmit} noValidate>

            {/* Class code */}
            <div style={styles.field}>
              <label htmlFor="pl-classcode" style={styles.label}>Class Code</label>
              <input
                id="pl-classcode"
                data-testid="pupil-login-classcode"
                type="text"
                value={classCode}
                onChange={e => setClassCode(e.target.value.toUpperCase())}
                placeholder="e.g. WRIFE01"
                disabled={loading}
                maxLength={12}
                autoComplete="off"
                style={{
                  ...styles.input,
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontSize: 20,
                  textAlign: 'center',
                }}
              />
            </div>

            {/* Username / first name */}
            <div style={styles.field}>
              <label htmlFor="pl-username" style={styles.label}>Your First Name</label>
              <input
                id="pl-username"
                data-testid="pupil-login-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. Alex"
                disabled={loading}
                autoComplete="given-name"
                style={{ ...styles.input, fontSize: 18 }}
              />
            </div>

            {/* PIN — 4 individual digit boxes */}
            <div style={styles.field}>
              <label style={styles.label}>Your PIN</label>
              <div style={styles.pinRow} role="group" aria-label="4-digit PIN">
                {[0, 1, 2, 3].map(i => (
                  <input
                    key={i}
                    ref={pinRefs[i]}
                    data-testid={`pupil-login-pin-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={pin[i] ?? ''}
                    onChange={e => handlePinInput(i, e.target.value)}
                    onKeyDown={e => handlePinKeyDown(i, e)}
                    disabled={loading}
                    style={styles.pinBox}
                    aria-label={`PIN digit ${i + 1}`}
                  />
                ))}
              </div>
              <p style={styles.pinHint}>Ask your teacher if you don't know your PIN.</p>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                data-testid="pupil-login-error"
                style={styles.errorBanner}
              >
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              data-testid="pupil-login-submit"
              disabled={loading}
              style={styles.submitBtn}
            >
              {loading ? '⏳ Signing in…' : '🚀 Start Learning!'}
            </button>
          </form>
        </div>

        {/* Back / teacher link */}
        <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link
            to="/login"
            style={{ fontSize: 13, color: 'var(--color-text-muted)', textDecoration: 'none' }}
          >
            Teacher or admin? Sign in here →
          </Link>
          <Link
            to="/"
            style={{ fontSize: 12, color: 'var(--color-text-muted)', textDecoration: 'none', opacity: 0.7 }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--color-background)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  container: {
    width: '100%',
    maxWidth: 420,
  },
  logoBlock: {
    textAlign: 'center',
    marginBottom: 28,
  },
  logoRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  logoEmoji: {
    fontSize: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 800,
    color: 'var(--color-brand-primary)',
  },
  heading: {
    fontSize: 26,
    fontWeight: 700,
    color: 'var(--color-text)',
    margin: '0 0 6px',
  },
  subheading: {
    fontSize: 15,
    color: 'var(--color-text-muted)',
    margin: 0,
    lineHeight: 1.5,
  },
  card: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px 24px',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-md)',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '12px 16px',
    fontSize: 16,
    border: '2px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    background: '#fff',
    outline: 'none',
    minHeight: 48,
  },
  pinRow: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
  pinBox: {
    width: 64,
    height: 72,
    fontSize: 32,
    fontWeight: 700,
    textAlign: 'center' as const,
    border: '3px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    background: '#fff',
    outline: 'none',
    caretColor: 'transparent',
  },
  pinHint: {
    marginTop: 8,
    fontSize: 12,
    color: 'var(--color-text-muted)',
    textAlign: 'center' as const,
  },
  errorBanner: {
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-incorrect-bg)',
    color: 'var(--color-incorrect)',
    border: '1px solid var(--color-incorrect)',
    fontSize: 14,
    marginBottom: 16,
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    background: 'var(--color-brand-secondary)',
    border: 'none',
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
    minHeight: 52,
    boxShadow: 'var(--shadow-sm)',
    transition: 'opacity 150ms',
  },
}
