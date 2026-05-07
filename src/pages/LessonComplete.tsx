// TICKET-020 + TICKET-034: Lesson Complete Screen (extended with badges, streak, next-lesson)
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useSessionStore } from '../stores/sessionStore'
import { useAuthStore } from '../stores/authStore'
import { updateStreak, streakBonusXP } from '../lib/streak'
import { checkLessonBadge } from '../lib/badges'
import { autoSubmitAssignment } from '../lib/progress'
import BadgeCelebration from '../components/BadgeCelebration'
import type { PupilProgress, StarRating, Badge, Lesson } from '../types'

function calcStarsFromAnswers(answers: { isCorrect: boolean }[]): StarRating {
  if (!answers.length) return 0
  const acc = answers.filter((a) => a.isCorrect).length / answers.length
  if (acc >= 0.9) return 3
  if (acc >= 0.6) return 2
  return 1
}

function playSuccessSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.2)
  } catch {
    // AudioContext not available — silently ignore
  }
}

function ConfettiBurst() {
  return (
    <div style={styles.confettiWrapper} aria-hidden="true">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          style={{
            ...styles.confettiPiece,
            left: `${(i / 20) * 100}%`,
            animationDelay: `${(i % 5) * 0.1}s`,
            background: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
          }}
        />
      ))}
    </div>
  )
}

interface StreakToastProps {
  milestone: number
  bonus: number
}

function StreakToast({ milestone, bonus }: StreakToastProps) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3500)
    return () => clearTimeout(t)
  }, [])
  if (!visible) return null
  return (
    <div
      data-testid="streak-toast"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--color-streak)',
        color: 'var(--color-text-on-dark)',
        padding: '12px 24px',
        borderRadius: 'var(--radius-full)',
        fontSize: '16px',
        fontWeight: 700,
        boxShadow: 'var(--shadow-md)',
        zIndex: 400,
        whiteSpace: 'nowrap',
        animation: 'fadeInUp 0.4s ease, fadeOut 0.4s 3.1s ease forwards',
      }}
    >
      🔥 {milestone}-day streak! +{bonus} bonus XP
    </div>
  )
}

