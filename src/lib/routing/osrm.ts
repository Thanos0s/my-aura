import { createHaversineDistanceProvider } from "./distance";
import type { DistanceProvider, TravelEstimate } from "./distance";
import type { GeoPoint } from "./types";

export interface OsrmMatrixResult {
  /** Meters, [i][j] = distance from points[i] to points[j]. */
  distances: number[][];
  /** Seconds, [i][j] = duration from points[i] to points[j]. */
  durations: number[][];
}

const DEFAULT_TIMEOUT_MS = 5000;

function coordsParam(points: GeoPoint[]): string {
  return points.map((p) => `${p.lng},${p.lat}`).join(";");
}

/**
 * Calls a self-hosted (or public) OSRM instance's /table service to get a
 * full pairwise driving distance/duration matrix in one request. Returns
 * null — never throws — on any failure (unreachable host, timeout, non-OK
 * response, malformed body) so callers can fall back to an estimate instead
 * of failing the whole queue computation.
 */
export async function fetchOsrmMatrix(
  points: GeoPoint[],
  baseUrl: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<OsrmMatrixResult | null> {
  if (points.length === 0) return { distances: [], durations: [] };
  if (points.length === 1) return { distances: [[0]], durations: [[0]] };

  const url = `${baseUrl.replace(/\/$/, "")}/table/v1/driving/${coordsParam(points)}?annotations=distance,duration`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      code?: string;
      distances?: number[][];
      durations?: number[][];
    };
    if (body.code !== "Ok" || !body.distances || !body.durations) return null;
    return { distances: body.distances, durations: body.durations };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function keyOf(p: GeoPoint): string {
  return `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
}

/**
 * Wraps a precomputed OSRM matrix as a synchronous DistanceProvider (all of
 * clustering/vrp/emergencyInsert call `.estimate()` synchronously, so the
 * network round-trip has to happen once, up front, not per-pair). Any point
 * pair not present in the matrix — e.g. a point added after it was built —
 * falls back to the haversine estimate rather than throwing.
 */
export function createOsrmMatrixProvider(
  points: GeoPoint[],
  matrix: OsrmMatrixResult,
  fallbackAvgSpeedKmh: number
): DistanceProvider {
  const index = new Map<string, number>();
  points.forEach((p, i) => index.set(keyOf(p), i));
  const fallback = createHaversineDistanceProvider(fallbackAvgSpeedKmh);

  return {
    estimate(a: GeoPoint, b: GeoPoint): TravelEstimate {
      const i = index.get(keyOf(a));
      const j = index.get(keyOf(b));
      const distanceMeters = i !== undefined && j !== undefined ? matrix.distances[i]?.[j] : undefined;
      const durationSeconds = i !== undefined && j !== undefined ? matrix.durations[i]?.[j] : undefined;
      if (distanceMeters == null || durationSeconds == null) return fallback.estimate(a, b);
      return { distanceKm: distanceMeters / 1000, durationMinutes: durationSeconds / 60 };
    },
  };
}

export interface HybridDistanceResult {
  provider: DistanceProvider;
  source: "osrm" | "haversine";
}

/**
 * Best-available DistanceProvider for a set of points: tries an OSRM
 * /table matrix first, falls back to the haversine estimator if no OSRM
 * URL is configured or OSRM is unreachable/slow/erroring. `source` reports
 * which one was actually used, so callers can distinguish "OSRM answered"
 * from "OSRM was configured but silently fell back" instead of assuming
 * success just because a URL was set.
 */
export async function createHybridDistanceProvider(
  points: GeoPoint[],
  osrmBaseUrl: string | undefined,
  fallbackAvgSpeedKmh: number,
  timeoutMs?: number
): Promise<HybridDistanceResult> {
  if (!osrmBaseUrl) {
    return { provider: createHaversineDistanceProvider(fallbackAvgSpeedKmh), source: "haversine" };
  }
  const matrix = await fetchOsrmMatrix(points, osrmBaseUrl, timeoutMs);
  if (!matrix) {
    return { provider: createHaversineDistanceProvider(fallbackAvgSpeedKmh), source: "haversine" };
  }
  return { provider: createOsrmMatrixProvider(points, matrix, fallbackAvgSpeedKmh), source: "osrm" };
}
