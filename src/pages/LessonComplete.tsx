import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useSessionStore } from '../stores/sessionStore'
import { useAuthStore } from '../stores/authStore'
import type { PupilProgress, StarRating } from '../types'

function calcStarsFromAnswers(answers: { isCorrect: boolean }[]): StarRating {
  if (!answers.length) return 0
  const acc = answers.filter((a) => a.isCorrect).length / answers.length
  if (acc >= 0.9) return 3
  if (acc >= 0.6) return 2
  return 1
}

export default function LessonComplete() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const { xpThisSession, answersGiven } = useSessionStore()

  const earnedStars: StarRating = calcStarsFromAnswers(answersGiven)
  const [visibleStars, setVisibleStars] = useState(0)

  // Animate stars in sequence
  useEffect(() => {
    let i = 0
    const max = earnedStars
    const timer = setInterval(() => {
      i += 1
      setVisibleStars(i)
      if (i >= max) clearInterval(timer)
    }, 400)
    return () => clearInterval(timer)
  }, [earnedStars])

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

  // Fetch total XP from profile
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

  const bronzeStars = progress?.bronze_stars ?? 0
  const silverStars = progress?.silver_stars ?? 0
  const silverUnlocked = bronzeStars >= 2
  const goldUnlocked = silverStars >= 2
  const showConfetti = earnedStars === 3

  return (
    <div style={styles.page}>
      {showConfetti && <ConfettiBurst />}

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

        <p style={styles.xpText} data-tts={`you earned ${xpThisSession} XP this lesson`}>
          You earned <strong style={{ color: 'var(--color-xp)' }}>{xpThisSession} XP</strong> this lesson!
        </p>
        <p style={styles.totalXpText} data-tts={`total XP: ${totalXp ?? 0}`}>
          Total XP: <strong>{totalXp ?? 0}</strong>
        </p>

        {/* Next level buttons */}
        <div style={styles.nextLevels}>
          {silverUnlocked && (
            <button
              data-testid="try-silver"
              onClick={() => navigate(`/lesson/${lessonId}/silver`)}
              style={{ ...styles.levelBtn, color: 'var(--color-silver)', borderColor: 'var(--color-silver)' }}
            >
              Try Silver
            </button>
          )}
          {goldUnlocked && (
            <button
              data-testid="try-gold"
              onClick={() => navigate(`/lesson/${lessonId}/gold`)}
              style={{ ...styles.levelBtn, color: 'var(--color-gold)', borderColor: 'var(--color-gold)' }}
            >
              Try Gold
            </button>
          )}
        </div>

        <Link to="/world-map" data-testid="back-to-world-map" style={styles.backBtn}>
          Back to World Map
        </Link>
      </div>
    </div>
  )
}

function ConfettiBurst() {
  return (
    <div style={styles.confettiWrapper} aria-hidden="true">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          style={{
            ...styles.confettiPiece,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 0.5}s`,
            background: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
          }}
        />
      ))}
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
  header: {
    marginBottom: '24px',
  },
  heading: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--color-text)',
    margin: 0,
  },
  starsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  xpText: {
    fontSize: '22px',
    color: 'var(--color-text)',
    marginBottom: '8px',
  },
  totalXpText: {
    fontSize: '16px',
    color: 'var(--color-text-muted)',
    marginBottom: '28px',
  },
  nextLevels: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
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
