import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
);

const key = env.SARVAM_API_KEY;
if (!key) {
  console.error("SARVAM_API_KEY is missing from .env.local");
  process.exit(1);
}

async function probe(name, url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "api-subscription-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text.slice(0, 240) };
  }
  const authError =
    response.status === 403 && parsed?.error?.code === "invalid_api_key_error";
  return {
    name,
    status: response.status,
    ok: response.ok,
    authError,
    snippet: JSON.stringify(parsed).slice(0, 280),
  };
}

const results = [];
results.push(
  await probe("translate", "https://api.sarvam.ai/translate", {
    input: "hello",
    source_language_code: "en-IN",
    target_language_code: "hi-IN",
  })
);
results.push(
  await probe("chat", "https://api.sarvam.ai/v1/chat/completions", {
    model: env.SARVAM_LLM_MODEL || "sarvam-105b",
    messages: [{ role: "user", content: "Reply with the single word: ok" }],
    max_tokens: 8,
  })
);
results.push(
  await probe("tts", "https://api.sarvam.ai/text-to-speech", {
    text: "namaste",
    target_language_code: "hi-IN",
    model: "bulbul:v3",
  })
);

for (const row of results) {
  console.log(
    `${row.name}\tstatus=${row.status}\tok=${row.ok}\tauth_rejected=${row.authError}`
  );
  console.log(`  ${row.snippet}`);
}

const keyWorks = results.some((r) => r.ok) && !results.every((r) => r.authError);
const keyInvalid = results.every((r) => r.authError);
process.exit(keyInvalid ? 2 : keyWorks ? 0 : 1);
