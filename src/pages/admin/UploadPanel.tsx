/**
 * UploadPanel — drag-drop or browse to upload lesson HTML files.
 * Reads each file, parses it client-side, and calls onParsed().
 */
import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { parseHtmlToLesson } from '../../lib/lessonParser'
import type { ParsedLesson } from '../../types'

interface Props {
  onParsed: (lessons: ParsedLesson[]) => void
}

type ParseStatus = 'idle' | 'parsing' | 'done' | 'error'

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export default function UploadPanel({ onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<ParseStatus>('idle')
  const [dragOver, setDragOver] = useState(false)
  const [log, setLog] = useState<string[]>([])

  async function handleFiles(files: FileList | File[]) {
    const htmlFiles = Array.from(files).filter(f => f.name.endsWith('.html'))
    if (htmlFiles.length === 0) {
      setLog(['⚠️ No .html files found — please upload Interactive Practice HTML files.'])
      return
    }
    setStatus('parsing')
    setLog([`📂 Parsing ${htmlFiles.length} file(s)…`])

    const parsed: ParsedLesson[] = []
    const logLines: string[] = []

    for (const file of htmlFiles) {
      try {
        const text = await readFileAsText(file)
        const lesson = parseHtmlToLesson(text, file.name)
        parsed.push(lesson)
        logLines.push(
          lesson.activities.length > 0
            ? `✅ L${String(lesson.lesson_number).padStart(2,'0')} — ${lesson.title} — ${lesson.activities.length} activities`
            : `⚠️ L${String(lesson.lesson_number).padStart(2,'0')} — ${lesson.title} — 0 activities (check file format)`
        )
      } catch (err) {
        logLines.push(`❌ ${file.name} — parse error: ${String(err)}`)
      }
    }

    parsed.sort((a, b) => a.lesson_number - b.lesson_number)
    setLog(logLines)
    setStatus('done')
    onParsed(parsed)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    void handleFiles(e.dataTransfer.files)
  }

  function onBrowse(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) void handleFiles(e.target.files)
  }

  const dropStyle: React.CSSProperties = {
    border: `2px dashed ${dragOver ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-lg)',
    padding: '48px 32px',
    textAlign: 'center',
    background: dragOver ? 'var(--color-world-1-bg)' : 'var(--color-surface)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  }

  return (
    <div>
      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 8, color: 'var(--color-text)' }}>
        Upload Lesson Files
      </h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, fontSize: 'var(--font-size-base)' }}>
        Drop one or more <code>L##_Interactive_Practice.html</code> files. The parser will extract activities client-side before anything touches the database.
      </p>

      <div
        style={dropStyle}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        data-testid="upload-drop-zone"
        role="button"
        tabIndex={0}
        aria-label="Drop HTML lesson files here or click to browse"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
        <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
          {status === 'parsing' ? 'Parsing…' : 'Drop files here or click to browse'}
        </div>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          Accepts multiple .html files
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".html"
          multiple
          style={{ display: 'none' }}
          onChange={onBrowse}
          data-testid="upload-file-input"
        />
      </div>

      {log.length > 0 && (
        <div style={{
          marginTop: 16,
          background: 'var(--color-background)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--mono)',
          color: 'var(--color-text)',
          maxHeight: 200,
          overflowY: 'auto',
        }}>
          {log.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}
    </div>
  )
}
