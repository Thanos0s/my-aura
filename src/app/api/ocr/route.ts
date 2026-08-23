import { NextResponse } from "next/server";
import Tesseract from "tesseract.js";
import { buildDocumentExtractMeta, type DocumentKind } from "@/lib/documents/metadata";

function asKind(value: FormDataEntryValue | null): DocumentKind {
  if (value === "prescription" || value === "lab" || value === "scan") return value;
  return "scan";
}

export const maxDuration = 30;

async function extractWithSarvam(file: Blob, apiKey: string): Promise<{ text: string; confidence: number } | null> {
  try {
    const formData = new FormData();
    const filename = file instanceof File && file.name ? file.name : "prescription.png";
    formData.append("file", file, filename);
    formData.append("language", "en-IN");
    formData.append("output_format", "md");

    const res = await fetch("https://api.sarvam.ai/doc-ai/v1/job/digitise", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
      },
      body: formData,
    });

    if (!res.ok) {
      console.warn("Sarvam doc-ai submit returned", res.status, await res.text());
      return null;
    }

    const { job_id } = (await res.json()) as { job_id?: string };
    if (!job_id) return null;

    // Fast polling: check every 600ms, up to 8 times (~4.8s max)
    for (let i = 0; i < 8; i++) {
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
              blocks?: Array<{ text?: string; content?: string; lines?: Array<{ text?: string }> }>;
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
      if (statusData.status === "failed" || statusData.status === "rejected") {
        return null;
      }
    }
    return null;
  } catch (err) {
    console.error("Sarvam Doc-AI error:", err);
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

