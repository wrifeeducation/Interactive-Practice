/**
 * WorldPath — WriFe World Design System Pattern #4
 *
 * Renders lesson nodes as 3-D sphere-style circular buttons arranged in a
 * winding S-path, connected by dashed lines. Active node shows a "START"
 * callout bubble above it.
 *
 * 3-D effect:
 *   - radial-gradient (bright top-left → base → dark) simulates curvature
 *   - inset shadows for inner top-highlight and bottom-depth
 *   - `0 Npx 0 [shelf-colour]` box-shadow creates the physical bottom shelf
 */
import { motion } from 'framer-motion'
import type { LessonNode } from '../types'

interface WorldPathProps {
  lessons: LessonNode[]
  worldColor: string
  onNodeClick: (lesson: LessonNode) => void
}

// Column pattern: 0=far-left … 3=far-right, producing a winding S-path
const COLUMN_PATTERN = [0, 1, 2, 3, 2, 1]
const COL_OFFSETS    = ['4%', '24%', '52%', '72%']

// Per-world colour shades derived from the CSS token hex values in index.css
const WORLD_SHADES: Record<string, { light: string; dark: string; shelf: string; text: string }> = {
  'var(--color-world-1)': { light: '#9B8FF7', dark: '#4A3DAD', shelf: '#3d35a0', text: '#fff'    },
  'var(--color-world-2)': { light: '#33D6AD', dark: '#00796B', shelf: '#006655', text: '#fff'    },
  'var(--color-world-3)': { light: '#2D9EF7', dark: '#0560AA', shelf: '#044E8F', text: '#fff'    },
  'var(--color-world-4)': { light: '#F08A6F', dark: '#B84530', shelf: '#9A3825', text: '#fff'    },
  'var(--color-world-5)': { light: '#FFD98A', dark: '#C49730', shelf: '#A87E28', text: '#7a4f00' },
  'var(--color-world-6)': { light: '#C4BEFF', dark: '#6B62CC', shelf: '#5552B0', text: '#fff'    },
}

const LOCKED_STYLE = {
  background:  'radial-gradient(ellipse at 38% 32%, #E5E7EB 0%, #C8CBD0 55%, #9CA3AF 100%)',
  boxShadow:   'inset 0 3px 7px rgba(255,255,255,0.45), inset 0 -2px 5px rgba(0,0,0,0.12), 0 4px 0 #9CA3AF, 0 6px 12px rgba(0,0,0,0.10)',
  border:      'none',
  color:       '#9CA3AF',
}

const BOSS_STYLE = {
  background:  'radial-gradient(ellipse at 38% 32%, #3a3a5c 0%, #1a1a2e 55%, #0d0d18 100%)',
  boxShadow:   'inset 0 4px 10px rgba(255,255,255,0.12), inset 0 -3px 8px rgba(0,0,0,0.40), 0 6px 0 #F5C500, 0 10px 24px rgba(0,0,0,0.45)',
  border:      '3px solid #F5C500',
  color:       '#fff',
}

// CSS var → hex lookup so we can use hex inside radial-gradient
const VAR_TO_HEX: Record<string, string> = {
  'var(--color-world-1)': '#6C5CE7',
  'var(--color-world-2)': '#00B894',
  'var(--color-world-3)': '#0984E3',
  'var(--color-world-4)': '#E17055',
  'var(--color-world-5)': '#FDCB6E',
  'var(--color-world-6)': '#A29BFE',
}

function node3dStyleHex(worldColor: string, nodeSize: number): React.CSSProperties {
  const s   = WORLD_SHADES[worldColor]
  const hex = VAR_TO_HEX[worldColor] ?? worldColor
  if (!s) return { background: hex, color: '#fff', border: 'none' }
  const ambient = nodeSize >= 70 ? '0 10px 22px' : '0 8px 18px'
  return {
    background: `radial-gradient(ellipse at 38% 32%, ${s.light} 0%, ${hex} 55%, ${s.dark} 100%)`,
    boxShadow:  `inset 0 3px 8px rgba(255,255,255,0.28), inset 0 -2px 6px rgba(0,0,0,0.18), 0 5px 0 ${s.shelf}, ${ambient} ${s.shelf}55`,
    border:     'none',
    color:      s.text,
  }
}

function StarRow({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <span
      style={{ fontSize: '11px', display: 'block', textAlign: 'center', marginTop: '2px', lineHeight: 1 }}
      aria-label={`${count} of ${max} stars`}
    >
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ color: i < count ? '#F5C500' : 'rgba(255,255,255,0.30)' }}>★</span>
      ))}
    </span>
  )
}

