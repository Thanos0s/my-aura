import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const audio = form.get("audio");
  const languageCode = String(form.get("languageCode") ?? "").trim();
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

  if (audio.size < 256) {
    return NextResponse.json(
      { error: "Audio too short. Hold the mic for a few seconds and try again." },
      { status: 400 }
    );
  }

  // Sarvam Saaras expects multipart/form-data with `file`, not JSON base64.
  const outbound = new FormData();
  const filename =
    audio instanceof File && audio.name
      ? audio.name
      : `speech.${audio.type.includes("wav") ? "wav" : audio.type.includes("mp4") ? "mp4" : "webm"}`;
  outbound.set("file", audio, filename);
  const model = process.env.SARVAM_STT_MODEL || "saaras:v3";

  outbound.set("model", model);
  outbound.set("mode", "codemix");
  if (languageCode) {
    outbound.set("language_code", languageCode);
  }

  let response = await fetch("https://api.sarvam.ai/speech-to-text", {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
    },
    body: outbound,
  });

  if (!response.ok && model !== "saaras:v2") {
    // Retry with saaras:v2 in case v3 is not enabled on this subscription tier
    outbound.set("model", "saaras:v2");
    response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
      },
      body: outbound,
    });
  }

  if (!response.ok) {
    const err = await response.text();
    console.error("Saaras STT failed", response.status, err);
    return NextResponse.json(
      {
        error: "Saaras request failed",
        detail: err,
        status: response.status,
        hint: "falling back to typed mode",
      },
      { status: 502 }
    );
  }


  const data = (await response.json()) as {
    transcript?: string;
    text?: string;
    language_code?: string;
    language?: string;
  };
  const detectedLanguage = data.language_code ?? data.language;
  return NextResponse.json({
    text: data.transcript ?? data.text ?? "",
    model: "saaras:v4",
    ...(detectedLanguage ? { languageCode: detectedLanguage } : {}),
  });
}
