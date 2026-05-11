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
    // Set loading true so guards wait for the result
    set({ loading: true })
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching profile:', error)
      set({ loading: false })
      return
    }

    if (data) {
      // If the profiles row exists but has no first_name (school pupils are
      // provisioned via wrife.co.uk which stores the name in user_metadata),
      // backfill first_name from the JWT user_metadata.
      if (!data.first_name) {
        const { data: { user } } = await supabase.auth.getUser()
        const meta = user?.user_metadata ?? {}
        if (meta.first_name) data.first_name = meta.first_name as string
        if (!data.display_name && meta.display_name) data.display_name = meta.display_name as string
      }
      set({ profile: data as Profile, loading: false })
    } else {
      // No profiles row at all — school pupils may only exist in user_metadata.
      // Build a minimal Profile from the JWT so the name displays correctly.
      const { data: { user } } = await supabase.auth.getUser()
      const meta = user?.user_metadata ?? {}
      if (meta.first_name || meta.display_name) {
        set({
          profile: {
            id: userId,
            role: 'pupil',
            display_name: (meta.display_name as string | undefined) ?? null,
            first_name: (meta.first_name as string | undefined) ?? null,
            created_at: '',
          } as Profile,
          loading: false,
        })
      } else {
        set({ loading: false })
      }
    }
  },
}))
