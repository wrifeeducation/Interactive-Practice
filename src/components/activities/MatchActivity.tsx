import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Activity, MatchQuestion } from '../../types'

interface Props {
  activity: Activity
  onAnswer: (isCorrect: boolean, xp: number) => void
}

type PairState = 'default' | 'correct' | 'wrong-flash'

interface PairStatus {
  left: string
  right: string
  state: PairState
}

export default function MatchActivity({ activity, onAnswer }: Props) {
  const q = activity.question_json as MatchQuestion

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [matched, setMatched] = useState<Map<string, string>>(new Map())
  const [pairStatuses, setPairStatuses] = useState<PairStatus[]>([])
  const [hadRetry, setHadRetry] = useState(false)
  const [done, setDone] = useState(false)
  const [flashWrongLeft, setFlashWrongLeft] = useState<string | null>(null)
  const [flashWrongRight, setFlashWrongRight] = useState<string | null>(null)

  const allPairs = q.pairs
  const correctMap = new Map(allPairs.map((p) => [p.left, p.right]))

  function isLeftMatched(left: string) {
    return matched.has(left)
  }

  function isRightMatched(right: string) {
    return [...matched.values()].includes(right)
  }

  function getLeftState(left: string): 'default' | 'selected' | 'correct' | 'wrong-flash' {
    if (flashWrongLeft === left) return 'wrong-flash'
    if (matched.has(left)) return 'correct'
    if (selectedLeft === left) return 'selected'
    return 'default'
  }

  function getRightState(right: string): 'default' | 'correct' | 'wrong-flash' {
    if (flashWrongRight === right) return 'wrong-flash'
    if (isRightMatched(right)) return 'correct'
    return 'default'
  }

  function handleLeftClick(left: string) {
    if (isLeftMatched(left) || done) return
    setSelectedLeft(selected => selected === left ? null : left)
  }

  function handleRightClick(right: string) {
    if (isRightMatched(right) || done || !selectedLeft) return

    const expectedRight = correctMap.get(selectedLeft)
    if (expectedRight === right) {
      // Correct pair
      const newMatched = new Map(matched)
      newMatched.set(selectedLeft, right)
      setMatched(newMatched)
      setPairStatuses(prev => [...prev, { left: selectedLeft, right, state: 'correct' }])
      setSelectedLeft(null)

      if (newMatched.size === allPairs.length) {
        setDone(true)
      }
    } else {
      // Wrong pair — flash red briefly
      setHadRetry(true)
      setFlashWrongLeft(selectedLeft)
      setFlashWrongRight(right)
      setTimeout(() => {
        setFlashWrongLeft(null)
        setFlashWrongRight(null)
        setSelectedLeft(null)
      }, 600)
    }
  }

  function handleSubmit() {
    const xp = hadRetry ? 5 : 10
    onAnswer(true, xp)
  }

  function itemStyle(state: 'default' | 'selected' | 'correct' | 'wrong-flash'): React.CSSProperties {
    const base: React.CSSProperties = {
      width: '100%',
      padding: '12px 16px',
      fontSize: '18px',
      fontWeight: 500,
      border: '2px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-surface)',
      color: 'var(--color-text)',
      cursor: 'pointer',
      minHeight: '44px',
      textAlign: 'center',
      transition: 'all 150ms ease',
    }
    if (state === 'selected') return { ...base, borderColor: 'var(--color-brand-primary)', background: 'var(--color-background)', color: 'var(--color-brand-primary)' }
    if (state === 'correct') return { ...base, borderColor: 'var(--color-correct)', background: 'var(--color-correct-bg)', color: 'var(--color-correct)', cursor: 'default' }
    if (state === 'wrong-flash') return { ...base, borderColor: 'var(--color-incorrect)', background: 'var(--color-incorrect-bg)', color: 'var(--color-incorrect)' }
    return base
  }

  return (
    <div style={styles.card}>
      {q.question && (
        <p style={styles.instruction} data-tts="match activity instruction">{q.question}</p>
      )}
      {q.instruction && (
        <p style={styles.subInstruction} data-tts="match activity sub-instruction">{q.instruction}</p>
      )}

      <div style={styles.columns}>
        {/* Left column */}
        <div style={styles.column}>
          {allPairs.map((pair, i) => (
            <motion.button
              key={pair.left}
              data-testid={`match-left-${i}`}
              data-tts={`left item: ${pair.left}`}
              onClick={() => handleLeftClick(pair.left)}
              style={itemStyle(getLeftState(pair.left))}
              disabled={isLeftMatched(pair.left) || done}
              whileTap={{ scale: 0.97 }}
            >
              {pair.left}
            </motion.button>
          ))}
        </div>

        {/* Right column — shuffled order */}
        <div style={styles.column}>
          {[...allPairs].sort((a, b) => a.right.localeCompare(b.right)).map((pair, i) => (
            <motion.button
              key={pair.right}
              data-testid={`match-right-${i}`}
              data-tts={`right item: ${pair.right}`}
              onClick={() => handleRightClick(pair.right)}
              style={itemStyle(getRightState(pair.right) as 'default' | 'selected' | 'correct' | 'wrong-flash')}
              disabled={isRightMatched(pair.right) || done}
              whileTap={{ scale: 0.97 }}
            >
              {pair.right}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Status */}
      <p style={styles.status} data-tts="match progress">
        {matched.size} of {allPairs.length} matched
      </p>

      {done && (
        <div style={{ textAlign: 'right' }}>
          <button
            data-testid="match-submit"
            onClick={handleSubmit}
            style={styles.submitBtn}
          >
            Continue ({hadRetry ? '5' : '10'} XP)
          </button>
        </div>
      )}

      {/* Pair statuses (sr only visual) */}
      <div aria-live="polite" style={{ position: 'absolute', left: '-9999px' }}>
        {pairStatuses.map((s) => (
          <span key={`${s.left}-${s.right}`}>{s.left} matched with {s.right}</span>
        ))}
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
    position: 'relative',
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
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  status: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    marginBottom: '16px',
    textAlign: 'center',
  },
  submitBtn: {
    padding: '12px 28px',
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--color-text-on-dark)',
    background: 'var(--color-correct)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    minHeight: '44px',
  },
}
