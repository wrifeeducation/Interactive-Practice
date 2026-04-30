import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface Props {
  children: ReactNode
  allowedRole?: 'pupil' | 'teacher'
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
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '18px' }}>Loading…</p>
      </div>
    </div>
  )
}

/**
 * TICKET-010: RoleRedirect
 * Wraps protected routes. Checks auth state from useAuthStore.
 * - No session → redirect to /login
 * - Loading → full-page spinner
 * - No profile → redirect to /signup (incomplete sign-up)
 * - Pupil → render children (or redirect to /world-map if allowedRole=teacher)
 * - Teacher → redirect to /teacher (unless allowedRole=teacher)
 */
export default function RoleRedirect({ children, allowedRole }: Props) {
  const { session, profile, loading } = useAuthStore()

  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/signup" replace />

  // Admin can access any protected route — no role redirect needed
  if (profile.role === 'admin') return <>{children}</>

  if (allowedRole === 'teacher' && profile.role !== 'teacher') {
    return <Navigate to="/world-map" replace />
  }

  if (allowedRole === 'pupil' && profile.role !== 'pupil') {
    return <Navigate to="/teacher" replace />
  }

  return <>{children}</>
}
