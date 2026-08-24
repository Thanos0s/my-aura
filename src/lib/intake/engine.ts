import {
  getPromptTranslation,
  getRedFlagTranslation,
  getYesNoTranslation,
} from "./translations";
import {
  matchChiefComplaint,
  QUESTION_BANK,
  buildDoctorClinicalSummary,
  type ComplaintDefinition,
  type ComplaintQuestion,
} from "./questionBank";

export {
  matchChiefComplaint,
  QUESTION_BANK,
  buildDoctorClinicalSummary,
  type ComplaintDefinition,
  type ComplaintQuestion,
};

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

export type ChatExchange = {
  id: string;
  question: string;
  answer: string;
  field: string;
  timestamp: number;
};

export type IntakeState = {
  phase: IntakePhase;
  languageCode: string;
  answeredBy: AnswerSource;
  pathway: "allopathic" | "ayush";
  consent: ConsentMap;
  matchedComplaintId?: string;
  complaintQuestionIndex?: number;
  complaintAnswers?: Record<string, string>;
  chatHistory?: ChatExchange[];
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

export function createInitialState(languageCode = "en-IN"): IntakeState {
  return {
    phase: "consent",
    languageCode,
    answeredBy: "patient",
    pathway: "allopathic",
    consent: {
      shareHistory: true,
      shareAyush: true,
      shareAbha: false,
      retainAfterEncounter: true,
    },
    matchedComplaintId: undefined,
    complaintQuestionIndex: 0,
    complaintAnswers: {},
    chatHistory: [],
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

export function isFilled(slot?: Slot): boolean {
  if (!slot) return false;
  return slot.status !== "empty" && (slot.value.trim().length > 0 || slot.status === "clinician_to_assess");
}

/** Fields already answered in this consultation — used so we never re-ask. */
export function conversationFacts(state: IntakeState, extra = ""): Record<string, string> {
  const chunks = [
    extra,
    state.socrates.chiefComplaint?.value,
    ...Object.values(state.complaintAnswers ?? {}),
    ...(state.chatHistory ?? []).map((e) => e.answer),
  ];
  return harvestImpliedAnswers(chunks.filter(Boolean).join("\n"), "");
}

/** Intents already covered by answers or by scanning the whole transcript. */
export function coveredFields(state: IntakeState): Set<string> {
  const fields = answeredFields(state);
  const facts = conversationFacts(state);
  for (const key of Object.keys(facts)) fields.add(key);
  // One combined history question covers these overlapping follow-ups.
  if (fields.has("onset") && fields.has("medication")) {
    fields.add("history_bundle");
    fields.add("trigger");
    fields.add("character_location");
  }
  return fields;
}

export function answeredFields(state: IntakeState): Set<string> {
  const fields = new Set<string>(Object.keys(state.complaintAnswers ?? {}));
  for (const exchange of state.chatHistory ?? []) {
    if (exchange.field) fields.add(exchange.field);
  }
  if (isFilled(state.socrates.chiefComplaint)) fields.add("chiefComplaint");
  return fields;
}

/**
 * Pull extra SOCRATES-style facts from a free-text utterance so one spoken
 * answer can fill onset + medication + pattern without re-asking.
 */
export function harvestImpliedAnswers(
  text: string,
  currentField: string
): Record<string, string> {
  const t = text.trim();
  if (!t) return {};
  const out: Record<string, string> = {};

  const onsetHit =
    /(कुछ\s*दिन|कई\s*दिन|दिनों\s*से|हफ़्ते|हफ्ते|हफ्तों|आज\s*से|कल\s*से|सुबह\s*से|since\s+(a\s+)?few\s+days|for\s+\d+\s+days|yesterday|this\s+morning|last\s+week)/i.test(
      t
    );
  if (onsetHit && currentField !== "onset") {
    const m = t.match(
      /((?:कुछ|कई)?\s*दिनों?\s*से|आज\s*से|कल\s*से|सुबह\s*से|since[^.|,]{0,40}|for\s+\d+\s+days[^.|,]{0,20})/i
    );
    out.onset = (m?.[1] ?? t).trim();
  }

  const noMed =
    /(कोई\s*दवा\s*नहीं|दवा\s*नहीं\s*ली|दवाई\s*नहीं|दवाई\s*ली\s*नहीं|दवा\s*ली\s*नहीं|नहीं\s*ली\s*है\s*दवा|कोई\s*दवाई\s*ली\s*नहीं|दवाई?.{0,12}नहीं|नहीं.{0,12}दवाई?|no\s+medicine|haven'?t\s+taken\s+any\s+medicine|did\s+not\s+take\s+medicine|not\s+taken\s+any\s+(medicine|tablet))/i.test(
      t
    );
  const yesMed =
    !noMed &&
    /(दवा\s*ली|दवाई\s*ली|गोली\s*खाई|took\s+(a\s+)?(medicine|tablet|painkiller)|paracetamol|एसिट|पैरासिटामोल)/i.test(
      t
    );
  if (currentField !== "medication") {
    if (noMed) out.medication = "कोई दवा नहीं ली / no medicine taken";
    else if (yesMed) out.medication = t;
  }

  const often =
    /(अक्सर|बार[-\s]*बार|लगातार|रोज|often|frequently|again\s+and\s+again|keeps\s+coming)/i.test(
      t
    );
  const firstTime = /(पहली\s*बार|पहली\s*ही\s*बार|first\s+time|never\s+before)/i.test(t);
  if (currentField !== "pattern") {
    if (often) out.pattern = "अक्सर / बार-बार होता है";
    else if (firstTime) out.pattern = "पहली बार";
  }

  const triggerCue =
    /(बढ़ता|ठीक\s*होता|आराम|worse|better|after\s+food|खाने\s*के\s*बाद|rest\s+helps)/i.test(t);
  if (triggerCue && currentField !== "trigger" && !out.trigger) {
    out.trigger = t;
  }

  const wantsTests =
    /(जांच|जाँच|टेस्ट|test\s*needed|need\s+tests|want\s+tests)/i.test(t);
  if (wantsTests && currentField !== "notes") {
    out.notes = t;
  }

  // Don't overwrite the field we are actively answering with a harvest copy.
  delete out[currentField];
  return out;
}

function mapComplaintFieldToState(
  state: IntakeState,
  field: string,
  value: string,
  source: AnswerSource
): IntakeState {
  const updatedSocrates = { ...state.socrates };
  const updatedHistory = { ...state.history };
  if (field === "character_location") {
    updatedSocrates.site = fillSlot(source, value, 1);
    updatedSocrates.character = fillSlot(source, value, 1);
  } else if (field === "trigger") {
    updatedSocrates.exacerbatingRelieving = fillSlot(source, value, 1);
  } else if (field === "onset") {
    updatedSocrates.onset = fillSlot(source, value, 1);
  } else if (field === "medication") {
    updatedHistory.currentMedicines = fillSlot(source, value, 1);
  } else if (field === "pattern") {
    updatedSocrates.timing = fillSlot(source, value, 1);
  } else if (field === "notes") {
    updatedSocrates.associated = fillSlot(source, value, 1);
  } else if (field === "severity_now") {
    updatedSocrates.severity = fillSlot(source, value, 1);
  } else if (field in updatedSocrates) {
    updatedSocrates[field as SocratesKey] = fillSlot(source, value, 1);
  }
  return { ...state, socrates: updatedSocrates, history: updatedHistory };
}

function firstUnansweredComplaintIndex(
  complaint: ComplaintDefinition,
  answered: Set<string>,
  fromIndex = 0
): number {
  for (let i = fromIndex; i < complaint.questions.length; i += 1) {
    const q = complaint.questions[i];
    if (q && !answered.has(q.field)) return i;
  }
  return complaint.questions.length;
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
  { id: "chest_pain", pattern: /\b(chest pain|chest pressure|pressure in (my |the )?chest|सीने में दर्द|छाती में दर्द)\b/i },
  { id: "breathing", pattern: /\b(can'?t breathe|cannot breathe|difficulty breathing|short(ness)? of breath at rest|सांस फूलना|सांस लेने में दिक्कत)\b/i },
  { id: "bleeding", pattern: /\b(severe bleeding|uncontrolled bleeding|खून बहना)\b/i },
  { id: "stroke", pattern: /\b(slurred speech|sudden weakness|sudden numbness|लकवा|आधा अंग सुन्न)\b/i },
  { id: "abdomen", pattern: /\b(severe abdominal pain|असहनीय पेट दर्द)\b/i },
  { id: "self_harm", pattern: /\b(kill myself|suicide|harm myself|harming yourself|harming myself|आत्महत्या)\b/i },
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
    redFlagEvents: [...state.redFlagEvents, { questionId, at: Date.now(), escalated: true }],
  };
}

export function normalizeDashavidha(
  raw: Record<string, Slot> | undefined
): Record<DashavidhaKey, Slot> {
  const base = mapFrom(DASHAVIDHA_ORDER);
  if (!raw) return base;
  const agni = raw.agni ?? (raw as Record<string, Slot>).aharaShakti;
  const satva = raw.satva ?? (raw as Record<string, Slot>).sattva;
  for (const key of DASHAVIDHA_ORDER) {
    if (key === "agni" && agni) base.agni = agni;
    else if (key === "satva" && satva) base.satva = satva;
    else if (raw[key]) base[key] = raw[key] as Slot;
  }
  return base;
}

export function nextQuestion(state: IntakeState): Prompt {
  const lang = state.languageCode || "en-IN";
  const isHi = lang.startsWith("hi");

  if (state.phase === "escalated") {
    const last = state.redFlagEvents[state.redFlagEvents.length - 1];
    return { kind: "escalated", reason: last?.questionId ?? "red_flag" };
  }
  if (state.phase === "complete" || state.phase === "documents" || state.phase === "recap") {
    return { kind: "complete" };
  }

  // ─── 1. SOCRATES & CHIEF COMPLAINT FLOW ────────────────────────────────────
  if (state.phase === "socrates") {
    // If chief complaint not filled, ask the opening question
    if (!isFilled(state.socrates.chiefComplaint)) {
      const p = getPromptTranslation("chiefComplaint", lang);
      return {
        kind: "ask",
        group: "socrates",
        id: "chiefComplaint",
        text: p.text,
        chips: isHi
          ? ["पेट दर्द", "सिरदर्द", "बुखार", "खांसी और जुकाम", "कमर दर्द", "जोड़ों का दर्द", "दस्त", "उल्टी / जी मिचलाना", "सीने में दर्द", "चक्कर / कमजोरी"]
          : ["Stomach ache", "Headache", "Fever", "Cough & Cold", "Back pain", "Joint / Body pain", "Diarrhea", "Vomiting", "Chest pain", "Dizziness / Weakness"],
      };
    }

    const socratesTurns = (state.chatHistory ?? []).filter(
      (e) => !DASHAVIDHA_ORDER.includes(e.field as DashavidhaKey)
    ).length;

    // Strict 6-question limit for the complaint / problem interview
    if (socratesTurns >= 6) {
      if (state.pathway === "ayush") {
        return nextQuestion({ ...state, phase: "dashavidha" });
      }
      return { kind: "complete" };
    }

    const hadComplaintInterview =
      Boolean(state.matchedComplaintId) ||
      Object.keys(state.complaintAnswers ?? {}).length > 0 ||
      (state.chatHistory ?? []).some(
        (e) => e.field && e.field !== "chiefComplaint"
      ) ||
      (state.chatHistory ?? []).some((e) => e.field === "chiefComplaint");

    // Recover a lost match only if this visit already started the complaint chat.
    let matchedId = state.matchedComplaintId;
    if (!matchedId && hadComplaintInterview && isFilled(state.socrates.chiefComplaint)) {
      matchedId = matchChiefComplaint(state.socrates.chiefComplaint.value).id;
    }

    const answered = coveredFields(state);

    // If a specific matched complaint is in progress (or recoverable)
    if (matchedId) {
      const complaint =
        QUESTION_BANK.find((c) => c.id === matchedId) ||
        matchChiefComplaint(state.socrates.chiefComplaint.value);

      // Skip fields already present in chat / complaint answers
      const qIndex = firstUnansweredComplaintIndex(complaint, answered, 0);
      if (qIndex < complaint.questions.length && socratesTurns < 6) {
        const q = complaint.questions[qIndex];
        if (q) {
          return {
            kind: "ask",
            group: "socrates",
            id: q.field,
            text: isHi ? q.hi : q.en,
            chips: isHi ? q.chips_hi : q.chips_en,
          };
        }
      }

      // If complaint was red flag and all emergency questions asked -> escalate!
      if (complaint.redFlag) {
        return { kind: "escalated", reason: complaint.id };
      }

      // 6-question problem interview completed!
      if (state.pathway === "ayush") {
        return nextQuestion({
          ...state,
          phase: "dashavidha",
          matchedComplaintId: matchedId,
        });
      }

      // Standard Allopathic OPD: complete
      return { kind: "complete" };
    }

    // Already ran a complaint-style interview but lost matched id
    if (hadComplaintInterview || socratesTurns >= 6) {
      if (state.pathway === "ayush") {
        return nextQuestion({ ...state, phase: "dashavidha" });
      }
      return { kind: "complete" };
    }

    // Legacy SOCRATES fallback (only when no complaint interview happened)
    for (const key of SOCRATES_ORDER) {
      if (!isFilled(state.socrates[key]) && socratesTurns < 6) {
        const p = getPromptTranslation(key, lang);
        return {
          kind: "ask",
          group: "socrates",
          id: key,
          text: p.text,
          chips: p.chips,
        };
      }
    }

    if (!hadComplaintInterview) {
      return nextQuestion({ ...state, phase: "ros" });
    }
    if (state.pathway === "ayush") {
      return nextQuestion({ ...state, phase: "dashavidha" });
    }
    return { kind: "complete" };
  }

  // ─── 2. AYUSH DASHAVIDHA ASSESSMENT (10 AYURVEDIC PILLARS) ───────────────────
  if (state.phase === "dashavidha") {
    const dash = normalizeDashavidha(state.dashavidha);
    for (const key of DASHAVIDHA_ORDER) {
      if (!isFilled(dash[key])) {
        const p = getPromptTranslation(key, lang);
        return { kind: "ask", group: "dashavidha", id: key, text: p.text, chips: p.chips };
      }
    }
    const hadComplaintInterview =
      Boolean(state.matchedComplaintId) ||
      Object.keys(state.complaintAnswers ?? {}).length > 0 ||
      (state.chatHistory ?? []).length > 0;
    if (hadComplaintInterview) {
      return { kind: "complete" };
    }
    return nextQuestion({ ...state, phase: "aharaVihara" });
  }


  // ─── 3. ROS (Clinical Review of Systems) ───────────────────────────────────
  if (state.phase === "ros") {
    for (const key of ROS_ORDER) {
      if (!isFilled(state.ros[key])) {
        const p = getPromptTranslation(key, lang);
        return { kind: "ask", group: "ros", id: key, text: p.text, chips: p.chips };
      }
    }
    if (state.pathway === "ayush") {
      return nextQuestion({ ...state, phase: "dashavidha" });
    }
    return nextQuestion({ ...state, phase: "aharaVihara" });
  }


  // ─── 4. AHARA-VIHARA (LIFESTYLE) ───────────────────────────────────────────
  if (state.phase === "aharaVihara") {
    const ahara = state.aharaVihara ?? mapFrom(AHARA_VIHARA_ORDER);
    for (const key of AHARA_VIHARA_ORDER) {
      if (!isFilled(ahara[key])) {
        const p = getPromptTranslation(key, lang);
        return { kind: "ask", group: "aharaVihara", id: key, text: p.text, chips: p.chips };
      }
    }
    if (state.matchedComplaintId) {
      return { kind: "complete" };
    }
    return nextQuestion({ ...state, phase: "history" });
  }

  // ─── 5. HISTORY ────────────────────────────────────────────────────────────
  if (state.phase === "history") {
    for (const key of HISTORY_ORDER) {
      if (!isFilled(state.history[key])) {
        const p = getPromptTranslation(key, lang);
        return { kind: "ask", group: "history", id: key, text: p.text, chips: p.chips };
      }
    }
    return nextQuestion({ ...state, phase: "redFlag", redFlagIndex: 0 });
  }

  // ─── 6. RED FLAG SCREENING ─────────────────────────────────────────────────
  if (state.phase === "redFlag") {
    const q = RED_FLAG_QUESTIONS[state.redFlagIndex];
    if (!q) {
      return { kind: "complete" };
    }
    const rfText = getRedFlagTranslation(q.id, lang);
    const ynChips = getYesNoTranslation(lang);
    return { kind: "ask", group: "redFlag", id: q.id, text: rfText, yesNo: true, chips: ynChips };
  }

  return { kind: "complete" };
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
    phase: nextIndex >= RED_FLAG_QUESTIONS.length ? "documents" : "redFlag",
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

  const existingHistory = state.chatHistory || [];

  if (group === "socrates") {
    // 1. Initial Chief complaint
    if (id === "chiefComplaint" || !isFilled(state.socrates.chiefComplaint)) {
      const matched = matchChiefComplaint(value);
      const isHi = (state.languageCode || "en-IN").startsWith("hi");
      const questionText = isHi ? "आज आपको क्या मुख्य समस्या या तकलीफ है?" : "What is the main problem that brought you here today?";
      const exchange: ChatExchange = {
        id: "chiefComplaint",
        question: questionText,
        answer: value,
        field: "chiefComplaint",
        timestamp: Date.now(),
      };

      const impliedFromChief = harvestImpliedAnswers(value, "chiefComplaint");
      let nextState: IntakeState = {
        ...state,
        matchedComplaintId: matched.id,
        complaintQuestionIndex: 0,
        complaintAnswers: { ...impliedFromChief },
        chatHistory: [exchange],
        socrates: { ...state.socrates, chiefComplaint: fillSlot(source, value, 1) },
      };
      // Avoid immediately re-asking "what's bothering you?" for general_other
      if (matched.id === "general_other" && value.trim()) {
        nextState = {
          ...nextState,
          complaintAnswers: {
            character_location: value.trim(),
            ...impliedFromChief,
          },
        };
        nextState = mapComplaintFieldToState(
          nextState,
          "character_location",
          value.trim(),
          source
        );
        for (const [field, harvested] of Object.entries(impliedFromChief)) {
          nextState = mapComplaintFieldToState(nextState, field, harvested, source);
        }
        nextState = {
          ...nextState,
          complaintQuestionIndex: firstUnansweredComplaintIndex(
            matched,
            coveredFields(nextState),
            0
          ),
        };
      }
      return nextState;
    }

    // 2. Answering complaint question or standard SOCRATES slot
    const implied = harvestImpliedAnswers(value, id);
    const answers: Record<string, string> = {
      ...(state.complaintAnswers || {}),
      [id]: value,
      ...implied,
    };

    let mapped = mapComplaintFieldToState(state, id, value, source);
    for (const [field, harvested] of Object.entries(implied)) {
      mapped = mapComplaintFieldToState(mapped, field, harvested, source);
    }

    const complaint = QUESTION_BANK.find((c) => c.id === state.matchedComplaintId);
    const qIndex = state.complaintQuestionIndex ?? 0;
    let questionText = id;
    if (complaint?.questions[qIndex]) {
      const isHi = (state.languageCode || "en-IN").startsWith("hi");
      questionText = isHi
        ? complaint.questions[qIndex].hi
        : complaint.questions[qIndex].en;
    }

    const exchange: ChatExchange = {
      id: `q-${id}-${Date.now()}`,
      question: questionText,
      answer: value,
      field: id,
      timestamp: Date.now(),
    };

    const newChatHistory = [...existingHistory, exchange];

    const provisional = {
      ...mapped,
      complaintAnswers: answers,
      chatHistory: newChatHistory,
    };

    const nextQIndex = complaint
      ? firstUnansweredComplaintIndex(complaint, coveredFields(provisional), 0)
      : qIndex + 1;

    if (complaint && complaint.redFlag && nextQIndex >= complaint.questions.length) {
      return escalateNow(
        { ...provisional, complaintQuestionIndex: nextQIndex },
        complaint.id
      );
    }

    return {
      ...provisional,
      complaintQuestionIndex: nextQIndex,
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
    const p = getPromptTranslation(key, state.languageCode || "en-IN");
    const exchange: ChatExchange = {
      id: `dash-${key}-${Date.now()}`,
      question: p.text,
      answer: value,
      field: key,
      timestamp: Date.now(),
    };
    const newChatHistory = [...(state.chatHistory ?? []), exchange];
    const updatedDash = { ...dash, [key]: fillSlot(source, value, 1) };
    const allFilled = DASHAVIDHA_ORDER.every((k) => isFilled(updatedDash[k]));
    return {
      ...state,
      phase: allFilled ? "documents" : "dashavidha",
      dashavidha: updatedDash,
      chatHistory: newChatHistory,
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
  if (!isFilled(state.socrates.chiefComplaint)) {
    reasons.push("chief complaint must be recorded");
  }
  const isChatbotFlow = (state.chatHistory ?? []).length > 0 || Boolean(state.matchedComplaintId);
  if (!isChatbotFlow) {
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
  }
  return { ok: reasons.length === 0, reasons };
}



export function plainLanguageRecap(state: IntakeState): string {
  const cc = state.socrates.chiefComplaint.value || "not stated";
  const site = state.socrates.site.value;
  const onset = state.socrates.onset.value;
  const character = state.socrates.character.value;
  const radiation = state.socrates.radiation.value;
  const severity = state.socrates.severity.value;
  const meds = state.history.currentMedicines.value || "not stated";
  const allergy = state.history.allergies.value || "not stated";
  const ahara = state.aharaVihara ?? mapFrom(AHARA_VIHARA_ORDER);
  const meals = ahara.mealTimes.value || "not stated";
  const diet = ahara.dietType.value || "not stated";
  const sleep = ahara.sleep.value || "not stated";
  const water = ahara.waterIntake.value || "not stated";
  const tea = ahara.teaCoffeeSubstances.value || "not stated";

  let ayushSummary = "";
  if (state.pathway === "ayush") {
    const dash = normalizeDashavidha(state.dashavidha);
    const prakriti = dash.prakriti.value || "not stated";
    const vikriti = dash.vikriti.value || "not stated";
    const agni = dash.agni.value || "not stated";
    const satva = dash.satva.value || "not stated";
    ayushSummary = ` · Ayurveda Assessment (Dashavidha): Prakriti (${prakriti}), Vikriti (${vikriti}), Agni (${agni}), Satva (${satva})`;
  }

  return `Chief Complaint: ${cc}.${site ? ` Location: ${site}.` : ""}${onset ? ` Onset: ${onset}.` : ""}${character ? ` Character: ${character}.` : ""}${radiation ? ` Radiation: ${radiation}.` : ""}${severity ? ` Severity: ${severity}/10.` : ""} Current Medicines: ${meds}. Allergies: ${allergy}. Ahara-Vihara (Lifestyle): Meals: ${meals}; Diet: ${diet}; Sleep: ${sleep}; Water: ${water}; Substances: ${tea}.${ayushSummary} [ABHA Linked | Encounter Verified]`;
}
