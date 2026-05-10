import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/authStore'
import RoleRedirect from './components/RoleRedirect'
import ErrorBoundary from './components/ErrorBoundary'
import AppShell from './components/layout/AppShell'
import AdminGuard from './components/AdminGuard'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import PupilLogin from './pages/PupilLogin'
import WelcomePage from './pages/WelcomePage'
import ActivitySession from './pages/ActivitySession'
import LessonComplete from './pages/LessonComplete'
import WorldMap from './pages/WorldMap'
import BossChallenge from './pages/BossChallenge'
import BadgeShelf from './pages/BadgeShelf'
import ConnectGrid from './pages/ConnectGrid'

// Route C — parent home sign-up (lazy: standalone flow, not part of core bundle)
const HomeSignupPage = lazy(() => import('./pages/HomeSignupPage'))

// Route D — independent teacher sign-up
const TeacherSignupPage = lazy(() => import('./pages/TeacherSignupPage'))

// Lazy-loaded heavy/teacher/admin pages
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'))
const PupilJoinClass   = lazy(() => import('./pages/PupilJoinClass'))
const PupilLeaderboard = lazy(() => import('./pages/PupilLeaderboard'))
const AdminPage        = lazy(() => import('./pages/admin/AdminPage'))

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
        <Route path="/pupil-login" element={<PupilLogin />} />
        <Route path="/home-signup" element={
          <Suspense fallback={<FullPageSpinner />}>
            <HomeSignupPage />
          </Suspense>
        } />
        <Route path="/teacher-signup" element={
          <Suspense fallback={<FullPageSpinner />}>
            <TeacherSignupPage />
          </Suspense>
        } />

        {/* Pupil welcome screen — shown immediately after login */}
        <Route
          path="/welcome"
          element={
            <RoleRedirect allowedRole="pupil">
              <WelcomePage />
            </RoleRedirect>
          }
        />

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

        <Route
          path="/connect-grid"
          element={
            <RoleRedirect allowedRole="pupil">
              <ErrorBoundary>
                <ConnectGrid />
              </ErrorBoundary>
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

        {/* Admin-only route — creator content management tool */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <Suspense fallback={<FullPageSpinner />}>
                <ErrorBoundary>
                  <AdminPage />
                </ErrorBoundary>
              </Suspense>
            </AdminGuard>
          }
        />

        {/* Fallback — unknown routes go to home, which handles role-based redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <AppRoutes />
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
