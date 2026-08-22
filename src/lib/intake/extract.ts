import type { SocratesKey } from "@/lib/intake/engine";

export function heuristicExtract(transcript: string): Partial<Record<SocratesKey, string>> {
  const t = transcript.toLowerCase();
  const out: Partial<Record<SocratesKey, string>> = {};
  if (t.includes("pet") || t.includes("abdomen") || t.includes("stomach") || t.includes("pain")) {
    out.chiefComplaint = "abdominal pain";
  }
  if (t.includes("right") || t.includes("right side") || t.includes("dahine") || t.includes("right side mein")) {
    out.site = "right abdomen";
  }
  if (t.includes("kal") || t.includes("yesterday")) {
    out.onset = "yesterday";
  }
  if (t.includes("khana") || t.includes("after eating") || t.includes("khane")) {
    out.exacerbatingRelieving = "after eating";
  }
  if (t.includes("sharp") || t.includes("burning") || t.includes("cramp") || t.includes("dull")) {
    out.character = t.includes("sharp")
      ? "sharp"
      : t.includes("burning")
        ? "burning"
        : t.includes("cramp")
          ? "cramping"
          : "dull";
  }
  return out;
}
