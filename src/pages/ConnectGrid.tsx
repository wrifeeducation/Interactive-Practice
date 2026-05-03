// Connect Grid — story deconstruction and planning tool for L27–L34
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { WrifeMascot } from '../components/ui/WrifeMascot'

// ── Types ─────────────────────────────────────────────────────────────────────

type GridMode = 'plan' | 'deconstruct'
type RowCount = 3 | 5 | 7

interface GridRow {
  topic: string
  plot: string
  facts: string
}

const ROW_LABELS_5: string[] = ['Opening', 'Build-up', 'Problem', 'Resolution', 'Ending']
const ROW_LABELS_3: string[] = ['Beginning', 'Middle', 'End']
const ROW_LABELS_7: string[] = ['Opening', 'Complication', 'Rising Action', 'Crisis', 'Climax', 'Falling Action', 'Ending']

function getRowLabels(count: RowCount): string[] {
  if (count === 3) return ROW_LABELS_3
  if (count === 7) return ROW_LABELS_7
  return ROW_LABELS_5
}

function emptyGrid(count: RowCount): GridRow[] {
  return Array.from({ length: count }, () => ({ topic: '', plot: '', facts: '' }))
}

// ── Column headers ────────────────────────────────────────────────────────────

const COLUMN_HEADERS = [
  { key: 'topic', label: 'Topic / Summary', hint: 'The topic sentence for this part' },
  { key: 'plot',  label: 'Plot',            hint: 'What happens (keep it general)' },
  { key: 'facts', label: 'Key Words',       hint: 'Important nouns, verbs, phrases' },
] as const

type ColKey = 'topic' | 'plot' | 'facts'

// ── Save status indicator ─────────────────────────────────────────────────────

