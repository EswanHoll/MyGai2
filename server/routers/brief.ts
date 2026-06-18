import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getGekkoDB, type GaiExecutionLog } from "../gekkodb";
import { protectedProcedure, router } from "../_core/trpc";

export const briefRouter = router({
  /**
   * Fetch daily brief data for a given date (YYYY-MM-DD).
   * Aggregates execution_logs and daily_reports for that date.
   */
  getByDate: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = getGekkoDB();
      const dateStart = `${input.date}T00:00:00.000Z`;
      const dateEnd = `${input.date}T23:59:59.999Z`;

      const [logsRes, reportRes, tasksRes, inProgressRes, blockedRes, awaitingRes] = await Promise.all([
        // Execution logs for the day
        db.schema("gai").from("execution_logs")
          .select("*")
          .gte("created_at", dateStart)
          .lte("created_at", dateEnd)
          .order("created_at", { ascending: true }),

        // Daily report for the date
        db.schema("gai").from("daily_reports")
          .select("*")
          .eq("report_date", input.date)
          .maybeSingle(),

        // Tasks with Eswan actions on this date
        db.schema("gai").from("tasks")
          .select("*")
          .not("eswan_action", "is", null)
          .gte("eswan_action_at", dateStart)
          .lte("eswan_action_at", dateEnd),

        // In-progress tasks
        db.schema("gai").from("tasks")
          .select("id, name, status, priority, delegated_to, updated_at")
          .eq("status", "in_progress")
          .order("updated_at", { ascending: false })
          .limit(20),

        // Blocked tasks
        db.schema("gai").from("tasks")
          .select("id, name, status, priority, delegated_to, updated_at")
          .eq("status", "blocked")
          .order("updated_at", { ascending: false })
          .limit(20),

        // Awaiting decision tasks (pending with no eswan_action)
        db.schema("gai").from("tasks")
          .select("id, name, status, priority, delegated_to, updated_at")
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
      const report = reportRes.data as any;
      const gmailHighlights = report?.content?.gmail_highlights ?? [];

      return {
        date: input.date,
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
   * Fetch list of dates that have execution_log entries (for date picker).
   */
  availableDates: protectedProcedure.query(async () => {
    const db = getGekkoDB();
    // Get distinct dates from execution_logs
    const { data, error } = await db.schema("gai").from("execution_logs")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(365);

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

    // Extract unique dates
    const dates = new Set<string>();
    for (const row of data ?? []) {
      const d = (row as { created_at: string }).created_at;
      if (d) dates.add(d.substring(0, 10));
    }

    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }),
});
