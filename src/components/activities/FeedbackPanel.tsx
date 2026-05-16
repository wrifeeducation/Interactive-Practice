/**
 * FeedbackPanel — WriFe World Design System Pattern #5
 *
 * Fixed full-width bottom panel that slides up when the pupil answers.
 * Green for correct, red for incorrect. Contains:
 *   - Big emoji + result label (left)
 *   - Feedback message (centre)
 *   - "Next →" button (right, CTA press effect)
 *
 * Usage: mount it inside the page that hosts activities; it self-positions
 * as a fixed bottom overlay. Add paddingBottom: '100px' to the scroll
 * container so content isn't hidden behind it.
 */
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CTAButton from '../ui/CTAButton'

interface FeedbackPanelProps {
  visible: boolean
  isCorrect: boolean
  message: string
  /** Called when the pupil taps Next → */
  onNext: () => void
}

export default function FeedbackPanel({ visible, isCorrect, message, onNext }: FeedbackPanelProps) {
  // Trap focus on Next button while panel is open so keyboard users don't get lost
  useEffect(() => {
    if (!visible) return
    const btn = document.getElementById('feedback-panel-next')
    btn?.focus()
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="feedback-panel"
          role="alert"
          aria-live="assertive"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            background: isCorrect ? 'var(--color-correct)' : 'var(--color-incorrect)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            minHeight: '88px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.18)',
          }}
        >
          {/* Emoji + result label */}
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{ fontSize: '32px', lineHeight: 1 }} aria-hidden="true">
              {isCorrect ? '🌟' : '💪'}
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginTop: '2px',
              }}
              data-tts={isCorrect ? 'correct answer' : 'wrong answer'}
            >
              {isCorrect ? 'Correct!' : 'Not quite'}
            </div>
          </div>

          {/* Feedback message */}
          <p
            style={{
              flex: 1,
              margin: 0,
              fontSize: '16px',
              fontWeight: 500,
              color: '#fff',
              lineHeight: 1.4,
            }}
            data-tts="feedback message"
          >
            {message}
          </p>

          {/* Next button */}
          <CTAButton
            id="feedback-panel-next"
            data-testid="feedback-panel-next"
            variant={isCorrect ? 'correct' : 'incorrect'}
            onClick={onNext}
            style={{
              flexShrink: 0,
              minWidth: '100px',
              background: 'rgba(255,255,255,0.25)',
              borderBottom: '5px solid rgba(0,0,0,0.2)',
            }}
          >
            Next →
          </CTAButton>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
