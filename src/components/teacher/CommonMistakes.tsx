// Common Mistakes + Teacher Feedback Panel
// Shows a pupil's top wrong-answer activities with correct answer display,
// what the pupil actually selected, and a teacher feedback textarea per activity.
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import LoadingSkeleton from '../LoadingSkeleton'
import type { CommonMistake, Activity, MCQuestion, FillBlankQuestion, WriteQuestion, MatchQuestion } from '../../types'

interface Props {
  pupilId: string
}

interface RawResponse {
  activity_id: string
  responded_at: string
  response_json: Record<string, unknown>
  activities: Activity | null
}

interface FeedbackRow {
  activity_id: string
  feedback_text: string
}

// ── Answer display helpers ─────────────────────────────────────────────────

function getCorrectAnswerText(activity: Activity): string {
  const q = activity.question_json
  if (!q) return '—'
  switch (activity.type) {
    case 'mc': return (q as MCQuestion).correct ?? '—'
    case 'fillblank': {
      const blanks = (q as FillBlankQuestion).blanks ?? []
      return blanks.map((b) => b.answer).join(', ') || '—'
    }
    case 'write': return (q as WriteQuestion).modelAnswer ?? '—'
    case 'match': {
      const pairs = (q as MatchQuestion).pairs ?? []
      return pairs.map((p) => `${p.left} → ${p.right}`).join(' | ') || '—'
    }
    case 'checklist': return 'Self-assessed'
    default: return '—'
  }
}

function getQuestionText(activity: Activity): string {
  const q = activity.question_json
  if ('question' in q && typeof q.question === 'string') return q.question
  return 'Unknown question'
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { mc: 'MC', write: 'Write', match: 'Match', fillblank: 'Fill', checklist: 'Check' }
  return map[type] ?? type.toUpperCase()
}

// ── Sub-component: FeedbackEditor ─────────────────────────────────────────

interface FeedbackEditorProps {
  activityId: string
  pupilId: string
  initialText: string
  onSaved: () => void
}

