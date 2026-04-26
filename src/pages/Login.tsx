import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export default function Login() {
  const navigate = useNavigate()
  const fetchProfile = useAuthStore((s) => s.fetchProfile)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function validateEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) { setError('Email is required.'); return }
    if (!validateEmail(email)) { setError('Please enter a valid email address.'); return }
    if (!password) { setError('Password is required.'); return }

    setLoading(true)
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    if (data.user) {
      await fetchProfile(data.user.id)
      const profile = useAuthStore.getState().profile
      if (profile?.role === 'teacher') {
        navigate('/teacher')
      } else {
        navigate('/world-map')
      }
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Brand gradient header */}
        <div style={styles.header}>
          <h1 style={styles.logo} data-tts="WriFe logo">WriFe</h1>
          <p style={styles.tagline} data-tts="Interactive Practice tagline">Interactive Practice</p>
        </div>

        <div style={styles.body}>
          <h2 style={styles.heading}>Welcome back</h2>

          <form onSubmit={handleSubmit} noValidate>
            <div style={styles.field}>
              <label htmlFor="login-email" style={styles.label}>Email</label>
              <input
                id="login-email"
                data-testid="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                disabled={loading}
                placeholder="you@school.com"
              />
            </div>

            <div style={styles.field}>
              <label htmlFor="login-password" style={styles.label}>Password</label>
              <input
                id="login-password"
                data-testid="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                disabled={loading}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p style={styles.error} role="alert" data-tts="login error message">{error}</p>
            )}

            <button
              type="submit"
              data-testid="login-submit"
              disabled={loading}
              style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p style={styles.switchLink}>
            Don&apos;t have an account?{' '}
            <Link to="/signup" style={styles.link}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-background)',
    padding: '16px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
    padding: '32px 24px',
    textAlign: 'center',
  },
  logo: {
    margin: 0,
    fontSize: '36px',
    fontWeight: 700,
    color: 'var(--color-text-on-dark)',
    letterSpacing: '-1px',
  },
  tagline: {
    margin: '4px 0 0',
    fontSize: '16px',
    color: 'var(--color-text-on-dark)',
    opacity: 0.85,
  },
  body: {
    padding: '32px 24px',
  },
  heading: {
    margin: '0 0 24px',
    fontSize: '22px',
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--color-text-muted)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    fontSize: '18px',
    border: '2px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    background: 'var(--color-surface)',
    outline: 'none',
    minHeight: '44px',
  },
  error: {
    background: 'var(--color-incorrect-bg)',
    color: 'var(--color-incorrect)',
    border: '1px solid var(--color-incorrect)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--color-text-on-dark)',
    background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    minHeight: '44px',
    marginBottom: '16px',
  },
  switchLink: {
    textAlign: 'center',
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    margin: 0,
  },
  link: {
    color: 'var(--color-brand-primary)',
    textDecoration: 'none',
    fontWeight: 600,
  },
}
