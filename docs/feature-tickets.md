# WriFe Interactive Practice — Feature Tickets

All MVP tickets ordered by dependency. Build in phase order.
Verify with `npx tsc -b --noEmit` after each ticket.

---

## Phase 1 — Foundation (Weeks 1–4)

### TICKET-001: Content Parser
**Phase:** Phase 1  
**Estimate:** 2 days  
**Depends on:** none  
**Acceptance criteria:**
- [ ] Script at `scripts/parse-lessons.cjs` reads all 61 HTML files from WriFe Lessons directory
- [ ] Outputs `content/lessons.json` with normalised activity objects for all parsed lessons
- [ ] Handles all 5 activity types: mc, write, match, fillblank, checklist
- [ ] Generates `content/parse-report.md` with per-lesson counts and methods used
- [ ] At least 400 total activities extracted across lessons 1–61
- [ ] ✅ COMPLETED — 432 activities extracted

### TICKET-002: Supabase Schema Setup
**Phase:** Phase 1  
**Estimate:** 2 hours  
**Depends on:** none  
**Acceptance criteria:**
- [ ] `database/schema.sql` applied to project `rxmitjrbrsqjeymsycoj`
- [ ] All 11 tables created: profiles, classes, class_members, worlds, lessons, activities, pupil_progress, pupil_responses, badges, pupil_badges, streaks
- [ ] All 4 enum types created: user_role, activity_level, activity_type, badge_category
- [ ] All 6 world rows seeded
- [ ] All 61 lesson rows seeded with correct world_id assignments
- [ ] All 75 badge reference rows seeded (61 lesson + 6 world + 5 streak + 3 speed)
- [ ] `database/rls-policies.sql` applied with RLS enabled on all tables
- [ ] ✅ COMPLETED

### TICKET-003: Activity Seed Script
**Phase:** Phase 1  
**Estimate:** 3 hours  
**Depends on:** TICKET-001, TICKET-002  
**Acceptance criteria:**
- [ ] Script at `scripts/seed-activities.cjs` reads `content/lessons.json`
- [ ] Inserts all activities into `activities` table with correct lesson_id foreign keys
- [ ] Updates `lessons.total_activities` column for each lesson
- [ ] Handles duplicate runs gracefully (upsert or skip existing)
- [ ] Reports count of activities inserted vs skipped

### TICKET-004: Vite Project Scaffold
**Phase:** Phase 1  
**Estimate:** 1 hour  
**Depends on:** none  
**Acceptance criteria:**
- [ ] React 18 + Vite + TypeScript strict mode project in repo root
- [ ] ✅ COMPLETED — project scaffolded, TypeScript compiles clean

### TICKET-005: Tailwind v4 + CSS Tokens
**Phase:** Phase 1  
**Estimate:** 1 hour  
**Depends on:** TICKET-004  
**Acceptance criteria:**
- [ ] Tailwind v4 configured via `@tailwindcss/vite` plugin in `vite.config.ts`
- [ ] All design system CSS variables defined in `src/index.css` (6 world colours, gamification, brand, surfaces, text, feedback)
- [ ] No hex values hardcoded in any component file
- [ ] ✅ COMPLETED

### TICKET-006: Supabase Client
**Phase:** Phase 1  
**Estimate:** 30 min  
**Depends on:** TICKET-004  
**Acceptance criteria:**
- [ ] `src/lib/supabase.ts` exports a single `supabase` client instance
- [ ] Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars
- [ ] Throws clear error if env vars missing
- [ ] `.env` file present locally, `.env.example` committed, `.env` in `.gitignore`
- [ ] ✅ COMPLETED

### TICKET-007: Zustand Auth Store
**Phase:** Phase 1  
**Estimate:** 1 hour  
**Depends on:** TICKET-006  
**Acceptance criteria:**
- [ ] `src/stores/authStore.ts` with session, profile, loading state
- [ ] `fetchProfile(userId)` reads from `profiles` table
- [ ] `clearAuth()` resets all state
- [ ] TypeScript strict — no `any` types
- [ ] ✅ COMPLETED

