import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: string; languageCode?: string };
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ audioBase64: null, mode: "unavailable" });
  }

  const response = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: body.text ?? "",
      target_language_code: body.languageCode ?? "hi-IN",
      model: "bulbul:v3",
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ audioBase64: null, mode: "failed" }, { status: 502 });
  }

  const data = (await response.json()) as { audios?: string[]; audio?: string };
  const audioBase64 = data.audios?.[0] ?? data.audio ?? null;
  return NextResponse.json({ audioBase64, model: "bulbul:v3" });
}
