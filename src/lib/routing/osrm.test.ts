import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHybridDistanceProvider,
  createOsrmMatrixProvider,
  fetchOsrmMatrix,
} from "@/lib/routing/osrm";
import type { GeoPoint } from "@/lib/routing/types";

const a: GeoPoint = { lat: 12.9, lng: 77.6 };
const b: GeoPoint = { lat: 12.95, lng: 77.65 };
const unseen: GeoPoint = { lat: 20, lng: 80 };

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchOsrmMatrix", () => {
  it("returns the parsed matrix on a successful response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        code: "Ok",
        distances: [
          [0, 1000],
          [1000, 0],
        ],
        durations: [
          [0, 120],
          [120, 0],
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchOsrmMatrix([a, b], "http://localhost:5000");
    expect(result).toEqual({
      distances: [
        [0, 1000],
        [1000, 0],
      ],
      durations: [
        [0, 120],
        [120, 0],
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("/table/v1/driving/");
    expect(url).toContain(`${a.lng},${a.lat}`);
  });

  it("returns null on a non-OK HTTP response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false)));
    const result = await fetchOsrmMatrix([a, b], "http://localhost:5000");
    expect(result).toBeNull();
  });

  it("returns null when the server body reports a non-Ok code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ code: "NoRoute" })));
    const result = await fetchOsrmMatrix([a, b], "http://localhost:5000");
    expect(result).toBeNull();
  });

  it("returns null instead of throwing when the network call rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const result = await fetchOsrmMatrix([a, b], "http://localhost:5000");
    expect(result).toBeNull();
  });

  it("short-circuits without a network call for 0 or 1 points", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchOsrmMatrix([], "http://localhost:5000")).toEqual({ distances: [], durations: [] });
    expect(await fetchOsrmMatrix([a], "http://localhost:5000")).toEqual({ distances: [[0]], durations: [[0]] });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("createOsrmMatrixProvider", () => {
  it("reads distance/duration straight from the matrix for known points", () => {
    const provider = createOsrmMatrixProvider(
      [a, b],
      { distances: [[0, 2000], [2000, 0]], durations: [[0, 300], [300, 0]] },
      25
    );
    const estimate = provider.estimate(a, b);
    expect(estimate.distanceKm).toBe(2);
    expect(estimate.durationMinutes).toBe(5);
  });

  it("falls back to the haversine estimate for a point outside the matrix", () => {
    const provider = createOsrmMatrixProvider(
      [a, b],
      { distances: [[0, 2000], [2000, 0]], durations: [[0, 300], [300, 0]] },
      25
    );
    const estimate = provider.estimate(a, unseen);
    expect(estimate.distanceKm).toBeGreaterThan(0);
    expect(estimate.durationMinutes).toBeGreaterThan(0);
  });
});

describe("createHybridDistanceProvider", () => {
  it("falls back to haversine when no OSRM URL is configured", async () => {
    const { provider, source } = await createHybridDistanceProvider([a, b], undefined, 25);
    expect(source).toBe("haversine");
    expect(provider.estimate(a, b).distanceKm).toBeGreaterThan(0);
  });

  it("falls back to haversine when OSRM is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const { provider, source } = await createHybridDistanceProvider([a, b], "http://localhost:5000", 25);
    expect(source).toBe("haversine");
    expect(provider.estimate(a, b).distanceKm).toBeGreaterThan(0);
  });

  it("uses the OSRM matrix when the request succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          code: "Ok",
          distances: [[0, 4000], [4000, 0]],
          durations: [[0, 600], [600, 0]],
        })
      )
    );
    const { provider, source } = await createHybridDistanceProvider([a, b], "http://localhost:5000", 25);
    expect(source).toBe("osrm");
    const estimate = provider.estimate(a, b);
    expect(estimate.distanceKm).toBe(4);
    expect(estimate.durationMinutes).toBe(10);
  });
});
