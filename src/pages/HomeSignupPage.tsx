/**
 * HomeSignupPage — Route C entry point for practice.wrife.co.uk
 *
 * 2-step parent sign-up flow:
 *   Step 1: email + password → supabase.auth.signUp (role=parent, shared Platform DB)
 *   Step 2: child name + year group → base64-encoded and passed to
 *           pwp.studio.wrife.co.uk/pricing?nc=<encoded> for Stripe checkout
 *
 * The wrifeapp PricingPage reads the nc param and stores it in sessionStorage
 * as wrife_pending_child. ParentPage auto-provisions the child on first load.
 */

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Wrifeapp URL — where Stripe checkout and parent dashboard live
const WRIFEAPP_ORIGIN = 'https://pwp.studio.wrife.co.uk'

const YEAR_GROUPS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

type Step = 'account' | 'child'

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  childName?: string
  general?: string
}

export default function HomeSignupPage() {
  const navigate = useNavigate()

  const [step, setStep]         = useState<Step>('account')

  // Account step
  const [email, setEmail]                     = useState('')
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword]       = useState(false)

  // Child step
  const [childName, setChildName] = useState('')
  const [yearGroup, setYearGroup] = useState<number>(4)

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors]       = useState<FormErrors>({})

  function clearErrors() { setErrors({}) }

  // ── Step 1: Create parent Supabase auth account ──────────────────────────
  async function handleAccountSubmit(e: FormEvent) {
    e.preventDefault()
    clearErrors()

    if (!email.trim())                return setErrors({ email: 'Email address is required' })
    if (!email.includes('@'))         return setErrors({ email: 'Please enter a valid email address' })
    if (password.length < 8)          return setErrors({ password: 'Password must be at least 8 characters' })
    if (password !== confirmPassword) return setErrors({ confirmPassword: 'Passwords do not match' })

    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { role: 'parent' },
          emailRedirectTo: `${WRIFEAPP_ORIGIN}/auth/confirm`,
        },
      })

      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('user already exists')) {
          setErrors({ general: 'An account with this email already exists. Try signing in instead.' })
        } else if (msg.includes('rate limit')) {
          setErrors({ general: 'Too many attempts — please wait a moment and try again.' })
        } else {
          setErrors({ general: error.message })
        }
        return
      }

      if (data.user) {
        setStep('child')
      }
    } catch {
      setErrors({ general: 'Something went wrong. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // ── Step 2: Encode child details and redirect cross-origin to pricing ────
  function handleChildSubmit(e: FormEvent) {
    e.preventDefault()
    clearErrors()

    if (!childName.trim()) {
      return setErrors({ childName: "Please enter your child's first name or nickname" })
    }

    // Encode child details as base64 — PricingPage on wrifeapp reads this
    // and writes it to sessionStorage as wrife_pending_child so ParentPage
    // can provision the child after Stripe checkout completes.
    const payload = btoa(JSON.stringify({ nickname: childName.trim(), year_group: yearGroup }))
    window.location.href = `${WRIFEAPP_ORIGIN}/pricing?nc=${encodeURIComponent(payload)}`
  }

  // ── Shared styles ────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1.5px solid var(--color-border)',
    fontFamily: 'inherit',
    fontSize: 14,
    color: 'var(--color-text)',
    background: 'var(--color-surface)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    marginBottom: 5,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  }

  const errorStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#D63031',
    marginTop: 4,
    fontWeight: 600,
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: 'var(--color-background)', color: 'var(--color-text)', minHeight: '100vh' }}>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        background: 'var(--color-brand-primary)',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 48px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxSizing: 'border-box',
        width: '100%',
      }}>
        <button
          onClick={() => navigate('/')}
          data-testid="home-signup-nav-logo"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: 0 }}
        >
          <div style={{ width: 30, height: 26, background: 'rgba(255,255,255,0.2)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 16 14" fill="none" width="16" height="14">
              <rect x="0.5" y="0.5" width="7" height="13" rx="1" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
              <rect x="8.5" y="0.5" width="7" height="13" rx="1" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
              <line x1="8" y1="1" x2="8" y2="13" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
            </svg>
          </div>
          <span style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>WriFe</span>
        </button>

        <button
          onClick={() => navigate('/login')}
          data-testid="home-signup-nav-login"
          style={{
            background: 'none',
            border: '1.5px solid rgba(255,255,255,0.5)',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: 6,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          Sign in
        </button>
      </nav>

      {/* ── HERO BAND ────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--color-brand-primary)',
        padding: '20px clamp(16px, 4vw, 48px) 18px',
        color: '#fff',
        textAlign: 'center',
      }}>
        <span style={{
          display: 'inline-block',
          background: 'rgba(255,255,255,0.15)',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: '4px 12px',
          borderRadius: 20,
          marginBottom: 8,
        }}>
          Home learning plan
        </span>
        <h1 style={{ fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>
          Get started in 2 minutes
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.5 }}>
          Create your account, then choose a plan for your child.
        </p>
      </div>

      {/* ── STEP INDICATOR ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '16px 20px 0' }}>
        {(['account', 'child'] as Step[]).map((s, i) => {
          const isActive    = step === s
          const isCompleted = step === 'child' && s === 'account'
          const label       = s === 'account' ? 'Your account' : 'Your child'
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: isActive || isCompleted ? 1 : 0.4 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: isCompleted ? '#00B894' : isActive ? 'var(--color-brand-secondary)' : 'var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
                color: isCompleted || isActive ? '#fff' : 'var(--color-text-muted)',
                flexShrink: 0,
              }}>
                {isCompleted ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                {label}
              </span>
              {i < 1 && (
                <div style={{ width: 24, height: 1.5, background: step === 'child' ? '#00B894' : 'var(--color-border)', marginLeft: 2 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── FORM CARD ────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px clamp(16px, 4vw, 32px) 40px', maxWidth: 460, margin: '0 auto' }}>
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 18,
          border: '1px solid var(--color-border)',
          padding: 'clamp(20px, 3vw, 28px)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        }}>

          {/* ── STEP 1: Account details ────────────────────────────────── */}
          {step === 'account' && (
            <form onSubmit={handleAccountSubmit} noValidate>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)', margin: '0 0 4px' }}>
                Create your account
              </h2>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
                You'll use this to log in and manage your child's subscription.
              </p>

              {errors.general && (
                <div style={{ background: '#FFEAEA', border: '1.5px solid #D63031', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13, color: '#D63031', fontWeight: 600 }}>
                  {errors.general}
                  {errors.general.includes('already exists') && (
                    <span>
                      {' '}
                      <button type="button" onClick={() => navigate('/login')}
                        style={{ background: 'none', border: 'none', color: 'var(--color-brand-primary)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline', padding: 0 }}>
                        Sign in →
                      </button>
                    </span>
                  )}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" autoComplete="email" data-testid="home-signup-email"
                  style={{ ...inputStyle, borderColor: errors.email ? '#D63031' : 'var(--color-border)' }} />
                {errors.email && <p style={errorStyle}>{errors.email}</p>}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters" autoComplete="new-password" data-testid="home-signup-password"
                    style={{ ...inputStyle, borderColor: errors.password ? '#D63031' : 'var(--color-border)', paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-text-muted)', padding: 4 }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.password && <p style={errorStyle}>{errors.password}</p>}
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>Confirm password</label>
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password" autoComplete="new-password" data-testid="home-signup-confirm-password"
                  style={{ ...inputStyle, borderColor: errors.confirmPassword ? '#D63031' : 'var(--color-border)' }} />
                {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword}</p>}
              </div>

              <button type="submit" disabled={isLoading} data-testid="home-signup-account-submit"
                style={{ width: '100%', background: isLoading ? 'var(--color-border)' : 'var(--color-brand-secondary)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: isLoading ? 'not-allowed' : 'pointer', minHeight: 44 }}>
                {isLoading ? 'Creating account…' : 'Continue →'}
              </button>

              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
                By creating an account you agree to WriFe's terms of service and privacy policy.
              </p>
            </form>
          )}

          {/* ── STEP 2: Child details ──────────────────────────────────── */}
          {step === 'child' && (
            <form onSubmit={handleChildSubmit} noValidate>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 22 }}>🎒</span>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
                  Tell us about your child
                </h2>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
                We'll personalise their learning path. You can add more children later.
              </p>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>First name or nickname</label>
                <input type="text" value={childName} onChange={e => setChildName(e.target.value)}
                  placeholder="e.g. Alex" autoFocus data-testid="home-signup-child-name"
                  style={{ ...inputStyle, borderColor: errors.childName ? '#D63031' : 'var(--color-border)' }} />
                {errors.childName && <p style={errorStyle}>{errors.childName}</p>}
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>School year</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {YEAR_GROUPS.map(yr => (
                    <button key={yr} type="button" onClick={() => setYearGroup(yr)} data-testid={`home-signup-year-${yr}`}
                      style={{
                        padding: '9px 6px', borderRadius: 8,
                        border: `1.5px solid ${yearGroup === yr ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
                        background: yearGroup === yr ? 'rgba(108,92,231,0.08)' : 'var(--color-surface)',
                        color: yearGroup === yr ? 'var(--color-brand-primary)' : 'var(--color-text)',
                        fontFamily: 'inherit', fontSize: 13, fontWeight: yearGroup === yr ? 800 : 500,
                        cursor: 'pointer', textAlign: 'center', minHeight: 44,
                      }}>
                      Year {yr}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: 'var(--color-world-1-bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>💳</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-brand-primary)', marginBottom: 3 }}>Next: choose your plan</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                    Free access to the first 10 levels. Unlock all 61 lessons with a subscription — cancel any time.
                  </div>
                </div>
              </div>

              <button type="submit" data-testid="home-signup-child-submit"
                style={{ width: '100%', background: 'var(--color-brand-secondary)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer', minHeight: 44 }}>
                See plans →
              </button>

              <button type="button" onClick={() => setStep('account')}
                style={{ width: '100%', background: 'none', border: 'none', color: 'var(--color-text-muted)', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10, padding: '6px 0' }}>
                ← Back
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 16 }}>
          Already have an account?{' '}
          <button onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', color: 'var(--color-brand-primary)', fontFamily: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
