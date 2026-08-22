import type { Role } from "@/lib/auth/access";

export type LoginStation = "patient" | "admin" | "staff";

export const HOME_FOR: Record<Role, string> = {
  patient: "/patient",
  practitioner: "/practitioner",
  dietitian: "/dietitian",
  admin: "/admin",
};

export const STATION_ROLES: Record<LoginStation, readonly Role[]> = {
  patient: ["patient"],
  admin: ["admin"],
  staff: ["practitioner", "dietitian"],
};

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  return false;
}

export function roleAllowedAtStation(role: Role, station: LoginStation): boolean {
  return STATION_ROLES[station].includes(role);
}
