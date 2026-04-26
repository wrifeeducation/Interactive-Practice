import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/authStore'
import RoleRedirect from './components/RoleRedirect'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ActivitySession from './pages/ActivitySession'
import LessonComplete from './pages/LessonComplete'

// Lazy-loaded heavy/teacher pages
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } },
})

function FullPageSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-background)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 18 }}>Loading WriFe…</p>
      </div>
    </div>
  )
}

function WorldMapPlaceholder() {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <h1 style={{ color: 'var(--color-text)' }}>🗺️ World Map</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 18 }}>Coming in TICKET-021</p>
    </div>
  )
}

function AppRoutes() {
  const { setSession, fetchProfile } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
      else useAuthStore.setState({ loading: false })
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
      else useAuthStore.setState({ loading: false })
    })
    return () => subscription.unsubscribe()
  }, [setSession, fetchProfile])

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Pupil-only routes */}
      <Route
        path="/world-map"
        element={
          <RoleRedirect allowedRole="pupil">
            <WorldMapPlaceholder />
          </RoleRedirect>
        }
      />
      <Route
        path="/lesson/:lessonId/:level"
        element={
          <RoleRedirect allowedRole="pupil">
            <ActivitySession />
          </RoleRedirect>
        }
      />
      <Route
        path="/lesson/:lessonId/complete"
        element={
          <RoleRedirect allowedRole="pupil">
            <LessonComplete />
          </RoleRedirect>
        }
      />

      {/* Teacher-only routes */}
      <Route
        path="/teacher"
        element={
          <RoleRedirect allowedRole="teacher">
            <Suspense fallback={<FullPageSpinner />}>
              <TeacherDashboard />
            </Suspense>
          </RoleRedirect>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/world-map" replace />} />
      <Route path="*" element={<Navigate to="/world-map" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
