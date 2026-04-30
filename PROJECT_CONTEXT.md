# WriFe Interactive Practice
*Last updated: 2026-04-30 · Session 1*

## Current state
The app has a solid working codebase (React 18, Vite, TypeScript strict, Supabase, Vercel). This session delivered the full architecture layer: fluid CSS tokens, play-mode infrastructure, a sound effects system, and a creator-only admin content management tool. All TypeScript checks pass (exit 0). The Supabase project is active (rxmitjrbrsqjeymsycoj). Michael's profile has been promoted to `role: 'admin'` and the `user_role` enum extended to include `admin`.

## Next steps
1. **Deploy** — push all changes to GitHub `main` so Vercel auto-deploys and the admin tool is live at `/admin`
2. **Real sound assets** — replace the silent placeholder `.wav` files in `public/sounds/` with real audio (correct chime, wrong buzz, badge fanfare, background loop). Use WebM format for smallest size.
3. **Wire `useSoundEffects`** into activity components — call `play('correct')` / `play('incorrect')` inside `ActivitySession.tsx` on answer submission; `play('click')` on nav buttons
4. **Wire `PlayModeButton`** into `ActivitySession.tsx` so pupils can enter full-screen play mode from the lesson player
5. **Test admin tool** — log in as Michael at `/admin`, upload rebuilt L1–L20 HTML files, verify parse, publish to Supabase

## Key decisions
- **AppShell is a thin infrastructure layer** — manages `play-mode` body class and mute toggle float only; page-level nav stays inside each page (WorldMap already has its own sidebar)
- **Admin route is creator-only** — `AdminGuard` checks `profile.role === 'admin'`; non-admins are silently redirected with no error page revealing the route exists
- **Sound system uses Howler.js** — module-level singletons, respects `prefers-reduced-motion`, mute persisted in `localStorage`, sounds only activate after first user gesture
- **`user_role` enum extended** — migration `add_admin_to_user_role_enum` added `'admin'`; migration `promote_creator_to_admin` set Michael's profile
- **Admin publish = clean replace** — publishing deletes all existing activities for a lesson then re-inserts; prevents duplicates on re-upload

## Files & locations
- `src/index.css` — fluid CSS tokens added: `--font-size-*` clamp scale, `--icon-*`, `--touch-target`, `--world-node-*`, `--z-*`, play-mode body class styles
- `src/stores/uiStore.ts` — NEW: isPlayMode, soundMuted, soundReady state
- `src/hooks/useFullscreen.ts` — NEW: Web Fullscreen API hook, syncs with uiStore
- `src/hooks/useSoundEffects.ts` — NEW: Howler.js sound hook
- `src/lib/sounds.ts` — NEW: sound name catalogue and volume defaults
- `src/lib/lessonParser.ts` — NEW: browser-compatible port of parse-lessons.cjs
- `src/components/layout/AppShell.tsx` — NEW: global infrastructure wrapper
- `src/components/ui/PlayModeButton.tsx` — NEW: reusable full-screen toggle button
- `src/components/AdminGuard.tsx` — NEW: admin-only route guard
- `src/pages/admin/AdminPage.tsx` — NEW: 3-step admin wizard container
- `src/pages/admin/UploadPanel.tsx` — NEW: drag-drop HTML upload + parse
- `src/pages/admin/PreviewPanel.tsx` — NEW: activity preview + inline edit
- `src/pages/admin/PublishPanel.tsx` — NEW: per-lesson publish status display
- `src/App.tsx` — updated: AppShell wrapper, AdminGuard route, lazy AdminPage
- `src/types/index.ts` — updated: `UserRole` includes `'admin'`; `UIState`, `ParsedActivity`, `ParsedLesson` types added
- `public/sounds/` — NEW: 10 silent placeholder WAV files (replace with real assets)

## Open questions
- What format/source will the real sound effects come from? (Need to decide before wiring into activity components)
- Should the admin tool show a diff vs current DB content before publishing? (Currently does a clean replace without a preview of what's changing in the DB)
- Michael is regenerating L1–L20 HTML files — once ready, use admin tool to upload and publish them

---

## Session log

| # | Date | Summary |
|---|------|---------|
| 1 | 2026-04-30 | Full architecture session: fluid CSS tokens, AppShell, useFullscreen, sound system (Howler.js), admin content tool (upload/parse/preview/edit/publish), `admin` role added to DB |
