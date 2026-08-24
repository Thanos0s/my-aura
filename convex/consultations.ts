import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/rbac";
import {
  buildQueue,
  insertEmergency,
  createHaversineDistanceProvider,
} from "../src/lib/routing";
import { DEFAULT_CONSTRAINTS, type ConsultationRequest, type QueueEntry } from "../src/lib/routing/types";
import type { Doc, Id } from "./_generated/dataModel";

const session = { sessionUserId: v.union(v.id("users"), v.string()) };

const consultationType = v.union(
  v.literal("HOME_VISIT"),
  v.literal("CLINIC_OPD"),
  v.literal("TELECONSULT")
);
const urgency = v.union(v.literal("ROUTINE"), v.literal("PRIORITY"), v.literal("EMERGENCY"));

/**
 * Patient-facing ingestion endpoint for the location-aware queue engine
 * (backs POST /api/consultations/request). Sits alongside the existing
 * `clinical.requestAppointment` — this one carries the geo/type/urgency
 * fields the routing engine needs; plain time-only bookings keep using the
 * original mutation untouched.
 */
export const requestConsultation = mutation({
  args: {
    ...session,
    practitionerUserId: v.id("users"),
    geo: v.object({ lat: v.number(), lng: v.number() }),
    address: v.string(),
    pinCode: v.string(),
    consultationType,
    urgency,
    preferredWindowStart: v.number(),
    preferredWindowEnd: v.number(),
    estimatedConsultMinutes: v.optional(v.number()),
    notes: v.optional(v.string()),
    patientPhone: v.optional(v.string()),
  },
  returns: v.id("appointments"),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, ["patient"]);
    if (!user.patientId) throw new Error("Patient record missing");

    if (args.preferredWindowEnd <= args.preferredWindowStart) {
      throw new Error("preferredWindowEnd must be after preferredWindowStart");
    }

    let practId = args.practitionerUserId;
    const pract = await ctx.db.get(practId);
    if (!pract) {
      const fallback = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "practitioner"))
        .first();
      if (!fallback) throw new Error("No practitioner accounts found. Please contact your clinic.");
      practId = fallback._id;
    }

    if (args.patientPhone) {
      await ctx.db.patch(user.patientId, { phoneNumber: args.patientPhone });
    }

    return await ctx.db.insert("appointments", {
      patientId: user.patientId,
      practitionerUserId: practId,
      // scheduledAt is the queue engine's authoritative output, not a
      // patient pick — seed it with the preferred-window start until the
      // queue is (re)computed on the doctor's side.
      scheduledAt: args.preferredWindowStart,
      status: "requested",
      notes: args.notes ?? "",
      channel: "web",
      patientPhone: args.patientPhone,
      createdAt: Date.now(),
      geo: args.geo,
      address: args.address,
      pinCode: args.pinCode,
      consultationType: args.consultationType,
      urgency: args.urgency,
      preferredWindowStart: args.preferredWindowStart,
      preferredWindowEnd: args.preferredWindowEnd,
      estimatedConsultMinutes: args.estimatedConsultMinutes ?? DEFAULT_CONSTRAINTS.baseConsultMinutes,
    });
  },
});

/** Marks an appointment as delayed by N minutes; the next queue read cascades the buffer math forward from there (late-arrival / running-behind edge case). */
export const markDelayed = mutation({
  args: { ...session, appointmentId: v.id("appointments"), delayMinutes: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.sessionUserId, ["practitioner", "admin"]);
    const row = await ctx.db.get(args.appointmentId);
    if (!row) throw new Error("Appointment not found");
    if (user.role === "practitioner" && row.practitionerUserId !== user._id) {
      throw new Error("Unauthorized");
    }
    await ctx.db.patch(args.appointmentId, { delayMinutes: Math.max(0, args.delayMinutes) });
    return null;
  },
});

const queueEntryReturn = v.object({
  appointmentId: v.id("appointments"),
  patientId: v.id("patients"),
  patientName: v.string(),
  practitionerUserId: v.id("users"),
  address: v.string(),
  pinCode: v.string(),
  consultationType,
  urgency,
  sequenceIndex: v.number(),
  zoneId: v.string(),
  estimatedArrivalAt: v.number(),
  estimatedDepartureAt: v.number(),
  travelFromPreviousMinutes: v.number(),
  distanceFromPreviousKm: v.number(),
  bufferMinutes: v.number(),
});

