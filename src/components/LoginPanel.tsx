"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConvexAuth, useMutation } from "convex/react";
import { Check, Sparkles } from "lucide-react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { convexConfigured } from "@/app/providers";
import { DEMO_USERS, type Role } from "@/lib/auth/access";
import { clearSession, writeSession } from "@/lib/auth/session";
import { useAuraSession } from "@/components/useAuraSession";
import {
  HOME_FOR,
  roleAllowedAtStation,
  type LoginStation,
} from "@/lib/auth/siteFlow";
import {
  firebaseAuthMessage,
  getFirebaseAuth,
  isFirebaseConfigured,
  signOutFirebase,
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
  const session = useAuraSession();
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
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [staffRole, setStaffRole] = useState<"practitioner" | "dietitian">(
    staffSignupRole === "dietitian" ? "dietitian" : "practitioner"
  );

  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [usePin, setUsePin] = useState(!firebaseOn);

  // If already logged in, only auto-redirect if the session matches the station's allowed role!
  useEffect(() => {
    if (session?.userId && session?.role) {
      if (roleAllowedAtStation(session.role, station)) {
        const dest = HOME_FOR[session.role];
        const timer = setTimeout(() => {
          router.replace(dest);
        }, 150);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [session, station, router]);




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

  async function syncFirebaseUser(fbUser?: { email?: string | null; uid?: string }) {
    const intendedRole = station === "patient" ? ("patient" as const) : staffRole;
    let lastError: unknown;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        return await withTimeout(
          ensureFromFirebase({
            intendedRole,
            displayName: name,
            email: fbUser?.email ?? email.trim(),
            firebaseUid: fbUser?.uid,
          }),
          8000,
          "Convex backend did not respond in time"
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
          "Could not link Firebase user with Convex backend."
        );
  }

  async function onFirebaseSubmit() {
    if (mode === "register" && canRegister && !name.trim()) {
      setNotice("Please enter your full name to register.");
      return;
    }
    if (secret.length < 6) {
      setNotice("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setNotice("Signing in…");
    try {
      const auth = getFirebaseAuth();
      let credential;
      if (mode === "register" && canRegister) {
        credential = await createUserWithEmailAndPassword(auth, email.trim(), secret);
      } else {
        credential = await signInWithEmailAndPassword(auth, email.trim(), secret);
      }
      const user = await syncFirebaseUser(credential.user);
      commitSession(user);
    } catch (e) {
      clearSession();
      setNotice(firebaseAuthMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onPinSubmit() {
    if (mode === "register" && station === "patient" && !name.trim()) {
      setNotice("Please enter your full name to register.");
      return;
    }
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

  if (session?.userId && session?.role) {
    const dest = HOME_FOR[session.role];
    const isMatchingStation = roleAllowedAtStation(session.role, station);

    if (isMatchingStation) {
      return (
        <div className="rounded-3xl bg-white p-7 md:p-8 shadow-md border border-slate-100/90 max-w-lg mx-auto space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1b343f] to-[#366375] text-white shadow-sm font-bold text-xl">
            <Check className="h-7 w-7" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase font-bold text-slate-400">Active Session</p>
            <h2 className="text-xl font-bold text-slate-900 mt-1">Already Logged In</h2>
            <p className="text-xs text-slate-500 mt-1">
              You are signed in as <strong className="text-slate-800">{session.displayName}</strong> ({session.role}).
            </p>
            <p className="font-mono text-[11px] text-sky-700 mt-1">
              Redirecting to your dashboard…
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link href={dest} className="btn-pulse py-2.5 text-xs font-bold w-full text-center">
              Go to {session.role.charAt(0).toUpperCase() + session.role.slice(1)} Dashboard →
            </Link>
            <button
              type="button"
              className="btn-ghost py-2 text-xs font-semibold w-full"
              onClick={() => {
                void signOutFirebase();
                clearSession();
                router.refresh();
              }}
            >
              Sign out & switch account
            </button>
          </div>
        </div>
      );
    }

    // Active session is for a different role (e.g. practitioner while visiting /login/patient)
    return (
      <div className="rounded-3xl bg-white p-7 md:p-8 shadow-md border border-amber-200/90 max-w-lg mx-auto space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 shadow-sm font-bold text-xl">
          !
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase font-bold text-amber-800">Different Role Active</p>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Switch to {copy.title}</h2>
          <p className="text-xs text-slate-600 mt-1">
            You are currently signed in as <strong className="text-slate-800">{session.displayName}</strong> (<span className="font-semibold text-amber-900">{session.role}</span>).
          </p>
          <p className="text-xs text-slate-500 mt-1">
            To sign into the <strong className="text-slate-700">{copy.title}</strong>, please sign out of your {session.role} session.
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-2">
          <button
            type="button"
            className="btn-pulse py-2.5 text-xs font-bold w-full"
            onClick={() => {
              void signOutFirebase();
              clearSession();
              router.refresh();
            }}
          >
            Sign out & Enter {copy.title} →
          </button>
          <Link href={dest} className="btn-ghost py-2 text-xs font-semibold w-full text-center">
            Return to {session.role.charAt(0).toUpperCase() + session.role.slice(1)} Dashboard
          </Link>
        </div>
      </div>
    );
  }


  return (
    <form
      className="rounded-3xl bg-white p-7 md:p-8 shadow-md border border-slate-100/90 max-w-lg mx-auto space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void (firebaseMode ? onFirebaseSubmit() : onPinSubmit());
      }}
    >
      <div className="border-b border-slate-100 pb-3">
        <p className="font-mono text-[10px] uppercase font-bold text-slate-400">Security Gate</p>
        <h2 className="text-2xl font-bold text-slate-900 mt-0.5">{copy.title}</h2>
        <p className="text-xs text-slate-500 mt-1">{copy.hint}</p>
      </div>

      {firebaseOn ? (
        <p className="font-mono text-[11px] text-slate-500">
          {convexAuthed ? "Firebase session linked to Convex." : "Firebase Auth · email / password"}
        </p>
      ) : station !== "admin" ? (
        <p className="font-mono text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">
          Firebase env vars missing. Using hashed PIN until NEXT_PUBLIC_FIREBASE_* is set.
        </p>
      ) : null}

      {canRegister ? (
        <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === "login" ? "bg-[#1b343f] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === "register" ? "bg-[#1b343f] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
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
            className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
              !usePin ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            onClick={() => {
              setUsePin(false);
              setSecret("");
            }}
          >
            Firebase Auth
          </button>
          <button
            type="button"
            className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
              usePin ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
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
        <span className="text-xs font-semibold text-slate-700">Email Address</span>
        <input
          className="tl-input mt-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-slate-700">{firebaseMode ? "Password" : "PIN (hashed at rest)"}</span>
        <input
          className="tl-input mt-1"
          type={firebaseMode ? "password" : "text"}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          autoComplete={firebaseMode ? "current-password" : "off"}
          required
        />
      </label>

      {showRegister ? (
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">
            {station === "staff"
              ? "Your Full Name (e.g. Dr. Rajesh Sharma, MD)"
              : "Your Full Name (e.g. Rajesh Kumar)"}
          </span>
          <input
            className="tl-input mt-1"
            placeholder={
              station === "staff" ? "Dr. Full Name / Title" : "Patient Full Name"
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
      ) : null}


      {showRegister && station === "staff" && staffSignupRole === "choose" ? (
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Clinic Role</span>
          <select
            className="tl-input mt-1"
            value={staffRole}
            onChange={(e) => setStaffRole(e.target.value as "practitioner" | "dietitian")}
          >
            <option value="practitioner">Practitioner</option>
            <option value="dietitian">Dietitian</option>
          </select>
        </label>
      ) : null}

      {notice ? (
        <p className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-mono text-amber-900">
          {notice}
        </p>
      ) : null}

      <div className="pt-2 flex flex-col gap-2">
        <button className="btn-pulse py-2.5 text-xs font-bold w-full" type="submit" disabled={busy}>
          {busy
            ? "Working…"
            : showRegister
              ? station === "patient"
                ? "Create Patient Account"
                : "Create Clinic Account"
              : "Enter Station →"}
        </button>

        <button
          className="btn-ghost py-2 text-xs font-semibold w-full"
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
          <span className="flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Seed Demo Users (PIN: 1234)
          </span>
        </button>
      </div>

      <div className="pt-2 border-t border-slate-100">
        <p className="font-mono text-[10px] uppercase font-bold text-slate-400 mb-1">Available Demo Accounts</p>
        <ul className="font-mono text-[11px] text-slate-500 space-y-0.5">
          {allowed.map((u) => (
            <li key={u.email}>
              <span className="font-semibold text-slate-800">{u.role}:</span> {u.email} · PIN {u.pin}
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}

