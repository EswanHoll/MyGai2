import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ─── Auth middleware ──────────────────────────────────────────────────────────

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// ─── Tenant middleware ────────────────────────────────────────────────────────

/**
 * Middleware that enforces an active, resolved tenant on the context.
 * Throws FORBIDDEN if the tenant is inactive or suspended.
 */
const requireActiveTenant = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.tenant.tenant) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Tenant not found or inactive. Contact your platform administrator.",
    });
  }

  if (ctx.tenant.tenant.status !== "active") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Tenant is ${ctx.tenant.tenant.status}. Access denied.`,
    });
  }

  return next({ ctx });
});

/**
 * Tenant-scoped protected procedure.
 * Requires authentication AND an active tenant context.
 * All Gai Orchestrator operations should use this procedure.
 */
export const tenantProcedure = t.procedure.use(requireUser).use(requireActiveTenant);

/**
 * Admin + tenant procedure for cross-tenant admin operations.
 */
export const adminTenantProcedure = t.procedure
  .use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      if (!ctx.user || ctx.user.role !== 'admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
      }
      return next({ ctx: { ...ctx, user: ctx.user } });
    })
  )
  .use(requireActiveTenant);
