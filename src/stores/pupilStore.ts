/**
 * pupilStore — persists the active pupil session in localStorage.
 *
 * Pupils do not have a Supabase auth account used directly; they authenticate
 * via the pupil-login Edge Function which returns a real Supabase session.
 * This store caches the human-readable metadata (name, class, etc.) so
 * components can display it without extra DB calls.
 *
 * The Supabase session (access_token / refresh_token) is managed by the
 * normal authStore / supabase.auth.setSession() flow — this store only
 * holds the display metadata.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PupilSession {
  pupilId:   string
  name:      string
  username:  string
  classId:   string
  className: string
  classCode: string
  loggedInAt: string
}

interface PupilState {
  pupilSession: PupilSession | null
  setPupilSession: (session: PupilSession) => void
  clearPupilSession: () => void
}

export const usePupilStore = create<PupilState>()(
  persist(
    (set) => ({
      pupilSession: null,
      setPupilSession: (session) => set({ pupilSession: session }),
      clearPupilSession: () => set({ pupilSession: null }),
    }),
    {
      name: 'wrifePupilSession',
    }
  )
)
