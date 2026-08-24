"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { DocumentPipelinePanel } from "./DocumentPipelinePanel";
import { ClinicMapLocator, type ClinicLocation, NEARBY_CLINICS } from "./ClinicMapLocator";
import type { DocumentKind } from "@/lib/documents/metadata";
import { createInitialState } from "@/lib/intake/engine";
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
  Droplets,
  Utensils,
  X,
  Edit2,
  Flame,
  Heart,
  Brain,
  Wind,
  ChevronLeft,
  ChevronRight,
  Crown,
  Check,
  Settings,
  Bell,
  TrendingUp,
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
  const [routineDone, setRoutineDone] = useState<Record<string, boolean>>({
    pullup: true,
    situp: false,
    squat: false,
    "morning-walk": true,
    "warm-water": true,
  });
  const [waterLogged, setWaterLogged] = useState(750);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrgan, setSelectedOrgan] = useState<"heart" | "brain" | "kidney" | "lungs">("heart");
  const [activeScheduleDay, setActiveScheduleDay] = useState("Mon");

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

  const [bookingNotice, setBookingNotice] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [customName, setCustomName] = useState(displayName);


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
        intakeJson: JSON.stringify(createInitialState()),
        shareHistory: true,
        shareAyush: true,
        shareAbha: true,
        retainAfterEncounter: true,
      });
    }

    await attachDocument({
      visitId: activeVisitId,
      storageId: json.storageId,
      kind,
      rawText: ocrData.text ?? "",
      structuredJson: JSON.stringify(ocrData.structured ?? {}),
      confidence: ocrData.confidence ?? 0,
      failed: ocrData.failed,
    });
  }

  // Active organ details data
  const organDetails = {
    heart: {
      value: "88",
      unit: "bpm",
      title: "Heart Rate & Cardiovascular",
      description: "Your heart rate is steady and healthy today",
      badgeTop: "110/80",
      badgeBottom: "75-92",
      icon: Heart,
    },
    brain: {
      value: "96",
      unit: "satva",
      title: "Mental Clarity & Satva",
      description: "Balanced alpha brainwave coherence and focus",
      badgeTop: "Calm",
      badgeBottom: "Focus 98%",
      icon: Brain,
    },
    kidney: {
      value: "100",
      unit: "%",
      title: "Agni & Metabolic Filtration",
      description: "Sama Agni active with optimal nutrient digestion",
      badgeTop: "Hydrated",
      badgeBottom: "Agni Sama",
      icon: Flame,
    },
    lungs: {
      value: "99",
      unit: "SpO2",
      title: "Pranavaha Srotas & Respiratory",
      description: "Clean tidal volume and steady diaphragmatic flow",
      badgeTop: "16 bpm",
      badgeBottom: "99% O2",
      icon: Wind,
    },
  };

  const activeOrganData = organDetails[selectedOrgan];

  // Candle chart sample distribution matching image exactly
  const candleData = [
    { height: 35, topOffset: 25 },
    { height: 45, topOffset: 20 },
    { height: 25, topOffset: 40 },
    { height: 55, topOffset: 15 },
    { height: 30, topOffset: 35 },
    { height: 70, topOffset: 10 },
    { height: 40, topOffset: 30 },
    { height: 60, topOffset: 20 },
    { height: 50, topOffset: 25 },
    { height: 80, topOffset: 5 },
    { height: 45, topOffset: 25 },
    { height: 65, topOffset: 15 },
    { height: 35, topOffset: 35 },
    { height: 55, topOffset: 20 },
    { height: 75, topOffset: 10 },
  ];

  // Schedule Routine items matching image exactly
  const dailyRoutines = [
    {
      id: "pullup",
      name: "Pull up",
      duration: "5 mins",
      level: "Beginner",
      done: !!routineDone["pullup"],
      icon: Activity,
    },
    {
      id: "situp",
      name: "Sit up",
      duration: "5 mins",
      level: "Beginner",
      done: !!routineDone["situp"],
      icon: Activity,
    },
    {
      id: "squat",
      name: "Squat",
      duration: "4 mins",
      level: "Advanced",
      done: !!routineDone["squat"],
      icon: Activity,
    },
  ];

  return (
    <div className="min-h-screen bg-[#edf3f7] p-4 md:p-6 lg:p-8 flex flex-col md:flex-row gap-6">
      {/* ══════════════════════════════════════════════════════════════════════
          SLEEK FLOATING LEFT VERTICAL NAVIGATION SIDEBAR
         ══════════════════════════════════════════════════════════════════════ */}
      <aside className="w-full md:w-16 lg:w-20 bg-white rounded-[28px] md:rounded-[32px] p-3 md:py-6 flex md:flex-col justify-between items-center shadow-sm border border-slate-200/80 shrink-0 h-fit md:min-h-[calc(100vh-4rem)] md:sticky md:top-8 z-20">
        {/* Top Brand Logo */}
        <div className="flex flex-col items-center gap-6">
          <button
            onClick={() => goTab("overview")}
            className="h-10 w-10 rounded-2xl bg-[#edf3f7] flex items-center justify-center text-[#1b343f] font-bold hover:bg-sky-100 transition-colors shadow-2xs"
            title="My-Aura Home"
          >
            <Leaf className="h-5 w-5 text-teal-700" />
          </button>

          {/* Vertical Icon Navigation Stack */}
          <nav className="flex md:flex-col gap-2">
            <button
              onClick={() => goTab("overview")}
              title="Dashboard Overview"
              className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                activeTab === "overview"
                  ? "bg-[#1b343f] text-white shadow-xs"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
            </button>
            <button
              onClick={() => goTab("book")}
              title="Schedule & Appointments"
              className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                activeTab === "book"
                  ? "bg-[#1b343f] text-white shadow-xs"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <Calendar className="h-5 w-5" />
            </button>
            <button
              onClick={() => goTab("symptoms")}
              title="Symptoms & Vitals"
              className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                activeTab === "symptoms"
                  ? "bg-[#1b343f] text-white shadow-xs"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <Activity className="h-5 w-5" />
            </button>
            <button
              onClick={() => goTab("intake")}
              title="AI Case Taking"
              className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                activeTab === "intake"
                  ? "bg-[#1b343f] text-white shadow-xs"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <Heart className="h-5 w-5" />
            </button>
            <button
              onClick={() => goTab("documents")}
              title="Document Pipeline & OCR"
              className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                activeTab === "documents"
                  ? "bg-[#1b343f] text-white shadow-xs"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <FileText className="h-5 w-5" />
            </button>
            <button
              onClick={() => goTab("lifestyle")}
              title="Ahara-Vihara Routine"
              className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                activeTab === "lifestyle"
                  ? "bg-[#1b343f] text-white shadow-xs"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <Leaf className="h-5 w-5" />
            </button>
            <button
              onClick={() => goTab("plans")}
              title="Care & Diet Plans"
              className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                activeTab === "plans"
                  ? "bg-[#1b343f] text-white shadow-xs"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <Pill className="h-5 w-5" />
            </button>
            <button
              onClick={() => goTab("messages")}
              title="Messages"
              className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                activeTab === "messages"
                  ? "bg-[#1b343f] text-white shadow-xs"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <Bell className="h-5 w-5" />
            </button>
          </nav>
        </div>

        {/* Bottom Profile & Settings */}
        <div className="flex md:flex-col items-center gap-3 mt-4 md:mt-0">
          <button
            onClick={() => setIsEditingName(true)}
            className="h-10 w-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            title="Settings & Edit Name"
          >
            <Settings className="h-5 w-5" />
          </button>
          <div
            onClick={() => setIsEditingName(true)}
            className="h-10 w-10 rounded-2xl bg-teal-800 text-white flex items-center justify-center text-xs font-bold shadow-xs cursor-pointer hover:opacity-90"
            title="Profile"
          >
            {displayName ? displayName.slice(0, 2).toUpperCase() : "PT"}
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN DASHBOARD CANVAS
         ══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-w-0 space-y-6">
        {/* Top Header Bar: Greeting + Search + Upgrade CTA */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="rounded-xl border border-slate-300 px-3 py-1 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1b343f]"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter name"
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
                  className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                  onClick={() => setIsEditingName(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                Good Morning, <span className="font-semibold text-slate-800">{displayName}</span>
                <button
                  className="text-xs text-sky-700 hover:text-sky-900 font-medium px-1.5 py-0.5 rounded hover:bg-sky-50 transition-colors inline-flex items-center gap-1"
                  onClick={() => {
                    setCustomName(displayName);
                    setIsEditingName(true);
                  }}
                  title="Change profile name"
                >
                  <Edit2 className="h-2.5 w-2.5" />
                </button>
              </p>
            )}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mt-0.5">
              How&apos;s your mood today?
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search here ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-full border border-slate-200/90 bg-white px-4 py-2 pl-9 text-xs shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1b343f] w-48 md:w-56"
              />
            </div>
            <button
              onClick={() => goTab("intake")}
              className="rounded-full bg-[#1b343f] hover:bg-[#254857] text-white px-5 py-2 text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
            >
              <span>Upgrade</span>
              <Crown className="h-3.5 w-3.5 text-amber-300" />
            </button>
          </div>
        </header>

        {/* Secondary Sub-navigation Pills Bar (Allows full access to sub-panels) */}
        <div className="flex flex-wrap gap-1.5 rounded-2xl bg-white/70 p-1.5 border border-slate-200/70 shadow-2xs backdrop-blur-md">
          {(
            [
              ["overview", "Overview", LayoutDashboard],
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
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === id
                  ? "bg-[#1b343f] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
              onClick={() => goTab(id)}
            >
              <IconComponent className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: OVERVIEW (EXACT MINDNEST DESIGN REPLICA WITH ZERO EMOJIS)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top Row: 2 Big Highlight Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Top Left Card: Join Meditation Class (lg:col-span-6) */}
              <div className="lg:col-span-6 rounded-[32px] bg-gradient-to-br from-[#274653] via-[#1d3540] to-[#14262f] p-7 md:p-8 text-white relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[300px]">
                <div className="space-y-4 max-w-xs z-10">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                    Join Our<br />Meditation Class
                  </h2>
                  <button
                    onClick={() => goTab("lifestyle")}
                    className="rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/25 px-5 py-2.5 text-xs font-bold transition-all shadow-xs"
                  >
                    Join Now
                  </button>
                </div>

                {/* Right Aesthetic Meditation Art Vector */}
                <div className="absolute right-4 bottom-2 md:right-8 md:bottom-4 pointer-events-none opacity-90">
                  <div className="relative w-44 h-48 flex items-center justify-center">
                    {/* Concentric Aura Rings */}
                    <div className="absolute w-36 h-36 rounded-full border border-sky-300/20 animate-ping opacity-25" />
                    <div className="absolute w-44 h-44 rounded-full border border-teal-300/20" />
                    <div className="w-32 h-32 rounded-full bg-gradient-to-t from-teal-400/20 via-sky-300/20 to-transparent backdrop-blur-xs flex items-center justify-center">
                      <Leaf className="h-14 w-14 text-teal-200/80" />
                    </div>
                  </div>
                </div>

                {/* Bottom Social Proof: Avatar Stack + Members */}
                <div className="flex items-center gap-3 z-10 pt-6">
                  <div className="flex -space-x-2">
                    <div className="h-8 w-8 rounded-full border-2 border-[#1d3540] bg-rose-200 text-[#1d3540] flex items-center justify-center font-bold text-[10px]">SM</div>
                    <div className="h-8 w-8 rounded-full border-2 border-[#1d3540] bg-amber-200 text-[#1d3540] flex items-center justify-center font-bold text-[10px]">AK</div>
                    <div className="h-8 w-8 rounded-full border-2 border-[#1d3540] bg-teal-200 text-[#1d3540] flex items-center justify-center font-bold text-[10px]">RK</div>
                  </div>
                  <span className="text-xs font-bold tracking-wide text-slate-200">9K+ Members</span>
                </div>
              </div>

              {/* Top Right Card: Health Overview Organ Visualizer (lg:col-span-6) */}
              <div className="lg:col-span-6 rounded-[32px] bg-white p-7 md:p-8 shadow-sm border border-slate-100/90 flex flex-col justify-between min-h-[300px]">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                      <Leaf className="h-4 w-4 text-teal-700" />
                      <span>Health Overview</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-4xl md:text-5xl font-bold text-slate-900 font-mono tracking-tight">
                        {activeOrganData.value}
                      </span>
                      <span className="ml-2 text-sm font-semibold text-slate-500">{activeOrganData.unit}</span>
                    </div>
                    <p className="text-xs text-slate-500 pt-1">{activeOrganData.description}</p>
                  </div>

                  {/* Anatomical Organ Visual with Floating Interactive Badges */}
                  <div className="relative">
                    <div className="w-36 h-36 relative flex items-center justify-center">
                      <div className="w-28 h-28 rounded-full bg-teal-50/80 border border-teal-100/80 flex items-center justify-center">
                        <activeOrganData.icon className="h-16 w-16 text-teal-700/80 transition-all duration-300" />
                      </div>

                      {/* Floating Metric Badges */}
                      <div className="absolute top-1 -right-2 rounded-full bg-slate-900 text-white px-2.5 py-1 text-[10px] font-mono font-bold flex items-center gap-1 shadow-xs">
                        <Droplets className="h-2.5 w-2.5 text-sky-400" />
                        <span>{activeOrganData.badgeTop}</span>
                      </div>
                      <div className="absolute bottom-1 -left-2 rounded-full bg-slate-900 text-white px-2.5 py-1 text-[10px] font-mono font-bold flex items-center gap-1 shadow-xs">
                        <Activity className="h-2.5 w-2.5 text-emerald-400" />
                        <span>{activeOrganData.badgeBottom}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Improve Health Button + Organ Switcher Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100/80">
                  <button
                    onClick={() => goTab("symptoms")}
                    className="rounded-2xl bg-[#e3eff5] hover:bg-[#d5e7ef] text-[#1b343f] px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <span>Improve Health</span>
                    <Sparkles className="h-3 w-3 text-sky-600" />
                  </button>

                  {/* Organ Switcher Tabs (Heart, Brain, Kidney, Lungs) */}
                  <div className="flex items-center gap-1 rounded-2xl bg-slate-50 p-1 border border-slate-200/60">
                    <button
                      onClick={() => setSelectedOrgan("heart")}
                      className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
                        selectedOrgan === "heart" ? "bg-[#7db4cc] text-white shadow-xs" : "text-slate-400 hover:text-slate-700"
                      }`}
                      title="Heart / Cardiovascular"
                    >
                      <Heart className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSelectedOrgan("brain")}
                      className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
                        selectedOrgan === "brain" ? "bg-[#7db4cc] text-white shadow-xs" : "text-slate-400 hover:text-slate-700"
                      }`}
                      title="Brain / Satva Mental Health"
                    >
                      <Brain className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSelectedOrgan("kidney")}
                      className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
                        selectedOrgan === "kidney" ? "bg-[#7db4cc] text-white shadow-xs" : "text-slate-400 hover:text-slate-700"
                      }`}
                      title="Digestive Agni & Filtration"
                    >
                      <Flame className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSelectedOrgan("lungs")}
                      className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
                        selectedOrgan === "lungs" ? "bg-[#7db4cc] text-white shadow-xs" : "text-slate-400 hover:text-slate-700"
                      }`}
                      title="Respiratory / Pranavaha Srotas"
                    >
                      <Wind className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 3 Cards Row: Calories, Hydration, Exercise/Routine */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Calories / Metabolic Agni Chart */}
              <div className="rounded-[32px] bg-white p-7 shadow-sm border border-slate-100/90 flex flex-col justify-between min-h-[280px]">
                <div>
                  <div className="flex items-center gap-2 text-slate-800 text-xs font-bold">
                    <Flame className="h-4 w-4 text-slate-900" />
                    <span>Calories</span>
                  </div>

                  {/* Vertical Candle Chart Bars */}
                  <div className="pt-4 flex items-end justify-between h-32 px-1 relative">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                      <div className="border-b border-slate-300 w-full" />
                      <div className="border-b border-slate-300 w-full" />
                      <div className="border-b border-slate-300 w-full" />
                    </div>

                    {candleData.map((bar, i) => (
                      <div key={i} className="flex flex-col items-center justify-center h-full w-2 relative z-10">
                        <div
                          className="w-1.5 bg-[#9ec3d5] rounded-full"
                          style={{ height: `${bar.height}%`, marginTop: `${bar.topOffset}%` }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Scale labels */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                    <span>0</span>
                    <span>2500</span>
                  </div>
                </div>

                <div className="pt-3">
                  <span className="text-3xl font-bold font-mono text-slate-900">1858</span>
                  <span className="text-sm font-semibold text-slate-600 ml-1">Kcl</span>
                </div>
              </div>

              {/* Card 2: Hydration Status with Ripple Waves */}
              <div className="rounded-[32px] bg-white p-7 shadow-sm border border-slate-100/90 flex flex-col justify-between min-h-[280px] relative overflow-hidden">
                <div>
                  <div className="flex items-center gap-2 text-slate-800 text-xs font-bold">
                    <Droplets className="h-4 w-4 text-slate-900" />
                    <span>Hydration Status</span>
                  </div>

                  <div className="pt-4">
                    <span className="text-4xl font-bold font-mono text-slate-900">{waterLogged}</span>
                    <span className="text-sm font-semibold text-slate-600 ml-1">ml</span>
                    <p className="text-xs text-slate-500 mt-0.5">{Math.round((waterLogged / 2200) * 100)}% Completed</p>
                  </div>

                  {/* Quick Add Buttons */}
                  <div className="flex gap-2 pt-3 z-10 relative">
                    <button
                      onClick={() => setWaterLogged((w) => w + 250)}
                      className="rounded-xl bg-[#e3eff5] hover:bg-[#d5e7ef] text-[#1b343f] px-3 py-1.5 text-[11px] font-bold transition-all shadow-2xs"
                    >
                      +250 ml
                    </button>
                    <button
                      onClick={() => setWaterLogged((w) => w + 500)}
                      className="rounded-xl bg-[#e3eff5] hover:bg-[#d5e7ef] text-[#1b343f] px-3 py-1.5 text-[11px] font-bold transition-all shadow-2xs"
                    >
                      +500 ml
                    </button>
                  </div>
                </div>

                {/* Bottom Water Splash Wave Container */}
                <div className="w-full h-16 relative mt-2 -mx-7 -mb-7 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-sky-300/40 via-sky-200/20 to-transparent flex items-end">
                    <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="h-14 w-full text-sky-400/40 fill-current">
                      <path d="M0.00,49.98 C149.99,150.00 349.81,-49.98 500.00,49.98 L500.00,150.00 L0.00,150.00 Z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Card 3: Routine / Exercise Schedule Card */}
              <div className="rounded-[32px] bg-white p-6 shadow-sm border border-slate-100/90 flex flex-col justify-between min-h-[280px]">
                {/* Header Date Ribbon */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <button
                    onClick={() => {
                      const days = ["Sat", "sun", "Mon", "Tue", "Wed"];
                      const idx = days.indexOf(activeScheduleDay);
                      setActiveScheduleDay(days[(idx - 1 + days.length) % days.length]!);
                    }}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                    {["Sat", "sun", "Mon", "Tue", "Wed"].map((day) => (
                      <button
                        key={day}
                        onClick={() => setActiveScheduleDay(day)}
                        className={`transition-all ${
                          activeScheduleDay === day ? "text-base font-bold text-slate-900" : "hover:text-slate-600"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const days = ["Sat", "sun", "Mon", "Tue", "Wed"];
                      const idx = days.indexOf(activeScheduleDay);
                      setActiveScheduleDay(days[(idx + 1) % days.length]!);
                    }}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Routine Activities List */}
                <div className="space-y-2.5 pt-3 flex-1">
                  {dailyRoutines.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                          <item.icon className="h-5 w-5 text-slate-700" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-3 w-3" />
                            <span>{item.duration}</span>
                            <span>·</span>
                            <TrendingUp className="h-3 w-3" />
                            <span>{item.level}</span>
                          </p>
                        </div>
                      </div>

                      {item.done ? (
                        <div className="h-7 w-7 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-2xs">
                          <Check className="h-4 w-4" />
                        </div>
                      ) : (
                        <button
                          onClick={() => setRoutineDone((prev) => ({ ...prev, [item.id]: true }))}
                          className="rounded-xl bg-[#e3eff5] hover:bg-[#d5e7ef] text-[#1b343f] px-3.5 py-1 text-xs font-bold shadow-2xs transition-all"
                        >
                          Start
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: INTAKE (AI KIOSK WIZARD)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "intake" && <div>{intake}</div>}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: DOCUMENTS & OCR STATION
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "documents" && (
          <DocumentPipelinePanel
            extracts={documentExtracts}
            onUpload={handlePatientUpload}
            viewMode="patient"
          />
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 4: SYMPTOMS JOURNAL
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "symptoms" && (
          <section className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100/90 space-y-6 max-w-3xl">
            <div>
              <p className="font-mono text-[10px] uppercase font-bold text-slate-400">Clinical Signal</p>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">Symptoms &amp; Discomfort Journal</h2>
              <p className="text-xs text-slate-500">Record current discomfort, intensity, and location for your doctor.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-bold font-mono text-slate-600">Symptom Description</span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b343f] mt-1"
                  placeholder="e.g. Sharp pain in lower abdomen"
                  value={symForm.name}
                  onChange={(e) => setSymForm({ ...symForm, name: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold font-mono text-slate-600">
                  Severity Scale (1 to 10): {symForm.severity}
                </span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  className="w-full mt-3 accent-[#1b343f]"
                  value={symForm.severity}
                  onChange={(e) => setSymForm({ ...symForm, severity: Number(e.target.value) })}
                />
              </label>
            </div>

            <button
              className="btn-pulse px-6 py-2.5 text-xs font-bold"
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
              <h4 className="text-xs font-bold text-slate-800 uppercase font-mono mb-3">Logged History</h4>
              <div className="space-y-2">
                {symptoms?.map((s) => (
                  <div key={s._id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-900">{s.text}</span>
                      <p className="text-[11px] text-slate-500">{new Date(s.createdAt).toLocaleDateString()} · Intensity {s.severity}/10</p>
                    </div>
                    <span className="rounded-full bg-amber-100 text-amber-900 px-3 py-0.5 text-[10px] font-bold">
                      Recorded
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 5: LIFESTYLE & DINACHARYA
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "lifestyle" && (
          <section className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100/90 space-y-6 max-w-3xl">
            <div>
              <p className="font-mono text-[10px] uppercase font-bold text-slate-400">Ayurvedic Daily Routine</p>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">Ahara-Vihara (Lifestyle &amp; Habits)</h2>
              <p className="text-xs text-slate-500">Track hydration, dinacharya rituals, and restful sleep.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-3xl bg-sky-50/60 border border-sky-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-sky-950 flex items-center gap-1.5">
                    <Droplets className="h-4 w-4 text-sky-600" />
                    Daily Water Intake
                  </span>
                  <span className="font-mono text-xs font-bold text-sky-800">{waterLogged} ml / 2500 ml</span>
                </div>
                <div className="w-full bg-white rounded-full h-2.5 overflow-hidden border border-sky-200">
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
                <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
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
                        onChange={(e) => setRoutineDone((r) => ({ ...r, [key]: e.target.checked }))}
                        className="rounded accent-emerald-600"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 6: CARE & DIET PLANS + FOOD DATABASE
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "plans" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase font-bold text-slate-400">Prescription &amp; Nutrition</p>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">Care &amp; Diet Plans</h2>
              </div>
              <div className="flex gap-2">
                <button
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                    plansView === "plans" ? "bg-[#1b343f] text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                  onClick={() => setPlansView("plans")}
                >
                  My Prescribed Plans
                </button>
                <button
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                    plansView === "foods" ? "bg-[#1b343f] text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                  onClick={() => setPlansView("foods")}
                >
                  Ayurvedic Food Database
                </button>
              </div>
            </div>

            {plansView === "plans" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Pill className="h-4 w-4 text-sky-600" />
                    Doctor Care Plans
                  </h3>
                  {care?.length === 0 ? (
                    <p className="text-xs text-slate-400">No active care plans.</p>
                  ) : (
                    care?.map((p) => (
                      <div key={p._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{p.title}</span>
                          <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{p.status}</span>
                        </div>
                        {p.body && <p className="text-xs text-slate-600 mt-1">{p.body}</p>}
                      </div>
                    ))
                  )}
                </section>

                <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-emerald-600" />
                    Dietitian Nutritional Plans
                  </h3>
                  {diet?.length === 0 ? (
                    <p className="text-xs text-slate-400">No diet plans prescribed yet.</p>
                  ) : (
                    diet?.map((d) => (
                      <div key={d._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{d.title}</span>
                          <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">
                            {d.practitionerApproved ? "Approved" : "Pending"}
                          </span>
                        </div>
                        {d.notes && <p className="text-xs text-slate-600 mt-1">{d.notes}</p>}
                        {d.meals && d.meals.length > 0 && (
                          <div className="pt-2 space-y-1">
                            {d.meals.map((m) => (
                              <div key={m._id} className="text-[11px] text-slate-700 bg-white p-2 rounded-xl border border-slate-100">
                                <span className="font-bold text-emerald-800">{m.label}:</span> {m.itemsText}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </section>
              </div>
            ) : (
              <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <input
                    type="text"
                    placeholder="Search Ayurvedic foods..."
                    value={foodSearch}
                    onChange={(e) => setFoodSearch(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b343f] w-full md:w-64"
                  />
                  <div className="flex gap-2 flex-wrap items-center">
                  <div className="flex gap-1 flex-wrap">
                    {foodCategories.map((c) => (
                      <button
                        key={c}
                        onClick={() => setFoodCategory(c)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                          foodCategory === c ? "bg-[#1b343f] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Dosha:</span>
                    {(["all", "vata", "pitta", "kapha"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setFoodDoshaFilter(d)}
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase transition-all ${
                          foodDoshaFilter === d ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                </div>

                {selectedFoodItem && (
                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-teal-950">{selectedFoodItem.name}</h4>
                      <p className="text-xs text-teal-800 mt-0.5">{selectedFoodItem.category} · Taste: {selectedFoodItem.taste?.join(", ") || "Balanced"}</p>
                    </div>
                    <button
                      onClick={() => setSelectedFood(null)}
                      className="rounded-lg bg-teal-200/80 px-2 py-1 text-xs font-bold text-teal-900 hover:bg-teal-300"
                    >
                      Close
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {filteredFoods.slice(0, 18).map((f) => (
                    <div
                      key={f._id}
                      onClick={() => setSelectedFood(f._id)}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-sky-300 transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{f.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">{f.category}</span>
                      </div>
                      {f.taste && (
                        <p className="text-[11px] text-slate-500 font-mono">Taste: {f.taste.join(", ")}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 7: ADHERENCE CHECK-INS
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "adherence" && (
          <section className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100/90 space-y-4 max-w-2xl">
            <div>
              <p className="font-mono text-[10px] uppercase font-bold text-slate-400">Treatment Adherence</p>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">Daily Adherence &amp; Check-ins</h2>
              <p className="text-xs text-slate-500">Log whether you took prescribed medications and followed recommendations.</p>
            </div>

            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b343f]"
              rows={3}
              placeholder="e.g. Completed morning Triphala dose and 20 mins Pranayama..."
              value={checkin}
              onChange={(e) => setCheckin(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                className="btn-pulse px-5 py-2 text-xs font-bold"
                onClick={async () => {
                  if (!checkin.trim()) return;
                  await logAdherence({
                    sessionUserId,
                    kind: "checkin",
                    note: checkin.trim(),
                    done: true,
                  });
                  setCheckin("");
                }}
              >
                Log as Done
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase font-mono">Recent Adherence Records</h4>
              {adherence?.map((a) => (
                <div key={a._id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-700">{a.note}</span>
                  <span className="font-mono text-[10px] font-bold text-emerald-700">Done</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 8: BOOK CONSULTATION & CLINIC MAP LOCATOR
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "book" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Column */}
              <section className="lg:col-span-6 rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100/90 space-y-5">
                <div>
                  <p className="font-mono text-[10px] uppercase font-bold text-slate-400">Appointment Desk</p>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">Book Consultation</h2>
                  <p className="text-xs text-slate-500">In-clinic OPD, telehealth, or doctor home visit dispatch.</p>
                </div>

                {bookingNotice && (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-900">
                    {bookingNotice}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-bold font-mono text-slate-600">Consultation Mode</span>
                    <div className="grid grid-cols-3 gap-2 mt-1.5">
                      {(
                        [
                          ["in_clinic", "In-Clinic OPD", Building2],
                          ["telehealth", "Telehealth Video", Video],
                          ["home_visit", "Home Care Dispatch", Home],
                        ] as const
                      ).map(([mode, label, IconComponent]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setConsultMode(mode)}
                          className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                            consultMode === mode
                              ? "bg-[#1b343f] text-white border-[#1b343f] shadow-xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <IconComponent className="h-4 w-4" />
                          <span className="text-[11px] font-semibold">{label}</span>
                        </button>
                      ))}
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold font-mono text-slate-600">Select Doctor</span>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b343f] mt-1"
                      value={practId}
                      onChange={(e) => setPractId(e.target.value as Id<"users">)}
                    >
                      <option value="">Next available practitioner</option>
                      {practitioners?.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.displayName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-slate-600">Date &amp; Time Slot</span>
                      <div className="flex gap-1">
                        {(["today", "tomorrow", "in_2_days"] as const).map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setSelectedDateQuick(q)}
                            className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold transition-all ${
                              selectedDateQuick === q
                                ? "bg-[#1b343f] text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {q === "today" ? "Today" : q === "tomorrow" ? "Tomorrow" : "+2 Days"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="datetime-local"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b343f] mt-1"
                      value={slot}
                      onChange={(e) => setSlot(e.target.value)}
                    />
                    <div className="flex gap-1.5 pt-1.5 flex-wrap">
                      {["09:30 AM", "10:30 AM", "02:00 PM", "04:30 PM", "06:00 PM"].map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTimeSlot(time)}
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold transition-all ${
                            selectedTimeSlot === time
                              ? "bg-[#1b343f] text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold font-mono text-slate-600">Patient Phone (WhatsApp Confirmation)</span>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b343f] mt-1"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </label>

                  <button
                    type="button"
                    className="btn-pulse w-full py-3 text-xs font-bold mt-2"
                    onClick={async () => {
                      if (!slot) {
                        setBookingNotice("Please select a date and time slot.");
                        return;
                      }
                      try {
                        const targetPractId = practId ? (practId as Id<"users">) : practitioners?.[0]?._id;
                        if (!targetPractId) {
                          setBookingNotice("No practitioner available to assign.");
                          return;
                        }
                        await requestAppointment({
                          sessionUserId,
                          practitionerUserId: targetPractId,
                          scheduledAt: new Date(slot).getTime(),
                          patientPhone: phone,
                          notes: `Mode: ${consultMode}`,
                        });
                        setBookingNotice("Appointment requested successfully! You will receive a WhatsApp confirmation.");
                      } catch (err: any) {
                        setBookingNotice(err?.message || "Booking request failed.");
                      }
                    }}
                  >
                    Confirm &amp; Book Appointment
                  </button>

                  {appointments && appointments.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase font-mono">My Booked Consultations</h4>
                      {appointments.map((a) => (
                        <div key={a._id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900">{new Date(a.scheduledAt).toLocaleString()}</span>
                            <p className="text-[11px] text-slate-500 font-mono">Doctor: {a.practitionerName}</p>
                          </div>
                          <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase">
                            {a.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Map Column */}
              <section className="lg:col-span-6 rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100/90 space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-teal-700" />
                  Nearby AYUSH &amp; Smart OPD Clinics
                </h3>
                <ClinicMapLocator
                  selectedClinicId={selectedClinic.id}
                  onSelectClinic={(c) => setSelectedClinic(c)}
                />
              </section>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 9: MESSAGES & TELE-CONSULT CHAT
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "messages" && (
          <section className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100/90 space-y-4 max-w-2xl">
            <div>
              <p className="font-mono text-[10px] uppercase font-bold text-slate-400">Direct Communication</p>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">Consultation Messaging</h2>
              <p className="text-xs text-slate-500">Send follow-up questions directly to your practitioner or dietitian.</p>
            </div>

            <div className="flex gap-2">
              <button
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  toRole === "practitioner" ? "bg-[#1b343f] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                onClick={() => setToRole("practitioner")}
              >
                Doctor / Practitioner
              </button>
              <button
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  toRole === "dietitian" ? "bg-[#1b343f] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                onClick={() => setToRole("dietitian")}
              >
                Dietitian / Nutritionist
              </button>
            </div>

            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b343f]"
              rows={3}
              placeholder="Type your message..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
            />

            <button
              className="btn-pulse px-5 py-2 text-xs font-bold"
              onClick={async () => {
                if (!msg.trim()) return;
                await sendMessage({
                  sessionUserId,
                  patientId: sessionUserId as unknown as Id<"patients">,
                  toRole,
                  body: msg.trim(),
                });
                setMsg("");
              }}
            >
              Send Message
            </button>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase font-mono">Conversation Thread</h4>
              {messages?.map((m) => (
                <div key={m._id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="font-bold text-slate-900">{m.fromName}: </span>
                  <span className="text-slate-700">{m.body}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
