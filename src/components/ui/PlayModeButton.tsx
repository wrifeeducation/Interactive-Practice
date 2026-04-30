/**
 * PlayModeButton — drop this into any lesson page to give pupils a
 * one-tap entry into full-screen play mode.
 *
 * Usage:
 *   <PlayModeButton />                    // default size
 *   <PlayModeButton size="sm" />          // compact variant for tight layouts
 *   <PlayModeButton label="Play" />       // custom label
 */
import { useFullscreen } from '../../hooks/useFullscreen'

interface Props {
  size?: 'sm' | 'md'
  label?: string
  /** Extra inline styles for positioning in parent */
  style?: React.CSSProperties
}

export default function PlayModeButton({
  size = 'md',
  label = 'Play Mode',
  style,
}: Props) {
  const { isFullscreen, toggleFullscreen, supported } = useFullscreen()

  // Hide gracefully if the browser doesn't support the Fullscreen API
  if (!supported) return null

  const isSmall = size === 'sm'

  return (
    <button
      onClick={toggleFullscreen}
      data-testid="play-mode-btn"
      aria-label={isFullscreen ? 'Exit play mode' : 'Enter play mode'}
      aria-pressed={isFullscreen}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? 6 : 8,
        padding: isSmall ? '6px 12px' : '10px 18px',
        borderRadius: 'var(--radius-full)',
        background: isFullscreen
          ? 'var(--color-text-muted)'
          : 'var(--color-brand-secondary)',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        fontSize: isSmall ? 'var(--font-size-sm)' : 'var(--font-size-base)',
        fontWeight: 600,
        boxShadow: 'var(--shadow-sm)',
        transition: 'background var(--transition-fast), transform var(--transition-fast)',
        minHeight: 'var(--touch-target)',
        ...style,
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
      }}
    >
      {/* Icon */}
      <span aria-hidden="true" style={{ fontSize: isSmall ? 14 : 16 }}>
        {isFullscreen ? '⊠' : '⛶'}
      </span>
      <span data-tts={isFullscreen ? 'Exit play mode' : label}>
        {isFullscreen ? 'Exit' : label}
      </span>
    </button>
  )
}
