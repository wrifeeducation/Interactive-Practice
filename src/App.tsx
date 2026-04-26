import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/authStore'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } },
})

function AppRoutes() {
  const { session, profile, loading, setSession, fetchProfile } = useAuthStore()

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
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-background)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 18 }}>Loading WriFe…</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))' }}>
        <div style={{ textAlign: 'center', color: 'white', padding: 32 }}>
          <h1 style={{ fontSize: 48, margin: '0 0 8px', color: 'white' }}>WriFe</h1>
          <p style={{ fontSize: 20, margin: '0 0 32px', opacity: 0.9 }}>Interactive Practice</p>
          <p style={{ opacity: 0.7 }}>Login page coming in TICKET-008</p>
        </div>
      </div>
    )
  }

  if (profile?.role === 'teacher') {
    return (
      <div style={{ padding: 32 }}>
        <h1>Teacher Dashboard</h1>
        <p>Coming in TICKET-035</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 32 }}>
      <h1>🗺️ World Map</h1>
      <p>Coming in TICKET-021</p>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<AppRoutes />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
