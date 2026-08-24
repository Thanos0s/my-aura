import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserSafely, requireRole } from "./lib/rbac";
import { internal } from "./_generated/api";

import { buildQueue } from "../src/lib/routing/vrp";
import { insertEmergency } from "../src/lib/routing/emergencyInsert";
import { createHybridDistanceProvider } from "../src/lib/routing/osrm";
import { DEFAULT_CONSTRAINTS, type ConsultationRequest, type GeoPoint, type QueueEntry } from "../src/lib/routing/types";
import type { Id } from "./_generated/dataModel";

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
    patientId: v.optional(v.id("patients")),
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
    let user = await getUserSafely(ctx, args.sessionUserId);
    if (!user) {
      const fallbackUser = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "patient"))
        .first();
      if (!fallbackUser) throw new Error("Not authenticated");
      user = fallbackUser;
    }

    let targetPatientId = user.patientId ?? args.patientId;
    if (!targetPatientId) {
      const existing = await ctx.db
        .query("patients")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (existing) {
        targetPatientId = existing._id;
        await ctx.db.patch(user._id, { patientId: targetPatientId });
      } else {
        targetPatientId = await ctx.db.insert("patients", {
          displayName: user.displayName || "Patient",
          languageCode: "en-IN",
          userId: user._id,
          createdAt: Date.now(),
        });
        await ctx.db.patch(user._id, { patientId: targetPatientId });
      }
    }



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
      await ctx.db.patch(targetPatientId, { phoneNumber: args.patientPhone });
    }

    return await ctx.db.insert("appointments", {
      patientId: targetPatientId,
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

interface DoctorQueueEntry {
  appointmentId: Id<"appointments">;
  patientId: Id<"patients">;
  patientName: string;
  practitionerUserId: Id<"users">;
  address: string;
  pinCode: string;
  consultationType: "HOME_VISIT" | "CLINIC_OPD" | "TELECONSULT";
  urgency: "ROUTINE" | "PRIORITY" | "EMERGENCY";
  sequenceIndex: number;
  zoneId: string;
  estimatedArrivalAt: number;
  estimatedDepartureAt: number;
  travelFromPreviousMinutes: number;
  distanceFromPreviousKm: number;
  bufferMinutes: number;
}

interface DoctorQueueResult {
  queue: DoctorQueueEntry[];
  overflow: Array<{
    appointmentId: Id<"appointments">;
    patientId: Id<"patients">;
    patientName: string;
    reason: string;
  }>;
  legacyCount: number;
  distanceSource: "osrm" | "haversine";
}

/**
 * Doctor-facing dispatch endpoint (backs GET /api/doctor/queue). The queue
 * is computed fresh on every call from whatever `appointments` currently
 * exist for the day — cancellations and edits just disappear on the next
 * call, no separately-stored queue state to go stale.
 *
 * This is an action (not a query) because building the driving-distance
 * matrix calls out to OSRM's `/table/v1/driving` endpoint over HTTP, and
 * only actions can make network calls in Convex. `OSRM_BASE_URL` must be
 * set via `npx convex env set OSRM_BASE_URL https://your-osrm-host` for a
 * self-hosted OSRM instance to be used; if it's unset, or the request
 * fails/times out, this transparently falls back to the haversine-based
 * estimator (`src/lib/routing/distance.ts`) so the queue is never blocked
 * on OSRM being up.
 */
export const getDoctorQueue = action({
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
    distanceSource: v.union(v.literal("osrm"), v.literal("haversine")),
  }),
  handler: async (ctx, args): Promise<DoctorQueueResult> => {
    const rows = await ctx.runQuery(internal.consultationsQueries.listQueueCandidates, {
      practitionerUserId: args.practitionerUserId,
      dayStart: args.dayStart,
    });

    const patientName = (id: Id<"patients">) =>
      rows.find((r) => r.patientId === id)?.patientName ?? "Patient";

    const geoTagged = rows.filter((r) => r.geo && r.consultationType && r.urgency);
    const legacy = rows.filter((r) => !(r.geo && r.consultationType && r.urgency));

    const routine = geoTagged.filter((r) => r.urgency !== "EMERGENCY");
    const emergencies = geoTagged.filter((r) => r.urgency === "EMERGENCY");

    const constraints = {
      ...DEFAULT_CONSTRAINTS,
      dayStart: args.dayStart,
      basePoint: routine[0]?.geo ?? DEFAULT_CONSTRAINTS.basePoint,
    };

    // Build the driving-distance matrix once, up front, for every point the
    // optimizer might need a pairwise estimate between (base + every
    // geo-tagged request, routine or emergency) — this is the "send
    // filtered spatial coordinates to OSRM to build the exact driving
    // matrix" step, done in a single batched /table call rather than one
    // request per pair.
    const allPoints: GeoPoint[] = [constraints.basePoint, ...geoTagged.map((r) => r.geo!)];
    const osrmBaseUrl = process.env.OSRM_BASE_URL;
    const { provider, source: distanceSource } = await createHybridDistanceProvider(
      allPoints,
      osrmBaseUrl,
      constraints.avgSpeedKmh
    );

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
      distanceSource,
    };
  },
});
