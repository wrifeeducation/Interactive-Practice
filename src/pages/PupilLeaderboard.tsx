// TICKET-043: Pupil Leaderboard View
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { WrifeMascot } from '../components/ui/WrifeMascot'

interface LeaderboardEntry {
  pupilId: string
  name: string
  xpTotal: number
  currentStreak: number
  rank: number
}

interface RawProgress {
  pupil_id: string
  xp_earned: number
}

interface RawStreak {
  pupil_id: string
  current_streak: number
}

interface RawMember {
  pupil_id: string
  profiles: { id: string; name: string } | null
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function PupilLeaderboard() {
  const { session } = useAuthStore()

  const { data, isLoading, error } = useQuery<{
    enabled: boolean
    entries: LeaderboardEntry[]
    myPupilId: string
  } | null>({
    queryKey: ['pupil-leaderboard', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return null

      // Get class membership
      const { data: memberData } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('pupil_id', session.user.id)
        .maybeSingle()

      if (!memberData) return { enabled: false, entries: [], myPupilId: session.user.id }

      const classId = (memberData as { class_id: string }).class_id

      // Get class leaderboard setting
      const { data: classData } = await supabase
        .from('classes')
        .select('leaderboard_enabled')
        .eq('id', classId)
        .maybeSingle()

      const enabled = (classData as { leaderboard_enabled: boolean } | null)?.leaderboard_enabled ?? false

      if (!enabled) return { enabled: false, entries: [], myPupilId: session.user.id }

      // Get all class members
      const { data: members } = await supabase
        .from('class_members')
        .select('pupil_id, profiles(id, name)')
        .eq('class_id', classId)

      const allMembers = (members ?? []) as unknown as RawMember[]
      const pupilIds = allMembers.map((m) => m.pupil_id).filter(Boolean)

      if (pupilIds.length === 0) return { enabled: true, entries: [], myPupilId: session.user.id }

      // Fetch XP and streaks
      const [progressRes, streakRes] = await Promise.all([
        supabase
          .from('pupil_progress')
          .select('pupil_id, xp_earned')
          .in('pupil_id', pupilIds),
        supabase
          .from('streaks')
          .select('pupil_id, current_streak')
          .in('pupil_id', pupilIds),
      ])

      const progressRows = (progressRes.data ?? []) as RawProgress[]
      const streakRows = (streakRes.data ?? []) as RawStreak[]

      const xpMap = new Map<string, number>()
      for (const p of progressRows) {
        xpMap.set(p.pupil_id, (xpMap.get(p.pupil_id) ?? 0) + (p.xp_earned ?? 0))
      }

      const streakMap = new Map<string, number>()
      for (const s of streakRows) {
        streakMap.set(s.pupil_id, s.current_streak ?? 0)
      }

      const unsorted: Omit<LeaderboardEntry, 'rank'>[] = allMembers.map((m) => ({
        pupilId: m.pupil_id,
        name: m.profiles?.name ?? 'Unknown',
        xpTotal: xpMap.get(m.pupil_id) ?? 0,
        currentStreak: streakMap.get(m.pupil_id) ?? 0,
      }))

      const sorted = unsorted
        .sort((a, b) => b.xpTotal - a.xpTotal)
        .map((entry, idx) => ({ ...entry, rank: idx + 1 }))

      return { enabled: true, entries: sorted, myPupilId: session.user.id }
    },
    enabled: !!session?.user,
  })

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <h1 style={titleStyle}>Class Leaderboard 🏆</h1>
        {[1, 2, 3].map((i) => <LoadingSkeleton key={i} height={48} style={{ marginBottom: 8 }} />)}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={containerStyle}>
        <h1 style={titleStyle}>Class Leaderboard 🏆</h1>
        <p style={{ color: 'var(--color-incorrect)' }}>Failed to load leaderboard.</p>
      </div>
    )
  }

  if (!data.enabled) {
    return (
      <div style={{ ...containerStyle, textAlign: 'center', paddingTop: '40px' }}>
        <WrifeMascot pose="waving" size="md" decorative style={{ marginBottom: '16px' }} />
        <h1 style={titleStyle}>Class Leaderboard</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '16px', marginBottom: '24px' }} data-tts="leaderboard disabled message">
          Your teacher hasn&apos;t turned on the leaderboard yet
        </p>
        <Link
          to="/world-map"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text-on-dark)',
            background: 'var(--color-brand-primary)',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            minHeight: '44px',
          }}
          data-testid="leaderboard-disabled-back"
        >
          Back to World Map
        </Link>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link
          to="/world-map"
          style={{ fontSize: '14px', color: 'var(--color-brand-primary)', textDecoration: 'none', fontWeight: 500 }}
        >
          ← World Map
        </Link>
        <h1 style={{ ...titleStyle, margin: 0 }}>Class Leaderboard 🏆</h1>
      </div>

      <div
        data-testid="leaderboard-table"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '48px 1fr 100px 80px',
            padding: '10px 16px',
            borderBottom: '2px solid var(--color-border)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
          }}
        >
          <span>Rank</span>
          <span>Name</span>
          <span style={{ textAlign: 'right' }}>XP</span>
          <span style={{ textAlign: 'right' }}>Streak 🔥</span>
        </div>

        {data.entries.map((entry) => {
          const isMe = entry.pupilId === data.myPupilId
          const nameParts = entry.name.trim().split(' ')
          const displayName =
            nameParts.length >= 2
              ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
              : entry.name

          return (
            <div
              key={entry.pupilId}
              data-testid={`leaderboard-row-${entry.rank}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr 100px 80px',
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-border)',
                background: isMe ? 'var(--color-brand-accent)' : undefined,
                alignItems: 'center',
              }}
            >
              <span
                style={{ fontWeight: 700, fontSize: '18px' }}
                data-tts={`rank ${entry.rank}`}
              >
                {MEDALS[entry.rank] ?? `#${entry.rank}`}
              </span>
              <span
                style={{ fontWeight: isMe ? 700 : 400, color: 'var(--color-text)', fontSize: '15px' }}
                data-tts={`pupil: ${entry.name}`}
              >
                {displayName}
                {isMe && (
                  <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    (you)
                  </span>
                )}
              </span>
              <span
                style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-brand-primary)', fontSize: '15px' }}
                data-tts={`XP: ${entry.xpTotal}`}
              >
                {entry.xpTotal.toLocaleString()}
              </span>
              <span
                style={{ textAlign: 'right', color: 'var(--color-streak)', fontWeight: 600, fontSize: '15px' }}
                data-tts={`streak: ${entry.currentStreak} days`}
              >
                {entry.currentStreak}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--color-background)',
  padding: '24px 16px',
  maxWidth: '640px',
  margin: '0 auto',
}

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: 'var(--color-text)',
  margin: '0 0 24px',
}
