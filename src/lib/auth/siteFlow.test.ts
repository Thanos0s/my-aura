import { describe, expect, it } from "vitest";
import { isPublicPath, roleAllowedAtStation } from "@/lib/auth/siteFlow";

describe("site flow", () => {
  it("treats landing and login as public, consoles as private", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/login/patient")).toBe(true);
    expect(isPublicPath("/login/doctor")).toBe(true);
    expect(isPublicPath("/login/admin")).toBe(true);
    expect(isPublicPath("/patient")).toBe(false);
    expect(isPublicPath("/kiosk")).toBe(false);
    expect(isPublicPath("/admin")).toBe(false);
  });

  it("keeps patient and admin logins on separate stations", () => {
    expect(roleAllowedAtStation("patient", "patient")).toBe(true);
    expect(roleAllowedAtStation("admin", "patient")).toBe(false);
    expect(roleAllowedAtStation("admin", "admin")).toBe(true);
    expect(roleAllowedAtStation("patient", "admin")).toBe(false);
    expect(roleAllowedAtStation("practitioner", "staff")).toBe(true);
    expect(roleAllowedAtStation("dietitian", "staff")).toBe(true);
    expect(roleAllowedAtStation("admin", "staff")).toBe(false);
  });
});
