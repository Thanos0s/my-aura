import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const consultationType = v.union(
  v.literal("HOME_VISIT"),
  v.literal("CLINIC_OPD"),
  v.literal("TELECONSULT")
);
const urgency = v.union(v.literal("ROUTINE"), v.literal("PRIORITY"), v.literal("EMERGENCY"));

const candidateRow = v.object({
  _id: v.id("appointments"),
  patientId: v.id("patients"),
  practitionerUserId: v.id("users"),
  patientName: v.string(),
  geo: v.optional(v.object({ lat: v.number(), lng: v.number() })),
  address: v.optional(v.string()),
  pinCode: v.optional(v.string()),
  consultationType: v.optional(consultationType),
  urgency: v.optional(urgency),
  preferredWindowStart: v.optional(v.number()),
  preferredWindowEnd: v.optional(v.number()),
  estimatedConsultMinutes: v.optional(v.number()),
  delayMinutes: v.optional(v.number()),
  scheduledAt: v.number(),
  createdAt: v.number(),
});

/**
 * Reads the day's `requested`/`confirmed` appointments for one doctor
 * (this is the "filter candidates" half of the PostGIS-style radius-query
 * pattern — Convex's own indexed query stands in for `ST_DWithin` here,
 * since there's no separate PostGIS instance in this stack).
 *
 * Lives in its own file, separate from `consultations.ts`, so the
 * network-calling `getDoctorQueue` action there can call it via
 * `internal.consultationsQueries.listQueueCandidates` without hitting
 * Convex's same-file circular-type inference issue (an action referencing
 * `internal.<its own module>.*` can't have its type inferred, since
 * resolving that reference requires the module's own type, which isn't
 * finished being computed yet).
 */
export const listQueueCandidates = internalQuery({
  args: {
    practitionerUserId: v.id("users"),
    dayStart: v.number(),
  },
  returns: v.array(candidateRow),
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

    const patients = new Map<Id<"patients">, string>();
    for (const row of rows) {
      if (!patients.has(row.patientId)) {
        const p = await ctx.db.get(row.patientId);
        patients.set(row.patientId, p?.displayName ?? "Patient");
      }
    }

    return rows.map((row) => ({
      _id: row._id,
      patientId: row.patientId,
      practitionerUserId: row.practitionerUserId,
      patientName: patients.get(row.patientId) ?? "Patient",
      geo: row.geo,
      address: row.address,
      pinCode: row.pinCode,
      consultationType: row.consultationType,
      urgency: row.urgency,
      preferredWindowStart: row.preferredWindowStart,
      preferredWindowEnd: row.preferredWindowEnd,
      estimatedConsultMinutes: row.estimatedConsultMinutes,
      delayMinutes: row.delayMinutes,
      scheduledAt: row.scheduledAt,
      createdAt: row.createdAt,
    }));
  },
});
