import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, writeAudit } from "./lib/rbac";
import { hashPin } from "./lib/pin";


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

export const clearAllPreviousData = mutation({
  args: {},
  returns: v.object({
    deletedVisits: v.number(),
    deletedPatients: v.number(),
    deletedAppointments: v.number(),
    deletedMessages: v.number(),
    deletedExtracts: v.number(),
    deletedDocuments: v.number(),
    deletedNotes: v.number(),
    deletedCarePlans: v.number(),
    deletedSymptoms: v.number(),
    deletedAdherence: v.number(),
    deletedUsers: v.number(),
  }),
  handler: async (ctx) => {
    // 1. Delete all visits
    const visits = await ctx.db.query("visits").collect();
    for (const row of visits) await ctx.db.delete(row._id);

    // 2. Delete all consent records
    const consent = await ctx.db.query("consentRecords").collect();
    for (const row of consent) await ctx.db.delete(row._id);

    // 3. Delete all redFlagEvents
    const redFlags = await ctx.db.query("redFlagEvents").collect();
    for (const row of redFlags) await ctx.db.delete(row._id);

    // 4. Delete all doctorEdits
    const edits = await ctx.db.query("doctorEdits").collect();
    for (const row of edits) await ctx.db.delete(row._id);

    // 5. Delete all documents, extracts, hashes, fhir
    const docs = await ctx.db.query("documents").collect();
    for (const row of docs) await ctx.db.delete(row._id);
    const extracts = await ctx.db.query("documentExtracts").collect();
    for (const row of extracts) await ctx.db.delete(row._id);
    const hashes = await ctx.db.query("auditHashes").collect();
    for (const row of hashes) await ctx.db.delete(row._id);
    const fhir = await ctx.db.query("fhirBundles").collect();
    for (const row of fhir) await ctx.db.delete(row._id);

    // 6. Delete all clinical logs & plans
    const symptoms = await ctx.db.query("symptomLogs").collect();
    for (const row of symptoms) await ctx.db.delete(row._id);
    const lifestyle = await ctx.db.query("lifestyleLogs").collect();
    for (const row of lifestyle) await ctx.db.delete(row._id);
    const adherence = await ctx.db.query("adherenceLogs").collect();
    for (const row of adherence) await ctx.db.delete(row._id);
    const carePlans = await ctx.db.query("carePlans").collect();
    for (const row of carePlans) await ctx.db.delete(row._id);
    const meals = await ctx.db.query("meals").collect();
    for (const row of meals) await ctx.db.delete(row._id);
    const dietPlans = await ctx.db.query("dietPlans").collect();
    for (const row of dietPlans) await ctx.db.delete(row._id);
    const referrals = await ctx.db.query("referrals").collect();
    for (const row of referrals) await ctx.db.delete(row._id);
    const notes = await ctx.db.query("practitionerNotes").collect();
    for (const row of notes) await ctx.db.delete(row._id);
    const progress = await ctx.db.query("dietitianProgressNotes").collect();
    for (const row of progress) await ctx.db.delete(row._id);
    const assessments = await ctx.db.query("ayurvedaAssessments").collect();
    for (const row of assessments) await ctx.db.delete(row._id);

    // 7. Delete all appointments & messages
    const appts = await ctx.db.query("appointments").collect();
    for (const row of appts) await ctx.db.delete(row._id);
    const messages = await ctx.db.query("messages").collect();
    for (const row of messages) await ctx.db.delete(row._id);

    // 8. Delete all patients
    const patients = await ctx.db.query("patients").collect();
    for (const row of patients) await ctx.db.delete(row._id);

    // 9. Delete all audit logs & issues
    const logs = await ctx.db.query("auditLogs").collect();
    for (const row of logs) await ctx.db.delete(row._id);
    const issues = await ctx.db.query("issueReports").collect();
    for (const row of issues) await ctx.db.delete(row._id);

    // 10. Delete all users
    const users = await ctx.db.query("users").collect();
    for (const row of users) await ctx.db.delete(row._id);

    // 11. Re-seed clean demo user accounts
    const pinHash = await hashPin("1234");
    const now = Date.now();
    const demoPatientId = await ctx.db.insert("patients", {
      displayName: "Demo Patient",
      languageCode: "en-IN",
      createdAt: now,
    });
    const demoPatientUser = await ctx.db.insert("users", {
      email: "patient@aura.local",
      pinHash,
      role: "patient",
      displayName: "Demo Patient",
      patientId: demoPatientId,
      active: true,
      createdAt: now,
    });
    await ctx.db.patch(demoPatientId, { userId: demoPatientUser });

    await ctx.db.insert("users", {
      email: "practitioner@aura.local",
      pinHash,
      role: "practitioner",
      displayName: "Demo Practitioner",
      active: true,
      createdAt: now,
    });
    await ctx.db.insert("users", {
      email: "dietitian@aura.local",
      pinHash,
      role: "dietitian",
      displayName: "Demo Dietitian",
      active: true,
      createdAt: now,
    });
    await ctx.db.insert("users", {
      email: "admin@aura.local",
      pinHash,
      role: "admin",
      displayName: "Demo Admin",
      active: true,
      createdAt: now,
    });

    return {
      deletedVisits: visits.length,
      deletedPatients: patients.length,
      deletedAppointments: appts.length,
      deletedMessages: messages.length,
      deletedExtracts: extracts.length,
      deletedDocuments: docs.length,
      deletedNotes: notes.length,
      deletedCarePlans: carePlans.length,
      deletedSymptoms: symptoms.length,
      deletedAdherence: adherence.length,
      deletedUsers: users.length,
    };
  },
});


