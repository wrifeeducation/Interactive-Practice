/**
 * AppShell — global infrastructure wrapper.
 *
 * Responsibilities:
 *  1. Applies/removes the `play-mode` CSS class on <body> when the lesson
 *     player enters/exits full-screen play mode.
 *  2. Ensures #root has the `wrift-app` class for full-width WriFe layout.
 *  3. Renders the floating play-mode exit button when play mode is active.
 *  4. Will host the global background audio element (Task 4: sound system).
 *
 * This component does NOT render page-level navigation — each page owns
 * its own nav/sidebar (WorldMap, TeacherDashboard etc. already have theirs).
 */
import { useEffect, type ReactNode } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useFullscreen } from '../../hooks/useFullscreen'

interface Props {
  children: ReactNode
}

// ── Play Mode Exit Button ────────────────────────────────────────
function PlayModeExitButton() {
  const { exitFullscreen } = useFullscreen()

  return (
    <button
      className="play-mode-exit-btn"
      onClick={exitFullscreen}
      aria-label="Exit play mode"
      data-testid="play-mode-exit-btn"
      title="Exit play mode (Esc)"
    >
      {/* ✕ icon — inline SVG so no external dependency */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 4L4 12M4 4l8 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}

// ── Mute Toggle Button ───────────────────────────────────────────
// Small floating button — always visible so users can silence sound easily.
function MuteToggle() {
  const { soundMuted, toggleMute, soundReady } = useUIStore()

  // Only show once sound is active (i.e. after first interaction)
  if (!soundReady) return null

  return (
    <button
      onClick={toggleMute}
      aria-label={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
      data-testid="mute-toggle-btn"
      title={soundMuted ? 'Unmute' : 'Mute'}
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 'var(--z-toast)' as never,
        width: 36,
        height: 36,
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        boxShadow: 'var(--shadow-md)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        transition: 'opacity var(--transition-fast)',
      }}
    >
      {soundMuted ? '🔇' : '🔊'}
    </button>
  )
}

// ── AppShell ─────────────────────────────────────────────────────
export default function AppShell({ children }: Props) {
  const isPlayMode = useUIStore((s) => s.isPlayMode)

  // Keep #root class in sync
  useEffect(() => {
    const root = document.getElementById('root')
    if (root) root.classList.add('wrift-app')
  }, [])

  // Apply / remove play-mode body class
  useEffect(() => {
    if (isPlayMode) {
      document.body.classList.add('play-mode')
    } else {
      document.body.classList.remove('play-mode')
    }
    return () => {
      document.body.classList.remove('play-mode')
    }
  }, [isPlayMode])

  return (
    <>
      {children}
      {isPlayMode && <PlayModeExitButton />}
      <MuteToggle />
    </>
  )
}
