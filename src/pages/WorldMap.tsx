// TICKET-021: World Map Page
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import WorldNode from '../components/WorldNode'
import LessonCard from '../components/LessonCard'
import { computeLessonStatus } from '../lib/unlocks'
import type { World, Lesson, PupilProgress, LessonNode, WorldMapData } from '../types'

const WORLD_COLORS: Record<number, string> = {
  1: 'var(--color-world-1)',
  2: 'var(--color-world-2)',
  3: 'var(--color-world-3)',
  4: 'var(--color-world-4)',
  5: 'var(--color-world-5)',
  6: 'var(--color-world-6)',
}

function buildWorldMapData(
  worlds: World[],
  lessons: Lesson[],
  progressRows: PupilProgress[],
  bossCompletedWorldIds: Set<number>,
): { worldData: WorldMapData[]; defaultOpenWorldId: number } {
  const progByLesson = new Map<string, PupilProgress>()
  for (const p of progressRows) progByLesson.set(p.lesson_id, p)

  let defaultOpenWorldId = worlds[0]?.id ?? 1

  const worldData: WorldMapData[] = worlds.map((world) => {
    const worldLessons = lessons
      .filter((l) => l.world_id === world.id)
      .sort((a, b) => a.lesson_number - b.lesson_number)

    const nodes: LessonNode[] = worldLessons.map((lesson, idx) => {
      const progress = progByLesson.get(lesson.id) ?? null
      const prevProgress = idx > 0 ? progByLesson.get(worldLessons[idx - 1].id) ?? null : null
      const status = computeLessonStatus(progress, idx, prevProgress)
      return {
        lessonNumber: lesson.lesson_number,
        title: lesson.title,
        status,
        bronzeStars: progress?.bronze_stars ?? 0,
        silverStars: progress?.silver_stars ?? 0,
        goldStars: progress?.gold_stars ?? 0,
        worldId: world.id,
      }
    })

    // Boss node
    const allBronzed = nodes.length > 0 && nodes.every((n) => n.bronzeStars >= 1)
    const bossCompleted = bossCompletedWorldIds.has(world.id)
    const bossStatus = bossCompleted ? 'completed' : allBronzed ? 'boss' : 'locked'
    nodes.push({
      lessonNumber: -(world.id), // negative as sentinel for boss
      title: `World ${world.id} Boss`,
      status: bossStatus,
      bronzeStars: bossCompleted ? 1 : 0,
      silverStars: 0,
      goldStars: 0,
      worldId: world.id,
    })

    // Determine if this world has the current lesson
    const hasCurrentLesson = nodes.some((n) => n.status === 'available' || n.status === 'in_progress')
    if (hasCurrentLesson) defaultOpenWorldId = world.id

    const completedCount = worldLessons.filter((l) => {
      const p = progByLesson.get(l.id)
      return p && (p.bronze_stars ?? 0) >= 1
    }).length

    return {
      world,
      lessons: nodes,
      bossAvailable: allBronzed && !bossCompleted,
      bossCompleted,
      completedCount,
      totalLessons: worldLessons.length,
    } as WorldMapData & { completedCount: number; totalLessons: number }
  })

  return { worldData, defaultOpenWorldId }
}

