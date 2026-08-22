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
    <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-graphite p-4 lg:border-r lg:border-b-0">
        <p className="tl-overline">Ahara</p>
        <h1 className="mt-1 text-xl">Referred only</h1>
        <ul className="mt-4 space-y-2">
          {referred?.map((r) => (
            <li key={r.referralId}>
              <button
                className={`w-full rounded-[4px] border p-3 text-left ${
                  patientId === r.patientId ? "nav-active border-pulse" : "border-graphite"
                }`}
                onClick={() => setPatientId(r.patientId)}
              >
                {r.displayName}
                <span className="block font-mono text-[10px] text-ash">
                  {r.visitApproved ? "approved summary" : "waiting practitioner approve"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="space-y-6 p-4 md:p-6">
        {!patientId ? (
          <p className="text-mist">No referral selected. Practitioner must refer first.</p>
        ) : (
          <>
            <section>
              <p className="tl-overline">Approved summary</p>
              <h2 className="text-2xl">Not raw AI</h2>
              {summary ? (
                <p className="tl-surface mt-2 p-3">{summary.recapText || "(empty recap)"}</p>
              ) : (
                <p className="mt-2 text-warning">
                  Hidden until the practitioner approves the visit. Unapproved AI is not shown.
                </p>
              )}
            </section>
            <section>
              <h3 className="text-xl">Ahara-Vihara history</h3>
              {lifestyle ? (
                <pre className="tl-surface mt-2 overflow-auto p-3 text-sm">
                  {JSON.stringify(lifestyle, null, 2)}
                </pre>
              ) : (
                <p className="text-mist">No lifestyle log yet.</p>
              )}
            </section>
            <section>
              <h3 className="text-xl">Create diet plan</h3>
              <input className="tl-input mt-2" value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea className="tl-input mt-2" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={shareable} onChange={(e) => setShareable(e.target.checked)} />
                Shareable with patient before practitioner approve
              </label>
              <button
                className="btn-pulse mt-2 px-4 py-2"
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
                Save plan
              </button>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <input className="tl-input" value={mealLabel} onChange={(e) => setMealLabel(e.target.value)} />
                <input className="tl-input" value={mealItems} onChange={(e) => setMealItems(e.target.value)} />
              </div>
              <button
                className="btn-ghost mt-2 px-4 py-1.5 text-sm"
                onClick={async () => {
                  const id =
                    planId ??
                    (await savePlan({ sessionUserId, patientId, title, notes, shareable }));
                  setPlanId(id);
                  await addMeal({ sessionUserId, dietPlanId: id, label: mealLabel, itemsText: mealItems });
                  setMealItems("");
                }}
              >
                Add customized meal
              </button>
              {plans?.map((p) => (
                <article key={p._id} className="tl-card mt-3 p-3">
                  <p className="tl-tag">{p.practitionerApproved ? "practitioner approved" : "draft"}</p>
                  <h4>{p.title}</h4>
                  {p.meals.map((m) => (
                    <p key={m._id} className="font-mono text-sm">
                      {m.label}: {m.itemsText}
                    </p>
                  ))}
                </article>
              ))}
            </section>
            <section>
              <h3 className="text-xl">Adherence</h3>
              {adherence?.map((a) => (
                <p key={a._id} className="font-mono text-sm text-mist">
                  {new Date(a.createdAt).toLocaleString()} · {a.note}
                </p>
              ))}
            </section>
            <section>
              <h3 className="text-xl">Message patient</h3>
              {messages?.map((m) => (
                <p key={m._id} className="text-sm">
                  {m.fromName}: {m.body}
                </p>
              ))}
              <textarea className="tl-input mt-2" rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} />
              <button
                className="btn-pulse mt-2 px-4 py-2"
                onClick={async () => {
                  if (!msg.trim()) return;
                  await sendMessage({ sessionUserId, patientId, toRole: "patient", body: msg });
                  setMsg("");
                }}
              >
                Send
              </button>
            </section>
            <section>
              <h3 className="text-xl">Report progress to practitioner</h3>
              <textarea className="tl-input" rows={2} value={progress} onChange={(e) => setProgress(e.target.value)} />
              <button
                className="btn-ghost mt-2 px-4 py-2"
                onClick={async () => {
                  if (!progress.trim()) return;
                  await report({ sessionUserId, patientId, body: progress });
                  setProgress("");
                }}
              >
                File note on patient record
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
