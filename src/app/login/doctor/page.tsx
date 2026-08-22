import { LoginPanel } from "@/components/LoginPanel";

export default function DoctorLoginPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-8">
      <p className="tl-overline">Station gate</p>
      <h1 className="mt-2 text-4xl">Practitioner login</h1>
      <p className="mt-2 mb-6 max-w-xl text-mist">
        Firebase email and password for Ayurveda practitioners. Convex maps the Firebase user to the
        practitioner role. Dietitians use clinic staff login.
      </p>
      <LoginPanel station="staff" staffSignupRole="practitioner" />
    </main>
  );
}
