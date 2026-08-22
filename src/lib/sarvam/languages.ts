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
