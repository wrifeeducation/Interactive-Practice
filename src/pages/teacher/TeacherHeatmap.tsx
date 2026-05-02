// TICKET-039: Lesson Heatmap
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import type { HeatmapCell } from '../../types'

const LESSON_COUNT = 61

type CellTier = 'none' | 'bronze' | 'silver' | 'gold'

interface PupilRow {
  id: string
  name: string
  cells: Map<number, CellTier>
}

interface RawProgress {
  pupil_id: string
  lesson_id: string
  bronze_stars: number
  silver_stars: number
  gold_stars: number
}

interface RawLesson {
  id: string
  lesson_number: number
  title: string
}

interface RawMember {
  pupil_id: string
  profiles: { id: string; name: string } | null
}

function cellColor(tier: CellTier): string {
  if (tier === 'gold') return 'var(--color-gold)'
  if (tier === 'silver') return 'var(--color-silver)'
  if (tier === 'bronze') return 'var(--color-bronze)'
  return 'var(--color-border)'
}

function tierFromProgress(row: RawProgress): CellTier {
  if ((row.gold_stars ?? 0) >= 1) return 'gold'
  if ((row.silver_stars ?? 0) >= 1) return 'silver'
  if ((row.bronze_stars ?? 0) >= 1) return 'bronze'
  return 'none'
}

export default function TeacherHeatmap() {
  const { session } = useAuthStore()

  const { data, isLoading, error } = useQuery<{ pupils: PupilRow[]; lessons: RawLesson[] }>({
    queryKey: ['teacher-heatmap', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return { pupils: [], lessons: [] }

      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', session.user.id)
        .maybeSingle()

      if (!classData) return { pupils: [], lessons: [] }

      const [membersRes, lessonsRes] = await Promise.all([
        supabase
          .from('class_members')
          .select('pupil_id, profiles(id, name)')
          .eq('class_id', classData.id),
        supabase
          .from('practice_lessons')
          .select('id, lesson_number, title')
          .order('lesson_number'),
      ])

      const members = (membersRes.data ?? []) as unknown as RawMember[]
      const lessons = (lessonsRes.data ?? []) as RawLesson[]

      const pupilIds = members.map((m) => m.pupil_id).filter(Boolean)
      if (pupilIds.length === 0) return { pupils: [], lessons }

      const { data: progressData } = await supabase
        .from('pupil_progress')
        .select('pupil_id, lesson_id, bronze_stars, silver_stars, gold_stars')
        .in('pupil_id', pupilIds)

      const progressRows = (progressData ?? []) as RawProgress[]
      const lessonById = new Map(lessons.map((l) => [l.id, l]))

      const progressByPupil = new Map<string, Map<number, CellTier>>()
      for (const p of progressRows) {
        const lesson = lessonById.get(p.lesson_id)
        if (!lesson) continue
        if (!progressByPupil.has(p.pupil_id)) {
          progressByPupil.set(p.pupil_id, new Map())
        }
        progressByPupil.get(p.pupil_id)!.set(lesson.lesson_number, tierFromProgress(p))
      }

      const pupils: PupilRow[] = members.map((m) => ({
        id: m.pupil_id,
        name: m.profiles?.name ?? 'Unknown',
        cells: progressByPupil.get(m.pupil_id) ?? new Map(),
      }))

      return { pupils, lessons }
    },
    enabled: !!session?.user,
  })

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <h2 style={titleStyle}>Lesson Heatmap</h2>
        <LoadingSkeleton height={200} variant="card" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={containerStyle}>
        <h2 style={titleStyle}>Lesson Heatmap</h2>
        <p style={{ color: 'var(--color-incorrect)' }}>Failed to load heatmap data.</p>
      </div>
    )
  }

  const { pupils, lessons } = data

  if (pupils.length === 0) {
    return (
      <div style={containerStyle}>
        <h2 style={titleStyle}>Lesson Heatmap</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>No pupils in your class yet.</p>
      </div>
    )
  }

  const lessonNums = Array.from({ length: LESSON_COUNT }, (_, i) => i + 1)
  const lessonTitles = new Map(lessons.map((l) => [l.lesson_number, l.title]))

  // Build heatmap cells for export (unused but type-checked)
  const _cells: HeatmapCell[] = pupils.flatMap((p) =>
    lessonNums.map((n) => ({
      pupilId: p.id,
      lessonNumber: n,
      tier: p.cells.get(n) ?? 'none',
    }))
  )
  void _cells

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Lesson Heatmap</h2>

      {/* Scrollable heatmap */}
      <div
        data-testid="heatmap-grid"
        style={{
          overflowX: 'auto',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={stickyNameHeaderStyle}>Pupil</th>
              {lessonNums.map((n) => (
                <th
                  key={n}
                  style={{
                    width: 28,
                    minWidth: 28,
                    padding: '4px 2px',
                    fontSize: '10px',
                    color: 'var(--color-text-muted)',
                    fontWeight: 500,
                    textAlign: 'center',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  L{n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pupils.map((pupil, rowIdx) => {
              const nameParts = pupil.name.trim().split(' ')
              const displayName =
                nameParts.length >= 2
                  ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
                  : pupil.name

              return (
                <tr
                  key={pupil.id}
                  style={{ background: rowIdx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-background)' }}
                >
                  <td style={stickyNameCellStyle} title={pupil.name}>
                    {displayName}
                  </td>
                  {lessonNums.map((n) => {
                    const tier = pupil.cells.get(n) ?? 'none'
                    const lessonTitle = lessonTitles.get(n) ?? `Lesson ${n}`
                    const tierLabel = tier === 'none' ? 'Not started' : tier.charAt(0).toUpperCase() + tier.slice(1)
                    const starsMap: Record<CellTier, string> = { none: '', bronze: '1★', silver: '2★', gold: '3★' }

                    return (
                      <td
                        key={n}
                        data-testid={`heatmap-cell-${pupil.id}-${n}`}
                        title={`L${n}: ${lessonTitle} — ${tierLabel}${tier !== 'none' ? ` (${starsMap[tier]})` : ''}`}
                        style={{
                          width: 28,
                          height: 22,
                          padding: '2px',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            width: 20,
                            height: 16,
                            borderRadius: '3px',
                            background: cellColor(tier),
                            margin: '0 auto',
                          }}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Legend:</span>
        {(['none', 'bronze', 'silver', 'gold'] as CellTier[]).map((tier) => {
          const labels: Record<CellTier, string> = { none: 'Not Started', bronze: 'Bronze', silver: 'Silver', gold: 'Gold' }
          return (
            <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 18, height: 14, borderRadius: 3, background: cellColor(tier) }} />
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{labels[tier]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = { padding: '24px', maxWidth: '100%' }
const titleStyle: React.CSSProperties = { margin: '0 0 20px', fontSize: '22px', fontWeight: 600, color: 'var(--color-text)' }

const stickyNameHeaderStyle: React.CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 2,
  background: 'var(--color-surface)',
  padding: '8px 12px',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  fontWeight: 600,
  textAlign: 'left',
  minWidth: '110px',
  borderBottom: '1px solid var(--color-border)',
  borderRight: '1px solid var(--color-border)',
}

const stickyNameCellStyle: React.CSSProperties = {
  position: 'sticky',
  left: 0,
  background: 'inherit',
  zIndex: 1,
  padding: '4px 12px',
  fontSize: '12px',
  color: 'var(--color-text)',
  fontWeight: 500,
  minWidth: '110px',
  maxWidth: '110px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  borderRight: '1px solid var(--color-border)',
}
