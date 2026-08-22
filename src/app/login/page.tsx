import Link from "next/link";

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
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-8">
      <p className="tl-overline">Station gate</p>
      <h1 className="mt-2 text-4xl">Choose how you enter</h1>
      <p className="mt-3 max-w-xl text-mist">
        Patient and practitioner use Firebase Auth. Admin uses PIN. Dietitian can use clinic staff login.
      </p>
      <div className="mt-8 grid gap-3">
        {GATES.map((gate) => (
          <Link key={gate.href} href={gate.href} className="tl-card block p-5 transition-colors hover:border-pulse">
            <p className="tl-overline">{gate.overline}</p>
            <p className="mt-1 text-2xl text-display">{gate.title}</p>
            <p className="mt-2 text-mist">{gate.copy}</p>
            <span className="btn-ghost mt-4 px-4 py-2 text-sm">Continue</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
