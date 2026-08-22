export type SlotStatus =
  | "empty"
  | "proposed"
  | "patient_confirmed"
  | "doctor_approved"
  | "doctor_corrected"
  | "clinician_to_assess";

export type AnswerSource = "patient" | "attendant" | "extractor" | "clinician";

export type Slot = {
  value: string;
  status: SlotStatus;
  confidence: number;
  source: AnswerSource;
};

export type IntakePhase =
  | "language"
  | "consent"
  | "answeredBy"
  | "pathway"
  | "socrates"
  | "ros"
  | "dashavidha"
  | "aharaVihara"
  | "history"
  | "redFlag"
  | "documents"
  | "recap"
  | "complete"
  | "escalated";

export type SocratesKey =
  | "chiefComplaint"
  | "site"
  | "onset"
  | "character"
  | "radiation"
  | "associated"
  | "timing"
  | "exacerbatingRelieving"
  | "severity";

export type HistoryKey =
  | "chronicConditions"
  | "surgeries"
  | "currentMedicines"
  | "allergies"
  | "familyHistory"
  | "substanceUse"
  | "occupation";

export type RosKey =
  | "cardiovascular"
  | "respiratory"
  | "gi"
  | "genitourinary"
  | "neurological"
  | "musculoskeletal"
  | "skin";

export type DashavidhaKey =
  | "prakriti"
  | "vikriti"
  | "agni"
  | "satva"
  | "sara"
  | "samhanana"
  | "pramana"
  | "satmya"
  | "vyayamaShakti"
  | "vaya";

export type AharaViharaKey =
  | "mealTimes"
  | "dietType"
  | "sleep"
  | "waterIntake"
  | "teaCoffeeSubstances";

export type RedFlagEvent = {
  questionId: string;
  at: number;
  escalated: boolean;
};

export type ConsentMap = {
  shareHistory: boolean;
  shareAyush: boolean;
  shareAbha: boolean;
  retainAfterEncounter: boolean;
};

export type IntakeState = {
  phase: IntakePhase;
  languageCode: string;
  answeredBy: AnswerSource;
  pathway: "allopathic" | "ayush";
  consent: ConsentMap;
  redFlagIndex: number;
  redFlags: Record<string, boolean | null>;
  redFlagEvents: RedFlagEvent[];
  socrates: Record<SocratesKey, Slot>;
  history: Record<HistoryKey, Slot>;
  ros: Record<RosKey, Slot>;
  dashavidha: Record<DashavidhaKey, Slot>;
  aharaVihara: Record<AharaViharaKey, Slot>;
  patientRecapConfirmed: boolean;
  offlineMode: boolean;
};

export type Prompt =
  | {
      kind: "ask";
      group: "redFlag" | "socrates" | "history" | "ros" | "dashavidha" | "aharaVihara" | "meta";
      id: string;
      text: string;
      chips?: string[];
      yesNo?: boolean;
    }
  | { kind: "escalated"; reason: string }
  | { kind: "complete" };

export const SOCRATES_ORDER: SocratesKey[] = [
  "chiefComplaint",
  "site",
  "onset",
  "character",
  "radiation",
  "associated",
  "timing",
  "exacerbatingRelieving",
  "severity",
];

export const HISTORY_ORDER: HistoryKey[] = [
  "currentMedicines",
  "allergies",
  "surgeries",
  "chronicConditions",
  "familyHistory",
  "substanceUse",
  "occupation",
];

export const ROS_ORDER: RosKey[] = [
  "cardiovascular",
  "respiratory",
  "gi",
  "genitourinary",
  "neurological",
  "musculoskeletal",
  "skin",
];

export const DASHAVIDHA_ORDER: DashavidhaKey[] = [
  "prakriti",
  "vikriti",
  "agni",
  "satva",
  "sara",
  "samhanana",
  "pramana",
  "satmya",
  "vyayamaShakti",
  "vaya",
];