### TICKET-008: Login Page
**Phase:** Phase 1  
**Estimate:** 3 hours  
**Depends on:** TICKET-006, TICKET-007  
**Acceptance criteria:**
- [ ] Route `/login` renders a full-page login form
- [ ] Email + password fields with validation
- [ ] Supabase `signInWithPassword` on submit
- [ ] Shows loading state during auth
- [ ] Shows error message on invalid credentials
- [ ] Redirects to role-appropriate destination on success (pupil → `/world-map`, teacher → `/teacher`)
- [ ] All form elements have `data-testid` attributes

### TICKET-009: Sign-Up Page
**Phase:** Phase 1  
**Estimate:** 3 hours  
**Depends on:** TICKET-006, TICKET-007  
**Acceptance criteria:**
- [ ] Route `/signup` renders sign-up form with name, email, password, role selector (Pupil / Teacher)
- [ ] Creates Supabase auth user AND inserts `profiles` row in a single operation
- [ ] Role selector shows clear visual distinction between pupil and teacher
- [ ] Optional invite code field (for joining a class during sign-up)
- [ ] Redirects to `/world-map` or `/teacher` after successful signup
- [ ] Email confirmation disabled in Supabase settings for MVP (development speed)

### TICKET-010: RoleRedirect Component
**Phase:** Phase 1  
**Estimate:** 2 hours  
**Depends on:** TICKET-007, TICKET-008, TICKET-009  
**Acceptance criteria:**
- [ ] `src/components/RoleRedirect.tsx` handles all auth states
- [ ] No session → redirect to `/login`
- [ ] Session + no profile → redirect to `/signup` (incomplete onboarding)
- [ ] Session + `role === 'pupil'` → redirect to `/world-map`
- [ ] Session + `role === 'teacher'` → redirect to `/teacher`
- [ ] Loading state shows spinner, not blank screen

### TICKET-011: MC Activity Renderer
**Phase:** Phase 1  
**Estimate:** 4 hours  
**Depends on:** TICKET-005, TICKET-007  
**Acceptance criteria:**
- [ ] `src/components/activities/MCActivity.tsx` renders a multiple-choice question
- [ ] Shows question text, instruction, and 2–4 option buttons
- [ ] Option buttons have default/hover/selected/correct/incorrect visual states per design system
- [ ] On selecting an option and clicking Check, marks correct/incorrect with colour feedback
- [ ] Shows feedback text (correct or wrong message) after checking
- [ ] Emits `onAnswer(isCorrect: boolean, xp: number)` callback
- [ ] All interactive elements have `data-testid` and `data-tts`
- [ ] Min 18px font size for question text

### TICKET-012: Match Activity Renderer
**Phase:** Phase 1  
**Estimate:** 5 hours  
**Depends on:** TICKET-005  
**Acceptance criteria:**
- [ ] `src/components/activities/MatchActivity.tsx` renders a matching exercise
- [ ] Two columns: left items and right items
- [ ] Click left item to select, click right item to pair — draws a connection
- [ ] Correctly paired items turn green; wrong pairings turn red and reset
- [ ] All pairs must be matched before "Check" is enabled
- [ ] Emits `onAnswer(isCorrect, xp)` where isCorrect = all pairs correct first attempt
- [ ] Works on mobile (tap-based, not drag-and-drop for MVP)

### TICKET-013: Fill-Blank Activity Renderer
**Phase:** Phase 1  
**Estimate:** 3 hours  
**Depends on:** TICKET-005  
**Acceptance criteria:**
- [ ] `src/components/activities/FillBlankActivity.tsx` renders fill-in-the-blank
- [ ] Template string rendered with `<input>` fields at blank positions
- [ ] On check: correct blanks turn green, wrong turn red
- [ ] Shows full correct answer after checking
- [ ] Emits `onAnswer(isCorrect, xp)`

