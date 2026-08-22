import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export type Role = Doc<"users">["role"];

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  sessionUserId: Id<"users">
): Promise<Doc<"users">> {
  const user = await ctx.db.get(sessionUserId);
  if (!user || !user.active) {
    throw new Error("Not authenticated");
  }
  return user;
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  sessionUserId: Id<"users">,
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
