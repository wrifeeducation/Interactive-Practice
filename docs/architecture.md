# Architecture — WriFe Interactive Practice

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Client)                           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  React 18 SPA (Vite + TS)                    │  │
│  │                                                              │  │
│  │  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐  │  │
│  │  │  React      │   │   Zustand    │   │  TanStack React  │  │  │
│  │  │  Router v6  │   │   Stores     │   │  Query           │  │  │
│  │  │  (pages)    │   │  (auth/game/ │   │  (server state   │  │  │
│  │  │             │   │   lesson)    │   │   cache)         │  │  │
│  │  └─────────────┘   └──────────────┘   └──────────────────┘  │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │              src/lib/supabase.ts                      │   │  │
│  │  │  (single Supabase client + all query/mutation helpers)│   │  │
│  │  └────────────────────────┬─────────────────────────────┘   │  │
│  └───────────────────────────┼──────────────────────────────────┘  │
│                              │ HTTPS / WSS                          │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Supabase (Project rxmitjrbrsqjeymsycoj)          │
│                                                                     │
│  ┌──────────────┐  ┌──────────────────┐  ┌────────────────────┐   │
│  │  Supabase    │  │    Postgres DB   │  │   Edge Functions   │   │
│  │  Auth        │  │                  │  │   (Deno / TS)      │   │
│  │              │  │  Tables:         │  │                    │   │
│  │  - Email +   │  │  • profiles      │  │  POST /ai-feedback │   │
│  │    password  │  │  • worlds        │  │  (post-MVP)        │   │
│  │  - Google    │  │  • lessons       │  │                    │   │
│  │    SSO       │  │  • activities    │  │                    │   │
│  │              │  │  • pupil_progress│  │                    │   │
│  │  JWT tokens  │  │  • pupil_response│  │                    │   │
│  │  issued to   │  │  • badges        │  │                    │   │
│  │  client      │  │  • pupil_badges  │  │                    │   │
│  │              │  │  • classes       │  │                    │   │
│  │              │  │  • class_members │  │                    │   │
│  │              │  │                  │  │                    │   │
│  │              │  │  RLS policies    │  │                    │   │
│  │              │  │  enforce role-   │  │                    │   │
│  │              │  │  based access    │  │                    │   │
│  └──────────────┘  └──────────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           Vercel CDN                                │
│   Auto-deploy from GitHub main branch                              │
│   vercel.json SPA rewrite: all routes → /index.html               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Key Tables)

```sql
-- User profiles (extends Supabase auth.users)
profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users,
  role        text CHECK (role IN ('pupil', 'teacher', 'admin')),
  display_name text,
  avatar_url  text,
  xp_total    integer DEFAULT 0,
  streak_days integer DEFAULT 0,
  last_active_date date,
  created_at  timestamptz DEFAULT now()
)

-- Lesson content (seeded from content/lessons.json)
lessons (
  id          integer PRIMARY KEY,  -- 1–61
  world_id    integer REFERENCES worlds,
  title       text,
  slug        text UNIQUE,
  order_in_world integer
)

activities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   integer REFERENCES lessons,
  tier        text CHECK (tier IN ('bronze', 'silver', 'gold')),
  type        text CHECK (type IN ('mc', 'write', 'match', 'fillblank', 'checklist')),
  order_index integer,
  question    text,
  options     jsonb,   -- array for mc/match; null for write/checklist
  answer      jsonb,   -- correct answer(s); null for self-assessed types
  hint        text
)

-- Per-pupil lesson progress
pupil_progress (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id       uuid REFERENCES profiles,
  lesson_id      integer REFERENCES lessons,
  tier           text CHECK (tier IN ('bronze', 'silver', 'gold')),
  stars          integer CHECK (stars BETWEEN 0 AND 3),
  xp_earned      integer DEFAULT 0,
  completed_at   timestamptz,
  attempt_count  integer DEFAULT 0,
  UNIQUE (pupil_id, lesson_id, tier)
)

-- Per-answer response log (used for teacher heatmap & common mistakes)
pupil_response (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id       uuid REFERENCES profiles,
  activity_id    uuid REFERENCES activities,
  answer_given   jsonb,
  is_correct     boolean,
  attempt_number integer,
  responded_at   timestamptz DEFAULT now()
)

-- Badge catalogue
badges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE,       -- e.g. 'lesson_01', 'world_1', 'streak_7'
  category    text CHECK (category IN ('lesson', 'world', 'streak', 'mastery', 'speed')),
  name        text,
  description text,
  icon_url    text
)

pupil_badges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id   uuid REFERENCES profiles,
  badge_id   uuid REFERENCES badges,
  earned_at  timestamptz DEFAULT now(),
  UNIQUE (pupil_id, badge_id)
)

-- Teacher ↔ class ↔ pupil relationships
classes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid REFERENCES profiles,
  name        text,
  leaderboard_enabled boolean DEFAULT true
)

class_members (
  class_id  uuid REFERENCES classes,
  pupil_id  uuid REFERENCES profiles,
  PRIMARY KEY (class_id, pupil_id)
)
```

