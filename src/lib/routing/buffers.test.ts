import { describe, expect, it } from "vitest";
import { computeBuffer } from "@/lib/routing/buffers";
import { DEFAULT_CONSTRAINTS } from "@/lib/routing/types";

describe("computeBuffer", () => {
  it("applies only the base consult buffer for short-distance stops", () => {
    const buffer = computeBuffer(2, "HOME_VISIT", DEFAULT_CONSTRAINTS);
    expect(buffer).toBe(DEFAULT_CONSTRAINTS.baseConsultMinutes);
  });

  it("adds the distance cushion once the threshold is exceeded", () => {
    const buffer = computeBuffer(6, "HOME_VISIT", DEFAULT_CONSTRAINTS);
    expect(buffer).toBe(
      DEFAULT_CONSTRAINTS.baseConsultMinutes + DEFAULT_CONSTRAINTS.travelBufferCushionMinutes
    );
  });

  it("does not add the cushion exactly at the threshold", () => {
    const buffer = computeBuffer(
      DEFAULT_CONSTRAINTS.travelBufferThresholdKm,
      "HOME_VISIT",
      DEFAULT_CONSTRAINTS
    );
    expect(buffer).toBe(DEFAULT_CONSTRAINTS.baseConsultMinutes);
  });

  it("short-circuits to a small fixed buffer for teleconsults regardless of distance", () => {
    const buffer = computeBuffer(50, "TELECONSULT", DEFAULT_CONSTRAINTS);
    expect(buffer).toBeLessThanOrEqual(5);
  });

  it("applies the CLINIC_OPD formula the same as HOME_VISIT", () => {
    const home = computeBuffer(8, "HOME_VISIT", DEFAULT_CONSTRAINTS);
    const clinic = computeBuffer(8, "CLINIC_OPD", DEFAULT_CONSTRAINTS);
    expect(clinic).toBe(home);
  });
});
