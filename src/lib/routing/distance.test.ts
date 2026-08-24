import { describe, expect, it } from "vitest";
import { createHaversineDistanceProvider, haversineKm } from "@/lib/routing/distance";

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm({ lat: 12.97, lng: 77.59 }, { lat: 12.97, lng: 77.59 })).toBe(0);
  });

  it("is symmetric", () => {
    const a = { lat: 12.97, lng: 77.59 };
    const b = { lat: 13.03, lng: 77.62 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });

  it("approximates a known real-world distance (Bengaluru MG Road to Whitefield, ~15km)", () => {
    const mgRoad = { lat: 12.9758, lng: 77.6045 };
    const whitefield = { lat: 12.9698, lng: 77.7499 };
    const km = haversineKm(mgRoad, whitefield);
    expect(km).toBeGreaterThan(10);
    expect(km).toBeLessThan(20);
  });
});

describe("createHaversineDistanceProvider", () => {
  it("scales duration inversely with average speed", () => {
    const a = { lat: 12.97, lng: 77.59 };
    const b = { lat: 13.03, lng: 77.62 };
    const slow = createHaversineDistanceProvider(10).estimate(a, b);
    const fast = createHaversineDistanceProvider(50).estimate(a, b);
    expect(slow.distanceKm).toBeCloseTo(fast.distanceKm, 6);
    expect(slow.durationMinutes).toBeGreaterThan(fast.durationMinutes);
  });

  it("applies a road-distance correction above straight-line distance", () => {
    const a = { lat: 12.97, lng: 77.59 };
    const b = { lat: 13.03, lng: 77.62 };
    const straightLine = haversineKm(a, b);
    const { distanceKm } = createHaversineDistanceProvider(25).estimate(a, b);
    expect(distanceKm).toBeGreaterThan(straightLine);
  });
});
