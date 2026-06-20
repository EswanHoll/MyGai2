import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

// ─── Mock GekkoDB ─────────────────────────────────────────────────────────────
// All tests run against a mocked Supabase client — no live DB connection needed.

const CONTACT_ID_1 = "a1b2c3d4-e5f6-4789-8abc-def012345601";
const CONTACT_ID_2 = "b2c3d4e5-f6a7-4890-9bcd-ef0123456702";
const DEAL_ID_1 = "c3d4e5f6-a7b8-4901-acde-f01234567803";
const DEAL_ID_2 = "d4e5f6a7-b8c9-4012-bdef-012345678904";
const STAGE_ID_1 = "e5f6a7b8-c9d0-4123-cef0-123456789005";
const STAGE_ID_2 = "f6a7b8c9-d0e1-4234-def0-234567890106";
const ACTIVITY_ID_1 = "a7b8c9d0-e1f2-4345-ef01-345678901207";
const WORKFLOW_ID_1 = "b8c9d0e1-f2a3-4456-f012-456789012308";

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockContacts = [
  {
    id: CONTACT_ID_1,
    first_name: "Alice",
    last_name: "Smith",
    email: "alice@example.com",
    phone: "+27821234567",
    tier: "T3",
    company_id: "comp-1",
    owner_id: "owner-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    company: { id: "comp-1", name: "Acme Corp" },
  },
  {
    id: CONTACT_ID_2,
    first_name: "Bob",
    last_name: "Jones",
    email: "bob@example.com",
    phone: null,
    tier: "T4",
    company_id: "comp-2",
    owner_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    company: { id: "comp-2", name: "Beta Ltd" },
  },
];

const mockDeals = [
  {
    id: DEAL_ID_1,
    name: "Big Deal Alpha",
    amount: 50000,
    stage_id: STAGE_ID_1,
    company_id: "comp-1",
    owner_id: "owner-1",
    close_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stage: { id: STAGE_ID_1, name: "Proposal", position: 2 },
    company: { id: "comp-1", name: "Acme Corp" },
  },
  {
    id: DEAL_ID_2,
    name: "Medium Deal Beta",
    amount: 12000,
    stage_id: STAGE_ID_2,
    company_id: "comp-2",
    owner_id: null,
    close_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stage: { id: STAGE_ID_2, name: "Negotiation", position: 3 },
    company: { id: "comp-2", name: "Beta Ltd" },
  },
];

const mockStages = [
  { id: STAGE_ID_1, name: "Proposal", position: 2, pipeline_id: "pipe-1" },
  { id: STAGE_ID_2, name: "Negotiation", position: 3, pipeline_id: "pipe-1" },
];

const mockActivities = [
  {
    id: ACTIVITY_ID_1,
    type: "call",
    subject: "Follow-up call",
    body: "Discussed pricing",
    contact_id: CONTACT_ID_1,
    deal_id: DEAL_ID_1,
    owner_id: "owner-1",
    created_at: new Date().toISOString(),
  },
];

const mockWorkflows = [
  {
    id: WORKFLOW_ID_1,
    name: "Welcome Series",
    type: "email_campaign",
    status: "active",
    description: "Onboarding email sequence",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ─── Chainable mock query builder ────────────────────────────────────────────

function buildGrowthMockQuery(rows: unknown[], count?: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {};
  let _filtered = [...rows];

  const chain = () => builder;

  builder.select = vi.fn((_cols?: string, opts?: unknown) => {
    if (opts && typeof opts === "object" && (opts as Record<string, unknown>).head) {
      // Count query
      return {
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ count: count ?? _filtered.length, error: null })),
          gte: vi.fn(() => Promise.resolve({ count: count ?? _filtered.length, error: null })),
          neq: vi.fn(() => Promise.resolve({ count: count ?? _filtered.length, error: null })),
        })),
        gte: vi.fn(() => Promise.resolve({ count: count ?? _filtered.length, error: null })),
        neq: vi.fn(() => Promise.resolve({ count: count ?? _filtered.length, error: null })),
      };
    }
    return chain();
  });

  builder.eq = vi.fn((col: string, val: unknown) => {
    _filtered = _filtered.filter((r) => (r as Record<string, unknown>)[col] === val);
    return chain();
  });
  builder.neq = vi.fn(() => chain());
  builder.or = vi.fn(() => chain());
  builder.ilike = vi.fn((col: string, pattern: string) => {
    const p = pattern.replace(/%/g, "").toLowerCase();
    _filtered = _filtered.filter((r) =>
      String((r as Record<string, unknown>)[col] ?? "").toLowerCase().includes(p)
    );
    return chain();
  });
  builder.order = vi.fn(() => chain());
  builder.limit = vi.fn(() => chain());
  builder.range = vi.fn(() => chain());
  builder.not = vi.fn(() => chain());
  builder.gte = vi.fn(() => chain());
  builder.lte = vi.fn(() => chain());
  builder.lt = vi.fn(() => chain());

  builder.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: _filtered, error: null, count: count ?? _filtered.length }).then(resolve);

  return builder;
}

// ─── Mock module ─────────────────────────────────────────────────────────────

