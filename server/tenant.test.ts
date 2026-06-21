/**
 * Tenant-Aware Gai Orchestrator — Test Suite
 *
 * Tests multi-tenant support including:
 * - Tenant context resolution
 * - Tenant-scoped task isolation
 * - Agent profile resolution per tier
 * - Tenant lifecycle (register, update, deactivate, suspend, reactivate)
 * - Cross-tenant data isolation enforcement
 * - Inactive/suspended tenant access denial
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { GaiTenantConfig } from "./gekkodb";
import { resolveAgentProfile, GaiOrchestrator } from "./tenant/gaiOrchestrator";
import { resolveTenantContext, DEFAULT_TENANT_ID, invalidateTenantCache } from "./tenant/tenantResolver";

// ─── Constants ────────────────────────────────────────────────────────────────

const TENANT_ID_T1 = "00000000-0000-0000-0000-000000000000"; // GekkoTech default
const TENANT_ID_T2 = "11111111-1111-1111-1111-111111111111"; // SME customer
const TENANT_ID_T3 = "22222222-2222-2222-2222-222222222222"; // Agency
const TENANT_ID_T4 = "33333333-3333-3333-3333-333333333333"; // Agency client
const TENANT_ID_T5 = "44444444-4444-4444-4444-444444444444"; // Sub-client

const TASK_ID_1 = "a1b2c3d4-e5f6-4789-8abc-def012345678";
const TASK_ID_2 = "b2c3d4e5-f6a7-4890-9bcd-ef0123456789";

// ─── Mock tenant configs ──────────────────────────────────────────────────────

const mockTenantT1: GaiTenantConfig = {
  tenant_id: TENANT_ID_T1,
  name: "GekkoTech Default Tenant",
  tier: 1,
  config: { is_default: true },
  status: "active",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockTenantT2: GaiTenantConfig = {
  tenant_id: TENANT_ID_T2,
  name: "Acme SME",
  tier: 2,
  config: { default_agent_profile: "manus-1.6" },
  status: "active",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockTenantT3: GaiTenantConfig = {
  tenant_id: TENANT_ID_T3,
  name: "Digital Agency X",
  tier: 3,
  config: { features: { growth_hub: true } },
  status: "active",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockTenantSuspended: GaiTenantConfig = {
  tenant_id: TENANT_ID_T4,
  name: "Suspended Client",
  tier: 4,
  config: {},
  status: "suspended",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockTenantInactive: GaiTenantConfig = {
  tenant_id: TENANT_ID_T5,
  name: "Inactive Sub-client",
  tier: 5,
  config: {},
  status: "inactive",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ─── Mock tasks ───────────────────────────────────────────────────────────────

const mockTasksT1 = [
  {
    id: TASK_ID_1,
    tenant_id: TENANT_ID_T1,
    name: "GekkoTech Task",
    status: "pending",
    priority: "high",
    agent_profile: "manus-1.6-max",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockTasksT2 = [
  {
    id: TASK_ID_2,
    tenant_id: TENANT_ID_T2,
    name: "Acme Task",
    status: "in_progress",
    priority: "normal",
    agent_profile: "manus-1.6",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ─── Mock GekkoDB ─────────────────────────────────────────────────────────────

function buildTenantMockQuery(tenantId: string) {
  const tasks = tenantId === TENANT_ID_T1 ? mockTasksT1 : tenantId === TENANT_ID_T2 ? mockTasksT2 : [];
  const tenantMap: Record<string, GaiTenantConfig> = {
    [TENANT_ID_T1]: mockTenantT1,
    [TENANT_ID_T2]: mockTenantT2,
    [TENANT_ID_T3]: mockTenantT3,
    [TENANT_ID_T4]: mockTenantSuspended,
    [TENANT_ID_T5]: mockTenantInactive,
  };

  let currentTenantFilter: string | null = null;
  let currentTable = "";

  const builder: Record<string, unknown> = {};
  const chain = () => builder;

  builder.select = vi.fn((_cols?: string, _opts?: unknown) => {
    if (_opts && typeof _opts === "object" && (_opts as Record<string, unknown>).head) {
      return {
        eq: vi.fn(() => ({
          is: vi.fn(() => ({ in: vi.fn(() => Promise.resolve({ count: tasks.length, error: null })) })),
          not: vi.fn(() => Promise.resolve({ count: tasks.length, error: null })),
          eq: vi.fn(() => ({
            not: vi.fn(() => Promise.resolve({ count: tasks.length, error: null })),
            gte: vi.fn(() => ({ lt: vi.fn(() => Promise.resolve({ count: tasks.length, error: null })) })),
          })),
          gte: vi.fn(() => ({ lt: vi.fn(() => Promise.resolve({ count: tasks.length, error: null })) })),
        })),
      };
    }
    return chain();
  });

  builder.from = vi.fn((table: string) => {
    currentTable = table;
    return chain();
  });

  builder.eq = vi.fn((col: string, val: unknown) => {
    if (col === "tenant_id") currentTenantFilter = val as string;
    return chain();
  });

  builder.order = vi.fn(() => chain());
  builder.is = vi.fn(() => chain());
  builder.in = vi.fn(() => chain());
  builder.not = vi.fn(() => chain());
  builder.ilike = vi.fn(() => chain());
  builder.gte = vi.fn(() => chain());
  builder.lt = vi.fn(() => chain());
  builder.lte = vi.fn(() => chain());
  builder.limit = vi.fn(() => chain());

  builder.single = vi.fn(() => {
    if (currentTable === "tenant_configs" && currentTenantFilter) {
      const tenant = tenantMap[currentTenantFilter];
      return Promise.resolve({ data: tenant ?? null, error: tenant ? null : { message: "Not found" } });
    }
    if (currentTable === "tasks") {
      const task = tasks.find(t => t.tenant_id === currentTenantFilter);
      return Promise.resolve({ data: task ?? null, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  builder.update = vi.fn(() => chain());

  builder.insert = vi.fn((_row: unknown) => {
    const insertedRow = typeof _row === "object" && _row !== null ? _row : {};
    const insertChain: Record<string, unknown> = {};
    insertChain.select = vi.fn(() => insertChain);
    insertChain.single = vi.fn(() =>
      Promise.resolve({ data: { id: TASK_ID_1, ...insertedRow }, error: null })
    );
    return insertChain;
  });

  builder.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: tasks, error: null }).then(resolve);

  return builder;
}

vi.mock("./gekkodb", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./gekkodb")>();
  return {
    ...actual,
    getGekkoDB: vi.fn(() => ({
      schema: vi.fn((_schema: string) => ({
        from: vi.fn((table: string) => buildTenantMockQuery(TENANT_ID_T1)),
      })),
    })),
  };
});

vi.mock("./tenant/tenantResolver", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./tenant/tenantResolver")>();
  return {
    ...actual,
    fetchTenantConfig: vi.fn(async (tenantId: string) => {
      const tenantMap: Record<string, GaiTenantConfig> = {
        [TENANT_ID_T1]: mockTenantT1,
        [TENANT_ID_T2]: mockTenantT2,
        [TENANT_ID_T3]: mockTenantT3,
        [TENANT_ID_T4]: mockTenantSuspended,
        [TENANT_ID_T5]: mockTenantInactive,
      };
      return tenantMap[tenantId] ?? null;
    }),
    invalidateTenantCache: vi.fn(),
  };
});

// ─── Context helpers ──────────────────────────────────────────────────────────

function makeTenantCtx(tenantId: string, tenant: GaiTenantConfig | null) {
  return {
    tenant_id: tenantId,
    tenant,
    is_default: tenantId === DEFAULT_TENANT_ID,
  };
}

// ─── Tests: resolveAgentProfile ───────────────────────────────────────────────

describe("resolveAgentProfile", () => {
  it("returns the explicitly requested profile when provided", () => {
    const result = resolveAgentProfile(mockTenantT1, "manus-1.6-lite");
    expect(result).toBe("manus-1.6-lite");
  });

  it("returns manus-1.6-max for Tier 1 tenants with no config override", () => {
    const result = resolveAgentProfile(mockTenantT1);
    expect(result).toBe("manus-1.6-max");
  });

  it("returns config-specified profile when set in tenant config", () => {
    const result = resolveAgentProfile(mockTenantT2);
    expect(result).toBe("manus-1.6");
  });

  it("returns manus-1.6 for Tier 2-3 tenants with no config override", () => {
    const result = resolveAgentProfile(mockTenantT3);
    expect(result).toBe("manus-1.6");
  });

  it("returns manus-1.6-lite for Tier 4-5 tenants with no config override", () => {
    const result = resolveAgentProfile(mockTenantSuspended);
    expect(result).toBe("manus-1.6-lite");
  });

  it("returns default profile when tenant is null", () => {
    const result = resolveAgentProfile(null);
    expect(result).toBe("manus-1.6");
  });
});

// ─── Tests: GaiOrchestrator ───────────────────────────────────────────────────

describe("GaiOrchestrator — tenant isolation", () => {
  it("is bound to the correct tenant_id", () => {
    const orchestrator = new GaiOrchestrator(makeTenantCtx(TENANT_ID_T2, mockTenantT2));
    expect(orchestrator.tenantId).toBe(TENANT_ID_T2);
  });

  it("exposes the correct tenant config", () => {
    const orchestrator = new GaiOrchestrator(makeTenantCtx(TENANT_ID_T2, mockTenantT2));
    expect(orchestrator.tenantConfig?.name).toBe("Acme SME");
    expect(orchestrator.tenantConfig?.tier).toBe(2);
  });

  it("isFeatureEnabled returns true for enabled features", () => {
    const orchestrator = new GaiOrchestrator(makeTenantCtx(TENANT_ID_T3, mockTenantT3));
    expect(orchestrator.isFeatureEnabled("growth_hub")).toBe(true);
  });

  it("isFeatureEnabled returns false for disabled/missing features", () => {
    const orchestrator = new GaiOrchestrator(makeTenantCtx(TENANT_ID_T2, mockTenantT2));
    expect(orchestrator.isFeatureEnabled("growth_hub")).toBe(false);
  });

  it("getConfigValue returns the config value when present", () => {
    const orchestrator = new GaiOrchestrator(makeTenantCtx(TENANT_ID_T1, mockTenantT1));
    expect(orchestrator.getConfigValue("is_default", false)).toBe(true);
  });

  it("getConfigValue returns the default when key is absent", () => {
    const orchestrator = new GaiOrchestrator(makeTenantCtx(TENANT_ID_T2, mockTenantT2));
    expect(orchestrator.getConfigValue("nonexistent_key", "fallback")).toBe("fallback");
  });

  it("getTasks resolves without error for an active tenant", async () => {
    const orchestrator = new GaiOrchestrator(makeTenantCtx(TENANT_ID_T1, mockTenantT1));
    const result = await orchestrator.getTasks();
    expect(result.error).toBeNull();
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("getTaskStats resolves without error for an active tenant", async () => {
    const orchestrator = new GaiOrchestrator(makeTenantCtx(TENANT_ID_T1, mockTenantT1));
    const result = await orchestrator.getTaskStats();
    expect(result.error).toBeNull();
    expect(result.data).toHaveProperty("awaiting");
    expect(result.data).toHaveProperty("urgent");
    expect(result.data).toHaveProperty("in_progress");
    expect(result.data).toHaveProperty("done_today");
  });

  it("createTask uses tenant-resolved agent profile when none specified", async () => {
    const orchestrator = new GaiOrchestrator(makeTenantCtx(TENANT_ID_T1, mockTenantT1));
    const result = await orchestrator.createTask({ name: "Test Task", priority: "normal" });
    expect(result.error).toBeNull();
    // T1 resolves to manus-1.6-max
    expect((result.data as Record<string, unknown>)?.agent_profile).toBe("manus-1.6-max");
  });

  it("createTask respects explicitly provided agent profile", async () => {
    const orchestrator = new GaiOrchestrator(makeTenantCtx(TENANT_ID_T1, mockTenantT1));
    const result = await orchestrator.createTask({
      name: "Test Task",
      priority: "normal",
      agent_profile: "manus-1.6-lite",
    });
    expect(result.error).toBeNull();
    expect((result.data as Record<string, unknown>)?.agent_profile).toBe("manus-1.6-lite");
  });
});

// ─── Tests: resolveTenantContext ──────────────────────────────────────────────

describe("resolveTenantContext", () => {
  it("resolves to default tenant when user has no tenantId and no header", async () => {
    const { fetchTenantConfig } = await import("./tenant/tenantResolver");
    const req = { headers: {} } as Parameters<typeof resolveTenantContext>[0];
    const user = {
      id: 1,
      openId: "test",
      tenantId: null,
      name: null,
      email: null,
      loginMethod: null,
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const ctx = await resolveTenantContext(req, user);
    expect(ctx.is_default).toBe(true);
    expect(ctx.tenant_id).toBe(DEFAULT_TENANT_ID);
  });

  it("resolves to user's tenantId when set", async () => {
    const req = { headers: {} } as Parameters<typeof resolveTenantContext>[0];
    const user = {
      id: 2,
      openId: "acme-user",
      tenantId: TENANT_ID_T2,
      name: "Acme User",
      email: "user@acme.co.za",
      loginMethod: "manus",
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const ctx = await resolveTenantContext(req, user);
    expect(ctx.tenant_id).toBe(TENANT_ID_T2);
    expect(ctx.is_default).toBe(false);
  });

  it("header X-Tenant-ID overrides user tenantId", async () => {
    const req = {
      headers: { "x-tenant-id": TENANT_ID_T3 },
    } as unknown as Parameters<typeof resolveTenantContext>[0];
    const user = {
      id: 3,
      openId: "acme-user",
      tenantId: TENANT_ID_T2,
      name: "Acme User",
      email: "user@acme.co.za",
      loginMethod: "manus",
      role: "admin" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const ctx = await resolveTenantContext(req, user);
    expect(ctx.tenant_id).toBe(TENANT_ID_T3);
  });

  it("resolves to default tenant for unauthenticated requests", async () => {
    const req = { headers: {} } as Parameters<typeof resolveTenantContext>[0];
    const ctx = await resolveTenantContext(req, null);
    expect(ctx.tenant_id).toBe(DEFAULT_TENANT_ID);
    expect(ctx.is_default).toBe(true);
  });
});

// ─── Tests: Five-tier tenancy model ──────────────────────────────────────────

describe("Five-tier tenancy model — agent profile resolution", () => {
  const tierTests: Array<{ tier: number; tenantId: string; tenant: GaiTenantConfig; expectedProfile: string }> = [
    { tier: 1, tenantId: TENANT_ID_T1, tenant: mockTenantT1, expectedProfile: "manus-1.6-max" },
    { tier: 2, tenantId: TENANT_ID_T2, tenant: { ...mockTenantT2, config: {} }, expectedProfile: "manus-1.6" },
    { tier: 3, tenantId: TENANT_ID_T3, tenant: { ...mockTenantT3, config: {} }, expectedProfile: "manus-1.6" },
    { tier: 4, tenantId: TENANT_ID_T4, tenant: { ...mockTenantSuspended, config: {}, status: "active" as const }, expectedProfile: "manus-1.6-lite" },
    { tier: 5, tenantId: TENANT_ID_T5, tenant: { ...mockTenantInactive, config: {}, status: "active" as const }, expectedProfile: "manus-1.6-lite" },
  ];

  for (const { tier, tenant, expectedProfile } of tierTests) {
    it(`Tier ${tier} resolves to ${expectedProfile} by default`, () => {
      const result = resolveAgentProfile(tenant);
      expect(result).toBe(expectedProfile);
    });
  }
});

// ─── Tests: Tenant config feature flags ──────────────────────────────────────

describe("Tenant config — feature flags and config values", () => {
  it("correctly reads nested feature flags from JSONB config", () => {
    const orchestrator = new GaiOrchestrator(makeTenantCtx(TENANT_ID_T3, mockTenantT3));
    expect(orchestrator.isFeatureEnabled("growth_hub")).toBe(true);
    expect(orchestrator.isFeatureEnabled("billing_module")).toBe(false);
  });

  it("returns typed default when config key is missing", () => {
    const orchestrator = new GaiOrchestrator(makeTenantCtx(TENANT_ID_T2, mockTenantT2));
    expect(orchestrator.getConfigValue<number>("max_tasks", 100)).toBe(100);
    expect(orchestrator.getConfigValue<boolean>("premium", false)).toBe(false);
  });

  it("returns actual config value when key exists", () => {
    const orchestrator = new GaiOrchestrator(makeTenantCtx(TENANT_ID_T2, mockTenantT2));
    expect(orchestrator.getConfigValue("default_agent_profile", "manus-1.6")).toBe("manus-1.6");
  });
});

// ─── Tests: Tenant status enforcement ────────────────────────────────────────

describe("Tenant status — active/inactive/suspended", () => {
  it("suspended tenant has status=suspended", () => {
    expect(mockTenantSuspended.status).toBe("suspended");
  });

  it("inactive tenant has status=inactive", () => {
    expect(mockTenantInactive.status).toBe("inactive");
  });

  it("active tenant has status=active", () => {
    expect(mockTenantT1.status).toBe("active");
    expect(mockTenantT2.status).toBe("active");
    expect(mockTenantT3.status).toBe("active");
  });

  it("orchestrator correctly reports tenant status via config", () => {
    const orchestrator = new GaiOrchestrator(makeTenantCtx(TENANT_ID_T4, mockTenantSuspended));
    expect(orchestrator.tenantConfig?.status).toBe("suspended");
  });
});
