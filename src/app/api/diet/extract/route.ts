import { NextResponse } from "next/server";
import {
  DIET_EXTRACTION_SYSTEM_PROMPT,
  heuristicExtractDietPlan,
  toImageSearchKey,
  type DietPlanExtraction,
} from "@/lib/diet/extract";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    notes?: string;
    practitionerName?: string | null;
    meals?: Array<{ label: string; itemsText: string }>;
  };
  const title = body.title ?? "";
  const notes = body.notes ?? "";
  const practitionerName = body.practitionerName ?? null;
  const meals = body.meals ?? [];

  const apiKey = process.env.SARVAM_API_KEY;
  const fallback = () =>
    NextResponse.json({
      source: "heuristic",
      extracted: heuristicExtractDietPlan({ title, notes, practitionerName, meals }),
    });

  if (!apiKey) return fallback();

  const userContent = [
    `Plan title: ${title || "(none provided)"}`,
    practitionerName ? `Practitioner: ${practitionerName}` : null,
    `Practitioner notes / general guidelines:\n${notes || "(none)"}`,
    meals.length
      ? `Meals:\n${meals.map((m) => `- ${m.label}: ${m.itemsText}`).join("\n")}`
      : "Meals: (none provided)",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": apiKey,
    },
    body: JSON.stringify({
      model: process.env.SARVAM_LLM_MODEL ?? "sarvam-105b",
      messages: [
        { role: "system", content: DIET_EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) return fallback();

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "";

  try {
    const clean = content.replace(/```json\s*|```/g, "").trim();
    const extracted = JSON.parse(clean) as DietPlanExtraction;
    // Ensure every food item carries a normalized image_search_key even if
    // the model returned something unexpected.
    for (const meal of extracted.daily_schedule ?? []) {
      for (const item of meal.food_items ?? []) {
        item.image_search_key = toImageSearchKey(item.image_search_key || item.item_name);
      }
    }
    return NextResponse.json({ source: "sarvam", extracted });
  } catch {
    return fallback();
  }
}
