"use client";

import type { Role } from "@/lib/auth/access";
import {
  SESSION_EMAIL_KEY,
  SESSION_NAME_KEY,
  SESSION_PATIENT_KEY,
  SESSION_ROLE_KEY,
  SESSION_USER_KEY,
} from "@/lib/auth/access";

export type SessionSnapshot = {
  userId: string;
  role: Role;
  email: string;
  displayName: string;
  patientId: string | null;
};

export function readSession(): SessionSnapshot | null {
  if (typeof window === "undefined") return null;
  const userId = localStorage.getItem(SESSION_USER_KEY);
  const role = localStorage.getItem(SESSION_ROLE_KEY) as Role | null;
  const email = localStorage.getItem(SESSION_EMAIL_KEY);
  const displayName = localStorage.getItem(SESSION_NAME_KEY);
  if (!userId || !role || !email) return null;
  return {
    userId,
    role,
    email,
    displayName: displayName ?? email,
    patientId: localStorage.getItem(SESSION_PATIENT_KEY),
  };
}

export function writeSession(session: SessionSnapshot) {
  localStorage.setItem(SESSION_USER_KEY, session.userId);
  localStorage.setItem(SESSION_ROLE_KEY, session.role);
  localStorage.setItem(SESSION_EMAIL_KEY, session.email);
  localStorage.setItem(SESSION_NAME_KEY, session.displayName);
  if (session.patientId) localStorage.setItem(SESSION_PATIENT_KEY, session.patientId);
  else localStorage.removeItem(SESSION_PATIENT_KEY);
}

export function clearSession() {
  localStorage.removeItem(SESSION_USER_KEY);
  localStorage.removeItem(SESSION_ROLE_KEY);
  localStorage.removeItem(SESSION_EMAIL_KEY);
  localStorage.removeItem(SESSION_NAME_KEY);
  localStorage.removeItem(SESSION_PATIENT_KEY);
}
