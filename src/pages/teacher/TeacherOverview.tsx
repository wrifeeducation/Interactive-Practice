// TICKET-038: Class Overview Table
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import type { PupilSummary } from '../../types'

type SortKey = 'name' | 'lastActive' | 'xpTotal' | 'streak' | 'health'
type SortDir = 'asc' | 'desc'

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks === 1) return '1 week ago'
  if (weeks < 4) return `${weeks} weeks ago`
  const months = Math.floor(days / 30)
  return `${months} month${months > 1 ? 's' : ''} ago`
}

function healthDot(health: 'green' | 'amber' | 'red') {
  const map = { green: '🟢', amber: '🟡', red: '🔴' }
  return map[health]
}

function healthSort(h: 'green' | 'amber' | 'red') {
  return h === 'green' ? 0 : h === 'amber' ? 1 : 2
}

export default function TeacherOverview() {
  const { session } = useAuthStore()
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const { data: pupils = [], isLoading, error } = useQuery<PupilSummary[]>({
    queryKey: ['teacher-overview', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return []

      // Get teacher's class
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', session.user.id)
        .maybeSingle()

      if (!classData) return []

      // Get class members with profiles
      const { data: members } = await supabase
        .from('class_members')
        .select('pupil_id, profiles(id, name)')
        .eq('class_id', classData.id)

      if (!members || members.length === 0) return []

      const pupilIds = members
        .map((m) => (m as unknown as { pupil_id: string }).pupil_id)
        .filter(Boolean)

      // Fetch progress, streaks in parallel
      const [progressRes, streakRes] = await Promise.all([
        supabase
          .from('pupil_progress')
          .select('pupil_id, xp_earned, completed_at')
          .in('pupil_id', pupilIds),
        supabase
          .from('streaks')
          .select('pupil_id, current_streak, last_activity_date')
          .in('pupil_id', pupilIds),
      ])

      const progressRows = progressRes.data ?? []
      const streakRows = streakRes.data ?? []

      type ProgressRow = { pupil_id: string; xp_earned: number; completed_at: string | null }
      type StreakRow = { pupil_id: string; current_streak: number; last_activity_date: string }

      const xpByPupil = new Map<string, number>()
      const completedByPupil = new Map<string, number>()
      const lastActiveByPupil = new Map<string, string | null>()

      for (const p of progressRows as ProgressRow[]) {
        xpByPupil.set(p.pupil_id, (xpByPupil.get(p.pupil_id) ?? 0) + (p.xp_earned ?? 0))
        completedByPupil.set(p.pupil_id, (completedByPupil.get(p.pupil_id) ?? 0) + 1)
        if (p.completed_at) {
          const cur = lastActiveByPupil.get(p.pupil_id)
          if (!cur || p.completed_at > cur) lastActiveByPupil.set(p.pupil_id, p.completed_at)
        }
      }

      const streakByPupil = new Map<string, { streak: number; lastDate: string | null }>()
      for (const s of streakRows as StreakRow[]) {
        streakByPupil.set(s.pupil_id, {
          streak: s.current_streak ?? 0,
          lastDate: s.last_activity_date ?? null,
        })
      }

      return members.map((m): PupilSummary => {
        const raw = m as unknown as { pupil_id: string; profiles: { id: string; name: string; role: string; created_at: string } | null }
        const id = raw.pupil_id
        const streakInfo = streakByPupil.get(id)
        const lastActive = lastActiveByPupil.get(id) ?? streakInfo?.lastDate ?? null
        const streak = streakInfo?.streak ?? 0

        const daysInactive = lastActive
          ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000)
          : 999

        const health: 'green' | 'amber' | 'red' =
          streak >= 3 && daysInactive <= 3 ? 'green' : daysInactive <= 7 ? 'amber' : 'red'

        return {
          profile: {
            id,
            name: raw.profiles?.name ?? 'Unknown',
            role: 'pupil',
            created_at: raw.profiles ? '' : '',
          },
          xpTotal: xpByPupil.get(id) ?? 0,
          currentStreak: streak,
          lastActive,
          health,
          lessonsCompleted: completedByPupil.get(id) ?? 0,
        }
      })
    },
    enabled: !!session?.user,
  })

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...pupils].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'name') cmp = a.profile.name.localeCompare(b.profile.name)
    else if (sortKey === 'xpTotal') cmp = a.xpTotal - b.xpTotal
    else if (sortKey === 'streak') cmp = a.currentStreak - b.currentStreak
    else if (sortKey === 'health') cmp = healthSort(a.health) - healthSort(b.health)
    else if (sortKey === 'lastActive') {
      const da = a.lastActive ? new Date(a.lastActive).getTime() : 0
      const db = b.lastActive ? new Date(b.lastActive).getTime() : 0
      cmp = da - db
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 600,
    color: sortKey === key ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    borderBottom: '2px solid var(--color-border)',
  })

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <h2 style={titleStyle}>Class Overview</h2>
        {[1, 2, 3, 4].map((i) => (
          <LoadingSkeleton key={i} height={48} style={{ marginBottom: 8 }} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <h2 style={titleStyle}>Class Overview</h2>
        <p style={{ color: 'var(--color-incorrect)' }}>Failed to load class data.</p>
      </div>
    )
  }

  if (pupils.length === 0) {
    return (
      <div style={containerStyle}>
        <h2 style={titleStyle}>Class Overview</h2>
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>👨‍🏫</div>
          <p data-tts="no pupils message" style={{ fontSize: '16px' }}>
            No pupils in your class yet — share your invite code
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Class Overview</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
          <thead>
            <tr>
              {([
                ['name', 'Name'],
                ['lastActive', 'Last Active'],
                ['xpTotal', 'XP Total'],
                ['streak', 'Streak 🔥'],
                ['health', 'Health'],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th
                  key={key}
                  data-testid={`sort-btn-${key}`}
                  style={thStyle(key)}
                  onClick={() => handleSort(key)}
                  scope="col"
                >
                  {label} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
              <th style={{ ...thStyle('name'), cursor: 'default' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((pupil) => (
              <tr
                key={pupil.profile.id}
                data-testid={`pupil-row-${pupil.profile.id}`}
                onClick={() => navigate(`/teacher/pupil/${pupil.profile.id}`)}
                style={{
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--color-border)',
                  transition: 'background 150ms',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-background)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
              >
                <td style={tdStyle} data-tts={`pupil name: ${pupil.profile.name}`}>
                  <strong>{pupil.profile.name}</strong>
                </td>
                <td style={tdStyle} data-tts={`last active: ${pupil.lastActive ?? 'never'}`}>
                  {timeAgo(pupil.lastActive)}
                </td>
                <td style={tdStyle} data-tts={`XP: ${pupil.xpTotal}`}>
                  <span style={{ color: 'var(--color-brand-primary)', fontWeight: 600 }}>
                    {pupil.xpTotal.toLocaleString()}
                  </span>
                </td>
                <td style={tdStyle} data-tts={`streak: ${pupil.currentStreak} days`}>
                  {pupil.currentStreak}
                </td>
                <td style={tdStyle}>
                  <span title={`Health: ${pupil.health}`}>{healthDot(pupil.health)}</span>
                </td>
                <td style={tdStyle}>
                  <button
                    data-testid={`view-pupil-${pupil.profile.id}`}
                    onClick={(e) => { e.stopPropagation(); navigate(`/teacher/pupil/${pupil.profile.id}`) }}
                    style={{
                      padding: '4px 12px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--color-brand-primary)',
                      background: 'transparent',
                      border: '1px solid var(--color-brand-primary)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      minHeight: '32px',
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  padding: '24px',
  maxWidth: '900px',
}

const titleStyle: React.CSSProperties = {
  margin: '0 0 20px',
  fontSize: '22px',
  fontWeight: 600,
  color: 'var(--color-text)',
}

const tdStyle: React.CSSProperties = {
  padding: '12px',
  fontSize: '14px',
  color: 'var(--color-text)',
  verticalAlign: 'middle',
}
