import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserSafely, requireRole } from "./lib/rbac";
import type { Id } from "./_generated/dataModel";



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

export const listPatientDocumentExtracts = query({
  args: {
    sessionUserId: v.union(v.id("users"), v.string()),
    patientId: v.optional(v.union(v.id("patients"), v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getUserSafely(ctx, args.sessionUserId);
    if (!user) return [];
    
    let targetPatientId: Id<"patients"> | undefined = user.patientId;
    if (args.patientId) {
      const norm = ctx.db.normalizeId("patients", args.patientId);
      if (norm) targetPatientId = norm;
    }
    if (!targetPatientId) {
      // Check if patient row exists by user
      const patient = await ctx.db
        .query("patients")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (patient) targetPatientId = patient._id;
    }
    if (!targetPatientId) return [];

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_patient", (q) => q.eq("patientId", targetPatientId))
      .collect();

    const extracts: Array<{
      _id: Id<"documentExtracts">;
      documentId: Id<"documents">;
      visitId: Id<"visits">;
      rawText: string;
      structuredJson: string;
      confidence: number;
      reviewStatus: string;
      createdAt: number;
    }> = [];

    for (const v of visits) {
      const visitExtracts = await ctx.db
        .query("documentExtracts")
        .withIndex("by_visit", (q) => q.eq("visitId", v._id))
        .collect();
      for (const ext of visitExtracts) {
        extracts.push({
          _id: ext._id,
          documentId: ext.documentId,
          visitId: ext.visitId,
          rawText: ext.rawText ?? "",
          structuredJson: ext.structuredJson ?? "{}",
          confidence: typeof ext.confidence === "number" ? ext.confidence : 0,
          reviewStatus: ext.reviewStatus ?? "pending",
          createdAt: ext.createdAt ?? Date.now(),
        });
      }
    }

    return extracts.sort((a, b) => b.createdAt - a.createdAt);
  },
});


