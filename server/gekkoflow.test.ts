import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Mock GekkoDB ─────────────────────────────────────────────────────────────
// We mock the gekkodb module so tests don't require a live Supabase connection.

// Valid RFC 4122 v4 UUIDs for test data
const TASK_ID_1 = "a1b2c3d4-e5f6-4789-8abc-def012345678";
const TASK_ID_2 = "b2c3d4e5-f6a7-4890-9bcd-ef0123456789";
const TASK_ID_3 = "c3d4e5f6-a7b8-4901-acde-f01234567890";

const mockTasks = [
  {
    id: TASK_ID_1,
    name: "Task Alpha",
    description: "First task",
    status: "pending",
    priority: "urgent",
    project_id: null,
    delegated_to: "worker_agent",
    agent_type: "worker_agent",
    eswan_action: null,
    eswan_action_at: null,
    eswan_notes: null,
    rescheduled_to: null,
    manus_task_id: "abc123",
    notes: null,
    publish_ready: false,
    published: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: TASK_ID_2,
    name: "Task Beta",
    description: "Second task",
    status: "in_progress",
    priority: "high",
    project_id: "proj-1",
    delegated_to: "worker_agent",
    agent_type: "worker_agent",
    eswan_action: null,
    eswan_action_at: null,
    eswan_notes: null,
    rescheduled_to: null,
    manus_task_id: null,
    notes: null,
    publish_ready: false,
    published: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: TASK_ID_3,
    name: "Task Gamma",
    description: "Done task",
    status: "done",
    priority: "normal",
    project_id: null,
    delegated_to: null,
    agent_type: null,
    eswan_action: "go_ahead",
    eswan_action_at: new Date().toISOString(),
    eswan_notes: "Good work",
    rescheduled_to: null,
    manus_task_id: null,
    notes: null,
    publish_ready: true,
    published: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Build a chainable mock query builder
function buildMockQuery(rows: typeof mockTasks) {
  let filtered = [...rows];
  const builder: Record<string, unknown> = {};

  const chain = () => builder;

  builder.select = vi.fn((_cols?: string, _opts?: unknown) => {
    // If head:true (count query), return count
    if (_opts && typeof _opts === "object" && (_opts as Record<string, unknown>).head) {
      return {
        is: vi.fn(() => ({ in: vi.fn(() => Promise.resolve({ count: filtered.length, error: null })) })),
        eq: vi.fn(() => ({
          not: vi.fn(() => Promise.resolve({ count: filtered.length, error: null })),
          gte: vi.fn(() => ({ lt: vi.fn(() => Promise.resolve({ count: filtered.length, error: null })) })),
        })),
        not: vi.fn(() => Promise.resolve({ count: filtered.length, error: null })),
        in: vi.fn(() => Promise.resolve({ count: filtered.length, error: null })),
      };
    }
    return chain();
  });

  builder.order = vi.fn(() => chain());
  builder.is = vi.fn(() => chain());
  builder.in = vi.fn(() => chain());
  builder.eq = vi.fn((col: string, val: unknown) => {
    filtered = filtered.filter((r) => (r as Record<string, unknown>)[col] === val);
    return chain();
  });
  builder.not = vi.fn(() => chain());
  builder.ilike = vi.fn((col: string, pattern: string) => {
    const p = pattern.replace(/%/g, "").toLowerCase();
    filtered = filtered.filter((r) => String((r as Record<string, unknown>)[col] ?? "").toLowerCase().includes(p));
    return chain();
  });
  builder.gte = vi.fn(() => chain());
  builder.lt = vi.fn(() => chain());
  builder.lte = vi.fn(() => chain());
  builder.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  builder.single = vi.fn(() => Promise.resolve({ data: { ...filtered[0], eswan_action: "go_ahead", status: "cancelled" }, error: null }));
  builder.update = vi.fn(() => chain());
  builder.limit = vi.fn(() => chain());

  // Make it thenable so await works
  builder.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: filtered, error: null }).then(resolve);

  return builder;
}

vi.mock("./gekkodb", () => ({
  getGekkoDB: vi.fn(() => ({
    schema: vi.fn((_schema: string) => ({
      from: vi.fn((_table: string) => buildMockQuery(mockTasks)),
    })),
  })),
}));

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

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const ctx = makeAuthCtx();
    const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
    ctx.res.clearCookie = (name: string, options: Record<string, unknown>) => {
      clearedCookies.push({ name, options });
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });
});

describe("tasks.getStats", () => {
  it("returns an object with the 4 required count fields as numbers", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const stats = await caller.tasks.getStats();
    expect(stats).toHaveProperty("awaiting");
    expect(stats).toHaveProperty("urgent");
    expect(stats).toHaveProperty("in_progress");
    expect(stats).toHaveProperty("done_today");
    expect(typeof stats.awaiting).toBe("number");
    expect(typeof stats.urgent).toBe("number");
    expect(typeof stats.in_progress).toBe("number");
    expect(typeof stats.done_today).toBe("number");
  });

  it("returns non-negative counts", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const stats = await caller.tasks.getStats();
    expect(stats.awaiting).toBeGreaterThanOrEqual(0);
    expect(stats.urgent).toBeGreaterThanOrEqual(0);
    expect(stats.in_progress).toBeGreaterThanOrEqual(0);
    expect(stats.done_today).toBeGreaterThanOrEqual(0);
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.tasks.getStats()).rejects.toThrow();
  });
});

