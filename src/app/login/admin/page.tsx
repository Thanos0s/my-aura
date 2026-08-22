import { LoginPanel } from "@/components/LoginPanel";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-8">
      <p className="tl-overline">Station gate</p>
      <h1 className="mt-2 text-4xl">Admin login</h1>
      <p className="mt-2 mb-6 max-w-xl text-mist">
        Operations only. Patient accounts cannot enter here. Practitioner still approves every clinical plan.
      </p>
      <LoginPanel station="admin" />
    </main>
  );
}
