// TICKET-024: Bronze/Silver/Gold Unlock Flow — pure functions
import type { PupilProgress, ActivityLevel, LessonNode, LessonNodeStatus } from '../types'

/**
 * Derives the status of a lesson node from progress data.
 */
export function getLessonStatus(
  progressMap: Record<string, PupilProgress>,
  lessonNumber: number,
  worldLessons: LessonNode[],
  lessonId: string,
): LessonNodeStatus {
  const progress = progressMap[lessonId] ?? null
  const idx = worldLessons.findIndex((l) => l.lessonNumber === lessonNumber)
  const isFirst = idx === 0

  if (progress) {
    const totalStars =
      (progress.bronze_stars ?? 0) + (progress.silver_stars ?? 0) + (progress.gold_stars ?? 0)
    if (totalStars > 0 && progress.bronze_stars >= 1) {
      return 'completed'
    }
    // Has a progress row but bronze_stars = 0 means in_progress
    return 'in_progress'
  }

  // No progress row
  if (isFirst) return 'available'

  const prevLesson = worldLessons[idx - 1]
  if (!prevLesson) return 'locked'
  const prevProgress = progressMap[
    // prevLesson doesn't carry lessonId — we look it up by matching lessonNumber
    Object.keys(progressMap).find((id) => {
      // progressMap is keyed by lesson_id; we match via worldLessons
      const node = worldLessons.find((l) => l.lessonNumber === prevLesson.lessonNumber)
      return node && progressMap[id]?.lesson_id === id
    }) ?? ''
  ] ?? null

  if (prevProgress && (prevProgress.bronze_stars ?? 0) >= 1) return 'available'
  return 'locked'
}

/**
 * Simpler status computation used by WorldMap where we have
 * a lessonId → PupilProgress map and ordered lesson arrays.
 */
export function computeLessonStatus(
  progress: PupilProgress | null,
  lessonIndex: number,
  prevProgress: PupilProgress | null,
): LessonNodeStatus {
  if (progress) {
    if ((progress.bronze_stars ?? 0) >= 1) return 'completed'
    return 'in_progress'
  }
  if (lessonIndex === 0) return 'available'
  if (prevProgress && (prevProgress.bronze_stars ?? 0) >= 1) return 'available'
  return 'locked'
}

/**
 * Determines whether a tier is unlocked for a given lesson.
 */
export function isTierUnlocked(progress: PupilProgress | null, tier: ActivityLevel): boolean {
  if (tier === 'bronze') return true
  if (tier === 'silver') return (progress?.bronze_stars ?? 0) >= 2
  if (tier === 'gold') return (progress?.silver_stars ?? 0) >= 2
  return false
}

/**
 * Returns the tier unlock condition text for display in UI.
 */
export function tierUnlockCondition(tier: ActivityLevel): string {
  if (tier === 'silver') return 'Earn 2 Bronze ⭐ to unlock'
  if (tier === 'gold') return 'Earn 2 Silver ⭐ to unlock'
  return ''
}
