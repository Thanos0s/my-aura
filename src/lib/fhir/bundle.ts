export type FhirBundle = {
  resourceType: "Bundle";
  type: "document";
  meta: { tag?: Array<{ system: string; code: string; display: string }> };
  entry: Array<{ resource: { resourceType: string } & Record<string, unknown> }>;
};

export function buildFhirBundle(input: {
  patientId: string;
  displayName: string;
  language: string;
  chiefComplaint: string;
  medications: string[];
  allergies: string[];
}): FhirBundle {
  return {
    resourceType: "Bundle",
    type: "document",
    meta: {
      tag: [
        {
          system: "https://my-aura.local/abdm",
          code: "mocked-abdm",
          display: "Mocked ABDM push — not a live sandbox integration",
        },
      ],
    },
    entry: [
      {
        resource: {
          resourceType: "Patient",
          id: input.patientId,
          name: [{ text: input.displayName }],
          communication: [{ language: { text: input.language } }],
        },
      },
      {
        resource: {
          resourceType: "Condition",
          id: `condition-${input.patientId}`,
          code: { text: input.chiefComplaint },
          subject: { reference: `Patient/${input.patientId}` },
        },
      },
      {
        resource: {
          resourceType: "MedicationStatement",
          id: `meds-${input.patientId}`,
          status: "recorded",
          subject: { reference: `Patient/${input.patientId}` },
          medication: { concept: { text: input.medications.join("; ") } },
        },
      },
      {
        resource: {
          resourceType: "AllergyIntolerance",
          id: `allergy-${input.patientId}`,
          patient: { reference: `Patient/${input.patientId}` },
          code: { text: input.allergies.join("; ") },
        },
      },
      {
        resource: {
          resourceType: "Observation",
          id: `obs-${input.patientId}`,
          status: "final",
          code: { text: "Chief complaint (self-reported)" },
          valueString: input.chiefComplaint,
        },
      },
    ],
  };
}
