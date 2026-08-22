"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { convexConfigured } from "@/app/providers";
import { DEMO_USERS, type Role } from "@/lib/auth/access";
import { clearSession, writeSession } from "@/lib/auth/session";
import {
  HOME_FOR,
  roleAllowedAtStation,
  type LoginStation,
} from "@/lib/auth/siteFlow";
import {
  firebaseAuthMessage,
  getFirebaseAuth,
  isFirebaseConfigured,
} from "@/lib/firebase/client";

const STATION_COPY: Record<LoginStation, { title: string; hint: string }> = {
  patient: {
    title: "Patient login",
    hint: "Firebase email and password. New patients can register. You land on your portal for case taking, symptoms, and plans.",
  },
  admin: {
    title: "Admin login",
    hint: "Operations station. Users, knowledge base, documents, audit, analytics. PIN login. No public registration.",
  },
  staff: {
    title: "Clinic staff login",
    hint: "Firebase email and password for practitioners and dietitians. Practitioner approves every plan.",
  },
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function LoginPanel({
  station,
  staffSignupRole = "choose",
}: {
  station: LoginStation;
  staffSignupRole?: "practitioner" | "dietitian" | "choose";
}) {
  const router = useRouter();
  const login = useMutation(api.auth.login);
  const register = useMutation(api.auth.register);
  const ensureFromFirebase = useMutation(api.auth.ensureFromFirebase);
  const seed = useMutation(api.auth.seedDemoUsers);
  const copy = STATION_COPY[station];
  const firebaseOn = isFirebaseConfigured() && station !== "admin";
  const canRegister = station === "patient" || (firebaseOn && station === "staff");
  const allowed = DEMO_USERS.filter((u) => roleAllowedAtStation(u.role, station));
  const defaultEmail = allowed[0]?.email ?? "patient@aura.local";
  const [email, setEmail] = useState(defaultEmail);
  const [secret, setSecret] = useState(firebaseOn ? "" : "1234");
  const [name, setName] = useState(station === "staff" ? "New practitioner" : "New patient");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [staffRole, setStaffRole] = useState<"practitioner" | "dietitian">(
    staffSignupRole === "dietitian" ? "dietitian" : "practitioner"
  );
  const [notice, setNotice] = useState("");

  if (!convexConfigured()) {
    return <p className="text-mist">Connect Convex to enable login.</p>;
  }

  function commitSession(user: {
    _id: string;
    role: Role;
    email: string;
    displayName: string;
    patientId?: string | null;
  }) {
    if (!roleAllowedAtStation(user.role, station)) {
      throw new Error(
        "This gate is for this station only. Use Patient, Practitioner, Clinic staff, or Admin login."
      );
    }
    writeSession({
      userId: user._id,
      role: user.role,
      email: user.email,
      displayName: user.displayName,
      patientId: user.patientId ?? null,
    });
    window.dispatchEvent(new Event("aura-session"));
    router.push(HOME_FOR[user.role]);
  }

  async function syncFirebaseUser() {
    const intendedRole =
      station === "patient" ? ("patient" as const) : staffRole;
    let lastError: unknown;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      try {
        return await ensureFromFirebase({
          intendedRole,
          displayName: name,
        });
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : "";
        if (!message.includes("Not authenticated")) throw error;
        await sleep(250);
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(
          "Convex could not verify Firebase. Set FIREBASE_AUTH_PROJECT_ID in convex/firebaseAuth.ts to your Firebase project id."
        );
  }

  async function onFirebaseLogin() {
    setNotice("");
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), secret);
      const user = await syncFirebaseUser();
      commitSession(user);
    } catch (e) {
      clearSession();
      window.dispatchEvent(new Event("aura-session"));
      setNotice(firebaseAuthMessage(e));
    }
  }

  async function onFirebaseRegister() {
    setNotice("");
    try {
      await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), secret);
      const user = await syncFirebaseUser();
      commitSession(user);
    } catch (e) {
      setNotice(firebaseAuthMessage(e));
    }
  }

  async function onPinLogin() {
    setNotice("");
    try {
      const user = await login({ email, pin: secret });
      commitSession(user);
    } catch (e) {
      clearSession();
      window.dispatchEvent(new Event("aura-session"));
      setNotice(e instanceof Error ? e.message : "Login failed");
    }
  }

  async function onPinRegister() {
    setNotice("");
    try {
      const user = await register({ email, pin: secret, displayName: name });
      commitSession(user);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Register failed");
    }
  }

  const showRegister = canRegister && mode === "register";

  return (
    <div className="tl-card max-w-lg space-y-3 p-5">
      <p className="tl-overline">Station gate</p>
      <h2 className="text-xl text-display">{copy.title}</h2>
      <p className="text-sm text-mist">{copy.hint}</p>
      {firebaseOn ? (
        <p className="font-mono text-[11px] text-ash">Firebase Auth · email / password</p>
      ) : station !== "admin" ? (
        <p className="font-mono text-[11px] text-warning">
          Firebase env vars missing. Using hashed PIN until NEXT_PUBLIC_FIREBASE_* is set.
        </p>
      ) : null}
      {canRegister ? (
        <div className="flex gap-2">
          <button
            className={mode === "login" ? "btn-pulse px-3 py-1 text-sm" : "btn-ghost px-3 py-1 text-sm"}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={mode === "register" ? "btn-pulse px-3 py-1 text-sm" : "btn-ghost px-3 py-1 text-sm"}
            onClick={() => setMode("register")}
          >
            {station === "patient" ? "Register (patient)" : "Register (clinic)"}
          </button>
        </div>
      ) : null}
      <label className="block">
        <span className="tl-overline">Email</span>
        <input className="tl-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
      </label>
      <label className="block">
        <span className="tl-overline">{firebaseOn ? "Password" : "PIN (hashed at rest)"}</span>
        <input
          className="tl-input"
          type={firebaseOn ? "password" : "text"}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          autoComplete={firebaseOn ? "current-password" : "off"}
        />
      </label>
      {showRegister ? (
        <label className="block">
          <span className="tl-overline">Display name</span>
          <input className="tl-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      ) : null}
      {showRegister && station === "staff" && staffSignupRole === "choose" ? (
        <label className="block">
          <span className="tl-overline">Clinic role</span>
          <select
            className="tl-input"
            value={staffRole}
            onChange={(e) => setStaffRole(e.target.value as "practitioner" | "dietitian")}
          >
            <option value="practitioner">Practitioner</option>
            <option value="dietitian">Dietitian</option>
          </select>
        </label>
      ) : null}
      {notice ? <p className="font-mono text-sm text-warning">{notice}</p> : null}
      <button
        className="btn-pulse px-5 py-2"
        onClick={() => {
          if (firebaseOn) {
            void (showRegister ? onFirebaseRegister() : onFirebaseLogin());
            return;
          }
          void (showRegister && station === "patient" ? onPinRegister() : onPinLogin());
        }}
      >
        {showRegister
          ? station === "patient"
            ? "Create patient account"
            : "Create clinic account"
          : "Enter station"}
      </button>
      <button
        className="btn-ghost px-4 py-2 text-sm"
        onClick={async () => {
          const rows = await seed({});
          setNotice(`Seeded ${rows.length} demo users. PIN 1234 (admin / fallback).`);
        }}
      >
        Seed demo users
      </button>
      {!firebaseOn ? (
        <ul className="font-mono text-[11px] text-ash">
          {allowed.map((u) => (
            <li key={u.email}>
              {u.role} · {u.email} · PIN {u.pin}
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-mono text-[11px] text-ash">
          Create the same emails in Firebase Authentication, or register here. Set FIREBASE_AUTH_PROJECT_ID
          in convex/firebaseAuth.ts to match your Firebase project.
        </p>
      )}
    </div>
  );
}
