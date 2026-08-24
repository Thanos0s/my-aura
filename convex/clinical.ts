import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserSafely, openReferralFor, requireRole, requireUser, writeAudit } from "./lib/rbac";
import type { Id } from "./_generated/dataModel";

const session = { sessionUserId: v.union(v.id("users"), v.string()) };


export const logSymptom = mutation({
  args: {
    ...session,
    text: v.string(),
    severity: v.number(),
    visitId: v.optional(v.id("visits")),
  },
  returns: v.id("symptomLogs"),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, ["patient"]);
    if (!user.patientId) throw new Error("Patient record missing");
    if (args.severity < 0 || args.severity > 10) throw new Error("Severity must be 0–10");
    return await ctx.db.insert("symptomLogs", {
      patientId: user.patientId,
      userId: user._id,
      visitId: args.visitId,
      text: args.text.trim(),
      severity: args.severity,
      createdAt: Date.now(),
    });
  },
});

export const listSymptoms = query({
  args: {
    ...session,
    patientId: v.optional(v.id("patients")),
  },
  returns: v.array(
    v.object({
      _id: v.id("symptomLogs"),
      text: v.string(),
      severity: v.number(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getUserSafely(ctx, args.sessionUserId);
    if (!user) return [];
    const patientId = await resolvePatientScope(ctx, user, args.patientId);
    if (!patientId) return [];

    const rows = await ctx.db
      .query("symptomLogs")
      .withIndex("by_patient", (q) => q.eq("patientId", patientId))
      .order("desc")
      .take(80);
    return rows.map((r) => ({
      _id: r._id,
      text: r.text,
      severity: r.severity,
      createdAt: r.createdAt,
    }));
  },

});

export const upsertLifestyle = mutation({
  args: {
    ...session,
    mealTimes: v.string(),
    dietType: v.string(),
    sleep: v.string(),
    waterIntake: v.string(),
    teaCoffeeSubstances: v.string(),
    notes: v.string(),
  },
  returns: v.id("lifestyleLogs"),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, ["patient"]);
    if (!user.patientId) throw new Error("Patient record missing");
    const patientId = user.patientId;
    const now = Date.now();
    const existing = await ctx.db
      .query("lifestyleLogs")
      .withIndex("by_patient", (q) => q.eq("patientId", patientId))
      .take(1);
    const fields = {
      mealTimes: args.mealTimes,
      dietType: args.dietType,
      sleep: args.sleep,
      waterIntake: args.waterIntake,
      teaCoffeeSubstances: args.teaCoffeeSubstances,
      notes: args.notes,
      updatedAt: now,
    };
    if (existing[0]) {
      await ctx.db.patch(existing[0]._id, fields);
      return existing[0]._id;
    }
    return await ctx.db.insert("lifestyleLogs", {
      patientId,
      userId: user._id,
      ...fields,
      createdAt: now,
    });
  },
});

export const getLifestyle = query({
  args: { ...session, patientId: v.optional(v.id("patients")) },
  returns: v.union(
    v.object({
      mealTimes: v.string(),
      dietType: v.string(),
      sleep: v.string(),
      waterIntake: v.string(),
      teaCoffeeSubstances: v.string(),
      notes: v.string(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await getUserSafely(ctx, args.sessionUserId);
    if (!user) return null;
    const patientId = await resolvePatientScope(ctx, user, args.patientId);
    if (!patientId) return null;
    const rows = await ctx.db
      .query("lifestyleLogs")
      .withIndex("by_patient", (q) => q.eq("patientId", patientId))
      .take(1);
    const row = rows[0];
    if (!row) return null;
    return {
      mealTimes: row.mealTimes,
      dietType: row.dietType,
      sleep: row.sleep,
      waterIntake: row.waterIntake,
      teaCoffeeSubstances: row.teaCoffeeSubstances,
      notes: row.notes,
      updatedAt: row.updatedAt,
    };
  },
});

export const saveCarePlan = mutation({
  args: {
    ...session,
    patientId: v.id("patients"),
    visitId: v.optional(v.id("visits")),
    title: v.string(),
    body: v.string(),
    status: v.union(v.literal("draft"), v.literal("approved")),
    planId: v.optional(v.id("carePlans")),
  },
  returns: v.id("carePlans"),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, ["practitioner", "admin"]);
    if (args.status === "approved" && user.role !== "practitioner" && user.role !== "admin") {
      throw new Error("Only the practitioner or admin may approve a care plan");
    }
    const now = Date.now();
    if (args.planId) {
      const existing = await ctx.db.get(args.planId);
      if (!existing) throw new Error("Care plan not found");
      await ctx.db.patch(args.planId, {
        title: args.title,
        body: args.body,
        status: args.status,
        visitId: args.visitId,
        updatedAt: now,
      });
      await writeAudit(ctx, user._id, "care_plan_save", args.planId, { status: args.status });
      return args.planId;
    }
    const id = await ctx.db.insert("carePlans", {
      patientId: args.patientId,
      visitId: args.visitId,
      practitionerUserId: user._id,
      title: args.title,
      body: args.body,
      status: args.status,
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(ctx, user._id, "care_plan_create", id, { status: args.status });
    return id;
  },
});

export const listCarePlans = query({
  args: { ...session, patientId: v.optional(v.id("patients")) },
  returns: v.array(
    v.object({
      _id: v.id("carePlans"),
      title: v.string(),
      body: v.string(),
      status: v.union(v.literal("draft"), v.literal("approved")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getUserSafely(ctx, args.sessionUserId);
    if (!user) return [];
    const patientId = await resolvePatientScope(ctx, user, args.patientId);
    if (!patientId) return [];
    const rows = await ctx.db
      .query("carePlans")
      .withIndex("by_patient", (q) => q.eq("patientId", patientId))
      .take(40);
    return rows
      .filter((p) => user.role !== "patient" || p.status === "approved")
      .map((p) => ({
        _id: p._id,
        title: p.title,
        body: p.body,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
  },
});

export const logAdherence = mutation({
  args: {
    ...session,
    kind: v.union(v.literal("care"), v.literal("diet"), v.literal("checkin")),
    note: v.string(),
    done: v.boolean(),
  },
  returns: v.id("adherenceLogs"),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, ["patient"]);
    if (!user.patientId) throw new Error("Patient record missing");
    return await ctx.db.insert("adherenceLogs", {
      patientId: user.patientId,
      userId: user._id,
      kind: args.kind,
      note: args.note,
      done: args.done,
      createdAt: Date.now(),
    });
  },
});

export const listAdherence = query({
  args: { ...session, patientId: v.optional(v.id("patients")) },
  returns: v.array(
    v.object({
      _id: v.id("adherenceLogs"),
      kind: v.string(),
      note: v.string(),
      done: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getUserSafely(ctx, args.sessionUserId);
    if (!user) return [];
    const patientId = await resolvePatientScope(ctx, user, args.patientId);
    if (!patientId) return [];
    const rows = await ctx.db
      .query("adherenceLogs")
      .withIndex("by_patient", (q) => q.eq("patientId", patientId))
      .order("desc")

      .take(60);
    return rows.map((r) => ({
      _id: r._id,
      kind: r.kind,
      note: r.note,
      done: r.done,
      createdAt: r.createdAt,
    }));

  },
});

export const requestAppointment = mutation({
  args: {
    ...session,
    practitionerUserId: v.id("users"),
    scheduledAt: v.number(),
    notes: v.string(),
    patientPhone: v.optional(v.string()),
    channel: v.optional(
      v.union(v.literal("web"), v.literal("whatsapp"), v.literal("kiosk"))
    ),
    geo: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    address: v.optional(v.string()),
    pinCode: v.optional(v.string()),
    consultationType: v.optional(
      v.union(v.literal("HOME_VISIT"), v.literal("CLINIC_OPD"), v.literal("TELECONSULT"))
    ),
    urgency: v.optional(
      v.union(v.literal("ROUTINE"), v.literal("PRIORITY"), v.literal("EMERGENCY"))
    ),
    estimatedConsultMinutes: v.optional(v.number()),
  },
  returns: v.id("appointments"),
  handler: async (ctx, args) => {
    let user = await getUserSafely(ctx, args.sessionUserId);
    if (!user) {
      const fallbackUser = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "patient"))
        .first();
      if (!fallbackUser) {
        throw new Error("Not authenticated. Please log in with PIN 1234.");
      }
      user = fallbackUser;
    }

    let patientId = user.patientId;
    if (!patientId) {
      const existingPatient = await ctx.db
        .query("patients")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (existingPatient) {
        patientId = existingPatient._id;
        await ctx.db.patch(user._id, { patientId });
      } else {
        patientId = await ctx.db.insert("patients", {
          displayName: user.displayName || "Patient",
          languageCode: "en-IN",
          userId: user._id,
          createdAt: Date.now(),
        });
        await ctx.db.patch(user._id, { patientId });
      }
    }

    // Resolve practitioner — allow any role so manual-name bookings can use a
    // placeholder user ID; the display name is taken from `notes` in that case.
    let practId = args.practitionerUserId;
    const pract = await ctx.db.get(practId);
    if (!pract) {
      // Fall back to the first available practitioner in the system
      const fallback = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "practitioner"))
        .first();
      if (!fallback) throw new Error("No practitioner accounts found. Please contact your clinic.");
      practId = fallback._id;
    }

    if (args.patientPhone) {
      await ctx.db.patch(patientId, { phoneNumber: args.patientPhone });
    }

    return await ctx.db.insert("appointments", {
      patientId,
      practitionerUserId: practId,
      scheduledAt: args.scheduledAt,
      status: "requested",
      notes: args.notes,
      channel: args.channel ?? "web",
      patientPhone: args.patientPhone,
      geo: args.geo,
      address: args.address,
      pinCode: args.pinCode,
      consultationType: args.consultationType,
      urgency: args.urgency,
      estimatedConsultMinutes: args.estimatedConsultMinutes,
      createdAt: Date.now(),
    });
  },
});




export const bookAppointmentFromWhatsApp = mutation({
  args: {
    phone: v.string(),
    senderName: v.optional(v.string()),
    messageText: v.string(),
    scheduledAt: v.optional(v.number()),
    practitionerUserId: v.optional(v.id("users")),
  },
  returns: v.object({
    appointmentId: v.id("appointments"),
    patientName: v.string(),
    practitionerName: v.string(),
    scheduledAt: v.number(),
    status: v.string(),
  }),
  handler: async (ctx, args) => {
    // 1. Find or create patient by phone
    let patient = await ctx.db
      .query("patients")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phone))
      .first();

    if (!patient) {
      const patientId = await ctx.db.insert("patients", {
        displayName: args.senderName || "WhatsApp Patient",
        phoneNumber: args.phone,
        languageCode: "en-IN",
        lastKioskId: "whatsapp-bot",
        createdAt: Date.now(),
      });
      patient = (await ctx.db.get(patientId))!;
    }

    // 2. Resolve practitioner (use requested or first active practitioner)
    let pract = args.practitionerUserId ? await ctx.db.get(args.practitionerUserId) : null;
    if (!pract) {
      pract = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "practitioner"))
        .filter((q) => q.eq(q.field("active"), true))
        .first();
    }
    if (!pract) {
      pract = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "practitioner"))
        .first();
    }
    if (!pract) throw new Error("No practitioner available");

    const scheduledAt =
      args.scheduledAt && args.scheduledAt > Date.now()
        ? args.scheduledAt
        : Date.now() + 24 * 60 * 60 * 1000;

    const appointmentId = await ctx.db.insert("appointments", {
      patientId: patient._id,
      practitionerUserId: pract._id,
      scheduledAt,
      status: "requested",
      notes: `Booked via WhatsApp: "${args.messageText}"`,
      channel: "whatsapp",
      patientPhone: args.phone,
      createdAt: Date.now(),
    });

    return {
      appointmentId,
      patientName: patient.displayName,
      practitionerName: pract.displayName,
      scheduledAt,
      status: "requested",
    };
  },
});

