-- Migration: 0001_agent_profile
-- Adds agent_profile column to gai.tasks (ops.tasks in GekkoFlow schema).
-- Maps to the Agent Tier selector in the GekkoFlow task create/edit forms.
-- Values: 'manus-1.6-lite' | 'manus-1.6' | 'manus-1.6-max'
-- Default: 'manus-1.6' (Standard)

-- NOTE: This migration targets the external Supabase (GekkoDB) gai schema.
-- The gai schema is managed outside Drizzle (Supabase-hosted), so this file
-- serves as the canonical migration record. Apply via Supabase SQL editor or
-- migration tooling against the gai schema.

ALTER TABLE gai.tasks
  ADD COLUMN IF NOT EXISTS agent_profile TEXT NOT NULL DEFAULT 'manus-1.6'
    CHECK (agent_profile IN ('manus-1.6-lite', 'manus-1.6', 'manus-1.6-max'));

-- Backfill any existing rows (safety net — DEFAULT handles new rows)
UPDATE gai.tasks SET agent_profile = 'manus-1.6' WHERE agent_profile IS NULL;
