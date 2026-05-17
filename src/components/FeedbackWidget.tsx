/**
 * FeedbackWidget — floating "Report a problem" button for Interactive Practice.
 * Appears on every page. Submits to the submit-feedback Edge Function.
 * Auto-fills app, page URL, username and class code from session.
 */
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { usePupilStore } from '../stores/pupilStore'
import { useAuthStore } from '../stores/authStore'

const EDGE_URL = 'https://gzmgjkbtsvezfclmreru.supabase.co/functions/v1/submit-feedback'

export default function FeedbackWidget() {
  const [open, setOpen]         = useState(false)
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const [sent, setSent]         = useState(false)
  const [error, setError]       = useState('')

  const pupilSession = usePupilStore((s) => s.pupilSession)
  const profile      = useAuthStore((s) => s.profile)

  const userType = profile?.role === 'pupil' ? 'pupil'
    : profile?.role === 'teacher' ? 'teacher'
    : 'unknown'

  const handleOpen  = useCallback(() => { setOpen(true); setSent(false); setError(''); setText('') }, [])
  const handleClose = useCallback(() => setOpen(false), [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          app: 'ip',
          user_type: userType,
          username: pupilSession?.username || undefined,
          class_code: pupilSession?.classCode || undefined,
          page_url: window.location.href,
          description: text.trim(),
          device_info: `${navigator.userAgent.slice(0, 120)}`,
        }),
      })
      if (!res.ok) throw new Error('submit failed')
      setSent(true)
      setText('')
    } catch {
      setError('Could not send — please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={handleOpen}
        data-testid="feedback-trigger"
        aria-label="Report a problem"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9000,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--color-brand-primary)',
          border: 'none',
          boxShadow: '0 4px 12px rgba(108,92,231,0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          transition: 'transform 120ms ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        💬
      </button>

      {/* Modal backdrop + panel */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Report a problem"
          style={{
            position: 'fixed', inset: 0, zIndex: 9100,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '0 16px 24px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div style={{
            width: '100%', maxWidth: 420,
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>
                  Thanks! Message sent.
                </p>
                <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: '0 0 20px' }}>
                  We'll look into it as soon as possible.
                </p>
                <button onClick={handleClose} style={closeBtn}>Close</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
                    💬 Report a problem
                  </h2>
                  <button type="button" onClick={handleClose} style={xBtn} aria-label="Close">✕</button>
                </div>

                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
                  Tell us what's wrong — we'll fix it quickly!
                </p>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. The match activity wouldn't let me drag the words…"
                  rows={4}
                  maxLength={1000}
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '12px', fontSize: 14,
                    border: '2px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text)',
                    background: '#fff',
                    resize: 'vertical',
                    outline: 'none',
                    lineHeight: 1.5,
                    marginBottom: 4,
                  }}
                />
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 14px', textAlign: 'right' }}>
                  {text.length}/1000
                </p>

                {error && (
                  <p style={{ fontSize: 13, color: 'var(--color-incorrect)', margin: '0 0 12px' }}>⚠️ {error}</p>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={handleClose} style={{ ...closeBtn, flex: 1 }}>Cancel</button>
                  <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    style={{
                      flex: 2, padding: '11px', fontSize: 15, fontWeight: 700,
                      color: '#fff', background: 'var(--color-brand-secondary)',
                      border: 'none', borderBottom: '3px solid #C97D10',
                      borderRadius: 'var(--radius-full)', cursor: 'pointer',
                      opacity: (sending || !text.trim()) ? 0.6 : 1,
                    }}
                  >
                    {sending ? 'Sending…' : 'Send report'}
                  </button>
                </div>

                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '12px 0 0', textAlign: 'center' }}>
                  Auto-includes: {userType}{pupilSession?.username ? ` · ${pupilSession.username}` : ''} · current page
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const closeBtn: React.CSSProperties = {
  padding: '10px 16px', fontSize: 14, fontWeight: 600,
  color: 'var(--color-text-muted)', background: 'var(--color-background)',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)',
  cursor: 'pointer',
}
const xBtn: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 16,
  color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px 8px',
}