### TICKET-014: Write Activity Renderer
**Phase:** Phase 1  
**Estimate:** 3 hours  
**Depends on:** TICKET-005  
**Acceptance criteria:**
- [ ] `src/components/activities/WriteActivity.tsx` renders open writing prompt
- [ ] Multi-line textarea for pupil's response (min 100px height)
- [ ] "Reveal Answer" button shows the model answer
- [ ] Self-assessment: pupil rates their response 1–3 stars (shown after model answer is revealed)
- [ ] Star rating triggers `onAnswer(true, xp)` where xp = stars × 5
- [ ] Instruction text clearly explains the self-assessment process

### TICKET-015: Checklist Activity Renderer
**Phase:** Phase 1  
**Estimate:** 2 hours  
**Depends on:** TICKET-005  
**Acceptance criteria:**
- [ ] `src/components/activities/ChecklistActivity.tsx` renders a checklist
- [ ] Each item has a checkbox + text
- [ ] Submit button earns XP equal to number of checked items × 2
- [ ] Emits `onAnswer(true, xp)` — checklists always count as "correct"
- [ ] Items have `data-testid="checklist-item-{id}"`

### TICKET-016: ActivitySession Page
**Phase:** Phase 1  
**Estimate:** 6 hours  
**Depends on:** TICKET-011–TICKET-015, TICKET-017, TICKET-018  
**Acceptance criteria:**
- [ ] Route `/lesson/:lessonId/:level` renders the full activity sequence
- [ ] Shows correct renderer component based on `activity.type`
- [ ] Progress bar updates after each activity (`currentIndex / total`)
- [ ] Lives display updates when a wrong answer is given
- [ ] XP counter animates up on each correct answer (Framer Motion floating "+10 XP" text)
- [ ] Level badge (BRONZE / SILVER / GOLD) displayed in header
- [ ] On completing all activities, navigates to `/lesson/:lessonId/complete`
- [ ] State persisted to `pupil_responses` table after each answer

### TICKET-017: XP Award Logic
**Phase:** Phase 1  
**Estimate:** 2 hours  
**Depends on:** none  
**Acceptance criteria:**
- [ ] `src/lib/xp.ts` exports `calcXP(type, isCorrect, attemptNumber, selfRating?)` function
- [ ] mc/match/fillblank: 10 XP first correct attempt, 5 XP on retry, 0 XP wrong
- [ ] write: 0/5/10/15 XP based on self-rating 0/1/2/3 stars
- [ ] checklist: 2 XP per checked item
- [ ] XP never decreases — write only (no deduction for wrong answers)
- [ ] Pure function — 100% unit testable

### TICKET-018: Lives System
**Phase:** Phase 1  
**Estimate:** 2 hours  
**Depends on:** none  
**Acceptance criteria:**
- [ ] `src/stores/sessionStore.ts` tracks `livesRemaining` (starts at 5)
- [ ] Wrong answer on first attempt deducts 1 life
- [ ] Lives reaching 0 shows a Rest screen (not a hard block)
- [ ] Rest screen shows encouraging message and "Continue Anyway" button
- [ ] Continuing at 0 lives gives 0 XP for subsequent activities (not punitive, just no reward)
- [ ] Lives reset to 5 on starting a new lesson level

### TICKET-019: Pupil Progress Upsert
**Phase:** Phase 1  
**Estimate:** 2 hours  
**Depends on:** TICKET-016, TICKET-002  
**Acceptance criteria:**
- [ ] After completing a level, upserts a row in `pupil_progress`
- [ ] Calculates star rating: <60% = 1 star, 60–89% = 2 stars, ≥90% = 3 stars
- [ ] Updates `xp_earned`, `attempts`, `completed_at`
- [ ] Handles first completion and retry (keeps best star count)
- [ ] RLS check: only the authenticated pupil can write their own row

### TICKET-020: Lesson Complete Screen
**Phase:** Phase 1  
**Estimate:** 3 hours  
**Depends on:** TICKET-019, TICKET-005  
**Acceptance criteria:**
- [ ] Route `/lesson/:lessonId/complete` shown after finishing all activities in a level
- [ ] Animated star rating reveal (1–3 stars pop in sequence with Framer Motion)
- [ ] Shows XP earned this session
- [ ] Shows "Continue to Silver" or "Continue to Gold" button if next level unlocked
- [ ] Shows "Back to World Map" button
- [ ] Confetti animation on 3-star completion

