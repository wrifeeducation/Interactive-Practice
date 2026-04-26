// TICKET-022: WorldNode Component
import { motion } from 'framer-motion'
import type { LessonNode } from '../types'

interface WorldNodeProps {
  lesson: LessonNode
  onClick?: (lesson: LessonNode) => void
  worldColor: string
}

function StarDisplay({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <span style={{ fontSize: '14px', letterSpacing: '1px' }} aria-label={`${count} of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ color: i < count ? 'var(--color-gold)' : 'var(--color-border)' }}>
          ★
        </span>
      ))}
    </span>
  )
}

export default function WorldNode({ lesson, onClick, worldColor }: WorldNodeProps) {
  const { status, lessonNumber, title, bronzeStars } = lesson

  const isClickable = status === 'available' || status === 'completed' || status === 'in_progress'
  const isLocked = status === 'locked' || status === 'coming_soon'
  const isBoss = status === 'boss'

  const handleClick = () => {
    if (isClickable || isBoss) onClick?.(lesson)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') handleClick()
  }

  const nodeStyle: React.CSSProperties = {
    width: '60px',
    height: '60px',
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    cursor: isClickable || isBoss ? 'pointer' : 'default',
    opacity: isLocked ? 0.45 : 1,
    position: 'relative',
    background: isLocked
      ? 'var(--color-border)'
      : isBoss
      ? '#1a1a2e'
      : worldColor,
    border: isBoss ? `2px solid var(--color-gold)` : '2px solid transparent',
    boxShadow: status === 'available' || (isBoss && status === 'boss')
      ? `0 0 12px 2px ${worldColor}80`
      : 'var(--shadow-sm)',
    minWidth: '44px',
    minHeight: '44px',
  }

  const contentStyle: React.CSSProperties = {
    textAlign: 'center',
    fontSize: '22px',
    lineHeight: 1,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0' }}>
      <motion.div
        data-testid={`world-node-${lessonNumber}`}
        role={isClickable || isBoss ? 'button' : 'img'}
        tabIndex={isClickable || isBoss ? 0 : -1}
        aria-label={`Lesson ${lessonNumber}: ${title} — ${status}`}
        style={nodeStyle}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        animate={status === 'available' ? { scale: [1, 1.06, 1] } : {}}
        transition={status === 'available' ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : {}}
        whileHover={isClickable || isBoss ? { scale: 1.1 } : {}}
        whileTap={isClickable || isBoss ? { scale: 0.95 } : {}}
      >
        <span style={contentStyle} aria-hidden="true">
          {isLocked && status === 'locked' ? '🔒' : null}
          {status === 'coming_soon' ? '🔒' : null}
          {status === 'available' ? lessonNumber : null}
          {status === 'in_progress' ? '✦' : null}
          {status === 'completed' ? lessonNumber : null}
          {isBoss ? '🐉' : null}
        </span>
      </motion.div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: status === 'available' ? 700 : 500,
            color: isLocked ? 'var(--color-text-muted)' : 'var(--color-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          data-tts={`lesson ${lessonNumber}: ${title}`}
        >
          {isBoss ? '⚔️ Boss Challenge' : title}
        </p>
        {status === 'completed' && (
          <StarDisplay count={bronzeStars} />
        )}
        {status === 'in_progress' && (
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>In progress</span>
        )}
        {status === 'coming_soon' && (
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Soon</span>
        )}
        {status === 'available' && (
          <span style={{ fontSize: '12px', color: worldColor, fontWeight: 600 }}>Play →</span>
        )}
      </div>
    </div>
  )
}
