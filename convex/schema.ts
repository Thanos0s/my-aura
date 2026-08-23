import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const role = v.union(
  v.literal("patient"),
  v.literal("practitioner"),
  v.literal("dietitian"),
  v.literal("admin")
);

export default defineSchema({
  patients: defineTable({
    displayName: v.string(),
    phoneNumber: v.optional(v.string()),
    abhaId: v.optional(v.string()),
    languageCode: v.string(),
    lastKioskId: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_abha", ["abhaId"])
    .index("by_user", ["userId"])
    .index("by_phone", ["phoneNumber"]),

  users: defineTable({
    email: v.string(),
    pinHash: v.optional(v.string()),
    firebaseUid: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),
    role,
    displayName: v.string(),
    patientId: v.optional(v.id("patients")),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_patient", ["patientId"])
    .index("by_firebase", ["firebaseUid"])
    .index("by_token", ["tokenIdentifier"]),

  visits: defineTable({
    patientId: v.id("patients"),
    kioskId: v.string(),
    status: v.union(
      v.literal("intake"),
      v.literal("awaiting_patient_confirm"),
      v.literal("awaiting_doctor"),
      v.literal("approved"),
      v.literal("escalated")
    ),
    pathway: v.union(v.literal("allopathic"), v.literal("ayush")),
    answeredBy: v.union(v.literal("patient"), v.literal("attendant")),
    languageCode: v.string(),
    intakeJson: v.string(),
    recapText: v.string(),
    patientRecapConfirmed: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_patient", ["patientId"])
    .index("by_created", ["createdAt"]),

  consentRecords: defineTable({
    visitId: v.id("visits"),
    shareHistory: v.boolean(),
    shareAyush: v.boolean(),
    shareAbha: v.boolean(),
    retainAfterEncounter: v.boolean(),
    scriptVersion: v.string(),
    createdAt: v.number(),
  }).index("by_visit", ["visitId"]),

  redFlagEvents: defineTable({
    visitId: v.id("visits"),
    questionId: v.string(),
    createdAt: v.number(),
    escalationStatus: v.union(
      v.literal("open"),
      v.literal("acknowledged"),
      v.literal("cleared")
    ),
  })
    .index("by_visit", ["visitId"])
    .index("by_status", ["escalationStatus"]),

  doctorEdits: defineTable({
    visitId: v.id("visits"),
    fieldPath: v.string(),
    originalValue: v.string(),
    correctedValue: v.string(),
    doctorName: v.string(),
    createdAt: v.number(),
  }).index("by_visit", ["visitId"]),

  documents: defineTable({
    visitId: v.id("visits"),
    storageId: v.id("_storage"),
    kind: v.union(
      v.literal("prescription"),
      v.literal("lab"),
      v.literal("discharge"),
      v.literal("scan"),
      v.literal("other")
    ),
    createdAt: v.number(),
  }).index("by_visit", ["visitId"]),

  documentExtracts: defineTable({
    documentId: v.id("documents"),
    visitId: v.id("visits"),
    rawText: v.string(),
    structuredJson: v.string(),
    confidence: v.number(),
    reviewStatus: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("corrected"),
      v.literal("failed")
    ),
    createdAt: v.number(),
  })
    .index("by_visit", ["visitId"])
    .index("by_review", ["reviewStatus"]),

  auditHashes: defineTable({
    visitId: v.id("visits"),
    recordHash: v.string(),
    previousHash: v.string(),
    anchorStatus: v.union(v.literal("mocked"), v.literal("anchored")),
    anchorId: v.string(),
    createdAt: v.number(),
  }).index("by_visit", ["visitId"]),

  fhirBundles: defineTable({
    visitId: v.id("visits"),
    bundleJson: v.string(),
    mockPushStatus: v.union(v.literal("not_sent"), v.literal("mocked_ok")),
    createdAt: v.number(),
  }).index("by_visit", ["visitId"]),

  symptomLogs: defineTable({
    patientId: v.id("patients"),
    userId: v.id("users"),
    visitId: v.optional(v.id("visits")),
    text: v.string(),
    severity: v.number(),
    createdAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_user", ["userId"]),

  lifestyleLogs: defineTable({
    patientId: v.id("patients"),
    userId: v.id("users"),
    mealTimes: v.string(),
    dietType: v.string(),
    sleep: v.string(),
    waterIntake: v.string(),
    teaCoffeeSubstances: v.string(),
    notes: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_user", ["userId"]),

  carePlans: defineTable({
    patientId: v.id("patients"),
    visitId: v.optional(v.id("visits")),
    practitionerUserId: v.id("users"),
    title: v.string(),
    body: v.string(),
    status: v.union(v.literal("draft"), v.literal("approved")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_practitioner", ["practitionerUserId"]),

  dietPlans: defineTable({
    patientId: v.id("patients"),
    dietitianUserId: v.id("users"),
    referralId: v.id("referrals"),
    title: v.string(),
    notes: v.string(),
    structuredPlan: v.optional(v.string()),
    practitionerApproved: v.boolean(),
    shareable: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_dietitian", ["dietitianUserId"])
    .index("by_referral", ["referralId"]),

  meals: defineTable({
    dietPlanId: v.id("dietPlans"),
    label: v.string(),
    itemsText: v.string(),
    createdAt: v.number(),
  }).index("by_plan", ["dietPlanId"]),

  adherenceLogs: defineTable({
    patientId: v.id("patients"),
    userId: v.id("users"),
    kind: v.union(v.literal("care"), v.literal("diet"), v.literal("checkin")),
    note: v.string(),
    done: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_user", ["userId"]),

  appointments: defineTable({
    patientId: v.id("patients"),
    practitionerUserId: v.id("users"),
    scheduledAt: v.number(),
    status: v.union(
      v.literal("requested"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    notes: v.string(),
    channel: v.optional(
      v.union(v.literal("web"), v.literal("whatsapp"), v.literal("kiosk"))
    ),
    patientPhone: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_practitioner", ["practitionerUserId"]),

  messages: defineTable({
    patientId: v.id("patients"),
    visitId: v.optional(v.id("visits")),
    fromUserId: v.id("users"),
    toRole: v.union(v.literal("practitioner"), v.literal("dietitian"), v.literal("patient")),
    body: v.string(),
    createdAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_visit", ["visitId"]),

  referrals: defineTable({
    patientId: v.id("patients"),
    visitId: v.optional(v.id("visits")),
    practitionerUserId: v.id("users"),
    dietitianUserId: v.id("users"),
    status: v.union(v.literal("open"), v.literal("closed")),
    createdAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_dietitian", ["dietitianUserId"])
    .index("by_practitioner", ["practitionerUserId"]),

  practitionerNotes: defineTable({
    patientId: v.id("patients"),
    visitId: v.optional(v.id("visits")),
    authorUserId: v.id("users"),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_patient", ["patientId"]),

  ayurvedaAssessments: defineTable({
    visitId: v.id("visits"),
    patientId: v.id("patients"),
    practitionerUserId: v.id("users"),
    interpretation: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_visit", ["visitId"]).index("by_patient", ["patientId"]),

  knowledgeBase: defineTable({
    kind: v.union(v.literal("article"), v.literal("prompt")),
    title: v.string(),
    body: v.string(),
    createdBy: v.id("users"),
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index("by_kind", ["kind"]),

  issueReports: defineTable({
    reporterUserId: v.id("users"),
    title: v.string(),
    body: v.string(),
    status: v.union(v.literal("open"), v.literal("closed")),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_reporter", ["reporterUserId"]),

  auditLogs: defineTable({
    actorUserId: v.id("users"),
    action: v.string(),
    target: v.string(),
    payloadJson: v.string(),
    createdAt: v.number(),
  })
    .index("by_actor", ["actorUserId"])
    .index("by_created", ["createdAt"]),

  dietitianProgressNotes: defineTable({
    patientId: v.id("patients"),
    dietitianUserId: v.id("users"),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_patient", ["patientId"]),

  foods: defineTable({
    name: v.string(),
    category: v.string(),
    dosha: v.object({
      vata: v.string(),
      pitta: v.string(),
      kapha: v.string(),
    }),
    taste: v.array(v.string()),
    energy: v.string(),
    description: v.string(),
    nutrition: v.object({
      calories: v.string(),
      protein: v.string(),
      carbs: v.string(),
      fat: v.string(),
    }),
    bestSeason: v.array(v.string()),
    imageUrl: v.string(),
  }),
});