---

## Phase 2 — Gamification Shell (Weeks 5–8)

### TICKET-021: World Map Page
**Phase:** Phase 2  
**Estimate:** 8 hours  
**Depends on:** TICKET-010, TICKET-020  
**Acceptance criteria:**
- [ ] Route `/world-map` renders all 6 worlds as scrollable cards
- [ ] Each world card shows: world name, emoji, colour, progress (X/Y lessons completed)
- [ ] Clicking a world expands it to show lesson nodes in a path layout
- [ ] Current lesson (next available) has a glowing pulse animation
- [ ] Previously completed lessons show their star rating
- [ ] Locked lessons are greyed out with a padlock icon
- [ ] Mobile-responsive: scrolls vertically on phone

### TICKET-022: WorldNode Component
**Phase:** Phase 2  
**Estimate:** 4 hours  
**Depends on:** TICKET-021  
**Acceptance criteria:**
- [ ] `src/components/WorldNode.tsx` renders a single lesson node
- [ ] All 5 status states styled correctly: locked, available, in_progress, completed, coming_soon
- [ ] Boss node has a distinct appearance (dragon/crown emoji, animated glow)
- [ ] Clicking available/completed node opens `LessonCard` modal
- [ ] `data-testid="world-node-{lessonNumber}"` on each node

### TICKET-023: Lesson Card Modal
**Phase:** Phase 2  
**Estimate:** 3 hours  
**Depends on:** TICKET-022  
**Acceptance criteria:**
- [ ] Modal slides up on tap/click of a lesson node
- [ ] Shows: lesson title, world colour, Bronze/Silver/Gold tier buttons with star count
- [ ] Locked tiers show padlock and unlock condition (e.g., "Earn 2 Bronze stars to unlock")
- [ ] Play button navigates to `/lesson/:lessonId/:level`
- [ ] Dismiss by tapping outside modal or pressing Escape
- [ ] Framer Motion slide-up animation

### TICKET-024: Bronze/Silver/Gold Unlock Flow
**Phase:** Phase 2  
**Estimate:** 3 hours  
**Depends on:** TICKET-019, TICKET-023  
**Acceptance criteria:**
- [ ] Bronze tier always unlocked for available lessons
- [ ] Silver unlocks when pupil has ≥2 bronze_stars on that lesson
- [ ] Gold unlocks when pupil has ≥2 silver_stars on that lesson
- [ ] Unlock state computed from `pupil_progress` table on load
- [ ] Visual indicator when a tier is newly unlocked (banner animation)

### TICKET-025: Daily Streak Counter
**Phase:** Phase 2  
**Estimate:** 3 hours  
**Depends on:** TICKET-019  
**Acceptance criteria:**
- [ ] `🔥 N` counter displayed in the nav bar for logged-in pupils
- [ ] Streak updated in `streaks` table after each lesson session completion
- [ ] Streak increments if `last_activity_date` was yesterday; resets to 1 if gap > 1 day
- [ ] Streak maintains current count if `last_activity_date` is today
- [ ] Longest streak recorded in `streaks.longest_streak`

### TICKET-026: Streak Milestone Bonuses
**Phase:** Phase 2  
**Estimate:** 2 hours  
**Depends on:** TICKET-025  
**Acceptance criteria:**
- [ ] On reaching 3, 7, 14, 30, 60 day streaks: award bonus XP (50, 100, 200, 500, 1000)
- [ ] Show a celebratory toast notification with the milestone and XP bonus
- [ ] Award the corresponding streak badge (TICKET-027)
- [ ] Each milestone fires only once per streak run

### TICKET-027: Badge Engine
**Phase:** Phase 2  
**Estimate:** 4 hours  
**Depends on:** TICKET-019, TICKET-025  
**Acceptance criteria:**
- [ ] `src/lib/badges.ts` exports `checkAndAwardBadges(pupilId, event)` function
- [ ] Events: `lesson_completed`, `world_boss_beaten`, `streak_milestone`, `level_mastered`
- [ ] Checks which badges are not yet earned and awards them
- [ ] Inserts into `pupil_badges` table (no duplicates — check first)
- [ ] Returns array of newly awarded badges (to trigger celebration modal)

