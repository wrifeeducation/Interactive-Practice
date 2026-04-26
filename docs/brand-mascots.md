# WriFe Brand & Mascot Guide
## Instructions for all Claude Code agents — read before touching any UI

---

## Colour Palette (canonical — sourced from WriFe SVG graphics)

All tokens live in `src/index.css` as CSS custom properties.
**Never hardcode hex values in component files. Always use the variable.**

### Core Brand Colours

| Token | Hex | Source | Use |
|---|---|---|---|
| `--color-brand-primary` | `#4A90E2` | Feature icon backgrounds | Buttons, links, headers |
| `--color-brand-secondary` | `#FF6B9D` | Penny Pencil (pink) | CTA, warmth, welcome |
| `--color-brand-accent` | `#FFD54F` | Most-used WriFe SVG accent | Stars, XP, highlights |
| `--color-text` | `#2C3E50` | 109 uses across ALL SVGs | All body text |
| `--color-text-muted` | `#666666` | SVG label text | Secondary text |
| `--color-background` | `#F5F7FA` | Feature sheet background | Page background |
| `--color-surface` | `#FFFFFF` | Cards, modals |
| `--color-border` | `#E3F2FD` | Soft blue-tinted | Card borders |

### World Colours (each tied to its mascot character)

| World | Name | Mascot | Token | Hex | Light BG Token |
|---|---|---|---|---|---|
| 1 | Story Seeds | Booksy 📚 | `--color-world-1` | `#1976D2` | `--color-world-1-bg: #E3F2FD` |
| 2 | Grammar Toolkit | Grammar Guru 🦉 | `--color-world-2` | `#4CAF50` | `--color-world-2-bg: #E8F5E9` |
| 3 | Sentence Builders | Word Wizard 🧙 | `--color-world-3` | `#7E57C2` | `--color-world-3-bg: #EDE7F6` |
| 4 | Writer's Craft | Creative Kai 🎨 | `--color-world-4` | `#9C27B0` | `--color-world-4-bg: #F3E5F5` |
| 5 | Flow & Finish | Practice Pat 🏃 | `--color-world-5` | `#FF5722` | `--color-world-5-bg: #FBE9E7` |
| 6 | Genre Arena | Penny Pencil ✏️ | `--color-world-6` | `#FF6B9D` | `--color-world-6-bg: #FCE4EC` |

### Gamification Colours

| Token | Hex | Use |
|---|---|---|
| `--color-xp` | `#FFD54F` | XP counter, star fills, level indicator |
| `--color-lives` | `#FF5252` | Lives hearts |
| `--color-streak` | `#FF9800` | Flame emoji, streak counter |
| `--color-bronze` | `#CD7F32` | Bronze tier badge/label |
| `--color-silver` | `#A8A9AD` | Silver tier badge/label |
| `--color-gold` | `#FFD54F` | Gold tier badge/label (same as XP gold) |
| `--color-correct` | `#4CAF50` | Correct answer flash/bg |
| `--color-incorrect` | `#FF5252` | Wrong answer flash/bg |

---

## The 6 Mascots

All mascot SVGs are in `public/mascots/`. They are scalable vectors with transparent backgrounds — use at any size.

### Quick Reference

