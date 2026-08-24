import { describe, expect, it } from "vitest";
import { clusterByPinCode, clusterByRadius, clusterRequests } from "@/lib/routing/clustering";
import type { ConsultationRequest } from "@/lib/routing/types";

function req(id: string, lat: number, lng: number, pinCode = "560001"): ConsultationRequest {
  return {
    id,
    patientId: `patient-${id}`,
    practitionerUserId: "doc-1",
    geo: { lat, lng },
    address: "test address",
    pinCode,
    consultationType: "HOME_VISIT",
    urgency: "ROUTINE",
    preferredWindowStart: 0,
    preferredWindowEnd: 0,
    estimatedConsultMinutes: 15,
    createdAt: 0,
  };
}

describe("clusterByPinCode", () => {
  it("groups requests sharing the same PIN code", () => {
    const requests = [req("a", 12.9, 77.6, "560001"), req("b", 12.91, 77.61, "560001"), req("c", 13.5, 78.0, "560002")];
    const zones = clusterByPinCode(requests);
    expect(zones).toHaveLength(2);
    const pin1 = zones.find((z) => z.requests.some((r) => r.id === "a"))!;
    expect(pin1.requests.map((r) => r.id).sort()).toEqual(["a", "b"]);
  });
});

describe("clusterByRadius", () => {
  it("groups points within the radius into one zone", () => {
    // ~0.1 degree lat apart is roughly 11km; use tighter deltas to stay within a 4km radius.
    const requests = [req("a", 12.90, 77.60), req("b", 12.905, 77.605), req("c", 12.902, 77.598)];
    const zones = clusterByRadius(requests, 4);
    expect(zones).toHaveLength(1);
    expect(zones[0]!.requests).toHaveLength(3);
  });

  it("splits points far apart into separate zones", () => {
    const requests = [req("a", 12.90, 77.60), req("b", 13.50, 78.20)];
    const zones = clusterByRadius(requests, 4);
    expect(zones.length).toBeGreaterThanOrEqual(2);
  });

  it("never drops a request", () => {
    const requests = [req("a", 12.9, 77.6), req("b", 20.0, 80.0), req("c", 12.91, 77.61)];
    const zones = clusterByRadius(requests, 4);
    const total = zones.reduce((sum, z) => sum + z.requests.length, 0);
    expect(total).toBe(requests.length);
  });
});

describe("clusterRequests", () => {
  it("combines PIN grouping with radius refinement without losing any request", () => {
    const requests = [
      req("a", 12.90, 77.60, "560001"),
      req("b", 12.905, 77.605, "560001"),
      req("c", 13.50, 78.20, "560002"),
    ];
    const zones = clusterRequests(requests, 4);
    const total = zones.reduce((sum, z) => sum + z.requests.length, 0);
    expect(total).toBe(3);
  });
});
