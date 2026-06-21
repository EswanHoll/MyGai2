/**
 * Tenant Management Router — Gai Orchestrator Multi-Tenant Support
 *
 * Provides admin-only CRUD operations for tenant lifecycle management.
 * All mutations are restricted to admin users (role = 'admin').
 *
 * Five-tier tenancy model:
 *   Tier 1 — Platform owner (GekkoTech)
 *   Tier 2 — Direct business/SME customers
 *   Tier 3 — Agency customers (manage their own clients)
 *   Tier 4 — Agency-managed clients
 *   Tier 5 — Sub-clients (nested agency structures)
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getGekkoDB, type GaiTenantConfig } from "../gekkodb";
import { adminProcedure, router } from "../_core/trpc";
import { invalidateTenantCache } from "../tenant/tenantResolver";

// ─── Validation schemas ───────────────────────────────────────────────────────

const tenantConfigSchema = z.object({
  default_agent_profile: z.enum(["manus-1.6-lite", "manus-1.6", "manus-1.6-max"]).optional(),
  features: z.record(z.boolean()).optional(),
  manus_project_id: z.string().optional(),
  manus_project_url: z.string().url().optional(),
  display_name: z.string().optional(),
  contact_email: z.string().email().optional(),
}).passthrough();

const createTenantSchema = z.object({
  name: z.string().min(2, "Tenant name must be at least 2 characters"),
  tier: z.number().int().min(1).max(5),
  config: tenantConfigSchema.optional().default({}),
});

const updateTenantSchema = z.object({
  tenant_id: z.string().uuid(),
  name: z.string().min(2).optional(),
  tier: z.number().int().min(1).max(5).optional(),
  config: tenantConfigSchema.optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

// ─── Router ──────────────────────────────────────────────────────────────────

export const tenantsRouter = router({
  /**
   * List all tenants (admin only).
   */
  list: adminProcedure.query(async () => {
    const db = getGekkoDB();
    const { data, error } = await db
      .schema("gai")
      .from("tenant_configs")
      .select("*")
      .order("tier", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return (data ?? []) as GaiTenantConfig[];
  }),

  /**
   * Get a single tenant by ID (admin only).
   */
  getById: adminProcedure
    .input(z.object({ tenant_id: z.string().uuid() }))
    .query(async ({ input }) => {
      const db = getGekkoDB();
      const { data, error } = await db
        .schema("gai")
        .from("tenant_configs")
        .select("*")
        .eq("tenant_id", input.tenant_id)
        .single();

      if (error) throw new TRPCError({ code: "NOT_FOUND", message: `Tenant ${input.tenant_id} not found` });
      return data as GaiTenantConfig;
    }),

  /**
   * Register a new tenant (admin only).
   * Automatically assigns a UUID tenant_id.
   */
  register: adminProcedure
    .input(createTenantSchema)
    .mutation(async ({ input }) => {
      const db = getGekkoDB();
      const { data, error } = await db
        .schema("gai")
        .from("tenant_configs")
        .insert({
          name: input.name,
          tier: input.tier,
          config: input.config ?? {},
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data as GaiTenantConfig;
    }),

  /**
   * Update a tenant's name, tier, config, or status (admin only).
   * Invalidates the tenant cache after update.
   */
  update: adminProcedure
    .input(updateTenantSchema)
    .mutation(async ({ input }) => {
      const db = getGekkoDB();
      const { tenant_id, ...fields } = input;
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (fields.name !== undefined) updatePayload.name = fields.name;
      if (fields.tier !== undefined) updatePayload.tier = fields.tier;
      if (fields.config !== undefined) updatePayload.config = fields.config;
      if (fields.status !== undefined) updatePayload.status = fields.status;

      const { data, error } = await db
        .schema("gai")
        .from("tenant_configs")
        .update(updatePayload)
        .eq("tenant_id", tenant_id)
        .select()
        .single();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      // Invalidate cache so next request fetches fresh config
      invalidateTenantCache(tenant_id);

      return data as GaiTenantConfig;
    }),

  /**
   * Deactivate a tenant (admin only).
   * Sets status to 'inactive' — does NOT delete data.
   * Use 'suspend' for temporary blocks; 'inactive' for permanent deactivation.
   */
  deactivate: adminProcedure
    .input(
      z.object({
        tenant_id: z.string().uuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getGekkoDB();
      // Fetch current config to merge deactivation reason
      const { data: current } = await db
        .schema("gai")
        .from("tenant_configs")
        .select("config")
        .eq("tenant_id", input.tenant_id)
        .single();

      const mergedConfig = {
        ...(current?.config ?? {}),
        deactivated_at: new Date().toISOString(),
        deactivation_reason: input.reason ?? "Admin deactivation",
      };

      const { data: updated, error: updateError } = await db
        .schema("gai")
        .from("tenant_configs")
        .update({
          status: "inactive",
          config: mergedConfig,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", input.tenant_id)
        .select()
        .single();

      if (updateError) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: updateError.message });

      invalidateTenantCache(input.tenant_id);
      return updated as GaiTenantConfig;
    }),

  /**
   * Suspend a tenant temporarily (admin only).
   * Sets status to 'suspended' — tenant can be reactivated.
   */
  suspend: adminProcedure
    .input(
      z.object({
        tenant_id: z.string().uuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getGekkoDB();

      const { data: current } = await db
        .schema("gai")
        .from("tenant_configs")
        .select("config")
        .eq("tenant_id", input.tenant_id)
        .single();

      const mergedConfig = {
        ...(current?.config ?? {}),
        suspended_at: new Date().toISOString(),
        suspension_reason: input.reason ?? "Admin suspension",
      };

      const { data, error } = await db
        .schema("gai")
        .from("tenant_configs")
        .update({
          status: "suspended",
          config: mergedConfig,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", input.tenant_id)
        .select()
        .single();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      invalidateTenantCache(input.tenant_id);
      return data as GaiTenantConfig;
    }),

  /**
   * Reactivate a suspended or inactive tenant (admin only).
   */
  reactivate: adminProcedure
    .input(z.object({ tenant_id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const db = getGekkoDB();

      const { data: current } = await db
        .schema("gai")
        .from("tenant_configs")
        .select("config")
        .eq("tenant_id", input.tenant_id)
        .single();

      const mergedConfig = {
        ...(current?.config ?? {}),
        reactivated_at: new Date().toISOString(),
      };
      delete mergedConfig.deactivated_at;
      delete mergedConfig.suspended_at;

      const { data, error } = await db
        .schema("gai")
        .from("tenant_configs")
        .update({
          status: "active",
          config: mergedConfig,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", input.tenant_id)
        .select()
        .single();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      invalidateTenantCache(input.tenant_id);
      return data as GaiTenantConfig;
    }),

  /**
   * Assign a user to a tenant (admin only).
   * Updates the user's tenantId in the local users table.
   */
  assignUser: adminProcedure
    .input(
      z.object({
        user_open_id: z.string(),
        tenant_id: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      // Import db lazily to avoid circular deps
      const { getDb } = await import("../db");
      const { users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await db
        .update(users)
        .set({ tenantId: input.tenant_id })
        .where(eq(users.openId, input.user_open_id));

      return { success: true, user_open_id: input.user_open_id, tenant_id: input.tenant_id };
    }),
});
