/**
 * Gai Orchestrator — Tenant-Aware Core
 *
 * This module provides the central routing and config resolution logic for
 * multi-tenant Gai operations. It wraps all GekkoDB queries with tenant_id
 * scoping, resolves per-tenant agent profiles, and enforces data isolation.
 *
 * Architecture:
 *   - Every query is scoped to a tenant_id (no cross-tenant data leakage)
 *   - Tenant config drives agent profile defaults, feature flags, and tier limits
 *   - The five-tier tenancy model is enforced at the orchestrator level
 *
 * Tier model:
 *   Tier 1 — Platform owner (GekkoTech)
 *   Tier 2 — Direct business/SME customers
 *   Tier 3 — Agency customers (manage their own clients)
 *   Tier 4 — Agency-managed clients
 *   Tier 5 — Sub-clients (nested agency structures)
 */

import { getGekkoDB, type GaiTask, type GaiProject, type GaiExecutionLog, type GaiTenantConfig, DEFAULT_AGENT_PROFILE } from "../gekkodb";
import type { TenantContext } from "./tenantResolver";
import type { TaskStatus, TaskPriority, AgentProfile } from "../gekkodb";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrchestratorTaskFilter {
  status?: string;
  priority?: string;
  search?: string;
  project_id?: string;
  filter?: "awaiting" | "urgent" | "in_progress" | "done_today";
  include_done?: boolean;
}

export interface CreateTaskInput {
  name: string;
  priority: TaskPriority;
  notes?: string;
  project_id?: string;
  agent_profile?: AgentProfile;
}

export interface UpdateTaskInput {
  id: string;
  name?: string;
  priority?: TaskPriority;
  notes?: string;
  project_id?: string | null;
  agent_profile?: AgentProfile;
}

export interface OrchestratorResult<T> {
  data: T | null;
  error: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Resolve the effective agent profile for a tenant.
 * Tier 1 (platform owner) gets max by default; lower tiers use config or standard.
 */
export function resolveAgentProfile(
  tenant: GaiTenantConfig | null,
  requested?: AgentProfile
): AgentProfile {
  if (requested) return requested;

  if (!tenant) return DEFAULT_AGENT_PROFILE;

  const configDefault = tenant.config?.default_agent_profile as AgentProfile | undefined;
  if (configDefault) return configDefault;

  // Tier-based defaults
  if (tenant.tier === 1) return "manus-1.6-max";
  if (tenant.tier <= 3) return "manus-1.6";
  return "manus-1.6-lite";
}

// ─── Orchestrator class ───────────────────────────────────────────────────────

export class GaiOrchestrator {
  private tenantCtx: TenantContext;

  constructor(tenantCtx: TenantContext) {
    this.tenantCtx = tenantCtx;
  }

  get tenantId(): string {
    return this.tenantCtx.tenant_id;
  }

  get tenantConfig(): GaiTenantConfig | null {
    return this.tenantCtx.tenant;
  }

  // ─── Task operations ────────────────────────────────────────────────────────

  /**
   * Fetch all tasks scoped to this tenant with optional filters.
   */
  async getTasks(filter?: OrchestratorTaskFilter): Promise<OrchestratorResult<GaiTask[]>> {
    const db = getGekkoDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = db
      .schema("gai")
      .from("tasks")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .order("created_at", { ascending: false });

    const opts = filter ?? { include_done: false };

    if (opts.filter === "awaiting") {
      query = query.is("eswan_action", null).in("status", ["pending", "in_progress"]);
    } else if (opts.filter === "urgent") {
      query = query.eq("priority", "urgent").not("status", "in", '("done","cancelled")');
    } else if (opts.filter === "in_progress") {
      query = query.eq("status", "in_progress");
    } else if (opts.filter === "done_today") {
      const todayStart = todayUTC().toISOString();
      const tomorrowStart = new Date(todayUTC().getTime() + 86400000).toISOString();
      query = query.eq("status", "done").gte("updated_at", todayStart).lt("updated_at", tomorrowStart);
    } else {
      if (opts.status) {
        query = query.eq("status", opts.status);
      } else if (!opts.include_done) {
        query = query.not("status", "in", '("done","cancelled")');
      }
      if (opts.priority) query = query.eq("priority", opts.priority);
      if (opts.project_id) query = query.eq("project_id", opts.project_id);
      if (opts.search) query = query.ilike("name", `%${opts.search}%`);
    }

    const { data, error } = await query;
    return { data: (data ?? []) as GaiTask[], error: error?.message ?? null };
  }