### TICKET-028: Badge Unlock Celebration Modal
**Phase:** Phase 2  
**Estimate:** 3 hours  
**Depends on:** TICKET-027  
**Acceptance criteria:**
- [ ] Full-screen overlay slides up when a badge is unlocked
- [ ] Badge image (emoji), name, and description displayed
- [ ] Framer Motion: badge scales in with bounce, background fades in
- [ ] "Awesome!" dismiss button
- [ ] If multiple badges earned at once, shows them in sequence
- [ ] `data-testid="badge-unlock-modal"` on the overlay

### TICKET-029: Pupil Badge Shelf
**Phase:** Phase 2  
**Estimate:** 2 hours  
**Depends on:** TICKET-027  
**Acceptance criteria:**
- [ ] Route `/pupil/badges` shows all badges in a grid
- [ ] Earned badges: full colour with earned date
- [ ] Unearned badges: greyed out silhouette with "???" name
- [ ] Grouped by category: Lesson, World, Streak, Mastery, Speed
- [ ] Shows total count (e.g., "14 / 75 badges")

### TICKET-030: World Boss Challenge
**Phase:** Phase 2  
**Estimate:** 6 hours  
**Depends on:** TICKET-016, TICKET-019, TICKET-027  
**Acceptance criteria:**
- [ ] Route `/boss/:worldId` renders a 15-question mixed challenge from all world lessons
- [ ] Questions randomly sampled from all activity types in that world
- [ ] No lives system — Boss challenges are full attempts to completion
- [ ] On completion: award 500 XP, world badge, trigger next-world unlock animation
- [ ] Boss result saved in a `boss_completions` table (or flag in pupil_progress)
- [ ] Boss node only unlocked when all lessons in that world have ≥1 Bronze star

### TICKET-031: Boss Node on World Map
**Phase:** Phase 2  
**Estimate:** 2 hours  
**Depends on:** TICKET-021, TICKET-030  
**Acceptance criteria:**
- [ ] Each world ends with a Boss node (dragon/crown icon)
- [ ] Status: locked (until all lessons in world have Bronze) → available → completed
- [ ] Available boss node has pulsing glow animation in the world colour
- [ ] Completed boss shows the world badge emoji

### TICKET-032: Next World Unlock Animation
**Phase:** Phase 2  
**Estimate:** 2 hours  
**Depends on:** TICKET-030  
**Acceptance criteria:**
- [ ] After beating a World Boss, a full-screen celebration plays
- [ ] World badge revealed with fireworks particle effect
- [ ] "World X Complete!" title + world badge displayed
- [ ] "Unlock World Y" button navigates back to world map with next world highlighted
- [ ] Duration ≤3 seconds (skip button available)

### TICKET-033: Pupil XP and Level in Nav
**Phase:** Phase 2  
**Estimate:** 2 hours  
**Depends on:** TICKET-017  
**Acceptance criteria:**
- [ ] Persistent nav bar on all pupil pages shows: 🔥 streak, ⭐ XP total, pupil name
- [ ] XP level (1–50) displayed: every 500 XP = 1 level
- [ ] XP counter animates up when new XP is earned (Framer Motion)
- [ ] Nav is sticky at top on mobile

### TICKET-034: Lesson Complete Screen Polish
**Phase:** Phase 2  
**Estimate:** 2 hours  
**Depends on:** TICKET-020, TICKET-027  
**Acceptance criteria:**
- [ ] Star animation plays in sequence (left → centre → right)
- [ ] If new badges were earned, badge celebration fires before the complete screen
- [ ] XP summary shows: "You earned 85 XP this session!"
- [ ] Total XP running counter shows updated total
- [ ] "Next Lesson" button pre-computes and links to the next unlocked lesson

---

## Phase 3 — Teacher Dashboard + Polish (Weeks 9–12)

