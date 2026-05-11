/**
 * WelcomePage — the celebratory screen pupils land on after logging in to
 * WriFe Interactive Practice.
 *
 * Shows:
 *   • Animated mascot (celebrating or waving depending on streak)
 *   • Personalised greeting with the pupil's display name
 *   • Streak, XP, total stars, badge count at a glance
 *   • XP progress bar toward the next level (every 500 XP = 1 level)
 *   • Up to 6 most recently earned badges
 *   • "Play!" CTA → /world-map
 *   • "My Badges" shortcut → /pupil/badges
 *
 * Route: /welcome (pupils only — see App.tsx)
 */

import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { WrifeMascot } from '../components/ui/WrifeMascot'
import type { Badge } from '../types'

// ── constants ─────────────────────────────────────────────────────────────────

const XP_PER_LEVEL = 500

const GREETINGS = [
  'Great to see you',
  'Welcome back',
  'Ready to play',
  'Hello',
  "You're on a roll",
]

// Decorative star/sparkle positions
const SPARKLES = [
  { x: '6%',  y: '10%', size: 20, delay: 0    },
  { x: '90%', y: '7%',  size: 24, delay: 0.3  },
  { x: '3%',  y: '65%', size: 15, delay: 0.6  },
  { x: '94%', y: '58%', size: 18, delay: 0.9  },
  { x: '48%', y: '4%',  size: 16, delay: 1.2  },
  { x: '18%', y: '86%', size: 13, delay: 0.4  },
  { x: '78%', y: '83%', size: 20, delay: 0.7  },
]

// ── sub-components ────────────────────────────────────────────────────────────

interface StatPillProps {
  emoji: string
  value: string | number
  label: string
  colour: string
  delay?: number
}

function StatPill({ emoji, value, label, colour, delay = 0 }: StatPillProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'backOut' }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        background: 'var(--color-surface)',
        borderRadius: 16,
        padding: '14px 18px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: `2px solid ${colour}33`,
        minWidth: 76,
      }}
    >
      <span style={{ fontSize: 26 }}>{emoji}</span>
      <span style={{ fontSize: 20, fontWeight: 800, color: colour, lineHeight: 1 }}>{value}</span>
      <span style={{
        fontSize: 11, fontWeight: 600,
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {label}
      </span>
    </motion.div>
  )
}

interface XPBarProps {
  totalXp: number
}

function XPBar({ totalXp }: XPBarProps) {
  const level         = Math.floor(totalXp / XP_PER_LEVEL) + 1
  const xpIntoLevel   = totalXp % XP_PER_LEVEL
  const pct           = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.4 }}
      style={{ width: '100%' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
          ⭐ Level {level} progress
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>
          {xpIntoLevel} / {XP_PER_LEVEL} XP
        </span>
      </div>
      <div style={{ height: 14, background: 'var(--color-border)', borderRadius: 999, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.8, duration: 0.9, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, var(--color-brand-primary), var(--color-brand-secondary))',
            borderRadius: 999,
          }}
        />
      </div>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6, textAlign: 'right' }}>
        {XP_PER_LEVEL - xpIntoLevel} XP to Level {level + 1}
      </p>
    </motion.div>
  )
}

interface BadgeTileProps {
  badge: Badge
  delay?: number
}

