import { describe, expect, it } from "vitest";
import { buildDocumentExtractMeta } from "@/lib/documents/metadata";

describe("document extract metadata", () => {
  it("flags review when OCR confidence is low", () => {
    const meta = buildDocumentExtractMeta({
      kind: "prescription",
      rawText: "blurry rx",
      confidence: 0.4,
    });
    expect(meta.reviewRequired).toBe(true);
    expect(meta.handwritingLikely).toBe(true);
    expect(meta.kind).toBe("prescription");
  });

  it("attaches to the visit without merging into meds or allergies", () => {
    const meta = buildDocumentExtractMeta({
      kind: "lab",
      rawText: "Hb 12.1\nMetformin 500mg",
      confidence: 0.91,
    });
    expect(meta.attachedToVisit).toBe(true);
    expect(meta.mergedIntoClinicalSlots).toBe(false);
    expect(meta.structuredFields.possibleMedicines.length).toBeGreaterThan(0);
  });
});
