"use client";

import Link from "next/link";
import { useAuraSession } from "@/components/useAuraSession";
import { HOME_FOR } from "@/lib/auth/siteFlow";

import {
  CASE_SPINE,
  DASHAVIDHA_FACTORS,
  DOCUMENT_STAGES,
  LANDING_FEATURES,
  LANDING_ROLES,
  PIPELINE_STAGES,
} from "@/lib/landing/features";

function Rail({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="mt-4 space-y-0">
      {steps.map((step, i) => (
        <li key={step} className="flex gap-3">
          <div className="flex w-6 flex-col items-center">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs" />
            {i < steps.length - 1 ? <span className="w-0.5 flex-1 bg-slate-200" /> : null}
          </div>
          <p className="pb-4 font-mono text-xs text-slate-700 font-medium">{step}</p>
        </li>
      ))}
    </ol>
  );
}

export function LandingPage() {
  const session = useAuraSession();

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-16">
      {/* Hero Banner */}
      <section className="rounded-3xl bg-gradient-to-br from-[#18313c] via-[#234554] to-[#2d5668] text-white p-8 md:p-14 shadow-sm relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -top-24 right-8 h-96 w-96 rounded-full bg-sky-400 blur-3xl" />
          <div className="absolute bottom-8 left-12 h-64 w-64 rounded-full bg-emerald-400 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold backdrop-blur-md text-sky-100">
            <span>🌿</span> PS 26047 · Ministry of AYUSH / AIIA
          </span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight text-white">
            Ayurvedic OPD Case Taking & Clinical Station
          </h1>
          <p className="text-sm md:text-base text-slate-200 leading-relaxed max-w-2xl">
            Voice-guided intake in the patient&apos;s language before the consult. Practitioner maintains final clinical authority over every field. The AI assists but never makes autonomous diagnoses.
          </p>

          <div className="pt-4 flex flex-wrap gap-3">
            {session?.role ? (
              <Link
                href={HOME_FOR[session.role] ?? "/patient"}
                className="rounded-full bg-white hover:bg-slate-100 !text-[#18313c] px-6 py-3 text-xs font-extrabold shadow-md transition-all inline-flex items-center justify-center gap-1.5"
              >
                <span>🌿</span> Go to My {session.role.charAt(0).toUpperCase() + session.role.slice(1)} Dashboard →
              </Link>
            ) : (
              <Link
                href="/login/patient"
                className="rounded-full bg-white hover:bg-slate-100 !text-[#18313c] px-6 py-3 text-xs font-extrabold shadow-md transition-all inline-flex items-center justify-center"
              >
                Patient Portal
              </Link>
            )}
            <Link
              href="/login/doctor"
              className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md !text-white border border-white/30 px-6 py-3 text-xs font-bold transition-all inline-flex items-center justify-center"
            >
              Practitioner Login
            </Link>
            <Link
              href="/login/admin"
              className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md !text-white border border-white/30 px-6 py-3 text-xs font-bold transition-all inline-flex items-center justify-center"
            >
              Admin Login
            </Link>
            <Link
              href="/kiosk"
              className="rounded-full bg-emerald-500 hover:bg-emerald-600 !text-white px-6 py-3 text-xs font-bold shadow-md transition-all inline-flex items-center justify-center"
            >
              Walk-up Kiosk 🌿
            </Link>
          </div>

          <p className="pt-2 font-mono text-[11px] tracking-wider text-slate-300 uppercase">
            Never auto-diagnostic · 10 Indic Languages · Sarvam AI & Local Offline Engine
          </p>
        </div>
      </section>


      {/* How it Works Grid */}
      <section id="how-it-works" className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Website Flow</p>
          <h2 className="text-2xl font-bold text-slate-900">How You Move Through My Aura</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "01", t: "Landing & Overview", d: "Explore capabilities, clinical safety rules, and architecture." },
            { n: "02", t: "Role Authentication", d: "Role-specific PIN gateways with instant demo seeding." },
            { n: "03", t: "Clinical Workstation", d: "Patient dashboard, practitioner OPD desk, or dietitian studio." },
            { n: "04", t: "Ayurvedic Care Loop", d: "SOCRATES intake → Dashavidha exam → Dietitian referral → FHIR export." },
          ].map((step) => (
            <div key={step.n} className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-100 text-sky-900 font-mono text-xs font-bold">
                {step.n}
              </span>
              <p className="text-base font-bold text-slate-900">{step.t}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Capabilities</p>
          <h2 className="text-2xl font-bold text-slate-900">Everything on the Clinic Floor</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_FEATURES.map((f) => (
            <article key={f.title} className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-2">
              <span className="rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-0.5 uppercase">
                {f.overline}
              </span>
              <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.copy}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Architecture Rails */}
      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Architecture</p>
          <h2 className="text-lg font-bold text-slate-900 mt-1">Signal Path</h2>
          <Rail steps={PIPELINE_STAGES} />
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Case Spine</p>
          <h2 className="text-lg font-bold text-slate-900 mt-1">Interview Order</h2>
          <Rail steps={CASE_SPINE} />
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Documents</p>
          <h2 className="text-lg font-bold text-slate-900 mt-1">Physical OCR Pipeline</h2>
          <Rail steps={DOCUMENT_STAGES} />
        </div>
      </section>

      {/* Dashavidha Factors */}
      <section className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Dashavidha Pariksha</p>
          <h2 className="text-2xl font-bold text-slate-900">Ten Classical Factors Evaluated</h2>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {DASHAVIDHA_FACTORS.map((factor) => (
            <li key={factor} className="rounded-2xl bg-white p-3.5 font-mono text-xs font-bold text-slate-800 shadow-xs border border-slate-100 text-center">
              {factor}
            </li>
          ))}
        </ul>
      </section>

      {/* Roles Selection */}
      <section className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Role Stations</p>
          <h2 className="text-2xl font-bold text-slate-900">Four Purpose-Built Consoles</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {LANDING_ROLES.map((role) => (
            <Link
              key={role.overline}
              href={role.href}
              className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 block hover:border-sky-300 hover:shadow-md transition-all group"
            >
              <span className="rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold px-2.5 py-0.5 uppercase">
                {role.overline}
              </span>
              <p className="text-xl font-bold text-slate-900 mt-2 group-hover:text-sky-900 transition-colors">{role.title}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{role.copy}</p>
              <span className="btn-pulse mt-4 px-4 py-1.5 text-xs font-semibold inline-block">
                Sign in to station →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

