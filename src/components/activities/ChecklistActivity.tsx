import { useState } from 'react'
import type { Activity, ChecklistQuestion } from '../../types'
import { useTTS } from '../../hooks/useTTS'

interface Props {
  activity: Activity
  onAnswer: (isCorrect: boolean, xp: number) => void
}

export default function ChecklistActivity({ activity, onAnswer }: Props) {
  const q = activity.question_json as ChecklistQuestion
  const { speak } = useTTS()

  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)

  function toggleItem(id: string) {
    if (submitted) return
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleSubmit() {
    if (submitted) return
    setSubmitted(true)
    // Celebrate completing the self-assessment checklist
    speak('feedback--correct')
    const xp = checked.size * 2
    setTimeout(() => {
      onAnswer(true, xp)
    }, 600)
  }

  return (
    <div style={styles.card}>
      {q.question && (
        <p style={styles.instruction} data-tts="checklist instruction">{q.question}</p>
      )}
      {q.instruction && (
        <p style={styles.subInstruction} data-tts="checklist sub-instruction">{q.instruction}</p>
      )}

      <div style={styles.items} role="group" aria-label="Checklist items">
        {q.items.map((item) => (
          <label
            key={item.id}
            data-testid={`checklist-item-${item.id}`}
            style={{
              ...styles.item,
              background: checked.has(item.id) ? 'var(--color-correct-bg)' : 'var(--color-surface)',
              borderColor: checked.has(item.id) ? 'var(--color-correct)' : 'var(--color-border)',
              opacity: submitted ? 0.8 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={checked.has(item.id)}
              onChange={() => toggleItem(item.id)}
              disabled={submitted}
              style={styles.checkbox}
              aria-label={item.text}
            />
            <span
              style={{
                ...styles.itemText,
                color: checked.has(item.id) ? 'var(--color-correct)' : 'var(--color-text)',
                textDecoration: submitted && checked.has(item.id) ? 'none' : 'none',
              }}
              data-tts={`checklist item: ${item.text}`}
            >
              {item.text}
            </span>
          </label>
        ))}
      </div>

      {submitted && (
        <p style={styles.result} role="alert" data-tts="checklist result">
          You ticked {checked.size} of {q.items.length} items — {checked.size * 2} XP earned!
        </p>
      )}

      <div style={{ textAlign: 'right', marginTop: '20px' }}>
        <button
          data-testid="checklist-submit"
          onClick={handleSubmit}
          disabled={submitted}
          style={{ ...styles.submitBtn, opacity: submitted ? 0.6 : 1 }}
        >
          Submit Checklist
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    padding: '24px',
  },
  instruction: {
    fontSize: '20px',
    fontWeight: 500,
    color: 'var(--color-text)',
    marginBottom: '8px',
    lineHeight: 1.5,
  },
  subInstruction: {
    fontSize: '18px',
    color: 'var(--color-text-muted)',
    marginBottom: '20px',
  },
  items: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: 'var(--radius-md)',
    border: '2px solid var(--color-border)',
    cursor: 'pointer',
    minHeight: '44px',
    transition: 'all 150ms ease',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    marginTop: '2px',
    flexShrink: 0,
    accentColor: 'var(--color-correct)',
    cursor: 'pointer',
  },
  itemText: {
    fontSize: '18px',
    lineHeight: 1.5,
  },
  result: {
    marginTop: '16px',
    fontSize: '18px',
    fontWeight: 500,
    color: 'var(--color-correct)',
    background: 'var(--color-correct-bg)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
  },
  submitBtn: {
    padding: '12px 28px',
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--color-text-on-dark)',
    background: 'var(--color-brand-primary)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    minHeight: '44px',
  },
}
