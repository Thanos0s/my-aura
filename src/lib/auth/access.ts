export type Role = "patient" | "practitioner" | "dietitian" | "admin";

export type DemoUserSpec = {
  email: string;
  pin: string;
  role: Role;
  displayName: string;
};

export const DEMO_PIN = "1234";

export const DEMO_USERS: DemoUserSpec[] = [
  { email: "patient@aura.local", pin: DEMO_PIN, role: "patient", displayName: "Demo Patient" },
  {
    email: "practitioner@aura.local",
    pin: DEMO_PIN,
    role: "practitioner",
    displayName: "Demo Practitioner",
  },
  { email: "dietitian@aura.local", pin: DEMO_PIN, role: "dietitian", displayName: "Demo Dietitian" },
  { email: "admin@aura.local", pin: DEMO_PIN, role: "admin", displayName: "Demo Admin" },
];

export const SESSION_USER_KEY = "aura.sessionUserId";
export const SESSION_ROLE_KEY = "aura.sessionRole";
export const SESSION_EMAIL_KEY = "aura.sessionEmail";
export const SESSION_PATIENT_KEY = "aura.sessionPatientId";
export const SESSION_NAME_KEY = "aura.sessionDisplayName";

export function canCommitDiagnosis(role: Role): boolean {
  return role === "practitioner";
}

export function canApproveCarePlan(role: Role): boolean {
  return role === "practitioner";
}

export function canReferToDietitian(role: Role): boolean {
  return role === "practitioner";
}

export function canCreateDietPlan(args: { role: Role; hasReferral: boolean }): boolean {
  return args.role === "dietitian" && args.hasReferral;
}

export function canManageKnowledgeBase(role: Role): boolean {
  return role === "admin";
}

export function dietitianMayViewCase(args: {
  role: Role;
  hasReferral: boolean;
  summaryApproved: boolean;
}): boolean {
  return args.role === "dietitian" && args.hasReferral && args.summaryApproved;
}

export function patientMayViewCarePlan(args: {
  role: Role;
  ownerPatientId: string;
  viewerPatientId: string;
  status: "draft" | "approved";
}): boolean {
  if (args.role !== "patient") return false;
  if (args.ownerPatientId !== args.viewerPatientId) return false;
  return args.status === "approved";
}

export function patientMayViewDietPlan(args: {
  role: Role;
  ownerPatientId: string;
  viewerPatientId: string;
  practitionerApproved: boolean;
  shareable: boolean;
}): boolean {
  if (args.role !== "patient") return false;
  if (args.ownerPatientId !== args.viewerPatientId) return false;
  return args.practitionerApproved || args.shareable;
}

export function requireRole<T extends Role>(actual: Role, allowed: readonly T[]): T {
  if (!allowed.includes(actual as T)) {
    throw new Error("Unauthorized: role not permitted");
  }
  return actual as T;
}

export type NavItem = { href: string; label: string; hint: string };

export function navForRole(role: Role | null): NavItem[] {
  if (!role) return [];
  if (role === "patient") {
    return [
      { href: "/patient", label: "Portal", hint: "Home" },
      { href: "/kiosk", label: "Intake", hint: "Case taking" },
    ];
  }
  if (role === "practitioner") {
    return [
      { href: "/practitioner", label: "Clinic", hint: "Queue" },
      { href: "/staff", label: "Alerts", hint: "Red flags" },
    ];
  }
  if (role === "dietitian") {
    return [{ href: "/dietitian", label: "Ahara", hint: "Referrals" }];
  }
  return [
    { href: "/admin", label: "Cadence", hint: "Operations" },
    { href: "/staff", label: "Alerts", hint: "Red flags" },
  ];
}

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`aura-pin:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
