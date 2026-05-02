// ============================================================
// WriFe Interactive Practice — Central Type Definitions
// ============================================================
// ALL TypeScript interfaces and types live in this file.
// Agents: NEVER create new interfaces in other files.
// Import from here: import type { X } from '../types'
// ============================================================

// ── Enums ────────────────────────────────────────────────────

export type UserRole = 'pupil' | 'teacher' | 'admin'
export type ActivityLevel = 'bronze' | 'silver' | 'gold'
export type ActivityType = 'mc' | 'write' | 'match' | 'fillblank' | 'checklist'
export type BadgeCategory = 'lesson' | 'world' | 'streak' | 'mastery' | 'speed'
export type LessonNodeStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'boss' | 'coming_soon'
export type StarRating = 0 | 1 | 2 | 3

// ── Database Row Types ────────────────────────────────────────

export interface Profile {
  id: string
  role: UserRole
  display_name: string | null
  created_at: string
}

export interface ClassRow {
  id: string
  teacher_id: string
  name: string
  invite_code: string
  leaderboard_enabled: boolean
  created_at: string
}

export interface ClassMember {
  id: string
  class_id: string
  pupil_id: string
  joined_at: string
}

export interface World {
  id: number
  name: string
  emoji: string
  colour_hex: string
  description: string
  lesson_start: number
  lesson_end: number
}

export interface Lesson {
  id: string
  world_id: number
  lesson_number: number
  title: string
  total_activities: number
  created_at: string
}

export interface Activity {
  id: string
  lesson_id: string
  level: ActivityLevel
  type: ActivityType
  sort_order: number
  question_json: MCQuestion | MatchQuestion | FillBlankQuestion | WriteQuestion | ChecklistQuestion
  answer_json: Record<string, unknown>
  created_at: string
}

export interface PupilProgress {
  id: string
  pupil_id: string
  lesson_id: string
  bronze_stars: StarRating
  silver_stars: StarRating
  gold_stars: StarRating
  xp_earned: number
  attempts: number
  completed_at: string | null
  updated_at: string
}

export interface PupilResponse {
  id: string
  pupil_id: string
  activity_id: string
  response_json: Record<string, unknown>
  is_correct: boolean
  attempt_number: number
  xp_awarded: number
  responded_at: string
}

export interface Badge {
  id: string
  code: string
  name: string
  description: string
  category: BadgeCategory
  image_emoji: string
  created_at: string
}

export interface PupilBadge {
  id: string
  pupil_id: string
  badge_id: string
  earned_at: string
}

export interface Streak {
  id: string
  pupil_id: string
  current_streak: number
  longest_streak: number
  last_activity_date: string
  updated_at: string
}

// ── Question Payload Types ────────────────────────────────────

export interface MCQuestion {
  question: string
  options: string[]
  correct: string
  feedback: {
    correct: string
    wrong: string
  }
}

export interface MatchQuestion {
  question: string
  instruction: string
  pairs: Array<{ left: string; right: string }>
}

export interface FillBlankQuestion {
  question: string
  template: string
  blanks: Array<{ index: number; answer: string }>
  feedback: string
}

export interface WriteQuestion {
  question: string
  prompt: string
  instruction: string
  modelAnswer: string
}

export interface ChecklistQuestion {
  question: string
  instruction: string
  items: Array<{ id: string; text: string }>
}

// ── UI State Types ────────────────────────────────────────────

export interface GameSession {
  lessonId: string
  lessonNumber: number
  level: ActivityLevel
  activities: Activity[]
  currentIndex: number
  livesRemaining: number
  xpThisSession: number
  answersGiven: Array<{
    activityId: string
    isCorrect: boolean
    xpAwarded: number
  }>
}

export interface LessonNode {
  lessonNumber: number
  title: string
  status: LessonNodeStatus
  bronzeStars: StarRating
  silverStars: StarRating
  goldStars: StarRating
  worldId: number
}

export interface WorldMapData {
  world: World
  lessons: LessonNode[]
  bossAvailable: boolean
  bossCompleted: boolean
}

// ── API Helper Types ──────────────────────────────────────────

export interface SupabaseResult<T> {
  data: T | null
  error: string | null
  loading: boolean
}

// ── Teacher Dashboard Types ───────────────────────────────────

export interface PupilSummary {
  profile: Profile
  xpTotal: number
  currentStreak: number
  lastActive: string | null
  health: 'green' | 'amber' | 'red'
  lessonsCompleted: number
}

export interface HeatmapCell {
  pupilId: string
  lessonNumber: number
  tier: 'none' | 'bronze' | 'silver' | 'gold'
}

export interface CommonMistake {
  activity: Activity
  wrongCount: number
  lastAttempted: string
}

// ── Session Store State ───────────────────────────────────────

export interface AnswerRecord {
  activityId: string
  isCorrect: boolean
  xpAwarded: number
}

export interface SessionState {
  livesRemaining: number
  xpThisSession: number
  currentIndex: number
  answersGiven: AnswerRecord[]
  xpLocked: boolean
  loseLife: () => void
  addXP: (amount: number) => void
  nextActivity: () => void
  resetSession: () => void
  recordAnswer: (record: AnswerRecord) => void
}

// ── Progress Helper Types ─────────────────────────────────────

export interface ProgressInput {
  pupilId: string
  lessonId: string
  level: ActivityLevel
  answers: AnswerRecord[]
}

// ── Auth Store Extra State ────────────────────────────────────

export interface AuthExtras {
  xpTotal: number
  streak: number
  setXpTotal: (xp: number) => void
  setStreak: (s: number) => void
}

// ── Badge Earned (with earned_at from join) ───────────────────

export interface EarnedBadge extends Badge {
  earned_at: string
}

// ── UI Store State ────────────────────────────────────────────

export interface UIState {
  /** True when the lesson player is in full-screen play mode */
  isPlayMode: boolean
  /** User-controlled sound mute toggle (persisted in localStorage) */
  soundMuted: boolean
  /** Sound system ready — false until first user interaction (browser policy) */
  soundReady: boolean
  setPlayMode: (active: boolean) => void
  setSoundMuted: (muted: boolean) => void
  setSoundReady: (ready: boolean) => void
  toggleMute: () => void
}

// ── Admin — Parsed Lesson Preview ────────────────────────────

export interface ParsedActivity {
  type: ActivityType
  level: ActivityLevel
  sort_order: number
  question_json: MCQuestion | MatchQuestion | FillBlankQuestion | WriteQuestion | ChecklistQuestion
  answer_json: Record<string, unknown>
  /** Editable flag — true if user has modified this activity in the preview */
  isDirty?: boolean
}

export interface ParsedLesson {
  lesson_number: number
  title: string
  world_id: number
  activities: ParsedActivity[]
  /** Set after parsing — the existing DB lesson id if the lesson already exists */
  existingLessonId?: string
}

// ── Boss Challenge Result ─────────────────────────────────────

export interface BossResult {
  correct: number
  total: number
  xpAwarded: number
}

// ── Streak Update Result ──────────────────────────────────────

export interface StreakUpdateResult {
  newStreak: number
  longestStreak: number
  milestoneReached: number | null
}
