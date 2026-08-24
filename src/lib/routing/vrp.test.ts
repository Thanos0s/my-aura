import { describe, expect, it } from "vitest";
import { createHaversineDistanceProvider, haversineKm } from "@/lib/routing/distance";
import { sequenceZone, buildQueue } from "@/lib/routing/vrp";
import { DEFAULT_CONSTRAINTS, type ConsultationRequest, type GeoPoint } from "@/lib/routing/types";

function req(id: string, lat: number, lng: number): ConsultationRequest {
  return {
    id,
    patientId: `patient-${id}`,
    practitionerUserId: "doc-1",
    geo: { lat, lng },
    address: "test address",
    pinCode: "560001",
    consultationType: "HOME_VISIT",
    urgency: "ROUTINE",
    preferredWindowStart: 0,
    preferredWindowEnd: 0,
    estimatedConsultMinutes: 10,
    createdAt: 0,
  };
}

function routeDistanceKm(order: ConsultationRequest[], base: GeoPoint): number {
  let total = 0;
  let prev = base;
  for (const stop of order) {
    total += haversineKm(prev, stop.geo);
    prev = stop.geo;
  }
  return total;
}

const provider = createHaversineDistanceProvider(25);

describe("sequenceZone", () => {
  it("returns every input request exactly once", () => {
    const requests = [req("a", 12.9, 77.6), req("b", 12.95, 77.55), req("c", 12.92, 77.65)];
    const result = sequenceZone(requests, { lat: 12.9, lng: 77.6 }, provider);
    expect(result.map((r) => r.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("produces a route no longer than a deliberately bad (zig-zagging) input order", () => {
    const base: GeoPoint = { lat: 12.9, lng: 77.6 };
    // Two tight clusters far apart from each other; feeding them in
    // alternating (zig-zag) order is a classic backtracking scenario.
    const clusterA = [req("a1", 12.90, 77.60), req("a2", 12.901, 77.601), req("a3", 12.902, 77.599)];
    const clusterB = [req("b1", 13.50, 78.20), req("b2", 13.501, 78.201), req("b3", 13.502, 78.199)];
    const zigzag = [clusterA[0]!, clusterB[0]!, clusterA[1]!, clusterB[1]!, clusterA[2]!, clusterB[2]!];

    const optimized = sequenceZone(zigzag, base, provider);

    expect(routeDistanceKm(optimized, base)).toBeLessThanOrEqual(routeDistanceKm(zigzag, base) + 1e-6);
  });

  it("handles zero and one requests without error", () => {
    expect(sequenceZone([], { lat: 0, lng: 0 }, provider)).toEqual([]);
    const single = [req("a", 12.9, 77.6)];
    expect(sequenceZone(single, { lat: 0, lng: 0 }, provider)).toEqual(single);
  });
});

describe("buildQueue", () => {
  it("sequences all requests and computes increasing arrival times", () => {
    const requests = [req("a", 12.9, 77.6), req("b", 12.95, 77.55), req("c", 12.92, 77.65)];
    const constraints = { ...DEFAULT_CONSTRAINTS, basePoint: { lat: 12.9, lng: 77.6 }, dayStart: 0 };
    const { queue, overflow } = buildQueue(requests, constraints, provider);
    expect(overflow).toHaveLength(0);
    expect(queue).toHaveLength(3);
    for (let i = 1; i < queue.length; i++) {
      expect(queue[i]!.estimatedArrivalAt).toBeGreaterThan(queue[i - 1]!.estimatedArrivalAt);
    }
  });

  it("routes overflow requests instead of silently dropping them once maxPatientsPerDay is exceeded", () => {
    const requests = [req("a", 12.9, 77.6), req("b", 12.91, 77.61), req("c", 12.92, 77.62)];
    const constraints = {
      ...DEFAULT_CONSTRAINTS,
      basePoint: { lat: 12.9, lng: 77.6 },
      dayStart: 0,
      maxPatientsPerDay: 2,
    };
    const { queue, overflow } = buildQueue(requests, constraints, provider);
    expect(queue).toHaveLength(2);
    expect(overflow).toHaveLength(1);
  });

  it("routes overflow requests instead of silently dropping them once the work day ends", () => {
    const requests = [req("a", 12.9, 77.6), req("b", 12.91, 77.61)];
    const constraints = {
      ...DEFAULT_CONSTRAINTS,
      basePoint: { lat: 12.9, lng: 77.6 },
      dayStart: 0,
      workStartMinuteOfDay: 9 * 60,
      workEndMinuteOfDay: 9 * 60 + 5, // only 5 minutes of working day — nothing fits
    };
    const { queue, overflow } = buildQueue(requests, constraints, provider);
    expect(queue.length + overflow.length).toBe(2);
    expect(overflow.length).toBeGreaterThan(0);
  });
});