export const DASHAVIDHA_FACTORS: Array<{ key: DashavidhaKey; label: string; hint: string }> = [
  { key: "prakriti", label: "Prakriti", hint: "Frame, skin, usual appetite — not a dosha label" },
  { key: "vikriti", label: "Vikriti", hint: "What changed — patient words only" },
  { key: "agni", label: "Agni", hint: "Digestive fire / appetite-digestion" },
  { key: "satva", label: "Satva", hint: "Stress handling and sleep" },
  { key: "sara", label: "Sara", hint: "Energy and tissue quality as reported" },
  { key: "samhanana", label: "Samhanana", hint: "Build / compactness, height and weight" },
  { key: "pramana", label: "Pramana", hint: "Measurements the patient knows" },
  { key: "satmya", label: "Satmya", hint: "Habitual tolerances and sensitivities" },
  { key: "vyayamaShakti", label: "Vyayama Shakti", hint: "Exercise capacity" },
  { key: "vaya", label: "Vaya", hint: "Age / date of birth" },
];

export const CANONICAL_STEPS = [
  { id: "patientState", label: "Patient state" },
  { id: "chiefComplaint", label: "Chief complaint (SOCRATES)" },
  { id: "clinicalHistory", label: "Clinical history (ROS)" },
  { id: "dashavidha", label: "Dashavidha assessment" },
  { id: "aharaVihara", label: "Ahara-Vihara" },
  { id: "medsHistory", label: "Medication / allergy / past history" },
  { id: "redFlag", label: "Red-flag screening" },
  { id: "completion", label: "Completion check" },
  { id: "doctorSummary", label: "Doctor summary" },
] as const;

export const AHARA_VIHARA_ORDER: AharaViharaKey[] = [
  "mealTimes",
  "dietType",
  "sleep",
  "waterIntake",
  "teaCoffeeSubstances",
];

export const RED_FLAG_QUESTIONS = [
  { id: "chest_pain", text: "Are you having chest pain or pressure right now?" },
  { id: "breathing", text: "Any difficulty breathing?" },
  { id: "bleeding", text: "Any severe or uncontrolled bleeding?" },
  { id: "stroke", text: "Sudden weakness, numbness, or slurred speech?" },
  { id: "abdomen", text: "Severe abdominal pain?" },
  { id: "pediatric", text: "If this is an infant: high fever or unusual drowsiness?" },
  {
    id: "self_harm",
    text: "Any thoughts of harming yourself or others? If yes, we will call staff immediately — this is not handled by the computer alone.",
  },
] as const;

