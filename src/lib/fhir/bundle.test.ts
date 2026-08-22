import { describe, expect, it } from "vitest";
import { buildFhirBundle } from "@/lib/fhir/bundle";

describe("FHIR bundle", () => {
  it("includes Patient and Condition from the structured visit", () => {
    const bundle = buildFhirBundle({
      patientId: "p1",
      displayName: "Test Patient",
      language: "hi-IN",
      chiefComplaint: "abdominal pain",
      medications: ["none known"],
      allergies: ["none known"],
    });
    const types = bundle.entry.map((e) => e.resource.resourceType);
    expect(types).toContain("Patient");
    expect(types).toContain("Condition");
    expect(bundle.meta.tag?.some((t) => t.code === "mocked-abdm")).toBe(true);
  });
});
