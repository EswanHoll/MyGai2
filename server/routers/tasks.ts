import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getGekkoDB, type GaiTask } from "../gekkodb";
import { protectedProcedure, router } from "../_core/trpc";

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
   * Fetch all tasks with optional filters.
   */
  getAll: protectedProcedure
    .input(filterSchema.optional())
    .query(async ({ input }) => {
      const db = getGekkoDB();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = db.schema("gai").from("tasks").select("*").order("created_at", { ascending: false });

      const opts: FilterInput = input ?? { include_done: false };

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
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return (data ?? []) as GaiTask[];
    }),

  /**
   * Fetch the 4 stat tile counts for the Overview page.
   */
  getStats: protectedProcedure.query(async () => {
    const db = getGekkoDB();
    const todayStart = todayUTC().toISOString();
    const tomorrowStart = new Date(todayUTC().getTime() + 86400000).toISOString();

    const [awaitingRes, urgentRes, inProgressRes, doneTodayRes] = await Promise.all([
      db.schema("gai").from("tasks")
        .select("id", { count: "exact", head: true })
        .is("eswan_action", null)
        .in("status", ["pending", "in_progress"]),
      db.schema("gai").from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("priority", "urgent")
        .not("status", "in", '("done","cancelled")'),
      db.schema("gai").from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "in_progress"),
      db.schema("gai").from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "done")
        .gte("updated_at", todayStart)
        .lt("updated_at", tomorrowStart),
    ]);

    return {
      awaiting: awaitingRes.count ?? 0,
      urgent: urgentRes.count ?? 0,
      in_progress: inProgressRes.count ?? 0,
      done_today: doneTodayRes.count ?? 0,
    };
  }),

  /**
   * Update eswan_action, eswan_action_at, eswan_notes, rescheduled_to on a task.
   */
  updateAction: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        eswan_action: z.enum(["go_ahead", "hold", "reschedule", "cancel"]),
        eswan_notes: z.string().optional(),
        rescheduled_to: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
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
        .select()
        .single();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data as GaiTask;
    }),

  /**
   * Fetch all gai.projects for grouping tasks.
   */
  getProjects: protectedProcedure.query(async () => {
    const db = getGekkoDB();
    const { data, error } = await db.schema("gai").from("projects").select("*").order("name");
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return (data ?? []) as Array<{ id: string; name: string; description: string | null; status: string | null; created_at: string }>;
  }),

  /**
   * Mark a task as published.
   */
  markPublished: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const db = getGekkoDB();
      const { data, error } = await db.schema("gai").from("tasks")
        .update({ published: true, updated_at: new Date().toISOString() })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data as GaiTask;
    }),

  /**
   * Add a reply/feedback note to gai.execution_logs for a task.
   * This is Eswan's feedback channel back to Gai — distinct from eswan_action.
   */
  addReply: protectedProcedure
    .input(
      z.object({
        task_id: z.string().uuid(),
        message: z.string().min(1, "Reply cannot be empty"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getGekkoDB();
      const { data, error } = await db.schema("gai").from("execution_logs").insert({
        task_id: input.task_id,
        action_type: "reply",
        status: "info",
        message: input.message,
        details: { source: "eswan", channel: "gekkoflow_dashboard" },
        created_at: new Date().toISOString(),
      }).select().single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  /**
   * Create a quick task directly from the dashboard.
   * Sets status=pending, delegated_to=eswan_approval so it lands in the Task Tracker.
   */
  createQuick: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Task name is required"),
        priority: z.enum(["urgent", "high", "normal", "low"]).default("normal"),
        notes: z.string().optional(),
        project_id: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getGekkoDB();
      const { data, error } = await db.schema("gai").from("tasks").insert({
        name: input.name,
        priority: input.priority,
        notes: input.notes ?? null,
        project_id: input.project_id ?? null,
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
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data as GaiTask;
    }),
});
