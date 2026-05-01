// Teacher Progress Report — class-wide summary + per-lesson achievement table
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import LoadingSkeleton from '../../components/LoadingSkeleton'

// ── Types ──────────────────────────────────────────────────────────────────

interface RawProgress {
  pupil_id: string
  lesson_id: string
  bronze_stars: number
  silver_stars: number
  gold_stars: number
  xp_earned: number
  completed_at: string | null
}

interface RawLesson {
  id: string
  lesson_number: number
  title: string
  world_id: number
}

interface RawMember {
  pupil_id: string
}

interface RawStreak {
  pupil_id: string
  last_activity_date: string | null
}

interface LessonStats {
  lesson: RawLesson
  bronzeCount: number
  silverCount: number
  goldCount: number
}

const WORLD_NAMES: Record<number, string> = {
  1: 'Story Seeds',
  2: 'Grammar Toolkit',
  3: 'Sentence Builders',
  4: "Writer's Craft",
  5: 'Flow & Finish',
  6: 'Genre Arena',
}

const WORLD_COLORS: Record<number, string> = {
  1: 'var(--color-world-1)',
  2: 'var(--color-world-2)',
  3: 'var(--color-world-3)',
  4: 'var(--color-world-4)',
  5: 'var(--color-world-5)',
  6: 'var(--color-world-6)',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function pct(n: number, total: number): number {
  return total === 0 ? 0 : Math.round((n / total) * 100)
}

function SummaryCard({ icon, value, label, sub }: { icon: string; value: string; label: string; sub?: string }) {
  return (
    <div style={styles.summaryCard}>
      <div style={{ fontSize: '28px', marginBottom: '6px' }}>{icon}</div>
      <div style={styles.summaryValue} data-tts={`${label}: ${value}`}>{value}</div>
      <div style={styles.summaryLabel}>{label}</div>
      {sub && <div style={styles.summarySub}>{sub}</div>}
    </div>
  )
}

function TierBar({ bronze, silver, gold, total }: { bronze: number; silver: number; gold: number; total: number }) {
  const bp = pct(bronze, total)
  const sp = pct(silver, total)
  const gp = pct(gold, total)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {[
        { label: 'Bronze', count: bronze, pct: bp, color: 'var(--color-bronze)' },
        { label: 'Silver', count: silver, pct: sp, color: 'var(--color-silver)' },
        { label: 'Gold', count: gold, pct: gp, color: 'var(--color-gold)' },
      ].map(({ label, count, pct: p, color }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 46, fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'right', flexShrink: 0 }}>
            {label}
          </div>
          <div style={{ flex: 1, height: 10, background: 'var(--color-border)', borderRadius: 5, overflow: 'hidden' }}>
            <div
              style={{
                width: `${p}%`,
                height: '100%',
                background: color,
                borderRadius: 5,
                transition: 'width 600ms ease',
              }}
            />
          </div>
          <div style={{ width: 34, fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'right', flexShrink: 0 }}>
            {count}/{total}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function TeacherReport() {
  const { session } = useAuthStore()

  const { data, isLoading, error } = useQuery({
    queryKey: ['teacher-report', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return null

      // Get teacher's class
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', session.user.id)
        .maybeSingle()
      if (!classData) return null

      // Members, lessons, streaks in parallel
      const [membersRes, lessonsRes] = await Promise.all([
        supabase.from('class_members').select('pupil_id').eq('class_id', classData.id),
        supabase.from('lessons').select('id, lesson_number, title, world_id').order('lesson_number'),
      ])

      const members = (membersRes.data ?? []) as RawMember[]
      const lessons = (lessonsRes.data ?? []) as RawLesson[]
      const pupilIds = members.map((m) => m.pupil_id).filter(Boolean)

      if (pupilIds.length === 0) return { members, lessons, progressRows: [], streakRows: [] }

      const [progressRes, streakRes] = await Promise.all([
        supabase
          .from('pupil_progress')
          .select('pupil_id, lesson_id, bronze_stars, silver_stars, gold_stars, xp_earned, completed_at')
          .in('pupil_id', pupilIds),
        supabase
          .from('streaks')
          .select('pupil_id, last_activity_date')
          .in('pupil_id', pupilIds),
      ])

      return {
        members,
        lessons,
        progressRows: (progressRes.data ?? []) as RawProgress[],
        streakRows: (streakRes.data ?? []) as RawStreak[],
      }
    },
    enabled: !!session?.user,
  })

  const stats = useMemo(() => {
    if (!data) return null
    const { members, lessons, progressRows, streakRows } = data
    const totalPupils = members.length
    if (totalPupils === 0) return { totalPupils: 0, avgXp: 0, avgLessons: 0, activeThisWeek: 0, lessonStats: [], worldStats: [] }

    const pupilIds = members.map((m) => m.pupil_id)

    // XP and lesson completion per pupil
    const xpByPupil = new Map<string, number>()
    const completedByPupil = new Map<string, number>()
    for (const p of progressRows) {
      xpByPupil.set(p.pupil_id, (xpByPupil.get(p.pupil_id) ?? 0) + (p.xp_earned ?? 0))
      if ((p.bronze_stars ?? 0) >= 1) {
        completedByPupil.set(p.pupil_id, (completedByPupil.get(p.pupil_id) ?? 0) + 1)
      }
    }

    const avgXp = Math.round(
      pupilIds.reduce((s, id) => s + (xpByPupil.get(id) ?? 0), 0) / totalPupils
    )
    const avgLessons = Math.round(
      (pupilIds.reduce((s, id) => s + (completedByPupil.get(id) ?? 0), 0) / totalPupils) * 10
    ) / 10

    // Active this week
    const weekAgo = Date.now() - 7 * 86400000
    const activeThisWeek = streakRows.filter(
      (s) => s.last_activity_date && new Date(s.last_activity_date).getTime() >= weekAgo
    ).length

    // Per-lesson stats
    const lessonById = new Map(lessons.map((l) => [l.id, l]))
    const bronzeByLesson = new Map<string, Set<string>>()
    const silverByLesson = new Map<string, Set<string>>()
    const goldByLesson = new Map<string, Set<string>>()

    for (const p of progressRows) {
      const lesson = lessonById.get(p.lesson_id)
      if (!lesson) continue
      const lid = lesson.id
      if ((p.bronze_stars ?? 0) >= 1) {
        if (!bronzeByLesson.has(lid)) bronzeByLesson.set(lid, new Set())
        bronzeByLesson.get(lid)!.add(p.pupil_id)
      }
      if ((p.silver_stars ?? 0) >= 1) {
        if (!silverByLesson.has(lid)) silverByLesson.set(lid, new Set())
        silverByLesson.get(lid)!.add(p.pupil_id)
      }
      if ((p.gold_stars ?? 0) >= 1) {
        if (!goldByLesson.has(lid)) goldByLesson.set(lid, new Set())
        goldByLesson.get(lid)!.add(p.pupil_id)
      }
    }

    const lessonStats: LessonStats[] = lessons.map((lesson) => ({
      lesson,
      bronzeCount: bronzeByLesson.get(lesson.id)?.size ?? 0,
      silverCount: silverByLesson.get(lesson.id)?.size ?? 0,
      goldCount: goldByLesson.get(lesson.id)?.size ?? 0,
    }))

    // Per-world stats: pupils who have started ≥1 lesson in the world
    const worldStats = [1, 2, 3, 4, 5, 6].map((worldId) => {
      const worldLessons = lessons.filter((l) => l.world_id === worldId)
      const startedPupils = new Set<string>()
      for (const l of worldLessons) {
        bronzeByLesson.get(l.id)?.forEach((id) => startedPupils.add(id))
      }
      const totalBronze = worldLessons.reduce((s, l) => s + (bronzeByLesson.get(l.id)?.size ?? 0), 0)
      const totalSilver = worldLessons.reduce((s, l) => s + (silverByLesson.get(l.id)?.size ?? 0), 0)
      const totalGold = worldLessons.reduce((s, l) => s + (goldByLesson.get(l.id)?.size ?? 0), 0)
      const maxPossible = worldLessons.length * totalPupils
      return {
        worldId,
        startedPupils: startedPupils.size,
        bronzeRate: pct(totalBronze, maxPossible),
        silverRate: pct(totalSilver, maxPossible),
        goldRate: pct(totalGold, maxPossible),
        totalLessons: worldLessons.length,
      }
    })

    return { totalPupils, avgXp, avgLessons, activeThisWeek, lessonStats, worldStats }
  }, [data])

  // ── Render ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Progress Report</h2>
        <div style={styles.summaryRow}>
          {[1, 2, 3, 4].map((i) => <LoadingSkeleton key={i} height={96} variant="card" style={{ flex: 1, minWidth: 120 }} />)}
        </div>
        <LoadingSkeleton height={300} variant="card" style={{ marginTop: 16 }} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Progress Report</h2>
        <p style={{ color: 'var(--color-incorrect)' }}>Failed to load report data.</p>
      </div>
    )
  }

  if (!stats || stats.totalPupils === 0) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Progress Report</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>No pupils in your class yet.</p>
      </div>
    )
  }

  const { totalPupils, avgXp, avgLessons, activeThisWeek, lessonStats, worldStats } = stats

  // Group lessonStats by world
  const lessonsByWorld = new Map<number, LessonStats[]>()
  for (const ls of lessonStats) {
    const wid = ls.lesson.world_id
    if (!lessonsByWorld.has(wid)) lessonsByWorld.set(wid, [])
    lessonsByWorld.get(wid)!.push(ls)
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Progress Report</h2>

      {/* ── Summary cards ── */}
      <div style={styles.summaryRow}>
        <SummaryCard icon="👥" value={String(totalPupils)} label="Pupils" />
        <SummaryCard icon="⭐" value={avgXp.toLocaleString()} label="Avg XP" sub="per pupil" />
        <SummaryCard icon="📚" value={String(avgLessons)} label="Avg Lessons" sub="completed" />
        <SummaryCard
          icon="🔥"
          value={String(activeThisWeek)}
          label="Active This Week"
          sub={`of ${totalPupils} pupils`}
        />
      </div>

      {/* ── World overview ── */}
      <div style={styles.card}>
        <h3 style={styles.sectionHeading}>World Completion Rates</h3>
        <p style={styles.sectionSub}>% of pupil–lesson slots reached at each tier</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {worldStats.map(({ worldId, startedPupils, bronzeRate, silverRate, goldRate, totalLessons }) => (
            <div key={worldId}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span
                  style={{
                    background: WORLD_COLORS[worldId],
                    color: 'var(--color-text-on-dark)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 10px',
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                >
                  World {worldId}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                  {WORLD_NAMES[worldId]}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  — {totalLessons} lessons · {startedPupils}/{totalPupils} pupils started
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { label: 'Bronze', rate: bronzeRate, color: 'var(--color-bronze)' },
                  { label: 'Silver', rate: silverRate, color: 'var(--color-silver)' },
                  { label: 'Gold', rate: goldRate, color: 'var(--color-gold)' },
                ].map(({ label, rate, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 42, fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'right', flexShrink: 0 }}>
                      {label}
                    </span>
                    <div style={{ flex: 1, height: 12, background: 'var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 600ms ease' }} />
                    </div>
                    <span style={{ width: 34, fontSize: '11px', color: 'var(--color-text-muted)', flexShrink: 0 }}>{rate}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Per-lesson achievement table by world ── */}
      <div style={styles.card}>
        <h3 style={styles.sectionHeading}>Lesson Achievement</h3>
        <p style={styles.sectionSub}>Number of pupils who have earned at least 1 star at each tier</p>
        {[1, 2, 3, 4, 5, 6].map((worldId) => {
          const rows = lessonsByWorld.get(worldId) ?? []
          if (rows.length === 0) return null
          const color = WORLD_COLORS[worldId]
          return (
            <div key={worldId} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ background: color, color: 'var(--color-text-on-dark)', fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: 4 }}>
                  World {worldId}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>{WORLD_NAMES[worldId]}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
                  <thead>
                    <tr>
                      {['Lesson', 'Title', 'Bronze', 'Silver', 'Gold'].map((h) => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ lesson, bronzeCount, silverCount, goldCount }) => (
                      <tr
                        key={lesson.id}
                        data-testid={`report-row-${lesson.lesson_number}`}
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                      >
                        <td style={styles.td}>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '13px' }}>
                            L{lesson.lesson_number}
                          </span>
                        </td>
                        <td style={{ ...styles.td, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          data-tts={`lesson ${lesson.lesson_number}: ${lesson.title}`}>
                          {lesson.title}
                        </td>
                        <td style={styles.td}>
                          <TierBar bronze={bronzeCount} silver={silverCount} gold={goldCount} total={totalPupils} />
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <CountBadge count={silverCount} total={totalPupils} color="var(--color-silver)" />
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <CountBadge count={goldCount} total={totalPupils} color="var(--color-gold)" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CountBadge({ count, total, color }: { count: number; total: number; color: string }) {
  if (count === 0) return <span style={{ color: 'var(--color-border)', fontSize: '13px' }}>—</span>
  return (
    <span
      style={{
        display: 'inline-block',
        minWidth: 36,
        padding: '2px 8px',
        background: color,
        color: count === 0 ? 'var(--color-text-muted)' : 'var(--color-text-on-dark)',
        borderRadius: 12,
        fontSize: '12px',
        fontWeight: 700,
        textAlign: 'center',
      }}
    >
      {count}/{total}
    </span>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px', maxWidth: '900px' },
  title: { margin: '0 0 20px', fontSize: '22px', fontWeight: 600, color: 'var(--color-text)' },
  summaryRow: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  summaryCard: {
    flex: 1,
    minWidth: '120px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    textAlign: 'center',
  },
  summaryValue: { fontSize: '26px', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 },
  summaryLabel: { fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' },
  summarySub: { fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' },
  card: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    marginBottom: '16px',
  },
  sectionHeading: { margin: '0 0 4px', fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' },
  sectionSub: { margin: '0 0 16px', fontSize: '13px', color: 'var(--color-text-muted)' },
  th: {
    padding: '8px 10px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    borderBottom: '2px solid var(--color-border)',
    whiteSpace: 'nowrap',
  },
  td: { padding: '10px', fontSize: '14px', color: 'var(--color-text)', verticalAlign: 'middle' },
}
