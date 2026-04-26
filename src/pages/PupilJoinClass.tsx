// TICKET-037: Pupil Join Class Flow
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

interface JoinResult {
  className: string
}

export default function PupilJoinClass() {
  const { session } = useAuthStore()
  const [code, setCode] = useState('')
  const [joined, setJoined] = useState<JoinResult | null>(null)

  const joinMutation = useMutation<JoinResult, Error, string>({
    mutationFn: async (inviteCode: string) => {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('invite_code', inviteCode.toUpperCase())
        .maybeSingle()

      if (classError || !classData) {
        throw new Error("That code doesn't match any class — check with your teacher")
      }

      if (!session?.user) throw new Error('Not authenticated')

      const { error: memberError } = await supabase
        .from('class_members')
        .insert({ class_id: classData.id, pupil_id: session.user.id })

      if (memberError && memberError.code !== '23505') {
        // 23505 = duplicate key (already a member)
        throw new Error('Failed to join class. Please try again.')
      }

      return { className: (classData as { id: string; name: string }).name }
    },
    onSuccess: (result) => {
      setJoined(result)
    },
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    joinMutation.mutate(code.trim())
  }

  if (joined) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <img
            src="/mascots/penny-pencil.svg"
            alt=""
            role="presentation"
            width={120}
            height={150}
            loading="lazy"
            style={{ marginBottom: '8px' }}
          />
          <h1 style={headingStyle} data-tts={`joined class: ${joined.className}`}>
            You joined {joined.className}! 🎉
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '16px', marginBottom: '24px' }}>
            Your teacher can now see your progress and help you on your journey.
          </p>
          <Link
            to="/world-map"
            data-testid="join-class-go-map"
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-text-on-dark)',
              background: 'var(--color-brand-primary)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              minHeight: '44px',
            }}
          >
            Back to World Map
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={headingStyle}>Join Your Class</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '16px', marginBottom: '24px', lineHeight: 1.5 }}>
          Ask your teacher for the 6-letter invite code, then enter it below.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="invite-code"
              style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '6px' }}
            >
              Class Invite Code
            </label>
            <input
              id="invite-code"
              data-testid="invite-code-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="e.g. ABC123"
              maxLength={6}
              disabled={joinMutation.isPending}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '14px',
                fontSize: '24px',
                fontWeight: 700,
                letterSpacing: '6px',
                fontFamily: 'monospace',
                textAlign: 'center',
                border: '2px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)',
                background: 'var(--color-surface)',
                outline: 'none',
                minHeight: '56px',
                textTransform: 'uppercase',
              }}
            />
          </div>

          {joinMutation.error && (
            <p
              style={{
                color: 'var(--color-incorrect)',
                background: 'var(--color-incorrect-bg)',
                border: '1px solid var(--color-incorrect)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: '14px',
                marginBottom: '16px',
              }}
              role="alert"
              data-tts="join class error"
            >
              {joinMutation.error.message}
            </p>
          )}

          <button
            type="submit"
            data-testid="join-class-btn"
            disabled={joinMutation.isPending || code.length < 6}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-text-on-dark)',
              background: 'var(--color-brand-primary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              minHeight: '44px',
              opacity: joinMutation.isPending || code.length < 6 ? 0.6 : 1,
              marginBottom: '16px',
            }}
          >
            {joinMutation.isPending ? 'Joining…' : 'Join Class'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
          <Link to="/world-map" style={{ color: 'var(--color-brand-primary)', textDecoration: 'none', fontWeight: 500 }}>
            Skip for now
          </Link>
        </p>
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--color-background)',
  padding: '16px',
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  background: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-md)',
  padding: '32px 24px',
  textAlign: 'center',
}

const headingStyle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: '24px',
  fontWeight: 700,
  color: 'var(--color-text)',
}
