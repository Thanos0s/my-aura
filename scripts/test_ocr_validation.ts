/**
 * OCR Validation & Rejection Verification Suite
 *
 * Exercises the real `POST` handler in `src/app/api/ocr/route.ts` end-to-end:
 * builds an actual multipart FormData Request, runs it through document-kind
 * detection, OCR, and `buildClinicalExtract` classification, and asserts on
 * the JSON response.
 *
 * `tesseract.js` is mocked so the OCR *text* is deterministic and the suite
 * runs in milliseconds without needing bundled prescription/infographic image
 * files or a real OCR engine — everything downstream of "raw text was
 * extracted" (classification, schema shape, rejection) is exercised for real.
 *
 * Run with:
 *   npx vitest run scripts/test_ocr_validation.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("tesseract.js", () => ({
  default: {
    recognize: vi.fn(),
  },
}));

import Tesseract from "tesseract.js";
import { POST } from "@/app/api/ocr/route";

const mockRecognize = Tesseract.recognize as unknown as ReturnType<typeof vi.fn>;

const CONVERSATIONAL_PATTERN =
  /^here('|’)?s\b|^here is\b|^sure[,!.]|^certainly[,!.]|^of course[,!.]|^below is\b/i;

function mockOcrText(text: string, confidence = 90) {
  mockRecognize.mockResolvedValue({
    data: { text, confidence },
  });
}

function buildUploadRequest(fileName: string, kind: string): Request {
  const form = new FormData();
  // Byte content is irrelevant — tesseract.js is mocked, so this Blob is
  // never actually decoded as an image.
  const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });
  form.append("file", blob, fileName);
  form.append("kind", kind);
  return new Request("http://localhost/api/ocr", { method: "POST", body: form });
}

function report(name: string, passed: boolean, problems: string[]) {
  const tag = passed ? "[PASS]" : "[FAIL]";
  const suffix = problems.length ? ` — ${problems.join("; ")}` : "";
  console.log(`${tag} ${name}${suffix}`);
}

describe("OCR validation route (src/app/api/ocr/route.ts)", () => {
  const savedEnv = {
    SARVAM_API_KEY: process.env.SARVAM_API_KEY,
    SARVAM_OCR_API_KEY: process.env.SARVAM_OCR_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  };

  beforeEach(() => {
    mockRecognize.mockReset();
    // Force the deterministic Tesseract + heuristic-classifier path so this
    // suite never depends on live network calls to Sarvam/Groq.
    delete process.env.SARVAM_API_KEY;
    delete process.env.SARVAM_OCR_API_KEY;
    delete process.env.GROQ_API_KEY;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("Test Case A: valid prescription upload is accepted with structured clinical JSON", async () => {
    mockOcrText(
      [
        "Patient Name: Ravi Kumar",
        "Tab Paracetamol 650mg TDS for 5 days",
        "Cap Amoxicillin 500mg BD for 7 days",
        "Ashwagandha Churna with warm water before food",
        "BP: 128/82",
      ].join("\n"),
      88
    );

    const res = await POST(buildUploadRequest("prescription.png", "prescription"));
    const json = (await res.json()) as Record<string, unknown>;

    const problems: string[] = [];
    if (json.valid_medical_document !== true) problems.push("valid_medical_document !== true");
    if (!Array.isArray(json.prescribed_medicines)) problems.push("prescribed_medicines missing or not an array");
    if (!Array.isArray(json.ayush_formulations)) problems.push("ayush_formulations missing or not an array");

    for (const [field, value] of [["text", json.text]] as const) {
      const firstLine = String(value ?? "").split(/\r?\n/)[0]?.trim() ?? "";
      if (CONVERSATIONAL_PATTERN.test(firstLine)) {
        problems.push(`conversational preamble found in "${field}": "${firstLine}"`);
      }
    }

    report("Test Case A: Valid prescription upload", problems.length === 0, problems);

    expect(json.valid_medical_document).toBe(true);
    expect(Array.isArray(json.prescribed_medicines)).toBe(true);
    expect(Array.isArray(json.ayush_formulations)).toBe(true);
    expect((json.prescribed_medicines as unknown[]).length).toBeGreaterThan(0);
    expect((json.ayush_formulations as unknown[]).length).toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });

  it("Test Case B: non-medical document upload is rejected", async () => {
    mockOcrText(
      [
        "Top 10 Tips for Growing Tomatoes in Your Backyard Garden",
        "Water daily, ensure 6 hours of sunlight, use nitrogen-rich fertilizer.",
        "Harvest is ready in 60-80 days depending on variety.",
      ].join("\n"),
      91
    );

    const res = await POST(buildUploadRequest("garden-infographic.png", "scan"));
    const json = (await res.json()) as Record<string, unknown>;

    const problems: string[] = [];
    if (json.valid_medical_document !== false) problems.push("valid_medical_document !== false");
    if (json.ocr_status !== "rejected_invalid_document") problems.push(`ocr_status was "${String(json.ocr_status)}"`);
    if (
      typeof json.error_message !== "string" ||
      !json.error_message.toLowerCase().includes("does not appear to be a patient prescription")
    ) {
      problems.push("error_message missing or does not indicate an invalid medical document");
    }

    report("Test Case B: Non-medical document upload", problems.length === 0, problems);

    expect(json.valid_medical_document).toBe(false);
    expect(json.ocr_status).toBe("rejected_invalid_document");
    expect(json.error_message).toMatch(/does not appear to be a patient prescription/i);
    expect(problems).toEqual([]);
  });

  it("Test Case C: brand/advertisement-only upload is rejected", async () => {
    mockOcrText(
      ["Planet Ayurveda", "www.planetayurveda.com", "Call Now for exclusive offers!", "All rights reserved ©"].join(
        "\n"
      ),
      85
    );

    const res = await POST(buildUploadRequest("brand-logo.png", "scan"));
    const json = (await res.json()) as Record<string, unknown>;

    const problems: string[] = [];
    if (json.valid_medical_document !== false) problems.push("valid_medical_document !== false");
    if (json.ocr_status !== "rejected_invalid_document") problems.push(`ocr_status was "${String(json.ocr_status)}"`);

    report("Test Case C: Brand/advertisement-only upload", problems.length === 0, problems);

    expect(json.valid_medical_document).toBe(false);
    expect(json.ocr_status).toBe("rejected_invalid_document");
    expect(problems).toEqual([]);
  });
});
