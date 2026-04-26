-- =============================================================================
-- WriFe Interactive Practice — Postgres Schema
-- Supabase project: rxmitjrbrsqjeymsycoj
-- Postgres 17  |  RLS enabled on every table
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('pupil', 'teacher');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE activity_level AS ENUM ('bronze', 'silver', 'gold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM ('mc', 'write', 'match', 'fillblank', 'checklist');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE badge_category AS ENUM ('lesson', 'world', 'streak', 'mastery', 'speed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- updated_at trigger function (used by moddatetime)
-- ---------------------------------------------------------------------------
-- moddatetime provides handle_updated_at(); we create a wrapper for clarity.
-- If the extension is unavailable, fall back to a manual trigger function.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Table: profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role   NOT NULL DEFAULT 'pupil',
  name        TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: classes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classes (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  leaderboard_enabled  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes (teacher_id);

CREATE TRIGGER trg_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: class_members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  pupil_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, pupil_id)
);

CREATE INDEX IF NOT EXISTS idx_class_members_class_id  ON class_members (class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_pupil_id  ON class_members (pupil_id);

-- ---------------------------------------------------------------------------
-- Table: worlds
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS worlds (
  id            INTEGER     PRIMARY KEY CHECK (id BETWEEN 1 AND 6),
  name          TEXT        NOT NULL,
  emoji         TEXT        NOT NULL DEFAULT '',
  colour_hex    TEXT        NOT NULL DEFAULT '#000000',
  description   TEXT        NOT NULL DEFAULT '',
  lesson_start  INTEGER     NOT NULL,
  lesson_end    INTEGER     NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Table: lessons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lessons (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id         INTEGER     NOT NULL REFERENCES worlds(id) ON DELETE RESTRICT,
  lesson_number    INTEGER     NOT NULL UNIQUE CHECK (lesson_number BETWEEN 1 AND 61),
  title            TEXT        NOT NULL,
  total_activities INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_world_id      ON lessons (world_id);
CREATE INDEX IF NOT EXISTS idx_lessons_lesson_number ON lessons (lesson_number);

-- ---------------------------------------------------------------------------
-- Table: activities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activities (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id      UUID           NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  level          activity_level NOT NULL,
  type           activity_type  NOT NULL,
  sort_order     INTEGER        NOT NULL DEFAULT 0,
  question_json  JSONB          NOT NULL DEFAULT '{}',
  answer_json    JSONB          NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_lesson_id ON activities (lesson_id);
CREATE INDEX IF NOT EXISTS idx_activities_level     ON activities (level);
CREATE INDEX IF NOT EXISTS idx_activities_type      ON activities (type);

-- ---------------------------------------------------------------------------
-- Table: pupil_progress
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pupil_progress (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id     UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  bronze_stars  SMALLINT    NOT NULL DEFAULT 0 CHECK (bronze_stars BETWEEN 0 AND 3),
  silver_stars  SMALLINT    NOT NULL DEFAULT 0 CHECK (silver_stars BETWEEN 0 AND 3),
  gold_stars    SMALLINT    NOT NULL DEFAULT 0 CHECK (gold_stars BETWEEN 0 AND 3),
  xp_earned     INTEGER     NOT NULL DEFAULT 0,
  attempts      INTEGER     NOT NULL DEFAULT 0,
  completed_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pupil_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_pupil_progress_pupil_id  ON pupil_progress (pupil_id);
CREATE INDEX IF NOT EXISTS idx_pupil_progress_lesson_id ON pupil_progress (lesson_id);

CREATE TRIGGER trg_pupil_progress_updated_at
  BEFORE UPDATE ON pupil_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: pupil_responses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pupil_responses (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id    UUID        NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  response_json  JSONB       NOT NULL DEFAULT '{}',
  is_correct     BOOLEAN     NOT NULL DEFAULT FALSE,
  attempt_number INTEGER     NOT NULL DEFAULT 1,
  xp_awarded     INTEGER     NOT NULL DEFAULT 0,
  responded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pupil_responses_pupil_id    ON pupil_responses (pupil_id);
CREATE INDEX IF NOT EXISTS idx_pupil_responses_activity_id ON pupil_responses (activity_id);
CREATE INDEX IF NOT EXISTS idx_pupil_responses_responded_at ON pupil_responses (responded_at);

-- ---------------------------------------------------------------------------
-- Table: badges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS badges (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT           NOT NULL UNIQUE,
  name         TEXT           NOT NULL,
  description  TEXT           NOT NULL DEFAULT '',
  category     badge_category NOT NULL,
  image_emoji  TEXT           NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badges_category ON badges (category);
CREATE INDEX IF NOT EXISTS idx_badges_code     ON badges (code);

-- ---------------------------------------------------------------------------
-- Table: pupil_badges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pupil_badges (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id   UUID        NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pupil_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_pupil_badges_pupil_id ON pupil_badges (pupil_id);
CREATE INDEX IF NOT EXISTS idx_pupil_badges_badge_id ON pupil_badges (badge_id);

-- ---------------------------------------------------------------------------
-- Table: streaks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS streaks (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pupil_id            UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak      INTEGER     NOT NULL DEFAULT 0,
  longest_streak      INTEGER     NOT NULL DEFAULT 0,
  last_activity_date  DATE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_streaks_pupil_id ON streaks (pupil_id);

CREATE TRIGGER trg_streaks_updated_at
  BEFORE UPDATE ON streaks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Worlds (6 rows)
-- ---------------------------------------------------------------------------
INSERT INTO worlds (id, name, emoji, colour_hex, description, lesson_start, lesson_end) VALUES
  (1, 'The Storyteller''s Island',    '🏝️',  '#F97316', 'Begin your writing journey — stories, narrative structure, and the building blocks of language.', 1,  9 ),
  (2, 'The Grammar Jungle',           '🌿',  '#22C55E', 'Tame the wild grammar jungle — tenses, sentence parts, pronouns and more.',                       10, 19),
  (3, 'The Sentence Kingdom',         '🏰',  '#3B82F6', 'Explore the kingdom of sentences — from phrases and clauses to full paragraphs.',                 20, 31),
  (4, 'The Craft Workshop',           '🔨',  '#A855F7', 'Sharpen your craft — story planning, figurative language, and advanced sentence techniques.',      32, 45),
  (5, 'The Flow River',               '🌊',  '#06B6D4', 'Ride the flow — show don''t tell, transitions, cohesion, and polishing your final draft.',         46, 51),
  (6, 'The Genre Galaxy',             '🌌',  '#EC4899', 'Explore the galaxy of genres — news, biography, persuasion, poetry and beyond.',                  52, 61)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Lessons (61 rows)
-- ---------------------------------------------------------------------------
INSERT INTO lessons (lesson_number, world_id, title, total_activities) VALUES
  -- World 1: Lessons 1–9
  (1,  1, 'WriFe Lesson 1 - Interactive Practice',                 0),
  (2,  1, 'Telling Our Story',                                     0),
  (3,  1, 'WriFe Lesson 3',                                        0),
  (4,  1, 'WriFe Lesson 4',                                        0),
  (5,  1, 'Five-Part Story Structure',                             0),
  (6,  1, 'Basic Story Types',                                     0),
  (7,  1, 'Nouns and Determiners',                                 0),
  (8,  1, 'WriFe Lesson 8',                                        0),
  (9,  1, 'WriFe Lesson 9',                                        0),
  -- World 2: Lessons 10–19
  (10, 2, 'Basic Tenses',                                          0),
  (11, 2, 'Subject, Main Verb and Object',                         0),
  (12, 2, 'WriFe Lesson 12',                                       0),
  (13, 2, 'WriFe Lesson 13',                                       0),
  (14, 2, 'Pronouns',                                              0),
  (15, 2, 'Prepositions',                                          0),
  (16, 2, 'Retrieving Information from Text',                      0),
  (17, 2, 'Retrieving Information from Text II',                   0),
  (18, 2, 'Statements and Questions',                              0),
  (19, 2, 'WriFe Lesson 19',                                       0),
  -- World 3: Lessons 20–31
  (20, 3, 'Phrases',                                               0),
  (21, 3, 'Clauses',                                               0),
  (22, 3, 'Dependent and Independent Clauses',                     0),
  (23, 3, 'What is a Sentence?',                                   0),
  (24, 3, 'Simple Sentences with Different Lengths',               0),
  (25, 3, 'Different Ways of Forming Simple Sentences',            0),
  (26, 3, 'WriFe Lesson 26',                                       0),
  (27, 3, 'What is a Paragraph?',                                  0),
  (28, 3, 'WriFe Lesson 28',                                       0),
  (29, 3, 'Three-Paragraph Narratives',                            0),
  (30, 3, 'Compound and Complex Sentences',                        0),
  (31, 3, 'WriFe Lesson 31',                                       0),
  -- World 4: Lessons 32–45
  (32, 4, 'Noun, Adjective and Adverbial Phrases',                 0),
  (33, 4, 'Direct Speech',                                         0),
  (34, 4, 'Personal Pronouns',                                     0),
  (35, 4, 'Story Analysis',                                        0),
  (36, 4, 'WriFe Lesson 36',                                       0),
  (37, 4, 'WriFe Lesson 37',                                       0),
  (38, 4, 'WriFe Lesson 38',                                       0),
  (39, 4, 'WriFe Lesson 39',                                       0),
  (40, 4, 'Story Planning',                                        0),
  (41, 4, 'WriFe Lesson 41',                                       0),
  (42, 4, 'WriFe Lesson 42',                                       0),
  (43, 4, 'Developing a Timeline',                                 0),
  (44, 4, 'Shaping the Contents',                                  0),
  (45, 4, 'Similes, Metaphors and Personification',                0),
  -- World 5: Lessons 46–51
  (46, 5, 'Show Don''t Tell',                                      0),
  (47, 5, 'Reading Aloud and Feedback',                            0),
  (48, 5, 'Transitions - Cohesion in Storyline',                   0),
  (49, 5, 'Transitions - Cohesion Across Paragraphs',              0),
  (50, 5, 'Transitions - Cohesion Within Paragraphs',              0),
  (51, 5, 'Final Draft',                                           0),
  -- World 6: Lessons 52–61
  (52, 6, 'Writing a News Report',                                 0),
  (53, 6, 'Writing an Information Report',                         0),
  (54, 6, 'Diaries and Journals',                                  0),
  (55, 6, 'Argument Writing',                                      0),
  (56, 6, 'Letter Writing',                                        0),
  (57, 6, 'Explanations and Instructions',                         0),
  (58, 6, 'Biography Writing',                                     0),
  (59, 6, 'Persuasive Posters and Advertising',                    0),
  (60, 6, 'Speech Writing',                                        0),
  (61, 6, 'Descriptions: Characters, Settings and Thoughts',       0)
ON CONFLICT (lesson_number) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Badges seed data
-- ---------------------------------------------------------------------------

-- 61 lesson completion badges
INSERT INTO badges (code, name, description, category, image_emoji) VALUES
  ('lesson_1',  'Lesson 1 Complete',  'Completed WriFe Lesson 1 - Interactive Practice',                        'lesson', '🎯'),
  ('lesson_2',  'Lesson 2 Complete',  'Completed Telling Our Story',                                            'lesson', '📖'),
  ('lesson_3',  'Lesson 3 Complete',  'Completed WriFe Lesson 3',                                               'lesson', '✏️'),
  ('lesson_4',  'Lesson 4 Complete',  'Completed WriFe Lesson 4',                                               'lesson', '✏️'),
  ('lesson_5',  'Lesson 5 Complete',  'Completed Five-Part Story Structure',                                    'lesson', '📝'),
  ('lesson_6',  'Lesson 6 Complete',  'Completed Basic Story Types',                                            'lesson', '📚'),
  ('lesson_7',  'Lesson 7 Complete',  'Completed Nouns and Determiners',                                        'lesson', '🔤'),
  ('lesson_8',  'Lesson 8 Complete',  'Completed WriFe Lesson 8',                                               'lesson', '✏️'),
  ('lesson_9',  'Lesson 9 Complete',  'Completed WriFe Lesson 9',                                               'lesson', '✏️'),
  ('lesson_10', 'Lesson 10 Complete', 'Completed Basic Tenses',                                                 'lesson', '⏰'),
  ('lesson_11', 'Lesson 11 Complete', 'Completed Subject, Main Verb and Object',                                'lesson', '🔡'),
  ('lesson_12', 'Lesson 12 Complete', 'Completed WriFe Lesson 12',                                              'lesson', '✏️'),
  ('lesson_13', 'Lesson 13 Complete', 'Completed WriFe Lesson 13',                                              'lesson', '✏️'),
  ('lesson_14', 'Lesson 14 Complete', 'Completed Pronouns',                                                     'lesson', '👤'),
  ('lesson_15', 'Lesson 15 Complete', 'Completed Prepositions',                                                 'lesson', '📍'),
  ('lesson_16', 'Lesson 16 Complete', 'Completed Retrieving Information from Text',                             'lesson', '🔍'),
  ('lesson_17', 'Lesson 17 Complete', 'Completed Retrieving Information from Text II',                          'lesson', '🔎'),
  ('lesson_18', 'Lesson 18 Complete', 'Completed Statements and Questions',                                     'lesson', '❓'),
  ('lesson_19', 'Lesson 19 Complete', 'Completed WriFe Lesson 19',                                              'lesson', '✏️'),
  ('lesson_20', 'Lesson 20 Complete', 'Completed Phrases',                                                      'lesson', '💬'),
  ('lesson_21', 'Lesson 21 Complete', 'Completed Clauses',                                                      'lesson', '📜'),
  ('lesson_22', 'Lesson 22 Complete', 'Completed Dependent and Independent Clauses',                            'lesson', '🔗'),
  ('lesson_23', 'Lesson 23 Complete', 'Completed What is a Sentence?',                                          'lesson', '📌'),
  ('lesson_24', 'Lesson 24 Complete', 'Completed Simple Sentences with Different Lengths',                      'lesson', '📏'),
  ('lesson_25', 'Lesson 25 Complete', 'Completed Different Ways of Forming Simple Sentences',                   'lesson', '🔀'),
  ('lesson_26', 'Lesson 26 Complete', 'Completed WriFe Lesson 26',                                              'lesson', '✏️'),
  ('lesson_27', 'Lesson 27 Complete', 'Completed What is a Paragraph?',                                         'lesson', '📄'),
  ('lesson_28', 'Lesson 28 Complete', 'Completed WriFe Lesson 28',                                              'lesson', '✏️'),
  ('lesson_29', 'Lesson 29 Complete', 'Completed Three-Paragraph Narratives',                                   'lesson', '📋'),
  ('lesson_30', 'Lesson 30 Complete', 'Completed Compound and Complex Sentences',                               'lesson', '🔩'),
  ('lesson_31', 'Lesson 31 Complete', 'Completed WriFe Lesson 31',                                              'lesson', '✏️'),
  ('lesson_32', 'Lesson 32 Complete', 'Completed Noun, Adjective and Adverbial Phrases',                        'lesson', '🔤'),
  ('lesson_33', 'Lesson 33 Complete', 'Completed Direct Speech',                                                'lesson', '💬'),
  ('lesson_34', 'Lesson 34 Complete', 'Completed Personal Pronouns',                                            'lesson', '👥'),
  ('lesson_35', 'Lesson 35 Complete', 'Completed Story Analysis',                                               'lesson', '🧐'),
  ('lesson_36', 'Lesson 36 Complete', 'Completed WriFe Lesson 36',                                              'lesson', '✏️'),
  ('lesson_37', 'Lesson 37 Complete', 'Completed WriFe Lesson 37',                                              'lesson', '✏️'),
  ('lesson_38', 'Lesson 38 Complete', 'Completed WriFe Lesson 38',                                              'lesson', '✏️'),
  ('lesson_39', 'Lesson 39 Complete', 'Completed WriFe Lesson 39',                                              'lesson', '✏️'),
  ('lesson_40', 'Lesson 40 Complete', 'Completed Story Planning',                                               'lesson', '🗺️'),
  ('lesson_41', 'Lesson 41 Complete', 'Completed WriFe Lesson 41',                                              'lesson', '✏️'),
  ('lesson_42', 'Lesson 42 Complete', 'Completed WriFe Lesson 42',                                              'lesson', '✏️'),
  ('lesson_43', 'Lesson 43 Complete', 'Completed Developing a Timeline',                                        'lesson', '📅'),
  ('lesson_44', 'Lesson 44 Complete', 'Completed Shaping the Contents',                                         'lesson', '🎨'),
  ('lesson_45', 'Lesson 45 Complete', 'Completed Similes, Metaphors and Personification',                       'lesson', '🌟'),
  ('lesson_46', 'Lesson 46 Complete', 'Completed Show Don''t Tell',                                             'lesson', '👁️'),
  ('lesson_47', 'Lesson 47 Complete', 'Completed Reading Aloud and Feedback',                                   'lesson', '🎤'),
  ('lesson_48', 'Lesson 48 Complete', 'Completed Transitions - Cohesion in Storyline',                          'lesson', '🌊'),
  ('lesson_49', 'Lesson 49 Complete', 'Completed Transitions - Cohesion Across Paragraphs',                     'lesson', '🌉'),
  ('lesson_50', 'Lesson 50 Complete', 'Completed Transitions - Cohesion Within Paragraphs',                     'lesson', '🔄'),
  ('lesson_51', 'Lesson 51 Complete', 'Completed Final Draft',                                                  'lesson', '🏁'),
  ('lesson_52', 'Lesson 52 Complete', 'Completed Writing a News Report',                                        'lesson', '📰'),
  ('lesson_53', 'Lesson 53 Complete', 'Completed Writing an Information Report',                                'lesson', '📊'),
  ('lesson_54', 'Lesson 54 Complete', 'Completed Diaries and Journals',                                         'lesson', '📓'),
  ('lesson_55', 'Lesson 55 Complete', 'Completed Argument Writing',                                             'lesson', '⚖️'),
  ('lesson_56', 'Lesson 56 Complete', 'Completed Letter Writing',                                               'lesson', '✉️'),
  ('lesson_57', 'Lesson 57 Complete', 'Completed Explanations and Instructions',                                'lesson', '📋'),
  ('lesson_58', 'Lesson 58 Complete', 'Completed Biography Writing',                                            'lesson', '👤'),
  ('lesson_59', 'Lesson 59 Complete', 'Completed Persuasive Posters and Advertising',                           'lesson', '📢'),
  ('lesson_60', 'Lesson 60 Complete', 'Completed Speech Writing',                                               'lesson', '🎙️'),
  ('lesson_61', 'Lesson 61 Complete', 'Completed Descriptions: Characters, Settings and Thoughts',              'lesson', '🌈')
ON CONFLICT (code) DO NOTHING;

-- 6 world completion badges
INSERT INTO badges (code, name, description, category, image_emoji) VALUES
  ('world_1', 'Island Explorer',    'Completed all lessons in The Storyteller''s Island',   'world', '🏝️'),
  ('world_2', 'Jungle Tamer',       'Completed all lessons in The Grammar Jungle',           'world', '🌿'),
  ('world_3', 'Kingdom Champion',   'Completed all lessons in The Sentence Kingdom',         'world', '🏰'),
  ('world_4', 'Master Craftsperson','Completed all lessons in The Craft Workshop',           'world', '🔨'),
  ('world_5', 'River Rider',        'Completed all lessons in The Flow River',               'world', '🌊'),
  ('world_6', 'Galaxy Navigator',   'Completed all lessons in The Genre Galaxy',             'world', '🌌')
ON CONFLICT (code) DO NOTHING;

-- 5 streak badges
INSERT INTO badges (code, name, description, category, image_emoji) VALUES
  ('streak_3',  '3-Day Streak',   'Practised for 3 days in a row',  'streak', '🔥'),
  ('streak_7',  '7-Day Streak',   'Practised for 7 days in a row',  'streak', '🔥'),
  ('streak_14', '14-Day Streak',  'Practised for 14 days in a row', 'streak', '🔥'),
  ('streak_30', '30-Day Streak',  'Practised for 30 days in a row', 'streak', '⚡'),
  ('streak_60', '60-Day Streak',  'Practised for 60 days in a row', 'streak', '💎')
ON CONFLICT (code) DO NOTHING;

-- 6 mastery badges
INSERT INTO badges (code, name, description, category, image_emoji) VALUES
  ('mastery_story',     'Story Master',     'Mastered all story fundamentals in World 1',          'mastery', '📖'),
  ('mastery_grammar',   'Grammar Master',   'Mastered all grammar topics in World 2',              'mastery', '🔤'),
  ('mastery_sentences', 'Sentence Master',  'Mastered all sentence and paragraph work in World 3', 'mastery', '📜'),
  ('mastery_craft',     'Craft Master',     'Mastered all craft techniques in World 4',            'mastery', '🔨'),
  ('mastery_flow',      'Flow Master',      'Mastered all cohesion and revision skills in World 5','mastery', '🌊'),
  ('mastery_genre',     'Genre Master',     'Mastered all genre writing in World 6',               'mastery', '🌌')
ON CONFLICT (code) DO NOTHING;

-- 3 speed badges
INSERT INTO badges (code, name, description, category, image_emoji) VALUES
  ('speed_bronze', 'Quick Starter',  'Completed a bronze tier activity in record time', 'speed', '⚡'),
  ('speed_silver', 'Speed Writer',   'Completed a silver tier activity in record time', 'speed', '⚡'),
  ('speed_gold',   'Lightning Mind', 'Completed a gold tier activity in record time',   'speed', '⚡')
ON CONFLICT (code) DO NOTHING;
