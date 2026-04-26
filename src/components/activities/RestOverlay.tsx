import { motion } from 'framer-motion'

interface Props {
  onContinue: () => void
}

export default function RestOverlay({ onContinue }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Rest screen"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 18 }}
        style={styles.panel}
      >
        <div style={styles.icon} aria-hidden="true">😴</div>
        <h2 style={styles.heading} data-tts="rest screen heading">Time for a rest!</h2>
        <p style={styles.body} data-tts="rest screen message">
          You&apos;ve used all your lives. Take a breath — you can still continue, but XP is locked for the rest of this session.
        </p>
        <p style={styles.tip} data-tts="rest screen tip">
          Tip: Come back fresh tomorrow to earn full XP!
        </p>
        <button
          data-testid="rest-continue"
          onClick={onContinue}
          style={styles.btn}
        >
          Continue Anyway
        </button>
      </motion.div>
    </motion.div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--color-overlay)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '16px',
  },
  panel: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-xl)',
    padding: '40px 32px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    boxShadow: 'var(--shadow-lg)',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  heading: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--color-text)',
    margin: '0 0 12px',
  },
  body: {
    fontSize: '18px',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
    margin: '0 0 12px',
  },
  tip: {
    fontSize: '16px',
    color: 'var(--color-hint)',
    marginBottom: '28px',
  },
  btn: {
    padding: '14px 32px',
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