export const PROMPTS: Record<string, { text: string; chips?: string[] }> = {
  chiefComplaint: { text: "What is the main problem that brought you here today?" },
  site: { text: "Where exactly do you feel it?" },
  onset: {
    text: "When did it start? Was it sudden or gradual?",
    chips: ["sudden", "gradual", "today", "yesterday", "days ago"],
  },
  character: {
    text: "How would you describe it — sharp, dull, burning, or cramping?",
    chips: ["sharp", "dull", "burning", "cramping"],
  },
  radiation: { text: "Does it spread anywhere else?", chips: ["no", "to back", "to arm", "to jaw"] },
  associated: {
    text: "Is anything else happening along with it — fever, nausea, vomiting?",
    chips: ["none", "fever", "nausea", "vomiting"],
  },
  timing: {
    text: "Is it constant, or does it come and go?",
    chips: ["constant", "comes and goes"],
  },
  exacerbatingRelieving: {
    text: "Does anything make it better or worse — food, movement, rest?",
    chips: ["food", "movement", "rest", "nothing"],
  },
  severity: {
    text: "On a scale of 1 to 10, how bad is it right now?",
    chips: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  chronicConditions: {
    text: "Have you been diagnosed with any long-term condition — diabetes, hypertension, thyroid, heart disease?",
    chips: ["none", "diabetes", "hypertension", "thyroid", "heart disease"],
  },
  surgeries: { text: "Any past surgeries or hospitalizations?", chips: ["none", "surgery", "hospitalized"] },
  currentMedicines: {
    text: "What medicines are you currently taking, including any Ayurvedic or herbal ones?",
    chips: ["none known"],
  },
  allergies: { text: "Any known drug or food allergies?", chips: ["none known"] },
  familyHistory: {
    text: "Does anyone in your immediate family have a similar condition, or diabetes, heart disease, or cancer?",
    chips: ["none known", "diabetes", "heart disease", "cancer"],
  },
  substanceUse: {
    text: "Do you smoke, drink alcohol, or use tobacco?",
    chips: ["no", "smoke", "alcohol", "tobacco"],
  },
  occupation: { text: "What is your occupation, and does it involve physical strain or exposure?" },
  cardiovascular: { text: "Any chest discomfort, palpitations, or swelling of legs?", chips: ["no", "yes"] },
  respiratory: { text: "Any cough, wheeze, or shortness of breath at rest?", chips: ["no", "yes"] },
  gi: { text: "Any change in appetite, bowel habits, or vomiting?", chips: ["no", "yes"] },
  genitourinary: { text: "Any burning urination or change in urine?", chips: ["no", "yes"] },
  neurological: { text: "Any headache, dizziness, or numbness?", chips: ["no", "yes"] },
  musculoskeletal: { text: "Any joint pain or stiffness?", chips: ["no", "yes"] },
  skin: { text: "Any rash, itching, or new skin changes?", chips: ["no", "yes"] },
  prakriti: {
    text: "Is your body frame generally thin, medium, or heavy? How is your skin — dry, oily, or normal? How is appetite most days?",
    chips: ["thin / dry", "medium", "heavy / oily"],
  },
  vikriti: { text: "What is troubling you today, and when did you first notice it? Has this happened before?" },
  agni: {
    text: "How is your appetite and digestion — regular hunger, bloating, or discomfort after eating? (This is Agni as you feel it, not a dosha label.)",
    chips: ["regular", "irregular hunger", "bloating", "discomfort after meals"],
  },
  satva: {
    text: "How do you usually handle stress? Do you sleep well most nights?",
    chips: ["sleep well", "poor sleep", "stressed easily", "coping ok"],
  },
  sara: { text: "How would you rate your energy on a typical day? Do cuts or wounds heal quickly?", chips: ["low energy", "usual", "high"] },
  samhanana: { text: "What is your height and weight? (BMI will be calculated for the doctor.)" },
  pramana: { text: "Please confirm height, weight, and any other body measurements you know." },
  satmya: { text: "Are there foods, weather, or activities you have always been sensitive to?" },
  vyayamaShakti: { text: "How much physical activity do you get in a typical week? Energized or drained after?" },
  vaya: { text: "What is your date of birth or age?" },
  mealTimes: {
    text: "What time do you usually eat your meals?",
    chips: ["irregular", "early", "late", "skip breakfast"],
  },
  dietType: {
    text: "Do you follow any specific diet — vegetarian, restricted, fasting days?",
    chips: ["vegetarian", "non-vegetarian", "mixed", "restricted", "fasting days"],
  },
  sleep: {
    text: "What is your typical sleep schedule?",
    chips: ["6 hours", "7–8 hours", "less than 6", "poor sleep"],
  },
  waterIntake: {
    text: "How much water do you drink in a day, roughly?",
    chips: ["<4 glasses", "4–6 glasses", "7–8 glasses", "more"],
  },
  teaCoffeeSubstances: {
    text: "Do you consume tea, coffee, or any addictive substances regularly?",
    chips: ["none", "tea", "coffee", "both", "other"],
  },
};

function emptySlot(): Slot {
  return { value: "", status: "empty", confidence: 0, source: "patient" };
}

function mapFrom<K extends string>(keys: readonly K[]): Record<K, Slot> {
  return Object.fromEntries(keys.map((k) => [k, emptySlot()])) as Record<K, Slot>;
}

export function createInitialState(): IntakeState {
  return {
    phase: "language",
    languageCode: "",
    answeredBy: "patient",
    pathway: "allopathic",
    consent: {
      shareHistory: true,
      shareAyush: true,
      shareAbha: false,
      retainAfterEncounter: true,
    },
    redFlagIndex: 0,
    redFlags: Object.fromEntries(RED_FLAG_QUESTIONS.map((q) => [q.id, null])),
    redFlagEvents: [],
    socrates: mapFrom(SOCRATES_ORDER),
    history: mapFrom(HISTORY_ORDER),
    ros: mapFrom(ROS_ORDER),
    dashavidha: mapFrom(DASHAVIDHA_ORDER),
    aharaVihara: mapFrom(AHARA_VIHARA_ORDER),
    patientRecapConfirmed: false,
    offlineMode: false,
  };
}

export function isFilled(slot: Slot): boolean {
  return slot.status !== "empty" && (slot.value.trim().length > 0 || slot.status === "clinician_to_assess");
}

export function filledCount(slots: Record<string, Slot>): { filled: number; total: number } {
  const values = Object.values(slots);
  return {
    filled: values.filter(isFilled).length,
    total: values.length,
  };
}

export function clinicalHistoryProgress(state: IntakeState): { filled: number; total: number } {
  return filledCount(state.ros);
}

const RED_FLAG_TEXT_HINTS: Array<{ id: string; pattern: RegExp }> = [
  { id: "chest_pain", pattern: /\b(chest pain|chest pressure|pressure in (my |the )?chest)\b/i },
  { id: "breathing", pattern: /\b(can'?t breathe|cannot breathe|difficulty breathing|short(ness)? of breath at rest)\b/i },
  { id: "bleeding", pattern: /\b(severe bleeding|uncontrolled bleeding)\b/i },
  { id: "stroke", pattern: /\b(slurred speech|sudden weakness|sudden numbness)\b/i },
  { id: "abdomen", pattern: /\bsevere abdominal pain\b/i },
  { id: "self_harm", pattern: /\b(kill myself|suicide|harm myself|harming yourself|harming myself)\b/i },
];

export function detectRedFlagInterrupt(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  for (const hint of RED_FLAG_TEXT_HINTS) {
    if (hint.pattern.test(t)) return hint.id;
  }
  return null;
}

function escalateNow(state: IntakeState, questionId: string): IntakeState {
  return {
    ...state,
    phase: "escalated",
    redFlags: { ...state.redFlags, [questionId]: true },
    redFlagEvents: [...state.redFlagEvents, { questionId, at: 0, escalated: true }],
  };
}

export function normalizeDashavidha(
  raw: Record<string, Slot> | undefined
): Record<DashavidhaKey, Slot> {
  const base = mapFrom(DASHAVIDHA_ORDER);
  if (!raw) return base;
  const agni = raw.agni ?? raw.aharaShakti;
  const satva = raw.satva ?? raw.sattva;
  for (const key of DASHAVIDHA_ORDER) {
    if (key === "agni" && agni) base.agni = agni;
    else if (key === "satva" && satva) base.satva = satva;
    else if (raw[key]) base[key] = raw[key] as Slot;
  }
  return base;
}

export function nextQuestion(state: IntakeState): Prompt {
  if (state.phase === "escalated") {
    const last = state.redFlagEvents[state.redFlagEvents.length - 1];
    return { kind: "escalated", reason: last?.questionId ?? "red_flag" };
  }
  if (state.phase === "complete") {
    return { kind: "complete" };
  }
  if (state.phase === "socrates") {
    for (const key of SOCRATES_ORDER) {
      if (!isFilled(state.socrates[key])) {
        const p = PROMPTS[key];
        return {
          kind: "ask",
          group: "socrates",
          id: key,
          text: p?.text ?? key,
          chips: p?.chips,
        };
      }
    }
    return nextQuestion({ ...state, phase: "ros" });
  }
  if (state.phase === "ros") {
    for (const key of ROS_ORDER) {
      if (!isFilled(state.ros[key])) {
        const p = PROMPTS[key];
        return { kind: "ask", group: "ros", id: key, text: p?.text ?? key, chips: p?.chips };
      }
    }
    if (state.pathway === "ayush") {
      return nextQuestion({ ...state, phase: "dashavidha" });
    }
    return nextQuestion({ ...state, phase: "aharaVihara" });
  }
  if (state.phase === "dashavidha") {
    const dash = normalizeDashavidha(state.dashavidha);
    for (const key of DASHAVIDHA_ORDER) {
      if (!isFilled(dash[key])) {
        const p = PROMPTS[key];
        return { kind: "ask", group: "dashavidha", id: key, text: p?.text ?? key, chips: p?.chips };
      }
    }
    return nextQuestion({ ...state, phase: "aharaVihara" });
  }
  if (state.phase === "aharaVihara") {
    const ahara = state.aharaVihara ?? mapFrom(AHARA_VIHARA_ORDER);
    for (const key of AHARA_VIHARA_ORDER) {
      if (!isFilled(ahara[key])) {
        const p = PROMPTS[key];
        return { kind: "ask", group: "aharaVihara", id: key, text: p?.text ?? key, chips: p?.chips };
      }
    }
    return nextQuestion({ ...state, phase: "history" });
  }
  if (state.phase === "history") {
    for (const key of HISTORY_ORDER) {
      if (!isFilled(state.history[key])) {
        const p = PROMPTS[key];
        return { kind: "ask", group: "history", id: key, text: p?.text ?? key, chips: p?.chips };
      }
    }
    return nextQuestion({ ...state, phase: "redFlag", redFlagIndex: 0 });
  }
  if (state.phase === "redFlag") {
    const q = RED_FLAG_QUESTIONS[state.redFlagIndex];
    if (!q) {
      return nextQuestion({ ...state, phase: "recap" });
    }
    return { kind: "ask", group: "redFlag", id: q.id, text: q.text, yesNo: true, chips: ["Yes", "No"] };
  }
  if (state.phase === "documents" || state.phase === "recap") {
    return { kind: "complete" };
  }
  return { kind: "ask", group: "meta", id: state.phase, text: "Continue." };
}

export function applyYesNo(state: IntakeState, questionId: string, yes: boolean): IntakeState {
  if (state.phase !== "redFlag") return state;
  const redFlags = { ...state.redFlags, [questionId]: yes };
  if (yes) {
    return escalateNow({ ...state, redFlags }, questionId);
  }
  const nextIndex = state.redFlagIndex + 1;
  return {
    ...state,
    redFlags,
    redFlagIndex: nextIndex,
    phase: nextIndex >= RED_FLAG_QUESTIONS.length ? "recap" : "redFlag",
  };
}

function fillSlot(source: AnswerSource, value: string, confidence: number): Slot {
  return {
    value,
    status: "proposed",
    confidence,
    source,
  };
}

export function applySlotAnswer(
  state: IntakeState,
  group: "socrates" | "history" | "ros" | "dashavidha" | "aharaVihara",
  id: string,
  value: string,
  source: AnswerSource = "patient"
): IntakeState {
  const interruptId =
    detectRedFlagInterrupt(value) ??
    (group === "ros" &&
    (id === "cardiovascular" || id === "respiratory" || id === "neurological") &&
    /^y/i.test(value.trim())
      ? id === "cardiovascular"
        ? "chest_pain"
        : id === "respiratory"
          ? "breathing"
          : "stroke"
      : null);
  if (interruptId) {
    return escalateNow(state, interruptId);
  }

  if (group === "socrates") {
    const key = id as SocratesKey;
    return {
      ...state,
      socrates: { ...state.socrates, [key]: fillSlot(source, value, 1) },
    };
  }
  if (group === "history") {
    const key = id as HistoryKey;
    return {
      ...state,
      history: { ...state.history, [key]: fillSlot(source, value, 1) },
    };
  }
  if (group === "ros") {
    const key = id as RosKey;
    return {
      ...state,
      ros: { ...state.ros, [key]: fillSlot(source, value, 1) },
    };
  }
  if (group === "dashavidha") {
    const key = id as DashavidhaKey;
    const dash = normalizeDashavidha(state.dashavidha);
    return {
      ...state,
      dashavidha: { ...dash, [key]: fillSlot(source, value, 1) },
    };
  }
  const key = id as AharaViharaKey;
  const ahara = state.aharaVihara ?? mapFrom(AHARA_VIHARA_ORDER);
  return {
    ...state,
    aharaVihara: { ...ahara, [key]: fillSlot(source, value, 1) },
  };
}

export function applyExtraction(
  state: IntakeState,
  extracted: Partial<Record<SocratesKey, string>>
): IntakeState {
  let next = state;
  const socrates = { ...state.socrates };
  for (const key of SOCRATES_ORDER) {
    const value = extracted[key];
    if (value && value.trim() && !isFilled(socrates[key])) {
      const interruptId = detectRedFlagInterrupt(value);
      if (interruptId) {
        return escalateNow(next, interruptId);
      }
      socrates[key] = fillSlot("extractor", value.trim(), 0.7);
    }
  }
  return { ...next, socrates };
}

export function canCompleteIntake(state: IntakeState): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (state.phase === "escalated") {
    reasons.push("red flag not cleared — staff must take over");
  }
  if (!state.patientRecapConfirmed) {
    reasons.push("patient has not confirmed the recap");
  }
  if (!isFilled(state.history.currentMedicines)) {
    reasons.push("current medicines must be filled (or none known)");
  }
  if (!isFilled(state.history.allergies)) {
    reasons.push("allergies must be filled (or none known)");
  }
  if (state.pathway === "ayush") {
    const dash = normalizeDashavidha(state.dashavidha);
    for (const key of DASHAVIDHA_ORDER) {
      if (!isFilled(dash[key])) {
        reasons.push(`Dashavidha ${key} unanswered — mark clinician to assess or answer`);
      }
    }
  }
  for (const q of RED_FLAG_QUESTIONS) {
    if (state.redFlags[q.id] === null || state.redFlags[q.id] === undefined) {
      reasons.push("red-flag screening incomplete");
      break;
    }
  }
  const ahara = state.aharaVihara ?? mapFrom(AHARA_VIHARA_ORDER);
  for (const key of AHARA_VIHARA_ORDER) {
    if (!isFilled(ahara[key])) {
      reasons.push(`Ahara-Vihara ${key} unanswered`);
    }
  }
  return { ok: reasons.length === 0, reasons };
}

export function plainLanguageRecap(state: IntakeState): string {
  const cc = state.socrates.chiefComplaint.value || "not stated";
  const site = state.socrates.site.value;
  const onset = state.socrates.onset.value;
  const meds = state.history.currentMedicines.value || "not stated";
  const allergy = state.history.allergies.value || "not stated";
  const ahara = state.aharaVihara ?? mapFrom(AHARA_VIHARA_ORDER);
  const meals = ahara.mealTimes.value || "not stated";
  const diet = ahara.dietType.value || "not stated";
  const sleep = ahara.sleep.value || "not stated";
  const water = ahara.waterIntake.value || "not stated";
  const tea = ahara.teaCoffeeSubstances.value || "not stated";
  return `Main problem: ${cc}. ${site ? `Location: ${site}. ` : ""}${onset ? `Started: ${onset}. ` : ""}Medicines: ${meds}. Allergies: ${allergy}. Diet & lifestyle: meals ${meals}; diet ${diet}; sleep ${sleep}; water ${water}; tea/coffee/substances ${tea}. Answered by: ${state.answeredBy}.`;
}
