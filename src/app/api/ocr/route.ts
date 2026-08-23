import { NextResponse } from "next/server";
import Tesseract from "tesseract.js";
import { buildDocumentExtractMeta, type DocumentKind } from "@/lib/documents/metadata";

function asKind(value: FormDataEntryValue | null): DocumentKind {
  if (value === "prescription" || value === "lab") return value;
  if (value === "discharge") return "scan";
  return "scan";
}

export const maxDuration = 60;

// ─── Specialized AI extraction prompts ─────────────────────────────────────

const PRESCRIPTION_PROMPT = `You are an expert medical data extraction API. Your task is to extract critical clinical information from raw OCR text of a medical prescription.
Ignore all visual descriptions, letterheads, formatting artifacts, and aesthetic details.

Extract the data and return it STRICTLY as a valid JSON object using the exact schema below. If a specific field is not found in the text, return null for that field. Do not include markdown formatting like \`\`\`json in the output.

Required JSON Schema:
{
  "patient_details": {
    "name": "string or null",
    "age": "string/number or null",
    "gender": "string or null"
  },
  "doctor_details": {
    "name": "string or null",
    "specialty": "string or null"
  },
  "vitals": {
    "blood_pressure": "string or null",
    "weight": "string or null"
  },
  "diagnoses": ["array of strings"],
  "medications": [
    {
      "drug_name": "string",
      "dosage": "string (e.g., 500mg)",
      "frequency": "string (e.g., 1-0-1, twice a day)",
      "duration": "string (e.g., 5 days)",
      "instructions": "string (e.g., after meals)"
    }
  ],
  "follow_up_advice": "string or null"
}`;

const LAB_PROMPT = `You are an expert medical data extraction API. Your task is to extract pathology and laboratory test results from raw OCR text.
Ignore all page numbers, lab logos, visual layouts, and promotional text.

Extract the data and return it STRICTLY as a valid JSON object using the exact schema below. If a specific field is not found, return null. Do not include markdown formatting like \`\`\`json in the output.

Required JSON Schema:
{
  "patient_name": "string or null",
  "collection_date": "string or null",
  "lab_name": "string or null",
  "test_results": [
    {
      "biomarker_name": "string (e.g., Hemoglobin, Fasting Blood Sugar)",
      "observed_value": "number or string",
      "unit": "string (e.g., g/dL, mg/dL)",
      "reference_range": "string (e.g., 13.0 - 17.0)",
      "is_abnormal": "boolean (true if value is outside reference range, false otherwise, or null if unknown)"
    }
  ],
  "interpretation_notes": "string or null (Any summary notes provided by the pathologist)"
}`;

const SCAN_DISCHARGE_PROMPT = `You are an expert medical data extraction API. Your task is to extract critical clinical summaries from raw OCR text of a hospital discharge summary or scan report.
Ignore all hospital administrative headers, visual formatting, and billing codes.

Extract the data and return it STRICTLY as a valid JSON object using the exact schema below. If a specific field is not found, return null. Do not include markdown formatting like \`\`\`json in the output.

Required JSON Schema:
{
  "patient_name": "string or null",
  "admission_date": "string or null",
  "discharge_date": "string or null",
  "primary_diagnosis": "string or null",
  "chief_complaints": ["array of strings"],
  "procedures_performed": ["array of strings"],
  "hospital_course_summary": "string (Provide a concise, 2-3 sentence clinical summary of the patient's stay and treatment)",
  "discharge_medications": ["array of strings (Include drug name and dosage)"],
  "follow_up_instructions": "string or null"
}`;

function getSystemPrompt(kind: string): string {
  if (kind === "prescription") return PRESCRIPTION_PROMPT;
  if (kind === "lab") return LAB_PROMPT;
  return SCAN_DISCHARGE_PROMPT;
}


// ─── Sarvam Doc-AI OCR ──────────────────────────────────────────────────────

