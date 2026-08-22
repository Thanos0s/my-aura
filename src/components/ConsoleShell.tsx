"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { convexConfigured } from "@/app/providers";
import { navForRole } from "@/lib/auth/access";
import { isPublicPath } from "@/lib/auth/siteFlow";
import { clearSession } from "@/lib/auth/session";
import { signOutFirebase } from "@/lib/firebase/client";
import { useAuraSession } from "@/components/useAuraSession";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const PUBLIC_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/login/patient", label: "Patient login" },
  { href: "/login/doctor", label: "Practitioner login" },
  { href: "/login/admin", label: "Admin login" },
] as const;

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const live = convexConfigured();
  const session = useAuraSession();
  const nav = navForRole(session?.role ?? null);
  const publicShell = isPublicPath(pathname);

  return (
    <div className="min-h-screen bg-void text-body">
      <header className="sticky top-0 z-20 border-b border-graphite bg-ink/95 backdrop-blur-sm">
        <div
          className={`mx-auto flex items-center justify-between gap-4 px-4 py-3 md:px-6 ${
            publicShell ? "max-w-6xl" : "max-w-[1280px]"
          }`}
        >
          <Link href="/" className="min-w-0">
            <p className="tl-overline">PS 26047 · AYUSH OPD intake</p>
            <p className="tl-display truncate text-base">My Aura</p>
          </Link>
          {publicShell && !session ? (
            <nav className="hidden items-center gap-4 text-sm text-mist md:flex" aria-label="Site">
              {PUBLIC_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-display">
                  {link.label}
                </Link>
              ))}
              <Link href="/kiosk" className="btn-ghost px-3 py-1 text-[10px]">
                Walk-up kiosk
              </Link>
            </nav>
          ) : null}
          <div className="flex items-center gap-3 text-right">
            <span className={`tl-tag ${live ? "status-live border-pulse text-pulse" : ""}`}>
              {live ? "Live sync" : "Local demo"}
            </span>
            {session ? (
              <button
                className="btn-ghost px-2 py-1 text-[10px]"
                onClick={() => {
                  void signOutFirebase();
                  clearSession();
                  window.dispatchEvent(new Event("aura-session"));
                  router.push("/");
                }}
              >
                Sign out {session.role}
              </button>
            ) : publicShell ? (
              <Link href="/login" className="btn-pulse px-3 py-1 text-[10px] md:hidden">
                Login
              </Link>
            ) : (
              <span className="hidden font-mono text-[10px] tracking-[0.12em] text-ash uppercase sm:inline">
                Never auto-diagnostic
              </span>
            )}
          </div>
        </div>
        {publicShell && !session ? (
          <nav className="flex gap-3 overflow-x-auto border-t border-graphite px-4 py-2 text-sm md:hidden" aria-label="Site mobile">
            <Link href="/login/patient">Patient</Link>
            <Link href="/login/doctor">Practitioner</Link>
            <Link href="/login/admin">Admin</Link>
            <Link href="/kiosk">Kiosk</Link>
          </nav>
        ) : null}
      </header>

      <div className={`mx-auto flex flex-col md:flex-row ${publicShell ? "max-w-none" : "max-w-[1280px]"}`}>
        {publicShell || nav.length === 0 ? null : (
          <nav
            aria-label="Console"
            className="flex gap-1 overflow-x-auto border-b border-graphite px-2 py-2 md:w-52 md:shrink-0 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-3 md:py-6"
          >
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap rounded-[4px] px-3 py-2 text-sm md:pl-4 ${
                    active ? "nav-active bg-onyx" : "text-mist hover:text-display"
                  }`}
                >
                  <span className="block">{item.label}</span>
                  <span className="hidden font-mono text-[10px] tracking-[0.08em] text-ash uppercase md:block">
                    {item.hint}
                  </span>
                </Link>
              );
            })}
            <Link href="/" className="px-3 py-2 text-sm text-ash md:pl-4">
              Product site
            </Link>
          </nav>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
