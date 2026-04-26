// TICKET-036 + TICKET-042: Class Creation + Leaderboard Toggle
import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import type { ClassRow } from '../../types'

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function TeacherSettings() {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()
  const [className, setClassName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: classRow, isLoading } = useQuery<ClassRow | null>({
    queryKey: ['teacher-class', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return null
      const { data } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', session.user.id)
        .maybeSingle()
      return data as ClassRow | null
    },
    enabled: !!session?.user,
  })

  const createClass = useMutation({
    mutationFn: async (name: string) => {
      if (!session?.user) throw new Error('Not authenticated')
      const invite_code = generateInviteCode()
      const { data, error } = await supabase
        .from('classes')
        .insert({ teacher_id: session.user.id, name, invite_code, leaderboard_enabled: false })
        .select()
        .single()
      if (error) throw error
      return data as ClassRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-class'] })
      setClassName('')
    },
    onError: (err: Error) => {
      setFormError(err.message)
    },
  })

  const toggleLeaderboard = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!classRow) throw new Error('No class found')
      const { error } = await supabase
        .from('classes')
        .update({ leaderboard_enabled: enabled })
        .eq('id', classRow.id)
      if (error) throw error
      return enabled
    },
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: ['teacher-class', session?.user?.id] })
      const prev = queryClient.getQueryData(['teacher-class', session?.user?.id])
      queryClient.setQueryData(['teacher-class', session?.user?.id], (old: ClassRow | null) =>
        old ? { ...old, leaderboard_enabled: enabled } : null
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(['teacher-class', session?.user?.id], ctx.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-class', session?.user?.id] })
    },
  })

  async function handleCopy() {
    if (!classRow) return
    await navigator.clipboard.writeText(classRow.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!className.trim()) { setFormError('Class name is required.'); return }
    createClass.mutate(className.trim())
  }

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <h2 style={titleStyle}>Class Settings</h2>
        <LoadingSkeleton height={160} variant="card" />
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Class Settings</h2>

      {!classRow ? (
        /* Create class card */
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>
            Create Your Class
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Create a class to track your pupils&apos; progress and share lesson access.
          </p>
          <form onSubmit={handleCreate} noValidate>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="class-name"
                style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '6px' }}
              >
                Class Name
              </label>
              <input
                id="class-name"
                data-testid="class-name-input"
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. Year 5 Butterflies"
                disabled={createClass.isPending}
                style={inputStyle}
              />
            </div>
            {formError && (
              <p style={{ color: 'var(--color-incorrect)', fontSize: '14px', marginBottom: '12px' }}>{formError}</p>
            )}
            <button
              type="submit"
              data-testid="create-class-btn"
              disabled={createClass.isPending}
              style={{
                ...btnPrimaryStyle,
                opacity: createClass.isPending ? 0.7 : 1,
              }}
            >
              {createClass.isPending ? 'Creating…' : 'Create Class'}
            </button>
          </form>
        </div>
      ) : (
        /* Existing class card */
        <div style={cardStyle}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>
              {classRow.name}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>Your class</p>
          </div>

          {/* Invite code */}
          <div style={{ marginBottom: '28px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
              Invite Code
            </p>
            <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Share this code with pupils so they can join your class.
            </p>
            <div
              data-testid="invite-code-display"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'var(--color-background)',
                border: '2px solid var(--color-brand-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
              }}
            >
              <span
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  letterSpacing: '6px',
                  color: 'var(--color-brand-primary)',
                  fontFamily: 'monospace',
                  flex: 1,
                }}
                data-tts={`invite code: ${classRow.invite_code}`}
              >
                {classRow.invite_code}
              </span>
              <button
                data-testid="copy-invite-code"
                onClick={handleCopy}
                title="Copy invite code"
                style={{
                  padding: '8px 14px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: copied ? 'var(--color-correct)' : 'var(--color-brand-primary)',
                  background: 'var(--color-surface)',
                  border: `1px solid ${copied ? 'var(--color-correct)' : 'var(--color-brand-primary)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  minHeight: '44px',
                  transition: 'all 150ms ease',
                }}
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>

          {/* Leaderboard toggle */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
              Leaderboard
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                background: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <label
                htmlFor="leaderboard-toggle"
                style={{ fontSize: '14px', color: 'var(--color-text)', flex: 1, cursor: 'pointer' }}
              >
                Enable class leaderboard
              </label>
              <button
                id="leaderboard-toggle"
                data-testid="leaderboard-toggle"
                role="switch"
                aria-checked={classRow.leaderboard_enabled}
                disabled={toggleLeaderboard.isPending}
                onClick={() => toggleLeaderboard.mutate(!classRow.leaderboard_enabled)}
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: '14px',
                  background: classRow.leaderboard_enabled ? 'var(--color-brand-primary)' : 'var(--color-border)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 200ms ease',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: classRow.leaderboard_enabled ? '23px' : '3px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'var(--color-surface)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'left 200ms ease',
                  }}
                />
              </button>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
              ⚠️ Pupils will see each other&apos;s first name, last initial, and XP total
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

const containerStyle: React.CSSProperties = { padding: '24px', maxWidth: '560px' }
const titleStyle: React.CSSProperties = { margin: '0 0 20px', fontSize: '22px', fontWeight: 600, color: 'var(--color-text)' }

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '24px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 14px',
  fontSize: '16px',
  border: '2px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text)',
  background: 'var(--color-surface)',
  outline: 'none',
  minHeight: '44px',
}

const btnPrimaryStyle: React.CSSProperties = {
  padding: '10px 24px',
  fontSize: '15px',
  fontWeight: 600,
  color: 'var(--color-text-on-dark)',
  background: 'var(--color-brand-primary)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  minHeight: '44px',
}
