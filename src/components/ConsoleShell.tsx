"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { navForRole } from "@/lib/auth/access";
import { isPublicPath, HOME_FOR } from "@/lib/auth/siteFlow";
import { clearSession } from "@/lib/auth/session";
import { signOutFirebase } from "@/lib/firebase/client";
import { useAuraSession } from "@/components/useAuraSession";
import { SyncBadge } from "@/components/SyncBadge";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const PUBLIC_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/login/patient", label: "Patient" },
  { href: "/login/doctor", label: "Practitioner" },
  { href: "/login/admin", label: "Admin" },
] as const;

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAuraSession();
  const nav = navForRole(session?.role ?? null);
  const publicShell = isPublicPath(pathname);

  return (
    <div className="min-h-screen bg-transparent text-slate-800 antialiased">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div
          className={`mx-auto flex items-center justify-between gap-4 px-4 py-3 md:px-8 ${
            publicShell ? "max-w-6xl" : "max-w-[1400px]"
          }`}
        >
          <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1b343f] to-[#366375] text-white shadow-sm transition-transform group-hover:scale-105">
              <span className="text-base">🌿</span>
            </div>
            <div>
              <p className="font-bold text-base tracking-tight text-slate-900 leading-tight">My Aura</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                AYUSH OPD Case Taking
              </p>
            </div>
          </Link>

          {publicShell && !session ? (
            <nav className="hidden items-center gap-2 text-sm font-medium text-slate-600 md:flex" aria-label="Site">
              {PUBLIC_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-1.5 transition-colors ${
                    isActive(pathname, link.href)
                      ? "bg-slate-100 font-semibold text-slate-900"
                      : "hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/kiosk" className="btn-pulse ml-2 px-4 py-1.5 text-xs">
                Walk-up Kiosk
              </Link>
            </nav>
          ) : null}

          <div className="flex items-center gap-3 text-right">
            <SyncBadge />
            {session ? (
              <div className="flex items-center gap-2">
                <Link
                  href={HOME_FOR[session.role] ?? "/patient"}
                  className="rounded-full bg-[#1b343f] hover:bg-[#254452] text-white px-3.5 py-1 text-xs font-semibold shadow-xs transition-all"
                >
                  Dashboard →
                </Link>
                <span className="hidden rounded-full bg-slate-100 px-3 py-1 font-mono text-[11px] font-semibold text-slate-700 sm:inline-block">
                  {session.displayName} ({session.role})
                </span>
                <button
                  className="btn-ghost px-3 py-1.5 text-xs font-medium"
                  onClick={() => {
                    void signOutFirebase();
                    clearSession();
                    router.push("/");
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : publicShell ? (
              <Link href="/login" className="btn-pulse px-4 py-1.5 text-xs md:hidden">
                Login
              </Link>
            ) : (
              <span className="hidden rounded-full bg-emerald-50 px-3 py-1 font-mono text-[11px] font-semibold text-emerald-700 uppercase sm:inline-block border border-emerald-200">
                Never Auto-Diagnostic
              </span>
            )}
          </div>
        </div>


        {publicShell && !session ? (
          <nav className="flex gap-2 overflow-x-auto border-t border-slate-200/60 bg-white/90 px-4 py-2 text-xs font-medium md:hidden" aria-label="Site mobile">
            <Link href="/login/patient" className="rounded-full bg-slate-100 px-3 py-1">Patient</Link>
            <Link href="/login/doctor" className="rounded-full bg-slate-100 px-3 py-1">Practitioner</Link>
            <Link href="/login/admin" className="rounded-full bg-slate-100 px-3 py-1">Admin</Link>
            <Link href="/kiosk" className="rounded-full bg-[#1b343f] text-white px-3 py-1">Kiosk</Link>
          </nav>
        ) : null}
      </header>

      <div className={`mx-auto flex flex-col md:flex-row ${publicShell ? "max-w-none" : "max-w-[1400px]"} p-2 md:p-6 gap-6`}>
        {publicShell || nav.length === 0 ? null : (
          <aside
            aria-label="Console"
            className="flex gap-1.5 overflow-x-auto rounded-3xl border border-slate-200/80 bg-white p-3 shadow-sm md:w-56 md:shrink-0 md:flex-col md:overflow-visible"
          >
            <div className="hidden px-3 py-2 md:block border-b border-slate-100 mb-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Console Stations</p>
            </div>
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-[#1b343f] text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="block font-semibold">{item.label}</span>
                  <span className={`hidden font-mono text-[10px] uppercase md:block ${active ? "text-slate-300" : "text-slate-400"}`}>
                    {item.hint}
                  </span>
                </Link>
              );
            })}
            <div className="hidden md:block border-t border-slate-100 my-2 pt-2">
              <Link href="/" className="block rounded-xl px-3.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800">
                ← Product site
              </Link>
            </div>
          </aside>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