| File | Name | Hex | Personality | World |
|---|---|---|---|---|
| `penny-pencil.svg` | Penny Pencil ✏️ | `#FF6B9D` | Enthusiastic main guide, cheerleader | 6 + cross-platform |
| `booksy.svg` | Booksy 📚 | `#1976D2` | Story keeper, inclusive reader | 1 (Story Seeds) |
| `grammar-guru.svg` | Grammar Guru 🦉 | `#4CAF50` | Wise owl teacher, makes rules fun | 2 (Grammar Toolkit) |
| `word-wizard.svg` | Word Wizard 🧙 | `#7E57C2` | Vocabulary magician, loves language | 3 (Sentence Builders) |
| `creative-kai.svg` | Creative Kai 🎨 | `#9C27B0` | Imaginative artist, "no wrong way" | 4 (Writer's Craft) |
| `practice-pat.svg` | Practice Pat 🏃 | `#FF5722` | Energetic, "practice makes perfect" | 5 (Flow & Finish) |

### Character Details

**Penny Pencil** — `public/mascots/penny-pencil.svg`
- Pink/rose scheme (`#FF6B9D`), pencil dress, holds giant pencil + notebook with heart
- Voice: *"You can do this!"*, *"I'm so proud of you!"*
- Use for: Login welcome, sign-up page, progress celebrations, lesson complete screen, encouragement modals
- This is the **main face of WriFe** — Penny appears wherever a warm, encouraging presence is needed

**Booksy** — `public/mascots/booksy.svg`
- Blue scheme (`#1976D2`), glasses, holds open book
- Voice: *"Every story is special!"*, *"What will you write today?"*
- Use for: World 1 map card, story-type lessons (L1–L9), reading comprehension activities
- Also suits: Login page background (friendly, non-threatening)

**Grammar Guru** — `public/mascots/grammar-guru.svg`
- Owl with graduation cap, brown/gold tones, holds chalkboard
- Voice: *"Grammar is your friend!"*, *"Let me show you a trick!"*
- Use for: World 2 map card, grammar lessons (L10–L19), error-correction feedback
- Tip: Appears in the corner looking curious when a pupil gets something wrong (not judgemental)

**Word Wizard** — `public/mascots/word-wizard.svg`
- Purple/blue (`#7E57C2`), wizard hat, wand, spell book, floating words
- Voice: *"Words are magical!"*, *"The perfect word makes all the difference!"*
- Use for: World 3 map card, sentence/phrase lessons (L20–L31), vocabulary focus activities

**Creative Kai** — `public/mascots/creative-kai.svg`
- Purple (`#9C27B0`), paint-splattered smock, beret, palette + brush
- Voice: *"Imagine and create!"*, *"There are no mistakes, just happy accidents!"*
- Use for: World 4 map card, creative/craft lessons (L32–L45), brainstorming activities, show-don't-tell

**Practice Pat** — `public/mascots/practice-pat.svg`
- Orange-red (`#FF5722`), athletic wear, #1 shirt, stopwatch + checklist
- Voice: *"Let's do this!"*, *"10 minutes today = awesome tomorrow!"*
- Use for: World 5 map card, daily practice encouragement, streak celebrations, boss challenge intro

---

## Where to Place Mascots — Implementation Rules

### Always

| Location | Mascot | Size | Notes |
|---|---|---|---|
| Login page | Penny Pencil | 180px | Right side of auth card on desktop, above form on mobile |
| Sign-up page | Penny Pencil | 140px | Friendly welcome at top |
| World Map — World N card header | World N's mascot | 80px | Top-right corner of each world card |
| Boss Challenge intro | World N's mascot | 200px | Centre stage, "I'm the boss!" framing |
| Lesson Complete — 3 stars | Penny Pencil | 120px | Celebrating pose below stars |
| Badge unlock modal | Relevant mascot | 96px | Left of badge info; use world mascot for world badges |
| Rest screen (0 lives) | Practice Pat | 100px | Sympathetic but encouraging pose |

### Activity Session (small companion)
- Show the world's mascot as a small (48–64px) companion in the bottom-left corner of the QuestionCard
- On correct answer: mascot does a subtle bounce (CSS `@keyframes bounce`) 
- On wrong answer: mascot tilts head sympathetically (CSS `transform: rotate(-15deg)`)
- Never animate during question reading — only after the answer is checked

### World Map — Boss Node
- When boss is `available`: Practice Pat (energy/challenge) overlaid on the 🐉 node
- When boss is `completed`: World mascot holding the world badge

### Do NOT
- Do not use mascots in the teacher dashboard (professional context)
- Do not show more than 2 mascots on screen at once
- Do not resize below 48px (detail lost at small sizes)
- Do not apply CSS filters or colour overlays to the SVGs (they have their own colours)
- Do not animate mascots during activity questions — only on feedback/celebration screens

---

## React Implementation Pattern

```tsx
// ✅ Correct — use as <img> with role="presentation"
<img
  src="/mascots/penny-pencil.svg"
  alt=""
  role="presentation"
  width={120}
  height={150}
  className="mascot-penny"
/>

// ✅ Correct — world mascot mapped from worldId
const WORLD_MASCOTS: Record<number, string> = {
  1: '/mascots/booksy.svg',
  2: '/mascots/grammar-guru.svg',
  3: '/mascots/word-wizard.svg',
  4: '/mascots/creative-kai.svg',
  5: '/mascots/practice-pat.svg',
  6: '/mascots/penny-pencil.svg',
}

// ✅ Correct — CSS bounce on correct answer
// @keyframes mascotBounce defined in index.css, applied via class
```

Add to `src/index.css`:
```css
@keyframes mascotBounce {
  0%, 100% { transform: translateY(0); }
  40%       { transform: translateY(-12px); }
  60%       { transform: translateY(-6px); }
}
@keyframes mascotTilt {
  0%, 100% { transform: rotate(0deg); }
  50%       { transform: rotate(-15deg); }
}
.mascot-correct { animation: mascotBounce 0.6s ease; }
.mascot-wrong   { animation: mascotTilt 0.5s ease; }
```

---

## Colour Usage Rules (absolute)

1. **World N always uses `--color-world-N`** — never substitute another colour for a world accent
2. **`#2C3E50` is the only text colour** for headings and body — no other dark tones
3. **`#FFD54F` is the only gold/star/XP colour** — not `#FFD700`, not `#F7C948`
4. **Penny Pencil pink (`#FF6B9D`) is for warmth/CTA only** — not for error states
5. **`#F5F7FA` is the page background** — not white, not blue-tinted
6. When referencing a mascot's personal colour in UI (e.g., world card), use the world token (`--color-world-N`), not the hardcoded hex

---

## Files Available

```
public/mascots/
  penny-pencil.svg      ← Main guide, pink #FF6B9D
  booksy.svg            ← Story keeper, blue #1976D2
  grammar-guru.svg      ← Wise owl, green #4CAF50
  word-wizard.svg       ← Wizard, purple #7E57C2
  creative-kai.svg      ← Artist, deep purple #9C27B0
  practice-pat.svg      ← Energy star, orange #FF5722
  team-reference.svg    ← All 6 together (team overview page)
  hero-journey.svg      ← "Your Writing Journey Starts Here!" banner
  wrife-mascot.svg      ← Standalone WriFe mascot character
```
