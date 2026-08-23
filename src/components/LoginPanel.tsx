"use client";

import { useState } from "react";
import { useConvexAuth, useMutation } from "convex/react";
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
    hint: "Email and password. New patients can register. After sign-in you enter the patient portal.",
  },
  admin: {
    title: "Admin login",
    hint: "Operations station. PIN login after seeding demo users. No public registration.",
  },
  staff: {
    title: "Clinic staff login",
    hint: "Practitioner or dietitian. After sign-in you enter the matching console.",
  },
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label}. Start Convex with npx convex dev and keep that terminal running.`));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

export function LoginPanel({
  station,
  staffSignupRole = "choose",
}: {
  station: LoginStation;
  staffSignupRole?: "practitioner" | "dietitian" | "choose";
}) {
  const router = useRouter();
  const { isAuthenticated: convexAuthed } = useConvexAuth();
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
  const [busy, setBusy] = useState(false);
  const [usePin, setUsePin] = useState(!firebaseOn);

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
    writeSession({
      userId: user._id,
      role: user.role,
      email: user.email,
      displayName: user.displayName,
      patientId: user.patientId ?? null,
    });
    const dest = HOME_FOR[user.role];

    if (!roleAllowedAtStation(user.role, station)) {
      setNotice(
        `Logged in as ${user.displayName} (${user.role}). Redirecting to ${dest}…`
      );
      window.setTimeout(() => {
        router.replace(dest);
        window.setTimeout(() => {
          if (window.location.pathname !== dest) {
            window.location.assign(dest);
          }
        }, 200);
      }, 400);
      return;
    }

    router.replace(dest);
    window.setTimeout(() => {
      if (window.location.pathname !== dest) {
        window.location.assign(dest);
      }
    }, 200);
  }

  async function syncFirebaseUser() {
    const intendedRole = station === "patient" ? ("patient" as const) : staffRole;
    let lastError: unknown;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        return await withTimeout(
          ensureFromFirebase({
            intendedRole,
            displayName: name,
          }),
          12000,
          "Convex did not respond"
        );
      } catch (error) {
        lastError = error;
        const message = errorText(error);
        if (!/not authenticated|unauthenticated|Unauthorized/i.test(message)) {
          throw error;
        }
        await sleep(300);
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(
          "Convex could not verify Firebase. Confirm convex/firebaseAuth.ts matches your Firebase project id and restart npx convex dev."
        );
  }

  async function onFirebaseSubmit() {
    if (secret.length < 6) {
      setNotice("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setNotice("Signing in…");
    try {
      const auth = getFirebaseAuth();
      if (mode === "register" && canRegister) {
        await createUserWithEmailAndPassword(auth, email.trim(), secret);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), secret);
      }
      const user = await syncFirebaseUser();
      commitSession(user);
    } catch (e) {
      clearSession();
      setNotice(firebaseAuthMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onPinSubmit() {
    if (secret.length < 4) {
      setNotice("PIN must be at least 4 characters.");
      return;
    }
    setBusy(true);
    setNotice("Signing in…");
    try {
      const user =
        mode === "register" && station === "patient"
          ? await withTimeout(
              register({ email, pin: secret, displayName: name }),
              12000,
              "Convex did not respond"
            )
          : await withTimeout(login({ email, pin: secret }), 12000, "Convex did not respond");
      commitSession(user);
    } catch (e) {
      clearSession();
      const msg = e instanceof Error ? e.message : "Login failed";
      if (msg.includes("Invalid email or PIN")) {
        setNotice("Invalid email or PIN. If this is a fresh setup, click 'Seed demo users' below (PIN: 1234).");
      } else {
        setNotice(msg);
      }
    } finally {
      setBusy(false);
    }
  }


  const showRegister = canRegister && mode === "register";
  const firebaseMode = firebaseOn && !usePin;

  return (
    <form
      className="tl-card max-w-lg space-y-3 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void (firebaseMode ? onFirebaseSubmit() : onPinSubmit());
      }}
    >
      <p className="tl-overline">Station gate</p>
      <h2 className="text-xl text-display">{copy.title}</h2>
      <p className="text-sm text-mist">{copy.hint}</p>
      {firebaseOn ? (
        <p className="font-mono text-[11px] text-ash">
          {convexAuthed ? "Firebase session linked to Convex." : "Firebase Auth · email / password"}
        </p>
      ) : station !== "admin" ? (
        <p className="font-mono text-[11px] text-warning">
          Firebase env vars missing. Using hashed PIN until NEXT_PUBLIC_FIREBASE_* is set.
        </p>
      ) : null}
      {canRegister ? (
        <div className="flex gap-2">
          <button
            type="button"
            className={mode === "login" ? "btn-pulse px-3 py-1 text-sm" : "btn-ghost px-3 py-1 text-sm"}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "register" ? "btn-pulse px-3 py-1 text-sm" : "btn-ghost px-3 py-1 text-sm"}
            onClick={() => setMode("register")}
          >
            {station === "patient" ? "Register (patient)" : "Register (clinic)"}
          </button>
        </div>
      ) : null}
      {firebaseOn ? (
        <div className="flex gap-2">
          <button
            type="button"
            className={!usePin ? "btn-pulse px-3 py-1 text-sm" : "btn-ghost px-3 py-1 text-sm"}
            onClick={() => {
              setUsePin(false);
              setSecret("");
            }}
          >
            Firebase
          </button>
          <button
            type="button"
            className={usePin ? "btn-pulse px-3 py-1 text-sm" : "btn-ghost px-3 py-1 text-sm"}
            onClick={() => {
              setUsePin(true);
              setSecret("1234");
            }}
          >
            Demo PIN
          </button>
        </div>
      ) : null}
      <label className="block">
        <span className="tl-overline">Email</span>
        <input
          className="tl-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
      </label>
      <label className="block">
        <span className="tl-overline">{firebaseMode ? "Password" : "PIN (hashed at rest)"}</span>
        <input
          className="tl-input"
          type={firebaseMode ? "password" : "text"}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          autoComplete={firebaseMode ? "current-password" : "off"}
          required
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
      <button className="btn-pulse px-5 py-2" type="submit" disabled={busy}>
        {busy
          ? "Working…"
          : showRegister
            ? station === "patient"
              ? "Create patient account"
              : "Create clinic account"
            : "Enter station"}
      </button>
      <button
        className="btn-ghost px-4 py-2 text-sm"
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const rows = await withTimeout(seed({}), 12000, "Convex did not respond");
            setNotice(`Seeded ${rows.length} demo users. PIN 1234. Use Demo PIN if Firebase is not ready.`);
          } catch (e) {
            setNotice(e instanceof Error ? e.message : "Seed failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        Seed demo users
      </button>
      <ul className="font-mono text-[11px] text-ash">
        {allowed.map((u) => (
          <li key={u.email}>
            {u.role} · {u.email} · PIN {u.pin}
          </li>
        ))}
      </ul>
    </form>
  );
}
