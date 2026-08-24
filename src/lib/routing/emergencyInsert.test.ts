import { describe, expect, it } from "vitest";
import { createHaversineDistanceProvider } from "@/lib/routing/distance";
import { buildQueue } from "@/lib/routing/vrp";
import { insertEmergency } from "@/lib/routing/emergencyInsert";
import { DEFAULT_CONSTRAINTS, type ConsultationRequest, type UrgencyLevel } from "@/lib/routing/types";

function req(
  id: string,
  lat: number,
  lng: number,
  urgency: UrgencyLevel = "ROUTINE"
): ConsultationRequest {
  return {
    id,
    patientId: `patient-${id}`,
    practitionerUserId: "doc-1",
    geo: { lat, lng },
    address: "test address",
    pinCode: "560001",
    consultationType: "HOME_VISIT",
    urgency,
    preferredWindowStart: 0,
    preferredWindowEnd: 0,
    estimatedConsultMinutes: 10,
    createdAt: 0,
  };
}

const provider = createHaversineDistanceProvider(25);
const base = { lat: 12.9, lng: 77.6 };
const constraints = { ...DEFAULT_CONSTRAINTS, basePoint: base, dayStart: 0 };

describe("insertEmergency", () => {
  it("inserts the new request into the queue without dropping anyone", () => {
    const routine = [req("a", 12.9, 77.6), req("b", 12.95, 77.65), req("c", 13.0, 77.7)];
    const { queue } = buildQueue(routine, constraints, provider);
    const emergency = req("urgent", 12.91, 77.61, "EMERGENCY");

    const result = insertEmergency(queue, emergency, constraints, provider);
    expect(result.queue.map((q) => q.id).sort()).toEqual(["a", "b", "c", "urgent"].sort());
    expect(result.queue.some((q) => q.id === "urgent" && q.zoneId === "emergency")).toBe(true);
  });

  it("leaves the ETA of every stop before the insertion point unchanged (minimal displacement)", () => {
    const routine = [req("a", 12.9, 77.6), req("b", 12.95, 77.65), req("c", 13.0, 77.7)];
    const { queue } = buildQueue(routine, constraints, provider);
    // Geographically very close to "c" (the last stop) so the cheapest insertion point is at/after the end.
    const emergency = req("urgent", 13.001, 77.701, "EMERGENCY");

    const result = insertEmergency(queue, emergency, constraints, provider);
    const insertedIndex = result.queue.findIndex((q) => q.id === "urgent");

    for (let i = 0; i < insertedIndex; i++) {
      const before = queue[i]!;
      const after = result.queue[i]!;
      expect(after.id).toBe(before.id);
      expect(after.estimatedArrivalAt).toBe(before.estimatedArrivalAt);
      expect(after.estimatedDepartureAt).toBe(before.estimatedDepartureAt);
    }
  });

  it("picks the true minimum-detour slot rather than always appending at the end", () => {
    // "b" sits between "a" and "c" on a line; an emergency request right next
    // to "b" should be inserted next to it, not tacked onto the end.
    const routine = [req("a", 12.90, 77.60), req("b", 12.95, 77.65), req("c", 13.00, 77.70)];
    const { queue } = buildQueue(routine, constraints, provider);
    const emergency = req("urgent", 12.951, 77.651, "EMERGENCY");

    const result = insertEmergency(queue, emergency, constraints, provider);
    const insertedIndex = result.queue.findIndex((q) => q.id === "urgent");
    // Should land adjacent to "b" (index 1), not at the very end (index 3).
    expect(insertedIndex).toBeGreaterThan(0);
    expect(insertedIndex).toBeLessThan(3);
  });
});
