import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Activity, MCQuestion } from '../../types'

interface Props {
  activity: Activity
  onAnswer: (isCorrect: boolean, xp: number) => void
}

type OptionState = 'default' | 'selected' | 'correct' | 'incorrect'
type CardState = 'idle' | 'correct' | 'wrong'

// Fisher-Yates shuffle — stable per activity id so options don't re-shuffle mid-answer
function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export default function MCActivity({ activity, onAnswer }: Props) {
  const q = activity.question_json as MCQuestion

  // Shuffle once per activity so the correct answer isn't always in the same position
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shuffledOptions = useMemo(() => shuffleArray(q.options), [activity.id])

  const [selected, setSelected] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [cardState, setCardState] = useState<CardState>('idle')
  const [xpPopKey, setXpPopKey] = useState(0)
  const [showXp, setShowXp] = useState(false)

  function getOptionState(option: string): OptionState {
    if (!checked) return selected === option ? 'selected' : 'default'
    if (option === q.correct) return 'correct'
    if (option === selected && option !== q.correct) return 'incorrect'
    return 'default'
  }

  function optionStyle(state: OptionState): React.CSSProperties {
    const base: React.CSSProperties = {
      width: '100%',
      textAlign: 'left',
      padding: '12px 20px',
      fontSize: '18px',
      fontWeight: 500,
      border: '2px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-surface)',
      color: 'var(--color-text)',
      cursor: 'pointer',
      minHeight: '56px',
      transition: 'all 150ms ease',
    }
    if (state === 'selected') return { ...base, borderColor: 'var(--color-brand-primary)', background: 'var(--color-background)', color: 'var(--color-brand-primary)' }
    if (state === 'correct') return { ...base, borderColor: 'var(--color-correct)', background: 'var(--color-correct-bg)', color: 'var(--color-correct)' }
    if (state === 'incorrect') return { ...base, borderColor: 'var(--color-incorrect)', background: 'var(--color-incorrect-bg)', color: 'var(--color-incorrect)' }
    return base
  }

  async function handleCheck() {
    if (!selected || checked) return
    const isCorrect = selected === q.correct

    setChecked(true)
    setCardState(isCorrect ? 'correct' : 'wrong')

    const xp = isCorrect ? 10 : 0
    if (isCorrect) {
      setXpPopKey((k) => k + 1)
      setShowXp(true)
      setTimeout(() => setShowXp(false), 1000)
    }

    setTimeout(() => {
      onAnswer(isCorrect, xp)
    }, 1200)
  }

  const cardVariants = {
    idle: { x: 0, backgroundColor: 'var(--color-surface)' },
    correct: { backgroundColor: 'var(--color-correct-bg)', scale: 1.02, transition: { duration: 0.3 } },
    wrong: {
      x: [0, -8, 8, -6, 6, 0],
      backgroundColor: 'var(--color-incorrect-bg)',
      transition: { duration: 0.4 },
    },
  }

  return (
    <motion.div
      animate={cardState}
      variants={cardVariants}
      style={styles.card}
    >
      {/* XP pop */}
      <div style={{ position: 'relative' }}>
        <AnimatePresence>
          {showXp && (
            <motion.div
              key={xpPopKey}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -40 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              style={styles.xpPop}
            >
              +10 XP
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Instruction */}
      {q.question && (
        <p style={styles.instruction} data-tts="activity instruction">{q.question}</p>
      )}

      {/* Options */}
      <div style={styles.options}>
        {shuffledOptions.map((option, i) => (
          <button
            key={option}
            data-testid={`option-button-${i}`}
            data-tts={`option ${i + 1}: ${option}`}
            onClick={() => { if (!checked) setSelected(option) }}
            style={optionStyle(getOptionState(option))}
            disabled={checked}
            aria-pressed={selected === option}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {checked && (
        <p
          style={cardState === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong}
          data-tts="answer feedback"
          role="alert"
        >
          {cardState === 'correct' ? q.feedback.correct : q.feedback.wrong}
        </p>
      )}

      <button
        data-testid="check-answer"
        onClick={handleCheck}
        disabled={!selected || checked}
        style={{ ...styles.checkBtn, opacity: (!selected || checked) ? 0.5 : 1 }}
      >
        Check Answer
      </button>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    padding: '24px',
    position: 'relative',
  },
  instruction: {
    fontSize: '20px',
    fontWeight: 500,
    color: 'var(--color-text)',
    marginBottom: '20px',
    lineHeight: 1.5,
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px',
  },
  feedbackCorrect: {
    color: 'var(--color-correct)',
    fontSize: '18px',
    fontWeight: 500,
    marginBottom: '16px',
    padding: '10px 14px',
    background: 'var(--color-correct-bg)',
    borderRadius: 'var(--radius-sm)',
  },
  feedbackWrong: {
    color: 'var(--color-incorrect)',
    fontSize: '18px',
    fontWeight: 500,
    marginBottom: '16px',
    padding: '10px 14px',
    background: 'var(--color-incorrect-bg)',
    borderRadius: 'var(--radius-sm)',
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
    float: 'right',
  },
  xpPop: {
    position: 'absolute',
    top: '-20px',
    right: '0',
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--color-xp)',
    pointerEvents: 'none',
    zIndex: 10,
  },
}