function FeedbackEditor({ activityId, pupilId, initialText, onSaved }: FeedbackEditorProps) {
  const { session } = useAuthStore()
  const [text, setText] = useState(initialText)
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: async (feedbackText: string) => {
      if (!session?.user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('teacher_feedback')
        .upsert(
          {
            teacher_id: session.user.id,
            pupil_id: pupilId,
            activity_id: activityId,
            feedback_text: feedbackText,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'teacher_id,pupil_id,activity_id' }
        )
      if (error) throw error
    },
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved()
    },
  })

  return (
    <div style={{ marginTop: '12px' }}>
      <label
        style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '6px' }}
        data-tts="teacher feedback label"
      >
        Teacher Feedback
      </label>
      <textarea
        data-testid={`feedback-textarea-${activityId}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a note for this pupil about this question…"
        rows={3}
        style={{
          width: '100%',
          padding: '8px 10px',
          fontSize: '14px',
          color: 'var(--color-text)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          resize: 'vertical',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
          outline: 'none',
          transition: 'border-color 150ms',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand-primary)' }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
        <button
          data-testid={`feedback-save-${activityId}`}
          onClick={() => mutation.mutate(text)}
          disabled={mutation.isPending || text === initialText}
          style={{
            padding: '6px 16px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-on-dark)',
            background: 'var(--color-brand-secondary)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: mutation.isPending || text === initialText ? 'not-allowed' : 'pointer',
            opacity: mutation.isPending || text === initialText ? 0.5 : 1,
            minHeight: '32px',
            transition: 'opacity 150ms',
          }}
        >
          {mutation.isPending ? 'Saving…' : 'Save Note'}
        </button>
        {saved && (
          <span style={{ fontSize: '13px', color: 'var(--color-correct)', fontWeight: 500 }} role="status">
            ✓ Saved
          </span>
        )}
        {mutation.isError && (
          <span style={{ fontSize: '13px', color: 'var(--color-incorrect)' }} role="alert">
            Failed to save
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function CommonMistakes({ pupilId }: Props) {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: mistakes = [], isLoading } = useQuery<CommonMistake[]>({
    queryKey: ['common-mistakes', pupilId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pupil_responses')
        .select('activity_id, responded_at, response_json, activities(*)')
        .eq('pupil_id', pupilId)
        .eq('is_correct', false)
        .eq('attempt_number', 1)
        .order('responded_at', { ascending: false })

      if (error || !data) return []

      const rows = data as unknown as RawResponse[]
      const countMap = new Map<string, {
        count: number
        lastAttempted: string
        activity: Activity
        lastResponse: Record<string, unknown>
      }>()

      for (const row of rows) {
        if (!row.activities) continue
        const existing = countMap.get(row.activity_id)
        if (existing) {
          existing.count += 1
        } else {
          countMap.set(row.activity_id, {
            count: 1,
            lastAttempted: row.responded_at,
            activity: row.activities,
            lastResponse: row.response_json ?? {},
          })
        }
      }

      return Array.from(countMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(({ activity, count, lastAttempted }) => ({
          activity,
          wrongCount: count,
          lastAttempted,
        }))
    },
  })

  // Fetch existing teacher feedback for all mistake activities in one query
  const { data: feedbackRows = [], refetch: refetchFeedback } = useQuery<FeedbackRow[]>({
    queryKey: ['teacher-feedback', session?.user?.id, pupilId],
    queryFn: async () => {
      if (!session?.user || mistakes.length === 0) return []
      const activityIds = mistakes.map((m) => m.activity.id)
      const { data } = await supabase
        .from('teacher_feedback')
        .select('activity_id, feedback_text')
        .eq('teacher_id', session.user.id)
        .eq('pupil_id', pupilId)
        .in('activity_id', activityIds)
      return (data ?? []) as FeedbackRow[]
    },
    enabled: !!session?.user && mistakes.length > 0,
  })

  const feedbackByActivity = new Map(feedbackRows.map((f) => [f.activity_id, f.feedback_text]))

  const handleFeedbackSaved = useCallback(() => {
    void refetchFeedback()
    void queryClient.invalidateQueries({ queryKey: ['teacher-feedback', session?.user?.id, pupilId] })
  }, [refetchFeedback, queryClient, session?.user?.id, pupilId])

  if (isLoading) {
    return (
      <div style={sectionStyle}>
        <h3 style={headingStyle}>Common Mistakes &amp; Feedback</h3>
        {[1, 2, 3].map((i) => <LoadingSkeleton key={i} height={48} style={{ marginBottom: 8 }} />)}
      </div>
    )
  }

  if (mistakes.length === 0) {
    return (
      <div style={sectionStyle}>
        <h3 style={headingStyle}>Common Mistakes &amp; Feedback</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', margin: 0 }} data-tts="no mistakes message">
          No mistakes yet — great start! 🎉
        </p>
      </div>
    )
  }

  return (
    <div style={sectionStyle}>
      <h3 style={headingStyle}>Common Mistakes &amp; Feedback</h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '12px' }}>
        Top wrong answers on first attempt · most frequent first · click to expand and add feedback
      </p>

      <div>
        {mistakes.map(({ activity, wrongCount }) => {
          const questionText = getQuestionText(activity)
          const correctAnswer = getCorrectAnswerText(activity)
          const isExpanded = expanded === activity.id
          const hasFeedback = feedbackByActivity.has(activity.id)
          const existingFeedback = feedbackByActivity.get(activity.id) ?? ''

          return (
            <div key={activity.id} style={{ marginBottom: '4px' }}>
              {/* Row header */}
              <button
                data-testid={`mistake-row-${activity.id}`}
                onClick={() => setExpanded(isExpanded ? null : activity.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  background: isExpanded ? 'var(--color-background)' : 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: isExpanded ? 'var(--radius-sm) var(--radius-sm) 0 0' : 'var(--radius-sm)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minHeight: '44px',
                  transition: 'background 150ms',
                }}
              >
                {/* Wrong count badge */}
                <span style={{
                  background: 'var(--color-incorrect-bg)',
                  color: 'var(--color-incorrect)',
                  fontWeight: 700,
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  flexShrink: 0,
                  minWidth: '52px',
                  textAlign: 'center',
                }}>
                  ✗ {wrongCount}×
                </span>

                {/* Activity type chip */}
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  padding: '1px 6px',
                  borderRadius: 4,
                  flexShrink: 0,
                }}>{typeLabel(activity.type)}</span>

                {/* Question preview */}
                <span style={{ fontSize: '14px', color: 'var(--color-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  data-tts={`mistake: ${questionText}`}>
                  {truncate(questionText, 90)}
                </span>

                {/* Feedback indicator */}
                {hasFeedback && (
                  <span
                    title="Feedback written"
                    style={{ fontSize: '13px', flexShrink: 0 }}
                    aria-label="Has teacher feedback"
                  >
                    💬
                  </span>
                )}

                <span style={{ color: 'var(--color-text-muted)', fontSize: '12px', flexShrink: 0 }}>
                  {isExpanded ? '▲' : '▼'}
                </span>
              </button>

              {/* Expanded panel */}
              {isExpanded && (
                <div
                  data-testid={`mistake-expand-${activity.id}`}
                  style={{
                    padding: '16px',
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderTop: 'none',
                    borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                  }}
                >
                  {/* Full question */}
                  <div style={expandSection}>
                    <span style={expandLabel}>Question</span>
                    <p style={expandText} data-tts="full question">{questionText}</p>
                  </div>

                  {/* Correct answer */}
                  <div style={expandSection}>
                    <span style={expandLabel}>Correct Answer</span>
                    <p style={{ ...expandText, color: 'var(--color-correct)', fontWeight: 500 }} data-tts="correct answer">
                      {correctAnswer}
                    </p>
                  </div>

                  {/* Teacher feedback */}
                  {session?.user && (
                    <FeedbackEditor
                      activityId={activity.id}
                      pupilId={pupilId}
                      initialText={existingFeedback}
                      onSaved={handleFeedbackSaved}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '20px',
}

const headingStyle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--color-text)',
}

const expandSection: React.CSSProperties = { marginBottom: '12px' }

const expandLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--color-text-muted)',
  marginBottom: '4px',
}

const expandText: React.CSSProperties = {
  margin: 0,
  fontSize: '14px',
  color: 'var(--color-text)',
  lineHeight: 1.5,
}
