import type { DocumentKind } from "./metadata";

export type PrescribedMedicine = {
  name: string;
  dosage: string;
  frequency: string;
};

export type AyushFormulation = {
  name: string;
  composition: string;
  timing: string;
};

export type RejectedClinicalExtract = {
  valid_medical_document: false;
  ocr_status: "rejected_invalid_document";
  error_message: string;
};

export type ValidClinicalExtract = {
  valid_medical_document: true;
  patient_name: string | null;
  doctor_name: string | null;
  clinic_or_hospital: string | null;
  date: string | null;
  prescribed_medicines: PrescribedMedicine[];
  ayush_formulations: AyushFormulation[];
  needs_human_review: boolean;
};

export type ClinicalExtract = RejectedClinicalExtract | ValidClinicalExtract;

const REJECTION_MESSAGE =
  "Uploaded image does not appear to be a patient prescription. Please upload a valid clinical document.";

const CLINICAL_MARKERS = [
  "patient",
  "dr.",
  "dr ",
  "doctor",
  "rx",
  "prescription",
  "diagnosis",
  "dosage",
  "tablet",
  "tab.",
  "cap.",
  "capsule",
  "syrup",
  "injection",
  "ointment",
  "hospital",
  "clinic",
  "opd",
  "vitals",
  "symptom",
  "chief complaint",
  "advice",
  "follow up",
  "churna",
  "churn",
  "vati",
  "asava",
  "arishta",
  "kwath",
  "kashayam",
  "taila",
  "ghrita",
  "bhasma",
  "anupana",
];

// Advertisement / marketing / logo-only material — reject unless clinical
// content (patient/dosage/vitals) is also present.
const AD_MARKERS = [
  "advertisement",
  "www.",
  "http://",
  "https://",
  "call now",
  "visit us",
  "visit our",
  "order now",
  "buy now",
  "discount",
  "offer valid",
  "toll free",
  "helpline",
  "follow us",
  "subscribe",
  "product of",
  "registered trademark",
  "all rights reserved",
  "manufactured by",
  "distributed by",
  "®",
  "™",
  "©",
];

// Brand/logo names that, on their own (no accompanying clinical content),
// indicate a product/brand image rather than a patient document.
const BRAND_ONLY_NAMES = ["planet ayurveda"];

const DOSAGE_REGEX = /\b\d+(\.\d+)?\s*(mg|mcg|ml|gm|g|iu)\b/i;
const VITALS_REGEX = /\b\d{2,3}\s*\/\s*\d{2,3}\b|\b\d{2,3}\s*bpm\b|°\s*[cf]\b|\bspo2\b|\bhb\b|\bmg\/dl\b/i;
const PATIENT_OR_RX_REGEX = /\bpatient\b|\brx\b|\bprescription\b|\bdiagnosis\b|\bchief complaint\b/i;

function hasClinicalSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    CLINICAL_MARKERS.some((kw) => lower.includes(kw)) ||
    DOSAGE_REGEX.test(text) ||
    VITALS_REGEX.test(text) ||
    PATIENT_OR_RX_REGEX.test(text)
  );
}

export function isLikelyMedicalDocument(rawText: string): boolean {
  const text = (rawText || "").trim();
  if (text.length < 3) return false;
  const lower = text.toLowerCase();

  const clinicalSignal = hasClinicalSignal(text);
  const adSignal = AD_MARKERS.some((kw) => lower.includes(kw));
  const brandOnly = BRAND_ONLY_NAMES.some((name) => lower.includes(name)) && !clinicalSignal;

  if (brandOnly) return false;
  if (adSignal && !clinicalSignal) return false;

  return clinicalSignal;
}

