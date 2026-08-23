import { describe, expect, it } from "vitest";
import {
  buildClinicalExtract,
  isLikelyMedicalDocument,
  stripConversationalNoise,
} from "@/lib/documents/clinicalExtract";

describe("isLikelyMedicalDocument", () => {
  it("rejects clearly non-medical text", () => {
    expect(isLikelyMedicalDocument("Top 5 tips for growing tomatoes in your backyard garden")).toBe(false);
    expect(isLikelyMedicalDocument("")).toBe(false);
  });

  it("rejects advertisement / brand-only material", () => {
    expect(isLikelyMedicalDocument("Planet Ayurveda\nwww.planetayurveda.com\nCall Now for offers!")).toBe(false);
    expect(isLikelyMedicalDocument("Follow us on Instagram! Order now and get 20% discount, all rights reserved ©")).toBe(false);
  });

  it("accepts text with clinical markers", () => {
    expect(isLikelyMedicalDocument("Patient Name: Asha Rao\nTab Paracetamol 650mg BD")).toBe(true);
    expect(isLikelyMedicalDocument("BP: 120/80, SpO2 98%")).toBe(true);
  });

  it("still accepts a genuine Planet Ayurveda prescription with clinical content", () => {
    expect(
      isLikelyMedicalDocument("Planet Ayurveda\nPatient Name: Asha Rao\nAshwagandha Churna BD before food")
    ).toBe(true);
  });
});

describe("stripConversationalNoise", () => {
  it("removes conversational preambles and code fences", () => {
    const raw = '```json\nHere is the simple breakdown:\n{"a": 1}\n```';
    expect(stripConversationalNoise(raw)).toBe('{"a": 1}');
  });
});

describe("buildClinicalExtract", () => {
  it("rejects non-medical documents with the exact strict payload", async () => {
    const result = await buildClinicalExtract({
      rawText: "Rainfall patterns across the northern plains this monsoon season",
      confidence: 0.9,
      kind: "scan",
    });
    expect(result).toEqual({
      valid_medical_document: false,
      ocr_status: "rejected_invalid_document",
      error_message:
        "Uploaded image does not appear to be a patient prescription. Please upload a valid clinical document.",
    });
  });

  it("rejects an advertisement / logo-only upload", async () => {
    const result = await buildClinicalExtract({
      rawText: "Planet Ayurveda\nwww.planetayurveda.com\nCall Now for offers!",
      confidence: 0.9,
      kind: "scan",
    });
    expect(result.valid_medical_document).toBe(false);
  });

  it("extracts structured fields from a valid prescription", async () => {
    const result = await buildClinicalExtract({
      rawText:
        "Dr. Anjali Mehta\nCity Ayurveda Hospital\nDate: 12/03/2024\nPatient Name: Ravi Kumar\nTab Metformin 500mg BD\nAshwagandha Churna with warm water before food",
      confidence: 0.9,
      kind: "prescription",
    });
    if (!result.valid_medical_document) throw new Error("expected a valid document");
    expect(result.patient_name).toBe("Ravi Kumar");
    expect(result.doctor_name).toBe("Anjali Mehta");
    expect(result.clinic_or_hospital).toMatch(/hospital/i);
    expect(result.date).toBe("2024-03-12");
    expect(result.prescribed_medicines.length).toBeGreaterThan(0);
    expect(result.ayush_formulations.length).toBeGreaterThan(0);
  });
});
