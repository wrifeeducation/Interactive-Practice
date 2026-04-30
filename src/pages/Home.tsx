import { useNavigate, Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

const WORLDS = [
  { id: 1, emoji: '📖', name: 'Story Seeds',       lessons: 9,  color: 'var(--color-world-1)' },
  { id: 2, emoji: '🌿', name: 'Grammar Toolkit',   lessons: 10, color: 'var(--color-world-2)' },
  { id: 3, emoji: '🧱', name: 'Sentence Builders', lessons: 12, color: 'var(--color-world-3)' },
  { id: 4, emoji: '🔨', name: "Writer's Craft",    lessons: 14, color: 'var(--color-world-4)' },
  { id: 5, emoji: '🌊', name: 'Flow & Finish',     lessons: 6,  color: 'var(--color-world-5)' },
  { id: 6, emoji: '🌌', name: 'Genre Arena',       lessons: 10, color: 'var(--color-world-6)' },
]

const FEATURES = [
  { icon: '⭐', title: 'Earn XP with every answer',  desc: 'Foundation → Application → Mastery unlocks as pupils improve', bg: 'var(--color-world-1-bg)', border: 'var(--color-brand-primary)' },
  { icon: '🔥', title: 'Daily streaks',              desc: 'Milestone bonuses at 3, 7, 14 and 30 days build the habit',    bg: '#FFF0D9', border: 'var(--color-border)' },
  { icon: '🏆', title: 'Boss challenges',            desc: '15-question world reviews that unlock the next adventure',     bg: '#E8F5E9', border: 'var(--color-border)' },
  { icon: '📊', title: 'Teacher dashboard',          desc: 'Live heatmap, pupil profiles and common mistakes panel',       bg: 'var(--color-world-1-bg)', border: 'var(--color-border)' },
]

/** Responsive container — fills up to 1140px then centres with padding */
const container: React.CSSProperties = {
  maxWidth: 1140,
  margin: '0 auto',
  padding: '0 clamp(16px, 4vw, 48px)',
  width: '100%',
  boxSizing: 'border-box',
}

export default function Home() {
  const navigate = useNavigate()
  const { session, profile, loading } = useAuthStore()

  if (!loading && session && profile) {
    return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/world-map'} replace />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', fontFamily: 'system-ui, -apple-system, sans-serif', width: '100%' }}>

      {/* ── NAV ──────────────────────────────────────────────── */}
      <nav style={{
        background: 'var(--color-brand-primary)',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 48px)',
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky)' as never,
        width: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 26, background: 'rgba(255,255,255,0.2)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 16 14" fill="none" width="16" height="14">
              <rect x="0.5" y="0.5" width="7" height="13" rx="1" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
              <rect x="8.5" y="0.5" width="7" height="13" rx="1" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
              <line x1="8" y1="1" x2="8" y2="13" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
            </svg>
          </div>
          <span style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>WriFe</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button data-testid="nav-login" onClick={() => navigate('/login')}
            style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '7px 18px', cursor: 'pointer', minHeight: 'var(--touch-target)' }}>
            Log in
          </button>
          <button data-testid="nav-signup" onClick={() => navigate('/signup')}
            style={{ color: 'var(--color-brand-primary)', fontSize: 14, fontWeight: 700, background: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', cursor: 'pointer', minHeight: 'var(--touch-target)' }}>
            Sign up free
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(32px, 5vw, 64px) 0 clamp(24px, 3vw, 40px)' }}>
        <div style={container}>
          <div className="home-hero-row">

            {/* Text */}
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-world-1-bg)', color: 'var(--color-brand-primary)', fontSize: 13, fontWeight: 700, padding: '5px 14px', borderRadius: 20, marginBottom: 16 }}>
                <span style={{ width: 7, height: 7, background: 'var(--color-brand-secondary)', borderRadius: '50%', display: 'inline-block' }} />
                61 lessons · ages 7–14
              </div>
              <h1 style={{ fontSize: 'clamp(26px, 4vw, 48px)', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.15, marginBottom: 14, letterSpacing: '-0.5px' }}>
                Writing practice<br />
                that <span style={{ color: 'var(--color-brand-primary)' }}>pupils love</span><br />
                teachers trust
              </h1>
              <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: 'var(--color-text-muted)', lineHeight: 1.65, maxWidth: 420, marginBottom: 28 }}>
                Gamified lessons across 6 skill worlds. XP, badges, streaks and a live teacher dashboard.
              </p>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                Where would you like to start?
              </p>
              <div className="home-cta-grid" style={{ maxWidth: 520 }}>
                <button data-testid="cta-pupil" onClick={() => navigate('/signup')}
                  style={{ background: 'var(--color-brand-secondary)', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', border: 'none', textAlign: 'left', minHeight: 110, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22 }}>🎒</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>For pupils</span>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.25, margin: '8px 0' }}>I'm a pupil —<br />start my adventure</p>
                  <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 6, background: '#fff', color: 'var(--color-brand-secondary)' }}>
                    Play now →
                  </span>
                </button>
                <button data-testid="cta-teacher" onClick={() => navigate('/signup?role=teacher')}
                  style={{ background: 'var(--color-brand-primary)', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', border: 'none', textAlign: 'left', minHeight: 110, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22 }}>📋</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>For teachers</span>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.25, margin: '8px 0' }}>I'm a teacher —<br />set up my class</p>
                  <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 6, background: '#fff', color: 'var(--color-brand-primary)' }}>
                    Get started →
                  </span>
                </button>
              </div>
            </div>

            {/* Mascot */}
            <div className="hero-mascot" style={{ position: 'relative' }}>
              <div style={{ width: 'clamp(140px, 18vw, 220px)', height: 'clamp(140px, 18vw, 220px)', background: 'var(--color-world-1-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img src="/mascots/pencil-waving.png" alt="" role="presentation"
                  style={{ width: '90%', height: '90%', objectFit: 'contain' }} loading="eager" />
              </div>
              <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'var(--color-brand-accent)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: '2px solid var(--color-background)' }}>
                ⭐
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ──────────────────────────────────────── */}
      <div style={{ background: 'var(--color-brand-primary)', padding: '16px clamp(16px, 4vw, 48px)', display: 'flex', justifyContent: 'space-around', width: '100%', boxSizing: 'border-box' }}>
        {[['61', 'lessons'], ['432+', 'activities'], ['75', 'badges'], ['6', 'worlds']].map(([n, l]) => (
          <div key={l} style={{ textAlign: 'center', color: '#fff' }}>
            <p style={{ fontSize: 'clamp(16px, 2.5vw, 22px)', fontWeight: 800 }}>{n}</p>
            <p style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{l}</p>
          </div>
        ))}
      </div>

      {/* ── SIX WORLDS ───────────────────────────────────────── */}
      <section style={{ padding: 'clamp(24px, 4vw, 48px) 0' }}>
        <div style={container}>
          <h2 style={{ fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>Six worlds to explore</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>Beat the boss challenge to unlock each new world</p>
          <div className="home-worlds-grid">
            {WORLDS.map(w => (
              <div key={w.id} style={{ background: w.color, borderRadius: 12, padding: '14px 12px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 22 }}>{w.emoji}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.15)', borderRadius: 20, padding: '2px 8px' }}>W{w.id}</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{w.name}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>{w.lessons} lessons</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section style={{ background: 'var(--color-surface)', padding: 'clamp(24px, 4vw, 48px) 0' }}>
        <div style={container}>
          <h2 style={{ fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>How it works</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>For pupils and teachers</p>
          <div className="home-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: f.bg, borderRadius: 12, padding: 18, border: `1px solid ${f.border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 10 }}>
                  {f.icon}
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 5 }}>{f.title}</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.55 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEACHER STRIP ────────────────────────────────────── */}
      <section style={{ background: 'var(--color-text)', padding: 'clamp(24px, 4vw, 40px) 0' }}>
        <div style={{ ...container, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h2 style={{ fontSize: 'clamp(15px, 2vw, 20px)', fontWeight: 700, color: '#fff', marginBottom: 8 }}>Set up your class in 60 seconds</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
              Create a class, share the invite code with pupils and start tracking progress straight away. No spreadsheets needed.
            </p>
          </div>
          <button data-testid="teacher-strip-cta" onClick={() => navigate('/signup?role=teacher')}
            style={{ background: 'var(--color-brand-secondary)', color: '#fff', border: 'none', borderRadius: 8, padding: '13px 22px', fontSize: 15, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, minHeight: 'var(--touch-target)' }}>
            Create my class →
          </button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{ background: 'var(--color-background)', borderTop: '1px solid var(--color-border)', padding: 'clamp(14px, 2vw, 24px) 0' }}>
        <div style={{ ...container, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>WriFe</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>practice.wrife.co.uk</span>
        </div>
      </footer>

    </div>
  )
}
