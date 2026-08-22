import Link from "next/link";
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
            <span className="mt-1 h-2 w-2 rounded-full bg-pulse" />
            {i < steps.length - 1 ? <span className="w-px flex-1 bg-graphite" /> : null}
          </div>
          <p className="pb-4 font-mono text-sm text-body">{step}</p>
        </li>
      ))}
    </ol>
  );
}

export function LandingPage() {
  return (
    <div className="landing-root">
      <section className="relative overflow-hidden border-b border-graphite px-4 py-16 md:px-10 md:py-24">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
          <div className="absolute -top-24 right-8 h-72 w-72 rotate-12 border border-pulse" />
          <div className="absolute bottom-8 left-12 h-40 w-40 border border-graphite" />
        </div>
        <p className="tl-overline">PS 26047 · Ministry of AYUSH / AIIA</p>
        <h1 className="mt-4 max-w-3xl text-5xl leading-none md:text-7xl">My Aura</h1>
        <p className="mt-6 max-w-2xl text-lg text-mist">
          Operator console for Ayurvedic OPD intake. The kiosk takes history in the patient&apos;s language
          before the consult. The practitioner approves every clinical field. The model never diagnoses.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login/patient" className="btn-pulse px-6 py-3">
            Patient login
          </Link>
          <Link href="/login/doctor" className="btn-ghost px-6 py-3">
            Practitioner login
          </Link>
          <Link href="/login/admin" className="btn-ghost px-6 py-3">
            Admin login
          </Link>
          <Link href="/kiosk" className="btn-ghost px-6 py-3">
            Walk-up kiosk
          </Link>
        </div>
        <p className="mt-6 font-mono text-[11px] tracking-[0.12em] text-ash uppercase">
          Never auto-diagnostic · Practitioner has final authority
        </p>
      </section>

      <section id="how-it-works" className="border-b border-graphite px-4 py-14 md:px-10">
        <p className="tl-overline">Website flow</p>
        <h2 className="mt-2 text-3xl">How you move through My Aura</h2>
        <ol className="mt-8 grid gap-3 md:grid-cols-4">
          {[
            { n: "01", t: "Landing", d: "See every capability. No login required." },
            { n: "02", t: "Login", d: "Patient or admin first. Clinic staff use a separate gate." },
            { n: "03", t: "Your station", d: "Patient portal, admin cadence, or clinic consoles." },
            { n: "04", t: "Care loop", d: "Intake → practitioner review → dietitian if referred → follow-up." },
          ].map((step) => (
            <li key={step.n} className="tl-card p-5">
              <p className="tl-overline">{step.n}</p>
              <p className="mt-2 text-xl text-display">{step.t}</p>
              <p className="mt-2 text-mist">{step.d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-ash">
          Walk-up kiosk skips login for floor intake, then the practitioner still approves the record.
        </p>
      </section>

      <section className="border-b border-graphite px-4 py-14 md:px-10">
        <p className="tl-overline">Capabilities</p>
        <h2 className="mt-2 text-3xl">Everything on the floor</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {LANDING_FEATURES.map((f) => (
            <article key={f.title} className="tl-card p-5">
              <p className="tl-overline">{f.overline}</p>
              <h3 className="mt-2 text-xl">{f.title}</h3>
              <p className="mt-2 text-mist">{f.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid border-b border-graphite md:grid-cols-3">
        <div className="border-b border-graphite px-4 py-10 md:border-r md:border-b-0 md:px-10">
          <p className="tl-overline">Architecture</p>
          <h2 className="mt-2 text-2xl">Signal path</h2>
          <Rail steps={PIPELINE_STAGES} />
        </div>
        <div className="border-b border-graphite px-4 py-10 md:border-r md:border-b-0 md:px-10">
          <p className="tl-overline">Case spine</p>
          <h2 className="mt-2 text-2xl">Interview order</h2>
          <Rail steps={CASE_SPINE} />
        </div>
        <div className="px-4 py-10 md:px-10">
          <p className="tl-overline">Documents</p>
          <h2 className="mt-2 text-2xl">Paper in, review out</h2>
          <Rail steps={DOCUMENT_STAGES} />
        </div>
      </section>

      <section className="border-b border-graphite px-4 py-14 md:px-10">
        <p className="tl-overline">Dashavidha</p>
        <h2 className="mt-2 text-3xl">Ten factors. No AI dosha label.</h2>
        <ul className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-5">
          {DASHAVIDHA_FACTORS.map((factor) => (
            <li key={factor} className="tl-surface px-3 py-3 font-mono text-sm text-display">
              {factor}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-b border-graphite px-4 py-14 md:px-10">
        <p className="tl-overline">Stations</p>
        <h2 className="mt-2 text-3xl">Four roles</h2>
        <div className="mt-8 grid gap-3 lg:grid-cols-2">
          {LANDING_ROLES.map((role) => (
            <Link
              key={role.overline}
              href={role.href}
              className="tl-card block p-5 transition-colors hover:border-pulse"
            >
              <p className="tl-overline">Role {role.overline}</p>
              <p className="mt-1 text-2xl text-display">{role.title}</p>
              <p className="mt-2 text-mist">{role.copy}</p>
              <span className="btn-ghost mt-4 px-4 py-2 text-sm">Sign in</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-b border-graphite px-4 py-14 md:px-10">
        <p className="tl-overline">Integrity</p>
        <h2 className="mt-2 text-3xl">What we refuse to claim</h2>
        <ul className="mt-6 max-w-2xl space-y-2 text-mist">
          <li>Live ABDM sandbox push — FHIR is generated and posted to a local HIS simulator.</li>
          <li>Handwriting OCR accuracy — low-confidence lines wait for the practitioner.</li>
          <li>Wearable vitals — out of scope; vitals are self-reported when captured.</li>
          <li>Uniform dialect ASR — regional languages are offered with an explicit quality flag.</li>
        </ul>
      </section>

      <section className="px-4 py-14 md:px-10">
        <p className="tl-overline">Start</p>
        <h2 className="mt-2 text-3xl">Pick a gate</h2>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login/patient" className="btn-pulse px-6 py-3">
            Patient login
          </Link>
          <Link href="/login/doctor" className="btn-ghost px-6 py-3">
            Practitioner login
          </Link>
          <Link href="/login/admin" className="btn-ghost px-6 py-3">
            Admin login
          </Link>
        </div>
      </section>
    </div>
  );
}
