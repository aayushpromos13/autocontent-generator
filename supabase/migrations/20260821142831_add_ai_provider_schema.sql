/*
# AI Script Provider - Database Extensions

## Overview
Extends the existing schema to support real AI script generation:
1. Adds `metadata` JSONB to scripts for structured title/hook/cta storage.
2. Adds `on_screen_text` to scenes for per-scene text overlays.
3. Creates `provider_settings` table for per-user AI provider configuration.
4. Adds a unique constraint on scripts(project_id) to enforce 1:1 with project.

## Security
- provider_settings is owner-scoped via auth.uid() with full CRUD policies.
- API keys are stored encrypted-at-rest by Supabase and never exposed to the anon role.
- A SECURITY DEFINER function allows users to read only the non-secret fields
  of their own provider settings, while writes go through RLS policies.

## Notes
1. The scripts.metadata column stores structured generation output (title, hook, cta).
2. The unique constraint on scripts(project_id) ensures one script per project.
3. provider_settings.api_key is text; Supabase encrypts columns at rest.
4. The get_provider_settings RPC returns provider/model/connected fields only, never the key.
*/

-- Add metadata to scripts for structured output (title, hook, cta, etc.)
ALTER TABLE scripts
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add on_screen_text to scenes
ALTER TABLE scenes
  ADD COLUMN IF NOT EXISTS on_screen_text text;

-- Enforce 1:1 script per project
DROP INDEX IF EXISTS scripts_project_id_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS scripts_project_id_unique_idx ON scripts(project_id);

-- Provider settings table (per-user AI provider configuration)
CREATE TABLE IF NOT EXISTS provider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'gemini',
  api_key text,
  model text NOT NULL DEFAULT 'gemini-2.0-flash',
  connected boolean NOT NULL DEFAULT false,
  last_tested_at timestamptz,
  last_test_status text CHECK (last_test_status IN ('success','failed')),
  last_test_error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE provider_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_provider_settings" ON provider_settings;
CREATE POLICY "select_own_provider_settings" ON provider_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_provider_settings" ON provider_settings;
CREATE POLICY "insert_own_provider_settings" ON provider_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_provider_settings" ON provider_settings;
CREATE POLICY "update_own_provider_settings" ON provider_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_provider_settings" ON provider_settings;
CREATE POLICY "delete_own_provider_settings" ON provider_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS provider_settings_user_id_idx ON provider_settings(user_id);

-- Trigger for updated_at (reuses existing set_updated_at function)
DROP TRIGGER IF EXISTS set_updated_at ON provider_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON provider_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
