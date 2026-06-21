-- Migration: 0002_tenant_awareness
-- Adds tenant_id to gai tables and creates gai.tenant_configs.
-- This migration targets the external Supabase (GekkoDB) gai schema.

-- 1. Create gai.tenant_configs table
CREATE TABLE IF NOT EXISTS gai.tenant_configs (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tier INT NOT NULL CHECK (tier BETWEEN 1 AND 5),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Add tenant_id to existing gai tables
ALTER TABLE gai.tasks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES gai.tenant_configs(tenant_id);
ALTER TABLE gai.projects ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES gai.tenant_configs(tenant_id);
ALTER TABLE gai.execution_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES gai.tenant_configs(tenant_id);
ALTER TABLE gai.daily_reports ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES gai.tenant_configs(tenant_id);

-- 3. Backfill tenant_id for existing records (assign to a default tenant)
-- Create a default tenant for existing records
INSERT INTO gai.tenant_configs (tenant_id, name, tier, config, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'GekkoTech Default Tenant', 1, '{"is_default": true}'::jsonb, 'active')
ON CONFLICT (tenant_id) DO NOTHING;

-- Update existing records to use the default tenant
UPDATE gai.tasks SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE gai.projects SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE gai.execution_logs SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE gai.daily_reports SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

-- 4. Make tenant_id NOT NULL after backfilling
ALTER TABLE gai.tasks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE gai.projects ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE gai.execution_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE gai.daily_reports ALTER COLUMN tenant_id SET NOT NULL;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON gai.tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON gai.projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_tenant_id ON gai.execution_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_tenant_id ON gai.daily_reports(tenant_id);
