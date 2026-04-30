/**
 * AdminGuard — protects the /admin route.
 *
 * Only allows access when the authenticated profile has role === 'admin'.
 * All other users (including teachers) are redirected silently to their
 * home screen — the admin route is never advertised in the UI.
 */
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface Props {
  children: ReactNode
}

function FullPageSpinner() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--color-background)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '18px' }}>Checking access…</p>
      </div>
    </div>
  )
}

export default function AdminGuard({ children }: Props) {
  const { session, profile, loading } = useAuthStore()

  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/login" replace />

  if (profile.role !== 'admin') {
    // Redirect non-admins to their appropriate home — no error page that
    // reveals the route exists
    const home = profile.role === 'teacher' ? '/teacher' : '/world-map'
    return <Navigate to={home} replace />
  }

  return <>{children}</>
}
