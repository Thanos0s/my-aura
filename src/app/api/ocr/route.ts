import { NextResponse } from "next/server";
import Tesseract from "tesseract.js";
import { buildDocumentExtractMeta, type DocumentKind } from "@/lib/documents/metadata";

function asKind(value: FormDataEntryValue | null): DocumentKind {
  if (value === "prescription" || value === "lab" || value === "scan") return value;
  return "scan";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const kind = asKind(form.get("kind"));
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await Tesseract.recognize(buffer, "eng");
    const text = result.data.text.trim();
    const confidence = (result.data.confidence ?? 0) / 100;
    const meta = buildDocumentExtractMeta({ kind, rawText: text, confidence });
    return NextResponse.json({
      text,
      confidence: meta.confidence,
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
