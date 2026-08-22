export type LandingFeature = {
  overline: string;
  title: string;
  copy: string;
};

export const PIPELINE_STAGES = [
  "Voice or touchscreen",
  "Speech / text layer",
  "Multilingual extract",
  "Ayurvedic conversation engine",
  "Structured patient record",
  "Validation / confidence",
  "Doctor dashboard + HIS / EMR (mocked ABDM/FHIR)",
] as const;

export const DASHAVIDHA_FACTORS = [
  "Prakriti",
  "Vikriti",
  "Agni",
  "Satva",
  "Sara",
  "Samhanana",
  "Pramana",
  "Satmya",
  "Vyayama Shakti",
  "Vaya",
] as const;

export const DOCUMENT_STAGES = [
  "Physical documents",
  "OCR + document understanding",
  "Prescription / lab / scan metadata",
  "Structured record (not auto-merged into meds)",
  "Doctor review",
] as const;

export const CASE_SPINE = [
  "Patient state",
  "Chief complaint (SOCRATES)",
  "Clinical history (ROS)",
  "Dashavidha assessment",
  "Ahara-Vihara",
  "Medication / allergy / past history",
  "Red-flag screening",
  "Completion check",
  "Doctor summary",
] as const;

export const LANDING_FEATURES: LandingFeature[] = [
  {
    overline: "Intake",
    title: "AI-assisted case taking",
    copy: "Voice plus large-button touch. Ontology engine picks the next question; the model only fills slots.",
  },
  {
    overline: "Language",
    title: "Multilingual kiosk",
    copy: "Language is detected from the browser (and speech). No language picker. Hindi and Indian English are demo-grade.",
  },
  {
    overline: "Safety",
    title: "Red-flag interrupt",
    copy: "Chest pain, stroke signs, self-harm and more escalate to staff immediately — not buried at the end.",
  },
  {
    overline: "AYUSH",
    title: "Dashavidha Pariksha",
    copy: "Ten factors captured as self-report. Interpretation stays with the Ayurveda practitioner. Never auto-labeled.",
  },
  {
    overline: "Ahara",
    title: "Diet and lifestyle",
    copy: "Ahara-Vihara: meals, diet type, sleep, water, tea/coffee. Dietitian plans only after practitioner approval.",
  },
  {
    overline: "History",
    title: "SOCRATES + ROS + meds",
    copy: "Chief complaint, review of systems, then medicines, allergies, and past history. Allergies cannot be skipped.",
  },
  {
    overline: "Documents",
    title: "Printed report OCR",
    copy: "Camera capture of prescriptions and labs. Low confidence and handwriting go to a doctor review queue.",
  },
  {
    overline: "Clinic",
    title: "Practitioner dashboard",
    copy: "Live queue, editable AI summary, symptom timeline, notes, care plan, referrals. Practitioner has final authority.",
  },
  {
    overline: "Portal",
    title: "Patient station",
    copy: "Register, log symptoms, upload reports, track adherence, view approved plans, book follow-up, message the team.",
  },
  {
    overline: "Nutrition",
    title: "Dietitian console",
    copy: "Referred patients only. Approved summaries, meal customization, adherence, progress notes back to the practitioner.",
  },
  {
    overline: "Cadence",
    title: "Admin operations",
    copy: "Users and roles, knowledge base, document queue, audit logs, analytics, reported issues.",
  },
  {
    overline: "Interop",
    title: "FHIR + hash chain",
    copy: "Mocked ABDM/FHIR bundle on approve. SHA-256 visit chain for tamper evidence. Patient data stays off-chain.",
  },
];

export const LANDING_ROLES = [
  {
    href: "/login/patient",
    overline: "A",
    title: "Patient",
    copy: "Case taking, symptoms, documents, diet, plans, adherence, booking, messages.",
  },
  {
    href: "/login/doctor",
    overline: "B",
    title: "Ayurveda practitioner",
    copy: "Patient list, AI summary, Dashavidha, reports, care plans. Final clinical authority.",
  },
  {
    href: "/login/staff",
    overline: "C",
    title: "Dietitian / nutritionist",
    copy: "Referrals only. Dietary history, meal plans, adherence, report to practitioner.",
  },
  {
    href: "/login/admin",
    overline: "D",
    title: "Admin",
    copy: "Users, permissions, knowledge base, documents, audit, analytics, issues.",
  },
] as const;
