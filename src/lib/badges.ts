// TICKET-027: Badge Engine
import { supabase } from './supabase'
import type { Badge, PupilProgress } from '../types'

/**
 * Awards a badge if the pupil hasn't already earned it.
 * Returns the Badge row if newly awarded, or null if already earned.
 */
export async function awardBadgeIfNew(
  pupilId: string,
  badgeCode: string,
): Promise<Badge | null> {
  // Look up the badge by code
  const { data: badge, error: badgeErr } = await supabase
    .from('badges')
    .select('*')
    .eq('code', badgeCode)
    .maybeSingle()

  if (badgeErr || !badge) return null

  const typedBadge = badge as Badge

  // Check if already earned
  const { data: existing } = await supabase
    .from('pupil_badges')
    .select('id')
    .eq('pupil_id', pupilId)
    .eq('badge_id', typedBadge.id)
    .maybeSingle()

  if (existing) return null

  // Award the badge
  const { error: insertErr } = await supabase.from('pupil_badges').insert({
    pupil_id: pupilId,
    badge_id: typedBadge.id,
    earned_at: new Date().toISOString(),
  })

  if (insertErr) {
    console.error('Error awarding badge:', insertErr)
    return null
  }

  return typedBadge
}

/**
 * Awards the lesson badge for completing a lesson (e.g. 'lesson_1').
 */
export async function checkLessonBadge(
  pupilId: string,
  lessonNumber: number,
): Promise<Badge | null> {
  return awardBadgeIfNew(pupilId, `lesson_${lessonNumber}`)
}

/**
 * Awards the world badge if all lessons in the world have at least 1 bronze star.
 */
export async function checkWorldBadge(
  pupilId: string,
  worldId: number,
  allLessonIds: string[],
  progressRows: PupilProgress[],
): Promise<Badge | null> {
  const progressMap = new Map(progressRows.map((p) => [p.lesson_id, p]))
  const allBronzed = allLessonIds.every((id) => {
    const p = progressMap.get(id)
    return p && (p.bronze_stars ?? 0) >= 1
  })
  if (!allBronzed) return null
  return awardBadgeIfNew(pupilId, `world_${worldId}`)
}

/**
 * Awards the streak badge for hitting a streak milestone (e.g. 'streak_7').
 */
export async function checkStreakBadge(
  pupilId: string,
  streakCount: number,
): Promise<Badge | null> {
  const validMilestones = [3, 7, 14, 30, 60]
  if (!validMilestones.includes(streakCount)) return null
  return awardBadgeIfNew(pupilId, `streak_${streakCount}`)
}
