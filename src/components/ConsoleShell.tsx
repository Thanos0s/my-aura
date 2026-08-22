"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { convexConfigured } from "@/app/providers";
import { navForRole } from "@/lib/auth/access";
import { clearSession } from "@/lib/auth/session";
import { useAuraSession } from "@/components/useAuraSession";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const live = convexConfigured();
  const session = useAuraSession();
  const nav = navForRole(session?.role ?? null);

  return (
    <div className="min-h-screen bg-void text-body">
      <header className="sticky top-0 z-20 border-b border-graphite bg-ink/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="min-w-0">
            <p className="tl-overline">PS 26047 · AYUSH OPD intake</p>
            <p className="tl-display truncate text-base">My Aura</p>
          </div>
          <div className="flex items-center gap-3 text-right">
            <span className={`tl-tag ${live ? "status-live border-pulse text-pulse" : ""}`}>
              {live ? "Live sync" : "Local demo"}
            </span>
            {session ? (
              <button
                className="btn-ghost px-2 py-1 text-[10px]"
                onClick={() => {
                  clearSession();
                  window.dispatchEvent(new Event("aura-session"));
                }}
              >
                Sign out {session.role}
              </button>
            ) : (
              <span className="hidden font-mono text-[10px] tracking-[0.12em] text-ash uppercase sm:inline">
                Never auto-diagnostic
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1280px] flex-col md:flex-row">
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
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
