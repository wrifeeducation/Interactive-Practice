import { useNavigate, Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

const WORLDS = [
  { id: 1, emoji: '📖', name: "Story Seeds",        lessons: 9,  color: 'var(--color-world-1)' },
  { id: 2, emoji: '🌿', name: 'Grammar Toolkit',    lessons: 10, color: 'var(--color-world-2)' },
  { id: 3, emoji: '🧱', name: 'Sentence Builders',  lessons: 12, color: 'var(--color-world-3)' },
  { id: 4, emoji: '🔨', name: "Writer's Craft",     lessons: 14, color: 'var(--color-world-4)' },
  { id: 5, emoji: '🌊', name: 'Flow & Finish',      lessons: 6,  color: '#c9a100'              },
  { id: 6, emoji: '🌌', name: 'Genre Arena',        lessons: 10, color: '#7C6BE0'              },
]

const FEATURES = [
  { icon: '⭐', title: 'Earn XP with every answer',  desc: 'Foundation → Application → Mastery unlocks as pupils improve', highlight: true,  bg: 'var(--color-brand-primary)' },
  { icon: '🔥', title: 'Daily streaks',               desc: 'Milestone bonuses at 3, 7, 14 and 30 days build the habit',    highlight: false, bg: '#FFF0D9' },
  { icon: '🏆', title: 'Boss challenges',             desc: '15-question world reviews unlock the next adventure',          highlight: false, bg: '#E8F5E9' },
  { icon: '📊', title: 'Teacher dashboard',           desc: 'Live heatmap, pupil profiles, common mistakes panel',          highlight: false, bg: 'var(--color-world-1-bg)' },
]

export default function Home() {
  const navigate = useNavigate()
  const { session, profile, loading } = useAuthStore()

  // Redirect logged-in users straight to their dashboard
  if (!loading && session && profile) {
    return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/world-map'} replace />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── NAV ── */}
      <nav style={{ background: 'var(--color-brand-primary)', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 26, background: 'rgba(255,255,255,0.2)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 16 14" fill="none" width="16" height="14">
              <rect x="0.5" y="0.5" width="7" height="13" rx="1" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
              <rect x="8.5" y="0.5" width="7" height="13" rx="1" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
              <line x1="8" y1="1" x2="8" y2="13" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
            </svg>
          </div>
          <span style={{ color: '#fff', fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>WriFe</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            data-testid="nav-login"
            onClick={() => navigate('/login')}
            style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '6px 16px', cursor: 'pointer' }}
          >
            Log in
          </button>
          <button
            data-testid="nav-signup"
            onClick={() => navigate('/signup')}
            style={{ color: 'var(--color-brand-primary)', fontSize: 13, fontWeight: 700, background: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer' }}
          >
            Sign up free
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: '44px 28px 28px', maxWidth: 780, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 24 }}>

          {/* Text */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-world-1-bg)', color: 'var(--color-brand-primary)', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20, marginBottom: 14 }}>
              <span style={{ width: 6, height: 6, background: 'var(--color-brand-secondary)', borderRadius: '50%', display: 'inline-block' }} />
              61 lessons · ages 7–14
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2, marginBottom: 12, letterSpacing: '-0.5px' }}>
              Writing practice<br />
              that{' '}
              <span style={{ color: 'var(--color-brand-primary)' }}>pupils love</span>
              <br />
              teachers trust
            </h1>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.65, maxWidth: 360 }}>
              Gamified lessons across 6 skill worlds. XP, badges, streaks and a live teacher dashboard.
            </p>
          </div>

          {/* Mascot */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 120, height: 120, background: 'var(--color-world-1-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img
                src="/mascots/pencil-waving.png"
                alt=""
                role="presentation"
                width={110}
                height={110}
                loading="eager"
                style={{ objectFit: 'contain' }}
              />
            </div>
            <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'var(--color-brand-accent)', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, border: '2px solid var(--color-background)' }}>
              ⭐
            </div>
          </div>
        </div>

        {/* ── CTA CARDS ── */}
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
          Where would you like to start?
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Pupil card */}
          <button
            data-testid="cta-pupil"
            onClick={() => navigate('/signup')}
            style={{ background: 'var(--color-brand-secondary)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', border: 'none', textAlign: 'left', height: 110, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>🎒</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>For pupils</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.25 }}>
              I'm a pupil —<br />start my adventure
            </p>
            <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 6, background: '#fff', color: 'var(--color-brand-secondary)' }}>
              Play now →
            </span>
          </button>

          {/* Teacher card */}
          <button
            data-testid="cta-teacher"
            onClick={() => navigate('/signup?role=teacher')}
            style={{ background: 'var(--color-brand-primary)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', border: 'none', textAlign: 'left', height: 110, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>📋</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>For teachers</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.25 }}>
              I'm a teacher —<br />set up my class
            </p>
            <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 6, background: '#fff', color: 'var(--color-brand-primary)' }}>
              Get started →
            </span>
          </button>

        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <div style={{ background: 'var(--color-brand-primary)', padding: '12px 28px', display: 'flex', justifyContent: 'space-around' }}>
        {[['61', 'lessons'], ['432+', 'activities'], ['75', 'badges'], ['6', 'worlds']].map(([n, l]) => (
          <div key={l} style={{ textAlign: 'center', color: '#fff' }}>
            <p style={{ fontSize: 17, fontWeight: 800 }}>{n}</p>
            <p style={{ fontSize: 10, opacity: 0.75, marginTop: 1 }}>{l}</p>
          </div>
        ))}
      </div>

      {/* ── SIX WORLDS ── */}
      <section style={{ padding: '28px 28px 24px', maxWidth: 780, margin: '0 auto' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>Six worlds to explore</h2>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>Beat the boss challenge to unlock each new world</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {WORLDS.map(w => (
            <div key={w.id} style={{ background: w.color, borderRadius: 10, padding: '12px 10px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 18 }}>{w.emoji}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.15)', borderRadius: 20, padding: '2px 6px' }}>W{w.id}</span>
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.25 }}>{w.name}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{w.lessons} lessons</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ background: '#fff', padding: '24px 28px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>How it works</h2>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>For pupils and teachers</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {FEATURES.map(f => (
              <div
                key={f.title}
                style={{
                  background: f.highlight ? 'var(--color-world-1-bg)' : 'var(--color-background)',
                  borderRadius: 10,
                  padding: 16,
                  border: f.highlight ? '0.5px solid var(--color-brand-primary)' : '0.5px solid var(--color-border)',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, marginBottom: 8 }}>
                  {f.icon}
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>{f.title}</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEACHER STRIP ── */}
      <section style={{ background: 'var(--color-text)', padding: '24px 28px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Set up your class in 60 seconds</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>
              Create a class, share the invite code with pupils and start tracking progress straight away. No spreadsheets needed.
            </p>
          </div>
          <button
            data-testid="teacher-strip-cta"
            onClick={() => navigate('/signup?role=teacher')}
            style={{ background: 'var(--color-brand-secondary)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Create my class →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: 'var(--color-background)', borderTop: '0.5px solid var(--color-border)', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '100%' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>WriFe</span>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>interactive-practice.vercel.app</span>
      </footer>

    </div>
  )
}