describe("tasks.getAll", () => {
  it("returns an array when called without filters", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const tasks = await caller.tasks.getAll();
    expect(Array.isArray(tasks)).toBe(true);
  });

  it("each returned task has required fields: id, name, status, priority", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const tasks = await caller.tasks.getAll();
    for (const t of tasks) {
      expect(t).toHaveProperty("id");
      expect(t).toHaveProperty("name");
      expect(t).toHaveProperty("status");
      expect(t).toHaveProperty("priority");
    }
  });

  it("status filter: only returns tasks matching the status", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const tasks = await caller.tasks.getAll({ status: "pending" });
    expect(Array.isArray(tasks)).toBe(true);
    // All returned tasks must have status 'pending'
    for (const t of tasks) {
      expect(t.status).toBe("pending");
    }
  });

  it("priority filter: only returns tasks matching the priority", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const tasks = await caller.tasks.getAll({ priority: "urgent" });
    expect(Array.isArray(tasks)).toBe(true);
    for (const t of tasks) {
      expect(t.priority).toBe("urgent");
    }
  });

  it("search filter: only returns tasks whose name contains the search term", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const tasks = await caller.tasks.getAll({ search: "Alpha" });
    expect(Array.isArray(tasks)).toBe(true);
    for (const t of tasks) {
      expect(t.name.toLowerCase()).toContain("alpha");
    }
  });

  it("filter='awaiting': returns an array (awaiting action tasks)", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const tasks = await caller.tasks.getAll({ filter: "awaiting" });
    expect(Array.isArray(tasks)).toBe(true);
  });

  it("filter='urgent': returns an array (urgent priority tasks)", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const tasks = await caller.tasks.getAll({ filter: "urgent" });
    expect(Array.isArray(tasks)).toBe(true);
  });

  it("filter='in_progress': returns an array (in-progress tasks)", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const tasks = await caller.tasks.getAll({ filter: "in_progress" });
    expect(Array.isArray(tasks)).toBe(true);
  });

  it("filter='done_today': returns an array (done today tasks)", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const tasks = await caller.tasks.getAll({ filter: "done_today" });
    expect(Array.isArray(tasks)).toBe(true);
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.tasks.getAll()).rejects.toThrow();
  });
});

describe("tasks.updateAction", () => {
  it("go_ahead: returns a task object with eswan_action field set", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.tasks.updateAction({
      id: TASK_ID_1,
      eswan_action: "go_ahead",
      eswan_notes: "Proceed with the build",
    });
    // The mock .single() returns a task with eswan_action: "go_ahead"
    expect(result).toBeDefined();
    expect(result).toHaveProperty("eswan_action");
    // The returned mock has eswan_action = 'go_ahead' per our mock setup
    expect(result.eswan_action).toBe("go_ahead");
  });

  it("hold: returns a task object with status field", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.tasks.updateAction({
      id: TASK_ID_2,
      eswan_action: "hold",
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("status");
  });

  it("reschedule: accepts rescheduled_to ISO string and returns task", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const result = await caller.tasks.updateAction({
      id: TASK_ID_2,
      eswan_action: "reschedule",
      rescheduled_to: futureDate,
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("id");
  });

  it("cancel: mock returns task with cancelled status", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.tasks.updateAction({
      id: TASK_ID_1,
      eswan_action: "cancel",
    });
    // Mock .single() returns status: 'cancelled'
    expect(result).toBeDefined();
    expect(result.status).toBe("cancelled");
  });

  it("rejects invalid eswan_action values", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    await expect(
      caller.tasks.updateAction({
        id: TASK_ID_1,
        // @ts-expect-error intentional bad value
        eswan_action: "approve",
      })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(
      caller.tasks.updateAction({
        id: TASK_ID_1,
        eswan_action: "go_ahead",
      })
    ).rejects.toThrow();
  });
});

describe("brief.getByDate", () => {
  it("returns the expected structure for a valid date", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const brief = await caller.brief.getByDate({ date: "2026-06-18" });
    expect(brief).toHaveProperty("date", "2026-06-18");
    expect(brief).toHaveProperty("summary");
    expect(brief.summary).toHaveProperty("cycles_run");
    expect(brief.summary).toHaveProperty("tasks_delegated");
    expect(brief.summary).toHaveProperty("tasks_completed");
    expect(brief.summary).toHaveProperty("errors");
    expect(brief).toHaveProperty("eswan_actions_today");
    expect(brief).toHaveProperty("delegated_logs");
    expect(brief).toHaveProperty("error_logs");
    expect(brief).toHaveProperty("gmail_highlights");
    expect(Array.isArray(brief.eswan_actions_today)).toBe(true);
    expect(Array.isArray(brief.gmail_highlights)).toBe(true);
  });

  it("rejects invalid date format", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    await expect(caller.brief.getByDate({ date: "not-a-date" })).rejects.toThrow();
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.brief.getByDate({ date: "2026-06-18" })).rejects.toThrow();
  });
});

describe("brief.availableDates", () => {
  it("returns an array of date strings", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const dates = await caller.brief.availableDates();
    expect(Array.isArray(dates)).toBe(true);
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.brief.availableDates()).rejects.toThrow();
  });
});

describe("tasks.getProjects", () => {
  it("returns an array", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const projects = await caller.tasks.getProjects();
    expect(Array.isArray(projects)).toBe(true);
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.tasks.getProjects()).rejects.toThrow();
  });
});
