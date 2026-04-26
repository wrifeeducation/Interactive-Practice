import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../types'

export default function Signup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>(
    searchParams.get('role') === 'teacher' ? 'teacher' : 'pupil'
  )
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function validateEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError('Full name is required.'); return }
    if (!email.trim()) { setError('Email is required.'); return }
    if (!validateEmail(email)) { setError('Please enter a valid email address.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://practice.wrife.co.uk',
        data: { name, role },
      },
    })

    if (signUpError || !data.user) {
      setLoading(false)
      setError(signUpError?.message ?? 'Sign up failed. Please try again.')
      return
    }

    const userId = data.user.id

    // Profile is auto-created by a database trigger (handle_new_user).
    // We wait briefly to ensure the trigger has fired, then verify.
    await new Promise(r => setTimeout(r, 800))

    const { error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      // Trigger may not have fired yet — not a hard error, proceed anyway
      console.warn('Profile check warning:', profileError.message)
    }

    // Handle invite code
    if (inviteCode.trim() && role === 'pupil') {
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .maybeSingle()

      if (classData) {
        await supabase
          .from('class_members')
          .insert({ class_id: classData.id, pupil_id: userId })
      }
    }

    setLoading(false)

    // If email confirmation is required, show a check-email message
    if (!data.session) {
      navigate('/login?notice=check-email')
      return
    }

    navigate(role === 'teacher' ? '/teacher' : '/world-map')
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.logo} data-tts="WriFe logo">WriFe</h1>
          <p style={styles.tagline} data-tts="Create account tagline">Create your account</p>
        </div>

        <div style={styles.body}>
          {/* Penny Pencil — above form on signup page (brand-mascots.md: 140px) */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <img
              src="/mascots/penny-pencil.svg"
              alt=""
              role="presentation"
              width={140}
              height={175}
              loading="lazy"
            />
          </div>
          <form onSubmit={handleSubmit} noValidate>
            <div style={styles.field}>
              <label htmlFor="signup-name" style={styles.label}>Full Name</label>
              <input
                id="signup-name"
                data-testid="signup-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
                disabled={loading}
                placeholder="Your full name"
              />
            </div>

            <div style={styles.field}>
              <label htmlFor="signup-email" style={styles.label}>Email</label>
              <input
                id="signup-email"
                data-testid="signup-email"
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
              <label htmlFor="signup-password" style={styles.label}>Password</label>
              <input
                id="signup-password"
                data-testid="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                disabled={loading}
                placeholder="At least 8 characters"
              />
            </div>

            {/* Role selector */}
            <div style={styles.field}>
              <p style={styles.label}>I am a…</p>
              <div style={styles.roleRow}>
                <button
                  type="button"
                  data-testid="role-pupil"
                  onClick={() => setRole('pupil')}
                  style={{ ...styles.roleCard, ...(role === 'pupil' ? styles.roleCardActive : {}) }}
                  disabled={loading}
                >
                  <span style={styles.roleEmoji}>🎒</span>
                  <span style={styles.roleLabel}>Pupil</span>
                </button>
                <button
                  type="button"
                  data-testid="role-teacher"
                  onClick={() => setRole('teacher')}
                  style={{ ...styles.roleCard, ...(role === 'teacher' ? styles.roleCardActive : {}) }}
                  disabled={loading}
                >
                  <span style={styles.roleEmoji}>📚</span>
                  <span style={styles.roleLabel}>Teacher</span>
                </button>
              </div>
            </div>

            <div style={styles.field}>
              <label htmlFor="signup-invite" style={styles.label}>Class invite code (optional)</label>
              <input
                id="signup-invite"
                data-testid="signup-invite"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                style={styles.input}
                disabled={loading}
                placeholder="e.g. ABC123"
              />
            </div>

            {error && (
              <p style={styles.error} role="alert" data-tts="signup error message">{error}</p>
            )}

            <button
              type="submit"
              data-testid="signup-submit"
              disabled={loading}
              style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p style={styles.switchLink}>
            Already have an account?{' '}
            <Link to="/login" style={styles.link}>Log in</Link>
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
    maxWidth: '440px',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
    padding: '28px 24px',
    textAlign: 'center',
  },
  logo: {
    margin: 0,
    fontSize: '32px',
    fontWeight: 700,
    color: 'var(--color-text-on-dark)',
    letterSpacing: '-1px',
  },
  tagline: {
    margin: '4px 0 0',
    fontSize: '15px',
    color: 'var(--color-text-on-dark)',
    opacity: 0.85,
  },
  body: {
    padding: '28px 24px',
  },
  field: {
    marginBottom: '14px',
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
  roleRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  roleCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    border: '2px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-surface)',
    cursor: 'pointer',
    minHeight: '80px',
    transition: 'all 150ms ease',
  },
  roleCardActive: {
    border: '2px solid var(--color-brand-primary)',
    background: 'var(--color-background)',
  },
  roleEmoji: {
    fontSize: '28px',
  },
  roleLabel: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  error: {
    background: 'var(--color-incorrect-bg)',
    color: 'var(--color-incorrect)',
    border: '1px solid var(--color-incorrect)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: '14px',
    marginBottom: '14px',
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
