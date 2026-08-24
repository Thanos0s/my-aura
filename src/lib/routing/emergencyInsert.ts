import type { DistanceProvider } from "./distance";
import { timeQueue } from "./vrp";
import type { ConsultationRequest, DoctorConstraints, QueueEntry, QueueResult } from "./types";

const EMERGENCY_ZONE_ID = "emergency";

/**
 * Inserts an urgent request into an already-built queue at the
 * minimum-detour position (classic cheapest-insertion heuristic), instead
 * of re-clustering/re-sequencing the whole day. Because the entries before
 * the insertion point are untouched in both content and order, re-timing
 * the whole route deterministically reproduces their exact original
 * arrival/departure times — only entries from the insertion point onward
 * shift. That's the "minimize displacement of existing confirmed patients"
 * requirement.
 */
export function insertEmergency(
  currentQueue: QueueEntry[],
  newRequest: ConsultationRequest,
  constraints: DoctorConstraints,
  provider: DistanceProvider
): QueueResult {
  const stops: Array<{ request: ConsultationRequest; zoneId: string }> = currentQueue.map(
    (entry) => ({ request: entry, zoneId: entry.zoneId })
  );

  let bestIndex = stops.length;
  let bestDetourKm = Infinity;

  for (let i = 0; i <= stops.length; i++) {
    const prevPoint = i === 0 ? constraints.basePoint : stops[i - 1]!.request.geo;
    const nextPoint = i < stops.length ? stops[i]!.request.geo : null;

    const toNew = provider.estimate(prevPoint, newRequest.geo).distanceKm;
    const detour = nextPoint
      ? toNew +
        provider.estimate(newRequest.geo, nextPoint).distanceKm -
        provider.estimate(prevPoint, nextPoint).distanceKm
      : toNew;

    if (detour < bestDetourKm) {
      bestDetourKm = detour;
      bestIndex = i;
    }
  }

  const ordered = [...stops];
  ordered.splice(bestIndex, 0, { request: newRequest, zoneId: EMERGENCY_ZONE_ID });

  return timeQueue(ordered, constraints, provider);
}
