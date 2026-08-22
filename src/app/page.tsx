import Link from "next/link";
import { LoginPanel } from "@/components/LoginPanel";

const ROLES = [
  {
    href: "/login?role=patient",
    overline: "Portal",
    title: "Patient",
    copy: "Case taking, symptoms, diet, plans, messages, follow-up.",
  },
  {
    href: "/login?role=practitioner",
    overline: "Clinic",
    title: "Ayurveda practitioner",
    copy: "Final clinical authority. Edit, approve, Dashavidha interpretation. AI never auto-commits.",
  },
  {
    href: "/login?role=dietitian",
    overline: "Ahara",
    title: "Dietitian",
    copy: "Referred patients only. Approved summaries. Diet plans and adherence.",
  },
  {
    href: "/login?role=admin",
    overline: "Cadence",
    title: "Admin",
    copy: "Users, knowledge base, documents, audit, analytics, issues.",
  },
  {
    href: "/kiosk",
    overline: "Walk-up",
    title: "Kiosk",
    copy: "No login. Same intake engine as the patient portal.",
    cta: true,
  },
] as const;

export default function HomePage() {
  return (
    <main className="px-4 py-8 md:px-8">
      <p className="tl-overline">Boot sequence</p>
      <h1 className="mt-2 text-4xl">My Aura</h1>
      <p className="mt-4 max-w-2xl text-lg text-body">
        Structured history before the consult. Practitioner has final clinical authority — the model never
        auto-commits diagnosis or treatment.
      </p>
      <div className="mt-8 grid gap-3 lg:grid-cols-2">
        {ROLES.map((station) => (
          <Link
            key={station.href}
            href={station.href}
            className={`tl-card block px-5 py-4 transition-colors hover:border-pulse ${
              "cta" in station && station.cta ? "border-pulse" : ""
            }`}
          >
            <p className="tl-overline">{station.overline}</p>
            <p className="mt-1 text-xl text-display">{station.title}</p>
            <p className="mt-2 text-mist">{station.copy}</p>
            <span className="btn-ghost mt-4 px-4 py-2 text-sm">Open</span>
          </Link>
        ))}
      </div>
      <div className="mt-10">
        <p className="tl-overline">Demo login</p>
        <h2 className="mt-1 text-2xl">Email + PIN</h2>
        <p className="mt-2 mb-4 text-mist">Seed accounts first. PIN 1234 is hashed in Convex.</p>
        <LoginPanel />
      </div>
    </main>
  );
}
