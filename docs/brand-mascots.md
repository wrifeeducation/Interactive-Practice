# WriFe Brand & Mascot Guide
## Instructions for all Claude Code agents — read before touching any UI

> ⚠️ IMPORTANT CORRECTION (April 2026): The previous version of this file described
> 6 AI-generated character mascots (Penny Pencil, Booksy, etc.). Those were incorrect.
> The real WriFe mascot is a single yellow pencil character with multiple poses and
> expressions. This file now reflects the real WriFe brand assets.

---

## Colour Palette (canonical — sourced from real WriFe UI design screenshots)

All tokens live in `src/index.css`. **Never hardcode hex values in component files.**

### Core Brand Colours

| Token | Hex | Source | Use |
|---|---|---|---|
| `--color-brand-primary` | `#6C5CE7` | Purple header in landing page + pupil dashboard | Nav, headers, logo background, active states |
| `--color-brand-secondary` | `#F5A623` | Orange CTA button on all WriFe screens | Primary buttons (Log In, Start, Play) |
| `--color-brand-accent` | `#F5C500` | Gold/yellow from mascot badges | Stars, XP counter, highlights |
| `--color-text` | `#2D3436` | Body text across all UI designs | All body text, headings |
| `--color-text-muted` | `#636E72` | Secondary labels | Subtitles, captions |
| `--color-background` | `#FDF8EE` | Warm cream — main app background | Page background |
| `--color-background-auth` | `#D4EBF8` | Light blue — login/signup pages | Auth page background only |
| `--color-surface` | `#FFFFFF` | Cards, modals, form inputs |
| `--color-border` | `#E8E0D5` | Warm grey | Card borders, input borders |

### World Colours (distinct, harmonious palette — not tied to individual mascots)

| World | Name | Token | Hex |
|---|---|---|---|
| 1 | Story Seeds | `--color-world-1` | `#6C5CE7` (Purple) |
| 2 | Grammar Toolkit | `--color-world-2` | `#00B894` (Teal) |
| 3 | Sentence Builders | `--color-world-3` | `#0984E3` (Blue) |
| 4 | Writer's Craft | `--color-world-4` | `#E17055` (Coral) |
| 5 | Flow & Finish | `--color-world-5` | `#FDCB6E` (Amber) |
| 6 | Genre Arena | `--color-world-6` | `#A29BFE` (Lavender) |

Each world also has a light background token: `--color-world-N-bg`

### Gamification Colours

| Token | Hex | Use |
|---|---|---|
| `--color-xp` | `#F5C500` | XP counter, floating XP text |
| `--color-streak` | `#F5A623` | Flame, streak counter |
| `--color-lives` | `#E74C3C` | Lives hearts |
| `--color-bronze` | `#CD7F32` | Foundation/Bronze tier |
| `--color-silver` | `#A8A9AD` | Application/Silver tier |
| `--color-gold` | `#F5C500` | Mastery/Gold tier |

---

## The WriFe Mascot — One Yellow Pencil Character

WriFe has **one mascot**: a friendly yellow pencil character. It appears in 16 variants
across `public/mascots/`. All files are PNG with white/cream backgrounds.

There is no set of named human characters. The AI-generated SVGs (Penny Pencil,
Booksy, Grammar Guru, etc.) have been removed. Do not recreate or reference them.

### Achievement Badges

These map directly to the app's difficulty tiers:

| File | Label | App Use |
|---|---|---|
| `badge-foundation.png` | FOUNDATION | **Bronze tier** badge — displayed on lesson complete, tier buttons |
| `badge-application.png` | APPLICATION | **Silver tier** badge — displayed on lesson complete, tier buttons |
| `badge-mastery.png` | MASTERY | **Gold tier** badge — displayed on lesson complete, tier buttons |
| `badge-achievement.png` | (wreath badge) | General achievement — world boss completion, special milestones |

### Full-Body Pencil Poses (character illustrations)

| File | Pose | When to Use |
|---|---|---|
| `pencil-waving.png` | Waving, smiling — welcoming | Login page, sign-up page, empty states, first visit |
| `pencil-celebrating.png` | Jumping with arms up — excited | Lesson complete (3 stars), badge unlock, world boss beaten |
| `pencil-thinking.png` | Finger on chin, thumbs up | Hint modal, question intro, "take your time" messages |
| `pencil-reading.png` | Holding and reading a paper | Lesson introduction, instructions, write activity prompt |

### Reaction Expressions (face close-ups — use at 48–64px)

| File | Expression | When to Use |
|---|---|---|
| `face-happy.png` | Big happy smile | Correct answer feedback |
| `face-thumbsup.png` | Smiling with thumbs up | Lesson level complete, well done messages |
| `face-writing.png` | Winking, pencil writing | Activity in progress, writing prompt |
| `face-worried.png` | Worried, wide eyes | Wrong answer, 0 lives Rest screen |

### UI Icons (not the mascot character — standalone graphic icons)

| File | Icon | When to Use |
|---|---|---|
| `icon-document-check.png` | Blue document with gold checkmark | Completed lesson node on world map |
| `icon-clipboard.png` | Clipboard with gold checkmark | Progress tracker, worksheets reference |
| `icon-practice.png` | Pencil + coloured grid | Practice activities, interactive session |
| `icon-reading.png` | Pencil inside open book | Lesson guide, reading comprehension |

