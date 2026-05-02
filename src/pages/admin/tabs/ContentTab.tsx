/**
 * ContentTab — wraps the 3-step lesson upload/parse/preview/publish wizard.
 * Extracted from AdminPage to keep each tab under 200 lines.
 */
import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { ParsedLesson, ParsedActivity } from '../../../types'
import UploadPanel from '../UploadPanel'
import PreviewPanel from '../PreviewPanel'
import PublishPanel, { type PublishResult } from '../PublishPanel'

type Step = 'upload' | 'preview' | 'publish'

async function publishLesson(lesson: ParsedLesson): Promise<{ activitiesWritten: number }> {
  const { data: lessonRow, error: lessonErr } = await supabase
    .from('practice_lessons')
    .upsert(
      { lesson_number: lesson.lesson_number, world_id: lesson.world_id, title: lesson.title },
      { onConflict: 'lesson_number' }
    )
    .select('id')
    .single()

  if (lessonErr || !lessonRow) throw new Error(lessonErr?.message ?? 'Failed to upsert lesson row')

  const lessonId = lessonRow.id as string

  const { error: delErr } = await supabase.from('activities').delete().eq('lesson_id', lessonId)
  if (delErr) throw new Error(`Failed to clear old activities: ${delErr.message}`)

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
      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: active ? 700 : 400, color: active ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}>
        {label}
      </span>
    </div>
  )
}

export default function ContentTab() {
  const [step, setStep]       = useState<Step>('upload')
  const [lessons, setLessons] = useState<ParsedLesson[]>([])
  const [publishing, setPublishing] = useState(false)
  const [results, setResults] = useState<PublishResult[]>([])

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
    <div>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '12px 16px', background: 'var(--color-background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
        <StepDot label="Upload"  active={step === 'upload'}  done={step === 'preview' || step === 'publish'} />
        <div style={{ height: 1, flex: 1, background: 'var(--color-border)', minWidth: 20 }} />
        <StepDot label="Preview" active={step === 'preview'} done={step === 'publish'} />
        <div style={{ height: 1, flex: 1, background: 'var(--color-border)', minWidth: 20 }} />
        <StepDot label="Publish" active={step === 'publish'} done={false} />
      </div>

      {step === 'upload'  && <UploadPanel onParsed={handleParsed} />}
      {step === 'preview' && <PreviewPanel lessons={lessons} onChange={setLessons} onPublish={handlePublish} publishing={publishing} />}
      {step === 'publish' && <PublishPanel results={results} onReset={handleReset} />}
    </div>
  )
}
