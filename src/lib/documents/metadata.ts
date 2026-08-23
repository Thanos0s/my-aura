export type DocumentKind = "prescription" | "lab" | "scan";

export type ConfidenceTier = "high" | "review" | "low";

export type ConfidenceBadge = {
  tier: ConfidenceTier;
  label: string;
  color: string;
};

export function getConfidenceBadge(confidence: number): ConfidenceBadge {
  if (confidence >= 0.7) {
    return {
      tier: "high",
      label: "High Confidence",
      color: "text-success",
    };
  }
  if (confidence >= 0.5) {
    return {
      tier: "review",
      label: "Review Required",
      color: "text-warning",
    };
  }
  return {
    tier: "low",
    label: "Low Confidence / Scrawl",
    color: "text-pulse",
  };
}

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


const MEDICINE_KEYWORDS = [
  "tablet",
  "tab",
  "capsule",
  "cap",
  "syrup",
  "syr",
  "ointment",
  "cream",
  "injection",
  "inj",
  "metformin",
  "paracetamol",
  "amoxicillin",
  "pantoprazole",
  "omeprazole",
  "atorvastatin",
  "azithromycin",
  "insulin",
];

const LAB_KEYWORDS = [
  "hb",
  "hemoglobin",
  "tsh",
  "creatinine",
  "glucose",
  "sugar",
  "wbc",
  "rbc",
  "platelet",
  "cholesterol",
  "bilirubin",
  "sgpt",
  "sgot",
  "urea",
  "uric acid",
];

function extractMedicines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length === 0) return false;
      const lower = line.toLowerCase();
      // Skip lab lines that happen to have mg/dL unless explicit medication format
      const isLabLine = lower.includes("mg/dl") || lower.includes("g/dl") || lower.includes("mmol/l");
      if (isLabLine && !MEDICINE_KEYWORDS.some((kw) => lower.includes(kw))) {
        return false;
      }
      const hasDosage = /\b\d+\s*(mg|mcg|ml|gm)\b/i.test(line);
      const hasKeyword = MEDICINE_KEYWORDS.some((kw) => lower.includes(kw));
      return hasKeyword || hasDosage;
    })
    .slice(0, 8);
}

function extractLabs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length === 0) return false;
      const lower = line.toLowerCase();
      const hasLabKw = LAB_KEYWORDS.some((kw) => lower.includes(kw));
      const hasLabUnit = lower.includes("mg/dl") || lower.includes("g/dl") || lower.includes("u/l") || lower.includes("uIu/ml") || lower.includes("mmol/l");
      return hasLabKw || hasLabUnit;
    })
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
      possibleMedicines: extractMedicines(input.rawText),
      possibleLabs: extractLabs(input.rawText),
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
    const parsed = JSON.parse(extract.structuredJson) as {
      reviewRequired?: boolean;
      clinical?: { valid_medical_document?: boolean };
      valid_medical_document?: boolean;
    };
    if (parsed.valid_medical_document === false || parsed.clinical?.valid_medical_document === false) {
      return true;
    }
    return parsed.reviewRequired === true;
  } catch {
    return false;
  }
}
