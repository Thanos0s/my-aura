import type { GeoPoint } from "./types";

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two points, km. Pure math — no network. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export interface TravelEstimate {
  distanceKm: number;
  durationMinutes: number;
}

/**
 * Pluggable travel-time source. `defaultDistanceProvider` below is a
 * haversine-based approximation (no external API key available in this
 * environment). Swap in a real Google Distance Matrix / OSRM-backed
 * implementation later without touching any of the clustering/VRP code —
 * they only depend on this interface, not on how the numbers are produced.
 */
export interface DistanceProvider {
  estimate(a: GeoPoint, b: GeoPoint): TravelEstimate;
}

/** Straight-line distance tends to understate real road distance; this is a common rule-of-thumb correction factor for urban/semi-urban Indian road networks. */
const ROAD_DISTANCE_FACTOR = 1.3;

export function createHaversineDistanceProvider(avgSpeedKmh: number): DistanceProvider {
  return {
    estimate(a: GeoPoint, b: GeoPoint): TravelEstimate {
      const straightLineKm = haversineKm(a, b);
      const distanceKm = straightLineKm * ROAD_DISTANCE_FACTOR;
      const durationMinutes = (distanceKm / avgSpeedKmh) * 60;
      return { distanceKm, durationMinutes };
    },
  };
}

/** Full pairwise duration matrix (minutes), points[i] -> points[j]. */
export function buildDurationMatrix(points: GeoPoint[], provider: DistanceProvider): number[][] {
  return points.map((from) => points.map((to) => provider.estimate(from, to).durationMinutes));
}
