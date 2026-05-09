// TICKET-030: World Boss Challenge
import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { checkWorldBadge } from '../lib/badges'
import { insertLearningEvent } from '../lib/progress'
import BadgeCelebration from '../components/BadgeCelebration'
import WorldUnlock from '../components/WorldUnlock'
import { useTTS } from '../hooks/useTTS'
import type { Activity, World, Lesson, PupilProgress, Badge } from '../types'

// Lazy-import activity renderers
import MCActivity from '../components/activities/MCActivity'
import MatchActivity from '../components/activities/MatchActivity'
import FillBlankActivity from '../components/activities/FillBlankActivity'
import WriteActivity from '../components/activities/WriteActivity'
import ChecklistActivity from '../components/activities/ChecklistActivity'

const BOSS_QUESTION_COUNT = 15

/** Seeded shuffle: deterministic based on worldId so the same 15 are always shown */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function calcXpAward(correct: number, total: number): number {
  const ratio = correct / total
  if (ratio >= 12 / 15) return 500
  if (ratio >= 9 / 15) return 300
  return 150
}

function BossResultScreen({
  correct, total, xpAwarded, worldBadge, currentWorld, nextWorld, onContinue,
}: {
  correct: number
  total: number
  xpAwarded: number
  worldBadge: Badge | null
  currentWorld: World | null
  nextWorld: World | null
  onContinue: () => void
}) {
  const [showUnlock, setShowUnlock] = useState(false)
  const [badgeDismissed, setBadgeDismissed] = useState(false)
  const { speak } = useTTS()

  // Amelia announces the result — key chosen based on accuracy tier
  useEffect(() => {
    const ratio = correct / total
    const key =
      ratio >= 12 / 15 ? 'boss-complete--great'
      : ratio >= 9 / 15 ? 'boss-complete--good'
      : 'boss-complete--ok'
    const t = setTimeout(() => speak(key), 400)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (worldBadge && !badgeDismissed) {
    return (
      <BadgeCelebration
        badges={[worldBadge]}
        onDismiss={() => {
          setBadgeDismissed(true)
          if (currentWorld && currentWorld.id < 6 && nextWorld) setShowUnlock(true)
          else onContinue()
        }}
      />
    )
  }

  if (showUnlock && currentWorld) {
    return (
      <WorldUnlock
        completedWorld={currentWorld}
        nextWorld={nextWorld}
        worldBadgeEmoji={worldBadge?.image_emoji ?? '🏆'}
        onContinue={onContinue}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: '40px 32px', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ fontSize: '64px', marginBottom: '8px' }}>🐉</div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 8px' }} data-tts="boss challenge complete">Boss Challenge Complete!</h1>
        <p style={{ fontSize: '22px', color: 'var(--color-text-muted)', margin: '0 0 16px' }} data-tts={`${correct} out of ${total} correct`}>
          {correct} / {total} correct
        </p>
        <p style={{ fontSize: '20px', color: 'var(--color-xp)', fontWeight: 700, margin: '0 0 28px' }} data-tts={`${xpAwarded} XP earned`}>
          +{xpAwarded} XP 🌟
        </p>
        <button
          data-testid="boss-result-continue"
          onClick={onContinue}
          style={{ width: '100%', padding: '14px', fontSize: '18px', fontWeight: 700, background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))', color: 'var(--color-text-on-dark)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', minHeight: '44px' }}
        >
          Back to World Map
        </button>
      </div>
    </div>
  )
}

export default function BossChallenge() {
  const { worldId } = useParams<{ worldId: string }>()
  const navigate = useNavigate()
  const { session } = useAuthStore()
  const { speak } = useTTS()
  const worldIdNum = parseInt(worldId ?? '1', 10)

  const [currentIdx, setCurrentIdx] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [done, setDone] = useState(false)
  const [worldBadge, setWorldBadge] = useState<Badge | null>(null)

  const { data: worlds = [] } = useQuery<World[]>({
    queryKey: ['worlds'],
    queryFn: async () => {
      const { data } = await supabase.from('worlds').select('*').order('id')
      return (data ?? []) as World[]
    },
  })

  const { data: worldLessons = [] } = useQuery<Lesson[]>({
    queryKey: ['world-lessons', worldIdNum],
    queryFn: async () => {
      const { data } = await supabase.from('practice_lessons').select('*').eq('world_id', worldIdNum)
      return (data ?? []) as Lesson[]
    },
  })

  const lessonIds = useMemo(() => worldLessons.map((l) => l.id), [worldLessons])

  const { data: allActivities = [] } = useQuery<Activity[]>({
    queryKey: ['boss-activities', worldIdNum],
    queryFn: async () => {
      if (!lessonIds.length) return []
      const { data } = await supabase
        .from('activities')
        .select('*')
        .in('lesson_id', lessonIds)
        .eq('level', 'bronze')
      return (data ?? []) as Activity[]
    },
    enabled: lessonIds.length > 0,
  })

  const { data: progressRows = [] } = useQuery<PupilProgress[]>({
    queryKey: ['pupil-progress-all', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return []
      const { data } = await supabase.from('pupil_progress').select('*').eq('pupil_id', session.user.id)
      return (data ?? []) as PupilProgress[]
    },
    enabled: !!session?.user,
  })

  const selectedActivities = useMemo(() => {
    if (!allActivities.length) return []
    const shuffled = seededShuffle(allActivities, worldIdNum)
    return shuffled.slice(0, BOSS_QUESTION_COUNT)
  }, [allActivities, worldIdNum])

  const currentWorld = worlds.find((w) => w.id === worldIdNum) ?? null
  const nextWorld = worlds.find((w) => w.id === worldIdNum + 1) ?? null
  const xpAwarded = calcXpAward(correctCount, BOSS_QUESTION_COUNT)

  // Alistair fires the boss intro once activities have loaded
  useEffect(() => {
    if (!selectedActivities.length) return
    const t = setTimeout(() => speak('boss-intro'), 300)
    return () => clearTimeout(t)
  }, [selectedActivities.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = (isCorrect: boolean, _xp?: number) => {
    const nextCorrect = correctCount + (isCorrect ? 1 : 0)
    if (currentIdx + 1 >= selectedActivities.length) {
      // Completed boss challenge
      setCorrectCount(nextCorrect)
      setDone(true)
      // Award world badge + report to learning_events
      if (session?.user) {
        void (async () => {
          const badge = await checkWorldBadge(
            session.user.id,
            worldIdNum,
            lessonIds,
            progressRows,
          )
          setWorldBadge(badge)

          // Report world completion to wrife.co.uk teacher dashboard
          await insertLearningEvent(session.user.id, 'world_completed', {
            world_id: worldIdNum,
            badge_earned: badge?.name ?? null,
          })
        })()
      }
    } else {
      setCorrectCount(nextCorrect)
      setCurrentIdx((i) => i + 1)
    }
  }

  if (done) {
    return (
      <BossResultScreen
        correct={correctCount}
        total={selectedActivities.length}
        xpAwarded={xpAwarded}
        worldBadge={worldBadge}
        currentWorld={currentWorld}
        nextWorld={nextWorld}
        onContinue={() => navigate('/world-map')}
      />
    )
  }

  if (!selectedActivities.length) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '18px' }}>Loading boss challenge…</p>
      </div>
    )
  }

  const activity = selectedActivities[currentIdx]
  const progressPct = ((currentIdx) / selectedActivities.length) * 100

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', padding: '16px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ background: '#1a1a2e', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px', border: '2px solid var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Boss Challenge</p>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-gold)' }}>
              🐉 World {worldIdNum}: {currentWorld?.name ?? ''}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Question</p>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--color-text-on-dark)' }}>
              {currentIdx + 1} / {selectedActivities.length}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: '8px', background: 'var(--color-border)', borderRadius: '4px', marginBottom: '16px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--color-gold)', borderRadius: '4px', transition: 'width 300ms ease' }} />
        </div>

        {/* Activity renderer */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
          {activity.type === 'mc' && (
            <MCActivity activity={activity} onAnswer={(isCorrect) => handleAnswer(isCorrect)} />
          )}
          {activity.type === 'match' && (
            <MatchActivity activity={activity} onAnswer={(isCorrect) => handleAnswer(isCorrect)} />
          )}
          {activity.type === 'fillblank' && (
            <FillBlankActivity activity={activity} onAnswer={(isCorrect) => handleAnswer(isCorrect)} />
          )}
          {activity.type === 'write' && (
            <WriteActivity activity={activity} onAnswer={(isCorrect) => handleAnswer(isCorrect)} />
          )}
          {activity.type === 'checklist' && (
            <ChecklistActivity activity={activity} onAnswer={(isCorrect) => handleAnswer(isCorrect)} />
          )}
        </div>
      </div>
    </div>
  )
}
