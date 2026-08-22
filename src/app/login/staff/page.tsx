import { LoginPanel } from "@/components/LoginPanel";

export default function StaffLoginPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-8">
      <p className="tl-overline">Station gate</p>
      <h1 className="mt-2 text-4xl">Clinic staff login</h1>
      <p className="mt-2 mb-6 max-w-xl text-mist">
        Firebase email and password for practitioner or dietitian. Use patient login for the public portal, admin login for operations.
      </p>
      <LoginPanel station="staff" />
    </main>
  );
}
