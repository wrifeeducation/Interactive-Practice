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
    maxWidth: '720px',
    margin: '0 auto',
    padding: '16px',
    minHeight: '100vh',
    background: 'var(--color-background)',
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
