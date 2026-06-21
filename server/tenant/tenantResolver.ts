/**
 * Tenant Resolver — Gai Orchestrator Multi-Tenant Support
 *
 * Resolves the active tenant for a given request. Resolution order:
 *   1. X-Tenant-ID header (platform-owner / admin override)
 *   2. User's tenantId from the local users table
 *   3. Default tenant fallback (GekkoTech T1)
 *
 * This module is the single source of truth for tenant identity within a request.
 */

import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import { getGekkoDB, type GaiTenantConfig } from "../gekkodb";

export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Resolved tenant context attached to every tRPC request.
 */
export interface TenantContext {
  tenant_id: string;
  tenant: GaiTenantConfig | null;
  is_default: boolean;
}

/**
 * Cache for tenant configs to avoid repeated DB calls within a single process.
 * TTL: 60 seconds.
 */
const tenantCache = new Map<string, { config: GaiTenantConfig; expires: number }>();
const CACHE_TTL_MS = 60_000;

/**
 * Fetch a tenant config from GekkoDB with in-process caching.
 */
export async function fetchTenantConfig(tenantId: string): Promise<GaiTenantConfig | null> {
  const cached = tenantCache.get(tenantId);
  if (cached && Date.now() < cached.expires) {
    return cached.config;
  }

  const db = getGekkoDB();
  const { data, error } = await db
    .schema("gai")
    .from("tenant_configs")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .single();

  if (error || !data) return null;

  const config = data as GaiTenantConfig;
  tenantCache.set(tenantId, { config, expires: Date.now() + CACHE_TTL_MS });
  return config;
}

/**
 * Invalidate the tenant cache for a specific tenant (call after updates).
 */
export function invalidateTenantCache(tenantId: string): void {
  tenantCache.delete(tenantId);
}

/**
 * Resolve the tenant context for an incoming request.
 *
 * @param req   Express request (used to check X-Tenant-ID header)
 * @param user  Authenticated user from the session (may be null for public routes)
 */
export async function resolveTenantContext(
  req: Request,
  user: User | null
): Promise<TenantContext> {
  // 1. Platform-owner override via header (admin-only; validated downstream)
  const headerTenantId = req.headers["x-tenant-id"] as string | undefined;

  // 2. User-bound tenant from the session
  const userTenantId = user?.tenantId ?? null;

  // Determine the effective tenant ID
  const effectiveTenantId = headerTenantId ?? userTenantId ?? DEFAULT_TENANT_ID;
  const isDefault = effectiveTenantId === DEFAULT_TENANT_ID;

  const tenant = await fetchTenantConfig(effectiveTenantId);

  return {
    tenant_id: effectiveTenantId,
    tenant,
    is_default: isDefault,
  };
}
