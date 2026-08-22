export type SarvamLanguage = {
  code: string;
  name: string;
  demoGrade: boolean;
};

/** Saaras: 22 Indic languages + English. Hindi/English are the demo-quality path. */
export const SARVAM_LANGUAGES: SarvamLanguage[] = [
  { code: "en-IN", name: "English (India)", demoGrade: true },
  { code: "hi-IN", name: "Hindi", demoGrade: true },
  { code: "bn-IN", name: "Bengali", demoGrade: false },
  { code: "ta-IN", name: "Tamil", demoGrade: false },
  { code: "te-IN", name: "Telugu", demoGrade: false },
  { code: "kn-IN", name: "Kannada", demoGrade: false },
  { code: "ml-IN", name: "Malayalam", demoGrade: false },
  { code: "mr-IN", name: "Marathi", demoGrade: false },
  { code: "gu-IN", name: "Gujarati", demoGrade: false },
  { code: "pa-IN", name: "Punjabi", demoGrade: false },
  { code: "od-IN", name: "Odia", demoGrade: false },
  { code: "as-IN", name: "Assamese", demoGrade: false },
  { code: "ur-IN", name: "Urdu", demoGrade: false },
  { code: "sa-IN", name: "Sanskrit", demoGrade: false },
  { code: "ne-IN", name: "Nepali", demoGrade: false },
  { code: "sd-IN", name: "Sindhi", demoGrade: false },
  { code: "kok-IN", name: "Konkani", demoGrade: false },
  { code: "mni-IN", name: "Manipuri", demoGrade: false },
  { code: "brx-IN", name: "Bodo", demoGrade: false },
  { code: "doi-IN", name: "Dogri", demoGrade: false },
  { code: "ks-IN", name: "Kashmiri", demoGrade: false },
  { code: "mai-IN", name: "Maithili", demoGrade: false },
  { code: "sat-IN", name: "Santali", demoGrade: false },
];

const FALLBACK_LANGUAGE = "en-IN";

/** ISO 639 tags that do not match the Sarvam code prefix (Odia is `or`, Sarvam uses `od-IN`). */
const PRIMARY_ALIASES: Record<string, string> = {
  or: "od-IN",
  ori: "od-IN",
};

function codeByLower(): Map<string, string> {
  return new Map(SARVAM_LANGUAGES.map((lang) => [lang.code.toLowerCase(), lang.code]));
}

function primaryToCode(): Map<string, string> {
  const map = new Map<string, string>();
  for (const lang of SARVAM_LANGUAGES) {
    const primary = lang.code.split("-")[0]?.toLowerCase();
    if (primary && !map.has(primary)) map.set(primary, lang.code);
  }
  for (const [alias, code] of Object.entries(PRIMARY_ALIASES)) {
    map.set(alias, code);
  }
  return map;
}

function mapOneTag(tag: string, exact: Map<string, string>, byPrimary: Map<string, string>): string | null {
  const normalized = tag.trim().toLowerCase().replace(/_/g, "-");
  if (!normalized) return null;
  const exactHit = exact.get(normalized);
  if (exactHit) return exactHit;
  const primary = normalized.split("-")[0];
  if (!primary) return null;
  return byPrimary.get(primary) ?? null;
}

/**
 * Map browser / STT language tags onto a Sarvam `xx-IN` code.
 * Walks `navigator.languages` order; unsupported tags are skipped. Fallback: en-IN.
 */
export function detectSarvamLanguageCode(
  navigatorLanguages: readonly string[] | string | undefined | null
): string {
  const tags =
    typeof navigatorLanguages === "string"
      ? [navigatorLanguages]
      : navigatorLanguages ?? [];
  const exact = codeByLower();
  const byPrimary = primaryToCode();
  for (const tag of tags) {
    const mapped = mapOneTag(tag, exact, byPrimary);
    if (mapped) return mapped;
  }
  return FALLBACK_LANGUAGE;
}

export function isDemoGradeLanguage(code: string): boolean {
  return SARVAM_LANGUAGES.find((l) => l.code === code)?.demoGrade === true;
}
