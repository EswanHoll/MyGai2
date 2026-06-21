import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getGekkoDB, type GaiExecutionLog } from "../gekkodb";
import { tenantProcedure, router } from "../_core/trpc";

export const briefRouter = router({
  /**
   * Fetch daily brief data for a given date (YYYY-MM-DD) — tenant-scoped.
   * Aggregates execution_logs and daily_reports for that date.
   */
  getByDate: tenantProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ input, ctx }) => {
      const db = getGekkoDB();
      const tenantId = ctx.tenant.tenant_id;
      const dateStart = `${input.date}T00:00:00.000Z`;
      const dateEnd = `${input.date}T23:59:59.999Z`;

      const [logsRes, reportRes, tasksRes, inProgressRes, blockedRes, awaitingRes] = await Promise.all([
        // Execution logs for the day — tenant-scoped
        db.schema("gai").from("execution_logs")
          .select("*")
          .eq("tenant_id", tenantId)
          .gte("created_at", dateStart)
          .lte("created_at", dateEnd)
          .order("created_at", { ascending: true }),

        // Daily report for the date — tenant-scoped
        db.schema("gai").from("daily_reports")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("report_date", input.date)
          .order("created_at", { ascending: false })
          .limit(1),

        // Tasks with Eswan actions on this date — tenant-scoped
        db.schema("gai").from("tasks")
          .select("*")
          .eq("tenant_id", tenantId)
          .not("eswan_action", "is", null)
          .gte("eswan_action_at", dateStart)
          .lte("eswan_action_at", dateEnd),

        // In-progress tasks — tenant-scoped
        db.schema("gai").from("tasks")
          .select("id, name, status, priority, delegated_to, updated_at")
          .eq("tenant_id", tenantId)
          .eq("status", "in_progress")
          .order("updated_at", { ascending: false })
          .limit(20),

        // Blocked tasks — tenant-scoped
        db.schema("gai").from("tasks")
          .select("id, name, status, priority, delegated_to, updated_at")
          .eq("tenant_id", tenantId)
          .eq("status", "blocked")
          .order("updated_at", { ascending: false })
          .limit(20),

        // Awaiting decision tasks — tenant-scoped
        db.schema("gai").from("tasks")
          .select("id, name, status, priority, delegated_to, updated_at")
          .eq("tenant_id", tenantId)
          .eq("status", "pending")
          .is("eswan_action", null)
          .order("updated_at", { ascending: false })
          .limit(20),
      ]);

      if (logsRes.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: logsRes.error.message });
      if (reportRes.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: reportRes.error.message });
      if (tasksRes.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: tasksRes.error.message });

      const logs = (logsRes.data ?? []) as GaiExecutionLog[];

      // Categorise logs
      const delegatedLogs = logs.filter(l => l.action_type === "delegate" || l.action_type === "task_created");
      const errorLogs = logs.filter(l => l.status === "error" || l.status === "failed");
      const completionLogs = logs.filter(l => l.action_type === "complete" || l.status === "completed");

      // Summary stats from logs
      const cyclesRun = logs.filter(l => l.action_type === "orchestrator_cycle").length;
      const tasksDelegate = delegatedLogs.length;
      const tasksCompleted = completionLogs.length;
      const errors = errorLogs.length;

      // Report content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reportRows = reportRes.data as any[];
      const report = Array.isArray(reportRows) ? reportRows[0] : reportRows;
      const gmailHighlights = report?.content?.gmail_highlights ?? [];

      return {
        date: input.date,
        tenant_id: tenantId,
        summary: {
          cycles_run: cyclesRun,
          tasks_delegated: tasksDelegate,
          tasks_completed: tasksCompleted,
          errors,
        },
        eswan_actions_today: tasksRes.data ?? [],
        completed_tasks: (tasksRes.data ?? []).filter((t: { status: string }) => t.status === "done"),
        in_progress: inProgressRes.data ?? [],
        blocked: blockedRes.data ?? [],
        awaiting_decision: awaitingRes.data ?? [],
        delegated_logs: delegatedLogs,
        error_logs: errorLogs,
        gmail_highlights: gmailHighlights,
        all_logs: logs,
      };
    }),

  /**
   * Fetch list of dates that have execution_log entries — tenant-scoped.
   */
  availableDates: tenantProcedure.query(async ({ ctx }) => {
    const db = getGekkoDB();
    const { data, error } = await db.schema("gai").from("execution_logs")
      .select("created_at")
      .eq("tenant_id", ctx.tenant.tenant_id)
      .order("created_at", { ascending: false })
      .limit(365);

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

    const dates = new Set<string>();
    for (const row of data ?? []) {
      const d = (row as { created_at: string }).created_at;
      if (d) dates.add(d.substring(0, 10));
    }

    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }),
});