export default function WorldPath({ lessons, worldColor, onNodeClick }: WorldPathProps) {
  const shades = WORLD_SHADES[worldColor]

  return (
    <div style={{ position: 'relative', minHeight: `${lessons.length * 90 + 20}px`, padding: '16px 0 20px' }}>
      {lessons.map((lesson, index) => {
        const colIdx    = COLUMN_PATTERN[index % COLUMN_PATTERN.length]
        const leftOffset = COL_OFFSETS[colIdx]

        const isLocked      = lesson.status === 'locked' || lesson.status === 'coming_soon'
        const isBoss        = lesson.lessonNumber < 0
        const isClickable   = !isLocked
        const isCompleted   = lesson.status === 'completed'
        const isAvailable   = lesson.status === 'available'
        const isInProgress  = lesson.status === 'in_progress'

        // Sizes: active node is slightly larger for visual emphasis
        const nodeSize = isBoss ? 80 : isAvailable ? 72 : 64
        const top      = index * 90 + 16

        // 3-D node style
        const nodeStyle: React.CSSProperties = isLocked
          ? LOCKED_STYLE
          : isBoss
          ? BOSS_STYLE
          : node3dStyleHex(worldColor, nodeSize)

        // Icon inside node
        const nodeContent = isLocked
          ? '🔒'
          : isBoss
          ? '⚔️'
          : isAvailable || isInProgress
          ? '▶'
          : String(lesson.lessonNumber)

        // Connector to next node
        const hasNext = index < lessons.length - 1
        let connectorWidth    = '0'
        let connectorDirection: 'same' | 'right' | 'left' = 'same'
        if (hasNext) {
          const nextColIdx = COLUMN_PATTERN[(index + 1) % COLUMN_PATTERN.length]
          if (nextColIdx > colIdx)      connectorDirection = 'right'
          else if (nextColIdx < colIdx) connectorDirection = 'left'
          const cols = Math.abs(nextColIdx - colIdx)
          connectorWidth = cols === 0 ? '0' : cols === 1 ? '28%' : cols === 2 ? '56%' : '84%'
        }

        return (
          <div key={lesson.lessonNumber}>

            {/* Dashed connector */}
            {hasNext && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top:  top + nodeSize,
                  left: `calc(${leftOffset} + ${nodeSize / 2}px)`,
                  width:        connectorWidth,
                  height:       '34px',
                  borderBottom: `3px dashed ${worldColor}55`,
                  borderLeft:   connectorDirection === 'left'  ? `3px dashed ${worldColor}55` : 'none',
                  borderRight:  connectorDirection === 'right' ? `3px dashed ${worldColor}55` : 'none',
                  borderRadius: connectorDirection === 'right' ? '0 0 0 8px' : connectorDirection === 'left' ? '0 0 8px 0' : 'none',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* START callout bubble above active node */}
            {isAvailable && shades && (
              <div
                aria-hidden="true"
                style={{
                  position:       'absolute',
                  top:            top - 38,
                  left:           leftOffset,
                  width:          `${nodeSize}px`,
                  display:        'flex',
                  justifyContent: 'center',
                  pointerEvents:  'none',
                  zIndex:         2,
                }}
              >
                <div style={{
                  background:   VAR_TO_HEX[worldColor] ?? worldColor,
                  color:        shades.text,
                  fontSize:     '12px',
                  fontWeight:   800,
                  padding:      '4px 12px',
                  borderRadius: '20px',
                  boxShadow:    `0 3px 0 ${shades.shelf}`,
                  position:     'relative',
                  whiteSpace:   'nowrap',
                  letterSpacing: '0.03em',
                }}>
                  START
                  {/* Triangle pointer */}
                  <span style={{
                    position:    'absolute',
                    bottom:      '-7px',
                    left:        '50%',
                    transform:   'translateX(-50%)',
                    width:        0,
                    height:       0,
                    borderLeft:  '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop:   `7px solid ${VAR_TO_HEX[worldColor] ?? worldColor}`,
                    display:     'block',
                  }} />
                </div>
              </div>
            )}

            {/* Node button */}
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
                position:     'absolute',
                top,
                left:         leftOffset,
                width:        `${nodeSize}px`,
                height:       `${nodeSize}px`,
                borderRadius: '50%',
                ...nodeStyle,
                display:      'flex',
                flexDirection: 'column',
                alignItems:   'center',
                justifyContent: 'center',
                cursor:       isLocked ? 'default' : 'pointer',
                opacity:      isLocked ? 0.55 : 1,
                fontSize:     isBoss ? '26px' : isAvailable ? '20px' : '16px',
                fontWeight:   700,
                padding:      0,
                outline:      'none',
                WebkitTapHighlightColor: 'transparent',
                zIndex:       1,
              }}
              animate={isAvailable ? { scale: [1, 1.06, 1] } : {}}
              transition={isAvailable ? { repeat: Infinity, duration: 2.2, ease: 'easeInOut' } : {}}
              whileHover={isClickable ? { scale: 1.10, y: -2 } : {}}
              whileTap={isClickable   ? { scale: 0.93, y: 2  } : {}}
            >
              <span data-tts={`lesson ${lesson.lessonNumber}: ${lesson.title}`} style={{ lineHeight: 1 }}>
                {nodeContent}
              </span>
              {isCompleted && <StarRow count={lesson.bronzeStars} />}
            </motion.button>

            {/* Text label beside node */}
            <div
              aria-hidden="true"
              style={{
                position:  'absolute',
                top:       top + nodeSize / 2 - 18,
                left:      colIdx <= 1
                  ? `calc(${leftOffset} + ${nodeSize + 8}px)`
                  : `calc(${leftOffset} - ${colIdx === 2 ? 110 : 130}px)`,
                width:     '110px',
                textAlign: colIdx <= 1 ? 'left' : 'right',
                pointerEvents: 'none',
              }}
            >
              <p style={{
                margin:      0,
                fontSize:    '13px',
                fontWeight:  isAvailable ? 700 : 500,
                color:       isLocked ? '#9CA3AF' : '#374151',
                lineHeight:  1.3,
                overflow:    'hidden',
                display:     '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {isBoss ? '⚔️ Boss Challenge' : lesson.title}
              </p>
              {isAvailable && (
                <span style={{
                  fontSize:   '13px',
                  color:      VAR_TO_HEX[worldColor] ?? worldColor,
                  fontWeight: 700,
                  marginTop:  '2px',
                  display:    'block',
                }}>
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
