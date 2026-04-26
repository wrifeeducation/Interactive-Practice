import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/authStore'
import RoleRedirect from './components/RoleRedirect'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ActivitySession from './pages/ActivitySession'
import LessonComplete from './pages/LessonComplete'
import WorldMap from './pages/WorldMap'
import BossChallenge from './pages/BossChallenge'
import BadgeShelf from './pages/BadgeShelf'

// Lazy-loaded heavy/teacher pages
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'))
const PupilJoinClass = lazy(() => import('./pages/PupilJoinClass'))
const PupilLeaderboard = lazy(() => import('./pages/PupilLeaderboard'))

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
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Pupil-only routes */}
        <Route
          path="/world-map"
          element={
            <RoleRedirect allowedRole="pupil">
              <ErrorBoundary>
                <WorldMap />
              </ErrorBoundary>
            </RoleRedirect>
          }
        />
        <Route
          path="/lesson/:lessonId/:level"
          element={
            <RoleRedirect allowedRole="pupil">
              <ErrorBoundary>
                <ActivitySession />
              </ErrorBoundary>
            </RoleRedirect>
          }
        />
        <Route
          path="/lesson/:lessonId/complete"
          element={
            <RoleRedirect allowedRole="pupil">
              <ErrorBoundary>
                <LessonComplete />
              </ErrorBoundary>
            </RoleRedirect>
          }
        />
        <Route
          path="/boss/:worldId"
          element={
            <RoleRedirect allowedRole="pupil">
              <ErrorBoundary>
                <BossChallenge />
              </ErrorBoundary>
            </RoleRedirect>
          }
        />
        <Route
          path="/pupil/badges"
          element={
            <RoleRedirect allowedRole="pupil">
              <ErrorBoundary>
                <BadgeShelf />
              </ErrorBoundary>
            </RoleRedirect>
          }
        />
        <Route
          path="/pupil/join"
          element={
            <RoleRedirect allowedRole="pupil">
              <Suspense fallback={<FullPageSpinner />}>
                <ErrorBoundary>
                  <PupilJoinClass />
                </ErrorBoundary>
              </Suspense>
            </RoleRedirect>
          }
        />
        <Route
          path="/pupil/leaderboard"
          element={
            <RoleRedirect allowedRole="pupil">
              <Suspense fallback={<FullPageSpinner />}>
                <ErrorBoundary>
                  <PupilLeaderboard />
                </ErrorBoundary>
              </Suspense>
            </RoleRedirect>
          }
        />

        {/* Teacher-only routes — nested under /teacher/* */}
        <Route
          path="/teacher/*"
          element={
            <RoleRedirect allowedRole="teacher">
              <Suspense fallback={<FullPageSpinner />}>
                <ErrorBoundary>
                  <TeacherDashboard />
                </ErrorBoundary>
              </Suspense>
            </RoleRedirect>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/world-map" replace />} />
        <Route path="*" element={<Navigate to="/world-map" replace />} />
      </Routes>
    </ErrorBoundary>
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