vi.mock("../gekkodb", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../gekkodb")>();
  return {
    ...actual,
    getGekkoDB: vi.fn(() => ({
      schema: vi.fn((_schema: string) => ({
        from: vi.fn((table: string) => {
          if (table === "crm_contacts") return buildGrowthMockQuery(mockContacts, mockContacts.length);
          if (table === "crm_deals") return buildGrowthMockQuery(mockDeals, mockDeals.length);
          if (table === "crm_pipeline_stages") return buildGrowthMockQuery(mockStages, mockStages.length);
          if (table === "crm_activities") return buildGrowthMockQuery(mockActivities, mockActivities.length);
          if (table === "mkt_workflows") return buildGrowthMockQuery(mockWorkflows, mockWorkflows.length);
          if (table === "crm_companies") return buildGrowthMockQuery([], 3);
          if (table === "mkt_social_posts") return buildGrowthMockQuery([], 5);
          return buildGrowthMockQuery([], 0);
        }),
      })),
    })),
  };
});

// ─── Context helpers ──────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeAuthCtx(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "eswan-holl",
    email: "eswan@gekkotech.co.za",
    name: "Eswan Holl",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeAnonCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// 1. growth.overview
describe("growth.overview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an object with all 8 KPI fields", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.overview();
    expect(result).toHaveProperty("active_t2_distributors");
    expect(result).toHaveProperty("active_t3_partners");
    expect(result).toHaveProperty("active_t4_agencies");
    expect(result).toHaveProperty("active_t5_clients");
    expect(result).toHaveProperty("mrr");
    expect(result).toHaveProperty("pipeline_value");
    expect(result).toHaveProperty("leads_this_month");
    expect(result).toHaveProperty("content_published");
  });

  it("returns numeric values for tier counts", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.overview();
    expect(typeof result.active_t2_distributors).toBe("number");
    expect(typeof result.active_t3_partners).toBe("number");
    expect(typeof result.active_t4_agencies).toBe("number");
    expect(typeof result.active_t5_clients).toBe("number");
  });

  it("returns pipeline_value as a number", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.overview();
    expect(typeof result.pipeline_value).toBe("number");
    expect(result.pipeline_value).toBeGreaterThanOrEqual(0);
  });

  it("returns urgent_deals as an array", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.overview();
    expect(Array.isArray(result.urgent_deals)).toBe(true);
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.growth.overview()).rejects.toThrow();
  });
});

// 2. growth.contacts.list
describe("growth.contacts.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns paginated contacts with required fields", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.contacts.list({});
    expect(result).toHaveProperty("contacts");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("pageSize");
    expect(result).toHaveProperty("totalPages");
    expect(Array.isArray(result.contacts)).toBe(true);
  });

  it("returns page=1 by default", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.contacts.list({});
    expect(result.page).toBe(1);
  });

  it("accepts tier filter without error", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.contacts.list({ tier: "T3" });
    expect(Array.isArray(result.contacts)).toBe(true);
  });

  it("accepts search filter without error", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.contacts.list({ search: "Alice" });
    expect(Array.isArray(result.contacts)).toBe(true);
  });

  it("accepts pagination params", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.contacts.list({ page: 2, pageSize: 10 });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.growth.contacts.list({})).rejects.toThrow();
  });
});

// 3. growth.deals.list
describe("growth.deals.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns paginated deals with required fields", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.deals.list({});
    expect(result).toHaveProperty("deals");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("pageSize");
    expect(result).toHaveProperty("totalPages");
    expect(Array.isArray(result.deals)).toBe(true);
  });

  it("accepts stage_id filter without error", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.deals.list({ stage_id: STAGE_ID_1 });
    expect(Array.isArray(result.deals)).toBe(true);
  });

  it("accepts search filter without error", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.deals.list({ search: "Alpha" });
    expect(Array.isArray(result.deals)).toBe(true);
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.growth.deals.list({})).rejects.toThrow();
  });
});

// 4. growth.deals.byStage
describe("growth.deals.byStage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns columns and unassigned arrays", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.deals.byStage();
    expect(result).toHaveProperty("columns");
    expect(result).toHaveProperty("unassigned");
    expect(Array.isArray(result.columns)).toBe(true);
    expect(Array.isArray(result.unassigned)).toBe(true);
  });

  it("each column has a stage and deals array", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.deals.byStage();
    for (const col of result.columns) {
      expect(col).toHaveProperty("stage");
      expect(col).toHaveProperty("deals");
      expect(Array.isArray(col.deals)).toBe(true);
    }
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.growth.deals.byStage()).rejects.toThrow();
  });
});

// 5. growth.activities.recent
describe("growth.activities.recent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an array of activities", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.activities.recent();
    expect(Array.isArray(result)).toBe(true);
  });

  it("each activity has required fields: id, created_at", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.activities.recent();
    for (const act of result) {
      expect(act).toHaveProperty("id");
      expect(act).toHaveProperty("created_at");
    }
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.growth.activities.recent()).rejects.toThrow();
  });
});

// 6. growth.campaigns.list
describe("growth.campaigns.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an array of campaigns", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.campaigns.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("each campaign has required fields: id, name, created_at", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.growth.campaigns.list();
    for (const c of result) {
      expect(c).toHaveProperty("id");
      expect(c).toHaveProperty("name");
      expect(c).toHaveProperty("created_at");
    }
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.growth.campaigns.list()).rejects.toThrow();
  });
});
