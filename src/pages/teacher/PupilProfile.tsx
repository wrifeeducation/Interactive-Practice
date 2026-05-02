// TICKET-040: Pupil Profile Page
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import CommonMistakes from '../../components/teacher/CommonMistakes'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import type { PupilProgress, Profile, EarnedBadge } from '../../types'

const WORLD_COLORS: Record<number, string> = {
  1: 'var(--color-world-1)',
  2: 'var(--color-world-2)',
  3: 'var(--color-world-3)',
  4: 'var(--color-world-4)',
  5: 'var(--color-world-5)',
  6: 'var(--color-world-6)',
}

const WORLD_LESSON_RANGES: Record<number, [number, number]> = {
  1: [1, 9],
  2: [10, 19],
  3: [20, 31],
  4: [32, 45],
  5: [46, 51],
  6: [52, 61],
}

function starStr(n: number): string {
  return '★'.repeat(n) + '☆'.repeat(3 - n)
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return `${Math.floor(days / 7)} week(s) ago`
}

interface LessonMeta { id: string; lesson_number: number; title: string; world_id: number }

export default function PupilProfile() {
  const { pupilId } = useParams<{ pupilId: string }>()

  const { data: profile, isLoading: loadingProfile } = useQuery<Profile | null>({
    queryKey: ['pupil-profile', pupilId],
    queryFn: async () => {
      if (!pupilId) return null
      const { data } = await supabase.from('profiles').select('*').eq('id', pupilId).maybeSingle()
      return data as Profile | null
    },
    enabled: !!pupilId,
  })

  const { data: progress = [], isLoading: loadingProgress } = useQuery<PupilProgress[]>({
    queryKey: ['pupil-progress', pupilId],
    queryFn: async () => {
      if (!pupilId) return []
      const { data } = await supabase.from('pupil_progress').select('*').eq('pupil_id', pupilId)
      return (data ?? []) as PupilProgress[]
    },
    enabled: !!pupilId,
  })

  const { data: lessons = [] } = useQuery<LessonMeta[]>({
    queryKey: ['lessons-meta'],
    queryFn: async () => {
      const { data } = await supabase.from('practice_lessons').select('id, lesson_number, title, world_id').order('lesson_number')
      return (data ?? []) as LessonMeta[]
    },
  })

  const { data: badges = [], isLoading: loadingBadges } = useQuery<EarnedBadge[]>({
    queryKey: ['pupil-badges', pupilId],
    queryFn: async () => {
      if (!pupilId) return []
      const { data } = await supabase
        .from('pupil_badges')
        .select('earned_at, badges(*)')
        .eq('pupil_id', pupilId)
      if (!data) return []
      return data.map((row: unknown) => {
        const r = row as { earned_at: string; badges: Record<string, unknown> }
        return { ...r.badges, earned_at: r.earned_at } as EarnedBadge
      })
    },
    enabled: !!pupilId,
  })

  const isLoading = loadingProfile || loadingProgress || loadingBadges

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <LoadingSkeleton height={80} variant="card" style={{ marginBottom: 16 }} />
        <LoadingSkeleton height={200} variant="card" style={{ marginBottom: 16 }} />
        <LoadingSkeleton height={200} variant="card" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={containerStyle}>
        <p style={{ color: 'var(--color-incorrect)' }}>Pupil not found.</p>
      </div>
    )
  }

  const xpTotal = progress.reduce((s, p) => s + (p.xp_earned ?? 0), 0)
  const lessonsCompleted = progress.filter((p) => (p.bronze_stars ?? 0) >= 1).length
  const progressById = new Map(progress.map((p) => [p.lesson_id, p]))

  // Last active
  const lastActiveDates = progress.filter((p) => p.completed_at).map((p) => p.completed_at as string)
  const lastActive = lastActiveDates.length > 0 ? lastActiveDates.sort().at(-1) ?? null : null

  const nameParts = (profile.display_name ?? '').trim().split(' ')
  const initial = nameParts[0]?.[0]?.toUpperCase() ?? '?'

  return (
    <div
      data-testid={`pupil-profile-${pupilId}`}
      style={containerStyle}
    >
      {/* Breadcrumb */}
      <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
        <Link to="/teacher/overview" style={{ color: 'var(--color-brand-primary)', textDecoration: 'none', fontWeight: 500 }}>
          ← Back to Overview
        </Link>
        {' '}/ {profile.display_name ?? 'Unknown'}
      </div>

      {/* Summary bar */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--color-brand-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--color-text-on-dark)',
            flexShrink: 0,
          }}
          aria-label={`Avatar for ${profile.display_name ?? 'pupil'}`}
        >
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: '0 0 2px', fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }} data-tts={`pupil name: ${profile.display_name ?? 'Unknown'}`}>
            {profile.display_name ?? 'Unknown'}
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Last active: {timeAgo(lastActive)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {[
            { label: 'XP Total', value: xpTotal.toLocaleString(), icon: '⭐' },
            { label: 'Lessons', value: String(lessonsCompleted), icon: '📚' },
            { label: 'Badges', value: String(badges.length), icon: '🏅' },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{ textAlign: 'center', minWidth: '64px' }}>
              <div style={{ fontSize: '22px' }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text)' }} data-tts={`${label}: ${value}`}>{value}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress grid by world */}
      <div style={{ ...cardStyle, marginBottom: '16px' }}>
        <h3 style={subHeadingStyle}>Lesson Progress</h3>
        {Object.entries(WORLD_LESSON_RANGES).map(([worldIdStr, [start, end]]) => {
          const worldId = Number(worldIdStr)
          const worldLessons = lessons.filter((l) => l.world_id === worldId)
          if (worldLessons.length === 0) return null
          const color = WORLD_COLORS[worldId] ?? 'var(--color-brand-primary)'
          void start; void end

          return (
            <div key={worldId} style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--color-text-on-dark)',
                  background: color,
                  padding: '3px 10px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  marginBottom: '8px',
                }}
              >
                World {worldId}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {worldLessons.map((lesson) => {
                  const prog = progressById.get(lesson.id)
                  const bs = prog?.bronze_stars ?? 0
                  const ss = prog?.silver_stars ?? 0
                  const gs = prog?.gold_stars ?? 0
                  const best = gs >= 1 ? gs : ss >= 1 ? ss : bs

                  return (
                    <div
                      key={lesson.id}
                      title={`L${lesson.lesson_number}: ${lesson.title}\nBronze: ${starStr(bs)}\nSilver: ${starStr(ss)}\nGold: ${starStr(gs)}`}
                      style={{
                        width: '44px',
                        padding: '4px 2px',
                        background: best > 0 ? 'var(--color-background)' : 'var(--color-border)',
                        border: `1px solid ${color}`,
                        borderRadius: '6px',
                        textAlign: 'center',
                        fontSize: '10px',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>L{lesson.lesson_number}</div>
                      <div style={{ color: best > 0 ? 'var(--color-gold)' : 'var(--color-border)', fontSize: '11px' }}>
                        {'★'.repeat(best)}{'☆'.repeat(3 - best)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Common Mistakes */}
      {pupilId && <CommonMistakes pupilId={pupilId} />}
    </div>
  )
}

const containerStyle: React.CSSProperties = { padding: '24px', maxWidth: '800px' }
const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '20px',
}
const subHeadingStyle: React.CSSProperties = {
  margin: '0 0 14px',
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--color-text)',
}
