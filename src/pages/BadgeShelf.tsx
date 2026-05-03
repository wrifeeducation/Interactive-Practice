// TICKET-029: Pupil Badge Shelf
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { Badge, BadgeCategory, EarnedBadge } from '../types'

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  lesson: 'Lesson Badges',
  world: 'World Badges',
  streak: 'Streak Badges',
  mastery: 'Mastery Badges',
  speed: 'Speed Badges',
}

const CATEGORY_ORDER: BadgeCategory[] = ['lesson', 'world', 'streak', 'mastery', 'speed']

function BadgeTile({ badge, earned, earnedAt }: { badge: Badge; earned: boolean; earnedAt?: string }) {
  return (
    <div
      data-testid={`badge-tile-${badge.code}`}
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 8px',
        textAlign: 'center',
        opacity: earned ? 1 : 0.25,
        boxShadow: 'var(--shadow-sm)',
        border: `1px solid ${earned ? 'var(--color-border)' : 'transparent'}`,
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '4px' }} aria-hidden="true">
        {earned ? badge.image_emoji : '❓'}
      </div>
      <p
        style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', wordBreak: 'break-word', lineHeight: 1.2 }}
        data-tts={earned ? badge.name : 'unknown badge'}
      >
        {earned ? badge.name : '???'}
      </p>
      {earned && earnedAt && (
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>
          {new Date(earnedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}

export default function BadgeShelf() {
  const { session } = useAuthStore()

  const { data: allBadges = [] } = useQuery<Badge[]>({
    queryKey: ['badges-all'],
    queryFn: async () => {
      const { data } = await supabase.from('practice_badges').select('*').order('category').order('code')
      return (data ?? []) as Badge[]
    },
  })

  const { data: earnedRows = [] } = useQuery<EarnedBadge[]>({
    queryKey: ['pupil-badges', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return []
      const { data } = await supabase
        .from('practice_pupil_badges')
        .select('earned_at, practice_badges(*)')
        .eq('pupil_id', session.user.id)
      if (!data) return []
      return (data as unknown as Array<{ earned_at: string; practice_badges: Badge | Badge[] | null }>)
        .filter((row) => row.practice_badges)
        .map((row) => {
          const badge = Array.isArray(row.practice_badges) ? row.practice_badges[0] : row.practice_badges
          if (!badge) return null
          return { ...badge, earned_at: row.earned_at }
        })
        .filter((b): b is EarnedBadge => b !== null)
    },
    enabled: !!session?.user,
  })

  const earnedMap = new Map<string, string>() // badgeId → earned_at
  for (const eb of earnedRows) earnedMap.set(eb.id, eb.earned_at)

  const grouped = CATEGORY_ORDER.reduce<Record<BadgeCategory, Badge[]>>(
    (acc, cat) => {
      acc[cat] = allBadges.filter((b) => b.category === cat)
      return acc
    },
    { lesson: [], world: [], streak: [], mastery: [], speed: [] },
  )

  const total = allBadges.length
  const earned = earnedRows.length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '16px', position: 'sticky', top: 0, zIndex: 10, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/world-map" data-testid="badges-back" style={{ fontSize: '22px', textDecoration: 'none', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
            ←
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-text)' }} data-tts="your badges">
              Your Badges
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)' }} data-tts={`${earned} of ${total} badges earned`}>
              {earned} / {total} earned
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
        {CATEGORY_ORDER.map((cat) => {
          const badges = grouped[cat]
          if (!badges.length) return null
          return (
            <section key={cat} style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 12px' }}>
                {CATEGORY_LABELS[cat]}
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                }}
              >
                {badges.map((badge) => (
                  <BadgeTile
                    key={badge.id}
                    badge={badge}
                    earned={earnedMap.has(badge.id)}
                    earnedAt={earnedMap.get(badge.id)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
