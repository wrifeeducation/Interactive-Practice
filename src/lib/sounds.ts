/**
 * sounds.ts — central catalogue of all WriFe sound effects.
 *
 * Each entry maps a semantic sound name to its public asset path.
 * Replace the placeholder .wav files in public/sounds/ with real
 * audio assets (WebM preferred for smallest size, with WAV fallback).
 *
 * Naming convention for final assets:
 *   public/sounds/<name>.webm  (primary — ~30–50% smaller than WAV)
 *   public/sounds/<name>.wav   (fallback for browsers without WebM support)
 *
 * To generate WebM from WAV:
 *   ffmpeg -i input.wav -c:a libopus -b:a 48k output.webm
 */

export type SoundName =
  | 'click'           // Any button tap / nav press
  | 'correct'         // Right answer first attempt
  | 'incorrect'       // Wrong answer / life lost
  | 'xp-gain'         // XP awarded (fires alongside correct)
  | 'star-earned'     // Star awarded at lesson end
  | 'badge-unlock'    // New badge earned
  | 'level-up'        // Pupil levels up
  | 'streak-milestone'// Streak day milestone (3/7/14/30/60)
  | 'boss-complete'   // World Boss challenge passed

/**
 * Primary source is WebM/Opus (smaller, better quality at low bitrate).
 * WAV is listed as fallback for browsers without Opus support (rare in 2025).
 * Howler accepts an array — it picks the first format the browser can play.
 */
export const SOUND_PATHS: Record<SoundName, string[]> = {
  'click':            ['/sounds/click.webm',            '/sounds/click.wav'],
  'correct':          ['/sounds/correct.webm',          '/sounds/correct.wav'],
  'incorrect':        ['/sounds/incorrect.webm',        '/sounds/incorrect.wav'],
  'xp-gain':          ['/sounds/xp-gain.webm',          '/sounds/xp-gain.wav'],
  'star-earned':      ['/sounds/star-earned.webm',      '/sounds/star-earned.wav'],
  'badge-unlock':     ['/sounds/badge-unlock.webm',     '/sounds/badge-unlock.wav'],
  'level-up':         ['/sounds/level-up.webm',         '/sounds/level-up.wav'],
  'streak-milestone': ['/sounds/streak-milestone.webm', '/sounds/streak-milestone.wav'],
  'boss-complete':    ['/sounds/boss-complete.webm',    '/sounds/boss-complete.wav'],
}

/** Background music asset path */
export const BG_MUSIC_PATH = '/sounds/bg-music.wav'

/** Default volumes per sound category (0–1) */
export const SOUND_VOLUMES: Record<SoundName, number> = {
  'click':            0.4,
  'correct':          0.7,
  'incorrect':        0.6,
  'xp-gain':          0.5,
  'star-earned':      0.8,
  'badge-unlock':     0.9,
  'level-up':         0.9,
  'streak-milestone': 0.8,
  'boss-complete':    1.0,
}

export const BG_MUSIC_VOLUME = 0.15  // Subtle background — never distracting