function BadgeTile({ badge, delay = 0 }: BadgeTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.35, ease: 'backOut' }}
      title={badge.name}
      data-testid={`badge-tile-${badge.code}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)',
        border: '2px solid #FDE68A',
        borderRadius: 14,
        padding: '10px 12px',
        minWidth: 68,
      }}
    >
      <span style={{ fontSize: 28 }}>{badge.image_emoji}</span>
      <span style={{
        fontSize: 10, fontWeight: 700,
        color: '#92400E', textAlign: 'center', lineHeight: 1.2,
      }}>
        {badge.name}
      </span>
    </motion.div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function WelcomePage() {
  const navigate = useNavigate()
  const { session, profile } = useAuthStore()
  const pupilId = session?.user?.id
  // display_name is teacher-set; first_name is set by wrife.co.uk pupil login
  const displayName = profile?.display_name ?? profile?.first_name ?? 'Adventurer'

  const greeting = useRef(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]).current

  // ── XP total ────────────────────────────────────────────────────────────────
  const { data: xpData } = useQuery<number>({
    queryKey: ['welcome-xp', pupilId],
    queryFn: async () => {
      if (!pupilId) return 0
      const { data } = await supabase
        .from('pupil_progress')
        .select('xp_earned')
        .eq('pupil_id', pupilId)
      return ((data as { xp_earned: number }[]) ?? []).reduce((s, r) => s + (r.xp_earned ?? 0), 0)
    },
    enabled: !!pupilId,
    staleTime: 1000 * 30,
  })

  // ── Streak ─────────────────────────────────────────────────────────────────
  const { data: streakRow } = useQuery<{ current_streak: number } | null>({
    queryKey: ['welcome-streak', pupilId],
    queryFn: async () => {
      if (!pupilId) return null
      const { data } = await supabase
        .from('streaks')
        .select('current_streak')
        .eq('pupil_id', pupilId)
        .maybeSingle()
      return (data as { current_streak: number } | null) ?? null
    },
    enabled: !!pupilId,
    staleTime: 1000 * 30,
  })

  // ── Total stars ──────────────────────────────────────────────────────────────
  const { data: starsData } = useQuery<number>({
    queryKey: ['welcome-stars', pupilId],
    queryFn: async () => {
      if (!pupilId) return 0
      const { data } = await supabase
        .from('pupil_progress')
        .select('bronze_stars, silver_stars, gold_stars')
        .eq('pupil_id', pupilId)
      return ((data as { bronze_stars: number; silver_stars: number; gold_stars: number }[]) ?? [])
        .reduce((s, r) => s + (r.bronze_stars ?? 0) + (r.silver_stars ?? 0) + (r.gold_stars ?? 0), 0)
    },
    enabled: !!pupilId,
    staleTime: 1000 * 60,
  })

  // ── Recent badges ──────────────────────────────────────────────────────────
  const { data: recentBadges } = useQuery<Badge[]>({
    queryKey: ['welcome-badges', pupilId],
    queryFn: async () => {
      if (!pupilId) return []
      const { data } = await supabase
        .from('practice_pupil_badges')
        .select('earned_at, practice_badges(*)')
        .eq('pupil_id', pupilId)
        .order('earned_at', { ascending: false })
        .limit(6)
      return ((data as unknown as Array<{
        earned_at: string
        practice_badges: Badge | Badge[] | null
      }>) ?? [])
        .filter((r) => r.practice_badges)
        .map((r) => {
          const b = Array.isArray(r.practice_badges) ? r.practice_badges[0] : r.practice_badges
          return b as Badge
        })
        .filter(Boolean)
    },
    enabled: !!pupilId,
    staleTime: 1000 * 60 * 2,
  })

  const totalXp  = xpData ?? 0
  const streak   = streakRow?.current_streak ?? 0
  const stars    = starsData ?? 0
  const badges   = recentBadges ?? []

  return (
    <div
      data-testid="welcome-page"
      style={{
        minHeight: '100vh',
        background: 'var(--color-background)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Decorative floating sparkles ── */}
      {SPARKLES.map((s, i) => (
        <motion.div
          key={i}
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 0.65, 0], scale: [0, 1, 0], y: [0, -22, 0] }}
          transition={{ delay: s.delay, duration: 3.5, repeat: Infinity, repeatDelay: 2.5 }}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            fontSize: s.size,
            color: 'var(--color-brand-secondary)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          ✦
        </motion.div>
      ))}

      {/* ── Page content ── */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

        {/* ── Mascot + greeting ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'backOut' }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
        >
          {/* Glow halo */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <motion.div
              animate={{ opacity: [0.2, 0.45, 0.2], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: 180,
                height: 180,
                borderRadius: '50%',
                background: 'radial-gradient(circle, var(--color-brand-primary), transparent 70%)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            />
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'relative', zIndex: 1 }}
            >
              <WrifeMascot
                pose={streak >= 3 ? 'celebrating' : 'waving'}
                size="xl"
                decorative
              />
            </motion.div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              style={{ fontSize: 15, color: 'var(--color-text-muted)', fontWeight: 600, margin: 0 }}
              data-tts={greeting}
            >
              {greeting},
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              style={{
                fontSize: 34,
                fontWeight: 900,
                color: 'var(--color-text)',
                margin: '2px 0 0',
                lineHeight: 1.1,
              }}
              data-tts={displayName}
            >
              {displayName}! 👋
            </motion.h1>
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
          <StatPill emoji="🔥" value={streak > 0 ? `${streak}d` : '–'}  label="Streak"  colour="var(--color-streak)"  delay={0.40} />
          <StatPill emoji="⭐" value={totalXp.toLocaleString()}          label="XP"      colour="var(--color-xp)"      delay={0.48} />
          <StatPill emoji="★"  value={stars}                             label="Stars"   colour="var(--color-gold)"    delay={0.56} />
          <StatPill emoji="🏅" value={badges.length}                     label="Badges"  colour="var(--color-brand-secondary)" delay={0.64} />
        </div>

        {/* ── XP progress bar ── */}
        <div style={{
          width: '100%',
          background: 'var(--color-surface)',
          borderRadius: 18,
          padding: '18px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        }}>
          <XPBar totalXp={totalXp} />
        </div>

        {/* ── Recent badges ── */}
        {badges.length > 0 && (
          <div style={{ width: '100%' }}>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: '0 0 12px',
              }}
              data-tts="Recent badges"
            >
              🏅 Recent Badges
            </motion.h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {badges.map((b, i) => (
                <BadgeTile key={b.id} badge={b} delay={0.75 + i * 0.08} />
              ))}
            </div>
          </div>
        )}

        {/* ── No badges yet ── */}
        {badges.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            style={{
              width: '100%',
              background: 'var(--color-surface)',
              borderRadius: 18,
              padding: '20px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏅</div>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-text)', fontSize: 15 }}>
              Earn your first badge!
            </p>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
              Complete a lesson to unlock your first badge.
            </p>
          </motion.div>
        )}

        {/* ── Streak celebration banner ── */}
        {streak >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 20 }}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #FFF5F5, #FFE4E4)',
              border: '2px solid #FCA5A5',
              borderRadius: 18,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <span style={{ fontSize: 44 }}>🔥</span>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: '#DC2626' }}>
                {streak}-day streak!
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#7F1D1D' }}>
                {streak >= 7
                  ? "You're unstoppable — keep it going!"
                  : "Great work — don't break the chain!"}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── CTAs ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', paddingTop: 8 }}>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.4, ease: 'backOut' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/world-map')}
            data-testid="go-to-world-map-btn"
            data-tts="Let's play!"
            style={{
              width: '100%',
              padding: '18px',
              fontSize: 20,
              fontWeight: 900,
              background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
              color: '#fff',
              border: 'none',
              borderRadius: 18,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(108, 92, 231, 0.4)',
              letterSpacing: '0.01em',
              minHeight: 58,
            }}
          >
            🌍 Let's Play!
          </motion.button>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.15 }}
            onClick={() => navigate('/pupil/badges')}
            data-testid="my-badges-btn"
            data-tts="My badges"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: 15,
              fontWeight: 700,
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '2px solid var(--color-border)',
              borderRadius: 18,
              cursor: 'pointer',
              minHeight: 48,
            }}
          >
            🏅 My Badges
          </motion.button>
        </div>

      </div>
    </div>
  )
}
