// TICKET-021: World Map Page — Option A sidebar layout
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
      lessonNumber: -(world.id),
      title: `World ${world.id} Boss`,
      status: bossStatus,
      bronzeStars: bossCompleted ? 1 : 0,
      silverStars: 0,
      goldStars: 0,
      worldId: world.id,
    })

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

// ── Sidebar stat card ────────────────────────────────────────────
function StatCard({ emoji, label, value, color }: { emoji: string; label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: 'var(--color-background)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <span style={{ fontSize: '22px', flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: color ?? 'var(--color-text)', lineHeight: 1.1 }}>
          {value}
        </div>
      </div>
    </div>
  )
}

// ── Sidebar nav link ─────────────────────────────────────────────
function SidebarLink({ to, emoji, label, testId }: { to: string; emoji: string; label: string; testId?: string }) {
  return (
    <Link
      to={to}
      data-testid={testId}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        textDecoration: 'none',
        color: 'var(--color-text)',
        fontSize: '15px',
        fontWeight: 500,
        background: 'var(--color-background)',
        transition: 'background var(--transition-fast)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-border)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-background)')}
    >
      <span style={{ fontSize: '20px' }}>{emoji}</span>
      {label}
    </Link>
  )
}

// ── Main component ───────────────────────────────────────────────
export default function WorldMap() {
  const { session, profile, xpTotal, streak } = useAuthStore()
  const navigate = useNavigate()
  const [expandedWorldId, setExpandedWorldId] = useState<number | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<LessonNode | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
      const { data } = await supabase.from('practice_lessons').select('*').order('lesson_number')
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

  // Fetch streak from DB on load so the sidebar shows the real value
  const { data: streakRow } = useQuery<{ current_streak: number } | null>({
    queryKey: ['streak', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return null
      const { data } = await supabase
        .from('streaks')
        .select('current_streak')
        .eq('pupil_id', session.user.id)
        .maybeSingle()
      return (data as { current_streak: number } | null) ?? null
    },
    enabled: !!session?.user,
  })

  const { data: earnedBadgeCodes = [] } = useQuery<string[]>({
    queryKey: ['earned-badge-codes', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return []
      const { data } = await supabase
        .from('practice_pupil_badges')
        .select('practice_badges(code)')
        .eq('pupil_id', session.user.id)
      if (!data) return []
      return (data as unknown as Array<{ practice_badges: { code: string } | { code: string }[] | null }>)
        .map((row) => {
          if (!row.practice_badges) return ''
          if (Array.isArray(row.practice_badges)) return row.practice_badges[0]?.code ?? ''
          return (row.practice_badges as { code: string }).code ?? ''
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

  useEffect(() => {
    if (worlds.length > 0 && expandedWorldId === null) {
      setExpandedWorldId(defaultOpenWorldId)
    }
  }, [worlds.length, defaultOpenWorldId, expandedWorldId])

  useEffect(() => {
    if (progressRows.length > 0) {
      const total = progressRows.reduce((s, p) => s + (p.xp_earned ?? 0), 0)
      useAuthStore.setState({ xpTotal: total })
    }
  }, [progressRows])

  useEffect(() => {
    if (streakRow !== undefined && streakRow !== null) {
      useAuthStore.setState({ streak: streakRow.current_streak })
    }
  }, [streakRow])

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
    void progress
  }

  const level = Math.floor(xpTotal / 500) + 1
  const xpIntoLevel = xpTotal % 500
  const xpProgress = (xpIntoLevel / 500) * 100
  const badgeCount = earnedBadgeCodes.length

  // Total completed lessons across all worlds
  const totalCompleted = progressRows.filter((p) => (p.bronze_stars ?? 0) >= 1).length

  // Avatar colour from profile
  const avatarColor = (profile as unknown as { avatar_colour?: string })?.avatar_colour ?? 'var(--color-brand-primary)'
  const initials = profile?.display_name
    ? profile.display_name.trim().split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  const sidebar = (
    <aside style={sidebarStyle}>
      {/* Pupil identity */}
      <div style={identityStyle}>
        <div style={{
          width: 56, height: 56, borderRadius: 'var(--radius-full)',
          background: avatarColor, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '22px', fontWeight: 700,
          color: '#fff', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '16px', color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.display_name ?? 'Pupil'}
</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
            Level {level}
          </div>
        </div>
      </div>

      {/* XP progress bar */}
      <div style={{ padding: '0 12px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginBottom: '6px' }}>
          <span data-tts={`level ${level}`}>Lv.{level}</span>
          <span data-tts={`${xpIntoLevel} of 500 XP to next level`}>{xpIntoLevel} / 500 XP</span>
        </div>
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ height: '100%', background: 'var(--color-brand-accent)', borderRadius: 'var(--radius-full)' }}
          />
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <StatCard emoji="⭐" label="Total XP" value={xpTotal.toLocaleString()} color="var(--color-xp)" />
        <StatCard emoji="🔥" label="Day Streak" value={streak} color="var(--color-streak)" />
        <StatCard emoji="🏅" label="Badges" value={badgeCount} color="var(--color-brand-secondary)" />
        <StatCard emoji="📖" label="Lessons Done" value={totalCompleted} color="var(--color-world-2)" />
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)', margin: '12px 12px' }} />

      {/* Navigation */}
      <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <SidebarLink to="/pupil/badges" emoji="🏅" label="My Badges" testId="sidebar-badges" />
        <SidebarLink to="/connect-grid" emoji="📋" label="Connect Grid" testId="sidebar-connect-grid" />
        <SidebarLink to="/pupil/leaderboard" emoji="🏆" label="Leaderboard" testId="sidebar-leaderboard" />
        <SidebarLink to="/pupil/join" emoji="🏫" label="Join a Class" testId="sidebar-join" />
      </div>

      {/* Home link + WriFe logo at bottom */}
      <div style={{ marginTop: 'auto', padding: '16px 12px 12px' }}>
        <SidebarLink to="/" emoji="🏠" label="Home" testId="sidebar-home" />
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
            WRIFE
          </span>
        </div>
      </div>
    </aside>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex' }}>

      {/* Desktop sidebar */}
      <div className="pupil-sidebar-desktop" style={desktopSidebarWrapperStyle}>
        {sidebar}
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="pupil-mobile-overlay"
              style={{
                position: 'fixed', inset: 0, background: 'var(--color-overlay)',
                zIndex: 40,
              }}
            />
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="pupil-mobile-sidebar-panel"
              style={{
                position: 'fixed', left: 0, top: 0, bottom: 0, width: '260px',
                zIndex: 50,
              }}
            >
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main style={mainStyle}>
        {/* Mobile top bar */}
        <div className="pupil-mobile-nav" style={mobileNavStyle}>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            data-testid="mobile-menu-btn"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '24px', padding: '4px', minWidth: '44px', minHeight: '44px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ☰
          </button>
          <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text)' }}>
            {profile?.display_name ?? 'World Map'}
          </span>
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <span style={{ color: 'var(--color-streak)', fontWeight: 700, fontSize: '15px' }}>🔥 {streak}</span>
            <span style={{ color: 'var(--color-xp)', fontWeight: 700, fontSize: '15px' }}>⭐ {xpTotal}</span>
          </div>
        </div>

        {/* World map header */}
        <div style={mapHeaderStyle}>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: 'var(--color-text)' }}>
            World Map
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '15px', color: 'var(--color-text-muted)' }}>
            {totalCompleted} lessons completed · Level {level}
          </p>
        </div>

        {/* World cards */}
        <div style={{ maxWidth: '620px', padding: '0 16px 40px' }}>
          {worldData.map((wd) => {
            const wdWithCounts = wd as WorldMapData & { completedCount: number; totalLessons: number }
            const color = WORLD_COLORS[wd.world.id] ?? 'var(--color-brand-primary)'
            const isOpen = expandedWorldId === wd.world.id
            return (
              <div key={wd.world.id} style={{ marginBottom: '12px' }}>
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
                    <div style={{ fontSize: '13px', color, fontWeight: 600 }}>
                      World {wd.world.id}
                    </div>
                  </div>
                  {/* Mini progress bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <span
                      data-tts={`${wdWithCounts.completedCount} of ${wdWithCounts.totalLessons} lessons`}
                      style={{
                        padding: '4px 10px',
                        background: color,
                        color: 'var(--color-text-on-dark)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    >
                      {wdWithCounts.completedCount} / {wdWithCounts.totalLessons}
                    </span>
                    <div style={{ width: '80px', height: '4px', background: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{
                        width: wdWithCounts.totalLessons > 0
                          ? `${(wdWithCounts.completedCount / wdWithCounts.totalLessons) * 100}%`
                          : '0%',
                        height: '100%',
                        background: color,
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '18px', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                    {isOpen ? '▲' : '▼'}
                  </span>
                </button>

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
      </main>

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

// ── Styles ───────────────────────────────────────────────────────

const sidebarStyle: React.CSSProperties = {
  width: '260px',
  minHeight: '100vh',
  background: 'var(--color-brand-primary)',
  display: 'flex',
  flexDirection: 'column',
  paddingTop: '8px',
  boxSizing: 'border-box',
}

const desktopSidebarWrapperStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  height: '100vh',
  flexShrink: 0,
  overflowY: 'auto',
  // Hidden on mobile via media query in index.css
}

const identityStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '16px 12px 12px',
}

const mainStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
}

const mobileNavStyle: React.CSSProperties = {
  display: 'none', // shown via media query
  alignItems: 'center',
  gap: '10px',
  padding: '10px 12px',
  background: 'var(--color-surface)',
  borderBottom: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-sm)',
  position: 'sticky',
  top: 0,
  zIndex: 30,
}

const mapHeaderStyle: React.CSSProperties = {
  padding: '20px 16px 12px',
}
