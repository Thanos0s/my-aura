import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/rbac";

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachDocument = mutation({
  args: {
    visitId: v.id("visits"),
    storageId: v.id("_storage"),
    kind: v.union(
      v.literal("prescription"),
      v.literal("lab"),
      v.literal("discharge"),
      v.literal("scan"),
      v.literal("other")
    ),
    rawText: v.string(),
    structuredJson: v.string(),
    confidence: v.number(),
    failed: v.optional(v.boolean()),
  },
  returns: v.id("documentExtracts"),
  handler: async (ctx, args) => {
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new Error("Visit not found");
    const now = Date.now();
    const documentId = await ctx.db.insert("documents", {
      visitId: args.visitId,
      storageId: args.storageId,
      kind: args.kind,
      createdAt: now,
    });
    return await ctx.db.insert("documentExtracts", {
      documentId,
      visitId: args.visitId,
      rawText: args.rawText,
      structuredJson: args.structuredJson,
      confidence: args.confidence,
      reviewStatus: args.failed ? "failed" : "pending",
      createdAt: now,
    });
  },
});

export const reviewExtract = mutation({
  args: {
    extractId: v.id("documentExtracts"),
    reviewStatus: v.union(v.literal("confirmed"), v.literal("corrected")),
    structuredJson: v.optional(v.string()),
    sessionUserId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionUserId, ["practitioner"]);
    const row = await ctx.db.get(args.extractId);
    if (!row) throw new Error("Extract not found");
    await ctx.db.patch(args.extractId, {
      reviewStatus: args.reviewStatus,
      structuredJson: args.structuredJson ?? row.structuredJson,
    });
    return null;
  },
});
