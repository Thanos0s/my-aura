import { describe, expect, it } from "vitest";
import {
  CASE_SPINE,
  DASHAVIDHA_FACTORS,
  DOCUMENT_STAGES,
  LANDING_FEATURES,
  LANDING_ROLES,
  PIPELINE_STAGES,
} from "@/lib/landing/features";

describe("landing catalog", () => {
  it("lists the four product roles and the core feature set", () => {
    expect(LANDING_ROLES.map((r) => r.title)).toEqual([
      "Patient",
      "Ayurveda practitioner",
      "Dietitian / nutritionist",
      "Admin",
    ]);
    expect(LANDING_FEATURES.length).toBeGreaterThanOrEqual(12);
    expect(DASHAVIDHA_FACTORS).toHaveLength(10);
    expect(DASHAVIDHA_FACTORS).toContain("Agni");
    expect(CASE_SPINE[0]).toBe("Patient state");
    expect(CASE_SPINE.at(-1)).toBe("Doctor summary");
    expect(DOCUMENT_STAGES[0]).toBe("Physical documents");
    expect(PIPELINE_STAGES[0]).toMatch(/Voice/);
  });
});
