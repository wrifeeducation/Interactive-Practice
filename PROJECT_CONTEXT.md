# WriFe Interactive Practice
*Last updated: 2026-05-01 · Session 8*

## Current state
The app is fully deployed at practice.wrife.co.uk and the complete pupil game loop is verified working end-to-end: World Map → LessonCard modal (tier selector) → ActivitySession (lives, XP, progress bar) → LessonComplete (stars, badge unlock). The admin dashboard has 8 tabs including a Create User tab backed by a Supabase Edge Function. Login and Signup both have Home navigation links.

**All 62 lesson records are now seeded with activities in the Supabase `activities` table.** Total: ~1128 activities across 62 lessons. All lessons are playable. Activities include mc, match, fillblank, write, and checklist types across bronze/silver/gold tiers.

**L27 special case:** Lesson 27 has two sub-lessons:
- L27a (lesson_number=27, id `47e230f8-3fdb-4d1d-8adc-a7223d348c77`): "What is a Paragraph?" — 20 activities using Black Beauty text
- L27b (lesson_number=62, id `6ed17895-a18b-4bc6-ae33-f5e7d74cf76b`): "Introduction to the Connect Grid" — 20 activities using The Railway Children opening. Stored as lesson_number=62 (constraint widened to 1–100).

**L12, L18, L23 top-up complete (Session 8):** L12 now has 20 activities, L18 has 17, L23 has 20 (previous 4 activities were mis-seeded and replaced). Note: some early lessons (L13, L15–L17, L19–L22, L24–L25, L28–L42) may still have fewer than 20 activities from the original parser run. Lessons L43–L61 all have 17–21 activities each.

## Next steps
1. **Further content quality pass** — audit remaining early lessons (L13, L15–L17, L19–L22, L24–L25) for thin or mis-seeded activities. All have source HTML in `WriFe Lessons/`.
2. **Stripe payments** — add subscription tiers (see `wrife-stripe-integration` skill). Currently all content is free.
3. **Parent dashboard** — post-MVP feature: parents viewing their child's XP/streak/badge progress.
4. **Git push reminder** — run `rm -f .git/index.lock` before each commit session if needed, then `git commit && git push` to deploy to Vercel.

## Key decisions
- **Admin dashboard rebuilt as tabbed page** — 8 tabs: Content, Analytics, Teachers, Pupils, Passwords, Admins, Create User, Schools (coming soon)
- **Create User uses Edge Function** — `create-user` Deno function holds service-role key server-side; admin creates any role (pupil/teacher/admin) without email confirmation
- **RLS infinite recursion fixed** — `SECURITY DEFINER` function `is_class_member()` breaks the `profiles → class_members → classes → class_members` cycle
- **GoTrue NULL token fix** — accounts created via raw SQL needed `confirmation_token` and related fields set to `''` (not NULL) via UPDATE
- **ActivitySession empty state** — shows "Coming Soon" + Back to World Map button instead of a blank page when a lesson has no activities
- **`authStore.fetchProfile` race condition fixed** — sets `loading: true` immediately; never overwrites a valid profile with null

## Files & locations
- `src/pages/ActivitySession.tsx` — lesson player; fixed empty state (no activities → "Coming Soon" + back button)
- `src/pages/admin/AdminPage.tsx` — 8-tab admin dashboard
- `src/pages/admin/tabs/CreateUserTab.tsx` — NEW: admin user creation form via Edge Function
- `src/pages/Login.tsx` — added ← Home link in header
- `src/pages/Signup.tsx` — added ← Home link in header; fixed post-signup routing for admin role
- `src/stores/authStore.ts` — fixed race condition in `fetchProfile`
- `supabase/functions/create-user/` — Deno Edge Function for admin user creation (deployed)

## Open questions
- Should admin Content tab show a diff before republishing a lesson?
- git `index.lock` keeps appearing — run `rm -f .git/index.lock` before each commit session

---

## Session log

| # | Date | Summary |
|---|------|---------|
| 8 | 2026-05-01 | Top-up seed pass: L12 (Adjectives) 7→20 acts, L18 (Statements and Questions) 9→17 acts, L23 (What is a Sentence?) replaced 4 mis-seeded acts with full 20 proper ones (7 bronze/8 silver/5 gold mc). Updated total_activities in lessons table. |
| 7 | 2026-05-01 | Wired play('correct')/play('incorrect') in ActivitySession.tsx. Fixed WorldNode click bug (whole row now clickable). Created teacher account (teacher@wrife.test / Teacher123!, class "Year 5 Test Class", invite code WRIFE01, pupil Alex enrolled). Rebuilt L26 (Active and Passive Voice) — replaced 5 broken parser artefact activities with 20 proper ones (7 bronze mc, 6 silver mc+fillblank, 6 gold write). Fixed generic titles on L12, L13, L14, L15, L19, L22–L26. |
| 6 | 2026-04-30 | Seeded L27a (20 activities, paragraph structure, Black Beauty text) and L27b (20 activities, Connect Grid, Railway Children text). L27b stored as lesson_number=62; constraint widened to 1–100. All 62 lessons now seeded. |
| 5 | 2026-04-30 | Bulk-seeded L45–L61 (20 activities each) — all 60 lessons now have activities in DB. Total ~1108 activities across 60 lessons. L27 remains empty (no source HTML). |
| 4 | 2026-04-30 | Bulk-seeded L01–L44 from per-lesson SQL files generated by the parser; 908 activities across 56 lessons inserted. |
| 3 | 2026-04-30 | Fixed admin login (NULL token + RLS recursion), added tabbed admin + Create User tab, added Home nav to Login/Signup, tested full pupil game loop end-to-end, fixed empty-state UX |
| 2 | 2026-04-30 | Deployed create-user Edge Function, built CreateUserTab, fixed auth race condition, fixed admin redirect |
| 1 | 2026-04-30 | Full architecture session: fluid CSS tokens, AppShell, useFullscreen, sound system (Howler.js), admin content tool (upload/parse/preview/edit/publish), `admin` role added to DB |
