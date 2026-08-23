import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export type Role = Doc<"users">["role"];

export function normalizeUserId(
  ctx: QueryCtx | MutationCtx,
  sessionUserId: string
): Id<"users"> | null {
  return ctx.db.normalizeId("users", sessionUserId);
}

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  sessionUserId: string
): Promise<Doc<"users">> {
  const normalized = normalizeUserId(ctx, sessionUserId);
  if (!normalized) {
    throw new Error("Invalid session user");
  }
  const user = await ctx.db.get(normalized);
  if (!user || !user.active) {
    throw new Error("Not authenticated");
  }
  return user;
}

export async function getUserSafely(
  ctx: QueryCtx | MutationCtx,
  sessionUserId: string
): Promise<Doc<"users"> | null> {
  const normalized = normalizeUserId(ctx, sessionUserId);
  if (!normalized) return null;
  const user = await ctx.db.get(normalized);
  if (!user || !user.active) return null;
  return user;
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  sessionUserId: string,
  allowed: readonly Role[]
): Promise<Doc<"users">> {
  const user = await requireUser(ctx, sessionUserId);
  if (!allowed.includes(user.role)) {
    throw new Error("Unauthorized: role not permitted");
  }
  return user;
}


export async function writeAudit(
  ctx: MutationCtx,
  actorUserId: Id<"users">,
  action: string,
  target: string,
  payload: Record<string, string>
) {
  await ctx.db.insert("auditLogs", {
    actorUserId,
    action,
    target,
    payloadJson: JSON.stringify(payload),
    createdAt: Date.now(),
  });
}

export async function openReferralFor(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<"patients">,
  dietitianUserId: Id<"users">
) {
  const rows = await ctx.db
    .query("referrals")
    .withIndex("by_dietitian", (q) => q.eq("dietitianUserId", dietitianUserId))
    .take(80);
  return rows.find((r) => r.patientId === patientId && r.status === "open") ?? null;
}
