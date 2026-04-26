// TICKET-028: Badge Unlock Celebration Modal
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Badge } from '../types'

interface BadgeCelebrationProps {
  badges: Badge[]
  onDismiss: () => void
}

export default function BadgeCelebration({ badges, onDismiss }: BadgeCelebrationProps) {
  const [index, setIndex] = useState(0)

  if (!badges.length) return null

  const current = badges[index]
  const isLast = index === badges.length - 1

  const handleNext = () => {
    if (isLast) {
      onDismiss()
    } else {
      setIndex((i) => i + 1)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        data-testid="badge-celebration-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--color-overlay)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onDismiss() }}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            padding: '40px 32px',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <p style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Badge Unlocked!
          </p>

          <motion.div
            key={current.id}
            initial={{ scale: 0.3 }}
            animate={{ scale: [0.3, 1.3, 1] }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ fontSize: '72px', lineHeight: 1, marginBottom: '16px' }}
            aria-hidden="true"
          >
            {current.image_emoji}
          </motion.div>

          <h2
            style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}
            data-tts={`badge name: ${current.name}`}
          >
            {current.name}
          </h2>

          <p
            style={{ margin: '0 0 28px', fontSize: '16px', color: 'var(--color-text-muted)' }}
            data-tts={`badge description: ${current.description}`}
          >
            {current.description}
          </p>

          {badges.length > 1 && (
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
              {index + 1} of {badges.length}
            </p>
          )}

          <button
            data-testid="badge-dismiss"
            onClick={handleNext}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '18px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
              color: 'var(--color-text-on-dark)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            {isLast ? 'Awesome! 🎉' : 'Next →'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
