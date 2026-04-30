/**
 * AdminPage — creator-only content management tool.
 * Route: /admin  (guarded by AdminGuard)
 *
 * Workflow:
 *  1. Upload  — drop HTML lesson files → parse client-side
 *  2. Preview — review extracted activities, edit inline
 *  3. Publish — upsert lessons + activities to Supabase
 */
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { ParsedLesson, ParsedActivity } from '../../types'
import UploadPanel from './UploadPanel'
import PreviewPanel from './PreviewPanel'
import PublishPanel, { type PublishResult } from './PublishPanel'

type Step = 'upload' | 'preview' | 'publish'

// ── Supabase publish logic ───────────────────────────────────────
async function publishLesson(lesson: ParsedLesson): Promise<{ activitiesWritten: number }> {
  // 1. Upsert the lesson row
  const { data: lessonRow, error: lessonErr } = await supabase
    .from('lessons')
    .upsert(
      { lesson_number: lesson.lesson_number, world_id: lesson.world_id, title: lesson.title },
      { onConflict: 'lesson_number' }
    )
    .select('id')
    .single()

  if (lessonErr || !lessonRow) {
    throw new Error(lessonErr?.message ?? 'Failed to upsert lesson row')
  }

  const lessonId = lessonRow.id as string

  // 2. Delete all existing activities for this lesson (clean replace)
  const { error: delErr } = await supabase
    .from('activities')
    .delete()
    .eq('lesson_id', lessonId)

  if (delErr) throw new Error(`Failed to clear old activities: ${delErr.message}`)

  // 3. Insert new activities
  if (lesson.activities.length === 0) return { activitiesWritten: 0 }

  const rows = lesson.activities.map((a: ParsedActivity) => ({
    lesson_id:     lessonId,
    level:         a.level,
    type:          a.type,
    sort_order:    a.sort_order,
    question_json: a.question_json,
    answer_json:   a.answer_json,
  }))

  const { error: insertErr } = await supabase.from('activities').insert(rows)
  if (insertErr) throw new Error(`Failed to insert activities: ${insertErr.message}`)

  return { activitiesWritten: rows.length }
}

// ── Step indicator ───────────────────────────────────────────────
function StepDot({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 'var(--radius-full)',
        background: done ? 'var(--color-correct)' : active ? 'var(--color-brand-primary)' : 'var(--color-border)',
        color: done || active ? '#fff' : 'var(--color-text-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 'var(--font-size-xs)', fontWeight: 700,
      }}>
        {done ? '✓' : label[0]}
      </div>
      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: active ? 700 : 400, color: active ? 'var(--color-brand-primary)' : done ? 'var(--color-text-muted)' : 'var(--color-text-muted)' }}>
        {label}
      </span>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────
export default function AdminPage() {
  const { profile } = useAuthStore()
  const [step, setStep]         = useState<Step>('upload')
  const [lessons, setLessons]   = useState<ParsedLesson[]>([])
  const [publishing, setPublishing] = useState(false)
  const [results, setResults]   = useState<PublishResult[]>([])

  function handleParsed(parsed: ParsedLesson[]) {
    setLessons(parsed)
    if (parsed.length > 0) setStep('preview')
  }

  async function handlePublish() {
    setPublishing(true)
    const initialResults: PublishResult[] = lessons.map(l => ({ lesson: l, status: 'pending' }))
    setResults(initialResults)
    setStep('publish')

    const final: PublishResult[] = [...initialResults]
    for (let i = 0; i < lessons.length; i++) {
      final[i] = { ...final[i], status: 'publishing' }
      setResults([...final])
      try {
        const { activitiesWritten } = await publishLesson(lessons[i])
        final[i] = { ...final[i], status: 'done', activitiesWritten }
      } catch (err) {
        final[i] = { ...final[i], status: 'error', error: String(err) }
      }
      setResults([...final])
    }
    setPublishing(false)
  }

  function handleReset() {
    setStep('upload')
    setLessons([])
    setResults([])
    setPublishing(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 28 }}>🛠️</span>
            <h1 style={{ fontSize: 'var(--font-size-page-title)', fontWeight: 800, color: 'var(--color-brand-primary)', margin: 0 }}>
              WriFe Admin
            </h1>
          </div>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            Signed in as <strong>{profile?.name ?? 'Admin'}</strong> · Content Management Tool
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, padding: '12px 16px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
          <StepDot label="Upload"  active={step === 'upload'}  done={step === 'preview' || step === 'publish'} />
          <div style={{ height: 1, flex: 1, background: 'var(--color-border)', minWidth: 20 }} />
          <StepDot label="Preview" active={step === 'preview'} done={step === 'publish'} />
          <div style={{ height: 1, flex: 1, background: 'var(--color-border)', minWidth: 20 }} />
          <StepDot label="Publish" active={step === 'publish'} done={false} />
        </div>

        {/* Panel */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--color-border)', padding: '28px 24px', boxShadow: 'var(--shadow-md)' }}>
          {step === 'upload' && (
            <UploadPanel onParsed={handleParsed} />
          )}
          {step === 'preview' && (
            <PreviewPanel
              lessons={lessons}
              onChange={setLessons}
              onPublish={handlePublish}
              publishing={publishing}
            />
          )}
          {step === 'publish' && (
            <PublishPanel results={results} onReset={handleReset} />
          )}
        </div>

      </div>
    </div>
  )
}
