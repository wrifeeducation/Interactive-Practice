/**
 * useFullscreen — wraps the Web Fullscreen API.
 *
 * Usage:
 *   const { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen } = useFullscreen()
 *
 * Notes:
 *   - Syncs with the browser's native fullscreenchange event so the state is
 *     always accurate (e.g. when the user presses Escape to exit).
 *   - Also keeps Zustand uiStore.isPlayMode in sync, so the AppShell can
 *     apply/remove the `play-mode` body class correctly.
 */
import { useState, useEffect, useCallback } from 'react'
import { useUIStore } from '../stores/uiStore'

export interface UseFullscreenReturn {
  isFullscreen: boolean
  enterFullscreen: () => Promise<void>
  exitFullscreen: () => Promise<void>
  toggleFullscreen: () => Promise<void>
  supported: boolean
}

export function useFullscreen(): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const setPlayMode = useUIStore((s) => s.setPlayMode)

  // Check support once on mount
  const supported = typeof document !== 'undefined' && 'fullscreenEnabled' in document
    ? document.fullscreenEnabled
    : false

  // Keep local state in sync with browser fullscreen events
  useEffect(() => {
    function handleChange() {
      const active = !!document.fullscreenElement
      setIsFullscreen(active)
      setPlayMode(active)
    }

    document.addEventListener('fullscreenchange', handleChange)
    // Vendor prefixes for older Safari
    document.addEventListener('webkitfullscreenchange', handleChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleChange)
      document.removeEventListener('webkitfullscreenchange', handleChange)
    }
  }, [setPlayMode])

  const enterFullscreen = useCallback(async () => {
    const el = document.documentElement
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen()
      } else if ((el as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        await (el as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen()
      }
    } catch (err) {
      // Fullscreen request can fail if not triggered by a user gesture — fail silently
      console.warn('Fullscreen request failed:', err)
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.warn('Exit fullscreen failed:', err)
    }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen()
    } else {
      await enterFullscreen()
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen])

  return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen, supported }
}
