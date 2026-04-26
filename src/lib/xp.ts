import type { ActivityType } from '../types'

export const XP_CORRECT = 10
export const XP_RETRY = 5

/**
 * Calculate XP for a given activity answer.
 * - mc / match / fillblank: 10 if correct first attempt, 5 if correct retry, 0 if wrong
 * - write: selfRating × 5 (always "correct")
 * - checklist: handled directly by ChecklistActivity renderer (not this function)
 */
export function calcXP(
  type: ActivityType,
  isCorrect: boolean,
  attemptNumber: number,
  selfRating?: number,
): number {
  if (type === 'write') {
    return (selfRating ?? 0) * 5
  }

  if (type === 'checklist') {
    // Handled by the renderer — return 0 here as a fallback
    return 0
  }

  // mc, match, fillblank
  if (!isCorrect) return 0
  return attemptNumber === 1 ? XP_CORRECT : XP_RETRY
}
