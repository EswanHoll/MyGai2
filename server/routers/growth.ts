import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getGekkoDB } from "../gekkodb";
import { protectedProcedure, router } from "../_core/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CrmContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  tier: string | null;
  company_id: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  company?: { id: string; name: string | null } | null;
}

export interface CrmDeal {
  id: string;
  name: string;
  amount: number | null;
  stage_id: string | null;
  company_id: string | null;
  owner_id: string | null;
  close_date: string | null;
  created_at: string;
  updated_at: string;
  stage?: { id: string; name: string | null; position: number | null } | null;
  company?: { id: string; name: string | null } | null;
}

export interface CrmActivity {
  id: string;
  type: string | null;
  subject: string | null;
  body: string | null;
  contact_id: string | null;
  deal_id: string | null;
  owner_id: string | null;
  created_at: string;
}

export interface MktWorkflow {
  id: string;
  name: string;
  type: string | null;
  status: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  position: number | null;
  pipeline_id: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfMonth(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const growthRouter = router({
  /**
   * Returns all 8 KPI values for the Growth Hub Overview page.
   * This is a T1 platform-wide view — no company_id scoping.
   */
  overview: protectedProcedure.query(async () => {
    const db = getGekkoDB();
    const monthStart = startOfMonth();

    const [
      t2Res,
      t3Res,
      t4Res,
      t5Res,
      pipelineRes,
      leadsRes,
      contentRes,
      urgentDealsRes,
    ] = await Promise.all([
      // Active T2 Distributors
      db.schema("public").from("crm_companies")
        .select("id", { count: "exact", head: true })
        .eq("tier", "T2")
        .eq("status", "active"),

      // Active T3 Partners
      db.schema("public").from("crm_companies")
        .select("id", { count: "exact", head: true })
        .eq("tier", "T3")
        .eq("status", "active"),

      // Active T4 Agencies
      db.schema("public").from("crm_companies")
        .select("id", { count: "exact", head: true })
        .eq("tier", "T4")
        .eq("status", "active"),

      // Active T5 Clients
      db.schema("public").from("crm_companies")
        .select("id", { count: "exact", head: true })
        .eq("tier", "T5")
        .eq("status", "active"),

      // Pipeline Value: sum of crm_deals.amount where stage != closed-lost
      db.schema("public").from("crm_deals")
        .select("amount")
        .neq("stage_id", "closed-lost"),

      // Leads This Month: crm_contacts created this month
      db.schema("public").from("crm_contacts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart),

      // Content Published This Month
      db.schema("public").from("mkt_social_posts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart),

      // Top 3 urgent pipeline deals (by amount desc, not closed-lost)
      db.schema("public").from("crm_deals")
        .select("id, name, amount, stage_id, company_id, close_date, created_at, updated_at")
        .neq("stage_id", "closed-lost")
        .order("amount", { ascending: false })
        .limit(3),
    ]);

    // Calculate pipeline value from deal amounts
    const pipelineDeals = (pipelineRes.data ?? []) as Array<{ amount: number | null }>;
    const pipelineValue = pipelineDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);

    return {
      active_t2_distributors: t2Res.count ?? 0,
      active_t3_partners: t3Res.count ?? 0,
      active_t4_agencies: t4Res.count ?? 0,
      active_t5_clients: t5Res.count ?? 0,
      mrr: null as number | null, // placeholder — ops.subscriptions not yet wired
      pipeline_value: pipelineValue,
      leads_this_month: leadsRes.count ?? 0,
      content_published: contentRes.count ?? 0,
      urgent_deals: (urgentDealsRes.data ?? []) as CrmDeal[],
    };
  }),

  contacts: router({
    /**
     * Paginated, filterable contacts list.
     * Joins crm_companies for company name.
     */
    list: protectedProcedure
      .input(
        z.object({
          tier: z.enum(["T2", "T3", "T4", "T5", "all"]).optional().default("all"),
          search: z.string().optional(),
          page: z.number().int().min(1).optional().default(1),
          pageSize: z.number().int().min(1).max(100).optional().default(20),
        })
      )
      .query(async ({ input }) => {
        const db = getGekkoDB();
        const { tier, search, page, pageSize } = input;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = db.schema("public")
          .from("crm_contacts")
          .select("*, company:crm_companies(id, name)", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);

        if (tier && tier !== "all") {
          query = query.eq("tier", tier);
        }

        if (search) {
          query = query.or(
            `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
          );
        }

        const { data, error, count } = await query;
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

        return {
          contacts: (data ?? []) as CrmContact[],
          total: count ?? 0,
          page,
          pageSize,
          totalPages: Math.ceil((count ?? 0) / pageSize),
        };
      }),
  }),

  deals: router({
    /**
     * Flat deals list with stage and company info.
     */
    list: protectedProcedure
      .input(
        z.object({
          stage_id: z.string().optional(),
          search: z.string().optional(),
          page: z.number().int().min(1).optional().default(1),
          pageSize: z.number().int().min(1).max(100).optional().default(20),
        })
      )
      .query(async ({ input }) => {
        const db = getGekkoDB();
        const { stage_id, search, page, pageSize } = input;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = db.schema("public")
          .from("crm_deals")
          .select(
            "*, stage:crm_pipeline_stages(id, name, position), company:crm_companies(id, name)",
            { count: "exact" }
          )
          .order("amount", { ascending: false })
          .range(from, to);

        if (stage_id) {
          query = query.eq("stage_id", stage_id);
        }

        if (search) {
          query = query.ilike("name", `%${search}%`);
        }

        const { data, error, count } = await query;
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

        return {
          deals: (data ?? []) as CrmDeal[],
          total: count ?? 0,
          page,
          pageSize,
          totalPages: Math.ceil((count ?? 0) / pageSize),
        };
      }),

    /**
     * Deals grouped by pipeline stage — for the Kanban board.
     */
    byStage: protectedProcedure.query(async () => {
      const db = getGekkoDB();

      const [stagesRes, dealsRes] = await Promise.all([
        db.schema("public")
          .from("crm_pipeline_stages")
          .select("*")
          .order("position", { ascending: true }),
        db.schema("public")
          .from("crm_deals")
          .select(
            "*, stage:crm_pipeline_stages(id, name, position), company:crm_companies(id, name)"
          )
          .order("amount", { ascending: false }),
      ]);

      if (stagesRes.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: stagesRes.error.message });
      if (dealsRes.error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: dealsRes.error.message });

      const stages = (stagesRes.data ?? []) as PipelineStage[];
      const deals = (dealsRes.data ?? []) as CrmDeal[];

      // Group deals by stage_id
      const grouped = stages.map((stage) => ({
        stage,
        deals: deals.filter((d) => d.stage_id === stage.id),
      }));

      // Deals with no matching stage go into an "Unassigned" bucket
      const assignedIds = new Set(stages.map((s) => s.id));
      const unassigned = deals.filter((d) => !d.stage_id || !assignedIds.has(d.stage_id));

      return {
        columns: grouped,
        unassigned,
      };
    }),
  }),

  activities: router({
    /**
     * Last 20 CRM activities across all tenants.
     */
    recent: protectedProcedure.query(async () => {
      const db = getGekkoDB();
      const { data, error } = await db.schema("public")
        .from("crm_activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return (data ?? []) as CrmActivity[];
    }),
  }),

  campaigns: router({
    /**
     * List email campaigns from mkt_workflows.
     */
    list: protectedProcedure.query(async () => {
      const db = getGekkoDB();
      const { data, error } = await db.schema("public")
        .from("mkt_workflows")
        .select("*")
        .eq("type", "email_campaign")
        .order("created_at", { ascending: false });

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return (data ?? []) as MktWorkflow[];
    }),
  }),
});
