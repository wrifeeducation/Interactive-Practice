/**
 * WF-IP-TTS-03: useTTS hook for WriFe Interactive Practice.
 * Adapted from wrifeapp/src/hooks/useTTS.ts (WF-031).
 *
 * Plays pre-generated ElevenLabs MP3s for known phrase keys;
 * falls back to Web Speech API for dynamic text.
 *
 * Respects the global soundMuted flag from uiStore.
 * Uses a __cancelled flag on the Audio element to suppress spurious
 * error/catch callbacks after intentional stop().
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { speak as ttsSpeak, stopSpeaking, isSpeaking as ttsIsSpeaking } from '../lib/tts'
import { useUIStore } from '../stores/uiStore'
import { TTS_MANIFEST } from '../lib/tts-manifest'

interface UseTTSReturn {
  speak: (textOrKey: string, onEnd?: () => void) => void
  stop: () => void
  isSpeaking: boolean
}

// Extend HTMLAudioElement with a cancellation flag so we can suppress
// play().catch() firing after we intentionally stop an element.
interface ManagedAudio extends HTMLAudioElement {
  __cancelled?: boolean
}

const TTS_RATE = 0.85  // child-appropriate speech rate for Web Speech fallback

export const useTTS = (): UseTTSReturn => {
  const soundMuted = useUIStore((s) => s.soundMuted)
  const [isSpeakingState, setIsSpeakingState] = useState(false)
  const audioRef = useRef<ManagedAudio | null>(null)

  // Poll Web Speech API state when not playing an <audio> element
  useEffect(() => {
    const interval = setInterval(() => {
      if (!audioRef.current || audioRef.current.paused) {
        setIsSpeakingState(ttsIsSpeaking())
      }
    }, 200)
    return () => clearInterval(interval)
  }, [])

  const speak = useCallback(
    (textOrKey: string, onEnd?: () => void) => {
      // Respect global mute preference
      if (soundMuted) {
        onEnd?.()
        return
      }

      // ── Pre-generated ElevenLabs file? ──────────────────────────────────
      const url = TTS_MANIFEST[textOrKey]
      if (url) {
        // Stop any in-flight audio — null handlers AND mark as cancelled BEFORE
        // clearing src. The __cancelled flag prevents the async play().catch()
        // rejection (AbortError) from triggering Web Speech fallback.
        if (audioRef.current) {
          audioRef.current.onended = null
          audioRef.current.onerror = null
          audioRef.current.__cancelled = true
          audioRef.current.pause()
          audioRef.current.src = ''
        }
        stopSpeaking()

        const audio = new Audio(url) as ManagedAudio
        audio.__cancelled = false
        audioRef.current = audio
        setIsSpeakingState(true)

        audio.onended = () => {
          setIsSpeakingState(false)
          onEnd?.()
        }
        audio.onerror = () => {
          if (audio.__cancelled) return
          // File missing or network error — fall through to Web Speech
          setIsSpeakingState(false)
          ttsSpeak(textOrKey, TTS_RATE, 1.1, onEnd)
          setIsSpeakingState(true)
        }

        audio.play().catch(() => {
          if (audio.__cancelled) return
          // Autoplay blocked — fall through to Web Speech
          ttsSpeak(textOrKey, TTS_RATE, 1.1, onEnd)
          setIsSpeakingState(true)
        })
        return
      }

      // ── Dynamic text: Web Speech API fallback ────────────────────────────
      ttsSpeak(textOrKey, TTS_RATE, 1.1, onEnd)
      setIsSpeakingState(true)
    },
    [soundMuted]
  )

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.__cancelled = true
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    stopSpeaking()
    setIsSpeakingState(false)
  }, [])

  return { speak, stop, isSpeaking: isSpeakingState }
}
