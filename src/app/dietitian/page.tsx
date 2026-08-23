"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { convexConfigured } from "@/app/providers";
import { RoleGate, useAuraSession } from "@/components/useAuraSession";

export default function DietitianPage() {
  if (!convexConfigured()) {
    return (
      <main className="px-4 py-8 md:px-8">
        <p className="tl-overline">Ahara</p>
        <h1 className="mt-2 text-2xl">Dietitian</h1>
        <p className="mt-4 text-body">Connect Convex and sign in as dietitian@aura.local.</p>
      </main>
    );
  }
  return (
    <RoleGate allow={["dietitian"]} label="Dietitian">
      <DietitianApp />
    </RoleGate>
  );
}

function DietitianApp() {
  const session = useAuraSession();
  const sessionUserId = session?.userId as Id<"users"> | undefined;
  const referred = useQuery(
    api.diet.listReferredPatients,
    sessionUserId ? { sessionUserId } : "skip"
  );
  const [patientId, setPatientId] = useState<Id<"patients"> | null>(null);
  const args = sessionUserId && patientId ? { sessionUserId, patientId } : "skip";
  const summary = useQuery(api.diet.approvedSummaryForDietitian, args);
  const lifestyle = useQuery(api.clinical.getLifestyle, args);
  const plans = useQuery(api.diet.listDietPlans, args);
  const adherence = useQuery(api.clinical.listAdherence, args);
  const messages = useQuery(api.messaging.listMessages, args);
  const savePlan = useMutation(api.diet.saveDietPlan);
  const addMeal = useMutation(api.diet.addMeal);
  const report = useMutation(api.diet.reportProgress);
  const sendMessage = useMutation(api.messaging.sendMessage);
  const [title, setTitle] = useState("Diet plan");
  const [notes, setNotes] = useState("");
  const [shareable, setShareable] = useState(false);
  const [mealLabel, setMealLabel] = useState("Breakfast");
  const [mealItems, setMealItems] = useState("");
  const [progress, setProgress] = useState("");
  const [msg, setMsg] = useState("");
  const [planId, setPlanId] = useState<Id<"dietPlans"> | null>(null);

  if (!sessionUserId) return null;

  return (
    <div className="grid min-h-[calc(100vh-5rem)] grid-cols-1 gap-6 lg:grid-cols-[260px_1fr] max-w-[1400px] mx-auto">
      <aside className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100/90 h-fit space-y-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold">Ahara Studio</p>
          <h1 className="text-xl font-bold text-slate-900">Dietitian Console</h1>
          <p className="text-xs text-slate-500 mt-0.5">Referred patients only.</p>
        </div>

        <ul className="space-y-2">
          {referred?.map((r) => (
            <li key={r.referralId}>
              <button
                className={`w-full rounded-2xl border p-3 text-left transition-all ${
                  patientId === r.patientId
                    ? "bg-[#1b343f] text-white shadow-xs border-[#1b343f]"
                    : "border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => setPatientId(r.patientId)}
              >
                <p className="font-semibold text-xs">{r.displayName}</p>
                <span className={`block font-mono text-[10px] mt-0.5 ${patientId === r.patientId ? "text-slate-300" : "text-slate-400"}`}>
                  {r.visitApproved ? "✓ Approved summary" : "⏳ Waiting doctor sign-off"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100/90 space-y-6 min-w-0">
        {!patientId ? (
          <div className="text-center py-16 text-slate-400">
            <span className="text-3xl">🥗</span>
            <p className="mt-2 text-sm">Select a referred patient from the left panel.</p>
          </div>
        ) : (
          <>
            <section className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="font-mono text-[10px] uppercase font-bold text-slate-400">Practitioner Intake Summary</p>
              <h2 className="text-base font-bold text-slate-900 mt-1">Verified Clinical Case</h2>
              {summary ? (
                <p className="mt-2 text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                  {summary.recapText || "(empty recap)"}
                </p>
              ) : (
                <p className="mt-2 text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  Hidden until the practitioner signs off on the visit. Unapproved AI drafts are never exposed.
                </p>
              )}
            </section>

            <section className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Ahara-Vihara Lifestyle Log</h3>
              {lifestyle ? (
                <pre className="mt-2 overflow-auto p-3 rounded-xl bg-white text-xs font-mono text-slate-700 border border-slate-200">
                  {JSON.stringify(lifestyle, null, 2)}
                </pre>
              ) : (
                <p className="text-xs text-slate-400 mt-1">No lifestyle log recorded yet.</p>
              )}
            </section>

            <section className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <h3 className="text-base font-bold text-slate-900">Create Ayurvedic Diet Plan</h3>
              <input className="tl-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Plan Title" />
              <textarea className="tl-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nutritional and Pathya guidelines..." />
              <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                <input type="checkbox" checked={shareable} onChange={(e) => setShareable(e.target.checked)} />
                Shareable with patient before practitioner approval
              </label>
              <button
                className="btn-pulse px-4 py-2 text-xs font-semibold"
                onClick={async () => {
                  const id = await savePlan({
                    sessionUserId,
                    patientId,
                    title,
                    notes,
                    shareable,
                    planId: planId ?? undefined,
                  });
                  setPlanId(id);
                }}
              >
                Save Plan
              </button>

              <div className="pt-2 border-t border-slate-200 mt-3">
                <p className="font-mono text-[10px] uppercase font-bold text-slate-400 mb-2">Add Customized Meals</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="tl-input" value={mealLabel} onChange={(e) => setMealLabel(e.target.value)} placeholder="Meal (e.g. Breakfast)" />
                  <input className="tl-input" value={mealItems} onChange={(e) => setMealItems(e.target.value)} placeholder="Items (e.g. Moong dal khichdi)" />
                </div>
                <button
                  className="btn-ghost mt-2 px-4 py-1.5 text-xs font-semibold"
                  onClick={async () => {
                    const id =
                      planId ??
                      (await savePlan({ sessionUserId, patientId, title, notes, shareable }));
                    setPlanId(id);
                    await addMeal({ sessionUserId, dietPlanId: id, label: mealLabel, itemsText: mealItems });
                    setMealItems("");
                  }}
                >
                  + Add Meal
                </button>
              </div>

              {plans?.map((p) => (
                <article key={p._id} className="mt-3 p-4 rounded-xl bg-white border border-slate-200">
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5">
                    {p.practitionerApproved ? "practitioner approved" : "draft"}
                  </span>
                  <h4 className="font-bold text-xs text-slate-900 mt-1">{p.title}</h4>
                  <div className="mt-1 space-y-0.5">
                    {p.meals.map((m) => (
                      <p key={m._id} className="font-mono text-xs text-slate-700">
                        <span className="font-semibold">{m.label}:</span> {m.itemsText}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </section>

            <section className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Patient Adherence</h3>
              <div className="mt-2 space-y-1">
                {adherence?.map((a) => (
                  <p key={a._id} className="font-mono text-xs text-slate-700">
                    {new Date(a.createdAt).toLocaleString()} · {a.note}
                  </p>
                ))}
              </div>
            </section>

            <section className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="text-base font-bold text-slate-900">Message Patient</h3>
              <div className="space-y-1">
                {messages?.map((m) => (
                  <p key={m._id} className="text-xs bg-white p-2 rounded-xl border border-slate-200">
                    <span className="font-bold">{m.fromName}:</span> {m.body}
                  </p>
                ))}
              </div>
              <textarea className="tl-input mt-2" rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message..." />
              <button
                className="btn-pulse px-4 py-2 text-xs font-semibold"
                onClick={async () => {
                  if (!msg.trim()) return;
                  await sendMessage({ sessionUserId, patientId, toRole: "patient", body: msg });
                  setMsg("");
                }}
              >
                Send Message
              </button>
            </section>

            <section className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h3 className="text-base font-bold text-slate-900">Progress Report to Doctor</h3>
              <textarea className="tl-input" rows={2} value={progress} onChange={(e) => setProgress(e.target.value)} placeholder="Clinical diet observations..." />
              <button
                className="btn-ghost px-4 py-2 text-xs font-semibold"
                onClick={async () => {
                  if (!progress.trim()) return;
                  await report({ sessionUserId, patientId, body: progress });
                  setProgress("");
                }}
              >
                File Progress Note
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