const CONVERSATIONAL_PREFIXES = [
  /^here('|’)?s\b.*[:.]?$/i,
  /^here is\b.*[:.]?$/i,
  /^sure[,!.]?.*$/i,
  /^certainly[,!.]?.*$/i,
  /^of course[,!.]?.*$/i,
  /^below is\b.*[:.]?$/i,
  /^this is\b.*breakdown.*[:.]?$/i,
];

export function stripConversationalNoise(raw: string): string {
  let text = (raw || "").trim();
  text = text.replace(/```json\s*|```/gi, "").trim();
  const lines = text.split(/\r?\n/);
  while (lines.length && CONVERSATIONAL_PREFIXES.some((re) => re.test((lines[0] ?? "").trim()))) {
    lines.shift();
  }
  return lines.join("\n").trim();
}

function buildRejectedClinicalExtract(): RejectedClinicalExtract {
  return {
    valid_medical_document: false,
    ocr_status: "rejected_invalid_document",
    error_message: REJECTION_MESSAGE,
  };
}

function extractPatientName(text: string): string | null {
  const match =
    text.match(/patient(?:'s)?\s*name\s*[:\-]\s*([A-Za-z][A-Za-z .]{1,40})/i) ||
    text.match(/\bname\s*[:\-]\s*([A-Za-z][A-Za-z .]{1,40})/i);
  if (!match || !match[1]) return null;
  return match[1].trim().replace(/\s{2,}/g, " ") || null;
}

function extractDoctorName(text: string): string | null {
  const match =
    text.match(/dr(?:octor)?\.?\s*name\s*[:\-]\s*([A-Za-z][A-Za-z .]{1,40})/i) ||
    text.match(/\b(?:dr|doctor)\.?\s+([A-Za-z][A-Za-z .]{1,40})/i);
  if (!match || !match[1]) return null;
  return match[1].trim().replace(/\s{2,}/g, " ") || null;
}

function extractClinicOrHospital(text: string): string | null {
  const match = text.match(
    /\b([A-Za-z][A-Za-z0-9 .,&'-]{1,60}(?:hospital|clinic|nursing home|medical center|medical centre|ayurved(?:a|ic)? kendra))\b/i
  );
  if (!match || !match[1]) return null;
  return match[1].trim().replace(/\s{2,}/g, " ") || null;
}

const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

function normalizeDate(day: string, month: string, year: string): string | null {
  const y = year.length === 2 ? `20${year}` : year;
  const d = day.padStart(2, "0");
  let m = month;
  if (/[A-Za-z]/.test(month)) {
    const key = month.toLowerCase().slice(0, 3);
    m = MONTHS[key] ?? "";
  } else {
    m = month.padStart(2, "0");
  }
  if (!m || Number(d) < 1 || Number(d) > 31) return null;
  return `${y}-${m}-${d}`;
}

function extractDate(text: string): string | null {
  const numeric = text.match(/\bdate\s*[:\-]?\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/i)
    || text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (numeric && numeric[1] && numeric[2] && numeric[3]) {
    return normalizeDate(numeric[1], numeric[2], numeric[3]);
  }
  const withMonthName = text.match(/\b(\d{1,2})[\s-]([A-Za-z]{3,9})[\s-](\d{2,4})\b/);
  if (withMonthName && withMonthName[1] && withMonthName[2] && withMonthName[3]) {
    return normalizeDate(withMonthName[1], withMonthName[2], withMonthName[3]);
  }
  return null;
}

function extractFrequency(line: string): string {
  const match = line.match(/\b(od|bd|tds|qid|hs|sos|prn|once daily|twice daily|thrice daily)\b/i);
  return match && match[1] ? match[1].toUpperCase() : "";
}

function extractDosage(line: string): string {
  const match = line.match(DOSAGE_REGEX);
  return match ? match[0] : "";
}

const AYUSH_KEYWORDS = ["churna", "churn", "vati", "asava", "arishta", "kwath", "kashayam", "taila", "ghrita", "bhasma"];
const MEDICINE_KEYWORDS = ["tab", "tablet", "cap", "capsule", "syrup", "syr", "injection", "inj", "ointment", "cream"];

function extractComposition(line: string): string {
  const match = line.match(/with\s+(warm water|water|honey|milk|ghee)/i);
  return match ? match[0] : "";
}

function extractTiming(line: string): string {
  const match = line.match(/(before food|after food|empty stomach|bedtime|morning|evening|before meals|after meals)/i);
  return match && match[1] ? match[1] : "";
}

function extractPrescribedMedicines(text: string): PrescribedMedicine[] {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((line) => {
      if (!line) return false;
      const lower = line.toLowerCase();
      if (AYUSH_KEYWORDS.some((kw) => lower.includes(kw))) return false;
      return MEDICINE_KEYWORDS.some((kw) => lower.includes(kw)) || DOSAGE_REGEX.test(line);
    })
    .slice(0, 10)
    .map((line) => ({
      name: line.replace(DOSAGE_REGEX, "").replace(/^\d+[.)]\s*/, "").trim(),
      dosage: extractDosage(line),
      frequency: extractFrequency(line),
    }));
}

function extractAyushFormulations(text: string): AyushFormulation[] {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((line) => {
      if (!line) return false;
      const lower = line.toLowerCase();
      return AYUSH_KEYWORDS.some((kw) => lower.includes(kw));
    })
    .slice(0, 10)
    .map((line) => ({
      name: line.replace(/^\d+[.)]\s*/, "").trim(),
      composition: extractComposition(line),
      timing: extractTiming(line),
    }));
}

function heuristicClinicalExtract(rawText: string, confidence: number): ValidClinicalExtract {
  const prescribed_medicines = extractPrescribedMedicines(rawText);
  const ayush_formulations = extractAyushFormulations(rawText);
  const patient_name = extractPatientName(rawText);
  const doctor_name = extractDoctorName(rawText);
  const clinic_or_hospital = extractClinicOrHospital(rawText);
  const date = extractDate(rawText);

  const needs_human_review =
    confidence < 0.7 ||
    (prescribed_medicines.length === 0 && ayush_formulations.length === 0) ||
    patient_name === null ||
    doctor_name === null;

  return {
    valid_medical_document: true,
    patient_name,
    doctor_name,
    clinic_or_hospital,
    date,
    prescribed_medicines,
    ayush_formulations,
    needs_human_review,
  };
}

const STRICT_SYSTEM_PROMPT = `You are a strict clinical document parser. Output ONLY raw JSON, nothing else.
Never include conversational text, headers, explanations, introductions, or markdown code fences.
Given OCR text from a medical document, extract data into exactly this JSON shape and no other keys:
{
  "valid_medical_document": true,
  "patient_name": "Extracted Name or null",
  "doctor_name": "Extracted Doctor Name or null",
  "clinic_or_hospital": "Extracted Clinic Name or null",
  "date": "Extracted Date (YYYY-MM-DD) or null",
  "prescribed_medicines": [{"name": "...", "dosage": "...", "frequency": "..."}],
  "ayush_formulations": [{"name": "...", "composition": "...", "timing": "..."}],
  "needs_human_review": true or false (true if handwriting is unclear or fields are null)
}
Never diagnose. Never invent values not present in the text. Use null for fields you cannot find, but always include every key.`;

function coerceValidExtract(parsed: Partial<ValidClinicalExtract>): ValidClinicalExtract {
  return {
    valid_medical_document: true,
    patient_name: parsed.patient_name ?? null,
    doctor_name: parsed.doctor_name ?? null,
    clinic_or_hospital: parsed.clinic_or_hospital ?? null,
    date: parsed.date ?? null,
    prescribed_medicines: parsed.prescribed_medicines ?? [],
    ayush_formulations: parsed.ayush_formulations ?? [],
    needs_human_review: Boolean(parsed.needs_human_review),
  };
}

async function extractWithGroq(rawText: string, apiKey: string): Promise<ValidClinicalExtract | null> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_LLM_MODEL ?? "llama-3.1-8b-instant",
        temperature: 0,
        messages: [
          { role: "system", content: STRICT_SYSTEM_PROMPT },
          { role: "user", content: rawText },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "";
    const clean = stripConversationalNoise(content);
    const parsed = JSON.parse(clean) as Partial<ValidClinicalExtract>;
    if (parsed.valid_medical_document !== true) return null;
    return coerceValidExtract(parsed);
  } catch (err) {
    console.warn("Groq clinical extraction failed:", err);
    return null;
  }
}

export async function buildClinicalExtract(input: {
  rawText: string;
  confidence: number;
  kind: DocumentKind;
}): Promise<ClinicalExtract> {
  const rawText = input.rawText || "";

  if (!isLikelyMedicalDocument(rawText)) {
    return buildRejectedClinicalExtract();
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  if (groqApiKey) {
    const llmResult = await extractWithGroq(rawText, groqApiKey);
    if (llmResult) {
      if (input.confidence < 0.7) llmResult.needs_human_review = true;
      return llmResult;
    }
  }

  return heuristicClinicalExtract(rawText, input.confidence);
}
