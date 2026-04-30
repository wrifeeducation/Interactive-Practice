/**
 * PublishPanel — shows per-lesson publish status after publishing to Supabase.
 * Receives the results array from AdminPage after the upsert loop completes.
 */
import type { ParsedLesson } from '../../types'

export type PublishResult = {
  lesson: ParsedLesson
  status: 'pending' | 'publishing' | 'done' | 'error'
  error?: string
  activitiesWritten?: number
}

interface Props {
  results: PublishResult[]
  onReset: () => void
}

const STATUS_ICON: Record<PublishResult['status'], string> = {
  pending:    '⏳',
  publishing: '🔄',
  done:       '✅',
  error:      '❌',
}

export default function PublishPanel({ results, onReset }: Props) {
  const done      = results.filter(r => r.status === 'done').length
  const errors    = results.filter(r => r.status === 'error').length
  const total     = results.length
  const allFinished = results.every(r => r.status === 'done' || r.status === 'error')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>
            Publishing to Database
          </h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            {done}/{total} complete{errors > 0 ? ` · ${errors} error(s)` : ''}
          </p>
        </div>
        {allFinished && (
          <button
            onClick={onReset}
            data-testid="publish-reset-btn"
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-brand-primary)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 700,
            }}
          >
            Upload More Files
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 8, background: 'var(--color-border)', borderRadius: 'var(--radius-full)', marginBottom: 20, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${total > 0 ? (done / total) * 100 : 0}%`,
          background: errors > 0 ? 'var(--color-incorrect)' : 'var(--color-correct)',
          borderRadius: 'var(--radius-full)',
          transition: 'width var(--transition-normal)',
        }} />
      </div>

      {results.map((r, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          background: r.status === 'error' ? 'var(--color-incorrect-bg)' : r.status === 'done' ? 'var(--color-correct-bg)' : 'var(--color-surface)',
          border: `1px solid ${r.status === 'error' ? 'var(--color-incorrect)' : r.status === 'done' ? 'var(--color-correct)' : 'var(--color-border)'}`,
          marginBottom: 6,
        }}>
          <span style={{ fontSize: 18 }}>{STATUS_ICON[r.status]}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
              L{String(r.lesson.lesson_number).padStart(2,'0')} — {r.lesson.title}
            </div>
            {r.status === 'done' && (
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {r.activitiesWritten} activities written
              </div>
            )}
            {r.status === 'error' && (
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-incorrect)' }}>
                {r.error}
              </div>
            )}
          </div>
        </div>
      ))}

      {allFinished && errors === 0 && (
        <div style={{ marginTop: 16, padding: '16px', background: 'var(--color-correct-bg)', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-correct)', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 4 }}>🎉</div>
          <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: 'var(--color-correct)' }}>
            All {total} lessons published successfully!
          </div>
        </div>
      )}
    </div>
  )
}
