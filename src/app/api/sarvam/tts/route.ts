import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: string; languageCode?: string };
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ audioBase64: null, mode: "unavailable" });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ audioBase64: null, mode: "empty" });
  }

  const response = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model: "bulbul:v3",
      language_code: body.languageCode ?? "hi-IN",
      speaker: "shubh",
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Bulbul TTS failed", response.status, detail);
    return NextResponse.json({ audioBase64: null, mode: "failed", detail }, { status: 502 });
  }

  const data = (await response.json()) as { audios?: string[]; audio?: string };
  const audioBase64 = data.audios?.[0] ?? data.audio ?? null;
  return NextResponse.json({ audioBase64, model: "bulbul:v3" });
}