  /**
   * Fetch task stats scoped to this tenant.
   */
  async getTaskStats(): Promise<OrchestratorResult<{
    awaiting: number;
    urgent: number;
    in_progress: number;
    done_today: number;
  }>> {
    const db = getGekkoDB();
    const todayStart = todayUTC().toISOString();
    const tomorrowStart = new Date(todayUTC().getTime() + 86400000).toISOString();

    const [awaitingRes, urgentRes, inProgressRes, doneTodayRes] = await Promise.all([
      db.schema("gai").from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", this.tenantId)
        .is("eswan_action", null)
        .in("status", ["pending", "in_progress"]),
      db.schema("gai").from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", this.tenantId)
        .eq("priority", "urgent")
        .not("status", "in", '("done","cancelled")'),
      db.schema("gai").from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", this.tenantId)
        .eq("status", "in_progress"),
      db.schema("gai").from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", this.tenantId)
        .eq("status", "done")
        .gte("updated_at", todayStart)
        .lt("updated_at", tomorrowStart),
    ]);

    return {
      data: {
        awaiting: awaitingRes.count ?? 0,
        urgent: urgentRes.count ?? 0,
        in_progress: inProgressRes.count ?? 0,
        done_today: doneTodayRes.count ?? 0,
      },
      error: awaitingRes.error?.message ?? urgentRes.error?.message ?? null,
    };
  }

  /**
   * Create a task scoped to this tenant.
   */
  async createTask(input: CreateTaskInput): Promise<OrchestratorResult<GaiTask>> {
    const db = getGekkoDB();
    const agentProfile = resolveAgentProfile(this.tenantConfig, input.agent_profile);

    const { data, error } = await db.schema("gai").from("tasks").insert({
      tenant_id: this.tenantId,
      name: input.name,
      priority: input.priority,
      notes: input.notes ?? null,
      project_id: input.project_id ?? null,
      agent_profile: agentProfile,
      status: "pending",
      delegated_to: "eswan_approval",
      agent_type: null,
      eswan_action: null,
      eswan_action_at: null,
      eswan_notes: null,
      rescheduled_to: null,
      manus_task_id: null,
      publish_ready: false,
      published: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select().single();

    return { data: data as GaiTask ?? null, error: error?.message ?? null };
  }

  /**
   * Update a task — enforces tenant ownership before mutation.
   */
  async updateTask(input: UpdateTaskInput): Promise<OrchestratorResult<GaiTask>> {
    const db = getGekkoDB();
    const { id, ...fields } = input;
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (fields.name !== undefined) updatePayload.name = fields.name;
    if (fields.priority !== undefined) updatePayload.priority = fields.priority;
    if (fields.notes !== undefined) updatePayload.notes = fields.notes;
    if (fields.project_id !== undefined) updatePayload.project_id = fields.project_id;
    if (fields.agent_profile !== undefined) updatePayload.agent_profile = fields.agent_profile;

    const { data, error } = await db.schema("gai").from("tasks")
      .update(updatePayload)
      .eq("id", id)
      .eq("tenant_id", this.tenantId) // Tenant isolation enforced
      .select()
      .single();

    return { data: data as GaiTask ?? null, error: error?.message ?? null };
  }

  // ─── Project operations ─────────────────────────────────────────────────────

  /**
   * Fetch all projects scoped to this tenant.
   */
  async getProjects(): Promise<OrchestratorResult<GaiProject[]>> {
    const db = getGekkoDB();
    const { data, error } = await db
      .schema("gai")
      .from("projects")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .order("name");

    return { data: (data ?? []) as GaiProject[], error: error?.message ?? null };
  }

  // ─── Execution log operations ───────────────────────────────────────────────

  /**
   * Insert an execution log entry scoped to this tenant.
   */
  async logExecution(entry: {
    task_id?: string;
    action_type: string;
    status: string;
    message: string;
    details?: Record<string, unknown>;
  }): Promise<OrchestratorResult<GaiExecutionLog>> {
    const db = getGekkoDB();
    const { data, error } = await db.schema("gai").from("execution_logs").insert({
      tenant_id: this.tenantId,
      task_id: entry.task_id ?? null,
      action_type: entry.action_type,
      status: entry.status,
      message: entry.message,
      details: entry.details ?? {},
      created_at: new Date().toISOString(),
    }).select().single();

    return { data: data as GaiExecutionLog ?? null, error: error?.message ?? null };
  }

  // ─── Tenant config helpers ──────────────────────────────────────────────────

  /**
   * Check if a feature flag is enabled for this tenant.
   */
  isFeatureEnabled(flag: string): boolean {
    const features = this.tenantConfig?.config?.features as Record<string, boolean> | undefined;
    return features?.[flag] ?? false;
  }

  /**
   * Get a tenant config value with a typed default.
   */
  getConfigValue<T>(key: string, defaultValue: T): T {
    const val = this.tenantConfig?.config?.[key];
    return (val !== undefined ? val : defaultValue) as T;
  }
}

/**
 * Factory function — creates a GaiOrchestrator bound to the request's tenant context.
 */
export function createOrchestrator(tenantCtx: TenantContext): GaiOrchestrator {
  return new GaiOrchestrator(tenantCtx);
}
