"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { convexConfigured } from "@/app/providers";
import { DEMO_USERS, type Role } from "@/lib/auth/access";
import { writeSession } from "@/lib/auth/session";

const HOME_FOR: Record<Role, string> = {
  patient: "/patient",
  practitioner: "/practitioner",
  dietitian: "/dietitian",
  admin: "/admin",
};

export function LoginPanel({ presetRole }: { presetRole?: Role }) {
  const router = useRouter();
  const login = useMutation(api.auth.login);
  const register = useMutation(api.auth.register);
  const seed = useMutation(api.auth.seedDemoUsers);
  const [email, setEmail] = useState(
    presetRole ? `${presetRole}@aura.local` : "patient@aura.local"
  );
  const [pin, setPin] = useState("1234");
  const [name, setName] = useState("New patient");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [notice, setNotice] = useState("");

  if (!convexConfigured()) {
    return <p className="text-mist">Connect Convex to enable login.</p>;
  }

  async function onLogin() {
    setNotice("");
    try {
      const user = await login({ email, pin });
      writeSession({
        userId: user._id,
        role: user.role,
        email: user.email,
        displayName: user.displayName,
        patientId: user.patientId ?? null,
      });
      window.dispatchEvent(new Event("aura-session"));
      router.push(HOME_FOR[user.role]);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Login failed");
    }
  }

  async function onRegister() {
    setNotice("");
    try {
      const user = await register({ email, pin, displayName: name });
      writeSession({
        userId: user._id,
        role: user.role,
        email: user.email,
        displayName: user.displayName,
        patientId: user.patientId ?? null,
      });
      window.dispatchEvent(new Event("aura-session"));
      router.push("/patient");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Register failed");
    }
  }

  return (
    <div className="tl-card max-w-lg space-y-3 p-5">
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
          Register (patient)
        </button>
      </div>
      <label className="block">
        <span className="tl-overline">Email</span>
        <input className="tl-input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block">
        <span className="tl-overline">PIN (hashed at rest)</span>
        <input className="tl-input" value={pin} onChange={(e) => setPin(e.target.value)} />
      </label>
      {mode === "register" ? (
        <label className="block">
          <span className="tl-overline">Display name</span>
          <input className="tl-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      ) : null}
      {notice ? <p className="font-mono text-sm text-warning">{notice}</p> : null}
      <button className="btn-pulse px-5 py-2" onClick={() => void (mode === "login" ? onLogin() : onRegister())}>
        {mode === "login" ? "Enter station" : "Create patient account"}
      </button>
      <button
        className="btn-ghost px-4 py-2 text-sm"
        onClick={async () => {
          const rows = await seed({});
          setNotice(`Seeded ${rows.length} demo users. PIN 1234.`);
        }}
      >
        Seed demo users
      </button>
      <ul className="font-mono text-[11px] text-ash">
        {DEMO_USERS.map((u) => (
          <li key={u.email}>
            {u.role} · {u.email} · PIN {u.pin}
          </li>
        ))}
      </ul>
    </div>
  );
}
