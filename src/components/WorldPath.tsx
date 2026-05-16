/**
 * WorldPath — WriFe World Design System Pattern #4
 *
 * Renders lesson nodes as circular bubbles arranged in a winding S-path,
 * connected by dashed lines. Replaces the flat vertical list inside each
 * world accordion.
 *
 * Layout: nodes alternate between left, centre-left, centre-right, right
 * positions in a 4-column grid to create a natural winding road feel.
 *
 * Boss node: 90px circle with lightning bolt / skull, centred on path.
 */
import { motion } from 'framer-motion'
import type { LessonNode } from '../types'

interface WorldPathProps {
  lessons: LessonNode[]
  worldColor: string
  onNodeClick: (lesson: LessonNode) => void
}

// Winding pattern: column index 0-3 (0=far-left, 3=far-right)
// Produces: L, CL, CR, R, CR, CL, L, CL, CR, R …
const COLUMN_PATTERN = [0, 1, 2, 3, 2, 1]

// Left offset percentages for each column position
const COL_OFFSETS = ['4%', '24%', '52%', '72%']

function StarRow({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <span
      style={{ fontSize: '11px', letterSpacing: '0px', display: 'block', textAlign: 'center', marginTop: '2px' }}
      aria-label={`${count} of ${max} stars`}
    >
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ color: i < count ? '#F5C500' : 'rgba(0,0,0,0.15)' }}>★</span>
      ))}
    </span>
  )
}

export default function WorldPath({ lessons, worldColor, onNodeClick }: WorldPathProps) {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: `${lessons.length * 90 + 20}px`,
        padding: '16px 0 20px',
      }}
    >
      {lessons.map((lesson, index) => {
        const colIdx = COLUMN_PATTERN[index % COLUMN_PATTERN.length]
        const leftOffset = COL_OFFSETS[colIdx]

        const isLocked = lesson.status === 'locked' || lesson.status === 'coming_soon'
        const isBoss = lesson.lessonNumber < 0
        const isClickable = !isLocked
        const isCompleted = lesson.status === 'completed'
        const isAvailable = lesson.status === 'available'
        const isInProgress = lesson.status === 'in_progress'

        // Node sizes
        const nodeSize = isBoss ? 80 : 64
        const top = index * 90 + 16

        // Node colours
        const nodeBg = isLocked
          ? '#D1D5DB'
          : isBoss
          ? '#1a1a2e'
          : isCompleted
          ? worldColor
          : isAvailable || isInProgress
          ? worldColor
          : '#E5E7EB'

        const nodeContent = isLocked
          ? '🔒'
          : isBoss
          ? '⚔️'
          : isCompleted
          ? String(lesson.lessonNumber)
          : isInProgress
          ? '✦'
          : String(lesson.lessonNumber)

        // Connector line to next node
        const hasNext = index < lessons.length - 1
        let connectorWidth = '0'
        let connectorDirection: 'same' | 'right' | 'left' = 'same'
        if (hasNext) {
          const nextColIdx = COLUMN_PATTERN[(index + 1) % COLUMN_PATTERN.length]
          if (nextColIdx > colIdx) {
            connectorDirection = 'right'
          } else if (nextColIdx < colIdx) {
            connectorDirection = 'left'
          }
          const nextLeft = COL_OFFSETS[nextColIdx]
          void nextLeft // used only for direction logic above
          const cols = Math.abs(nextColIdx - colIdx)
          connectorWidth = cols === 0 ? '0' : cols === 1 ? '28%' : cols === 2 ? '56%' : '84%'
        }

        return (
          <div key={lesson.lessonNumber}>
            {/* Vertical dashed connector from this node down to next */}
            {hasNext && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: top + nodeSize,
                  left: `calc(${leftOffset} + ${nodeSize / 2}px)`,
                  width: connectorWidth,
                  height: '34px',
                  borderBottom: `3px dashed ${worldColor}55`,
                  borderLeft: connectorDirection === 'left' ? `3px dashed ${worldColor}55` : 'none',
                  borderRight: connectorDirection === 'right' ? `3px dashed ${worldColor}55` : 'none',
                  borderRadius:
                    connectorDirection === 'right' ? '0 0 0 8px' : connectorDirection === 'left' ? '0 0 8px 0' : 'none',
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Node */}
            <motion.button
              data-testid={`path-node-${lesson.lessonNumber}`}
              aria-label={
                isBoss
                  ? `Boss Challenge for World ${lesson.worldId}`
                  : `Lesson ${lesson.lessonNumber}: ${lesson.title}${isLocked ? ' (locked)' : ''}`
              }
              disabled={isLocked}
              onClick={() => { if (isClickable) onNodeClick(lesson) }}
              style={{
                position: 'absolute',
                top,
                left: leftOffset,
                width: `${nodeSize}px`,
                height: `${nodeSize}px`,
                borderRadius: '50%',
                background: nodeBg,
                border: isBoss
                  ? '3px solid #F5C500'
                  : isCompleted
                  ? `3px solid ${worldColor}`
                  : isAvailable
                  ? `3px solid ${worldColor}`
                  : '3px solid #D1D5DB',
                boxShadow: isLocked
                  ? 'none'
                  : `0 4px 14px ${worldColor}50`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isLocked ? 'default' : 'pointer',
                opacity: isLocked ? 0.5 : 1,
                color: isLocked ? '#9CA3AF' : '#fff',
                fontSize: isBoss ? '24px' : isCompleted || isAvailable || isInProgress ? '16px' : '16px',
                fontWeight: 700,
                padding: 0,
                // Remove default button chrome
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
              animate={
                isAvailable
                  ? { scale: [1, 1.07, 1], boxShadow: [`0 4px 14px ${worldColor}50`, `0 6px 20px ${worldColor}80`, `0 4px 14px ${worldColor}50`] }
                  : {}
              }
              transition={isAvailable ? { repeat: Infinity, duration: 2.2, ease: 'easeInOut' } : {}}
              whileHover={isClickable ? { scale: 1.1 } : {}}
              whileTap={isClickable ? { scale: 0.93 } : {}}
            >
              <span data-tts={`lesson ${lesson.lessonNumber}: ${lesson.title}`} style={{ lineHeight: 1 }}>
                {nodeContent}
              </span>
              {isCompleted && <StarRow count={lesson.bronzeStars} />}
            </motion.button>

            {/* Label next to node (to the opposite side for readability) */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: top + nodeSize / 2 - 18,
                left: (colIdx <= 1)
                  ? `calc(${leftOffset} + ${nodeSize + 8}px)`
                  : `calc(${leftOffset} - ${Math.min(colIdx === 2 ? 110 : 130, 130)}px)`,
                width: '110px',
                textAlign: (colIdx <= 1) ? 'left' : 'right',
                pointerEvents: 'none',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: isAvailable ? 700 : 500,
                  color: isLocked ? '#9CA3AF' : '#374151',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {isBoss ? '⚔️ Boss Challenge' : lesson.title}
              </p>
              {isAvailable && (
                <span style={{ fontSize: '13px', color: worldColor, fontWeight: 700, marginTop: '2px', display: 'block' }}>
                  Play →
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