---

## Auth Flow

```
User visits app
       │
       ▼
  AuthPage.tsx
  (email+password OR Google SSO button)
       │
       ▼
  supabase.auth.signInWithPassword()
  OR
  supabase.auth.signInWithOAuth({ provider: 'google' })
       │
       ▼
  Supabase issues JWT → stored in browser (localStorage / httpOnly cookie)
       │
       ▼
  authStore.ts receives session via onAuthStateChange listener
       │
       ▼
  Fetch profiles row for auth.users.id
  → store role ('pupil' | 'teacher') in authStore
       │
       ▼
  RoleRedirect component (in App.tsx router):
    role === 'pupil'   → navigate('/world-map')
    role === 'teacher' → navigate('/teacher/dashboard')
    no session         → navigate('/auth')
```

**Role storage:** The `role` field lives in the `profiles` table, not in JWT custom claims. This means agents should always read role from the Zustand `authStore` (which fetches from `profiles`), never trust client-side role claims for security-sensitive operations.

**RLS enforcement:** Every table has Row Level Security enabled. Pupils can only read/write their own rows. Teachers can read rows belonging to pupils in their classes. All policy definitions live in `database/schema.sql`.

---

## Lesson Session Data Flow

```
LessonPage mounts (lessonId, tier from URL params)
       │
       ▼
  useLesson(lessonId, tier) — React Query
  → supabase.from('activities').select(...)
    .eq('lesson_id', lessonId).eq('tier', tier)
    .order('order_index')
       │
       ▼
  lessonStore initialises:
    currentIndex = 0, answers = [], score = 0
       │
  ┌────▼──────────────────────────────────────────────┐
  │  For each activity:                               │
  │                                                   │
  │  QuestionCard renders correct activity component  │
  │  (MultipleChoice / WriteActivity / MatchActivity  │
  │   / FillBlank / Checklist)                        │
  │                                                   │
  │  Pupil submits answer                             │
  │       │                                           │
  │       ▼                                           │
  │  Validate answer (client-side for mc/match/fill)  │
  │  Self-assessed for write/checklist                │
  │       │                                           │
  │       ├── Correct (first attempt):                │
  │       │     gameStore.addXP(10)                   │
  │       │     animate: green flash + scale(1.05)    │
  │       │                                           │
  │       ├── Correct (retry):                        │
  │       │     gameStore.addXP(5)                    │
  │       │                                           │
  │       └── Incorrect:                              │
  │             gameStore.loseLife()                  │
  │             animate: shake + red flash            │
  │             if lives === 0 → navigate('/rest')    │
  │                                                   │
  │  Write pupil_response row to Supabase             │
  │  Move to next activity (currentIndex++)           │
  └───────────────────────────────────────────────────┘
       │
       ▼ (all activities completed)
  Calculate accuracy % → derive stars (1/2/3)
       │
       ▼
  Upsert pupil_progress row:
    { pupil_id, lesson_id, tier, stars, xp_earned, completed_at }
       │
       ▼
  Update profiles.xp_total (increment)
       │
       ▼
  Check badge conditions → award new badges → show BadgeUnlockPage if earned
       │
       ▼
  Update profiles.streak_days if new calendar day
       │
       ▼
  Navigate back to World Map (lesson node updates to show stars)
```

**Star calculation:**
- 3 stars: ≥ 80% correct on first attempts
- 2 stars: ≥ 50% correct on first attempts
- 1 star: < 50% correct (lesson still marked as attempted)

**Tier unlock logic (checked on World Map render):**
- Silver unlocked when: `pupil_progress` has ≥ 2 rows for this lesson with `tier='bronze'` AND `stars >= 1`
- Gold unlocked when: `pupil_progress` has ≥ 2 rows for this lesson with `tier='silver'` AND `stars >= 1`

---

## World Map Screen

```
WorldMapPage.tsx
│
├── Renders 6 WorldSection components (one per world)
│
└── Each WorldSection contains:
    ├── World title + world colour banner
    ├── Lesson nodes (L1–L9 for World 1, etc.)
    │    Each WorldMapNode shows:
    │    - Lesson number + title
    │    - Star rating (0–3 stars, from pupil_progress)
    │    - Lock icon if tier prerequisites not met
    │    - State: locked | available | completed
    │    - On click: navigate to /lesson/:id
    ├── BossNode (World Boss Challenge)
    │    - Locked until all lessons in world have ≥ 1 star
    │    - Shows 500 XP reward + World Badge preview
    │    - On click: navigate to /boss/:worldId
    └── Coming-soon nodes for L62, L63 (greyed out, no interaction)
```

**World Boss Challenge flow:**
1. 15 questions drawn randomly from all activities in the world (mix of tiers/types)
2. Displayed as a timed challenge (no hard time limit, but streak multiplier for speed)
3. Pass condition: ≥ 70% correct
4. On pass: award 500 XP + World Badge → unlock next world's first lesson
5. On fail: can retry after 24-hour cooldown (soft block)

