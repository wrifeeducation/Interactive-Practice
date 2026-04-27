import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  xpTotal: number
  streak: number
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  clearAuth: () => void
  fetchProfile: (userId: string) => Promise<void>
  setXpTotal: (xp: number) => void
  setStreak: (s: number) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  loading: true,
  xpTotal: 0,
  streak: 0,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setXpTotal: (xpTotal) => set({ xpTotal }),
  setStreak: (streak) => set({ streak }),

  clearAuth: () => {
    set({ session: null, profile: null, loading: false, xpTotal: 0, streak: 0 })
  },

  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching profile:', error)
      set({ profile: null, loading: false })
      return
    }

    set({ profile: data as Profile | null, loading: false })
  },
}))
