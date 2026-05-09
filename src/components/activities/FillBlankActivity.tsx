import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import type { Activity, FillBlankQuestion } from '../../types'
import { useTTS } from '../../hooks/useTTS'

interface Props {
  activity: Activity
  onAnswer: (isCorrect: boolean, xp: number) => void
}

type InputState = 'default' | 'correct' | 'incorrect'

export default function FillBlankActivity({ activity, onAnswer }: Props) {
  const q = activity.question_json as FillBlankQuestion
  const { speak } = useTTS()
  const parts = q.template.split('___')
  const blankCount = parts.length - 1

  const [values, setValues] = useState<string[]>(Array(blankCount).fill(''))
  const [checked, setChecked] = useState(false)
  const [inputStates, setInputStates] = useState<InputState[]>(Array(blankCount).fill('default'))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  function handleChange(index: number, value: string) {
    if (checked) return
    setValues((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function handleCheck() {
    if (checked) return
    const states: InputState[] = values.map((val, i) => {
      const expected = q.blanks[i]?.answer ?? ''
      return val.trim().toLowerCase() === expected.trim().toLowerCase() ? 'correct' : 'incorrect'
    })
    setInputStates(states)
    setChecked(true)
    const allCorrect = states.every((s) => s === 'correct')

    // Speak feedback immediately while result is visible
    speak(allCorrect ? 'feedback--correct' : 'feedback--try-again')

    setTimeout(() => {
      onAnswer(allCorrect, allCorrect ? 10 : 0)
    }, 1200)
  }

  function inputStyle(state: InputState): React.CSSProperties {
    const base: React.CSSProperties = {
      display: 'inline-block',
      minWidth: '100px',
      padding: '4px 8px',
      fontSize: '18px',
      fontWeight: 500,
      border: '2px solid var(--color-border)',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--color-text)',
      background: 'var(--color-surface)',
      verticalAlign: 'middle',
      outline: 'none',
      minHeight: '36px',
    }
    if (state === 'correct') return { ...base, borderColor: 'var(--color-correct)', background: 'var(--color-correct-bg)', color: 'var(--color-correct)' }
    if (state === 'incorrect') return { ...base, borderColor: 'var(--color-incorrect)', background: 'var(--color-incorrect-bg)', color: 'var(--color-incorrect)' }
    return base
  }

  const allFilled = values.every((v) => v.trim().length > 0)

  return (
    <div style={styles.card}>
      {q.question && (
        <p style={styles.instruction} data-tts="fill blank instruction">{q.question}</p>
      )}

      <div style={styles.templateArea} data-tts="fill in the blank sentence" role="region" aria-label="Fill in the blanks">
        {parts.map((part, partIndex) => (
          <span key={partIndex}>
            <span style={styles.templateText}>{part}</span>
            {partIndex < blankCount && (
              <input
                ref={(el) => { inputRefs.current[partIndex] = el }}
                data-testid={`blank-input-${partIndex}`}
                data-tts={`blank ${partIndex + 1}`}
                type="text"
                value={values[partIndex]}
                onChange={(e) => handleChange(partIndex, e.target.value)}
                style={inputStyle(inputStates[partIndex])}
                disabled={checked}
                aria-label={`Blank ${partIndex + 1}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && partIndex < blankCount - 1) {
                    inputRefs.current[partIndex + 1]?.focus()
                  }
                }}
              />
            )}
          </span>
        ))}
      </div>

      {checked && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={styles.correctAnswerBox}
        >
          <p style={styles.correctAnswerLabel} data-tts="correct answer label">Correct answer:</p>
          <p style={styles.correctAnswerText} data-tts="full correct answer">
            {parts.map((part, i) => (
              <span key={i}>
                {part}
                {i < blankCount && (
                  <strong style={{ color: 'var(--color-correct)' }}>{q.blanks[i]?.answer}</strong>
                )}
              </span>
            ))}
          </p>
          {q.feedback && (
            <p style={styles.feedback} data-tts="feedback message" role="alert">{q.feedback}</p>
          )}
        </motion.div>
      )}

      <div style={{ textAlign: 'right', marginTop: '16px' }}>
        <button
          data-testid="fillblank-check"
          onClick={handleCheck}
          disabled={!allFilled || checked}
          style={{ ...styles.checkBtn, opacity: (!allFilled || checked) ? 0.5 : 1 }}
        >
          Check Answer
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
    marginBottom: '20px',
    lineHeight: 1.5,
  },
  templateArea: {
    fontSize: '20px',
    lineHeight: 2,
    color: 'var(--color-text)',
    marginBottom: '20px',
  },
  templateText: {
    fontSize: '20px',
    lineHeight: 2,
  },
  correctAnswerBox: {
    background: 'var(--color-correct-bg)',
    border: '1px solid var(--color-correct)',
    borderRadius: 'var(--radius-md)',
    padding: '14px',
    marginTop: '12px',
  },
  correctAnswerLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-correct)',
    marginBottom: '6px',
  },
  correctAnswerText: {
    fontSize: '18px',
    color: 'var(--color-text)',
    lineHeight: 1.6,
    marginBottom: '8px',
  },
  feedback: {
    fontSize: '16px',
    color: 'var(--color-text-muted)',
    marginTop: '8px',
  },
  checkBtn: {
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
