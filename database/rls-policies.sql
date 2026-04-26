-- =============================================================================
-- WriFe Interactive Practice — Row Level Security Policies
-- Supabase project: rxmitjrbrsqjeymsycoj
-- Apply AFTER schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE worlds           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pupil_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pupil_responses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pupil_badges     ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks          ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper: check if a teacher owns the class a pupil belongs to
-- Used by teacher-access policies below
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_teacher_id_for_pupil(p_pupil_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT c.teacher_id
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  WHERE cm.pupil_id = p_pupil_id
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- Users can read and update their own profile
CREATE POLICY "profiles: own read"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles: own insert"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Teachers can read profiles of pupils in their classes
CREATE POLICY "profiles: teacher reads class pupils"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.pupil_id = profiles.id
        AND c.teacher_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- classes
-- ---------------------------------------------------------------------------
-- Teachers can fully manage their own classes
CREATE POLICY "classes: teacher full access"
  ON classes FOR ALL
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Pupils can read classes they belong to
CREATE POLICY "classes: pupil read own"
  ON classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      WHERE cm.class_id = classes.id
        AND cm.pupil_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- class_members
-- ---------------------------------------------------------------------------
-- Teachers can manage members of their classes
CREATE POLICY "class_members: teacher manage"
  ON class_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_members.class_id
        AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_members.class_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Pupils can read and insert their own membership
CREATE POLICY "class_members: pupil read own"
  ON class_members FOR SELECT
  USING (pupil_id = auth.uid());

CREATE POLICY "class_members: pupil join"
  ON class_members FOR INSERT
  WITH CHECK (pupil_id = auth.uid());

-- ---------------------------------------------------------------------------
-- worlds (reference data — read-only for all authenticated users)
-- ---------------------------------------------------------------------------
CREATE POLICY "worlds: authenticated read"
  ON worlds FOR SELECT
  USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- lessons (reference data — read-only for all authenticated users)
-- ---------------------------------------------------------------------------
CREATE POLICY "lessons: authenticated read"
  ON lessons FOR SELECT
  USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- activities (reference data — read-only for all authenticated users)
-- ---------------------------------------------------------------------------
CREATE POLICY "activities: authenticated read"
  ON activities FOR SELECT
  USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- pupil_progress
-- ---------------------------------------------------------------------------
-- Pupils can read and upsert their own progress
CREATE POLICY "pupil_progress: pupil own read"
  ON pupil_progress FOR SELECT
  USING (pupil_id = auth.uid());

CREATE POLICY "pupil_progress: pupil own write"
  ON pupil_progress FOR INSERT
  WITH CHECK (pupil_id = auth.uid());

CREATE POLICY "pupil_progress: pupil own update"
  ON pupil_progress FOR UPDATE
  USING (pupil_id = auth.uid());

-- Teachers can read progress for pupils in their classes
CREATE POLICY "pupil_progress: teacher reads class"
  ON pupil_progress FOR SELECT
  USING (get_teacher_id_for_pupil(pupil_id) = auth.uid());

-- ---------------------------------------------------------------------------
-- pupil_responses
-- ---------------------------------------------------------------------------
-- Pupils can insert and read their own responses
CREATE POLICY "pupil_responses: pupil own insert"
  ON pupil_responses FOR INSERT
  WITH CHECK (pupil_id = auth.uid());

CREATE POLICY "pupil_responses: pupil own read"
  ON pupil_responses FOR SELECT
  USING (pupil_id = auth.uid());

-- Teachers can read responses for pupils in their classes
CREATE POLICY "pupil_responses: teacher reads class"
  ON pupil_responses FOR SELECT
  USING (get_teacher_id_for_pupil(pupil_id) = auth.uid());

-- ---------------------------------------------------------------------------
-- badges (reference data — readable by all authenticated users)
-- ---------------------------------------------------------------------------
CREATE POLICY "badges: authenticated read"
  ON badges FOR SELECT
  USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- pupil_badges
-- ---------------------------------------------------------------------------
-- Pupils can read their own badges
CREATE POLICY "pupil_badges: pupil own read"
  ON pupil_badges FOR SELECT
  USING (pupil_id = auth.uid());

-- Service role only for insert (badge award happens server-side via SECURITY DEFINER fn)
-- Teachers can read badges for pupils in their classes
CREATE POLICY "pupil_badges: teacher reads class"
  ON pupil_badges FOR SELECT
  USING (get_teacher_id_for_pupil(pupil_id) = auth.uid());

-- Allow pupils to insert their own badges (client-side award for MVP)
CREATE POLICY "pupil_badges: pupil insert own"
  ON pupil_badges FOR INSERT
  WITH CHECK (pupil_id = auth.uid());

-- ---------------------------------------------------------------------------
-- streaks
-- ---------------------------------------------------------------------------
-- Pupils can read and upsert their own streak
CREATE POLICY "streaks: pupil own read"
  ON streaks FOR SELECT
  USING (pupil_id = auth.uid());

CREATE POLICY "streaks: pupil own insert"
  ON streaks INSERT
  WITH CHECK (pupil_id = auth.uid());

CREATE POLICY "streaks: pupil own update"
  ON streaks FOR UPDATE
  USING (pupil_id = auth.uid());
