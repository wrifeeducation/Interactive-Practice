// TICKET-035: Teacher Dashboard Layout
import { useState, Suspense, lazy } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useQuery } from '@tanstack/react-query'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import type { ClassRow } from '../../types'

const TeacherOverview = lazy(() => import('./TeacherOverview'))
const TeacherHeatmap = lazy(() => import('./TeacherHeatmap'))
const TeacherSettings = lazy(() => import('./TeacherSettings'))
const PupilProfile = lazy(() => import('./PupilProfile'))

const NAV_ITEMS = [
  { path: 'overview', label: 'Overview', icon: '📊', testId: 'teacher-nav-overview' },
  { path: 'heatmap', label: 'Heatmap', icon: '🗺️', testId: 'teacher-nav-heatmap' },
  { path: 'pupils', label: 'Pupils', icon: '🏅', testId: 'teacher-nav-pupils' },
  { path: 'settings', label: 'Class Settings', icon: '⚙️', testId: 'teacher-nav-settings' },
]

function SuspenseFallback() {
  return (
    <div style={{ padding: '24px' }}>
      <LoadingSkeleton height={48} style={{ marginBottom: 12 }} />
      <LoadingSkeleton height={200} variant="card" />
    </div>
  )
}

export default function TeacherDashboard() {
  const { profile, clearAuth } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: classRow } = useQuery<ClassRow | null>({
    queryKey: ['teacher-class', useAuthStore.getState().session?.user?.id],
    queryFn: async () => {
      const uid = useAuthStore.getState().session?.user?.id
      if (!uid) return null
      const { data } = await supabase.from('classes').select('*').eq('teacher_id', uid).maybeSingle()
      return data as ClassRow | null
    },
    enabled: !!useAuthStore.getState().session?.user?.id,
  })

  async function handleSignOut() {
    await supabase.auth.signOut()
    clearAuth()
    window.location.href = '/login'
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-background)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'var(--color-overlay)', zIndex: 40 }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        data-testid="teacher-sidebar"
        className={`teacher-sidebar${sidebarOpen ? ' open' : ''}`}
        style={{
          width: '220px',
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--color-text)' }}>WriFe</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Teacher Dashboard</div>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              data-testid={item.testId}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '2px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--color-brand-primary)' : 'var(--color-text)',
                background: isActive ? 'var(--color-background)' : 'transparent',
                minHeight: '44px',
                transition: 'background 150ms',
              })}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <NavLink to="/" data-testid="teacher-home-link"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontSize: '14px', color: 'var(--color-text-muted)', minHeight: '44px' }}>
            🏠 Home
          </NavLink>
          <button
            data-testid="teacher-sign-out"
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              color: 'var(--color-text-muted)',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              minHeight: '44px',
              textAlign: 'left',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Hamburger (mobile) */}
          <button
            data-testid="teacher-hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation"
            style={{
              display: 'none',
              padding: '8px',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '18px',
              minHeight: '44px',
              minWidth: '44px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="teacher-hamburger"
          >
            ☰
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.name ?? 'Teacher'}
            </div>
            {classRow && (
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {classRow.name}
              </div>
            )}
          </div>

          <button
            data-testid="teacher-sign-out-topbar"
            onClick={handleSignOut}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              minHeight: '36px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Sign Out
          </button>
        </header>

        {/* Routed content */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Suspense fallback={<SuspenseFallback />}>
            <Routes>
              <Route index element={<TeacherOverview />} />
              <Route path="overview" element={<TeacherOverview />} />
              <Route path="heatmap" element={<TeacherHeatmap />} />
              <Route path="pupils" element={<TeacherOverview />} />
              <Route path="settings" element={<TeacherSettings />} />
              <Route path="pupil/:pupilId" element={<PupilProfile />} />
              <Route
                path="*"
                element={
                  <div style={{ padding: '24px', color: 'var(--color-text-muted)' }}>
                    Select a section from the sidebar.
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}
