export type DocumentKind = "prescription" | "lab" | "scan";

export type DocumentExtractMeta = {
  kind: DocumentKind;
  confidence: number;
  reviewRequired: boolean;
  handwritingLikely: boolean;
  rawText: string;
  structuredFields: {
    possibleMedicines: string[];
    possibleLabs: string[];
  };
  attachedToVisit: true;
  mergedIntoClinicalSlots: false;
};

const MEDICINE_HINTS = [
  "mg",
  "tablet",
  "tab",
  "capsule",
  "syrup",
  "metformin",
  "paracetamol",
  "amoxicillin",
  "insulin",
];

const LAB_HINTS = ["hb", "hemoglobin", "tsh", "creatinine", "glucose", "wbc", "rbc", "platelet"];

function linesMatching(text: string, hints: string[]): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && hints.some((h) => line.toLowerCase().includes(h)))
    .slice(0, 8);
}

export function buildDocumentExtractMeta(input: {
  kind: DocumentKind;
  rawText: string;
  confidence: number;
  failed?: boolean;
}): DocumentExtractMeta {
  const confidence = Math.max(0, Math.min(1, input.confidence));
  const handwritingLikely = confidence < 0.55 || Boolean(input.failed);
  const reviewRequired = handwritingLikely || confidence < 0.7 || Boolean(input.failed);
  return {
    kind: input.kind,
    confidence,
    reviewRequired,
    handwritingLikely,
    rawText: input.rawText,
    structuredFields: {
      possibleMedicines: linesMatching(input.rawText, MEDICINE_HINTS),
      possibleLabs: linesMatching(input.rawText, LAB_HINTS),
    },
    attachedToVisit: true,
    mergedIntoClinicalSlots: false,
  };
}

export function extractBlocksApprove(extract: {
  reviewStatus: string;
  confidence: number;
  structuredJson?: string;
}): boolean {
  if (extract.reviewStatus !== "pending" && extract.reviewStatus !== "failed") {
    return false;
  }
  if (extract.confidence < 0.7) return true;
  if (!extract.structuredJson) return false;
  try {
    const parsed = JSON.parse(extract.structuredJson) as { reviewRequired?: boolean };
    return parsed.reviewRequired === true;
  } catch {
    return false;
  }
}
