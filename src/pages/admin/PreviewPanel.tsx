/**
 * PreviewPanel — shows parsed activities per lesson with inline editing.
 * Each activity card shows type, level, question text and allows
 * editing of the question field and tier before publishing.
 */
import { useState } from 'react'
import type { ParsedLesson, ParsedActivity, ActivityLevel } from '../../types'

interface Props {
  lessons: ParsedLesson[]
  onChange: (updated: ParsedLesson[]) => void
  onPublish: () => void
  publishing: boolean
}

const TIER_COLOURS: Record<ActivityLevel, string> = {
  bronze: 'var(--color-bronze)',
  silver: 'var(--color-silver)',
  gold:   'var(--color-gold)',
}
const TYPE_EMOJI: Record<string, string> = {
  mc: '🔘', match: '🔗', fillblank: '✏️', write: '📝', checklist: '☑️',
}

function getQuestion(a: ParsedActivity): string {
  const q = a.question_json as unknown as Record<string, unknown>
  return String(q.question ?? q.prompt ?? '')
}

function ActivityRow({
  activity, onEdit,
}: {
  activity: ParsedActivity
  onEdit: (updated: ParsedActivity) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(getQuestion(activity))
  const [tier, setTier] = useState<ActivityLevel>(activity.level)

  function save() {
    const updated: ParsedActivity = {
      ...activity,
      level: tier,
      isDirty: draft !== getQuestion(activity) || tier !== activity.level,
      question_json: { ...(activity.question_json as unknown as Record<string, unknown>), question: draft } as ParsedActivity['question_json'],
    }
    onEdit(updated)
    setEditing(false)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 12px', borderRadius: 'var(--radius-md)',
      background: activity.isDirty ? '#FFFBEB' : 'var(--color-surface)',
      border: `1px solid ${activity.isDirty ? 'var(--color-hint)' : 'var(--color-border)'}`,
      marginBottom: 6,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{TYPE_EMOJI[activity.type] ?? '❓'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={3}
              style={{ width: '100%', fontSize: 'var(--font-size-sm)', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-brand-primary)', padding: '6px 8px', resize: 'vertical' }}
              data-testid="activity-question-input"
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Tier:</label>
              {(['bronze','silver','gold'] as ActivityLevel[]).map(t => (
                <button key={t} onClick={() => setTier(t)} data-testid={`tier-btn-${t}`}
                  style={{ padding: '2px 10px', borderRadius: 'var(--radius-full)', border: `2px solid ${TIER_COLOURS[t]}`, background: tier === t ? TIER_COLOURS[t] : 'transparent', color: tier === t ? '#fff' : TIER_COLOURS[t], fontSize: 'var(--font-size-xs)', fontWeight: 700, cursor: 'pointer' }}>
                  {t}
                </button>
              ))}
              <button onClick={save} data-testid="activity-save-btn"
                style={{ marginLeft: 'auto', padding: '4px 14px', borderRadius: 'var(--radius-full)', background: 'var(--color-brand-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 'var(--font-size-xs)', fontWeight: 700 }}>
                Save
              </button>
              <button onClick={() => setEditing(false)}
                style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: TIER_COLOURS[activity.level], textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {activity.level} · {activity.type}
              </span>
              {activity.isDirty && <span style={{ marginLeft: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-hint)' }}>edited</span>}
              <p style={{ margin: '2px 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', lineHeight: 1.4 }}>{getQuestion(activity) || <em style={{ color: 'var(--color-text-muted)' }}>No question text</em>}</p>
            </div>
            <button onClick={() => setEditing(true)} data-testid="activity-edit-btn"
              style={{ flexShrink: 0, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'transparent', color: 'var(--color-brand-primary)', border: '1px solid var(--color-brand-primary)', cursor: 'pointer', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PreviewPanel({ lessons, onChange, onPublish, publishing }: Props) {
  const [openIdx, setOpenIdx] = useState<number>(0)

  function updateActivity(lIdx: number, aIdx: number, updated: ParsedActivity) {
    const next = lessons.map((l, li) => li !== lIdx ? l : {
      ...l,
      activities: l.activities.map((a, ai) => ai !== aIdx ? a : updated),
    })
    onChange(next)
  }

  const totalActivities = lessons.reduce((s, l) => s + l.activities.length, 0)
  const dirtyCount = lessons.reduce((s, l) => s + l.activities.filter(a => a.isDirty).length, 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>Preview & Edit</h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            {lessons.length} lesson(s) · {totalActivities} activities{dirtyCount > 0 ? ` · ${dirtyCount} edited` : ''}
          </p>
        </div>
        <button onClick={onPublish} disabled={publishing} data-testid="publish-btn"
          style={{ padding: '10px 24px', borderRadius: 'var(--radius-full)', background: publishing ? 'var(--color-text-muted)' : 'var(--color-brand-secondary)', color: '#fff', border: 'none', cursor: publishing ? 'not-allowed' : 'pointer', fontSize: 'var(--font-size-base)', fontWeight: 700, minHeight: 'var(--touch-target)' }}>
          {publishing ? '⏳ Publishing…' : '🚀 Publish to Database'}
        </button>
      </div>

      {lessons.map((lesson, lIdx) => (
        <div key={lesson.lesson_number} style={{ marginBottom: 8, border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <button onClick={() => setOpenIdx(openIdx === lIdx ? -1 : lIdx)}
            data-testid={`lesson-accordion-${lesson.lesson_number}`}
            style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: openIdx === lIdx ? 'var(--color-world-1-bg)' : 'var(--color-surface)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: 'var(--color-text)' }}>
              L{String(lesson.lesson_number).padStart(2,'0')} — {lesson.title}
            </span>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              {lesson.activities.length} activities {openIdx === lIdx ? '▲' : '▼'}
            </span>
          </button>

          {openIdx === lIdx && (
            <div style={{ padding: '12px 16px', background: 'var(--color-background)' }}>
              {lesson.activities.length === 0
                ? <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', fontStyle: 'italic' }}>No activities parsed — file may use an unrecognised format.</p>
                : lesson.activities.map((act, aIdx) => (
                    <ActivityRow key={aIdx} activity={act} onEdit={u => updateActivity(lIdx, aIdx, u)} />
                  ))
              }
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
