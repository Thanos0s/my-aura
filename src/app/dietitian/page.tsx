"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { convexConfigured } from "@/app/providers";
import { RoleGate, useAuraSession } from "@/components/useAuraSession";
import type { DietPlanExtraction } from "@/lib/diet/extract";

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
  const [structuringId, setStructuringId] = useState<Id<"dietPlans"> | null>(null);

  const structuredByPlanId = new Map<string, DietPlanExtraction>();
  for (const p of plans ?? []) {
    if (!p.structuredPlan) continue;
    try {
      structuredByPlanId.set(p._id, JSON.parse(p.structuredPlan) as DietPlanExtraction);
    } catch {
      // ignore malformed stored JSON
    }
  }
  const imageKeys = Array.from(
    new Set(
      Array.from(structuredByPlanId.values()).flatMap((d) =>
        d.daily_schedule.flatMap((m) => m.food_items.map((f) => f.image_search_key))
      )
    )
  );
  const foodImages = useQuery(api.foods.findImagesByKeys, imageKeys.length ? { keys: imageKeys } : "skip");

  async function handleStructurePlan(
    p: { _id: Id<"dietPlans">; title: string; notes: string; meals: Array<{ label: string; itemsText: string }> }
  ) {
    setStructuringId(p._id);
    try {
      const res = await fetch("/api/diet/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: p.title,
          notes: p.notes,
          meals: p.meals.map((m) => ({ label: m.label, itemsText: m.itemsText })),
        }),
      });
      const { extracted } = (await res.json()) as { extracted: DietPlanExtraction };
      await savePlan({
        sessionUserId: sessionUserId!,
        patientId: patientId!,
        title: p.title,
        notes: p.notes,
        shareable,
        planId: p._id,
        structuredPlan: JSON.stringify(extracted),
      });
    } finally {
      setStructuringId(null);
    }
  }

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
            <span className="text-3xl"></span>
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

              {plans?.map((p) => {
                const structured = structuredByPlanId.get(p._id);
                return (
                  <article key={p._id} className="mt-3 p-4 rounded-xl bg-white border border-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5">
                        {p.practitionerApproved ? "practitioner approved" : "draft"}
                      </span>
                      <button
                        className="btn-ghost px-3 py-1 text-[10px] font-semibold disabled:opacity-50"
                        disabled={structuringId === p._id || p.meals.length === 0}
                        onClick={() => handleStructurePlan(p)}
                      >
                        {structuringId === p._id ? "Structuring…" : " AI Structure Plan"}
                      </button>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 mt-1">{p.title}</h4>
                    <div className="mt-1 space-y-0.5">
                      {p.meals.map((m) => (
                        <p key={m._id} className="font-mono text-xs text-slate-700">
                          <span className="font-semibold">{m.label}:</span> {m.itemsText}
                        </p>
                      ))}
                    </div>

                    {structured && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                        <p className="font-mono text-[10px] uppercase font-bold text-slate-400">
                          Structured Plan
                        </p>
                        {structured.target_daily_macros && (
                          <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-600">
                            {structured.target_daily_macros.calories_kcal != null && (
                              <span className="bg-slate-100 rounded-full px-2 py-0.5">
                                {structured.target_daily_macros.calories_kcal} kcal
                              </span>
                            )}
                            {structured.target_daily_macros.protein_g != null && (
                              <span className="bg-slate-100 rounded-full px-2 py-0.5">
                                P {structured.target_daily_macros.protein_g}g
                              </span>
                            )}
                            {structured.target_daily_macros.carbs_g != null && (
                              <span className="bg-slate-100 rounded-full px-2 py-0.5">
                                C {structured.target_daily_macros.carbs_g}g
                              </span>
                            )}
                            {structured.target_daily_macros.fats_g != null && (
                              <span className="bg-slate-100 rounded-full px-2 py-0.5">
                                F {structured.target_daily_macros.fats_g}g
                              </span>
                            )}
                          </div>
                        )}
                        {structured.daily_schedule.map((meal, i) => (
                          <div key={i}>
                            <p className="text-xs font-bold text-slate-800">
                              {meal.meal_time}
                              {meal.time_suggestion ? ` · ${meal.time_suggestion}` : ""}
                            </p>
                            <ul className="mt-1 grid gap-1.5 sm:grid-cols-2">
                              {meal.food_items.map((item, j) => {
                                const imgUrl = foodImages?.[item.image_search_key];
                                return (
                                  <li
                                    key={j}
                                    className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 p-1.5"
                                  >
                                    {imgUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={imgUrl}
                                        alt={item.item_name}
                                        className="h-8 w-8 rounded-md object-cover shrink-0"
                                      />
                                    ) : (
                                      <span className="h-8 w-8 rounded-md bg-slate-200 shrink-0 flex items-center justify-center text-[10px]">
                                        🍽️
                                      </span>
                                    )}
                                    <span className="text-[11px] text-slate-700 leading-tight">
                                      {item.item_name}
                                      {item.portion_size ? ` (${item.portion_size})` : ""}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                        {structured.foods_to_avoid.length > 0 && (
                          <p className="text-[11px] text-rose-700">
                            <span className="font-bold">Avoid:</span> {structured.foods_to_avoid.join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
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

