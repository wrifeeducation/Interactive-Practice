import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Activity, WriteQuestion } from '../../types'
import { useTTS } from '../../hooks/useTTS'

interface Props {
  activity: Activity
  onAnswer: (isCorrect: boolean, xp: number, writtenText?: string) => void
}

export default function WriteActivity({ activity, onAnswer }: Props) {
  const q = activity.question_json as WriteQuestion
  const { speak } = useTTS()

  const [response, setResponse] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [rating, setRating] = useState<1 | 2 | 3 | null>(null)

  function handleReveal() {
    setRevealed(true)
    // Alistair cues the pupil to compare their answer to the model
    speak('write-reveal')
  }

  function handleStar(stars: 1 | 2 | 3) {
    setRating(stars)
    // Positive reinforcement regardless of star count — pupil is self-assessing
    speak('feedback--correct')
    const xp = stars * 5
    // Pass the pupil's written response as the third arg so ActivitySession can
    // save it to the portfolio table if the text is substantial (≥10 chars).
    const writtenText = response.trim()
    setTimeout(() => {
      onAnswer(true, xp, writtenText || undefined)
    }, 600)
  }

  return (
    <div style={styles.card}>
      {q.question && (
        <p style={styles.instruction} data-tts="write activity instruction">{q.question}</p>
      )}

      {q.prompt && (
        <p style={styles.prompt} data-tts="write activity prompt">{q.prompt}</p>
      )}

      {q.instruction && (
        <p style={styles.hint} data-tts="write activity hint">{q.instruction}</p>
      )}

      <textarea
        data-testid="write-textarea"
        data-tts="write response area"
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        disabled={revealed}
        placeholder="Write your answer here…"
        style={styles.textarea}
        aria-label="Write your answer"
        rows={5}
      />

      {!revealed && (
        <div style={{ marginTop: '12px' }}>
          <button
            data-testid="reveal-model-answer"
            onClick={handleReveal}
            style={styles.revealBtn}
          >
            Reveal Model Answer
          </button>
        </div>
      )}

      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={styles.modelAnswerBox}
          >
            <p style={styles.modelAnswerLabel} data-tts="model answer label">Model Answer</p>
            <p style={styles.modelAnswerText} data-tts="model answer text">{q.modelAnswer}</p>

            <div style={styles.ratingSection}>
              <p style={styles.ratingLabel} data-tts="self rating instruction">
                How well did you do?
              </p>
              <div style={styles.stars}>
                {([1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    data-testid={`star-${n}`}
                    data-tts={`${n} star rating`}
                    onClick={() => handleStar(n)}
                    disabled={rating !== null}
                    style={styles.starBtn}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  >
                    <motion.span
                      whileTap={{ scale: 1.3 }}
                      style={{
                        fontSize: '36px',
                        filter: rating !== null && rating >= n ? 'none' : 'grayscale(1)',
                        color: rating !== null && rating >= n ? 'var(--color-gold)' : 'var(--color-border)',
                        transition: 'filter 200ms ease',
                      }}
                    >
                      ★
                    </motion.span>
                  </button>
                ))}
              </div>
              <div style={styles.ratingHints}>
                <span style={styles.ratingHintText} data-tts="1 star hint">1★ = Getting there</span>
                <span style={styles.ratingHintText} data-tts="2 star hint">2★ = Nearly there</span>
                <span style={styles.ratingHintText} data-tts="3 star hint">3★ = Nailed it!</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
    marginBottom: '12px',
    lineHeight: 1.5,
  },
  prompt: {
    fontSize: '18px',
    color: 'var(--color-text)',
    marginBottom: '8px',
    lineHeight: 1.6,
    padding: '12px 16px',
    background: 'var(--color-background)',
    borderRadius: 'var(--radius-md)',
    borderLeft: '4px solid var(--color-brand-primary)',
  },
  hint: {
    fontSize: '16px',
    color: 'var(--color-text-muted)',
    marginBottom: '12px',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '100px',
    padding: '14px',
    fontSize: '18px',
    lineHeight: 1.6,
    border: '2px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    background: 'var(--color-surface)',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
  },
  revealBtn: {
    padding: '12px 24px',
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--color-brand-primary)',
    background: 'var(--color-background)',
    border: '2px solid var(--color-brand-primary)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    minHeight: '44px',
  },
  modelAnswerBox: {
    marginTop: '20px',
    padding: '16px',
    background: 'var(--color-background)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
  },
  modelAnswerLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  modelAnswerText: {
    fontSize: '18px',
    color: 'var(--color-text)',
    lineHeight: 1.7,
    marginBottom: '20px',
  },
  ratingSection: {
    borderTop: '1px solid var(--color-border)',
    paddingTop: '16px',
  },
  ratingLabel: {
    fontSize: '18px',
    fontWeight: 500,
    color: 'var(--color-text)',
    marginBottom: '12px',
    textAlign: 'center',
  },
  stars: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  starBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    minHeight: '44px',
    minWidth: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingHints: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  ratingHintText: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
  },
}
