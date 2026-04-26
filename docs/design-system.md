# WriFe Interactive Practice — Design System

## CSS Custom Properties

Copy this entire block into `src/index.css`. **Never hardcode hex values in component files.**

```css
:root {
  /* ── World colours (one per skill domain) ─────────────────────── */
  --color-world-1: #4CAF50;   /* Story Seeds — green */
  --color-world-2: #2196F3;   /* Grammar Toolkit — blue */
  --color-world-3: #9C27B0;   /* Sentence Builders — purple */
  --color-world-4: #FF9800;   /* Writer's Craft — orange */
  --color-world-5: #00BCD4;   /* Flow & Finish — cyan */
  --color-world-6: #F44336;   /* Genre Arena — red */

  /* ── Gamification colours ─────────────────────────────────────── */
  --color-xp:        #F7C948;
  --color-lives:     #E53935;
  --color-streak:    #FF6D00;
  --color-bronze:    #CD7F32;
  --color-silver:    #A8A9AD;
  --color-gold:      #FFD700;

  /* ── Brand ────────────────────────────────────────────────────── */
  --color-brand-primary:   #667EEA;   /* indigo — matches existing WriFe lessons */
  --color-brand-secondary: #764BA2;   /* purple */

  /* ── Surfaces ─────────────────────────────────────────────────── */
  --color-background: #F0F4FF;
  --color-surface:    #FFFFFF;
  --color-border:     #E0E7FF;
  --color-overlay:    rgba(0, 0, 0, 0.5);

  /* ── Text ─────────────────────────────────────────────────────── */
  --color-text:       #1A3A5C;
  --color-text-muted: #5A7A9C;
  --color-text-on-dark: #FFFFFF;

  /* ── Feedback ─────────────────────────────────────────────────── */
  --color-correct:   #4CAF50;
  --color-incorrect: #F44336;
  --color-hint:      #FF9800;
  --color-correct-bg:   #E8F5E9;
  --color-incorrect-bg: #FFEBEE;

  /* ── Difficulty tiers ─────────────────────────────────────────── */
  --color-bronze-bg: #FFF8E1;
  --color-silver-bg: #F5F5F5;
  --color-gold-bg:   #FFFDE7;

  /* ── Spacing scale (8px base) ─────────────────────────────────── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;

  /* ── Border radius ────────────────────────────────────────────── */
  --radius-sm:  8px;
  --radius-md:  12px;
  --radius-lg:  20px;
  --radius-xl:  32px;
  --radius-full: 9999px;

  /* ── Shadows ──────────────────────────────────────────────────── */
  --shadow-sm: 0 1px 4px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.12);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.16);

  /* ── Transitions ──────────────────────────────────────────────── */
  --transition-fast:   150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow:   400ms ease;
}
```

---

## Typography

| Use case | Size | Weight | Token |
|---|---|---|---|
| Page title | 28px | 700 | `text-[28px] font-bold` |
| Section heading | 22px | 600 | `text-[22px] font-semibold` |
| Question text | 20px | 500 | `text-[20px] font-medium` |
| Body / instructions | 18px | 400 | `text-[18px]` |
| Option / label | 18px | 500 | `text-[18px] font-medium` |
| Caption / muted | 14px | 400 | `text-[14px]` |

**Rules:**
- Minimum 18px for any text a pupil reads during an activity
- System sans-serif stack: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Never use decorative or condensed fonts for question/option text
- Minimum touch target: 44×44px on mobile (use `min-h-[44px] min-w-[44px]`)

---

## Component Specifications

### QuestionCard
A full-width card containing the current question.

```
┌─────────────────────────────────────────────────────┐
│  [Level badge: BRONZE]    [Lives: ❤️❤️❤️❤️❤️]          │
│  Progress: ████████░░░░  Activity 8 of 15            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📝 Instructions: Read the sentence below...        │
│                                                     │
│  Yesterday, I played football in the park.          │
│  Which word is in the PAST tense?                   │
│                                                     │
│  [Option A]  [Option B]  [Option C]                 │
│                                                     │
│                          [CHECK ANSWER]             │
└─────────────────────────────────────────────────────┘
```

