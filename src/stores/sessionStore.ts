import { create } from 'zustand'
import type { SessionState, AnswerRecord } from '../types'

const INITIAL_LIVES = 5

export const useSessionStore = create<SessionState>((set, get) => ({
  livesRemaining: INITIAL_LIVES,
  xpThisSession: 0,
  currentIndex: 0,
  answersGiven: [],
  xpLocked: false,

  loseLife: () => {
    const { livesRemaining } = get()
    const next = Math.max(0, livesRemaining - 1)
    set({ livesRemaining: next, xpLocked: next === 0 ? true : get().xpLocked })
  },

  addXP: (amount: number) => {
    const { xpLocked } = get()
    if (xpLocked) return
    set((state) => ({ xpThisSession: state.xpThisSession + amount }))
  },

  nextActivity: () => {
    set((state) => ({ currentIndex: state.currentIndex + 1 }))
  },

  resetSession: () => {
    set({
      livesRemaining: INITIAL_LIVES,
      xpThisSession: 0,
      currentIndex: 0,
      answersGiven: [],
      xpLocked: false,
    })
  },

  recordAnswer: (record: AnswerRecord) => {
    set((state) => ({ answersGiven: [...state.answersGiven, record] }))
  },
}))