### TICKET-035: Teacher Dashboard Layout
**Phase:** Phase 3  
**Estimate:** 3 hours  
**Depends on:** TICKET-010  
**Acceptance criteria:**
- [ ] Route `/teacher` renders teacher dashboard with sidebar navigation
- [ ] Sidebar links: Overview, Heatmap, pupils list
- [ ] Shows teacher's name and class name in the header
- [ ] Lazy-loaded with React.lazy + Suspense
- [ ] Mobile-responsive (sidebar collapses to hamburger menu)

### TICKET-036: Class Creation Flow
**Phase:** Phase 3  
**Estimate:** 3 hours  
**Depends on:** TICKET-035  
**Acceptance criteria:**
- [ ] Teacher can create a class with a name
- [ ] A 6-character alphanumeric invite code is auto-generated
- [ ] Invite code displayed prominently and copyable
- [ ] Inserts row into `classes` table with teacher_id = auth.uid()
- [ ] Teacher can view all their classes

### TICKET-037: Pupil Join Class Flow
**Phase:** Phase 3  
**Estimate:** 2 hours  
**Depends on:** TICKET-036, TICKET-009  
**Acceptance criteria:**
- [ ] Pupil can enter invite code from their dashboard (`/pupil/join`)
- [ ] Invite code validated against `classes` table
- [ ] Inserts `class_members` row on match
- [ ] Shows confirmation: "You joined [Class Name]!"
- [ ] Join option also available during sign-up (TICKET-009)

### TICKET-038: Class Overview Table
**Phase:** Phase 3  
**Estimate:** 4 hours  
**Depends on:** TICKET-036  
**Acceptance criteria:**
- [ ] Table shows all pupils in teacher's class
- [ ] Columns: Name, Last Active, XP Total, Current Streak, Health (🟢/🟡🔴)
- [ ] Health: green = streak ≥3 + active last 3 days; amber = active last 7 days; red = inactive 7+ days
- [ ] Sortable by any column
- [ ] Clicking a pupil row opens their Pupil Profile (TICKET-040)

### TICKET-039: Lesson Heatmap
**Phase:** Phase 3  
**Estimate:** 5 hours  
**Depends on:** TICKET-038  
**Acceptance criteria:**
- [ ] Grid: 61 lesson columns × n-pupil rows
- [ ] Cell colour: grey = not started, #CD7F32 = bronze, #A8A9AD = silver, #FFD700 = gold
- [ ] Lesson numbers shown in header row
- [ ] Pupil names in row header
- [ ] Tooltips on hover: "L10: Basic Tenses — Silver (2 stars)"
- [ ] Horizontally scrollable on mobile

### TICKET-040: Pupil Profile Page
**Phase:** Phase 3  
**Estimate:** 4 hours  
**Depends on:** TICKET-038  
**Acceptance criteria:**
- [ ] Route `/teacher/pupil/:pupilId` shows individual pupil data
- [ ] XP over time chart (weekly bar chart using lightweight SVG or recharts)
- [ ] Per-lesson star ratings shown as a compact grid
- [ ] Badge count + badge shelf preview (top 6 badges earned)
- [ ] Common Mistakes panel (TICKET-041)
- [ ] "Last active: X days ago" displayed

### TICKET-041: Common Mistakes Panel
**Phase:** Phase 3  
**Estimate:** 3 hours  
**Depends on:** TICKET-040  
**Acceptance criteria:**
- [ ] Query `pupil_responses` for activities where `is_correct = false` and `attempt_number = 1`
- [ ] Show top 10 most-wrong activities for this pupil
- [ ] Each row: lesson name, activity question (truncated), wrong count
- [ ] Teacher can click to see the full question and correct answer
- [ ] This is the most actionable data in the whole dashboard — design for scannability

### TICKET-042: Class Leaderboard Toggle
**Phase:** Phase 3  
**Estimate:** 2 hours  
**Depends on:** TICKET-036  
**Acceptance criteria:**
- [ ] Toggle in class settings enables/disables the pupil leaderboard
- [ ] Default: disabled
- [ ] Updating `classes.leaderboard_enabled` in Supabase
- [ ] Clear warning label: "Pupils will be able to see each other's XP rankings"