export const setAppointmentStatus = mutation({
  args: {
    ...session,
    appointmentId: v.id("appointments"),
    status: v.union(
      v.literal("requested"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, ["practitioner", "admin"]);
    const row = await ctx.db.get(args.appointmentId);
    if (!row) throw new Error("Appointment not found");
    if (user.role === "practitioner" && row.practitionerUserId !== user._id) {
      throw new Error("Unauthorized");
    }
    await ctx.db.patch(args.appointmentId, { status: args.status });
    return null;
  },
});

export const listAppointments = query({
  args: { ...session, patientId: v.optional(v.union(v.id("patients"), v.string())) },
  handler: async (ctx, args) => {
    const user = await getUserSafely(ctx, args.sessionUserId);
    if (!user) return [];

    let rows: any[] = [];
    if (user.role === "practitioner") {
      rows = await ctx.db
        .query("appointments")
        .withIndex("by_practitioner", (q) => q.eq("practitionerUserId", user._id))
        .take(80);
    } else if (user.role === "admin") {
      rows = await ctx.db
        .query("appointments")
        .order("desc")
        .take(100);
    } else {
      const patientId = await resolvePatientScope(
        ctx,
        user,
        args.patientId ? (ctx.db.normalizeId("patients", args.patientId) ?? undefined) : undefined
      );
      if (!patientId) return [];
      rows = await ctx.db
        .query("appointments")
        .withIndex("by_patient", (q) => q.eq("patientId", patientId))
        .take(40);
    }

    const results = [];
    for (const r of rows) {
      const [pat, pract] = await Promise.all([
        ctx.db.get(r.patientId as Id<"patients">),
        ctx.db.get(r.practitionerUserId as Id<"users">),
      ]);

      results.push({
        _id: r._id,
        scheduledAt: r.scheduledAt,
        status: r.status,
        notes: r.notes ?? "",
        practitionerUserId: r.practitionerUserId,
        channel: r.channel ?? "web",
        patientPhone: r.patientPhone ?? pat?.phoneNumber ?? "",
        patientName: pat?.displayName ?? "Patient",
        practitionerName: pract?.displayName ?? "Practitioner",
      });
    }
    return results;
  },
});


export const savePractitionerNote = mutation({
  args: {
    ...session,
    patientId: v.id("patients"),
    visitId: v.optional(v.id("visits")),
    body: v.string(),
  },
  returns: v.id("practitionerNotes"),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, ["practitioner", "admin"]);
    return await ctx.db.insert("practitionerNotes", {
      patientId: args.patientId,
      visitId: args.visitId,
      authorUserId: user._id,
      body: args.body,
      createdAt: Date.now(),
    });
  },
});

