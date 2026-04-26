import { supabase } from './supabase'
import type { ActivityLevel, AnswerRecord, StarRating } from '../types'

function calcStars(accuracy: number): StarRating {
  if (accuracy >= 0.9) return 3
  if (accuracy >= 0.6) return 2
  return 1
}

export async function upsertProgress(
  pupilId: string,
  lessonId: string,
  level: ActivityLevel,
  answers: AnswerRecord[],
): Promise<void> {
  if (answers.length === 0) return

  const correctCount = answers.filter((a) => a.isCorrect).length
  const accuracy = correctCount / answers.length
  const stars = calcStars(accuracy)
  const xpEarned = answers.reduce((sum, a) => sum + a.xpAwarded, 0)
  const starField = `${level}_stars` as const

  // Fetch existing row if any
  const { data: existing } = await supabase
    .from('pupil_progress')
    .select('id, bronze_stars, silver_stars, gold_stars, attempts')
    .eq('pupil_id', pupilId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  const existingStars: StarRating = existing
    ? ((existing as Record<string, unknown>)[starField] as StarRating) ?? 0
    : 0

  const bestStars: StarRating = Math.max(existingStars, stars) as StarRating
  const attempts = existing ? (existing.attempts as number) + 1 : 1

  const upsertData: Record<string, unknown> = {
    pupil_id: pupilId,
    lesson_id: lessonId,
    [starField]: bestStars,
    xp_earned: xpEarned,
    attempts,
    completed_at: new Date().toISOString(),
  }

  if (existing) {
    const { error } = await supabase
      .from('pupil_progress')
      .update(upsertData)
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating pupil_progress:', error)
    }
  } else {
    const { error } = await supabase
      .from('pupil_progress')
      .insert({ ...upsertData, bronze_stars: 0, silver_stars: 0, gold_stars: 0, [starField]: bestStars })

    if (error) {
      console.error('Error inserting pupil_progress:', error)
    }
  }
}
