import { NextResponse } from "next/server";
import Tesseract from "tesseract.js";
import { buildDocumentExtractMeta, type DocumentKind } from "@/lib/documents/metadata";

function asKind(value: FormDataEntryValue | null): DocumentKind {
  if (value === "prescription" || value === "lab" || value === "scan") return value;
  return "scan";
}

async function extractWithSarvam(file: Blob, apiKey: string): Promise<{ text: string; confidence: number } | null> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("https://api.sarvam.ai/document-ai", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
      },
      body: formData,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      text?: string;
      extracted_text?: string;
      content?: string;
      confidence?: number;
    };
    const text = (data.text || data.extracted_text || data.content || "").trim();
    const confidence = typeof data.confidence === "number" ? data.confidence : 0.88;
    return { text, confidence };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const kind = asKind(form.get("kind"));
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  try {
    let text = "";
    let confidence = 0;
    let engine: "sarvam" | "tesseract" = "tesseract";

    const sarvamApiKey = process.env.SARVAM_OCR_API_KEY || process.env.SARVAM_API_KEY;
    if (sarvamApiKey) {

      const sarvamResult = await extractWithSarvam(file, sarvamApiKey);
      if (sarvamResult && sarvamResult.text) {
        text = sarvamResult.text;
        confidence = sarvamResult.confidence;
        engine = "sarvam";
      }
    }

    if (!text) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await Tesseract.recognize(buffer, "eng");
      text = result.data.text.trim();
      confidence = (result.data.confidence ?? 0) / 100;
      engine = "tesseract";
    }

    const meta = buildDocumentExtractMeta({ kind, rawText: text, confidence });
    return NextResponse.json({
      text,
      confidence: meta.confidence,
      engine,
      kind: meta.kind,
      reviewRequired: meta.reviewRequired,
      handwritingLikely: meta.handwritingLikely,
      structured: meta,
      note: meta.handwritingLikely
        ? "Low confidence — likely handwriting or poor print. Doctor must confirm. Not merged into medicines/allergies."
        : "Printed-text OCR attached to the visit. Doctor confirms before any clinical merge.",
    });
  } catch {
    const meta = buildDocumentExtractMeta({
      kind,
      rawText: "",
      confidence: 0,
      failed: true,
    });
    return NextResponse.json({
      text: "",
      confidence: 0,
      kind: meta.kind,
      reviewRequired: true,
      failed: true,
      structured: meta,
      note: "OCR failed. Photo stored for the doctor to read. Not merged into medicines/allergies.",
    });
  }
}

