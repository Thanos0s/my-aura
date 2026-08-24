"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuraSession } from "@/components/useAuraSession";
import { HOME_FOR } from "@/lib/auth/siteFlow";
import { clearSession } from "@/lib/auth/session";
import { signOutFirebase } from "@/lib/firebase/client";

const GATES = [
  {
    href: "/login/patient",
    overline: "Public",
    title: "Patient",
    copy: "Firebase sign-in or register. Then complete intake, log symptoms, upload reports, and view approved plans.",
  },
  {
    href: "/login/doctor",
    overline: "Clinic",
    title: "Practitioner",
    copy: "Firebase email and password. Queue, AI summary, Dashavidha, care plans. Practitioner has final authority.",
  },
  {
    href: "/login/admin",
    overline: "Operations",
    title: "Admin",
    copy: "Users, permissions, knowledge base, document queue, audit logs, analytics, reported issues.",
  },
  {
    href: "/login/staff",
    overline: "Nutrition",
    title: "Dietitian",
    copy: "Firebase or clinic staff gate. Dietitian works from practitioner referrals only.",
  },
] as const;

export default function LoginHubPage() {
  const router = useRouter();
  const session = useAuraSession();

  useEffect(() => {
    if (session?.userId && session?.role) {
      const dest = HOME_FOR[session.role];
      const timer = setTimeout(() => {
        router.replace(dest);
      }, 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [session, router]);


  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-8 space-y-6">
      {session?.userId && session?.role && (
        <div className="rounded-3xl bg-white p-6 md:p-8 shadow-md border border-slate-100/90 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1b343f] to-[#366375] text-white">
            <span className="text-xl"></span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Already Logged In</h2>
          <p className="text-xs text-slate-500">
            Active session: <strong className="text-slate-800">{session.displayName}</strong> ({session.role}).
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link href={HOME_FOR[session.role]} className="btn-pulse px-6 py-2.5 text-xs font-bold">
              Go to Dashboard →
            </Link>
            <button
              type="button"
              className="btn-ghost px-5 py-2.5 text-xs font-semibold"
              onClick={() => {
                void signOutFirebase();
                clearSession();
                router.refresh();
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      <div>
        <p className="font-mono text-[10px] uppercase font-bold text-slate-400">Security Gate</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Choose How You Enter</h1>
        <p className="mt-1.5 max-w-xl text-xs text-slate-500">
          Patient and practitioner use Firebase Auth. Admin uses PIN. Dietitian can use clinic staff login.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {GATES.map((gate) => (
          <Link
            key={gate.href}
            href={gate.href}
            className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 block hover:border-sky-300 hover:shadow-md transition-all group"
          >
            <span className="rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold px-2.5 py-0.5 uppercase">
              {gate.overline}
            </span>
            <p className="mt-2 text-xl font-bold text-slate-900 group-hover:text-sky-950 transition-colors">{gate.title}</p>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{gate.copy}</p>
            <span className="btn-pulse mt-4 px-4 py-1.5 text-xs font-semibold inline-block">
              Continue →
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}

