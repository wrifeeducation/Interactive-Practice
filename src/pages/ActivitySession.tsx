import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useSessionStore } from '../stores/sessionStore'
import { useAuthStore } from '../stores/authStore'
import { upsertProgress } from '../lib/progress'
import SessionHeader from '../components/activities/SessionHeader'
import RestOverlay from '../components/activities/RestOverlay'
import MCActivity from '../components/activities/MCActivity'
import MatchActivity from '../components/activities/MatchActivity'
import FillBlankActivity from '../components/activities/FillBlankActivity'
import WriteActivity from '../components/activities/WriteActivity'
import ChecklistActivity from '../components/activities/ChecklistActivity'
import { useSoundEffects } from '../hooks/useSoundEffects'
import type { Activity, ActivityLevel, ActivityType } from '../types'

type LevelParam = ActivityLevel

// ── Lesson nav bar ───────────────────────────────────────────────
const LEVEL_COLOURS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#A8A9AD',
  gold:   '#F5C500',
}

function LessonNavBar({
  lessonNumber,
  lessonTitle,
  level,
  onBack,
}: {
  lessonNumber: number | null
  lessonTitle: string | null
  level: string
  onBack: () => void
}) {
  const tierColour = LEVEL_COLOURS[level] ?? 'var(--color-brand-primary)'

  return (
    <div
      data-testid="lesson-nav-bar"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'linear-gradient(135deg, #7C6FF7 0%, var(--color-brand-primary) 100%)',
        boxShadow: '0 2px 12px rgba(108,92,231,0.35)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        maxWidth: '100%',
      }}
    >
      {/* Back to world map */}
      <button
        data-testid="lesson-nav-back"
        onClick={onBack}
        aria-label="Back to World Map"
        style={{
          background: 'rgba(255,255,255,0.18)',
          border: '1.5px solid rgba(255,255,255,0.35)',
          borderRadius: 'var(--radius-md)',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 600,
          padding: '6px 12px',
          cursor: 'pointer',
          minHeight: '36px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        ← Map
      </button>

      {/* Lesson title — truncates if too long */}
      <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
        {lessonNumber !== null && (
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            Lesson {lessonNumber}
          </div>
        )}
        {lessonTitle && (
          <div
            data-tts={`lesson: ${lessonTitle}`}
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}
          >
            {lessonTitle}
          </div>
        )}
      </div>

      {/* Tier badge */}
      <span
        data-testid="lesson-nav-tier"
        data-tts={`tier: ${level}`}
        style={{
          background: tierColour,
          color: '#fff',
          fontSize: '12px',
          fontWeight: 700,
          padding: '5px 10px',
          borderRadius: 'var(--radius-full)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          flexShrink: 0,
          boxShadow: `0 0 8px ${tierColour}80`,
        }}
      >
        {level}
      </span>
    </div>
  )
}

