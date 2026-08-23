import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserSafely, openReferralFor, requireUser } from "./lib/rbac";

export const sendMessage = mutation({
  args: {
    sessionUserId: v.union(v.id("users"), v.string()),
    patientId: v.optional(v.id("patients")),
    visitId: v.optional(v.id("visits")),
    toRole: v.union(v.literal("practitioner"), v.literal("dietitian"), v.literal("patient")),
    body: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionUserId);
    const text = args.body.trim();
    if (!text) throw new Error("Message body required");
    let patientId = args.patientId;
    if (user.role === "patient") {
      if (!user.patientId) throw new Error("Patient record missing");
      patientId = user.patientId;
      if (args.toRole === "patient") throw new Error("Patients message practitioner or dietitian");
    } else {
      if (!patientId) throw new Error("patientId required");
      if (user.role === "dietitian") {
        const ref = await openReferralFor(ctx, patientId, user._id);
        if (!ref) throw new Error("Unauthorized: no referral");
      } else if (user.role !== "practitioner" && user.role !== "admin") {
        throw new Error("Unauthorized");
      }
    }
    return await ctx.db.insert("messages", {
      patientId: patientId!,
      visitId: args.visitId,
      fromUserId: user._id,
      toRole: args.toRole,
      body: text,
      createdAt: Date.now(),
    });
  },
});

export const listMessages = query({
  args: {
    sessionUserId: v.union(v.id("users"), v.string()),
    patientId: v.optional(v.id("patients")),
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      body: v.string(),
      toRole: v.string(),
      fromUserId: v.id("users"),
      fromName: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getUserSafely(ctx, args.sessionUserId);
    if (!user) return [];
    let patientId = args.patientId;
    if (user.role === "patient") {
      patientId = user.patientId;
      if (!patientId) {
        const p = await ctx.db
          .query("patients")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();
        patientId = p?._id;
      }
    } else if (!patientId) {
      return [];
    } else if (user.role === "dietitian") {
      const ref = await openReferralFor(ctx, patientId, user._id);
      if (!ref) return [];
    }
    if (!patientId) return [];
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_patient", (q) => q.eq("patientId", patientId))
      .take(80);

    const out = [];
    for (const row of rows) {
      const from = await ctx.db.get(row.fromUserId);
      out.push({
        _id: row._id,
        body: row.body,
        toRole: row.toRole,
        fromUserId: row.fromUserId,
        fromName: from?.displayName ?? "Unknown",
        createdAt: row.createdAt,
      });
    }
    return out.sort((a, b) => a.createdAt - b.createdAt);
  },
});
