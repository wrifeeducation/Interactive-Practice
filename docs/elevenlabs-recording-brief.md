# ElevenLabs Recording Brief — WriFe Interactive Practice
**Date:** May 2026  
**Purpose:** Audio clips to be uploaded to Supabase Storage at `tts-audio/` and referenced in `src/lib/tts-manifest.ts`

## Voice Assignments

| Voice | ElevenLabs ID | Used For |
|---|---|---|
| **Alistair** | `l30f87tf05uxyknGdDw6` | Instructions, prompts, feedback, navigation |
| **Amelia** | `ZF6FPAbjXT4488VcRRnw` | Celebrations, XP, streaks, badges, boss |

## Settings (apply to both voices)
- **Stability:** 0.55  
- **Similarity Boost:** 0.80  
- **Style:** 0.20  
- **Speaker Boost:** on  
- **Output format:** mp3_44100_128  

---

## Category 1 — Activity Feedback (Alistair)

Save to: `tts-audio/feedback--correct.mp3`, `tts-audio/feedback--try-again.mp3` etc.

| Key | Script |
|---|---|
| `feedback--correct` | "Well done! That's exactly right." |
| `feedback--try-again` | "Not quite. Have another look and try again." |
| `feedback--partial` | "Good try! You got some of it right." |
| `feedback--revealed` | "Here's the model answer. Read it carefully." |

---

## Category 2 — XP & Progress (Amelia)

| Key | Script |
|---|---|
| `xp--earned` | "Ten XP! Great work!" |
| `xp--streak` | "You're on a roll — keep going!" |
| `xp--level-up` | "Level up! You're getting better every day!" |

---

## Category 3 — Lesson Completion (Amelia)

| Key | Script |
|---|---|
| `lesson-complete--1star` | "Lesson complete! One star. You can always go back and try again." |
| `lesson-complete--2stars` | "Lesson complete! Two stars — nicely done!" |
| `lesson-complete--3stars` | "Lesson complete! Three stars — fantastic work!" |

---

## Category 4 — Lesson Start (Alistair)

| Key | Script |
|---|---|
| `activity-intro` | "Here's your activity. Read it carefully, then choose your answer." |
| `activity-intro--write` | "This is a writing activity. Take your time and do your best." |
| `activity-intro--match` | "Match each item on the left with the correct item on the right." |
| `activity-intro--fillblank` | "Fill in the missing word or words in the sentence." |
| `activity-intro--checklist` | "Read through the checklist and tick everything that applies to your writing." |

---

## Category 5 — Match Activity (Alistair / Amelia)

| Key | Voice | Script |
|---|---|---|
| `match-complete` | Amelia | "Amazing! You matched them all!" |
| `match-pair-correct` | Alistair | "That's a match!" |
| `match-pair-wrong` | Alistair | "Those don't go together. Try again." |

---

## Category 6 — Write Activity (Alistair)

| Key | Script |
|---|---|
| `write-reveal` | "Here's one way you could have written it. How does yours compare?" |
| `write-submit` | "Brilliant. Now give yourself a star rating." |

---

## Category 7 — Boss Challenge (Amelia)

| Key | Script |
|---|---|
| `boss-intro` | "It's the Boss Challenge! Fifteen questions to prove you've mastered this world. Good luck!" |
| `boss-complete--great` | "Outstanding! You defeated the Boss! World badge earned!" |
| `boss-complete--good` | "Well done! You beat the Boss Challenge!" |
| `boss-complete--ok` | "You made it through! Keep practising to get an even better score." |

---

## Category 8 — Badges & World Unlock (Amelia)

| Key | Script |
|---|---|
| `badge-unlocked` | "New badge unlocked! Check your badge collection." |
| `world-unlocked` | "A new world has opened up! Keep going — there's so much more to discover." |
| `streak-3` | "Three days in a row! You're building a great habit." |
| `streak-7` | "Seven-day streak! You've been working so hard." |
| `streak-14` | "Fourteen days! You're a writing superstar." |
| `streak-30` | "Thirty days! That's an incredible streak. Well done!" |

---

## Category 9 — Navigation & UI (Alistair)

| Key | Script |
|---|---|
| `nav--world-map` | "Choose a lesson from the world map." |
| `nav--locked` | "This lesson is locked. Complete the previous lesson first." |
| `nav--rest` | "You're out of lives for now. Come back soon — they'll refill!" |
| `nav--lives-low` | "Only one life left. Take your time." |

---

## Total: 42 recordings

| Category | Count | Voice |
|---|---|---|
| Activity Feedback | 4 | Alistair |
| XP & Progress | 3 | Amelia |
| Lesson Completion | 3 | Amelia |
| Lesson Start | 5 | Alistair |
| Match Activity | 3 | Mixed |
| Write Activity | 2 | Alistair |
| Boss Challenge | 4 | Amelia |
| Badges & World Unlock | 6 | Amelia |
| Navigation & UI | 4 | Alistair |
| **Total** | **34** | — |

> **Note:** This brief replaces earlier counts that included duplicates. 34 unique clips are required. Upload each as MP3 to Supabase Storage bucket `tts-audio`, then add the key → URL mapping to `src/lib/tts-manifest.ts`.

---

## Supabase Storage Upload Path

```
Bucket: tts-audio (public)
Base URL: https://gzmgjkbtsvezfclmreru.supabase.co/storage/v1/object/public/tts-audio
Full example: .../tts-audio/feedback--correct.mp3
```

## Adding to tts-manifest.ts

After uploading, add each key to `src/lib/tts-manifest.ts`:

```typescript
export const TTS_MANIFEST: Record<string, string> = {
  // existing keys...
  'feedback--correct':     BASE + '/feedback--correct.mp3',
  'feedback--try-again':   BASE + '/feedback--try-again.mp3',
  // ... all 34 keys
}
```

The `useTTS` hook's `speak()` function will automatically fall back to the Web Speech API if the file is not yet uploaded, so you can record and upload in batches without breaking the app.