export default function WorldMap() {
  const { session, profile, xpTotal, streak } = useAuthStore()
  const navigate = useNavigate()
  const [expandedWorldId, setExpandedWorldId] = useState<number | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<LessonNode | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)

  const { data: worlds = [] } = useQuery<World[]>({
    queryKey: ['worlds'],
    queryFn: async () => {
      const { data } = await supabase.from('worlds').select('*').order('id')
      return (data ?? []) as World[]
    },
  })

  const { data: lessons = [] } = useQuery<Lesson[]>({
    queryKey: ['lessons'],
    queryFn: async () => {
      const { data } = await supabase.from('lessons').select('*').order('lesson_number')
      return (data ?? []) as Lesson[]
    },
  })

  const { data: progressRows = [] } = useQuery<PupilProgress[]>({
    queryKey: ['pupil-progress-all', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return []
      const { data } = await supabase
        .from('pupil_progress')
        .select('*')
        .eq('pupil_id', session.user.id)
      return (data ?? []) as PupilProgress[]
    },
    enabled: !!session?.user,
  })

  // Fetch world badge completions to determine boss done
  const { data: earnedBadgeCodes = [] } = useQuery<string[]>({
    queryKey: ['earned-badge-codes', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return []
      const { data } = await supabase
        .from('pupil_badges')
        .select('badges(code)')
        .eq('pupil_id', session.user.id)
      if (!data) return []
      return (data as unknown as Array<{ badges: { code: string } | { code: string }[] | null }>)
        .map((row) => {
          if (!row.badges) return ''
          if (Array.isArray(row.badges)) return row.badges[0]?.code ?? ''
          return (row.badges as { code: string }).code ?? ''
        })
        .filter(Boolean)
    },
    enabled: !!session?.user,
  })

  const bossCompletedWorldIds = new Set<number>(
    earnedBadgeCodes
      .filter((c) => c.startsWith('world_'))
      .map((c) => parseInt(c.replace('world_', ''), 10))
      .filter((n) => !isNaN(n)),
  )

  const { worldData, defaultOpenWorldId } = buildWorldMapData(
    worlds,
    lessons,
    progressRows,
    bossCompletedWorldIds,
  )

  // Set default open world once data loads
  useEffect(() => {
    if (worlds.length > 0 && expandedWorldId === null) {
      setExpandedWorldId(defaultOpenWorldId)
    }
  }, [worlds.length, defaultOpenWorldId, expandedWorldId])

  // Sync total XP to store
  useEffect(() => {
    if (progressRows.length > 0) {
      const total = progressRows.reduce((s, p) => s + (p.xp_earned ?? 0), 0)
      useAuthStore.setState({ xpTotal: total })
    }
  }, [progressRows])

  const handleNodeClick = (lesson: LessonNode) => {
    if (lesson.status === 'boss' || (lesson.status === 'completed' && lesson.lessonNumber < 0)) {
      navigate(`/boss/${lesson.worldId}`)
      return
    }
    const lessonRow = lessons.find((l) => l.lesson_number === lesson.lessonNumber)
    if (!lessonRow) return
    const progress = progressRows.find((p) => p.lesson_id === lessonRow.id) ?? null
    setSelectedLesson(lesson)
    setSelectedLessonId(lessonRow.id)
    // Pass progress to LessonCard via state — we find it from progressRows
    void progress
  }

  const level = Math.floor(xpTotal / 500) + 1
  const xpIntoLevel = xpTotal % 500
  const xpProgress = (xpIntoLevel / 500) * 100

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', paddingBottom: '40px' }}>
      {/* Sticky nav */}
      <nav style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.name ?? 'Pupil'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          <span data-tts={`streak: ${streak} days`} style={{ fontSize: '15px', color: 'var(--color-streak)', fontWeight: 700 }}>
            🔥 {streak}
          </span>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1 }}>
              Lv.{level}
            </div>
            <div data-tts={`total XP: ${xpTotal}`} style={{ fontSize: '15px', color: 'var(--color-xp)', fontWeight: 700, lineHeight: 1 }}>
              ⭐ {xpTotal}
            </div>
            <div style={{ width: '60px', height: '4px', background: 'var(--color-border)', borderRadius: '2px', marginTop: '3px' }}>
              <div style={{ width: `${xpProgress}%`, height: '100%', background: 'var(--color-xp)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
            </div>
          </div>
          <Link to="/pupil/badges" data-testid="nav-badges" aria-label="View badges" style={{ fontSize: '22px', textDecoration: 'none', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            🏅
          </Link>
        </div>
      </nav>

      {/* World cards */}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
        {worldData.map((wd) => {
          const wdWithCounts = wd as WorldMapData & { completedCount: number; totalLessons: number }
          const color = WORLD_COLORS[wd.world.id] ?? 'var(--color-brand-primary)'
          const isOpen = expandedWorldId === wd.world.id
          return (
            <div key={wd.world.id} style={{ marginBottom: '12px' }}>
              {/* World card header */}
              <button
                data-testid={`world-card-${wd.world.id}`}
                onClick={() => setExpandedWorldId(isOpen ? null : wd.world.id)}
                aria-expanded={isOpen}
                style={{
                  width: '100%',
                  background: 'var(--color-surface)',
                  border: `2px solid ${isOpen ? color : 'var(--color-border)'}`,
                  borderRadius: isOpen ? 'var(--radius-lg) var(--radius-lg) 0 0' : 'var(--radius-lg)',
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  minHeight: '44px',
                  textAlign: 'left',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <span style={{ fontSize: '32px', flexShrink: 0 }}>{wd.world.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text)' }} data-tts={`world ${wd.world.id}: ${wd.world.name}`}>
                    {wd.world.name}
                  </div>
                  <div style={{ fontSize: '13px', color: color, fontWeight: 600 }}>
                    World {wd.world.id}
                  </div>
                </div>
                <span
                  data-tts={`${wdWithCounts.completedCount} of ${wdWithCounts.totalLessons} lessons`}
                  style={{
                    padding: '4px 10px',
                    background: color,
                    color: 'var(--color-text-on-dark)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '13px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {wdWithCounts.completedCount} / {wdWithCounts.totalLessons}
                </span>
                <span style={{ fontSize: '18px', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                  {isOpen ? '▲' : '▼'}
                </span>
              </button>

              {/* Expanded lesson nodes */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      overflow: 'hidden',
                      background: 'var(--color-surface)',
                      border: `2px solid ${color}`,
                      borderTop: 'none',
                      borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                    }}
                  >
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {wd.lessons.map((lessonNode) => (
                        <WorldNode
                          key={lessonNode.lessonNumber}
                          lesson={lessonNode}
                          onClick={handleNodeClick}
                          worldColor={color}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* LessonCard modal */}
      <LessonCard
        lesson={selectedLesson}
        lessonId={selectedLessonId}
        progress={
          selectedLessonId
            ? progressRows.find((p) => p.lesson_id === selectedLessonId) ?? null
            : null
        }
        worldColor={
          selectedLesson ? (WORLD_COLORS[selectedLesson.worldId] ?? 'var(--color-brand-primary)') : 'var(--color-brand-primary)'
        }
        onDismiss={() => { setSelectedLesson(null); setSelectedLessonId(null) }}
      />
    </div>
  )
}

const navStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 50,
  background: 'var(--color-surface)',
  borderBottom: '1px solid var(--color-border)',
  padding: '10px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  boxShadow: 'var(--shadow-sm)',
}