/**
 * Doctor-facing dispatch endpoint (backs GET /api/doctor/queue). The queue
 * is computed fresh on every read from whatever `appointments` currently
 * exist for the day — cancellations and edits just disappear on the next
 * call, no separately-stored queue state to go stale. Geo-tagged requests
 * are clustered + TSP-sequenced; EMERGENCY requests are inserted at their
 * minimum-detour slot; legacy (non-geo) bookings are appended by their
 * original scheduledAt so old-style bookings still show up.
 */
export const getDoctorQueue = query({
  args: {
    practitionerUserId: v.id("users"),
    /** Midnight epoch ms for the day being scheduled. */
    dayStart: v.number(),
  },
  returns: v.object({
    queue: v.array(queueEntryReturn),
    overflow: v.array(
      v.object({
        appointmentId: v.id("appointments"),
        patientId: v.id("patients"),
        patientName: v.string(),
        reason: v.string(),
      })
    ),
    legacyCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const dayEnd = args.dayStart + 24 * 60 * 60 * 1000;
    const rows = await ctx.db
      .query("appointments")
      .withIndex("by_practitioner", (q) => q.eq("practitionerUserId", args.practitionerUserId))
      .filter((q) =>
        q.and(
          q.or(q.eq(q.field("status"), "requested"), q.eq(q.field("status"), "confirmed")),
          q.gte(q.field("scheduledAt"), args.dayStart),
          q.lt(q.field("scheduledAt"), dayEnd)
        )
      )
      .collect();

    const patients = new Map<Id<"patients">, Doc<"patients">>();
    for (const row of rows) {
      if (!patients.has(row.patientId)) {
        const p = await ctx.db.get(row.patientId);
        if (p) patients.set(row.patientId, p);
      }
    }
    const patientName = (id: Id<"patients">) => patients.get(id)?.displayName ?? "Patient";

    const geoTagged = rows.filter((r) => r.geo && r.consultationType && r.urgency);
    const legacy = rows.filter((r) => !(r.geo && r.consultationType && r.urgency));

    const routine = geoTagged.filter((r) => r.urgency !== "EMERGENCY");
    const emergencies = geoTagged.filter((r) => r.urgency === "EMERGENCY");

    const constraints = {
      ...DEFAULT_CONSTRAINTS,
      dayStart: args.dayStart,
      basePoint: routine[0]?.geo ?? DEFAULT_CONSTRAINTS.basePoint,
    };
    const provider = createHaversineDistanceProvider(constraints.avgSpeedKmh);

    const toRequest = (row: (typeof rows)[number]): ConsultationRequest => ({
      id: row._id,
      patientId: row.patientId,
      practitionerUserId: row.practitionerUserId,
      geo: row.geo!,
      address: row.address ?? "",
      pinCode: row.pinCode ?? "",
      consultationType: row.consultationType!,
      urgency: row.urgency!,
      preferredWindowStart: row.preferredWindowStart ?? row.scheduledAt,
      preferredWindowEnd: row.preferredWindowEnd ?? row.scheduledAt,
      estimatedConsultMinutes:
        (row.estimatedConsultMinutes ?? DEFAULT_CONSTRAINTS.baseConsultMinutes) +
        (row.delayMinutes ?? 0),
      createdAt: row.createdAt,
    });

    let result = buildQueue(routine.map(toRequest), constraints, provider);
    for (const emergencyRow of emergencies) {
      result = insertEmergency(result.queue, toRequest(emergencyRow), constraints, provider);
    }

    const rowById = new Map(rows.map((r) => [r._id, r] as const));
    const toEntry = (entry: QueueEntry) => {
      const row = rowById.get(entry.id as Id<"appointments">)!;
      return {
        appointmentId: row._id,
        patientId: row.patientId,
        patientName: patientName(row.patientId),
        practitionerUserId: row.practitionerUserId,
        address: entry.address,
        pinCode: entry.pinCode,
        consultationType: entry.consultationType,
        urgency: entry.urgency,
        sequenceIndex: entry.sequenceIndex,
        zoneId: entry.zoneId,
        estimatedArrivalAt: entry.estimatedArrivalAt,
        estimatedDepartureAt: entry.estimatedDepartureAt,
        travelFromPreviousMinutes: entry.travelFromPreviousMinutes,
        distanceFromPreviousKm: entry.distanceFromPreviousKm,
        bufferMinutes: entry.bufferMinutes,
      };
    };

    return {
      queue: result.queue.map(toEntry),
      overflow: result.overflow.map((r) => ({
        appointmentId: r.id as Id<"appointments">,
        patientId: r.patientId as Id<"patients">,
        patientName: patientName(r.patientId as Id<"patients">),
        reason: "Exceeds daily patient cap or working hours — needs rescheduling to another day.",
      })),
      legacyCount: legacy.length,
    };
  },
});
