"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { SessionSnapshot } from "@/lib/auth/session";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { readSession, clearSession, SESSION_EVENT } from "@/lib/auth/session";

export function useAuraSession() {
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
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
  const remoteUser = useQuery(
    api.auth.getMe,
    session ? { sessionUserId: session.userId } : "skip"
  );

  useEffect(() => {
    if (session && remoteUser === null) {
      clearSession();
    }
  }, [session, remoteUser]);

  if (!session || remoteUser === null) {
    return (
      <main className="px-4 py-8 md:px-8">
        <p className="tl-overline">Auth</p>
        <h1 className="mt-2 text-2xl">{label}</h1>
        <p className="mt-3 text-body">
          You are not signed in. Open a login gate, then this station will load your live data.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/login/patient" className="btn-pulse px-4 py-2 text-sm">
            Patient login
          </Link>
          <Link href="/login/doctor" className="btn-ghost px-4 py-2 text-sm">
            Practitioner login
          </Link>
          <Link href="/login/admin" className="btn-ghost px-4 py-2 text-sm">
            Admin login
          </Link>
        </div>
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

