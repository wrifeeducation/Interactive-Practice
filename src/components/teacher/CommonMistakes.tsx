// TICKET-041: Common Mistakes Panel
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import LoadingSkeleton from '../LoadingSkeleton'
import type { CommonMistake, Activity } from '../../types'

interface Props {
  pupilId: string
}

interface RawResponse {
  activity_id: string
  responded_at: string
  activities: Activity | null
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

function getQuestionText(activity: Activity): string {
  const q = activity.question_json
  if ('question' in q && typeof q.question === 'string') return q.question
  return 'Unknown question'
}

export default function CommonMistakes({ pupilId }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: mistakes = [], isLoading } = useQuery<CommonMistake[]>({
    queryKey: ['common-mistakes', pupilId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pupil_responses')
        .select('activity_id, responded_at, activities(*)')
        .eq('pupil_id', pupilId)
        .eq('is_correct', false)
        .eq('attempt_number', 1)
        .order('responded_at', { ascending: false })

      if (error || !data) return []

      const rows = data as unknown as RawResponse[]
      const countMap = new Map<string, { count: number; lastAttempted: string; activity: Activity }>()

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

  if (isLoading) {
    return (
      <div style={sectionStyle}>
        <h3 style={headingStyle}>Common Mistakes</h3>
        {[1, 2, 3].map((i) => (
          <LoadingSkeleton key={i} height={48} style={{ marginBottom: 8 }} />
        ))}
      </div>
    )
  }

  if (mistakes.length === 0) {
    return (
      <div style={sectionStyle}>
        <h3 style={headingStyle}>Common Mistakes</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', margin: 0 }} data-tts="no mistakes message">
          No mistakes yet — great start! 🎉
        </p>
      </div>
    )
  }

  return (
    <div style={sectionStyle}>
      <h3 style={headingStyle}>Common Mistakes</h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '12px' }}>
        Top wrong answers on first attempt — most frequent first
      </p>
      <div>
        {mistakes.map(({ activity, wrongCount }) => {
          const questionText = getQuestionText(activity)
          const isExpanded = expanded === activity.id
          const answerData = activity.answer_json

          return (
            <div key={activity.id} style={{ marginBottom: '4px' }}>
              <button
                data-testid={`mistake-row-${activity.id}`}
                onClick={() => setExpanded(isExpanded ? null : activity.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: isExpanded ? 'var(--color-background)' : 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: isExpanded ? 'var(--radius-sm) var(--radius-sm) 0 0' : 'var(--radius-sm)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minHeight: '44px',
                }}
              >
                <span
                  style={{
                    background: 'var(--color-incorrect-bg)',
                    color: 'var(--color-incorrect)',
                    fontWeight: 700,
                    fontSize: '13px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    flexShrink: 0,
                    minWidth: '60px',
                    textAlign: 'center',
                  }}
                >
                  ✗ {wrongCount}×
                </span>
                <span
                  style={{ fontSize: '14px', color: 'var(--color-text)', flex: 1 }}
                  data-tts={`mistake: ${questionText}`}
                >
                  {truncate(questionText, 80)}
                </span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '12px', flexShrink: 0 }}>
                  {isExpanded ? '▲' : '▼'}
                </span>
              </button>

              {isExpanded && (
                <div
                  data-testid={`mistake-expand-${activity.id}`}
                  style={{
                    padding: '12px',
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderTop: 'none',
                    borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                  }}
                >
                  <p style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--color-text)', fontWeight: 600 }}>
                    Full question:
                  </p>
                  <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--color-text)' }} data-tts="full question">
                    {questionText}
                  </p>
                  {answerData && (
                    <>
                      <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        Correct answer:
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-correct)', fontWeight: 500 }} data-tts="correct answer">
                        {JSON.stringify(answerData)}
                      </p>
                    </>
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
