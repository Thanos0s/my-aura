"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { SessionSnapshot } from "@/lib/auth/session";
import { readSession } from "@/lib/auth/session";

export function useAuraSession() {
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    window.addEventListener("aura-session", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("aura-session", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return session;
}

export function RoleGate({
  allow,
  children,
  label,
}: {
  allow: SessionSnapshot["role"][];
  children: ReactNode;
  label: string;
}) {
  const session = useAuraSession();
  if (!session) {
    return (
      <main className="px-4 py-8 md:px-8">
        <p className="tl-overline">Auth</p>
        <h1 className="mt-2 text-2xl">{label}</h1>
        <p className="mt-3 text-body">
          Sign in from the home page. Demo PIN is <code>1234</code> after seeding accounts.
        </p>
      </main>
    );
  }
  if (!allow.includes(session.role)) {
    return (
      <main className="px-4 py-8 md:px-8">
        <p className="tl-overline">Unauthorized</p>
        <h1 className="mt-2 text-2xl">{label}</h1>
        <p className="mt-3 text-mist">This station is for {allow.join(" / ")}.</p>
      </main>
    );
  }
  return <>{children}</>;
}
