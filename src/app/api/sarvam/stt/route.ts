import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const audio = form.get("audio");
  const languageCode = String(form.get("languageCode") ?? "hi-IN");
  const apiKey = process.env.SARVAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      text: "",
      error: "SARVAM_API_KEY missing — use typed answers (offline/typed mode).",
      mode: "unavailable",
    });
  }

  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "audio required" }, { status: 400 });
  }

  const buffer = Buffer.from(await audio.arrayBuffer());
  const b64 = buffer.toString("base64");

  const response = await fetch("https://api.sarvam.ai/speech-to-text", {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "saaras:v4",
      language_code: languageCode,
      mode: "codemix",
      audio: b64,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json(
      { error: "Saaras request failed", detail: err, hint: "falling back to typed mode" },
      { status: 502 }
    );
  }

  const data = (await response.json()) as { transcript?: string; text?: string };
  return NextResponse.json({ text: data.transcript ?? data.text ?? "", model: "saaras:v4" });
}
