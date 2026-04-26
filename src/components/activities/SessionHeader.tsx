import { AnimatePresence, motion } from 'framer-motion'
import type { ActivityLevel } from '../../types'

interface Props {
  level: ActivityLevel
  livesRemaining: number
  currentIndex: number
  total: number
  xp: number
  xpDelta: number
  xpDeltaKey: number
}

const LEVEL_COLOURS: Record<ActivityLevel, string> = {
  bronze: 'var(--color-bronze)',
  silver: 'var(--color-silver)',
  gold: 'var(--color-gold)',
}

const LEVEL_BG: Record<ActivityLevel, string> = {
  bronze: 'var(--color-bronze-bg)',
  silver: 'var(--color-silver-bg)',
  gold: 'var(--color-gold-bg)',
}

export default function SessionHeader({ level, livesRemaining, currentIndex, total, xp, xpDelta, xpDeltaKey }: Props) {
  const progress = total > 0 ? (currentIndex / total) * 100 : 0

  return (
    <div style={styles.header}>
      <div style={styles.topRow}>
        {/* Level badge */}
        <span
          data-testid="level-badge"
          data-tts={`level: ${level}`}
          style={{ ...styles.levelBadge, background: LEVEL_BG[level], color: LEVEL_COLOURS[level] }}
        >
          {level.toUpperCase()}
        </span>

        {/* Lives */}
        <div style={styles.lives} aria-label={`${livesRemaining} lives remaining`} data-tts={`lives: ${livesRemaining}`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.span
              key={i}
              animate={{ scale: i < livesRemaining ? 1 : 0.7, opacity: i < livesRemaining ? 1 : 0.3 }}
              transition={{ duration: 0.2 }}
              style={styles.heart}
              aria-hidden="true"
            >
              {i < livesRemaining ? '❤️' : '🖤'}
            </motion.span>
          ))}
        </div>

        {/* XP counter */}
        <div style={styles.xpWrapper}>
          <span style={styles.xpValue} data-tts={`XP: ${xp}`}>{xp} XP</span>
          <AnimatePresence>
            {xpDelta > 0 && (
              <motion.span
                key={xpDeltaKey}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -40 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                style={styles.xpPop}
              >
                +{xpDelta} XP
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress bar */}
      <div style={styles.progressTrack} role="progressbar" aria-valuenow={currentIndex} aria-valuemax={total} aria-label="Lesson progress">
        <motion.div
          style={styles.progressFill}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p style={styles.progressLabel} data-tts={`activity ${currentIndex + 1} of ${total}`}>
        Activity {currentIndex + 1} of {total}
      </p>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    boxShadow: 'var(--shadow-sm)',
    marginBottom: '16px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  levelBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  lives: {
    display: 'flex',
    gap: '4px',
    fontSize: '20px',
  },
  heart: {
    display: 'inline-block',
  },
  xpWrapper: {
    position: 'relative',
    textAlign: 'right',
  },
  xpValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--color-xp)',
  },
  xpPop: {
    position: 'absolute',
    top: '-4px',
    right: '0',
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--color-xp)',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
  progressTrack: {
    height: '8px',
    background: 'var(--color-border)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  progressFill: {
    height: '100%',
    background: 'var(--color-brand-primary)',
    borderRadius: 'var(--radius-full)',
  },
  progressLabel: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    textAlign: 'right',
  },
}
