import { computeBuffer } from "./buffers";
import { haversineKm, type DistanceProvider } from "./distance";
import { clusterRequests, type Zone } from "./clustering";
import type {
  ConsultationRequest,
  DoctorConstraints,
  GeoPoint,
  QueueEntry,
  QueueResult,
} from "./types";

/**
 * Nearest-neighbor construction followed by a 2-opt local-search pass —
 * a standard, cheap-to-compute TSP heuristic. Nearest-neighbor alone tends
 * to leave crossing/backtracking legs near the end of the route; 2-opt
 * removes those by repeatedly reversing sub-segments whenever doing so
 * shortens the total route, until no further improvement is found.
 */
export function sequenceZone(
  requests: ConsultationRequest[],
  basePoint: GeoPoint,
  provider: DistanceProvider
): ConsultationRequest[] {
  if (requests.length <= 1) return [...requests];

  // Nearest-neighbor construction.
  const remaining = [...requests];
  const route: ConsultationRequest[] = [];
  let current = basePoint;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineKm(current, remaining[i]!.geo);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    const [next] = remaining.splice(bestIdx, 1);
    route.push(next!);
    current = next!.geo;
  }

  return twoOpt(route, basePoint, provider);
}

function routeLength(route: ConsultationRequest[], basePoint: GeoPoint, provider: DistanceProvider): number {
  let total = 0;
  let prev = basePoint;
  for (const stop of route) {
    total += provider.estimate(prev, stop.geo).distanceKm;
    prev = stop.geo;
  }
  return total;
}

function twoOpt(
  route: ConsultationRequest[],
  basePoint: GeoPoint,
  provider: DistanceProvider
): ConsultationRequest[] {
  let best = route;
  let improved = true;
  while (improved) {
    improved = false;
    const bestLength = routeLength(best, basePoint, provider);
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        const candidateLength = routeLength(candidate, basePoint, provider);
        if (candidateLength < bestLength - 1e-9) {
          best = candidate;
          improved = true;
        }
      }
    }
  }
  return best;
}

/** Orders zones by proximity of their centroid to the base point, nearest first. */
function orderZonesByProximity(zones: Zone[], basePoint: GeoPoint): Zone[] {
  return [...zones].sort((a, b) => {
    const da = haversineKm(basePoint, centroidOf(a));
    const db = haversineKm(basePoint, centroidOf(b));
    return da - db;
  });
}

function centroidOf(zone: Zone): GeoPoint {
  const lat = zone.requests.reduce((sum, r) => sum + r.geo.lat, 0) / zone.requests.length;
  const lng = zone.requests.reduce((sum, r) => sum + r.geo.lng, 0) / zone.requests.length;
  return { lat, lng };
}

/** Walks an already-ordered list of requests and computes arrival/departure/buffer for each stop, starting from constraints.dayStart + workStartMinuteOfDay. */
export function timeQueue(
  ordered: Array<{ request: ConsultationRequest; zoneId: string }>,
  constraints: DoctorConstraints,
  provider: DistanceProvider
): QueueResult {
  const dayEndAt = constraints.dayStart + constraints.workEndMinuteOfDay * 60_000;
  let cursor = constraints.dayStart + constraints.workStartMinuteOfDay * 60_000;
  let prevPoint = constraints.basePoint;

  const queue: QueueEntry[] = [];
  const overflow: ConsultationRequest[] = [];

  for (const { request, zoneId } of ordered) {
    if (queue.length >= constraints.maxPatientsPerDay) {
      overflow.push(request);
      continue;
    }

    const travel =
      request.consultationType === "TELECONSULT"
        ? { distanceKm: 0, durationMinutes: 0 }
        : provider.estimate(prevPoint, request.geo);
    const buffer = computeBuffer(travel.distanceKm, request.consultationType, constraints);
    const arrival = cursor + travel.durationMinutes * 60_000 + buffer * 60_000;
    const departure = arrival + request.estimatedConsultMinutes * 60_000;

    if (departure > dayEndAt) {
      overflow.push(request);
      continue;
    }

    queue.push({
      ...request,
      sequenceIndex: queue.length,
      zoneId,
      estimatedArrivalAt: arrival,
      estimatedDepartureAt: departure,
      travelFromPreviousMinutes: travel.durationMinutes,
      distanceFromPreviousKm: travel.distanceKm,
      bufferMinutes: buffer,
    });

    cursor = departure;
    prevPoint = request.geo;
  }

  return { queue, overflow };
}

/**
 * Full orchestrator: clusters ROUTINE/PRIORITY requests into geographic
 * zones, orders zones nearest-base-first, sequences within each zone via
 * nearest-neighbor + 2-opt, then times the whole route. EMERGENCY requests
 * are handled separately by emergencyInsert.ts — they're inserted into an
 * already-built queue rather than folded into the initial clustering pass,
 * since they arrive after the day's routine schedule already exists.
 */
export function buildQueue(
  requests: ConsultationRequest[],
  constraints: DoctorConstraints,
  provider: DistanceProvider,
  radiusKm = 4
): QueueResult {
  const zones = clusterRequests(requests, radiusKm);
  const orderedZones = orderZonesByProximity(zones, constraints.basePoint);

  const ordered: Array<{ request: ConsultationRequest; zoneId: string }> = [];
  let cursorPoint = constraints.basePoint;
  for (const zone of orderedZones) {
    const sequenced = sequenceZone(zone.requests, cursorPoint, provider);
    for (const request of sequenced) {
      ordered.push({ request, zoneId: zone.id });
    }
    if (sequenced.length > 0) cursorPoint = sequenced[sequenced.length - 1]!.geo;
  }

  return timeQueue(ordered, constraints, provider);
}