### Sprite Sheet
`sprite-sheet.png` — all 16 variants in a 4×4 grid. Use for reference only.

---

## Where to Place Mascots — Implementation Rules

### Always

| Location | Asset | Size | Notes |
|---|---|---|---|
| Login page | `pencil-waving.png` | 160px | Right of form on desktop, above on mobile |
| Sign-up page | `pencil-waving.png` | 120px | Above form |
| Lesson complete — any | Tier badge (foundation/application/mastery) | 80px | Below star rating |
| Lesson complete — 3 stars | `pencil-celebrating.png` | 140px | Beside confetti |
| Badge unlock modal | `badge-mastery.png` or `badge-achievement.png` | 96px | Centre of modal |
| Rest screen (0 lives) | `face-worried.png` | 80px | Above encouraging message |
| Correct answer feedback | `face-happy.png` | 56px | Bottom corner of QuestionCard |
| Wrong answer feedback | `face-worried.png` | 56px | Bottom corner of QuestionCard |
| Write activity prompt | `pencil-reading.png` | 80px | Beside instructions |
| World Boss intro | `pencil-thinking.png` | 160px | Centre, "Are you ready?" framing |
| Join class success | `pencil-celebrating.png` | 120px | Celebrating |
| Empty state / no data | `pencil-waving.png` | 100px | Friendly empty state |

### Difficulty Tier Buttons (LessonCard)
Replace emoji labels with the real badge images:
- Bronze button → show `badge-foundation.png` (32px) + "Foundation"
- Silver button → show `badge-application.png` (32px) + "Application"
- Gold button → show `badge-mastery.png` (32px) + "Mastery"

### Do NOT
- Do not use mascot images in the **teacher dashboard** — professional context
- Do not show more than one full-body pose at a time
- Do not resize below 48px (detail lost)
- Do not apply CSS colour filters or overlays to the PNGs
- Do not reference any of the removed SVG character names in new code

---

## React Implementation Pattern

```tsx
// ✅ Correct — all mascot refs as URL strings
<img
  src="/mascots/pencil-waving.png"
  alt=""
  role="presentation"
  width={160}
  height={160}
  loading="lazy"
  className="mascot-waving"
/>

// ✅ Correct — tier badge mapped from level
const TIER_BADGE: Record<ActivityLevel, string> = {
  bronze: '/mascots/badge-foundation.png',
  silver: '/mascots/badge-application.png',
  gold:   '/mascots/badge-mastery.png',
}

// ✅ Correct — reaction face based on answer result
const reactionFace = isCorrect ? '/mascots/face-happy.png' : '/mascots/face-worried.png'

// ❌ Wrong — never import as module
import pencilWaving from '/mascots/pencil-waving.png'
```

### Animation classes (defined in `src/index.css`)
```css
.mascot-correct { animation: mascotBounce 0.6s ease; }
.mascot-wrong   { animation: mascotTilt 0.5s ease; }
```
Apply `mascot-correct` on correct answer, `mascot-wrong` on wrong answer — clears after animation via `onAnimationEnd`.

---

## WriFe Logo & UI Pattern

From the real UI design screenshots:
- **Logo**: Book icon (open book, blue) + bold "WriFe" text. Not a custom font — standard bold sans-serif.
- **Header/nav background**: `var(--color-brand-primary)` (#6C5CE7 purple) with white text
- **CTA buttons**: `var(--color-brand-secondary)` (#F5A623 orange) with white text, rounded corners (~8px)
- **Auth page background**: `var(--color-background-auth)` (#D4EBF8 light blue)
- **Main app background**: `var(--color-background)` (#FDF8EE warm cream)
- **Cards**: White surface with subtle warm border, 8–12px border radius
- **Tab navigation** (from Tab Layout.rtf): Teacher Guide | Presentation | Practice Activities | Worksheets | Progress Tracker | Assessment

---

## Files Available in `public/mascots/`

```
public/mascots/
  # Achievement badges (map to difficulty tiers)
  badge-foundation.png    ← Bronze / Foundation tier
  badge-application.png   ← Silver / Application tier
  badge-mastery.png       ← Gold / Mastery tier
  badge-achievement.png   ← General achievement / World boss

  # Full-body character poses
  pencil-waving.png       ← Welcome / Login / Greeting
  pencil-celebrating.png  ← 3 stars / Badge unlock / Boss beaten
  pencil-thinking.png     ← Hint / Question / Boss intro
  pencil-reading.png      ← Instructions / Write activity / Lesson intro

  # Reaction expressions (face close-ups, 48–64px)
  face-happy.png          ← Correct answer
  face-thumbsup.png       ← Well done / Level complete
  face-writing.png        ← In progress / Writing activity
  face-worried.png        ← Wrong answer / 0 lives

  # UI icons (standalone graphics, not the character)
  icon-document-check.png ← Completed lesson
  icon-clipboard.png      ← Progress / Worksheets
  icon-practice.png       ← Practice activities
  icon-reading.png        ← Reading / Lesson guide

  # Reference
  sprite-sheet.png        ← All 16 variants in 4×4 grid
```
