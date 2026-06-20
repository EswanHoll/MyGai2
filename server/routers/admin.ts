import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getGekkoDB } from "../gekkodb";
import { protectedProcedure, router } from "../_core/trpc";

/**
 * Admin router for one-off platform operations.
 * Protected — requires authenticated session.
 */
export const adminRouter = router({
  /**
   * Complete Growth Hub Phase 1:
   * 1. Write to gai.publish_queue
   * 2. Update ops.tasks record to completed
   */
  completeGrowthHubPhase1: protectedProcedure.mutation(async () => {
    const db = getGekkoDB();

    // 1. Insert into gai.publish_queue
    const { data: pqData, error: pqError } = await db
      .schema("gai")
      .from("publish_queue")
      .insert({
        manus_task_id: "0Jl1kstWNOGsxgHPRVZ3Ed",
        feature: "Growth Hub Phase 1",
        publish_url: "https://mygai.manus.space",
        status: "published",
        notes:
          "Growth Hub Phase 1 live. Pipeline + Outreach modules wired. 6 tRPC procedures. Tests passing.",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (pqError && !pqError.message.includes("duplicate")) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `publish_queue insert failed: ${pqError.message}`,
      });
    }

    // 2. Update ops.tasks
    const { data: taskData, error: taskError } = await db
      .schema("ops")
      .from("tasks")
      .update({
        status: "completed",
        notes:
          "Growth Hub Phase 1 live. Pipeline + Outreach modules wired. 6 tRPC procedures. Tests passing.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", "dfc9ca6e-ecd5-4e9a-b548-0f2772c3a909")
      .select()
      .single();

    if (taskError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `ops.tasks update failed: ${taskError.message}`,
      });
    }

    return {
      publish_queue: pqData,
      task: taskData,
      message: "Growth Hub Phase 1 completion records written successfully.",
    };
  }),
});
