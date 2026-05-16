/**
 * CTAButton — WriFe World primary CTA button.
 *
 * Implements the Duolingo-style chunky press effect:
 *   - Resting:  border-bottom 5px solid (darken of bg colour)
 *   - Pressed:  translateY(3px) + border-bottom 2px (simulates pressing a physical button)
 *
 * Use `variant="primary"` (orange, default) or `variant="brand"` (purple) or
 * `variant="correct"` (green) or `variant="incorrect"` (red).
 *
 * All sizing respects WCAG 2.5.5 — minHeight is always ≥ 44px.
 */
import { useState, useCallback, type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'brand' | 'correct' | 'incorrect'

interface CTAButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
  fullWidth?: boolean
}

const VARIANT_STYLES: Record<Variant, { bg: string; shadow: string }> = {
  primary:   { bg: 'var(--color-brand-secondary)', shadow: '#C97D10' },
  brand:     { bg: 'var(--color-brand-primary)',   shadow: '#4E3CA8' },
  correct:   { bg: 'var(--color-correct)',          shadow: '#1A7A45' },
  incorrect: { bg: 'var(--color-incorrect)',        shadow: '#A01A1A' },
}

export default function CTAButton({
  variant = 'brand',
  children,
  fullWidth = false,
  disabled = false,
  style,
  ...rest
}: CTAButtonProps) {
  const [pressed, setPressed] = useState(false)

  const handlePress   = useCallback(() => { if (!disabled) setPressed(true)  }, [disabled])
  const handleRelease = useCallback(() => setPressed(false), [])

  const { bg, shadow } = VARIANT_STYLES[variant]

  const btnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 28px',
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    background: bg,
    border: 'none',
    borderBottom: pressed || disabled ? `2px solid ${shadow}` : `5px solid ${shadow}`,
    borderRadius: 'var(--radius-md)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    minHeight: '44px',
    width: fullWidth ? '100%' : undefined,
    opacity: disabled ? 0.55 : 1,
    transform: pressed && !disabled ? 'translateY(3px)' : 'translateY(0)',
    transition: 'transform 80ms ease, border-bottom 80ms ease, opacity 150ms',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    ...style,
  }

  return (
    <button
      {...rest}
      disabled={disabled}
      style={btnStyle}
      onMouseDown={handlePress}
      onMouseUp={handleRelease}
      onMouseLeave={handleRelease}
      onTouchStart={handlePress}
      onTouchEnd={handleRelease}
    >
      {children}
    </button>
  )
}
