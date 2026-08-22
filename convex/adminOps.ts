import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, writeAudit } from "./lib/rbac";

export const listKnowledge = query({
  args: { sessionUserId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("knowledgeBase"),
      kind: v.union(v.literal("article"), v.literal("prompt")),
      title: v.string(),
      body: v.string(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionUserId, ["admin", "practitioner"]);
    const rows = await ctx.db.query("knowledgeBase").take(80);
    return rows.map((r) => ({
      _id: r._id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      updatedAt: r.updatedAt,
    }));
  },
});

export const saveKnowledge = mutation({
  args: {
    sessionUserId: v.id("users"),
    entryId: v.optional(v.id("knowledgeBase")),
    kind: v.union(v.literal("article"), v.literal("prompt")),
    title: v.string(),
    body: v.string(),
  },
  returns: v.id("knowledgeBase"),
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, args.sessionUserId, ["admin"]);
    const now = Date.now();
    if (args.entryId) {
      const row = await ctx.db.get(args.entryId);
      if (!row) throw new Error("Knowledge entry not found");
      await ctx.db.patch(args.entryId, {
        kind: args.kind,
        title: args.title,
        body: args.body,
        updatedAt: now,
      });
      await writeAudit(ctx, admin._id, "kb_update", args.entryId, { title: args.title });
      return args.entryId;
    }
    const id = await ctx.db.insert("knowledgeBase", {
      kind: args.kind,
      title: args.title,
      body: args.body,
      createdBy: admin._id,
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(ctx, admin._id, "kb_create", id, { title: args.title });
    return id;
  },
});

export const deleteKnowledge = mutation({
  args: { sessionUserId: v.id("users"), entryId: v.id("knowledgeBase") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, args.sessionUserId, ["admin"]);
    await ctx.db.delete(args.entryId);
    await writeAudit(ctx, admin._id, "kb_delete", args.entryId, {});
    return null;
  },
});

export const reportIssue = mutation({
  args: {
    sessionUserId: v.id("users"),
    title: v.string(),
    body: v.string(),
  },
  returns: v.id("issueReports"),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, [
      "patient",
      "practitioner",
      "dietitian",
      "admin",
    ]);
    return await ctx.db.insert("issueReports", {
      reporterUserId: user._id,
      title: args.title,
      body: args.body,
      status: "open",
      createdAt: Date.now(),
    });
  },
});

export const listIssues = query({
  args: { sessionUserId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("issueReports"),
      title: v.string(),
      body: v.string(),
      status: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionUserId, ["admin"]);
    const rows = await ctx.db.query("issueReports").take(80);
    return rows.map((r) => ({
      _id: r._id,
      title: r.title,
      body: r.body,
      status: r.status,
      createdAt: r.createdAt,
    }));
  },
});

export const listAudit = query({
  args: { sessionUserId: v.id("users") },
  returns: v.array(
    v.object({
      action: v.string(),
      target: v.string(),
      payloadJson: v.string(),
      createdAt: v.number(),
      actorUserId: v.id("users"),
    })
  ),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionUserId, ["admin"]);
    const logs = await ctx.db.query("auditLogs").withIndex("by_created").order("desc").take(80);
    const edits = await ctx.db.query("doctorEdits").take(80);
    const fromLogs = logs.map((l) => ({
      action: l.action,
      target: l.target,
      payloadJson: l.payloadJson,
      createdAt: l.createdAt,
      actorUserId: l.actorUserId,
    }));
    const fromEdits = edits.map((e) => ({
      action: "doctor_edit",
      target: e.visitId,
      payloadJson: JSON.stringify({
        fieldPath: e.fieldPath,
        originalValue: e.originalValue,
        correctedValue: e.correctedValue,
        doctorName: e.doctorName,
      }),
      createdAt: e.createdAt,
      actorUserId: args.sessionUserId,
    }));
    return [...fromLogs, ...fromEdits].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
  },
});

export const systemAnalytics = query({
  args: { sessionUserId: v.id("users") },
  returns: v.object({
    users: v.number(),
    patients: v.number(),
    practitioners: v.number(),
    dietitians: v.number(),
    visits: v.number(),
    documents: v.number(),
    openIssues: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionUserId, ["admin"]);
    const users = await ctx.db.query("users").take(200);
    const patients = await ctx.db.query("patients").take(200);
    const visits = await ctx.db.query("visits").take(200);
    const documents = await ctx.db.query("documents").take(200);
    const issues = await ctx.db.query("issueReports").take(100);
    return {
      users: users.length,
      patients: patients.length,
      practitioners: users.filter((u) => u.role === "practitioner").length,
      dietitians: users.filter((u) => u.role === "dietitian").length,
      visits: visits.length,
      documents: documents.length,
      openIssues: issues.filter((i) => i.status === "open").length,
    };
  },
});