export default function LessonComplete() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const { xpThisSession, answersGiven } = useSessionStore()

  const earnedStars: StarRating = calcStarsFromAnswers(answersGiven)
  const [visibleStars, setVisibleStars] = useState(0)
  const [newBadges, setNewBadges] = useState<Badge[]>([])
  const [badgesDismissed, setBadgesDismissed] = useState(false)
  const [streakMilestone, setStreakMilestone] = useState<number | null>(null)
  const [streakBonus, setStreakBonus] = useState(0)
  const [effectsRan, setEffectsRan] = useState(false)

  // Animate stars after badge celebration
  useEffect(() => {
    if (!badgesDismissed && newBadges.length > 0) return
    let i = 0
    const max = earnedStars
    if (max === 0) return
    if (earnedStars === 3) playSuccessSound()
    const timer = setInterval(() => {
      i += 1
      setVisibleStars(i)
      if (i >= max) clearInterval(timer)
    }, 400)
    return () => clearInterval(timer)
  }, [earnedStars, badgesDismissed, newBadges.length])

  // Fetch pupil_progress to check level unlocks
  const { data: progress } = useQuery<PupilProgress | null>({
    queryKey: ['pupil-progress', session?.user?.id, lessonId],
    queryFn: async () => {
      if (!session?.user || !lessonId) return null
      const { data } = await supabase
        .from('pupil_progress')
        .select('*')
        .eq('pupil_id', session.user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle()
      return data as PupilProgress | null
    },
    enabled: !!session?.user && !!lessonId,
  })

  // Fetch all lessons to compute next lesson
  const { data: allLessons = [] } = useQuery<Lesson[]>({
    queryKey: ['lessons'],
    queryFn: async () => {
      const { data } = await supabase.from('practice_lessons').select('*').order('lesson_number')
      return (data ?? []) as Lesson[]
    },
  })

  // Fetch total XP
  const { data: totalXp } = useQuery<number>({
    queryKey: ['total-xp', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return 0
      const { data } = await supabase
        .from('pupil_progress')
        .select('xp_earned')
        .eq('pupil_id', session.user.id)
      if (!data) return 0
      return (data as { xp_earned: number }[]).reduce((s, r) => s + r.xp_earned, 0)
    },
    enabled: !!session?.user,
  })

  // Run once: check badge + streak
  const runEffects = useCallback(async () => {
    if (effectsRan || !session?.user || !lessonId) return
    setEffectsRan(true)

    // Get lesson number from lessonId
    const lessonRow = allLessons.find((l) => l.id === lessonId)
    const lessonNumber = lessonRow?.lesson_number ?? 0

    // Award lesson badge
    const badge = await checkLessonBadge(session.user.id, lessonNumber)
    if (badge) setNewBadges([badge])

    // Update streak
    const result = await updateStreak(session.user.id)
    useAuthStore.setState({ streak: result.newStreak })
    if (result.milestoneReached) {
      setStreakMilestone(result.milestoneReached)
      setStreakBonus(streakBonusXP(result.milestoneReached))
    }

    // Auto-submit against any active class assignment for this lesson
    if (lessonNumber > 0) {
      await autoSubmitAssignment(session.user.id, lessonNumber)
    }
  }, [effectsRan, session?.user, lessonId, allLessons])

  useEffect(() => {
    if (allLessons.length > 0) {
      void runEffects()
    }
  }, [allLessons.length, runEffects])

  // Compute next lesson
  const currentLesson = allLessons.find((l) => l.id === lessonId)
  const nextLesson = currentLesson
    ? allLessons.find((l) => l.lesson_number === currentLesson.lesson_number + 1)
    : null

  const bronzeStars = progress?.bronze_stars ?? 0
  const silverStars = progress?.silver_stars ?? 0
  const silverUnlocked = bronzeStars >= 2
  const goldUnlocked = silverStars >= 2
  const showConfetti = earnedStars === 3

  const showBadgeCelebration = newBadges.length > 0 && !badgesDismissed

  return (
    <div style={styles.page}>
      {showConfetti && !showBadgeCelebration && <ConfettiBurst />}

      {/* Badge celebration fires before star animation */}
      {showBadgeCelebration && (
        <BadgeCelebration badges={newBadges} onDismiss={() => setBadgesDismissed(true)} />
      )}

      {/* Streak toast fires after stars */}
      {streakMilestone && badgesDismissed && (
        <StreakToast milestone={streakMilestone} bonus={streakBonus} />
      )}

      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.heading} data-tts="lesson complete heading">Lesson Complete!</h1>
        </div>

        {/* Stars */}
        <div style={styles.starsRow} aria-label={`You earned ${earnedStars} stars`}>
          {[1, 2, 3].map((n) => (
            <AnimatePresence key={n}>
              {visibleStars >= n ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.4 }}
                  style={{ fontSize: '56px', color: 'var(--color-gold)' }}
                  data-tts={`star ${n} earned`}
                  aria-hidden="true"
                >
                  ★
                </motion.span>
              ) : (
                <span style={{ fontSize: '56px', color: 'var(--color-border)' }} aria-hidden="true">★</span>
              )}
            </AnimatePresence>
          ))}
        </div>

        {/* XP earned — animated count */}
        <motion.p
          style={styles.xpText}
          data-tts={`you earned ${xpThisSession} XP this lesson`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          You earned <strong style={{ color: 'var(--color-xp)' }}>{xpThisSession} XP</strong> this lesson!
        </motion.p>
        <p style={styles.totalXpText} data-tts={`total XP: ${totalXp ?? 0}`}>
          Total XP: <strong>{totalXp ?? 0}</strong>
        </p>

        {/* Next level buttons */}
        <div style={styles.nextLevels}>
          {silverUnlocked && (
            <button
              data-testid="try-silver"
              onClick={() => navigate(`/lesson/${lessonId}/silver`)}
              style={{
                ...styles.levelBtn,
                background: 'var(--color-silver)',
                color: 'var(--color-text-on-dark)',
                borderColor: 'var(--color-silver)',
              }}
            >
              🥈 Try Silver
            </button>
          )}
          {goldUnlocked && (
            <button
              data-testid="try-gold"
              onClick={() => navigate(`/lesson/${lessonId}/gold`)}
              style={{
                ...styles.levelBtn,
                background: 'var(--color-gold)',
                color: 'var(--color-text-on-dark)',
                borderColor: 'var(--color-gold)',
              }}
            >
              🥇 Try Gold
            </button>
          )}
        </div>

        {/* Next lesson button */}
        {nextLesson && (
          <div style={{ marginBottom: '12px' }}>
            <button
              data-testid="next-lesson-btn"
              onClick={() => navigate(`/world-map`)}
              style={{ ...styles.levelBtn, color: 'var(--color-brand-primary)', borderColor: 'var(--color-brand-primary)', width: '100%' }}
            >
              Next Lesson: {nextLesson.title} →
            </button>
          </div>
        )}

        <Link to="/world-map" data-testid="back-to-world-map" style={styles.backBtn}>
          Back to World Map
        </Link>
      </div>
    </div>
  )
}

const CONFETTI_COLOURS = [
  'var(--color-gold)',
  'var(--color-brand-primary)',
  'var(--color-correct)',
  'var(--color-xp)',
  'var(--color-brand-secondary)',
]

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--color-background)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    position: 'relative',
    overflow: 'hidden',
  },
  card: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-lg)',
    padding: '40px 32px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    zIndex: 1,
    position: 'relative',
  },
  header: { marginBottom: '24px' },
  heading: { fontSize: '28px', fontWeight: 700, color: 'var(--color-text)', margin: 0 },
  starsRow: { display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px' },
  xpText: { fontSize: '22px', color: 'var(--color-text)', marginBottom: '8px' },
  totalXpText: { fontSize: '16px', color: 'var(--color-text-muted)', marginBottom: '28px' },
  nextLevels: { display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' },
  levelBtn: {
    padding: '10px 24px',
    fontSize: '16px',
    fontWeight: 600,
    background: 'var(--color-surface)',
    border: '2px solid',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    minHeight: '44px',
  },
  backBtn: {
    display: 'inline-block',
    padding: '14px 32px',
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--color-text-on-dark)',
    background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    minHeight: '44px',
    lineHeight: '1',
  },
  confettiWrapper: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
  },
  confettiPiece: {
    position: 'absolute',
    top: '-10px',
    width: '10px',
    height: '16px',
    borderRadius: '2px',
    animation: 'confettiFall 2.5s ease-in forwards',
  },
}
