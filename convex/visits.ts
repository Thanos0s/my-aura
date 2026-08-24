import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { GENESIS_HASH, hashVisitRecord } from "./lib/hash";
import { getUserSafely, requireRole } from "./lib/rbac";


const statusValidator = v.union(
  v.literal("intake"),
  v.literal("awaiting_patient_confirm"),
  v.literal("awaiting_doctor"),
  v.literal("approved"),
  v.literal("escalated")
);

const visitReturn = v.object({
  _id: v.id("visits"),
  _creationTime: v.number(),
  patientId: v.id("patients"),
  kioskId: v.string(),
  status: statusValidator,
  pathway: v.union(v.literal("allopathic"), v.literal("ayush")),
  answeredBy: v.union(v.literal("patient"), v.literal("attendant")),
  languageCode: v.string(),
  intakeJson: v.string(),
  recapText: v.string(),
  patientRecapConfirmed: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const startVisit = mutation({
  args: {
    displayName: v.string(),
    abhaId: v.optional(v.string()),
    languageCode: v.string(),
    kioskId: v.string(),
    pathway: v.union(v.literal("allopathic"), v.literal("ayush")),
    answeredBy: v.union(v.literal("patient"), v.literal("attendant")),
    intakeJson: v.string(),
    shareHistory: v.boolean(),
    shareAyush: v.boolean(),
    shareAbha: v.boolean(),
    retainAfterEncounter: v.boolean(),
    sessionUserId: v.optional(v.id("users")),
  },
  returns: v.id("visits"),
  handler: async (ctx, args) => {
    const now = Date.now();
    let patientId: Id<"patients"> | undefined;
    if (args.sessionUserId) {
      const user = await ctx.db.get(args.sessionUserId);
      if (!user || !user.active) throw new Error("Not authenticated");
      if (user.role !== "patient") throw new Error("Only patients start bound visits");
      if (user.patientId) {
        patientId = user.patientId;
        await ctx.db.patch(user.patientId, {
          languageCode: args.languageCode,
          lastKioskId: args.kioskId,
          displayName: args.displayName,
        });
      }
    }
    if (args.abhaId && !patientId) {
      const existing = await ctx.db
        .query("patients")
        .withIndex("by_abha", (q) => q.eq("abhaId", args.abhaId))
        .unique();
      if (existing) {
        patientId = existing._id;
        await ctx.db.patch(existing._id, {
          languageCode: args.languageCode,
          lastKioskId: args.kioskId,
          displayName: args.displayName,
        });
      }
    }
    if (!patientId) {
      patientId = await ctx.db.insert("patients", {
        displayName: args.displayName,
        abhaId: args.abhaId,
        languageCode: args.languageCode,
        lastKioskId: args.kioskId,
        createdAt: now,
      });
      if (args.sessionUserId) {
        await ctx.db.patch(args.sessionUserId, { patientId });
        await ctx.db.patch(patientId, { userId: args.sessionUserId });
      }
    }
    const visitId = await ctx.db.insert("visits", {
      patientId,
      kioskId: args.kioskId,
      status: "intake",
      pathway: args.pathway,
      answeredBy: args.answeredBy,
      languageCode: args.languageCode,
      intakeJson: args.intakeJson,
      recapText: "",
      patientRecapConfirmed: false,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("consentRecords", {
      visitId,
      shareHistory: args.shareHistory,
      shareAyush: args.shareAyush,
      shareAbha: args.shareAbha,
      retainAfterEncounter: args.retainAfterEncounter,
      scriptVersion: "audio-consent-v1",
      createdAt: now,
    });
    return visitId;
  },
});

export const saveIntake = mutation({
  args: {
    visitId: v.id("visits"),
    intakeJson: v.string(),
    recapText: v.optional(v.string()),
    status: v.optional(statusValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new Error("Visit not found");
    await ctx.db.patch(args.visitId, {
      intakeJson: args.intakeJson,
      recapText: args.recapText ?? visit.recapText,
      status: args.status ?? visit.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const escalate = mutation({
  args: {
    visitId: v.id("visits"),
    questionId: v.string(),
    intakeJson: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new Error("Visit not found");
    const now = Date.now();
    await ctx.db.patch(args.visitId, {
      status: "escalated",
      intakeJson: args.intakeJson,
      updatedAt: now,
    });
    await ctx.db.insert("redFlagEvents", {
      visitId: args.visitId,
      questionId: args.questionId,
      createdAt: now,
      escalationStatus: "open",
    });
    return null;
  },
});

export const confirmRecap = mutation({
  args: { visitId: v.id("visits"), recapText: v.string(), intakeJson: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new Error("Visit not found");
    if (visit.status === "escalated") {
      throw new Error("Escalated visits cannot be self-confirmed");
    }
    await ctx.db.patch(args.visitId, {
      recapText: args.recapText,
      intakeJson: args.intakeJson,
      patientRecapConfirmed: true,
      status: "awaiting_doctor",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const doctorEdit = mutation({
  args: {
    visitId: v.id("visits"),
    fieldPath: v.string(),
    originalValue: v.string(),
    correctedValue: v.string(),
    doctorName: v.string(),
    intakeJson: v.string(),
    sessionUserId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionUserId, ["practitioner", "admin"]);
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new Error("Visit not found");
    await ctx.db.patch(args.visitId, {
      intakeJson: args.intakeJson,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("doctorEdits", {
      visitId: args.visitId,
      fieldPath: args.fieldPath,
      originalValue: args.originalValue,
      correctedValue: args.correctedValue,
      doctorName: args.doctorName,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const approveVisit = mutation({
  args: {
    visitId: v.id("visits"),
    doctorName: v.string(),
    fhirBundleJson: v.string(),
    sessionUserId: v.id("users"),
  },
  returns: v.object({
    recordHash: v.string(),
    previousHash: v.string(),
    anchorId: v.string(),
  }),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionUserId, ["practitioner", "admin"]);

    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new Error("Visit not found");
    if (!visit.patientRecapConfirmed) {
      throw new Error("Patient recap not confirmed");
    }
    const pendingOcr = await ctx.db
      .query("documentExtracts")
      .withIndex("by_visit", (q) => q.eq("visitId", args.visitId))
      .take(50);
    const blocking = pendingOcr.filter(
      (row) => row.reviewStatus === "pending" && row.confidence < 0.7
    );
    if (blocking.length > 0) {
      throw new Error("Low-confidence OCR must be reviewed before approve");
    }
    const openFlags = await ctx.db
      .query("redFlagEvents")
      .withIndex("by_visit", (q) => q.eq("visitId", args.visitId))
      .take(20);
    const unresolved = openFlags.filter((f) => f.escalationStatus === "open");
    if (unresolved.length > 0 && visit.status === "escalated") {
      throw new Error("Acknowledge red flags before approve");
    }

    const previous = await ctx.db.query("auditHashes").order("desc").take(1);
    const previousHash = previous[0]?.recordHash ?? GENESIS_HASH;
    const canonical = JSON.stringify({
      visitId: args.visitId,
      intakeJson: visit.intakeJson,
      recapText: visit.recapText,
      approvedBy: args.doctorName,
    });
    const recordHash = await hashVisitRecord(canonical, previousHash);
    const now = Date.now();
    const anchorId = `mock-anchor-${now}`;
    await ctx.db.insert("auditHashes", {
      visitId: args.visitId,
      recordHash,
      previousHash,
      anchorStatus: "mocked",
      anchorId,
      createdAt: now,
    });
    await ctx.db.insert("fhirBundles", {
      visitId: args.visitId,
      bundleJson: args.fhirBundleJson,
      mockPushStatus: "mocked_ok",
      createdAt: now,
    });
    await ctx.db.patch(args.visitId, { status: "approved", updatedAt: now });
    return { recordHash, previousHash, anchorId };
  },
});

export const acknowledgeRedFlag = mutation({
  args: { eventId: v.id("redFlagEvents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Red flag not found");
    await ctx.db.patch(args.eventId, { escalationStatus: "acknowledged" });
    return null;
  },
});

export const listQueue = query({
  args: {},
  returns: v.array(visitReturn),
  handler: async (ctx) => {
    const recent = await ctx.db.query("visits").withIndex("by_created").order("desc").take(80);
    return [...recent].sort((a, b) => {
      const rank = (s: typeof a.status) => (s === "escalated" ? 0 : s === "awaiting_doctor" ? 1 : 2);
      const d = rank(a.status) - rank(b.status);
      return d !== 0 ? d : b.createdAt - a.createdAt;
    });
  },
});

export const getVisit = query({
  args: { visitId: v.id("visits") },
  returns: v.union(visitReturn, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.visitId);
  },
});

export const visitDetail = query({
  args: { visitId: v.id("visits") },
  returns: v.union(
    v.object({
      visit: visitReturn,
      patientName: v.string(),
      abhaId: v.optional(v.string()),
      flags: v.array(
        v.object({
          _id: v.id("redFlagEvents"),
          questionId: v.string(),
          escalationStatus: v.string(),
          createdAt: v.number(),
        })
      ),
      extracts: v.array(
        v.object({
          _id: v.id("documentExtracts"),
          rawText: v.string(),
          confidence: v.number(),
          reviewStatus: v.string(),
          structuredJson: v.string(),
        })
      ),
      edits: v.array(
        v.object({
          fieldPath: v.string(),
          originalValue: v.string(),
          correctedValue: v.string(),
          doctorName: v.string(),
          createdAt: v.number(),
        })
      ),
      hash: v.union(
        v.object({
          recordHash: v.string(),
          previousHash: v.string(),
          anchorStatus: v.string(),
          anchorId: v.string(),
        }),
        v.null()
      ),
      fhirJson: v.union(v.string(), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const visit = await ctx.db.get(args.visitId);
    if (!visit) return null;
    const patient = await ctx.db.get(visit.patientId);
    const flags = await ctx.db
      .query("redFlagEvents")
      .withIndex("by_visit", (q) => q.eq("visitId", args.visitId))
      .take(20);
    const extracts = await ctx.db
      .query("documentExtracts")
      .withIndex("by_visit", (q) => q.eq("visitId", args.visitId))
      .take(20);
    const edits = await ctx.db
      .query("doctorEdits")
      .withIndex("by_visit", (q) => q.eq("visitId", args.visitId))
      .take(50);
    const hashes = await ctx.db
      .query("auditHashes")
      .withIndex("by_visit", (q) => q.eq("visitId", args.visitId))
      .take(1);
    const fhir = await ctx.db
      .query("fhirBundles")
      .withIndex("by_visit", (q) => q.eq("visitId", args.visitId))
      .take(1);
    const hashRow = hashes[0];
    const fhirRow = fhir[0];
    return {
      visit,
      patientName: patient?.displayName ?? "Unknown",
      abhaId: patient?.abhaId,
      flags: flags.map((f) => ({
        _id: f._id,
        questionId: f.questionId,
        escalationStatus: f.escalationStatus,
        createdAt: f.createdAt,
      })),
      extracts: extracts.map((e) => ({
        _id: e._id,
        rawText: e.rawText,
        confidence: e.confidence,
        reviewStatus: e.reviewStatus,
        structuredJson: e.structuredJson,
      })),
      edits: edits.map((e) => ({
        fieldPath: e.fieldPath,
        originalValue: e.originalValue,
        correctedValue: e.correctedValue,
        doctorName: e.doctorName,
        createdAt: e.createdAt,
      })),
      hash: hashRow
        ? {
            recordHash: hashRow.recordHash,
            previousHash: hashRow.previousHash,
            anchorStatus: hashRow.anchorStatus,
            anchorId: hashRow.anchorId,
          }
        : null,
      fhirJson: fhirRow?.bundleJson ?? null,
    };
  },
});

export const listPatientVisits = query({
  args: {
    sessionUserId: v.union(v.id("users"), v.string()),
    patientId: v.optional(v.id("patients")),
  },
  returns: v.array(visitReturn),
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
    }
    if (!patientId) return [];
    return await ctx.db
      .query("visits")
      .withIndex("by_patient", (q) => q.eq("patientId", patientId))
      .order("desc")
      .take(40);
  },
});

export const getAyurvedaAssessment = query({
  args: { sessionUserId: v.union(v.id("users"), v.string()), visitId: v.id("visits") },
  returns: v.union(
    v.object({
      interpretation: v.string(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await getUserSafely(ctx, args.sessionUserId);
    if (!user || (user.role !== "practitioner" && user.role !== "admin")) return null;
    const rows = await ctx.db
      .query("ayurvedaAssessments")
      .withIndex("by_visit", (q) => q.eq("visitId", args.visitId))
      .take(1);
    const row = rows[0];
    if (!row) return null;
    return { interpretation: row.interpretation, updatedAt: row.updatedAt };
  },
});


export const analytics = query({
  args: {},
  returns: v.object({
    total: v.number(),
    escalated: v.number(),
    awaitingDoctor: v.number(),
    approved: v.number(),
    abhaConsentRate: v.number(),
  }),
  handler: async (ctx) => {
    const visits = await ctx.db.query("visits").withIndex("by_created").order("desc").take(200);
    const consents = await ctx.db.query("consentRecords").take(200);
    const abhaYes = consents.filter((c) => c.shareAbha).length;
    return {
      total: visits.length,
      escalated: visits.filter((x) => x.status === "escalated").length,
      awaitingDoctor: visits.filter((x) => x.status === "awaiting_doctor").length,
      approved: visits.filter((x) => x.status === "approved").length,
      abhaConsentRate: consents.length === 0 ? 0 : abhaYes / consents.length,
    };
  },
});
