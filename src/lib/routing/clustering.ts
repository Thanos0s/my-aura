import { haversineKm } from "./distance";
import type { ConsultationRequest } from "./types";

export interface Zone {
  id: string;
  requests: ConsultationRequest[];
}

/** Coarse first pass: group by PIN/postal code (cheap, and a natural grouping key for Indian addresses). */
export function clusterByPinCode(requests: ConsultationRequest[]): Zone[] {
  const byPin = new Map<string, ConsultationRequest[]>();
  for (const r of requests) {
    const key = r.pinCode || "unknown";
    const list = byPin.get(key) ?? [];
    list.push(r);
    byPin.set(key, list);
  }
  return [...byPin.entries()].map(([pin, reqs]) => ({ id: `pin-${pin}`, requests: reqs }));
}

/**
 * Refines PIN-code zones (or any zone) by geographic radius: within each
 * input zone, greedily seed sub-zones and absorb every request within
 * `radiusKm` of the seed; leftover singletons merge into the nearest
 * resulting sub-zone so no patient is left in a zone of one unless they're
 * genuinely isolated.
 */
export function clusterByRadius(
  requests: ConsultationRequest[],
  radiusKm = 4,
  zonePrefix = "zone"
): Zone[] {
  const remaining = [...requests];
  const zones: Zone[] = [];

  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    const members = [seed];
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (haversineKm(seed.geo, remaining[i]!.geo) <= radiusKm) {
        members.push(remaining[i]!);
        remaining.splice(i, 1);
      }
    }
    zones.push({ id: `${zonePrefix}-${zones.length}`, requests: members });
  }

  // Merge any singleton zone into its nearest neighboring zone's centroid,
  // unless it's genuinely far from everything (then it stays its own zone —
  // that's a legitimately isolated patient, not a clustering artifact).
  const singletons = zones.filter((z) => z.requests.length === 1);
  for (const singleton of singletons) {
    const point = singleton.requests[0]!.geo;
    let nearest: Zone | null = null;
    let nearestDist = Infinity;
    for (const z of zones) {
      if (z === singleton || z.requests.length === 0) continue;
      const centroid = centroidOf(z);
      const dist = haversineKm(point, centroid);
      if (dist < nearestDist && dist <= radiusKm * 1.5) {
        nearestDist = dist;
        nearest = z;
      }
    }
    if (nearest) {
      nearest.requests.push(...singleton.requests);
      singleton.requests = [];
    }
  }

  return zones.filter((z) => z.requests.length > 0);
}

function centroidOf(zone: Zone): { lat: number; lng: number } {
  const lat = zone.requests.reduce((sum, r) => sum + r.geo.lat, 0) / zone.requests.length;
  const lng = zone.requests.reduce((sum, r) => sum + r.geo.lng, 0) / zone.requests.length;
  return { lat, lng };
}

/** Combined pass used by the VRP orchestrator: PIN grouping, then radius refinement within each PIN group. */
export function clusterRequests(requests: ConsultationRequest[], radiusKm = 4): Zone[] {
  const pinZones = clusterByPinCode(requests);
  const refined: Zone[] = [];
  for (const pinZone of pinZones) {
    refined.push(...clusterByRadius(pinZone.requests, radiusKm, pinZone.id));
  }
  return refined;
}
