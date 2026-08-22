import { LoginPanel } from "@/components/LoginPanel";

export default function PatientLoginPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-8">
      <p className="tl-overline">Station gate</p>
      <h1 className="mt-2 text-4xl">Patient login</h1>
      <p className="mt-2 mb-6 max-w-xl text-mist">
        Firebase email and password. Convex stores your role after the first verified sign-in. After login you go to your portal.
      </p>
      <LoginPanel station="patient" />
    </main>
  );
}