function SaveStatus({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle')   return null
  if (status === 'saving') return <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Saving…</span>
  if (status === 'saved')  return <span style={{ color: 'var(--color-correct)',    fontSize: '13px' }}>✓ Saved</span>
  return <span style={{ color: 'var(--color-incorrect)', fontSize: '13px' }}>Save failed</span>
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ConnectGrid() {
  const [searchParams] = useSearchParams()
  const lessonId  = searchParams.get('lessonId') ?? undefined
  const { session } = useAuthStore()
  const pupilId = session?.user?.id ?? null

  const [mode,     setMode]     = useState<GridMode>('plan')
  const [rowCount, setRowCount] = useState<RowCount>(5)
  const [rows,     setRows]     = useState<GridRow[]>(() => emptyGrid(5))
  const [saveId,   setSaveId]   = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [loaded,   setLoaded]   = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rowLabels = getRowLabels(rowCount)

  // ── Load existing save on mount ──────────────────────────────────────────

  useEffect(() => {
    if (!pupilId) { setLoaded(true); return }

    async function load() {
      const query = supabase
        .from('connect_grid_saves')
        .select('*')
        .eq('pupil_id', pupilId)
        .order('updated_at', { ascending: false })

      if (lessonId) query.eq('lesson_id', lessonId)

      const { data } = await query.limit(1).maybeSingle()

      if (data) {
        setSaveId(data.id)
        setMode(data.mode as GridMode)
        const rc = [3, 5, 7].includes(data.row_count) ? (data.row_count as RowCount) : 5
        setRowCount(rc)
        const loaded = Array.isArray(data.grid_data) ? data.grid_data : emptyGrid(rc)
        // Ensure correct length
        const padded = [...loaded]
        while (padded.length < rc) padded.push({ topic: '', plot: '', facts: '' })
        setRows(padded.slice(0, rc) as GridRow[])
      }
      setLoaded(true)
    }

    void load()
  }, [pupilId, lessonId])

  // ── Auto-save (debounced 1.5s) ───────────────────────────────────────────

  const saveGrid = useCallback(
    async (currentRows: GridRow[], currentMode: GridMode, currentRowCount: RowCount, currentSaveId: string | null) => {
      if (!pupilId) return
      setSaveStatus('saving')

      const payload = {
        pupil_id:   pupilId,
        lesson_id:  lessonId ?? null,
        mode:       currentMode,
        row_count:  currentRowCount,
        grid_data:  currentRows,
        updated_at: new Date().toISOString(),
      }

      try {
        if (currentSaveId) {
          await supabase.from('connect_grid_saves').update(payload).eq('id', currentSaveId)
        } else {
          const { data } = await supabase.from('connect_grid_saves').insert(payload).select('id').single()
          if (data?.id) setSaveId(data.id)
        }
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    },
    [pupilId, lessonId],
  )

  const scheduleSave = useCallback(
    (nextRows: GridRow[], nextMode: GridMode, nextRowCount: RowCount, currentSaveId: string | null) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void saveGrid(nextRows, nextMode, nextRowCount, currentSaveId)
      }, 1500)
    },
    [saveGrid],
  )

  // ── Row count change — preserve as much data as possible ─────────────────

  function handleRowCountChange(newCount: RowCount) {
    const newRows = emptyGrid(newCount).map((blank, i) => rows[i] ?? blank)
    setRowCount(newCount)
    setRows(newRows)
    scheduleSave(newRows, mode, newCount, saveId)
  }

  // ── Mode change ───────────────────────────────────────────────────────────

  function handleModeChange(newMode: GridMode) {
    setMode(newMode)
    scheduleSave(rows, newMode, rowCount, saveId)
  }

  // ── Cell change ───────────────────────────────────────────────────────────

  function handleCellChange(rowIdx: number, col: ColKey, value: string) {
    const next = rows.map((r, i) => (i === rowIdx ? { ...r, [col]: value } : r))
    setRows(next)
    setSaveStatus('idle')
    scheduleSave(next, mode, rowCount, saveId)
  }

  // ── Clear all ─────────────────────────────────────────────────────────────

  function handleClear() {
    if (!window.confirm('Clear all cells? This cannot be undone.')) return
    const cleared = emptyGrid(rowCount)
    setRows(cleared)
    scheduleSave(cleared, mode, rowCount, saveId)
  }

  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '18px' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      {/* ── Header ── */}
      <div style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '12px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            to="/world-map"
            data-testid="connect-grid-back"
            style={{ fontSize: '22px', textDecoration: 'none', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', flexShrink: 0 }}
          >
            ←
          </Link>

          <WrifeMascot pose="thinking" size="xs" decorative />

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }} data-tts="Connect Grid heading">
              Connect Grid
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }} data-tts="Connect Grid subtitle">
              {mode === 'plan' ? 'Plan your writing' : 'Deconstruct a text'}
            </p>
          </div>

          <SaveStatus status={saveStatus} />
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Mode toggle */}
          <div style={{ display: 'flex', border: '2px solid var(--color-brand-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {(['plan', 'deconstruct'] as GridMode[]).map((m) => (
              <button
                key={m}
                data-testid={`mode-${m}`}
                onClick={() => handleModeChange(m)}
                style={{
                  padding: '8px 18px',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  minHeight: '44px',
                  background: mode === m ? 'var(--color-brand-primary)' : 'var(--color-surface)',
                  color: mode === m ? 'var(--color-text-on-dark)' : 'var(--color-brand-primary)',
                  transition: 'background 0.15s',
                }}
              >
                {m === 'plan' ? '✏️ Plan' : '🔍 Deconstruct'}
              </button>
            ))}
          </div>

          {/* Row count selector */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Rows:</span>
            {([3, 5, 7] as RowCount[]).map((n) => (
              <button
                key={n}
                data-testid={`rows-${n}`}
                onClick={() => handleRowCountChange(n)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  border: `2px solid ${rowCount === n ? 'var(--color-brand-secondary)' : 'var(--color-border)'}`,
                  background: rowCount === n ? 'var(--color-brand-secondary)' : 'var(--color-surface)',
                  color: rowCount === n ? 'var(--color-text-on-dark)' : 'var(--color-text)',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Clear */}
          <button
            data-testid="connect-grid-clear"
            onClick={handleClear}
            style={{
              marginLeft: 'auto',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              minHeight: '40px',
            }}
          >
            Clear all
          </button>
        </div>

        {/* Mode description */}
        <p style={{ margin: '10px 0 0', fontSize: '14px', color: 'var(--color-text-muted)' }} data-tts="mode description">
          {mode === 'plan'
            ? 'Use this grid to plan your story before you write. Fill in each section with your ideas.'
            : 'Use this grid to analyse a text. Break it down into its topic, plot, and key words.'}
        </p>
      </div>

      {/* ── Grid ── */}
      <div style={{ maxWidth: '1000px', margin: '16px auto', padding: '0 16px 40px', overflowX: 'auto' }}>
        <div style={{ minWidth: '560px' }}>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '6px', marginBottom: '6px' }}>
            <div /> {/* row label spacer */}
            {COLUMN_HEADERS.map((col) => (
              <div
                key={col.key}
                style={{
                  background: 'var(--color-brand-primary)',
                  color: 'var(--color-text-on-dark)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  textAlign: 'center',
                }}
                data-tts={col.label}
              >
                {col.label}
                <div style={{ fontSize: '11px', fontWeight: 400, opacity: 0.8, marginTop: '2px' }}>{col.hint}</div>
              </div>
            ))}
          </div>

          {/* Data rows */}
          {rows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 1fr 1fr 1fr',
                gap: '6px',
                marginBottom: '6px',
              }}
            >
              {/* Row label */}
              <div
                style={{
                  background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
                  color: 'var(--color-text-on-dark)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  textAlign: 'center',
                  padding: '8px 4px',
                  minHeight: '80px',
                }}
                data-tts={`row label: ${rowLabels[rowIdx]}`}
              >
                {rowLabels[rowIdx]}
              </div>

              {/* Cells */}
              {(['topic', 'plot', 'facts'] as ColKey[]).map((col) => (
                <textarea
                  key={col}
                  data-testid={`cell-${rowIdx}-${col}`}
                  value={row[col]}
                  onChange={(e) => handleCellChange(rowIdx, col, e.target.value)}
                  placeholder={COLUMN_HEADERS.find((c) => c.key === col)?.hint}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    minHeight: '80px',
                    padding: '10px 12px',
                    fontSize: '15px',
                    lineHeight: 1.5,
                    border: '2px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand-primary)' }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
