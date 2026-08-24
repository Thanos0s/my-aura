"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { DocumentPipelinePanel } from "./DocumentPipelinePanel";
import { ClinicMapLocator, type ClinicLocation, NEARBY_CLINICS } from "./ClinicMapLocator";
import type { DocumentKind } from "@/lib/documents/metadata";
import {
  LayoutDashboard,
  Bot,
  FileText,
  Activity,
  Leaf,
  Pill,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Search,
  Sparkles,
  Clock,
  Video,
  Building2,
  Home,
  Stethoscope,
  Smartphone,
  AlertCircle,
  Droplets,
  Utensils,
  X,
  Edit2,
} from "lucide-react";


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

type ConsultationMode = "in_clinic" | "telehealth" | "home_visit";

export function PatientStation({
  sessionUserId,
  displayName,
  intake,
}: {
  sessionUserId: Id<"users">;
  displayName: string;
  intake: ReactNode;
}) {
  // null = still loading visits; "intake" for new patients; "overview" for returning
  const [tab, setTab] = useState<Tab | null>(null);
  const [tabDecided, setTabDecided] = useState(false);
  const [routineDone, setRoutineDone] = useState<Record<string, boolean>>({ "morning-walk": true, "warm-water": true });
  const [waterLogged, setWaterLogged] = useState(1250);
  const [searchQuery, setSearchQuery] = useState("");


  // Food browser state
  const [foodSearch, setFoodSearch] = useState("");
  const [foodCategory, setFoodCategory] = useState("All");
  const [foodDoshaFilter, setFoodDoshaFilter] = useState<"all" | "vata" | "pitta" | "kapha">("all");
  const [selectedFood, setSelectedFood] = useState<string | null>(null);
  const [plansView, setPlansView] = useState<"plans" | "foods">("plans");

  // Appointment Booking Enhanced State
  const [consultMode, setConsultMode] = useState<ConsultationMode>("in_clinic");
  const [selectedClinic, setSelectedClinic] = useState<ClinicLocation>(NEARBY_CLINICS[0]!);

  const [selectedDateQuick, setSelectedDateQuick] = useState<"today" | "tomorrow" | "in_2_days" | "custom">("tomorrow");

  const [selectedTimeSlot, setSelectedTimeSlot] = useState("10:30 AM");
  const [bookingSuccessModal, setBookingSuccessModal] = useState(false);

  const args = { sessionUserId };
  const symptoms = useQuery(api.clinical.listSymptoms, args);
  const care = useQuery(api.clinical.listCarePlans, args);
  const diet = useQuery(api.diet.listDietPlans, args);
  const adherence = useQuery(api.clinical.listAdherence, args);
  const appointments = useQuery(api.clinical.listAppointments, args);
  const practitioners = useQuery(api.auth.listPractitioners, args);
  const messages = useQuery(api.messaging.listMessages, args);
  const visits = useQuery(api.visits.listPatientVisits, args);
  const documentExtracts = useQuery(api.documents.listPatientDocumentExtracts, args);

  // Lazy load foods database only when needed
  const allFoods = useQuery(
    api.foods.listFoods,
    tab === "plans" ? {} : "skip"
  );

  // Smart default tab: new patient (no visits) -> AI Case Taking; returning patient -> Dashboard
  useEffect(() => {
    if (tabDecided) return;
    if (visits === undefined) return;
    setTabDecided(true);
    if (visits.length === 0) {
      setTab("intake");
    } else {
      setTab("overview");
    }
  }, [visits, tabDecided]);

  function goTab(t: Tab) {
    setTabDecided(true);
    setTab(t);
  }

  const activeTab = tab ?? "overview";

  const logSymptom = useMutation(api.clinical.logSymptom);
  const logAdherence = useMutation(api.clinical.logAdherence);

  const requestAppointment = useMutation(api.clinical.requestAppointment);
  const sendMessage = useMutation(api.messaging.sendMessage);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const attachDocument = useMutation(api.documents.attachDocument);
  const startVisit = useMutation(api.visits.startVisit);
  const updateName = useMutation(api.auth.updateProfileName);

  // Derived food categories
  const foodCategories = useMemo(() => {
    if (!allFoods) return ["All"];
    const cats = Array.from(new Set(allFoods.map((f) => f.category)));
    return ["All", ...cats.sort()];
  }, [allFoods]);

  // Filtered foods
  const filteredFoods = useMemo(() => {
    if (!allFoods) return [];
    return allFoods.filter((f) => {
      if (foodSearch.trim()) {
        const q = foodSearch.toLowerCase();
        const matchesName = f.name.toLowerCase().includes(q);
        const matchesCat = f.category.toLowerCase().includes(q);
        const matchesTaste = f.taste?.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesCat && !matchesTaste) return false;
      }
      if (foodCategory !== "All" && f.category !== foodCategory) return false;
      if (foodDoshaFilter !== "all") {
        if (f.dosha?.[foodDoshaFilter] !== "decrease") return false;
      }
      return true;
    });
  }, [allFoods, foodSearch, foodCategory, foodDoshaFilter]);

  const selectedFoodItem = useMemo(() => {
    if (!selectedFood || !allFoods) return null;
    return allFoods.find((f) => f._id === selectedFood) || null;
  }, [selectedFood, allFoods]);

  // Form states
  const [symForm, setSymForm] = useState({
    name: "",
    severity: 5,
    startedAt: new Date().toISOString().slice(0, 16),
    location: "",
    character: "",
    radiation: "",
    notes: "",
  });
  const [checkin, setCheckin] = useState("");
  const [msg, setMsg] = useState("");
  const [toRole, setToRole] = useState<"practitioner" | "dietitian">("practitioner");
  const [slot, setSlot] = useState("");

  const [practId, setPractId] = useState<Id<"users"> | "">("");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [sendWhatsAppAlert, setSendWhatsAppAlert] = useState(true);
  const [bookingNotice, setBookingNotice] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [customName, setCustomName] = useState(displayName);
  const [useManualDoctor, setUseManualDoctor] = useState(false);
  const [manualDoctorName, setManualDoctorName] = useState("");

  // Calculate target date based on quick selector
  useEffect(() => {
    const d = new Date();
    if (selectedDateQuick === "tomorrow") {
      d.setDate(d.getDate() + 1);
    } else if (selectedDateQuick === "in_2_days") {
      d.setDate(d.getDate() + 2);
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    
    // Parse time slot
    let hours = 10;
    let mins = 30;
    const parts = selectedTimeSlot.replace(/ (AM|PM)/i, "").split(":");
    const hStr = parts[0] ?? "10";
    const mStr = parts[1] ?? "30";
    if (selectedTimeSlot.includes("PM")) {
      hours = (parseInt(hStr, 10) % 12) + 12;
      mins = parseInt(mStr, 10);
    } else {
      hours = parseInt(hStr, 10) % 12;
      mins = parseInt(mStr, 10);
    }

    const hh = String(hours).padStart(2, "0");
    const minStr = String(mins).padStart(2, "0");
    setSlot(`${yyyy}-${mm}-${dd}T${hh}:${minStr}`);
  }, [selectedDateQuick, selectedTimeSlot]);

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
            prakriti: { value: "", status: "unasked", confidence: 1, source: "patient" },
            vikriti: { value: "", status: "unasked", confidence: 1, source: "patient" },
            agni: { value: "", status: "unasked", confidence: 1, source: "patient" },
            satva: { value: "", status: "unasked", confidence: 1, source: "patient" },
            sara: { value: "", status: "unasked", confidence: 1, source: "patient" },
            samhanana: { value: "", status: "unasked", confidence: 1, source: "patient" },
            pramana: { value: "", status: "unasked", confidence: 1, source: "patient" },
            satmya: { value: "", status: "unasked", confidence: 1, source: "patient" },
            vyayamaShakti: { value: "", status: "unasked", confidence: 1, source: "patient" },
            vaya: { value: "", status: "unasked", confidence: 1, source: "patient" },
          },
          history: {
            chronicConditions: { value: "", status: "unasked", confidence: 1, source: "patient" },
            surgeries: { value: "", status: "unasked", confidence: 1, source: "patient" },
            currentMedicines: { value: "none known", status: "unasked", confidence: 1, source: "patient" },
            allergies: { value: "none known", status: "unasked", confidence: 1, source: "patient" },
            familyHistory: { value: "", status: "unasked", confidence: 1, source: "patient" },
            substanceUse: { value: "", status: "unasked", confidence: 1, source: "patient" },
            occupation: { value: "", status: "unasked", confidence: 1, source: "patient" },
          },
          ros: {},
          aharaVihara: {
            mealTimes: { value: "", status: "unasked", confidence: 1, source: "patient" },
            dietType: { value: "", status: "unasked", confidence: 1, source: "patient" },
            sleep: { value: "", status: "unasked", confidence: 1, source: "patient" },
            waterIntake: { value: "", status: "unasked", confidence: 1, source: "patient" },
            teaCoffeeSubstances: { value: "", status: "unasked", confidence: 1, source: "patient" },
          },
          redFlags: {},
          redFlagEvents: [],
        }),
      });
    }

    await attachDocument({
      visitId: activeVisitId,
      storageId: json.storageId,
      kind,
      rawText: ocrData.text || "",
      structuredJson: JSON.stringify(ocrData.structured || {}),
      confidence: ocrData.confidence || 0,
      failed: !!ocrData.failed,
    });
  }


  // Doctor List with specialties
  const doctorSpecialties = [
    { name: "Dr. Rajesh Sharma, MD (Ayurveda)", specialty: "Ayurveda & Chronic Care", exp: "14 yrs", fee: "₹500 / Free with ABHA" },
    { name: "Dr. Ananya Iyer, BAMS, Panchakarma Sp.", specialty: "Panchakarma & Nadi Pariksha", exp: "9 yrs", fee: "₹600" },
    { name: "Dr. Vikram Sethi, MBBS, MD (Medicine)", specialty: "General Medicine & Diabetes", exp: "18 yrs", fee: "₹750" },
    { name: "Dr. Pooja Deshmukh, MSc (Clinical Dietetics)", specialty: "Ahara-Vihara & Nutrition", exp: "8 yrs", fee: "₹400" },
  ];

  return (
    <div className="space-y-6 max-w-[1320px] mx-auto pb-16">
      {/* Top Header / Greeting Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2 py-0.5">
                <input
                  type="text"
                  className="rounded-xl border border-slate-300 px-3 py-1 text-sm text-slate-800 font-semibold focus:outline-none focus:border-sky-500 bg-white"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter full name"
                  autoFocus
                />
                <button
                  className="rounded-xl bg-[#1b343f] px-3 py-1 text-xs font-semibold text-white hover:bg-[#274d5d]"
                  onClick={async () => {
                    if (!customName.trim()) return;
                    await updateName({ sessionUserId, displayName: customName.trim() });
                    setIsEditingName(false);
                  }}
                >
                  Save
                </button>
                <button
                  className="rounded-xl bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                  onClick={() => setIsEditingName(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-base font-medium text-slate-500 flex items-center gap-2">
                Good Day, <strong className="text-slate-900 font-bold">{displayName}</strong>
                <button
                  className="text-xs text-sky-700 hover:text-sky-900 font-medium px-2 py-0.5 rounded-lg hover:bg-sky-50 transition-colors inline-flex items-center gap-1"
                  onClick={() => {
                    setCustomName(displayName);
                    setIsEditingName(true);
                  }}
                  title="Change profile name"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Edit Name</span>
                </button>
              </p>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mt-1">
            How is your health balance today?
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search health records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-full border border-slate-200 bg-white/95 px-4 py-2.5 pl-10 text-sm shadow-xs placeholder:text-slate-400 focus:border-sky-400 focus:outline-none w-56 md:w-64"
            />
          </div>
          <button
            onClick={() => goTab("intake")}
            className="btn-pulse px-5 py-2.5 text-sm font-bold flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4 text-sky-300" />
            <span>Start Case Taking</span>
          </button>
        </div>
      </div>

      {/* Navigation Pills Bar with Clean Lucide Icons (No Emojis) */}
      <div className="flex flex-wrap gap-2 rounded-2xl bg-white/80 p-2 border border-slate-200/80 shadow-xs backdrop-blur-md">
        {(
          [
            ["overview", "Dashboard Overview", LayoutDashboard],
            ["intake", "AI Case Taking", Bot],
            ["documents", `Documents & OCR (${documentExtracts?.length ?? 0})`, FileText],
            ["symptoms", "Symptoms Log", Activity],
            ["lifestyle", "Ahara-Vihara Routine", Leaf],
            ["plans", "Care & Diet Plans", Pill],
            ["adherence", "Check-ins", CheckCircle2],
            ["book", "Book Consultation & Map", Calendar],
            ["messages", "Messages", MessageSquare],
          ] as const
        ).map(([id, label, IconComponent]) => (
          <button
            key={id}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === id
                ? "bg-[#1b343f] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            onClick={() => goTab(id)}
          >
            <IconComponent className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase font-mono">
                <span>Active Care Plans</span>
                <Pill className="h-4 w-4 text-sky-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{care?.length ?? 0}</p>
              <p className="text-xs text-slate-500">Prescribed by practitioner</p>
            </div>

            <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase font-mono">
                <span>Diet &amp; Nutrition</span>
                <Utensils className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{diet?.length ?? 0}</p>
              <p className="text-xs text-slate-500">Clinical Ayurvedic meal plans</p>
            </div>

            <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase font-mono">
                <span>Logged Symptoms</span>
                <Activity className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{symptoms?.length ?? 0}</p>
              <p className="text-xs text-slate-500">Active health signals</p>
            </div>

            <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase font-mono">
                <span>Upcoming Visits</span>
                <Calendar className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{appointments?.length ?? 0}</p>
              <p className="text-xs text-slate-500">Scheduled consultations</p>
            </div>
          </div>

          {/* Quick Action Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-[#1b343f] to-[#254b5c] p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold text-sky-200 border border-white/20">
                <Sparkles className="h-3.5 w-3.5 text-sky-300" />
                <span>Next-Gen Smart OPD</span>
              </span>
              <h3 className="text-xl font-bold text-white">Need a clinical evaluation or new prescription?</h3>
              <p className="text-sm text-slate-200">
                Speak directly with the voice chatbot for instant case-taking or book an in-clinic OPD slot.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <button
                onClick={() => goTab("intake")}
                className="rounded-2xl bg-white text-[#1b343f] hover:bg-sky-50 px-5 py-2.5 text-sm font-bold shadow-sm transition-all"
              >
                Launch Voice Intake
              </button>
              <button
                onClick={() => goTab("book")}
                className="rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/30 px-5 py-2.5 text-sm font-semibold transition-all"
              >
                Find Nearest Clinic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTAKE */}
      {activeTab === "intake" && (
        <div>{intake}</div>
      )}

      {/* TAB 3: DOCUMENTS */}
      {activeTab === "documents" && (
        <DocumentPipelinePanel
          extracts={documentExtracts}
          onUpload={handlePatientUpload}
          viewMode="patient"
        />
      )}


      {/* TAB 4: SYMPTOMS */}
      {activeTab === "symptoms" && (
        <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-6 max-w-3xl">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Symptoms &amp; Clinical Journal</h2>
            <p className="text-sm text-slate-500">Record current discomfort, intensity, and location for your doctor.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold uppercase font-mono text-slate-600">Symptom / Discomfort</span>
              <input
                className="tl-input mt-1"
                placeholder="e.g. Sharp pain in lower abdomen"
                value={symForm.name}
                onChange={(e) => setSymForm({ ...symForm, name: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase font-mono text-slate-600">
                Severity Scale (1 to 10): {symForm.severity}
              </span>
              <input
                type="range"
                min="1"
                max="10"
                className="w-full mt-3"
                value={symForm.severity}
                onChange={(e) => setSymForm({ ...symForm, severity: Number(e.target.value) })}
              />
            </label>
          </div>

          <button
            className="btn-pulse px-6 py-2.5 text-sm font-bold"
            onClick={async () => {
              if (!symForm.name.trim()) return;
              await logSymptom({
                sessionUserId,
                text: symForm.name.trim(),
                severity: symForm.severity,
              });
              setSymForm({
                name: "",
                severity: 5,
                startedAt: new Date().toISOString().slice(0, 16),
                location: "",
                character: "",
                radiation: "",
                notes: "",
              });
            }}
          >
            Save Symptom Entry
          </button>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 uppercase font-mono mb-3">Logged History</h4>
            <div className="space-y-2">
              {symptoms?.map((s) => (
                <div key={s._id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-slate-900">{s.text}</span>
                    <p className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleDateString()} · Intensity {s.severity}/10</p>
                  </div>
                  <span className="rounded-full bg-amber-100 text-amber-900 px-3 py-0.5 text-xs font-bold">
                    Recorded
                  </span>
                </div>
              ))}
            </div>
          </div>

        </section>
      )}

      {/* TAB 5: LIFESTYLE */}
      {activeTab === "lifestyle" && (
        <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-6 max-w-3xl">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Ahara-Vihara (Ayurvedic Routine)</h2>
            <p className="text-sm text-slate-500">Track hydration, dinacharya rituals, and restful sleep.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-sky-50/60 border border-sky-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-sky-950 flex items-center gap-1.5">
                  <Droplets className="h-4 w-4 text-sky-600" />
                  Daily Water Intake
                </span>
                <span className="font-mono text-sm font-bold text-sky-800">{waterLogged} ml / 2500 ml</span>
              </div>
              <div className="w-full bg-white rounded-full h-3 overflow-hidden border border-sky-200">
                <div className="bg-sky-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (waterLogged / 2500) * 100)}%` }} />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-sky-800 border border-sky-200 hover:bg-sky-100 shadow-2xs"
                  onClick={() => setWaterLogged((w) => w + 250)}
                >
                  +250 ml (1 Glass)
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-sky-800 border border-sky-200 hover:bg-sky-100 shadow-2xs"
                  onClick={() => setWaterLogged((w) => w + 500)}
                >
                  +500 ml (Bottle)
                </button>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-emerald-50/60 border border-emerald-100 space-y-2">
              <span className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                <Leaf className="h-4 w-4 text-emerald-600" />
                Dinacharya Daily Rituals
              </span>
              <div className="space-y-1.5 pt-1">
                {(
                  [
                    ["warm-water", "Ushapan (Warm water on empty stomach)"],
                    ["morning-walk", "Pranayama / Morning Walk (20 mins)"],
                    ["timely-meals", "Ahara Timing (Lighter dinner before 8 PM)"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!routineDone[key]}
                      onChange={(e) => setRoutineDone((prev) => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded border-slate-300 text-emerald-700"
                    />
                    <span>{label}</span>
                  </label>
                ))}

              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 6: CARE & DIET PLANS + FOOD DATABASE */}
      {activeTab === "plans" && (
        <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Ayurvedic Nutrition &amp; Care Plans</h2>
              <p className="text-sm text-slate-500">Explore doctor-approved clinical diet plans and the 299-item Ayurvedic food database.</p>
            </div>

            <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  plansView === "plans"
                    ? "bg-[#1b343f] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setPlansView("plans")}
              >
                Care &amp; Diet Plans ({care?.length ?? 0})
              </button>
              <button
                type="button"
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  plansView === "foods"
                    ? "bg-[#1b343f] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setPlansView("foods")}
              >
                Food Database ({allFoods?.length ?? 299})
              </button>
            </div>
          </div>

          {/* Subview 1: Diet Plans */}
          {plansView === "plans" && (
            <div className="space-y-4">
              {care && care.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {care.map((c) => (
                    <div key={c._id} className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{c.title}</span>
                        <span className="rounded-full bg-emerald-100 text-emerald-900 px-2.5 py-0.5 text-xs font-bold">
                          Approved
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{c.body}</p>
                    </div>

                  ))}
                </div>
              ) : (
                <div className="rounded-3xl bg-slate-50 p-8 text-center border border-slate-200 space-y-3">
                  <Pill className="h-8 w-8 text-slate-400 mx-auto" />
                  <h4 className="text-base font-bold text-slate-800">No Prescribed Care Plans Yet</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Once your practitioner approves your clinical assessment, your tailored meal guidelines and rasayana therapy will appear here.
                  </p>
                  <button
                    onClick={() => setPlansView("foods")}
                    className="btn-pulse px-4 py-2 text-xs font-bold"
                  >
                    Browse Food Database Instead
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Subview 2: Food Browser */}
          {plansView === "foods" && (
            <div className="space-y-4">
              {/* Search & Dosha Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search 299 foods by name, category, or taste..."
                    value={foodSearch}
                    onChange={(e) => setFoodSearch(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {(
                    [
                      ["all", "All Doshas"],
                      ["vata", "Vata-Pacifying"],
                      ["pitta", "Pitta-Pacifying"],
                      ["kapha", "Kapha-Pacifying"],
                    ] as const
                  ).map(([d, label]) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFoodDoshaFilter(d)}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        foodDoshaFilter === d
                          ? "bg-[#1b343f] text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Food Categories Horizontal Scroll */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {foodCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFoodCategory(cat)}
                    className={`rounded-full px-3.5 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                      foodCategory === cat
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Selected Food Item Detail Panel */}
              {selectedFoodItem && (
                <div className="rounded-3xl bg-emerald-50/80 border border-emerald-200 p-5 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {selectedFoodItem.category} · {selectedFoodItem.energy || "Virya: Neutral"}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-1.5">{selectedFoodItem.name}</h3>
                      <p className="text-xs text-slate-700 leading-relaxed mt-0.5">{selectedFoodItem.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFood(null)}
                      className="rounded-full bg-white p-1 text-slate-400 hover:text-slate-600 border border-slate-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="bg-white p-2.5 rounded-2xl border border-emerald-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Rasa (Taste)</span>
                      <span className="text-xs font-bold text-slate-900">{selectedFoodItem.taste?.join(", ") || "Sweet"}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-2xl border border-emerald-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Virya (Potency)</span>
                      <span className="text-xs font-bold text-slate-900">{selectedFoodItem.energy || "Sheeta (Cooling)"}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-2xl border border-emerald-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Dosha Action</span>
                      <span className="text-xs font-bold text-emerald-800">
                        {selectedFoodItem.dosha ? Object.entries(selectedFoodItem.dosha).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(" | ") : "Tridoshic"}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-2xl border border-emerald-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Season / Kala</span>
                      <span className="text-xs font-bold text-slate-900">{selectedFoodItem.bestSeason?.join(", ") || "All Seasons"}</span>
                    </div>
                  </div>
                </div>

              )}

              {/* Food Items Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {filteredFoods.slice(0, 32).map((item) => (
                  <div
                    key={item._id}
                    onClick={() => setSelectedFood(item._id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      selectedFood === item._id
                        ? "bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                        : "bg-white border-slate-200/90 hover:border-sky-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span>{item.category}</span>
                      <span className="text-emerald-700">{item.energy || "Neutral"}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">{item.name}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.taste?.slice(0, 2).map((t) => (
                        <span key={t} className="rounded-md bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[10px] font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>
      )}

      {/* TAB 7: ADHERENCE */}
      {activeTab === "adherence" && (
        <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-4 max-w-2xl">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Treatment Check-ins &amp; Compliance</h2>
            <p className="text-sm text-slate-500">Record your daily adherence to medicines, herbs, and diet.</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Took Triphala before bed, feel lighter"
              value={checkin}
              onChange={(e) => setCheckin(e.target.value)}
              className="tl-input text-sm flex-1"
            />
            <button
              className="btn-pulse px-5 py-2.5 text-sm font-bold shrink-0"
              onClick={async () => {
                if (!checkin.trim()) return;
                await logAdherence({
                  sessionUserId,
                  kind: "checkin",
                  done: true,
                  note: checkin.trim(),
                });

                setCheckin("");
              }}
            >
              Log Entry
            </button>
          </div>

          <div className="space-y-2 pt-2">
            {adherence?.map((a) => (
              <div key={a._id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900">{a.note}</span>
                  <p className="text-[11px] text-slate-400">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 font-bold text-[11px]">
                  Completed
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 8: BOOK FOLLOW-UP & INTERACTIVE NEAREST CLINIC MAP */}
      {activeTab === "book" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200/90 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-mono text-xs font-bold text-sky-800 uppercase tracking-wider bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                  Doctor Consultations &amp; Telehealth
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-2">Book Follow-up &amp; Find Centers</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Schedule an in-person visit at the nearest accredited center or join an instant encrypted video OPD.
                </p>
              </div>

              {/* Consultation Mode Selector */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 shrink-0">
                {(
                  [
                    ["in_clinic", "In-Clinic OPD", Building2],
                    ["telehealth", "Video Telehealth", Video],
                    ["home_visit", "Home Care Visit", Home],
                  ] as const
                ).map(([mode, label, IconComp]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setConsultMode(mode)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                      consultMode === mode
                        ? "bg-[#1b343f] text-white shadow-xs"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-200"
                    }`}
                  >
                    <IconComp className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Nearest Clinic Map Locator (Shown for In-Clinic & Home Visit) */}
          {consultMode !== "telehealth" && (
            <ClinicMapLocator
              selectedClinicId={selectedClinic.id}
              onSelectClinic={(c) => setSelectedClinic(c)}
            />
          )}

          {/* Main Booking Form Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Column (7 cols) */}
            <div className="lg:col-span-7 rounded-3xl bg-white p-6 shadow-sm border border-slate-200/90 space-y-5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Calendar className="h-5 w-5 text-sky-700" />
                <span>Reserve Consultation Slot</span>
              </h3>

              {/* Name Prompt if generic */}
              {(!displayName || ["new patient","new user","patient","user"].includes(displayName.trim().toLowerCase())) && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 space-y-2">
                  <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-amber-700" />
                    <span>Please enter your patient name before booking</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="tl-input flex-1 bg-white text-sm"
                      placeholder="Your full name (e.g. Priya Sharma)"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                    <button
                      className="rounded-xl bg-[#1b343f] px-4 py-2 text-xs font-bold text-white hover:bg-[#274d5d]"
                      onClick={async () => {
                        if (!customName.trim()) return;
                        await updateName({ sessionUserId, displayName: customName.trim() });
                      }}
                    >
                      Save Name
                    </button>
                  </div>
                </div>
              )}

              {/* Doctor / Specialist Selector */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase font-mono text-slate-600 block">
                  Select Attending Specialist / Doctor
                </span>
                <select
                  className="tl-input text-sm"
                  value={practId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__manual__") {
                      setPractId("" as Id<"users">);
                      setManualDoctorName("");
                      setUseManualDoctor(true);
                    } else {
                      setUseManualDoctor(false);
                      setPractId(val as Id<"users">);
                    }
                  }}
                >
                  <option value="">-- Choose Registered Specialist --</option>
                  {practitioners?.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.displayName} (Registered AYUSH/OPD Practitioner)
                    </option>
                  ))}
                  {doctorSpecialties.map((doc, idx) => (
                    <option key={idx} value={`preset-${idx}`}>
                      {doc.name} - {doc.specialty} ({doc.exp})
                    </option>
                  ))}
                  <option value="__manual__">+ Enter Doctor Name Manually</option>
                </select>

                {useManualDoctor && (
                  <div className="pt-2">
                    <input
                      type="text"
                      className="tl-input text-sm bg-white"
                      placeholder="Enter doctor's full name (e.g. Dr. K. N. Verma)"
                      value={manualDoctorName}
                      onChange={(e) => setManualDoctorName(e.target.value)}
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Date Selector Pills */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase font-mono text-slate-600 block">
                  Select Date
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      ["today", "Today"],
                      ["tomorrow", "Tomorrow"],
                      ["in_2_days", "In 2 Days"],
                      ["custom", "Pick Custom Date"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedDateQuick(id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                        selectedDateQuick === id
                          ? "bg-[#1b343f] text-white border-[#1b343f] shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {selectedDateQuick === "custom" && (
                  <input
                    type="datetime-local"
                    value={slot}
                    onChange={(e) => setSlot(e.target.value)}
                    className="tl-input text-sm mt-2"
                  />
                )}
              </div>

              {/* Time Slot Chips */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase font-mono text-slate-600 block">
                  Select Preferred Time Slot
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {["09:30 AM", "10:30 AM", "11:45 AM", "02:30 PM", "04:15 PM", "06:30 PM"].map((timeStr) => (
                    <button
                      key={timeStr}
                      type="button"
                      onClick={() => setSelectedTimeSlot(timeStr)}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                        selectedTimeSlot === timeStr
                          ? "bg-emerald-700 text-white border-emerald-800 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {timeStr}
                    </button>
                  ))}
                </div>
              </div>

              {/* WhatsApp Notification Input */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="block">
                  <span className="text-xs font-bold uppercase font-mono text-slate-600 block">
                    WhatsApp Number for Instant Confirmation
                  </span>
                  <div className="relative mt-1">
                    <Smartphone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="tl-input pl-10 text-sm"
                    />
                  </div>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={sendWhatsAppAlert}
                    onChange={(e) => setSendWhatsAppAlert(e.target.checked)}
                    className="rounded border-slate-300 text-[#1b343f]"
                  />
                  <span>Send instant appointment confirmation &amp; digital token to my WhatsApp</span>
                </label>
              </div>

              {bookingNotice && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900">
                  {bookingNotice}
                </div>
              )}

              <button
                type="button"
                className="btn-pulse w-full py-3.5 text-sm font-bold"
                onClick={async () => {
                  if ((!practId && !useManualDoctor) || !slot) {
                    setBookingNotice("Please select a practitioner and time slot.");
                    return;
                  }
                  if (useManualDoctor && !manualDoctorName.trim()) {
                    setBookingNotice("Please enter the doctor's name.");
                    return;
                  }
                  try {
                    const selectedPractitioner = practitioners?.find((p) => p._id === practId);
                    const scheduledTime = new Date(slot).getTime();
                    const doctorLabel = useManualDoctor
                      ? manualDoctorName.trim()
                      : selectedPractitioner?.displayName || "Practitioner";

                    const effectivePractId = useManualDoctor
                      ? (practitioners?.[0]?._id ?? (practId as Id<"users">))
                      : (practId as Id<"users">);

                    if (!effectivePractId) {
                      setBookingNotice("No practitioner accounts found. Please ask clinic to register.");
                      return;
                    }

                    const consultType =
                      consultMode === "home_visit"
                        ? "HOME_VISIT"
                        : consultMode === "telehealth"
                        ? "TELECONSULT"
                        : "CLINIC_OPD";

                    await requestAppointment({
                      sessionUserId,
                      practitionerUserId: effectivePractId,
                      scheduledAt: scheduledTime,
                      notes: `Mode: ${consultMode.replace("_", " ").toUpperCase()} at ${selectedClinic.name}`,
                      channel: sendWhatsAppAlert ? "whatsapp" : "web",
                      patientPhone: sendWhatsAppAlert ? phone.trim() : undefined,
                      geo: { lat: selectedClinic.lat, lng: selectedClinic.lng },
                      address: selectedClinic.address,
                      pinCode: "110016",
                      consultationType: consultType,
                      urgency: "ROUTINE",
                      estimatedConsultMinutes: 25,
                    });




                    // Trigger WhatsApp Notification
                    if (sendWhatsAppAlert && phone.trim()) {
                      try {
                        const dateStr = new Date(scheduledTime).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        });
                        const locationLabel = consultMode === "telehealth" ? "Encrypted Video Room" : selectedClinic.name;
                        await fetch("/api/twilio/send-whatsapp", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            to: phone.trim(),
                            patientName: displayName || "Valued Patient",
                            doctorName: doctorLabel,
                            appointmentDate: dateStr,
                            location: locationLabel,
                          }),
                        });
                      } catch {
                        // ignore background send error
                      }
                    }

                    setBookingNotice("");
                    setBookingSuccessModal(true);
                  } catch (err: any) {
                    setBookingNotice("Booking failed: " + err.message);
                  }
                }}
              >
                Confirm &amp; Book Consultation Slot
              </button>
            </div>

            {/* Right Summary & Scheduled List Column (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Selected Booking Summary Preview */}
              <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-[#1b343f] text-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-white/15 pb-3">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-sky-200">
                    Booking Summary Preview
                  </span>
                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 border border-emerald-400/30">
                    {consultMode === "telehealth" ? "Video OPD" : consultMode === "home_visit" ? "Home Care" : "In-Clinic"}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Patient:</span>
                    <span className="font-bold text-white text-sm">{displayName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Location / Center:</span>
                    <span className="font-semibold text-right text-sky-200">{consultMode === "telehealth" ? "Telehealth Video Link" : selectedClinic.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Selected Time:</span>
                    <span className="font-bold text-white">{selectedDateQuick.toUpperCase()} at {selectedTimeSlot}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">WhatsApp Alert:</span>
                    <span className="font-mono text-emerald-300">{sendWhatsAppAlert ? phone : "Disabled"}</span>
                  </div>
                </div>
              </div>

              {/* Scheduled Appointments List */}
              <div className="rounded-3xl bg-white p-5 border border-slate-200/90 shadow-sm space-y-3">
                <h4 className="text-sm font-bold text-slate-900 uppercase font-mono flex items-center justify-between">
                  <span>Your Scheduled Appointments ({appointments?.length ?? 0})</span>
                  <Clock className="h-4 w-4 text-slate-400" />
                </h4>

                <div className="space-y-2.5 max-h-[320px] overflow-y-auto">
                  {appointments && appointments.length > 0 ? (
                    appointments.map((a) => {
                      const pract = practitioners?.find((p) => p._id === a.practitionerUserId);
                      return (
                        <div
                          key={a._id}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">
                              {new Date(a.scheduledAt).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                            <span className="rounded-full bg-emerald-100 text-emerald-900 px-2.5 py-0.5 text-[10px] font-bold uppercase font-mono">
                              {a.status || "CONFIRMED"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 flex items-center gap-1.5">
                            <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                            <span>Doctor: <strong>{a.practitionerName || pract?.displayName || "Consulting Practitioner"}</strong></span>
                          </p>
                          {a.patientPhone && (
                            <p className="text-[11px] text-slate-500 font-mono">
                              WhatsApp Alert: {a.patientPhone}
                            </p>
                          )}
                        </div>
                      );
                    })

                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No consultations scheduled yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: MESSAGES */}
      {activeTab === "messages" && (
        <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-4 max-w-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Clinical Messaging</h2>
              <p className="text-sm text-slate-500">Secure clinical chat with your doctor or dietitian.</p>
            </div>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 shrink-0">
              <button
                type="button"
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                  toRole === "practitioner"
                    ? "bg-[#1b343f] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setToRole("practitioner")}
              >
                Doctor / OPD
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                  toRole === "dietitian"
                    ? "bg-[#1b343f] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setToRole("dietitian")}
              >
                Dietitian
              </button>
            </div>
          </div>


          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type message to care team..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="tl-input text-sm flex-1"
            />
            <button
              className="btn-pulse px-5 py-2.5 text-sm font-bold shrink-0"
              onClick={async () => {
                if (!msg.trim()) return;
                await sendMessage({
                  sessionUserId,
                  toRole,
                  body: msg.trim(),
                });
                setMsg("");
              }}
            >
              Send
            </button>
          </div>

          <div className="space-y-2 pt-2">
            {messages?.map((m) => (
              <div key={m._id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-bold text-slate-800 uppercase font-mono">{m.fromName}</span>
                  <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                </div>

                <p className="text-sm text-slate-900">{m.body}</p>
              </div>
            ))}
          </div>

        </section>
      )}

      {/* Booking Success Modal */}
      {bookingSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 mx-auto">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-slate-900">Consultation Slot Reserved!</h3>
              <p className="text-xs text-slate-600">
                Your appointment has been confirmed and synced with your ABHA Health ID. Confirmation has been dispatched via WhatsApp.
              </p>
            </div>
            <button
              type="button"
              className="btn-pulse w-full py-3 text-xs font-bold"
              onClick={() => setBookingSuccessModal(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
