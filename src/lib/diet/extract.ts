export type DietPlanExtraction = {
  plan_details: {
    plan_name: string;
    practitioner_name: string | null;
    duration_weeks: number | null;
    general_guidelines: string;
  };
  target_daily_macros: {
    calories_kcal: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fats_g: number | null;
  };
  daily_schedule: Array<{
    meal_time: string;
    time_suggestion: string | null;
    food_items: Array<{
      item_name: string;
      portion_size: string | null;
      calories: number | null;
      macros: {
        protein: number | null;
        carbs: number | null;
        fats: number | null;
      };
      image_search_key: string;
    }>;
  }>;
  foods_to_avoid: string[];
};

export function toImageSearchKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const DIET_EXTRACTION_SYSTEM_PROMPT = `You are an expert clinical nutritionist API. Your task is to extract dietary recommendations, meal plans, and nutritional guidelines provided by a practitioner and format them into a structured meal plan.

You must map the prescribed foods to standard nutritional data. For every food item, generate an image_search_key (a clean, lowercase string of the core food name) that the frontend can use to fetch the corresponding image from the internal Food Database.

Extract the data and return it STRICTLY as a valid JSON object using the exact schema below. If a specific field is not found, return null. Do not include markdown formatting like \`\`\`json in the output.

Required JSON Schema:
{
"plan_details": {
"plan_name": "string (e.g., High Protein Diabetic Plan)",
"practitioner_name": "string or null",
"duration_weeks": "number or null",
"general_guidelines": "string (A brief summary of the diet rules)"
},
"target_daily_macros": {
"calories_kcal": "number or null",
"protein_g": "number or null",
"carbs_g": "number or null",
"fats_g": "number or null"
},
"daily_schedule": [
{
"meal_time": "string (e.g., Breakfast, Mid-Morning Snack, Lunch, Dinner)",
"time_suggestion": "string or null (e.g., 08:00 AM)",
"food_items": [
{
"item_name": "string",
"portion_size": "string (e.g., 2 bowls, 150g)",
"calories": "number or null",
"macros": {
"protein": "number or null",
"carbs": "number or null",
"fats": "number or null"
},
"image_search_key": "string (e.g., 'grilled-chicken-breast' or 'oatmeal-bowl' to query the food database)"
}
]
}
],
"foods_to_avoid": ["array of strings"]
}`;

/**
 * Best-effort extraction used when no LLM key is configured, or the LLM
 * call/parse fails. Splits meal itemsText on commas/semicolons and infers
 * an image_search_key per item; everything else that can't be reliably
 * parsed from free text is left null, per the schema's contract.
 */
export function heuristicExtractDietPlan(input: {
  title: string;
  notes: string;
  practitionerName?: string | null;
  meals: Array<{ label: string; itemsText: string }>;
}): DietPlanExtraction {
  const avoidMatch = input.notes.match(/avoid[:\-]\s*(.+)/i);
  const avoidCapture = avoidMatch?.[1];
  const foods_to_avoid = avoidCapture
    ? avoidCapture
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const daily_schedule = input.meals
    .filter((m) => m.itemsText.trim().length > 0)
    .map((m) => ({
      meal_time: m.label,
      time_suggestion: null,
      food_items: m.itemsText
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((item_name) => ({
          item_name,
          portion_size: null,
          calories: null,
          macros: { protein: null, carbs: null, fats: null },
          image_search_key: toImageSearchKey(item_name),
        })),
    }));

  return {
    plan_details: {
      plan_name: input.title || "Diet Plan",
      practitioner_name: input.practitionerName ?? null,
      duration_weeks: null,
      general_guidelines: input.notes || "",
    },
    target_daily_macros: {
      calories_kcal: null,
      protein_g: null,
      carbs_g: null,
      fats_g: null,
    },
    daily_schedule,
    foods_to_avoid,
  };
}
