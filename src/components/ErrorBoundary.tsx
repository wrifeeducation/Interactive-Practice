// TICKET-048: Error Boundary
import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div
          data-testid="error-boundary"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-background)',
            padding: '24px',
          }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
              padding: '40px 32px',
              maxWidth: '480px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2
              style={{
                margin: '0 0 12px',
                fontSize: '22px',
                fontWeight: 600,
                color: 'var(--color-text)',
              }}
              data-tts="error heading"
            >
              Something went wrong
            </h2>
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '16px',
                marginBottom: '24px',
                lineHeight: 1.5,
              }}
              data-tts="error description"
            >
              An unexpected error occurred. Please try again — your progress is safe.
            </p>
            <button
              data-testid="error-boundary-retry"
              onClick={this.handleRetry}
              style={{
                padding: '12px 28px',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--color-text-on-dark)',
                background: 'var(--color-brand-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
