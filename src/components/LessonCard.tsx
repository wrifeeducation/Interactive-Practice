// TICKET-023: Lesson Card Modal
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { LessonNode, PupilProgress, ActivityLevel } from '../types'
import { isTierUnlocked, tierUnlockCondition } from '../lib/unlocks'

interface LessonCardProps {
  lesson: LessonNode | null
  lessonId: string | null
  progress: PupilProgress | null
  worldColor: string
  onDismiss: () => void
}

interface TierButtonProps {
  tier: ActivityLevel
  label: string
  stars: number
  unlocked: boolean
  unlockHint: string
  lessonId: string
  worldColor: string
  tierColor: string
}

function StarRow({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <span style={{ fontSize: '16px' }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ color: i < count ? 'var(--color-gold)' : 'var(--color-border)' }}>
          ⭐
        </span>
      ))}
    </span>
  )
}

function TierButton({ tier, label, stars, unlocked, unlockHint, lessonId, tierColor }: TierButtonProps) {
  const navigate = useNavigate()

  return (
    <div
      style={{
        border: `2px solid ${unlocked ? tierColor : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        opacity: unlocked ? 1 : 0.6,
        background: unlocked ? 'var(--color-surface)' : 'var(--color-background)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span
          style={{ fontSize: '16px', fontWeight: 700, color: unlocked ? tierColor : 'var(--color-text-muted)' }}
          data-tts={`${label} tier`}
        >
          {unlocked ? null : '🔒 '}{label}
        </span>
        <StarRow count={stars} />
      </div>
      {unlocked ? (
        <button
          data-testid={`tier-btn-${tier}`}
          onClick={() => navigate(`/lesson/${lessonId}/${tier}`)}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            fontWeight: 600,
            background: tierColor,
            color: 'var(--color-text-on-dark)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          Play
        </button>
      ) : (
        <p
          style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}
          data-tts={`unlock condition: ${unlockHint}`}
        >
          {unlockHint}
        </p>
      )}
    </div>
  )
}

export default function LessonCard({ lesson, lessonId, progress, worldColor, onDismiss }: LessonCardProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onDismiss])

  return (
    <AnimatePresence>
      {lesson && lessonId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--color-overlay)',
              zIndex: 100,
            }}
            aria-hidden="true"
          />

          {/* Card */}
          <motion.div
            data-testid="lesson-card"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
              zIndex: 101,
              maxWidth: '600px',
              margin: '0 auto',
              overflow: 'hidden',
            }}
          >
            {/* World colour header */}
            <div
              style={{
                background: worldColor,
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2
                style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--color-text-on-dark)' }}
                data-tts={`lesson title: ${lesson.title}`}
              >
                {lesson.title}
              </h2>
              <button
                data-testid="lesson-card-dismiss"
                onClick={onDismiss}
                aria-label="Close lesson card"
                style={{
                  background: 'rgba(255,255,255,0.25)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  width: '36px',
                  height: '36px',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-on-dark)',
                  minWidth: '44px',
                  minHeight: '44px',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <TierButton
                tier="bronze"
                label="BRONZE"
                stars={progress?.bronze_stars ?? 0}
                unlocked={isTierUnlocked(progress, 'bronze')}
                unlockHint={tierUnlockCondition('bronze')}
                lessonId={lessonId}
                worldColor={worldColor}
                tierColor="var(--color-bronze)"
              />
              <TierButton
                tier="silver"
                label="SILVER"
                stars={progress?.silver_stars ?? 0}
                unlocked={isTierUnlocked(progress, 'silver')}
                unlockHint={tierUnlockCondition('silver')}
                lessonId={lessonId}
                worldColor={worldColor}
                tierColor="var(--color-silver)"
              />
              <TierButton
                tier="gold"
                label="GOLD"
                stars={progress?.gold_stars ?? 0}
                unlocked={isTierUnlocked(progress, 'gold')}
                unlockHint={tierUnlockCondition('gold')}
                lessonId={lessonId}
                worldColor={worldColor}
                tierColor="var(--color-gold)"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