Props: `activity`, `onAnswer(isCorrect, xp)`, `livesRemaining`, `currentIndex`, `totalActivities`
CSS: `background: var(--color-surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-md)`

### OptionButton
States and styles:

| State | Background | Border | Text |
|---|---|---|---|
| Default | `--color-surface` | `--color-border` | `--color-text` |
| Hover | `#F0F4FF` | `--color-brand-primary` | `--color-text` |
| Selected (unsubmitted) | `#EEF2FF` | `--color-brand-primary` | `--color-brand-primary` |
| Correct | `--color-correct-bg` | `--color-correct` | `--color-correct` |
| Incorrect | `--color-incorrect-bg` | `--color-incorrect` | `--color-incorrect` |

Minimum height: 56px. Padding: 12px 20px. Border radius: `--radius-md`. Full width on mobile.

### ProgressBar
```
[████████████░░░░░░░░]  60%
```
- Height: 8px. Background: `--color-border`. Fill: world colour (`--color-world-N`).
- Animate fill width with `transition: width 300ms ease`.

### LivesDisplay
```
❤️ ❤️ ❤️ 🖤 🖤   (3 of 5 lives remaining)
```
- Heart icons, filled = remaining, empty/dark = lost
- Animate lost heart with scale(0) + fade

### XPCounter
Floating "+10 XP" text that animates upward and fades out on each correct answer.
Implemented with Framer Motion `AnimatePresence` + `motion.div`.

### StreakBadge
```
🔥 7
```
Flame emoji + number. Glow animation on streak milestone unlock.

### StarRating (lesson complete)
Three stars animate in sequence (left → centre → right), each popping in with `scale(0) → scale(1.2) → scale(1)`. Earned stars are gold (`--color-gold`), unearned are grey.

### WorldMapNode

| Status | Style |
|---|---|
| `locked` | Grey, padlock icon, not clickable |
| `available` | World colour with subtle pulse animation |
| `in_progress` | World colour, half-filled star |
| `completed` | World colour, star count shown |
| `boss` | Special "boss" icon, animated glow when available |
| `coming_soon` | Grey, "Coming Soon" label |

---

## Animation Guidelines

Use **Framer Motion** for all significant animations. Keep animations snappy — pupils should never wait for an animation.

| Event | Animation | Duration |
|---|---|---|
| Correct answer | Green flash on card + `scale(1.02)` + confetti burst | 600ms |
| Wrong answer | Red flash on card + horizontal shake (`x: [-8, 8, -6, 6, 0]`) | 400ms |
| XP gain | "+10 XP" floats up 40px and fades | 800ms |
| Badge unlock | Full-screen modal slides up, badge scales in with bounce | 600ms |
| Star earned | Star pops in with `scale(0.5 → 1.3 → 1)` | 400ms |
| Level unlock | Banner slides down from top | 500ms |
| Page transition | `opacity: 0 → 1` + `y: 20 → 0` | 300ms |
| World Boss complete | Fireworks particle effect + World Badge reveal | 2000ms |

**Rules:**
- Reduce motion: check `prefers-reduced-motion` and skip decorative animations
- Never block interaction with an animation longer than 600ms
- Confetti: use a lightweight library or CSS keyframe burst — do NOT use a heavy canvas library

---

## Accessibility (WCAG AA)

- All colour combinations must pass 4.5:1 contrast ratio for normal text, 3:1 for large text
- Focus indicators: 2px solid `--color-brand-primary` outline on all interactive elements
- Keyboard navigation: Tab through all interactive elements, Enter/Space to activate
- Screen reader: all images have `alt`, all icons have `aria-label`, question text has `role="region"` with `aria-label`
- `data-tts` attribute on all question and option text (for future text-to-speech integration)
- `data-testid` on every interactive element (e.g., `data-testid="option-button-0"`)
