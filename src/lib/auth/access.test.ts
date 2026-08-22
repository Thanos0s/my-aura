import { describe, expect, it } from "vitest";
import {
  DEMO_USERS,
  canApproveCarePlan,
  canCommitDiagnosis,
  canCreateDietPlan,
  canManageKnowledgeBase,
  canReferToDietitian,
  dietitianMayViewCase,
  hashPin,
  navForRole,
  patientMayViewCarePlan,
  patientMayViewDietPlan,
  requireRole,
  type Role,
} from "@/lib/auth/access";

describe("clinical authority", () => {
  it("never lets AI or non-practitioners auto-commit diagnosis or treatment", () => {
    expect(canCommitDiagnosis("patient")).toBe(false);
    expect(canCommitDiagnosis("dietitian")).toBe(false);
    expect(canCommitDiagnosis("admin")).toBe(false);
    expect(canCommitDiagnosis("practitioner")).toBe(true);
    expect(canApproveCarePlan("practitioner")).toBe(true);
    expect(canApproveCarePlan("dietitian")).toBe(false);
  });
});

describe("dietitian visibility", () => {
  it("requires an open referral and hides unapproved AI", () => {
    expect(
      dietitianMayViewCase({
        role: "dietitian",
        hasReferral: false,
        summaryApproved: true,
      })
    ).toBe(false);
    expect(
      dietitianMayViewCase({
        role: "dietitian",
        hasReferral: true,
        summaryApproved: false,
      })
    ).toBe(false);
    expect(
      dietitianMayViewCase({
        role: "dietitian",
        hasReferral: true,
        summaryApproved: true,
      })
    ).toBe(true);
  });

  it("lets dietitian create diet plans only for referred patients", () => {
    expect(canCreateDietPlan({ role: "dietitian", hasReferral: true })).toBe(true);
    expect(canCreateDietPlan({ role: "dietitian", hasReferral: false })).toBe(false);
    expect(canCreateDietPlan({ role: "practitioner", hasReferral: false })).toBe(false);
  });
});

describe("patient portal visibility", () => {
  it("shows care plans only after practitioner approval", () => {
    expect(
      patientMayViewCarePlan({
        role: "patient",
        ownerPatientId: "p1",
        viewerPatientId: "p1",
        status: "draft",
      })
    ).toBe(false);
    expect(
      patientMayViewCarePlan({
        role: "patient",
        ownerPatientId: "p1",
        viewerPatientId: "p1",
        status: "approved",
      })
    ).toBe(true);
    expect(
      patientMayViewCarePlan({
        role: "patient",
        ownerPatientId: "p1",
        viewerPatientId: "p2",
        status: "approved",
      })
    ).toBe(false);
  });

  it("shows diet plans only if shareable or practitioner-approved", () => {
    expect(
      patientMayViewDietPlan({
        role: "patient",
        ownerPatientId: "p1",
        viewerPatientId: "p1",
        practitionerApproved: false,
        shareable: false,
      })
    ).toBe(false);
    expect(
      patientMayViewDietPlan({
        role: "patient",
        ownerPatientId: "p1",
        viewerPatientId: "p1",
        practitionerApproved: true,
        shareable: false,
      })
    ).toBe(true);
    expect(
      patientMayViewDietPlan({
        role: "patient",
        ownerPatientId: "p1",
        viewerPatientId: "p1",
        practitionerApproved: false,
        shareable: true,
      })
    ).toBe(true);
  });
});

describe("admin and referrals", () => {
  it("only practitioners can refer to a dietitian", () => {
    expect(canReferToDietitian("practitioner")).toBe(true);
    expect(canReferToDietitian("admin")).toBe(false);
    expect(canReferToDietitian("dietitian")).toBe(false);
  });

  it("only admin can CRUD knowledge base articles", () => {
    expect(canManageKnowledgeBase("admin")).toBe(true);
    expect(canManageKnowledgeBase("practitioner")).toBe(false);
  });
});

describe("requireRole", () => {
  it("throws when the session role is not allowed", () => {
    expect(() => requireRole("patient", ["practitioner"])).toThrow(/Unauthorized/);
    expect(requireRole("admin", ["admin", "practitioner"])).toBe("admin");
  });
});

describe("demo seed catalog", () => {
  it("documents one account per role with PIN 1234", () => {
    const roles = DEMO_USERS.map((u) => u.role).sort();
    expect(roles).toEqual(["admin", "dietitian", "patient", "practitioner"]);
    expect(DEMO_USERS.every((u) => u.pin === "1234")).toBe(true);
    expect(DEMO_USERS.map((u) => u.email)).toEqual([
      "patient@aura.local",
      "practitioner@aura.local",
      "dietitian@aura.local",
      "admin@aura.local",
    ]);
  });
});

describe("hashPin", () => {
  it("hashes the PIN so it is not stored in plaintext", async () => {
    const a = await hashPin("1234");
    const b = await hashPin("1234");
    expect(a).toBe(b);
    expect(a).not.toBe("1234");
    expect(a.length).toBe(64);
    expect(await hashPin("9999")).not.toBe(a);
  });
});

describe("console nav", () => {
  it("scopes shell links to the signed-in role", () => {
    const patient = navForRole("patient").map((n) => n.href);
    expect(patient).toContain("/patient");
    expect(patient).not.toContain("/admin");
    expect(patient).not.toContain("/practitioner");

    const pract = navForRole("practitioner").map((n) => n.href);
    expect(pract).toContain("/practitioner");
    expect(pract).toContain("/staff");

    const diet = navForRole("dietitian").map((n) => n.href);
    expect(diet).toContain("/dietitian");
    expect(diet).not.toContain("/practitioner");

    const admin = navForRole("admin" as Role).map((n) => n.href);
    expect(admin).toContain("/admin");
  });
});