---

## Teacher Dashboard Data Flow

```
TeacherDashboardPage.tsx (lazy-loaded)
│
├── useTeacherData(teacherId) — React Query
│    │
│    └── supabase.from('class_members')
│         .select('pupil_id, classes!inner(teacher_id)')
│         .eq('classes.teacher_id', teacherId)
│         → array of pupil_ids in teacher's classes
│
├── ClassHeatmap component
│    │
│    └── Query: pupil_progress for all class pupils
│         → 2D grid: rows = pupils, columns = lessons
│         → Cell colour = stars (0=grey, 1=bronze, 2=silver, 3=gold)
│         → Hover tooltip: exact score + timestamp
│
├── PupilProfile component (shown on row click)
│    │
│    ├── pupil_progress: XP total, streak, lesson completion %
│    └── Common mistakes:
│         SELECT activity_id, COUNT(*) as wrong_count
│         FROM pupil_response
│         WHERE pupil_id = :pupilId AND is_correct = false
│         GROUP BY activity_id
│         ORDER BY wrong_count DESC
│         LIMIT 10
│         → joined with activities.question for display
│
└── LeaderboardToggle
     └── Updates classes.leaderboard_enabled via upsert
          (only visible to teacher; pupils only see leaderboard if enabled)
```

---

## Edge Functions (Post-MVP)

**Endpoint:** `POST /functions/v1/ai-feedback`

Intended for AI-powered feedback on open `write` activity responses. Not built in MVP.

```typescript
// Request body
{
  pupil_id: string;
  activity_id: string;
  answer_text: string;
  lesson_context: string;
}

// Response
{
  feedback: string;        // 2–3 sentence encouragement + tip
  suggested_improvement: string;
}
```

The Edge Function will call an external LLM API (e.g., Anthropic Claude API) server-side so the API key is never exposed to the browser.

---

## Content Ingestion Pipeline

The 61 existing lesson HTML files must be parsed once to extract structured activity data.

```
Source files:
  /sessions/ecstatic-trusting-darwin/mnt/WriFe Lessons/Lesson_01/ → Lesson_61/
  (each folder contains HTML interactive practice files)
         │
         ▼
  scripts/parse-lessons.js  (Node.js, one-time run)
  - Reads each HTML file
  - Extracts: lesson number, title, activity type, questions, options, answers
  - Assigns tier (bronze/silver/gold) based on source week (W1–W2=bronze, W3–W4=silver, W5–W6=gold)
  - Outputs structured JSON
         │
         ▼
  content/lessons.json
  {
    lessons: [
      {
        id: 1,
        world_id: 1,
        title: "Personal Narrative",
        activities: [
          {
            tier: "bronze",
            type: "mc",
            order_index: 1,
            question: "...",
            options: ["A", "B", "C", "D"],
            answer: "A",
            hint: "..."
          }
        ]
      }
    ]
  }
         │
         ▼
  Seeded into Supabase via:
    supabase db push  (or direct INSERT in seed.sql)
    → lessons table + activities table
```

**Important:** `content/lessons.json` is a generated artefact. Do not hand-edit it. Re-run the parser if source HTML files change.

---

## PWA (Progressive Web App)

- Configured via `vite-plugin-pwa` in `vite.config.ts`
- Service worker uses **Workbox** with a network-first strategy for API calls and a cache-first strategy for static assets
- **Lesson content caching:** When a pupil visits a lesson, the service worker caches all activity data for that lesson so it is available offline
- **Offline fallback:** `public/offline.html` is shown when the user is offline and navigates to an uncached route
- **App manifest:** `public/manifest.json` defines app name, icons, theme colour (`#667EEA`), display mode `standalone`

```typescript
// vite.config.ts PWA configuration sketch
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/rxmitjrbrsqjeymsycoj\.supabase\.co\/.*/i,
        handler: 'NetworkFirst',
        options: { cacheName: 'supabase-api-cache', expiration: { maxAgeSeconds: 86400 } }
      }
    ]
  },
  manifest: {
    name: 'WriFe Interactive Practice',
    short_name: 'WriFe',
    theme_color: '#667EEA'
  }
})
```

---

## Routing Table

| Path | Component | Auth required | Role |
|---|---|---|---|
| `/` | Redirect → `/auth` or role home | — | — |
| `/auth` | AuthPage | No | Any |
| `/world-map` | WorldMapPage | Yes | pupil |
| `/lesson/:lessonId` | LessonPage | Yes | pupil |
| `/lesson/:lessonId/:tier` | LessonPage (tier scoped) | Yes | pupil |
| `/boss/:worldId` | BossChallengePage | Yes | pupil |
| `/rest` | RestPage | Yes | pupil |
| `/badge-unlock` | BadgeUnlockPage | Yes | pupil |
| `/teacher/dashboard` | TeacherDashboardPage (lazy) | Yes | teacher |
| `*` | NotFoundPage | No | Any |
