# Gai Orchestrator — Multi-Tenant Support Architecture

**Version:** 1.0  
**Date:** 2026-06-21  
**Author:** Gai Worker Agent (approved by Eswan Holl, Owner/CEO, GekkoTech)  
**Status:** Implemented

---

## Overview

This document describes the multi-tenant architecture introduced into the Gai Orchestrator (GekkoFlow Command Centre). The implementation adds full tenant isolation, per-tenant configuration, and a five-tier tenancy model aligned with the GekkoFlow platform roadmap.

---

## Five-Tier Tenancy Model

| Tier | Role | Description |
|------|------|-------------|
| 1 | Platform Owner | GekkoTech — full access, max agent profile by default |
| 2 | Direct Business/SME | Direct GekkoTech customers |
| 3 | Agency | Agencies that manage their own clients |
| 4 | Agency-Managed Client | Clients managed by a Tier 3 agency |
| 5 | Sub-Client | Nested sub-clients within agency structures |

---

## New Files

| File | Purpose |
|------|---------|
| `server/tenant/tenantResolver.ts` | Resolves tenant context from request (header → user → default) |
| `server/tenant/gaiOrchestrator.ts` | Tenant-scoped orchestrator class wrapping all GekkoDB operations |
| `server/routers/tenants.ts` | Admin-only tenant lifecycle router (register, update, deactivate, suspend, reactivate, assignUser) |
| `server/tenant.test.ts` | 32 tenant-aware tests covering all new functionality |
| `drizzle/0002_tenant_awareness.sql` | Supabase migration: `gai.tenant_configs` table + `tenant_id` columns |
| `drizzle/0002_users_tenant_id.sql` | Local MySQL migration: `tenantId` column on `users` table |

---

## Modified Files

| File | Change |
|------|--------|
| `server/_core/context.ts` | Added `tenant: TenantContext` to `TrpcContext`; calls `resolveTenantContext` on every request |
| `server/_core/trpc.ts` | Added `tenantProcedure` and `adminTenantProcedure`; `requireActiveTenant` middleware |
| `server/gekkodb.ts` | Added `GaiTenantConfig` interface; added `tenant_id` to all existing interfaces |
| `server/routers/tasks.ts` | All procedures migrated from `protectedProcedure` to `tenantProcedure`; all queries scoped with `.eq("tenant_id", ctx.tenant.tenant_id)` |
| `server/routers/brief.ts` | All queries scoped with `tenant_id` filter |
| `server/routers.ts` | Registered `tenantsRouter` |
| `drizzle/schema.ts` | Added `tenantId` column to `users` table |
| `server/gekkoflow.test.ts` | Updated all context helpers to include `tenant` field |
| `server/auth.logout.test.ts` | Updated context helper to include `tenant` field |
| `server/routers/growth.test.ts` | Updated context helpers to include `tenant` field |

---

## Tenant Resolution Order

```
Request arrives
    │
    ├─ X-Tenant-ID header present? → Use header value (admin override)
    │
    ├─ User authenticated + user.tenantId set? → Use user's tenantId
    │
    └─ Fallback → DEFAULT_TENANT_ID (00000000-0000-0000-0000-000000000000)
```

---

## Database Schema: gai.tenant_configs

```sql
CREATE TABLE gai.tenant_configs (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name      TEXT NOT NULL,
    tier      INT  NOT NULL CHECK (tier BETWEEN 1 AND 5),
    config    JSONB NOT NULL DEFAULT '{}',
    status    TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### config JSONB shape

| Key | Type | Description |
|-----|------|-------------|
| `default_agent_profile` | string | Override default agent profile for this tenant |
| `features` | `Record<string, boolean>` | Feature flags (e.g., `growth_hub: true`) |
| `manus_project_id` | string | Linked Manus project ID (platform-owner visible only) |
| `manus_project_url` | string | Linked Manus project URL (platform-owner visible only) |
| `display_name` | string | Customer-facing display name |
| `contact_email` | string | Primary contact email |

---

## Agent Profile Resolution

```
resolveAgentProfile(tenant, requested?)
    │
    ├─ requested explicitly? → Use requested
    │
    ├─ tenant.config.default_agent_profile set? → Use config value
    │
    ├─ tier === 1 → manus-1.6-max
    ├─ tier <= 3  → manus-1.6
    └─ tier >= 4  → manus-1.6-lite
```

---

## Tenant Lifecycle Operations (Admin Only)

| Operation | tRPC Procedure | Description |
|-----------|---------------|-------------|
| Register | `tenants.register` | Create a new tenant |
| List | `tenants.list` | List all tenants ordered by tier |
| Get | `tenants.getById` | Fetch a single tenant |
| Update | `tenants.update` | Update name, tier, config, or status |
| Deactivate | `tenants.deactivate` | Set status=inactive (permanent) |
| Suspend | `tenants.suspend` | Set status=suspended (temporary) |
| Reactivate | `tenants.reactivate` | Restore to active |
| Assign User | `tenants.assignUser` | Link a user to a tenant by openId |

---

## Test Coverage

| Test Suite | Tests | Status |
|-----------|-------|--------|
| `server/tenant.test.ts` (new) | 32 | ✓ All passing |
| `server/gekkoflow.test.ts` (existing) | 44 | ✓ All passing |
| `server/auth.logout.test.ts` (existing) | 1 | ✓ All passing |
| `server/routers/growth.test.ts` (existing) | 24 | ✓ All passing |
| **Total** | **101** | **✓ 101/101** |

---

## Migration Notes

The `0002_tenant_awareness.sql` migration must be applied to the Supabase `gai` schema via the Supabase SQL editor or migration tooling. It:

1. Creates `gai.tenant_configs` with the default GekkoTech tenant (UUID `00000000-0000-0000-0000-000000000000`)
2. Adds `tenant_id UUID NOT NULL` to `gai.tasks`, `gai.projects`, `gai.execution_logs`, `gai.daily_reports`
3. Backfills all existing rows to the default tenant
4. Creates performance indexes on all `tenant_id` columns

The `0002_users_tenant_id.sql` migration targets the local MySQL `users` table and adds the `tenantId` column.

---

## Dependency: Task 1

This implementation fulfils the Task 2 requirement (Gai Orchestrator Tenant-Aware Update) and is designed to be applied after Task 1 (`tenant_id` migration + `gai.tenant_configs` table creation). The SQL migration files in this PR constitute the Task 1 database work; if Task 1 was completed separately, only the application-layer changes apply.