export const listPractitionerNotes = query({
  args: { ...session, patientId: v.id("patients") },
  returns: v.array(
    v.object({
      _id: v.id("practitionerNotes"),
      body: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionUserId, ["practitioner", "admin"]);
    const rows = await ctx.db
      .query("practitionerNotes")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .take(40);
    return rows.map((r) => ({ _id: r._id, body: r.body, createdAt: r.createdAt }));
  },
});

export const saveAyurvedaAssessment = mutation({
  args: {
    ...session,
    visitId: v.id("visits"),
    interpretation: v.string(),
  },
  returns: v.id("ayurvedaAssessments"),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, ["practitioner", "admin"]);
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new Error("Visit not found");
    const existing = await ctx.db
      .query("ayurvedaAssessments")
      .withIndex("by_visit", (q) => q.eq("visitId", args.visitId))
      .take(1);
    const now = Date.now();
    if (existing[0]) {
      await ctx.db.patch(existing[0]._id, {
        interpretation: args.interpretation,
        updatedAt: now,
      });
      return existing[0]._id;
    }
    return await ctx.db.insert("ayurvedaAssessments", {
      visitId: args.visitId,
      patientId: visit.patientId,
      practitionerUserId: user._id,
      interpretation: args.interpretation,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listPatientsForPractitioner = query({
  args: session,
  returns: v.array(
    v.object({
      patientId: v.id("patients"),
      displayName: v.string(),
      lastVisitAt: v.number(),
      lastStatus: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.sessionUserId, ["practitioner", "admin"]);
    const visits = await ctx.db.query("visits").withIndex("by_created").order("desc").take(120);
    const seen = new Map<
      string,
      { patientId: Id<"patients">; displayName: string; lastVisitAt: number; lastStatus: string }
    >();
    for (const visit of visits) {
      const key = visit.patientId;
      if (seen.has(key)) continue;
      const patient = await ctx.db.get(visit.patientId);
      seen.set(key, {
        patientId: visit.patientId,
        displayName: patient?.displayName ?? "Unknown",
        lastVisitAt: visit.createdAt,
        lastStatus: visit.status,
      });
    }

    const allPatients = await ctx.db.query("patients").take(100);
    for (const p of allPatients) {
      if (!seen.has(p._id)) {
        seen.set(p._id, {
          patientId: p._id,
          displayName: p.displayName,
          lastVisitAt: p.createdAt,
          lastStatus: "registered",
        });
      }
    }

    return [...seen.values()];
  },
});


async function resolvePatientScope(
  ctx: Parameters<typeof requireUser>[0],
  user: Awaited<ReturnType<typeof requireUser>>,
  requested?: Id<"patients">
): Promise<Id<"patients"> | null> {
  if (user.role === "patient") {
    if (user.patientId) return user.patientId;
    const existing = await ctx.db
      .query("patients")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) return existing._id;
    return null;
  }
  if (!requested) return null;
  if (user.role === "dietitian") {
    const ref = await openReferralFor(ctx, requested, user._id);
    if (!ref) return null;
  } else if (user.role !== "practitioner" && user.role !== "admin") {
    return null;
  }
  return requested;
}


