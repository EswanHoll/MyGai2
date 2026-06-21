import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getGekkoDB, type GaiTask, AGENT_PROFILE_OPTIONS, DEFAULT_AGENT_PROFILE } from "../gekkodb";
import { protectedProcedure, tenantProcedure, router } from "../_core/trpc";
import { createOrchestrator } from "../tenant/gaiOrchestrator";

// ─── Shared schemas ───────────────────────────────────────────────────────────

const AGENT_PROFILE_VALUES = AGENT_PROFILE_OPTIONS.map((o) => o.value) as
  ["manus-1.6-lite", "manus-1.6", "manus-1.6-max"];

const agentProfileSchema = z.enum(AGENT_PROFILE_VALUES).default(DEFAULT_AGENT_PROFILE);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const filterSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  search: z.string().optional(),
  project_id: z.string().optional(),
  filter: z.enum(["awaiting", "urgent", "in_progress", "done_today"]).optional(),
  include_done: z.boolean().optional().default(false),
});

type FilterInput = z.infer<typeof filterSchema>;

// ─── Router ──────────────────────────────────────────────────────────────────

export const tasksRouter = router({
  /**
   * Fetch all tasks with optional filters — tenant-scoped.
   */
  getAll: tenantProcedure
    .input(filterSchema.optional())
    .query(async ({ input, ctx }) => {
      const orchestrator = createOrchestrator(ctx.tenant);
      const result = await orchestrator.getTasks(input);
      if (result.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
      return result.data ?? [];
    }),

  /**
   * Fetch the 4 stat tile counts for the Overview page — tenant-scoped.
   */
  getStats: tenantProcedure.query(async ({ ctx }) => {
    const orchestrator = createOrchestrator(ctx.tenant);
    const result = await orchestrator.getTaskStats();
    if (result.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
    return result.data ?? { awaiting: 0, urgent: 0, in_progress: 0, done_today: 0 };
  }),

  /**
   * Update eswan_action, eswan_action_at, eswan_notes, rescheduled_to on a task — tenant-scoped.
   */
  updateAction: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        eswan_action: z.enum(["go_ahead", "hold", "reschedule", "cancel"]),
        eswan_notes: z.string().optional(),
        rescheduled_to: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getGekkoDB();
      const updatePayload: Record<string, unknown> = {
        eswan_action: input.eswan_action,
        eswan_action_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (input.eswan_notes !== undefined) updatePayload.eswan_notes = input.eswan_notes;
      if (input.rescheduled_to !== undefined) updatePayload.rescheduled_to = input.rescheduled_to;
      if (input.eswan_action === "cancel") updatePayload.status = "cancelled";
      if (input.eswan_action === "hold") updatePayload.status = "blocked";

      const { data, error } = await db.schema("gai").from("tasks")
        .update(updatePayload)
        .eq("id", input.id)
        .eq("tenant_id", ctx.tenant.tenant_id) // Tenant isolation enforced
        .select()
        .single();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data as GaiTask;
    }),

  /**
   * Fetch all gai.projects for grouping tasks — tenant-scoped.
   */
  getProjects: tenantProcedure.query(async ({ ctx }) => {
    const orchestrator = createOrchestrator(ctx.tenant);
    const result = await orchestrator.getProjects();
    if (result.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
    return result.data ?? [];
  }),

  /**
   * Mark a task as published — tenant-scoped.
   */
  markPublished: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const db = getGekkoDB();
      const { data, error } = await db.schema("gai").from("tasks")
        .update({ published: true, updated_at: new Date().toISOString() })
        .eq("id", input.id)
        .eq("tenant_id", ctx.tenant.tenant_id) // Tenant isolation enforced
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data as GaiTask;
    }),

  /**
   * Add a reply/feedback note to gai.execution_logs for a task — tenant-scoped.
   */
  addReply: tenantProcedure
    .input(
      z.object({
        task_id: z.string().uuid(),
        message: z.string().min(1, "Reply cannot be empty"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const orchestrator = createOrchestrator(ctx.tenant);
      const result = await orchestrator.logExecution({
        task_id: input.task_id,
        action_type: "reply",
        status: "info",
        message: input.message,
        details: { source: "eswan", channel: "gekkoflow_dashboard" },
      });
      if (result.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
      return result.data;
    }),

  /**
   * Create a quick task directly from the dashboard — tenant-scoped.
   * agent_profile is resolved via tenant config if not provided.
   */
  createQuick: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1, "Task name is required"),
        priority: z.enum(["urgent", "high", "normal", "low"]).default("normal"),
        notes: z.string().optional(),
        project_id: z.string().uuid().optional(),
        agent_profile: agentProfileSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const orchestrator = createOrchestrator(ctx.tenant);
      const result = await orchestrator.createTask({
        name: input.name,
        priority: input.priority,
        notes: input.notes,
        project_id: input.project_id,
        agent_profile: input.agent_profile,
      });
      if (result.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
      return result.data as GaiTask;
    }),

  /**
   * Update editable task fields — tenant-scoped.
   */
  updateTask: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1, "Task name is required").optional(),
        priority: z.enum(["urgent", "high", "normal", "low"]).optional(),
        notes: z.string().optional(),
        project_id: z.string().uuid().nullable().optional(),
        agent_profile: agentProfileSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const orchestrator = createOrchestrator(ctx.tenant);
      const result = await orchestrator.updateTask(input);
      if (result.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
      return result.data as GaiTask;
    }),
});