export default function ActivitySession() {
  const { lessonId, level } = useParams<{ lessonId: string; level: string }>()
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const store = useSessionStore()

  const { play } = useSoundEffects()
  const [showRest, setShowRest] = useState(false)
  const [restDismissed, setRestDismissed] = useState(false)
  const [xpDelta, setXpDelta] = useState(0)
  const [xpDeltaKey, setXpDeltaKey] = useState(0)
  const [activityKey, setActivityKey] = useState(0)

  const safeLevel = (level as LevelParam) ?? 'bronze'

  useEffect(() => {
    store.resetSession()
  }, [lessonId, level]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch lesson metadata for the nav bar
  const { data: lessonMeta } = useQuery({
    queryKey: ['lesson-meta', lessonId],
    queryFn: async () => {
      const { data } = await supabase
        .from('practice_lessons')
        .select('lesson_number, title')
        .eq('id', lessonId)
        .maybeSingle()
      return data as { lesson_number: number; title: string } | null
    },
    enabled: !!lessonId,
  })

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities', lessonId, safeLevel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('level', safeLevel)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as Activity[]
    },
    enabled: !!lessonId,
  })

  const handleAnswer = useCallback(async (isCorrect: boolean, xp: number, selectedAnswer?: string) => {
    const currentActivity = activities[store.currentIndex]
    if (!currentActivity) return

    if (isCorrect) {
      play('correct')
    } else {
      play('incorrect')
      store.loseLife()
      if (store.livesRemaining - 1 <= 0 && !restDismissed) {
        setShowRest(true)
      }
    }

    const actualXp = store.xpLocked ? 0 : xp
    store.addXP(actualXp)
    store.recordAnswer({ activityId: currentActivity.id, isCorrect, xpAwarded: actualXp })

    setXpDelta(actualXp)
    setXpDeltaKey((k) => k + 1)

    // Save response to Supabase (include selected answer when available)
    if (session?.user) {
      const responseJson: Record<string, unknown> = selectedAnswer ? { selected: selectedAnswer } : {}
      await supabase.from('pupil_responses').insert({
        pupil_id: session.user.id,
        activity_id: currentActivity.id,
        response_json: responseJson,
        is_correct: isCorrect,
        attempt_number: 1,
        xp_awarded: actualXp,
      })
    }

    // Advance or finish
    if (store.currentIndex + 1 >= activities.length) {
      // Session complete — upsert progress then navigate
      if (session?.user) {
        const allAnswers = [...store.answersGiven, { activityId: currentActivity.id, isCorrect, xpAwarded: actualXp }]
        await upsertProgress(session.user.id, lessonId!, safeLevel, allAnswers)
      }
      navigate(`/lesson/${lessonId}/complete`)
    } else {
      store.nextActivity()
      setActivityKey((k) => k + 1)
    }
  }, [activities, store, session, lessonId, safeLevel, restDismissed, navigate, play])

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <div>📖</div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '18px' }}>Loading activities…</p>
      </div>
    )
  }

  if (!activities.length) {
    return (
      <div style={styles.loading}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
        <p style={{ color: 'var(--color-text)', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
          Coming Soon
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', maxWidth: '280px', textAlign: 'center', margin: '0 0 24px' }}>
          Activities for this lesson aren't published yet. Check back soon!
        </p>
        <button
          onClick={() => navigate('/world-map')}
          data-testid="no-activities-back"
          style={{
            padding: '12px 28px',
            fontSize: '16px',
            fontWeight: 600,
            background: 'var(--color-brand-primary)',
            color: 'var(--color-text-on-dark)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          ← Back to World Map
        </button>
      </div>
    )
  }

  const currentActivity = activities[store.currentIndex]
  if (!currentActivity) return null

  return (
    <div style={styles.page}>
      <LessonNavBar
        lessonNumber={lessonMeta?.lesson_number ?? null}
        lessonTitle={lessonMeta?.title ?? null}
        level={safeLevel}
        onBack={() => navigate('/world-map')}
      />
      <div style={styles.inner}>
      <SessionHeader
        level={safeLevel}
        livesRemaining={store.livesRemaining}
        currentIndex={store.currentIndex}
        total={activities.length}
        xp={store.xpThisSession}
        xpDelta={xpDelta}
        xpDeltaKey={xpDeltaKey}
      />

      <ActivityRenderer
        key={activityKey}
        activity={currentActivity}
        onAnswer={handleAnswer}
      />

      {showRest && !restDismissed && (
        <RestOverlay onContinue={() => { setShowRest(false); setRestDismissed(true) }} />
      )}
      </div>
    </div>
  )
}

function ActivityRenderer({ activity, onAnswer }: { activity: Activity; onAnswer: (isCorrect: boolean, xp: number) => void }) {
  const type = activity.type as ActivityType
  const props = { activity, onAnswer }
  if (type === 'mc') return <MCActivity {...props} />
  if (type === 'match') return <MatchActivity {...props} />
  if (type === 'fillblank') return <FillBlankActivity {...props} />
  if (type === 'write') return <WriteActivity {...props} />
  if (type === 'checklist') return <ChecklistActivity {...props} />
  return <p style={{ color: 'var(--color-text-muted)', padding: '16px' }}>Unknown activity type: {type}</p>
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--color-background)',
  },
  inner: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: '16px',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: '12px',
    background: 'var(--color-background)',
    fontSize: '40px',
  },
}
