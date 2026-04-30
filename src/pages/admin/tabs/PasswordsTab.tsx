/**
 * PasswordsTab — send a password-reset email to any user.
 * Uses supabase.auth.resetPasswordForEmail (no service role needed).
 */
import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function PasswordsTab() {
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function handleSend() {
    if (!email.trim()) return
    setStatus('sending')
    setMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setStatus('error')
      setMessage(error.message)
    } else {
      setStatus('sent')
      setMessage(`Reset email sent to ${email.trim()}`)
    }
  }

  function handleReset() {
    setEmail('')
    setStatus('idle')
    setMessage('')
  }

  return (
    <div>
      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>Password Reset</h2>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 28 }}>
        Send a reset link to any user's email address. The user will receive an email with a link to set a new password.
      </p>

      <div style={{ maxWidth: 480, background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 24 }}>
        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
          User email address
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void handleSend()}
          placeholder="pupil@example.com"
          disabled={status === 'sending' || status === 'sent'}
          data-testid="reset-email-input"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
            border: `1.5px solid ${status === 'error' ? 'var(--color-incorrect)' : 'var(--color-border)'}`,
            fontSize: 'var(--font-size-base)', marginBottom: 14,
            background: status === 'sent' ? 'var(--color-correct-bg)' : 'var(--color-background)',
          }}
        />

        {message && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 14,
            background: status === 'sent' ? 'var(--color-correct-bg)' : 'var(--color-incorrect-bg)',
            color: status === 'sent' ? 'var(--color-correct)' : 'var(--color-incorrect)',
            fontSize: 'var(--font-size-sm)', fontWeight: 600,
          }}>
            {status === 'sent' ? '✓ ' : '✕ '}{message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          {status !== 'sent' ? (
            <button
              onClick={() => void handleSend()}
              disabled={!email.trim() || status === 'sending'}
              data-testid="reset-send-btn"
              style={{
                padding: '10px 22px', borderRadius: 'var(--radius-full)', border: 'none',
                background: !email.trim() || status === 'sending' ? 'var(--color-border)' : 'var(--color-brand-primary)',
                color: '#fff', fontWeight: 700, fontSize: 'var(--font-size-sm)',
                cursor: !email.trim() || status === 'sending' ? 'not-allowed' : 'pointer',
                minHeight: 'var(--touch-target)',
              }}>
              {status === 'sending' ? '⏳ Sending…' : '🔑 Send Reset Link'}
            </button>
          ) : (
            <button onClick={handleReset} data-testid="reset-again-btn"
              style={{ padding: '10px 22px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 'var(--font-size-sm)', cursor: 'pointer', minHeight: 'var(--touch-target)' }}>
              Send another
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 28, padding: 16, background: 'var(--color-world-5-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', maxWidth: 480 }}>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
          <strong>Note:</strong> The reset link expires after 1 hour. If the user doesn't receive the email, ask them to check their spam folder, or verify the address is correct in the Supabase Auth dashboard.
        </p>
      </div>
    </div>
  )
}