### TICKET-043: Pupil Leaderboard View
**Phase:** Phase 3  
**Estimate:** 2 hours  
**Depends on:** TICKET-042  
**Acceptance criteria:**
- [ ] Route `/pupil/leaderboard` only accessible when `leaderboard_enabled = true` for pupil's class
- [ ] Ranked list: position, first name + last initial, XP total, streak
- [ ] Current pupil's row highlighted
- [ ] If leaderboard disabled: shows "Your teacher hasn't enabled the leaderboard yet"

### TICKET-044: Vercel + PWA Config
**Phase:** Phase 3  
**Estimate:** 1 hour  
**Depends on:** TICKET-004  
**Acceptance criteria:**
- [ ] `vercel.json` has SPA rewrite rule (`/(.*) → /index.html`)
- [ ] `.npmrc` has `legacy-peer-deps=true`
- [ ] `vite-plugin-pwa` installed and configured with basic manifest (name, icons, theme_color)
- [ ] App is installable on iOS Safari and Android Chrome
- [ ] Service worker caches visited lesson content for offline access
- [ ] ✅ vercel.json and .npmrc completed

### TICKET-045: Mobile Responsive Audit
**Phase:** Phase 3  
**Estimate:** 4 hours  
**Depends on:** All Phase 1 + 2 tickets  
**Acceptance criteria:**
- [ ] All pages tested at 375px, 768px, 1280px breakpoints
- [ ] No horizontal overflow at 375px
- [ ] Touch targets ≥44px on all interactive elements
- [ ] World Map scrolls smoothly on mobile
- [ ] ActivitySession usable one-handed on mobile

### TICKET-046: Supabase Auth URL Config
**Phase:** Phase 3  
**Estimate:** 30 min  
**Depends on:** Vercel deployment URL  
**Acceptance criteria:**
- [ ] Vercel deployment URL added to Supabase → Authentication → URL Configuration → Site URL
- [ ] Vercel URL added to Allowed Redirect URLs
- [ ] Auth flow tested end-to-end on production URL

### TICKET-047: Loading States + Error Boundaries
**Phase:** Phase 3  
**Estimate:** 3 hours  
**Depends on:** All Phase 1 + 2 tickets  
**Acceptance criteria:**
- [ ] Every page using React Query has a loading skeleton (not just a spinner)
- [ ] `src/components/ErrorBoundary.tsx` wraps all routes
- [ ] Error boundary shows friendly "Something went wrong" UI with retry button
- [ ] Network errors on lesson submission show a toast: "Your answer wasn't saved — please check your connection"

### TICKET-048: Performance Audit
**Phase:** Phase 3  
**Estimate:** 3 hours  
**Depends on:** TICKET-044, TICKET-045  
**Acceptance criteria:**
- [ ] Lighthouse mobile score ≥80 for Performance, Accessibility, Best Practices
- [ ] Heavy pages (Teacher Dashboard, Admin) lazy-loaded
- [ ] No image assets >200KB uncompressed
- [ ] Core Web Vitals: LCP <2.5s, CLS <0.1

### TICKET-049: Pilot School UAT
**Phase:** Phase 3  
**Estimate:** 1 week  
**Depends on:** All previous tickets  
**Acceptance criteria:**
- [ ] 2–3 pilot schools onboarded with teacher and pupil accounts
- [ ] At least 50 pupils complete at least 1 lesson
- [ ] Teacher dashboard viewed by at least 2 teachers
- [ ] Bug list compiled and prioritised
- [ ] Average lesson star rating ≥2.0 (validates difficulty calibration)
- [ ] Teacher satisfaction score ≥4/5 on post-pilot survey

### TICKET-050: Pilot Bug Fixes
**Phase:** Phase 3  
**Estimate:** 3 days  
**Depends on:** TICKET-049  
**Acceptance criteria:**
- [ ] All P0/P1 bugs from pilot fixed
- [ ] Full regression test of auth flow, lesson flow, teacher dashboard
- [ ] `npx tsc -b --noEmit` passes with zero errors
- [ ] Deployed to production and verified
