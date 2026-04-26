// TICKET-032: Next World Unlock Animation
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { World } from '../types'

interface WorldUnlockProps {
  completedWorld: World
  nextWorld: World | null
  worldBadgeEmoji: string
  onContinue?: () => void
}

function ConfettiBurst() {
  const colors = [
    'var(--color-gold)',
    'var(--color-brand-primary)',
    'var(--color-correct)',
    'var(--color-xp)',
    'var(--color-brand-secondary)',
  ]
  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}
    >
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '-10px',
            left: `${(i / 24) * 100}%`,
            width: '10px',
            height: '16px',
            borderRadius: '2px',
            background: colors[i % colors.length],
            animationName: 'confettiFall',
            animationDuration: '2.5s',
            animationTimingFunction: 'ease-in',
            animationFillMode: 'forwards',
            animationDelay: `${(i % 8) * 0.15}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function WorldUnlock({ completedWorld, nextWorld, worldBadgeEmoji, onContinue }: WorldUnlockProps) {
  const navigate = useNavigate()

  const handleContinue = () => {
    if (onContinue) onContinue()
    else navigate('/world-map')
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      handleContinue()
    }, 8000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: `linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))`,
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        textAlign: 'center',
        overflow: 'hidden',
      }}
      data-testid="world-unlock-screen"
    >
      <ConfettiBurst />

      <motion.div
        initial={{ scale: 0, y: 40 }}
        animate={{ scale: [0, 1.2, 1], y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ fontSize: '96px', lineHeight: 1, marginBottom: '16px', position: 'relative', zIndex: 1 }}
        aria-hidden="true"
      >
        {worldBadgeEmoji}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{
          color: 'var(--color-text-on-dark)',
          fontSize: '28px',
          fontWeight: 700,
          margin: '0 0 8px',
          position: 'relative',
          zIndex: 1,
        }}
        data-tts={`world ${completedWorld.id} complete`}
      >
        World {completedWorld.id} Complete!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: '20px',
          margin: '0 0 24px',
          position: 'relative',
          zIndex: 1,
        }}
        data-tts={`completed world name: ${completedWorld.name}`}
      >
        {completedWorld.emoji} {completedWorld.name}
      </motion.p>

      {nextWorld && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: '16px',
            margin: '0 0 32px',
            position: 'relative',
            zIndex: 1,
          }}
          data-tts={`next world: ${nextWorld.name}`}
        >
          Next up: {nextWorld.emoji} {nextWorld.name}
        </motion.p>
      )}

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        data-testid="world-unlock-continue"
        onClick={handleContinue}
        style={{
          padding: '14px 32px',
          fontSize: '18px',
          fontWeight: 700,
          background: 'rgba(255,255,255,0.2)',
          color: 'var(--color-text-on-dark)',
          border: '2px solid rgba(255,255,255,0.5)',
          borderRadius: 'var(--radius-lg)',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          minHeight: '44px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {nextWorld ? `Continue to ${nextWorld.name} →` : 'Back to World Map →'}
      </motion.button>
    </div>
  )
}
