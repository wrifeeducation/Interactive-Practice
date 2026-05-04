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
  bronze: '#CD7F32',
  silver: '#A8A9AD',
  gold:   '#F5C500',
}

const LEVEL_BG: Record<ActivityLevel, string> = {
  bronze: '#FDF3E7',
  silver: '#F4F4F5',
  gold:   '#FFFBEB',
}

const LEVEL_GLOW: Record<ActivityLevel, string> = {
  bronze: 'rgba(205,127,50,0.3)',
  silver: 'rgba(168,169,173,0.3)',
  gold:   'rgba(245,197,0,0.4)',
}

export default function SessionHeader({ level, livesRemaining, currentIndex, total, xp, xpDelta, xpDeltaKey }: Props) {
  const progress = total > 0 ? (currentIndex / total) * 100 : 0
  const tierColour = LEVEL_COLOURS[level]
  const tierGlow   = LEVEL_GLOW[level]

  return (
    <div style={styles.header}>
      {/* Top row: lives | XP | label */}
      <div style={styles.topRow}>

        {/* Lives — heart row */}
        <div
          style={styles.livesGroup}
          aria-label={`${livesRemaining} lives remaining`}
          data-tts={`lives: ${livesRemaining}`}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.span
              key={i}
              animate={{
                scale: i < livesRemaining ? 1 : 0.65,
                opacity: i < livesRemaining ? 1 : 0.25,
              }}
              transition={{ duration: 0.25 }}
              aria-hidden="true"
              style={{ fontSize: '22px', lineHeight: 1 }}
            >
              {i < livesRemaining ? '❤️' : '🖤'}
            </motion.span>
          ))}
        </div>

        {/* XP counter */}
        <div style={styles.xpWrapper}>
          <span
            data-tts={`XP: ${xp}`}
            style={{
              ...styles.xpValue,
              textShadow: xpDelta > 0 ? `0 0 10px ${tierGlow}` : 'none',
            }}
          >
            ⭐ {xp} XP
          </span>
          <AnimatePresence>
            {xpDelta > 0 && (
              <motion.span
                key={xpDeltaKey}
                initial={{ opacity: 1, y: 0, scale: 1.2 }}
                animate={{ opacity: 0, y: -44, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                style={styles.xpPop}
              >
                +{xpDelta} XP
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Tier badge */}
        <span
          data-testid="level-badge"
          data-tts={`tier: ${level}`}
          style={{
            ...styles.tierBadge,
            background: LEVEL_BG[level],
            color: tierColour,
            boxShadow: `0 0 0 2px ${tierColour}50`,
          }}
        >
          {level.toUpperCase()}
        </span>
      </div>

      {/* Progress bar — coloured by tier */}
      <div
        style={styles.progressTrack}
        role="progressbar"
        aria-valuenow={currentIndex}
        aria-valuemax={total}
        aria-label="Lesson progress"
      >
        <motion.div
          style={{ ...styles.progressFill, background: tierColour }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </div>

      <p
        style={styles.progressLabel}
        data-tts={`activity ${currentIndex + 1} of ${total}`}
      >
        {currentIndex + 1} / {total}
      </p>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px 10px',
    boxShadow: '0 1px 4px rgba(108,92,231,0.10), 0 4px 12px rgba(0,0,0,0.06)',
    marginBottom: '16px',
    borderTop: '3px solid var(--color-brand-primary)',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
    gap: '8px',
  },
  livesGroup: {
    display: 'flex',
    gap: '3px',
    alignItems: 'center',
  },
  xpWrapper: {
    position: 'relative',
    textAlign: 'center',
    flex: 1,
  },
  xpValue: {
    fontSize: '17px',
    fontWeight: 700,
    color: 'var(--color-xp)',
    letterSpacing: '0.3px',
  },
  xpPop: {
    position: 'absolute',
    top: '-6px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '17px',
    fontWeight: 800,
    color: 'var(--color-xp)',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    zIndex: 10,
  },
  tierBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.6px',
  },
  progressTrack: {
    height: '10px',
    background: 'var(--color-border)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
    marginBottom: '5px',
  },
  progressFill: {
    height: '100%',
    borderRadius: 'var(--radius-full)',
  },
  progressLabel: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    textAlign: 'right',
    margin: 0,
    fontWeight: 600,
  },
}
