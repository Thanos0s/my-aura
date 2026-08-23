import { NextResponse } from "next/server";
import { heuristicExtract } from "@/lib/intake/extract";

export async function POST(request: Request) {
  const body = (await request.json()) as { transcript?: string };
  const transcript = body.transcript ?? "";
  const apiKey = process.env.SARVAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      source: "heuristic",
      extracted: heuristicExtract(transcript),
    });
  }

  const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": apiKey,
    },
    body: JSON.stringify({
      model: process.env.SARVAM_LLM_MODEL ?? "sarvam-105b",
      messages: [
        {
          role: "system",
          content:
            "Extract SOCRATES history slots as JSON only. Keys: chiefComplaint,site,onset,character,radiation,associated,timing,exacerbatingRelieving,severity. Never diagnose. Never label dosha or prakriti interpretation. Omit unknown keys.",
        },
        { role: "user", content: transcript },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({
      source: "heuristic-fallback",
      extracted: heuristicExtract(transcript),
    });
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "{}";
  let extracted: Record<string, string> = {};
  try {
    extracted = JSON.parse(content) as Record<string, string>;
  } catch {
    extracted = heuristicExtract(transcript) as Record<string, string>;
  }
  return NextResponse.json({ source: "sarvam", extracted });
}