async function extractWithSarvam(file: Blob, apiKey: string): Promise<{ text: string; confidence: number } | null> {
  try {
    const formData = new FormData();
    const filename = file instanceof File && file.name ? file.name : "prescription.png";
    formData.append("file", file, filename);
    formData.append("language", "en-IN");
    formData.append("output_format", "md");

    const res = await fetch("https://api.sarvam.ai/doc-ai/v1/job/digitise", {
      method: "POST",
      headers: { "api-subscription-key": apiKey },
      body: formData,
    });

    if (!res.ok) {
      console.warn("Sarvam doc-ai submit returned", res.status, await res.text());
      return null;
    }

    const { job_id } = (await res.json()) as { job_id?: string };
    if (!job_id) return null;

    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 600));
      const poll = await fetch(`https://api.sarvam.ai/doc-ai/v1/job/${job_id}/status`, {
        headers: { "api-subscription-key": apiKey },
      });
      if (!poll.ok) continue;
      const statusData = (await poll.json()) as { status?: string };
      if (statusData.status === "completed") {
        const resultRes = await fetch(`https://api.sarvam.ai/doc-ai/v1/job/${job_id}/results`, {
          headers: { "api-subscription-key": apiKey },
        });
        if (!resultRes.ok) return null;
        const resJson = (await resultRes.json()) as {
          documents?: Array<{
            pages?: Array<{
              md?: string;
              text?: string;
              content?: string;
              blocks?: Array<{ text?: string; content?: string; lines?: Array<{ text?: string } | string> }>;
            }>;
          }>;
        };

        const extractedLines: string[] = [];
        for (const doc of resJson.documents ?? []) {
          for (const page of doc.pages ?? []) {
            if (typeof page.md === "string" && page.md.trim()) extractedLines.push(page.md);
            if (typeof page.text === "string" && page.text.trim()) extractedLines.push(page.text);
            if (typeof page.content === "string" && page.content.trim()) extractedLines.push(page.content);
            for (const block of page.blocks ?? []) {
              if (block.text) extractedLines.push(block.text);
              if (block.content) extractedLines.push(block.content);
              if (block.lines) {
                for (const l of block.lines) {
                  if (typeof l === "string") extractedLines.push(l);
                  else if (l?.text) extractedLines.push(l.text);
                }
              }
            }
          }
        }
        const text = extractedLines.join("\n").trim();
        return { text, confidence: 0.92 };
      }
      if (statusData.status === "failed" || statusData.status === "rejected") return null;
    }
    return null;
  } catch (err) {
    console.error("Sarvam Doc-AI error:", err);
    return null;
  }
}

// ─── Sarvam LLM Structured Extraction ──────────────────────────────────────

async function extractStructuredWithAI(rawText: string, kind: string, apiKey: string): Promise<object | null> {
  if (!rawText.trim()) return null;
  try {
    const res = await fetch("https://api.sarvam.ai/v2/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-subscription-key": apiKey },
      body: JSON.stringify({
        model: process.env.SARVAM_LLM_MODEL ?? "sarvam-105b",
        messages: [
          { role: "system", content: getSystemPrompt(kind) },
          { role: "user", content: `Extract structured clinical data from the following OCR text:\n\n${rawText}` },
        ],
        temperature: 0,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      console.warn("Sarvam LLM extraction returned", res.status, await res.text());
      return null;
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    try {
      return JSON.parse(clean) as object;
    } catch {
      return { raw_extraction: clean };
    }
  } catch (err) {
    console.error("Sarvam LLM structured extraction error:", err);
    return null;
  }
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const rawKind = form.get("kind") as string | null;
  const kind = asKind(rawKind);

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  try {
    let text = "";
    let confidence = 0;
    let engine: "sarvam" | "tesseract" = "tesseract";

    const sarvamOcrKey = process.env.SARVAM_OCR_API_KEY || process.env.SARVAM_API_KEY;
    const sarvamLlmKey = process.env.SARVAM_API_KEY || sarvamOcrKey;

    if (sarvamOcrKey) {
      const sarvamResult = await extractWithSarvam(file, sarvamOcrKey);
      if (sarvamResult && sarvamResult.text) {
        text = sarvamResult.text;
        confidence = sarvamResult.confidence;
        engine = "sarvam";
      }
    }

    if (!text) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await Tesseract.recognize(buffer, "eng");
        text = result.data.text.trim();
        confidence = (result.data.confidence ?? 0) / 100;
        engine = "tesseract";
      } catch (tessErr) {
        console.warn("Tesseract recognize fallback failed:", tessErr);
      }
    }

    let aiStructured: object | null = null;
    if (text && sarvamLlmKey) {
      aiStructured = await extractStructuredWithAI(text, rawKind ?? kind, sarvamLlmKey);
    }

    const meta = buildDocumentExtractMeta({ kind, rawText: text, confidence });

    return NextResponse.json({
      text,
      confidence: meta.confidence,
      engine,
      kind: meta.kind,
      reviewRequired: meta.reviewRequired,
      handwritingLikely: meta.handwritingLikely,
      structured: aiStructured ?? meta,
      aiExtracted: aiStructured !== null,
      note: meta.handwritingLikely
        ? "Low confidence — likely handwriting or poor print. Doctor must confirm. Not merged into medicines/allergies."
        : aiStructured
        ? `AI-extracted structured ${rawKind ?? kind} data. Doctor confirms before clinical merge.`
        : "Printed-text OCR attached to the visit. Doctor confirms before any clinical merge.",
    });
  } catch {
    const meta = buildDocumentExtractMeta({ kind, rawText: "", confidence: 0, failed: true });
    return NextResponse.json({
      text: "",
      confidence: 0,
      kind: meta.kind,
      reviewRequired: true,
      failed: true,
      aiExtracted: false,
      structured: meta,
      note: "OCR failed. Photo stored for the doctor to read. Not merged into medicines/allergies.",
    });
  }
}
