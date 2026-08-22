"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LoginPanel } from "@/components/LoginPanel";
import type { Role } from "@/lib/auth/access";

function LoginInner() {
  const params = useSearchParams();
  const role = params.get("role") as Role | null;
  const preset =
    role === "patient" || role === "practitioner" || role === "dietitian" || role === "admin"
      ? role
      : undefined;
  return (
    <main className="px-4 py-8 md:px-8">
      <p className="tl-overline">Station gate</p>
      <h1 className="mt-2 text-3xl">{preset ? `${preset} login` : "Login"}</h1>
      <p className="mt-2 mb-6 max-w-xl text-mist">
        Demo auth: Convex users table, hashed PIN, session in localStorage. Practitioner still approves
        every plan.
      </p>
      <LoginPanel presetRole={preset} />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="p-8 text-mist">Loading…</main>}>
      <LoginInner />
    </Suspense>
  );
}
