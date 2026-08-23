import { describe, expect, it } from "vitest";
import {
  buildDocumentExtractMeta,
  extractBlocksApprove,
  getConfidenceBadge,
} from "@/lib/documents/metadata";

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
    expect(meta.structuredFields.possibleLabs.length).toBeGreaterThan(0);
  });

  it("assigns correct confidence tiers and badges", () => {
    expect(getConfidenceBadge(0.92)).toEqual({
      tier: "high",
      label: "High Confidence",
      color: "text-success",
    });
    expect(getConfidenceBadge(0.62)).toEqual({
      tier: "review",
      label: "Review Required",
      color: "text-warning",
    });
    expect(getConfidenceBadge(0.40)).toEqual({
      tier: "low",
      label: "Low Confidence / Scrawl",
      color: "text-pulse",
    });
  });

  it("correctly evaluates whether an extract blocks doctor approval", () => {
    expect(extractBlocksApprove({ reviewStatus: "pending", confidence: 0.85 })).toBe(false);
    expect(extractBlocksApprove({ reviewStatus: "pending", confidence: 0.45 })).toBe(true);
    expect(extractBlocksApprove({ reviewStatus: "failed", confidence: 0 })).toBe(true);
    expect(extractBlocksApprove({ reviewStatus: "confirmed", confidence: 0.45 })).toBe(false);
    expect(extractBlocksApprove({ reviewStatus: "corrected", confidence: 0.45 })).toBe(false);
  });
});

