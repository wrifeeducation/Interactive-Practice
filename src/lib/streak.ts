// TICKET-025: Daily Streak Counter
import { supabase } from './supabase'
import type { Streak } from '../types'

const STREAK_MILESTONES = [3, 7, 14, 30, 60]

function todayISO(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

function yesterdayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export interface StreakResult {
  newStreak: number
  longestStreak: number
  milestoneReached: number | null
}

export async function updateStreak(pupilId: string): Promise<StreakResult> {
  const today = todayISO()
  const yesterday = yesterdayISO()

  const { data: existing } = await supabase
    .from('streaks')
    .select('*')
    .eq('pupil_id', pupilId)
    .maybeSingle()

  const row = existing as Streak | null

  if (!row) {
    // First ever streak entry
    const newRow = {
      pupil_id: pupilId,
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: today,
    }
    await supabase.from('streaks').insert(newRow)
    const milestone = STREAK_MILESTONES.includes(1) ? 1 : null
    return { newStreak: 1, longestStreak: 1, milestoneReached: milestone }
  }

  const lastDate = row.last_activity_date?.slice(0, 10) ?? ''

  // Already updated today — no change
  if (lastDate === today) {
    return {
      newStreak: row.current_streak,
      longestStreak: row.longest_streak,
      milestoneReached: null,
    }
  }

  let newStreak: number
  if (lastDate === yesterday) {
    newStreak = row.current_streak + 1
  } else {
    newStreak = 1
  }

  const newLongest = Math.max(newStreak, row.longest_streak)

  await supabase
    .from('streaks')
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_activity_date: today,
    })
    .eq('id', row.id)

  // Check milestone: only fire if this exact count is a milestone
  // (and previous streak was one less, meaning we just hit it)
  const milestoneReached = STREAK_MILESTONES.includes(newStreak) ? newStreak : null

  return { newStreak, longestStreak: newLongest, milestoneReached }
}

export function streakBonusXP(milestone: number): number {
  const bonuses: Record<number, number> = { 3: 50, 7: 100, 14: 200, 30: 500, 60: 1000 }
  return bonuses[milestone] ?? 0
}
