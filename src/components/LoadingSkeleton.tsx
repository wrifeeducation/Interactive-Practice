// TICKET-048: Loading Skeleton

interface LoadingSkeletonProps {
  width?: string | number
  height?: string | number
  variant?: 'text' | 'card' | 'circle'
  style?: React.CSSProperties
}

export default function LoadingSkeleton({
  width = '100%',
  height = 20,
  variant = 'text',
  style,
}: LoadingSkeletonProps) {
  const borderRadius =
    variant === 'circle'
      ? '50%'
      : variant === 'card'
        ? 'var(--radius-md)'
        : '4px'

  return (
    <div
      data-testid="loading-skeleton"
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius,
        background: 'var(--color-border)',
        ...style,
      }}
      aria-hidden="true"
    />
  )
}
