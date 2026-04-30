/**
 * uiStore — global UI state: play mode, sound preferences.
 * Sound mute is persisted in localStorage so it survives page reloads.
 */
import { create } from 'zustand'
import type { UIState } from '../types'

const MUTE_KEY = 'wrife_sound_muted'

function readMutePref(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeMutePref(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, String(muted))
  } catch {
    // localStorage unavailable (private browsing) — fail silently
  }
}

export const useUIStore = create<UIState>((set, get) => ({
  isPlayMode: false,
  soundMuted: readMutePref(),
  soundReady: false,

  setPlayMode: (active) => set({ isPlayMode: active }),

  setSoundMuted: (muted) => {
    writeMutePref(muted)
    set({ soundMuted: muted })
  },

  setSoundReady: (ready) => set({ soundReady: ready }),

  toggleMute: () => {
    const next = !get().soundMuted
    writeMutePref(next)
    set({ soundMuted: next })
  },
}))
