/**
 * AdminPage — tabbed admin dashboard for WriFe Interactive Practice.
 * Route: /admin  (guarded by AdminGuard — admin role only)
 *
 * Tabs:
 *  📁 Content    — upload / parse / preview / publish lesson HTML files
 *  📊 Analytics  — platform stats (pupils, XP, completions, streaks)
 *  📋 Teachers   — list all teacher accounts + their classes
 *  🎒 Pupils     — searchable pupil list with streak status
 *  🔑 Passwords  — send password-reset emails to any user
 *  👑 Admins     — list and promote admin accounts
 *  🏫 Schools    — coming soon
 */
import { useState, Suspense, lazy } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const ContentTab    = lazy(() => import('./tabs/ContentTab'))
const AnalyticsTab  = lazy(() => import('./tabs/AnalyticsTab'))
const TeachersTab   = lazy(() => import('./tabs/TeachersTab'))
const PupilsTab     = lazy(() => import('./tabs/PupilsTab'))
const PasswordsTab  = lazy(() => import('./tabs/PasswordsTab'))
const AdminsTab     = lazy(() => import('./tabs/AdminsTab'))
const CreateUserTab = lazy(() => import('./tabs/CreateUserTab'))

type Tab = 'content' | 'analytics' | 'teachers' | 'pupils' | 'passwords' | 'admins' | 'schools' | 'create-user'

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'content',     label: 'Content',     icon: '📁' },
  { id: 'analytics',  label: 'Analytics',   icon: '📊' },
  { id: 'teachers',   label: 'Teachers',    icon: '📋' },
  { id: 'pupils',     label: 'Pupils',      icon: '🎒' },
  { id: 'passwords',  label: 'Passwords',   icon: '🔑' },
  { id: 'admins',     label: 'Admins',      icon: '👑' },
  { id: 'create-user', label: 'Create User', icon: '👤' },
  { id: 'schools',    label: 'Schools',     icon: '🏫' },
]

function TabBar({ active, onSelect }: { active: Tab; onSelect: (t: Tab) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 6, border: '1px solid var(--color-border)', marginBottom: 24 }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)} data-testid={`admin-tab-${t.id}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: active === t.id ? 'var(--color-brand-primary)' : 'transparent',
            color: active === t.id ? '#fff' : 'var(--color-text-muted)',
            fontWeight: active === t.id ? 700 : 400,
            fontSize: 'var(--font-size-sm)', cursor: 'pointer',
            transition: 'background var(--transition-fast)',
            minHeight: 'var(--touch-target)',
          }}>
          <span style={{ fontSize: 16 }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  )
}

function TabSpinner() {
  return <p style={{ color: 'var(--color-text-muted)', padding: '24px 0' }}>Loading…</p>
}

function SchoolsComingSoon() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏫</div>
      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>Schools — Coming Soon</h2>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', maxWidth: 380, margin: '0 auto' }}>
        Organisation-level grouping for multi-school deployments. Teachers and pupils will be able to join a school for shared analytics and admin.
      </p>
    </div>
  )
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('content')

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)' }}>

      {/* ── Top nav ── */}
      <nav style={{
        background: 'var(--color-brand-primary)', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 40px)', position: 'sticky', top: 0, zIndex: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ color: '#fff', fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px', textDecoration: 'none' }}>WriFe</Link>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{profile?.display_name}</span>
          <button onClick={() => void handleSignOut()} data-testid="admin-signout"
            style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </nav>

      {/* ── Content area ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(16px, 3vw, 32px) clamp(16px, 4vw, 40px)' }}>

        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 'var(--font-size-page-title)', fontWeight: 800, color: 'var(--color-brand-primary)', margin: '0 0 4px' }}>
            🛠️ Admin Dashboard
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            WriFe Interactive Practice · Creator tools
          </p>
        </div>

        {/* Tab bar */}
        <TabBar active={activeTab} onSelect={setActiveTab} />

        {/* Tab panel */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--color-border)', padding: 'clamp(20px, 3vw, 32px)', boxShadow: 'var(--shadow-md)' }}>
          <Suspense fallback={<TabSpinner />}>
            {activeTab === 'content'   && <ContentTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
            {activeTab === 'teachers'  && <TeachersTab />}
            {activeTab === 'pupils'    && <PupilsTab />}
            {activeTab === 'passwords' && <PasswordsTab />}
            {activeTab === 'admins'       && <AdminsTab />}
            {activeTab === 'create-user'  && <CreateUserTab />}
            {activeTab === 'schools'      && <SchoolsComingSoon />}
          </Suspense>
        </div>
      </div>

    </div>
  )
}
