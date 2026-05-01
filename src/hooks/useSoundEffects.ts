/**
 * useSoundEffects — WriFe sound effects hook.
 *
 * Uses Howler.js for reliable cross-browser Web Audio API playback.
 * Respects:
 *   - User mute preference (persisted in localStorage via uiStore)
 *   - Browser autoplay policy (sounds only activate after first user gesture)
 *   - prefers-reduced-motion (silences sounds for users who opt out)
 *
 * Usage in components:
 *   const { play, playBgMusic, stopBgMusic } = useSoundEffects()
 *   play('correct')
 *   play('click')
 *
 * The hook is safe to call in any component — Howler instances are
 * module-level singletons so they are created only once per session.
 */
import { useCallback, useEffect, useRef } from 'react'
import { Howl } from 'howler'
import { useUIStore } from '../stores/uiStore'
import {
  type SoundName,
  SOUND_PATHS,
  SOUND_VOLUMES,
  BG_MUSIC_PATH,
  BG_MUSIC_VOLUME,
} from '../lib/sounds'

// ── Module-level singletons ──────────────────────────────────────
// Howl instances persist for the lifetime of the page so each
// sound file is loaded only once.
const howls: Partial<Record<SoundName, Howl>> = {}
let bgMusic: Howl | null = null

function getHowl(name: SoundName): Howl {
  if (!howls[name]) {
    howls[name] = new Howl({
      src: SOUND_PATHS[name],   // already an array: [webm, wav]
      volume: SOUND_VOLUMES[name],
      preload: true,
    })
  }
  return howls[name]!
}

function getBgMusic(): Howl {
  if (!bgMusic) {
    bgMusic = new Howl({
      src: [BG_MUSIC_PATH],
      volume: BG_MUSIC_VOLUME,
      loop: true,
      preload: false,   // Don't preload music — load on demand to save bandwidth
    })
  }
  return bgMusic
}

// ── Reduced motion check ─────────────────────────────────────────
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ── Hook ─────────────────────────────────────────────────────────
export interface UseSoundEffectsReturn {
  /** Play a named sound effect */
  play: (name: SoundName) => void
  /** Start the background music loop */
  playBgMusic: () => void
  /** Pause the background music */
  stopBgMusic: () => void
  /** Is background music currently playing? */
  bgMusicPlaying: boolean
}

export function useSoundEffects(): UseSoundEffectsReturn {
  const { soundMuted, setSoundReady } = useUIStore()
  const bgMusicPlaying = useRef(false)

  // Mark sound as ready after first user interaction (browser autoplay policy)
  useEffect(() => {
    function unlock() {
      setSoundReady(true)
      // Resume Howler's audio context if it was suspended
      if (window.Howler && window.Howler.ctx?.state === 'suspended') {
        void window.Howler.ctx.resume()
      }
      window.removeEventListener('pointerdown', unlock, { capture: true })
      window.removeEventListener('keydown', unlock, { capture: true })
    }
    window.addEventListener('pointerdown', unlock, { capture: true })
    window.addEventListener('keydown', unlock, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true })
      window.removeEventListener('keydown', unlock, { capture: true })
    }
  }, [setSoundReady])

  // Sync Howler master mute with store
  useEffect(() => {
    if (window.Howler) {
      window.Howler.mute(soundMuted)
    }
  }, [soundMuted])

  const play = useCallback((name: SoundName) => {
    // Never play if muted or user prefers reduced motion
    if (soundMuted || prefersReducedMotion()) return
    try {
      const howl = getHowl(name)
      howl.play()
    } catch {
      // Fail silently — sound is non-critical
    }
  }, [soundMuted])

  const playBgMusic = useCallback(() => {
    if (soundMuted || prefersReducedMotion()) return
    const music = getBgMusic()
    if (!music.playing()) {
      music.play()
      bgMusicPlaying.current = true
    }
  }, [soundMuted])

  const stopBgMusic = useCallback(() => {
    if (bgMusic?.playing()) {
      bgMusic.pause()
      bgMusicPlaying.current = false
    }
  }, [])

  return {
    play,
    playBgMusic,
    stopBgMusic,
    bgMusicPlaying: bgMusicPlaying.current,
  }
}
