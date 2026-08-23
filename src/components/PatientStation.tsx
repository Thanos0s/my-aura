"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { DocumentPipelinePanel } from "./DocumentPipelinePanel";
import type { DocumentKind } from "@/lib/documents/metadata";

type Tab =
  | "overview"
  | "intake"
  | "documents"
  | "symptoms"
  | "lifestyle"
  | "plans"
  | "adherence"
  | "book"
  | "messages";

export function PatientStation({
  sessionUserId,
  displayName,
  intake,
}: {
  sessionUserId: Id<"users">;
  displayName: string;
  intake: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedDosha, setSelectedDosha] = useState<"vata" | "pitta" | "kapha" | "dashavidha">("vata");
  const [activeDay, setActiveDay] = useState<"Sat" | "Sun" | "Mon" | "Tue" | "Wed">("Mon");
  const [routineDone, setRoutineDone] = useState<Record<string, boolean>>({ "pull-up": true });
  const [waterLogged, setWaterLogged] = useState(750);
  const [searchQuery, setSearchQuery] = useState("");

  const args = { sessionUserId };
  const symptoms = useQuery(api.clinical.listSymptoms, args);
  const lifestyle = useQuery(api.clinical.getLifestyle, args);
  const care = useQuery(api.clinical.listCarePlans, args);
  const diet = useQuery(api.diet.listDietPlans, args);
  const adherence = useQuery(api.clinical.listAdherence, args);
  const appointments = useQuery(api.clinical.listAppointments, args);
  const practitioners = useQuery(api.auth.listPractitioners, args);
  const messages = useQuery(api.messaging.listMessages, args);
  const visits = useQuery(api.visits.listPatientVisits, args);
  const documentExtracts = useQuery(api.documents.listPatientDocumentExtracts, args);

  const logSymptom = useMutation(api.clinical.logSymptom);
  const upsertLifestyle = useMutation(api.clinical.upsertLifestyle);
  const logAdherence = useMutation(api.clinical.logAdherence);
  const requestAppointment = useMutation(api.clinical.requestAppointment);
  const sendMessage = useMutation(api.messaging.sendMessage);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const attachDocument = useMutation(api.documents.attachDocument);
  const startVisit = useMutation(api.visits.startVisit);
  const updateName = useMutation(api.auth.updateProfileName);

  const [symptomText, setSymptomText] = useState("");
  const [severity, setSeverity] = useState(3);
  const [life, setLife] = useState({
    mealTimes: "",
    dietType: "",
    sleep: "",
    waterIntake: "",
    teaCoffeeSubstances: "",
    notes: "",
  });
  const [checkin, setCheckin] = useState("");
  const [msg, setMsg] = useState("");
  const [toRole, setToRole] = useState<"practitioner" | "dietitian">("practitioner");
  const [slot, setSlot] = useState("");
  const [practId, setPractId] = useState<Id<"users"> | "">("");
  const [phone, setPhone] = useState("");
  const [sendWhatsAppAlert, setSendWhatsAppAlert] = useState(true);
  const [bookingNotice, setBookingNotice] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [customName, setCustomName] = useState(displayName);




  async function handlePatientUpload(file: File, kind: DocumentKind) {
    const postUrlPromise = generateUploadUrl({}).then(async (postUrl) => {
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!result.ok) throw new Error("File upload failed");
      return (await result.json()) as { storageId: Id<"_storage"> };
    });

    const ocrForm = new FormData();
    ocrForm.append("file", file);
    ocrForm.append("kind", kind);
    const ocrPromise = fetch("/api/ocr", { method: "POST", body: ocrForm })
      .then(async (res) => {
        if (!res.ok) return { text: "", confidence: 0, failed: true, structured: {} };
        return (await res.json()) as {
          text?: string;
          confidence?: number;
          structured?: object;
          failed?: boolean;
        };
      })
      .catch(() => ({ text: "", confidence: 0, failed: true, structured: {} }));

    const [json, ocrData] = await Promise.all([postUrlPromise, ocrPromise]);

    let activeVisitId = visits?.[0]?._id;
    if (!activeVisitId) {
      activeVisitId = await startVisit({
        sessionUserId,
        displayName,
        languageCode: "en-IN",
        pathway: "ayush",
        answeredBy: "patient",
        kioskId: "patient-portal",

        shareHistory: true,
        shareAyush: true,
        shareAbha: false,
        retainAfterEncounter: true,
        intakeJson: JSON.stringify({
          phase: "documents",
          consent: { shareHistory: true, shareAyush: true, shareAbha: false, retainAfterEncounter: true },
          answeredBy: "patient",
          pathway: "ayush",
          language: "en-IN",
          socrates: {
            chiefComplaint: { value: "Document upload", status: "unasked", confidence: 1, source: "patient" },
            site: { value: "", status: "unasked", confidence: 1, source: "patient" },
            onset: { value: "", status: "unasked", confidence: 1, source: "patient" },
            character: { value: "", status: "unasked", confidence: 1, source: "patient" },
            radiation: { value: "", status: "unasked", confidence: 1, source: "patient" },
            associated: { value: "", status: "unasked", confidence: 1, source: "patient" },
            timing: { value: "", status: "unasked", confidence: 1, source: "patient" },
            exacerbatingRelieving: { value: "", status: "unasked", confidence: 1, source: "patient" },
            severity: { value: "", status: "unasked", confidence: 1, source: "patient" },
          },
          dashavidha: {
            dushya: { value: "", status: "unasked", confidence: 1, source: "patient" },
            desha: { value: "", status: "unasked", confidence: 1, source: "patient" },
            bala: { value: "", status: "unasked", confidence: 1, source: "patient" },
            kala: { value: "", status: "unasked", confidence: 1, source: "patient" },
            anala: { value: "", status: "unasked", confidence: 1, source: "patient" },
            prakriti: { value: "", status: "unasked", confidence: 1, source: "patient" },
            vayas: { value: "", status: "unasked", confidence: 1, source: "patient" },
            sattva: { value: "", status: "unasked", confidence: 1, source: "patient" },
            satmya: { value: "", status: "unasked", confidence: 1, source: "patient" },
            ahara: { value: "", status: "unasked", confidence: 1, source: "patient" },
          },
          history: {
            pastMedical: { value: "", status: "unasked", confidence: 1, source: "patient" },
            currentMedicines: { value: "none known", status: "unasked", confidence: 1, source: "patient" },
            allergies: { value: "none known", status: "unasked", confidence: 1, source: "patient" },
            familyHistory: { value: "", status: "unasked", confidence: 1, source: "patient" },
          },
          ros: {},
          aharaVihara: {
            mealTimes: { value: "", status: "unasked", confidence: 1, source: "patient" },
            dietType: { value: "", status: "unasked", confidence: 1, source: "patient" },
            sleep: { value: "", status: "unasked", confidence: 1, source: "patient" },
            waterIntake: { value: "", status: "unasked", confidence: 1, source: "patient" },
            teaCoffeeSubstances: { value: "", status: "unasked", confidence: 1, source: "patient" },
            notes: { value: "", status: "unasked", confidence: 1, source: "patient" },
          },
          patientRecapConfirmed: false,
        }),
      });
    }


    await attachDocument({
      visitId: activeVisitId,
      storageId: json.storageId,
      kind: kind === "scan" ? "scan" : kind,
      rawText: ocrData.text ?? "",
      structuredJson: JSON.stringify(ocrData.structured ?? {}),
      confidence: ocrData.confidence ?? 0,
      failed: ocrData.failed,
    });
  }

  return (
    <div className="space-y-6 max-w-[1300px] mx-auto pb-12">
      {/* Top Header / Greeting Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-1.5 py-0.5">
                <input
                  type="text"
                  className="rounded-lg border border-slate-300 px-2 py-0.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-sky-500"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter full name"
                  autoFocus
                />
                <button
                  className="rounded-lg bg-[#1b343f] px-2.5 py-0.5 text-[11px] font-semibold text-white hover:bg-[#274d5d]"
                  onClick={async () => {
                    if (!customName.trim()) return;
                    await updateName({ sessionUserId, displayName: customName.trim() });
                    setIsEditingName(false);
                  }}
                >
                  Save
                </button>
                <button
                  className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200"
                  onClick={() => setIsEditingName(false)}
                >
                  ✕
                </button>
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                Good Day, <strong className="text-slate-900">{displayName}</strong>
                <button
                  className="text-xs text-sky-700 hover:text-sky-900 font-normal px-1 py-0.5 rounded-md hover:bg-sky-50 transition-colors"
                  onClick={() => {
                    setCustomName(displayName);
                    setIsEditingName(true);
                  }}
                  title="Change profile name"
                >
                  ✎ Edit
                </button>
              </p>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-0.5">
            How&apos;s your health balance today?
          </h1>
        </div>


        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search health records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 pl-9 text-xs shadow-xs placeholder:text-slate-400 focus:border-sky-400 focus:outline-none w-56 md:w-64"
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
          </div>
          <button
            onClick={() => setTab("intake")}
            className="btn-pulse px-4 py-2 text-xs font-semibold"
          >
            Start Case Taking ✨
          </button>
        </div>
      </div>

      {/* Navigation Pills Bar */}
      <div className="flex flex-wrap gap-2 rounded-2xl bg-white/70 p-1.5 border border-slate-200/80 shadow-xs backdrop-blur-sm">
        {(
          [
            ["overview", "🌟 Dashboard Overview"],
            ["intake", "📋 AI Case Taking"],
            ["documents", `📄 Documents & OCR (${documentExtracts?.length ?? 0})`],
            ["symptoms", "🩺 Symptoms Log"],
            ["lifestyle", "🌿 Ahara-Vihara"],
            ["plans", "💊 Care & Diet Plans"],
            ["adherence", "✅ Check-ins"],
            ["book", "🗓️ Follow-up"],
            ["messages", "💬 Messages"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              tab === id
                ? "bg-[#1b343f] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: MINDNEST DASHBOARD OVERVIEW */}
      {tab === "overview" ? (
        <div className="space-y-6">
          {/* Top Row: Hero Banner & Health Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Hero Banner (Join Our Meditation Class / Ayurvedic Care) */}
            <div className="lg:col-span-6 rounded-3xl bg-gradient-to-br from-[#18313c] via-[#234452] to-[#2d5567] text-white p-7 md:p-8 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[300px]">
              {/* Background ambient lighting */}
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
              <div className="absolute right-0 bottom-0 opacity-25 pointer-events-none select-none">
                <svg width="240" height="240" viewBox="0 0 200 200" fill="none">
                  <circle cx="100" cy="100" r="80" stroke="white" strokeWidth="2" strokeDasharray="6 6" />
                  <path d="M100 40 C70 80, 70 120, 100 160 C130 120, 130 80, 100 40 Z" fill="white" fillOpacity="0.3" />
                  <circle cx="100" cy="70" r="16" fill="white" fillOpacity="0.4" />
                </svg>
              </div>

              <div className="relative z-10 space-y-3 max-w-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium backdrop-blur-md">
                  <span>🌿</span> AYUSH Holistic Care
                </span>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug text-white">
                  Join Our Daily Dinacharya & Meditation Class
                </h2>
                <p className="text-xs text-slate-200/90 leading-relaxed">
                  Guided Pranayama, Ahara balance, and Dosha-specific holistic wellness for your mind and body.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setTab("intake")}
                    className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-5 py-2.5 text-xs font-semibold transition-all border border-white/30 shadow-xs"
                  >
                    Join Now
                  </button>
                </div>
              </div>

              <div className="relative z-10 pt-6 flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-200 text-[10px] font-bold text-slate-800 border-2 border-[#18313c]">🧘‍♀️</div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-200 text-[10px] font-bold text-slate-800 border-2 border-[#18313c]">🌿</div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-slate-800 border-2 border-[#18313c]">🍵</div>
                </div>
                <div>
                  <p className="text-xs font-bold text-white">9K+ Members</p>
                  <p className="text-[10px] text-slate-300">Active Ayush Patients</p>
                </div>
              </div>
            </div>

            {/* Health & Dosha Overview Card */}
            <div className="lg:col-span-6 rounded-3xl bg-white p-7 md:p-8 shadow-sm border border-slate-100/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🫀</span>
                    <p className="font-bold text-sm text-slate-800">Health & Dosha Overview</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 font-mono text-[10px] font-semibold text-emerald-700 border border-emerald-100">
                    ● Steady Vitals
                  </span>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-bold tracking-tight text-slate-900">88</p>
                      <p className="font-mono text-sm text-slate-500 font-medium">bpm</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed">
                      Your heart rate & Vata-Pitta equilibrium are steady and healthy today.
                    </p>
                  </div>

                  {/* Anatomical / Ayurvedic Indicator */}
                  <div className="relative flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ebf5fa] to-[#d6ebf5] border border-sky-100">
                    <div className="text-center">
                      <span className="text-3xl">🫀</span>
                      <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-sky-900 mt-1">Vata-Pitta</p>
                    </div>
                    <span className="absolute -top-2 -right-2 rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[9px] font-bold text-white shadow-xs">
                      110/80
                    </span>
                    <span className="absolute -bottom-2 -left-2 rounded-full bg-sky-100 px-2 py-0.5 font-mono text-[9px] font-bold text-sky-800 border border-sky-200">
                      75-92 bpm
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setTab("intake")}
                  className="rounded-full bg-[#cde4f0] hover:bg-[#b8daec] text-slate-900 px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  Improve Health ✨
                </button>

                {/* Organ / Dosha selector pills */}
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                  {(
                    [
                      ["vata", "🫀 Vata"],
                      ["pitta", "🧠 Pitta"],
                      ["kapha", "🫁 Kapha"],
                      ["dashavidha", "🩺 Dashavidha"],
                    ] as const
                  ).map(([d, label]) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDosha(d)}
                      className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        selectedDosha === d
                          ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Grid: 3 Metric & Routine Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Calories / Ahara Intake Card */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔥</span>
                    <p className="font-bold text-sm text-slate-800">Calories & Ahara</p>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">Target 2,100</span>
                </div>

                {/* Histogram / Bar Graphic */}
                <div className="mt-4 flex items-end justify-between gap-1 h-24 px-1">
                  {[45, 60, 35, 75, 90, 50, 65, 80, 40, 70, 85, 95, 60, 80].map((h, i) => (
                    <div
                      key={i}
                      className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80"
                      style={{
                        height: `${h}%`,
                        backgroundColor: i % 2 === 0 ? "#9ecfe4" : "#2d5567",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-900">1858 <span className="text-xs font-normal text-slate-500">Kcl</span></p>
                  <p className="text-[11px] text-slate-400">Balanced Ahara intake today</p>
                </div>
                <button onClick={() => setTab("lifestyle")} className="text-xs font-semibold text-sky-700 hover:underline">
                  Log meal →
                </button>
              </div>
            </div>

            {/* 2. Hydration Status Card */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💧</span>
                    <p className="font-bold text-sm text-slate-800">Hydration Status</p>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">Goal 2,200 ml</span>
                </div>

                <div className="mt-3">
                  <p className="text-2xl font-bold text-slate-900">{waterLogged} <span className="text-xs font-normal text-slate-500">ml</span></p>
                  <p className="text-xs text-slate-500">{Math.round((waterLogged / 2200) * 100)}% Completed</p>
                </div>

                {/* Water Fluid Wave Graphic */}
                <div className="mt-4 relative h-16 w-full overflow-hidden rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center">
                  <div className="absolute inset-0 opacity-40">
                    <svg className="w-full h-full" viewBox="0 0 100 25" preserveAspectRatio="none">
                      <path d="M0 10 C 20 20, 40 0, 60 10 C 80 20, 100 5, 100 25 L 0 25 Z" fill="#0284c7" />
                    </svg>
                  </div>
                  <span className="relative z-10 text-xs font-bold text-sky-900">
                    🌊 USHODAKA (Warm Water)
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[11px] text-slate-400">Keeps Pitta & Agni pure</p>
                <button
                  onClick={() => setWaterLogged((w) => Math.min(3000, w + 250))}
                  className="rounded-full bg-sky-100 hover:bg-sky-200 text-sky-800 px-3 py-1 text-xs font-semibold transition-colors"
                >
                  +250 ml
                </button>
              </div>
            </div>

            {/* 3. Dinacharya / Daily Care Schedule Card */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 flex flex-col justify-between">
              <div>
                {/* Day selector tabs */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  {(["Sat", "Sun", "Mon", "Tue", "Wed"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setActiveDay(d)}
                      className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                        activeDay === d
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-400 hover:text-slate-800"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                {/* Routine Items */}
                <div className="mt-3 space-y-2.5">
                  {/* Item 1 */}
                  <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sm">🧘‍♀️</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-slate-900 truncate">Pranayama / Dhyana</p>
                        <p className="text-[10px] text-slate-400">⏱️ 5 mins · Beginner</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setRoutineDone((r) => ({ ...r, "pull-up": !r["pull-up"] }))}
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        routineDone["pull-up"]
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "border border-slate-300 text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      {routineDone["pull-up"] ? "✓" : ""}
                    </button>
                  </div>

                  {/* Item 2 */}
                  <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-sm">🍵</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-slate-900 truncate">Triphala Kashaya</p>
                        <p className="text-[10px] text-slate-400">⏱️ Morning · Ahara</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setRoutineDone((r) => ({ ...r, "sit-up": !r["sit-up"] }))}
                      className="rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1 text-[11px] font-semibold transition-colors"
                    >
                      {routineDone["sit-up"] ? "✓ Done" : "Start"}
                    </button>
                  </div>

                  {/* Item 3 */}
                  <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-sm">🚶‍♂️</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-slate-900 truncate">Surya Namaskar</p>
                        <p className="text-[10px] text-slate-400">⏱️ 10 mins · Moderate</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setRoutineDone((r) => ({ ...r, "squat": !r["squat"] }))}
                      className="rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1 text-[11px] font-semibold transition-colors"
                    >
                      {routineDone["squat"] ? "✓ Done" : "Start"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 2: AI CASE TAKING (Intake) */}
      {tab === "intake" ? (
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <p className="font-mono text-xs text-slate-400 uppercase tracking-wider">Ayurvedic Case Taking</p>
            <h2 className="text-xl font-bold text-slate-900">Clinical Intake Wizard</h2>
            <p className="text-xs text-slate-500">
              Bound visits: {visits?.length ?? 0}. Same engine as /kiosk, linked to your account.
            </p>
          </div>
          {intake}
        </div>
      ) : null}

      {/* TAB 3: PHYSICAL DOCUMENTS & OCR PIPELINE */}
      {tab === "documents" ? (
        <section className="space-y-4">
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90">
            <p className="font-mono text-xs text-slate-400 uppercase tracking-wider">Physical Documents & OCR</p>
            <h2 className="text-xl font-bold text-slate-900">Prescriptions, Lab Sheets & External Scans</h2>
            <p className="mt-1 text-xs text-slate-500">
              Upload physical records from past visits or external clinics. OCR extracts candidate text for your doctor to review. Content is never automatically merged into your active medications without doctor verification.
            </p>
          </div>

          <DocumentPipelinePanel
            extracts={documentExtracts ?? []}
            onUpload={handlePatientUpload}
            viewMode="patient"
          />

        </section>
      ) : null}

      {/* TAB 4: SYMPTOMS TIMELINE */}
      {tab === "symptoms" ? (
        <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Symptom Log</h2>
            <p className="text-xs text-slate-500">Record current pain, digestive discomfort, or sleep patterns.</p>
          </div>
          <textarea
            className="tl-input"
            rows={3}
            placeholder="Describe what you are experiencing..."
            value={symptomText}
            onChange={(e) => setSymptomText(e.target.value)}
          />
          <label className="block font-mono text-xs text-slate-600">
            Severity ({severity}/10)
            <input
              type="range"
              min={0}
              max={10}
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <button
            className="btn-pulse px-4 py-2 text-xs"
            onClick={async () => {
              if (!symptomText.trim()) return;
              await logSymptom({ sessionUserId, text: symptomText, severity });
              setSymptomText("");
            }}
          >
            Log Symptom
          </button>
          <ol className="space-y-2 pt-2">
            {symptoms?.map((s) => (
              <li key={s._id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="font-mono text-[10px] text-slate-400">
                  {new Date(s.createdAt).toLocaleString()} · Severity {s.severity}/10
                </span>
                <p className="text-sm text-slate-800 mt-0.5">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* TAB 5: AHARA-VIHARA LIFESTYLE */}
      {tab === "lifestyle" ? (
        <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Ahara-Vihara (Diet & Daily Regimen)</h2>
            <p className="text-xs text-slate-500">
              Last saved {lifestyle ? new Date(lifestyle.updatedAt).toLocaleString() : "never"}.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(
              [
                ["mealTimes", "Meal Times & Routines"],
                ["dietType", "Diet Type (Satvik / Rajasik / Tamasik)"],
                ["sleep", "Sleep Schedule (Nidra)"],
                ["waterIntake", "Water & Ushodaka Intake"],
                ["teaCoffeeSubstances", "Tea / Coffee / Other Substances"],
                ["notes", "Additional Lifestyle Notes"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-xs font-semibold text-slate-700">{label}</span>
                <input
                  className="tl-input mt-1"
                  defaultValue={lifestyle?.[key] ?? ""}
                  onChange={(e) => setLife((l) => ({ ...l, [key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <button
            className="btn-pulse px-5 py-2.5 text-xs"
            onClick={() =>
              void upsertLifestyle({
                sessionUserId,
                mealTimes: life.mealTimes || lifestyle?.mealTimes || "",
                dietType: life.dietType || lifestyle?.dietType || "",
                sleep: life.sleep || lifestyle?.sleep || "",
                waterIntake: life.waterIntake || lifestyle?.waterIntake || "",
                teaCoffeeSubstances: life.teaCoffeeSubstances || lifestyle?.teaCoffeeSubstances || "",
                notes: life.notes || lifestyle?.notes || "",
              })
            }
          >
            Save Lifestyle Regimen
          </button>
        </section>
      ) : null}

      {/* TAB 6: CARE & DIET PLANS */}
      {tab === "plans" ? (
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90">
            <h2 className="text-lg font-bold text-slate-900">Practitioner-Approved Care</h2>
            {care?.length === 0 ? <p className="mt-2 text-xs text-slate-400">None shared yet.</p> : null}
            {care?.map((p) => (
              <article key={p._id} className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5">
                  {p.status}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{p.title}</h3>
                <p className="whitespace-pre-wrap text-xs text-slate-600 mt-1">{p.body}</p>
              </article>
            ))}
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90">
            <h2 className="text-lg font-bold text-slate-900">Diet & Nutrition Plans</h2>
            <p className="text-xs text-slate-400">Visible once approved by your practitioner.</p>
            {diet?.map((p) => (
              <article key={p._id} className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold px-2.5 py-0.5">
                  {p.practitionerApproved ? "practitioner approved" : "shareable"}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{p.title}</h3>
                <p className="text-xs text-slate-600 mt-1">{p.notes}</p>
                <div className="mt-2 space-y-1">
                  {p.meals.map((m) => (
                    <p key={m._id} className="font-mono text-xs text-slate-700">
                      <span className="font-bold">{m.label}:</span> {m.itemsText}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* TAB 7: ADHERENCE CHECK-INS */}
      {tab === "adherence" ? (
        <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Daily Adherence Check-In</h2>
            <p className="text-xs text-slate-500">Confirm you took your herbs and followed your Ahara-Vihara advice.</p>
          </div>
          <textarea
            className="tl-input"
            rows={2}
            placeholder="e.g. Took Triphala and completed morning Pranayama"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
          />
          <button
            className="btn-pulse px-4 py-2 text-xs font-semibold"
            onClick={async () => {
              await logAdherence({
                sessionUserId,
                kind: "checkin",
                note: checkin || "Followed today",
                done: true,
              });
              setCheckin("");
            }}
          >
            Log Check-In
          </button>
          <ul className="space-y-2 pt-2">
            {adherence?.map((a) => (
              <li key={a._id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-xs text-slate-700">
                {new Date(a.createdAt).toLocaleString()} · {a.kind} · <span className="font-bold text-emerald-700">{a.done ? "✓ done" : "missed"}</span> · {a.note}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* TAB 8: BOOK FOLLOW-UP */}
      {tab === "book" ? (
        <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-4 max-w-xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Book Follow-up Consultation</h2>
            <p className="text-xs text-slate-500">Request an in-clinic or telemedicine OPD slot with a practitioner.</p>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="font-mono text-[11px] font-bold text-slate-600 uppercase">Select Doctor / Practitioner</span>
              <select
                className="tl-input mt-1"
                value={practId}
                onChange={(e) => setPractId(e.target.value as Id<"users">)}
              >
                <option value="">Select Practitioner</option>
                {practitioners?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-mono text-[11px] font-bold text-slate-600 uppercase">Preferred Date & Time</span>
              <input
                className="tl-input mt-1"
                type="datetime-local"
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="font-mono text-[11px] font-bold text-slate-600 uppercase">
                WhatsApp Number for Instant Alerts 📲
              </span>
              <input
                className="tl-input mt-1"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="wa-check"
                type="checkbox"
                checked={sendWhatsAppAlert}
                onChange={(e) => setSendWhatsAppAlert(e.target.checked)}
                className="rounded border-slate-300 text-[#1b343f] focus:ring-sky-500"
              />
              <label htmlFor="wa-check" className="text-xs font-medium text-slate-700 cursor-pointer">
                Send appointment confirmation & reminders to my WhatsApp
              </label>
            </div>
          </div>

          <button
            className="btn-pulse px-5 py-2.5 text-xs font-semibold"
            onClick={async () => {
              if (!practId || !slot) return;
              try {
                const selectedPractitioner = practitioners?.find((p) => p._id === practId);
                const scheduledTime = new Date(slot).getTime();

                await requestAppointment({
                  sessionUserId,
                  practitionerUserId: practId,
                  scheduledAt: scheduledTime,
                  notes: "Follow-up consultation",
                  patientPhone: phone,
                  channel: "web",
                });

                if (sendWhatsAppAlert && (phone || process.env.NEXT_PUBLIC_DEFAULT_PATIENT_PHONE)) {
                  fetch("/api/twilio/send-whatsapp", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      to: phone,
                      patientName: displayName,
                      practitionerName: selectedPractitioner?.displayName || "Practitioner",
                      scheduledAt: scheduledTime,
                      status: "requested",
                      notes: "Follow-up consultation",
                    }),
                  }).catch((err) => console.warn("WhatsApp alert trigger error:", err));
                }

                setBookingNotice("✅ Appointment requested successfully! WhatsApp alert dispatched.");
                setTimeout(() => setBookingNotice(""), 6000);
              } catch (err) {
                setBookingNotice(err instanceof Error ? err.message : "Appointment booking failed");
              }
            }}
          >
            Request Appointment Slot
          </button>

          {bookingNotice && (
            <div className="rounded-2xl bg-emerald-50 p-3 text-xs font-medium text-emerald-900 border border-emerald-200">
              {bookingNotice}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="font-mono text-xs font-bold text-slate-700 uppercase tracking-wider">
              Your Scheduled Appointments ({appointments?.length ?? 0})
            </p>
            <ul className="mt-3 space-y-2.5">
              {appointments?.map((a) => (
                <li
                  key={a._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {new Date(a.scheduledAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                          a.channel === "whatsapp"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {a.channel === "whatsapp" ? "📲 WhatsApp" : "🌐 Web Portal"}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      Doctor: <strong className="text-slate-700">{a.practitionerName || "Assigned Doctor"}</strong>
                      {a.patientPhone ? ` · Alert to: ${a.patientPhone}` : ""}
                    </p>
                  </div>

                  <span
                    className={`self-start sm:self-auto rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${
                      a.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-800"
                        : a.status === "completed"
                          ? "bg-slate-200 text-slate-700"
                          : a.status === "cancelled"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}


      {/* TAB 9: MESSAGES */}
      {tab === "messages" ? (
        <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Clinic Messages</h2>
              <p className="text-xs text-slate-500">Direct questions and check-ins with your care team.</p>
            </div>
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-2xl">
              <button
                className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
                  toRole === "practitioner" ? "bg-[#1b343f] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setToRole("practitioner")}
              >
                Practitioner
              </button>
              <button
                className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
                  toRole === "dietitian" ? "bg-[#1b343f] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setToRole("dietitian")}
              >
                Dietitian
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-100 max-h-64 space-y-2 overflow-auto p-4">
            {messages?.length === 0 ? <p className="text-xs text-slate-400">No messages in this thread yet.</p> : null}
            {messages?.map((m) => (
              <div key={m._id} className="text-xs bg-white p-3 rounded-xl border border-slate-100">
                <span className="font-mono text-[10px] text-slate-400">
                  {m.fromName} → {m.toRole}
                </span>
                <p className="text-slate-800 mt-1">{m.body}</p>
              </div>
            ))}
          </div>

          <textarea
            className="tl-input"
            rows={2}
            placeholder="Type your message here..."
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
          <button
            className="btn-pulse px-4 py-2 text-xs font-semibold"
            onClick={async () => {
              if (!msg.trim()) return;
              await sendMessage({ sessionUserId, toRole, body: msg });
              setMsg("");
            }}
          >
            Send Message
          </button>
        </section>
      ) : null}
    </div>
  );
}

