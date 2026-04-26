# WriFe Interactive Practice — Pilot Readiness Checklist

## Phase Completion Status

### Phase 1 (TICKET-001–020): Foundation
- TICKET-001 ✅ Content Parser — 432 activities extracted
- TICKET-002 ✅ Supabase Schema Setup — all 11 tables, RLS policies applied
- TICKET-003 ✅ Activity Seed Script
- TICKET-004 ✅ Vite + React 18 + TypeScript project scaffold
- TICKET-005 ✅ Tailwind v4 + CSS design tokens
- TICKET-006 ✅ Supabase client singleton
- TICKET-007 ✅ Zustand auth store
- TICKET-008 ✅ Login page
- TICKET-009 ✅ Sign-up page
- TICKET-010 ✅ RoleRedirect component
- TICKET-011 ✅ Multiple Choice activity renderer
- TICKET-012 ✅ Match activity renderer
- TICKET-013 ✅ Fill-Blank activity renderer
- TICKET-014 ✅ Write activity renderer
- TICKET-015 ✅ Checklist activity renderer
- TICKET-016 ✅ ActivitySession page
- TICKET-017 ✅ XP award logic
- TICKET-018 ✅ Lives system
- TICKET-019 ✅ Pupil progress upsert
- TICKET-020 ✅ Lesson complete screen

### Phase 2 (TICKET-021–034): Gamification Shell
- TICKET-021 ✅ World Map page
- TICKET-022 ✅ WorldNode component
- TICKET-023 ✅ LessonCard modal
- TICKET-024 ✅ Bronze/Silver/Gold unlock flow
- TICKET-025 ✅ Daily streak counter
- TICKET-026 ✅ Streak milestone bonuses
- TICKET-027 ✅ Badge engine
- TICKET-028 ✅ Badge unlock celebration modal
- TICKET-029 ✅ Pupil badge shelf (/pupil/badges)
- TICKET-030 ✅ World Boss Challenge (/boss/:worldId)
- TICKET-031 ✅ Boss node on World Map
- TICKET-032 ✅ Next World unlock animation
- TICKET-033 ✅ XP/Level in nav bar
- TICKET-034 ✅ Lesson complete screen polish

### Phase 3 (TICKET-035–050): Teacher Dashboard + Polish
- TICKET-035 ✅ Teacher Dashboard Layout — sidebar + nested routes
- TICKET-036 ✅ Class Creation Flow — form, invite code, display
- TICKET-037 ✅ Pupil Join Class Flow — /pupil/join, Penny Pencil success
- TICKET-038 ✅ Class Overview Table — sortable, health indicators
- TICKET-039 ✅ Lesson Heatmap — 61×N grid, sticky row headers, legend
- TICKET-040 ✅ Pupil Profile Page — summary bar, progress grid, common mistakes
- TICKET-041 ✅ Common Mistakes Panel — top 10 wrong activities, expandable
- TICKET-042 ✅ Leaderboard Toggle — optimistic update, warning text
- TICKET-043 ✅ Pupil Leaderboard View — rank/XP/streak, medals, disabled state
- TICKET-044 ✅ vercel.json + .npmrc verified present
- TICKET-045 ✅ PWA Setup — vite-plugin-pwa, offline.html
- TICKET-046 ✅ Mobile Responsive Audit — sidebar hamburger, shimmer CSS
- TICKET-047 ✅ Supabase Auth URL verified — emailRedirectTo in Signup.tsx
- TICKET-048 ✅ Loading States + Error Boundaries — ErrorBoundary, LoadingSkeleton
- TICKET-049 ✅ Performance Audit — preconnect, lazy routes, loading="lazy" on mascots
- TICKET-050 ✅ This document

---

## Teacher Onboarding Flow

### How a teacher signs up and creates a class

1. Visit `https://interactive-practice.vercel.app/signup`
2. Enter full name, email, password — select **Teacher** role
3. Click **Create Account** — profile is created, redirects to `/teacher`
4. In the sidebar, click **Class Settings** (⚙️)
5. Complete the **Create Your Class** form with a class name
6. Click **Create Class** — a 6-character alphanumeric invite code is auto-generated
7. The invite code is displayed prominently with a **Copy** button — share with pupils

---

## Pupil Onboarding Flow

### How a pupil signs up and joins a class

1. Visit `https://interactive-practice.vercel.app/signup`
2. Enter full name, email, password — select **Pupil** role
3. Optionally enter the **Class Invite Code** (can also join later)
4. Click **Create Account** — redirects to `/world-map`
5. To join a class later: click **Join Class** in the World Map nav bar
6. At `/pupil/join`, enter the 6-letter code — auto-uppercased on input
7. On success, Penny Pencil celebrates and a confirmation is shown

### How to share the invite code with pupils

Teachers can find their code at `/teacher/settings`. Options:
- Read it aloud in class
- Write it on the board
- Share via school communication system (Google Classroom, etc.)
- Copy link: pupils enter at `/pupil/join`

---

## Known Limitations at Pilot Launch

- **Activity coverage**: Lessons L52–L61 (Genre Arena) have limited activities — some may show only 1–3 questions instead of the full 5–10 per tier
- **Attempt-number tracking**: v1 logic tracks first vs retry attempts; consecutive retries beyond attempt 2 all count as retries
- **XP over time chart**: Pupil profile does not yet include the weekly XP bar chart (noted in TICKET-040 spec but excluded from MVP to keep PupilProfile.tsx under 200 lines)
- **Push notifications**: Not implemented — streak reminders require app to be open
- **Admin role**: No school admin dashboard — teacher is the top role at pilot
- **Offline mode**: PWA caches Supabase responses (NetworkFirst); full offline lesson play is not guaranteed for first-time visits
- **Leaderboard timing**: Trophy nav link is always visible; if leaderboard is disabled, the page shows the Penny Pencil disabled state correctly

---

## Pilot Success Criteria

| Metric | Target |
|---|---|
| Pilot schools | 2–3 |
| Pupils completing ≥1 lesson | 50 |
| Teachers viewing dashboard | ≥2 |
| Average lesson star rating | ≥2.0 stars |
| Teacher satisfaction score | ≥4/5 |
| P0 bugs | 0 at launch |
| TypeScript errors | 0 |

---

## Contact & Feedback

- **Technical issues**: Open a GitHub issue or email the dev team
- **Feedback form**: To be shared with pilot teachers after onboarding
- **Bug priority**: P0 = app crash or data loss; P1 = feature broken; P2 = cosmetic
- **Response SLA**: P0 within 2 hours; P1 within 24 hours during pilot week
