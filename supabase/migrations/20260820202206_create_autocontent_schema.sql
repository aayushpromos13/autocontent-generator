/*
# AutoContent AI - Core Database Schema

## Overview
Creates the full schema for an AI-powered faceless content creation platform.
Users create video projects, which flow through a pipeline of scripts, scenes,
generated assets, and jobs, and can be scheduled via a content calendar and
automated daily generation.

## New Tables

1. `profiles` - Extends auth.users with display name, avatar, preferences.
2. `projects` - A video project (idea, niche, duration, style, tone, language, status).
3. `scripts` - Generated script for a project (1:1 with project).
4. `scenes` - Scene-by-scene breakdown of a script (N:1 with project).
5. `generated_assets` - Individual assets (voiceover, visuals, subtitles) per scene/project.
6. `jobs` - Processing jobs tracking the generation pipeline state per project.
7. `automation_settings` - Per-user automated daily content generation config.
8. `publishing_records` - Where/when a project is published or scheduled.
9. `templates` - Reusable project templates (niche/duration/style presets).

## Security
- RLS enabled on every table.
- Owner-scoped policies using auth.uid() for all user-owned tables.
- Templates are readable by all authenticated users (shared library); only the owner can modify/delete their templates.

## Notes
1. All owner columns default to auth.uid() so frontend inserts that omit user_id succeed.
2. Projects use a status enum-like check constraint covering the full pipeline.
3. Jobs table tracks each generation step independently for resumability.
4. Automation settings are 1:1 per user.
*/

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  default_niche text,
  default_style text,
  default_language text DEFAULT 'en',
  default_duration int DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  idea text NOT NULL,
  niche text NOT NULL,
  duration_seconds int NOT NULL DEFAULT 60,
  visual_style text NOT NULL DEFAULT 'minimal',
  tone text NOT NULL DEFAULT 'informative',
  language text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft','script_generating','script_ready','scenes_generating','scenes_ready','voiceover_generating','visuals_generating','subtitles_generating','video_assembling','ready','scheduled','published','failed')
  ),
  error_message text,
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);
CREATE INDEX IF NOT EXISTS projects_scheduled_for_idx ON projects(scheduled_for);

-- Scripts (1:1 with project)
CREATE TABLE IF NOT EXISTS scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  word_count int,
  estimated_duration int,
  provider text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_scripts" ON scripts;
CREATE POLICY "select_own_scripts" ON scripts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_scripts" ON scripts;
CREATE POLICY "insert_own_scripts" ON scripts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_scripts" ON scripts;
CREATE POLICY "update_own_scripts" ON scripts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_scripts" ON scripts;
CREATE POLICY "delete_own_scripts" ON scripts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS scripts_project_id_idx ON scripts(project_id);

-- Scenes (N:1 with project)
CREATE TABLE IF NOT EXISTS scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence int NOT NULL DEFAULT 0,
  description text NOT NULL,
  narration text,
  duration_seconds int,
  visual_prompt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_scenes" ON scenes;
CREATE POLICY "select_own_scenes" ON scenes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_scenes" ON scenes;
CREATE POLICY "insert_own_scenes" ON scenes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_scenes" ON scenes;
CREATE POLICY "update_own_scenes" ON scenes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_scenes" ON scenes;
CREATE POLICY "delete_own_scenes" ON scenes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS scenes_project_id_idx ON scenes(project_id);
CREATE INDEX IF NOT EXISTS scenes_sequence_idx ON scenes(project_id, sequence);

-- Generated assets (voiceover, visuals, subtitles, final video)
CREATE TABLE IF NOT EXISTS generated_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES scenes(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type text NOT NULL CHECK (asset_type IN ('voiceover','visual','subtitle','music','final_video')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','failed')),
  provider text,
  storage_path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE generated_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_assets" ON generated_assets;
CREATE POLICY "select_own_assets" ON generated_assets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_assets" ON generated_assets;
CREATE POLICY "insert_own_assets" ON generated_assets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_assets" ON generated_assets;
CREATE POLICY "update_own_assets" ON generated_assets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_assets" ON generated_assets;
CREATE POLICY "delete_own_assets" ON generated_assets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS assets_project_id_idx ON generated_assets(project_id);
CREATE INDEX IF NOT EXISTS assets_scene_id_idx ON generated_assets(scene_id);
CREATE INDEX IF NOT EXISTS assets_type_status_idx ON generated_assets(asset_type, status);

-- Jobs (pipeline tracking)
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('script','scenes','voiceover','visuals','subtitles','video_assembly')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  provider text,
  progress int DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_jobs" ON jobs;
CREATE POLICY "select_own_jobs" ON jobs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_jobs" ON jobs;
CREATE POLICY "insert_own_jobs" ON jobs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_jobs" ON jobs;
CREATE POLICY "update_own_jobs" ON jobs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_jobs" ON jobs;
CREATE POLICY "delete_own_jobs" ON jobs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS jobs_project_id_idx ON jobs(project_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status);

-- Automation settings (1:1 per user)
CREATE TABLE IF NOT EXISTS automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  niche text,
  duration_seconds int DEFAULT 60,
  visual_style text DEFAULT 'minimal',
  tone text DEFAULT 'informative',
  language text DEFAULT 'en',
  frequency text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekdays','weekly','custom')),
  time_of_day time NOT NULL DEFAULT '09:00',
  days_of_week int[] DEFAULT ARRAY[0,1,2,3,4,5,6],
  max_videos_per_run int DEFAULT 1,
  auto_publish boolean DEFAULT false,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_automation" ON automation_settings;
CREATE POLICY "select_own_automation" ON automation_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_automation" ON automation_settings;
CREATE POLICY "insert_own_automation" ON automation_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_automation" ON automation_settings;
CREATE POLICY "update_own_automation" ON automation_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_automation" ON automation_settings;
CREATE POLICY "delete_own_automation" ON automation_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Publishing records
CREATE TABLE IF NOT EXISTS publishing_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('youtube','tiktok','instagram','x','facebook','other')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft','scheduled','publishing','published','failed')),
  scheduled_for timestamptz,
  published_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE publishing_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_publishing" ON publishing_records;
CREATE POLICY "select_own_publishing" ON publishing_records FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_publishing" ON publishing_records;
CREATE POLICY "insert_own_publishing" ON publishing_records FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_publishing" ON publishing_records;
CREATE POLICY "update_own_publishing" ON publishing_records FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_publishing" ON publishing_records;
CREATE POLICY "delete_own_publishing" ON publishing_records FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS publishing_project_id_idx ON publishing_records(project_id);
CREATE INDEX IF NOT EXISTS publishing_scheduled_for_idx ON publishing_records(scheduled_for);

-- Templates (shared readable, owner-editable)
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  niche text NOT NULL,
  duration_seconds int NOT NULL DEFAULT 60,
  visual_style text NOT NULL DEFAULT 'minimal',
  tone text NOT NULL DEFAULT 'informative',
  language text NOT NULL DEFAULT 'en',
  idea_template text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_templates" ON templates;
CREATE POLICY "select_templates" ON templates FOR SELECT
  TO authenticated USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_templates" ON templates;
CREATE POLICY "insert_own_templates" ON templates FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_templates" ON templates;
CREATE POLICY "update_own_templates" ON templates FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_templates" ON templates;
CREATE POLICY "delete_own_templates" ON templates FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS templates_niche_idx ON templates(niche);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles','projects','scripts','scenes','generated_assets','jobs','automation_settings','publishing_records','templates'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
  END LOOP;
END $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
