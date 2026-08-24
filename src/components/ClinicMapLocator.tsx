"use client";

import { useState } from "react";
import {
  MapPin,
  Navigation,
  Clock,
  Star,
  Building2,
  ExternalLink,
  Search,
  Crosshair,
  ShieldCheck,
} from "lucide-react";

export interface ClinicLocation {
  id: string;
  name: string;
  type: "Ayush Hospital" | "Community Health Center" | "Wellness & Panchakarma Clinic" | "Integrated OPD Hub";
  address: string;
  city: string;
  distanceKm: number;
  driveTimeMins: number;
  rating: number;
  reviewCount: number;
  phone: string;
  openHours: string;
  isOpenNow: boolean;
  services: string[];
  lat: number;
  lng: number;
  mapX: number;
  mapY: number;
  googleMapsQuery: string;
}

export const NEARBY_CLINICS: ClinicLocation[] = [
  {
    id: "aura-central-delhi",
    name: "Aura AYUSH Central Hospital & Research Institute",
    type: "Ayush Hospital",
    address: "Plot 42, Institutional Health City, Sector 14",
    city: "New Delhi",
    distanceKm: 1.2,
    driveTimeMins: 4,
    rating: 4.9,
    reviewCount: 1280,
    phone: "+91 11 4050 8899",
    openHours: "Open 24/7 (OPD 8:00 AM – 8:30 PM)",
    isOpenNow: true,
    services: ["Ayurvedic OPD", "Nadi Pariksha", "Panchakarma Center", "Dietetics", "Digital Pharmacy"],
    lat: 28.5355,
    lng: 77.1585,
    mapX: 42,
    mapY: 48,
    googleMapsQuery: "AYUSH+Central+Hospital+Delhi",
  },
  {
    id: "vasant-ayush-clinic",
    name: "Vasant Kunj Community AYUSH Health Center",
    type: "Community Health Center",
    address: "DDA Health Complex, Pocket 2, Sector B, Vasant Kunj",
    city: "New Delhi",
    distanceKm: 3.4,
    driveTimeMins: 11,
    rating: 4.8,
    reviewCount: 840,
    phone: "+91 11 2689 3322",
    openHours: "09:00 AM – 07:00 PM",
    isOpenNow: true,
    services: ["General Medicine", "Ahara-Vihara Nutrition", "Rasayana Therapy", "Yoga Consultation"],
    lat: 28.5211,
    lng: 77.1492,
    mapX: 25,
    mapY: 65,
    googleMapsQuery: "Community+AYUSH+Health+Center+Vasant+Kunj",
  },
  {
    id: "panchsheel-integrated-hub",
    name: "Panchsheel Integrated OPD & Wellness Center",
    type: "Integrated OPD Hub",
    address: "Main Ring Road, Near Metro Pillar 148, Block C",
    city: "New Delhi",
    distanceKm: 5.1,
    driveTimeMins: 16,
    rating: 4.9,
    reviewCount: 620,
    phone: "+91 11 4160 5500",
    openHours: "08:30 AM – 09:00 PM",
    isOpenNow: true,
    services: ["Allopathic & Ayush Integration", "Diagnostics & Labs", "Preventive Health", "Tele-OPD"],
    lat: 28.5489,
    lng: 77.2185,
    mapX: 78,
    mapY: 35,
    googleMapsQuery: "Panchsheel+Integrated+Wellness+Center",
  },
  {
    id: "south-city-panchakarma",
    name: "South City Panchakarma & Chronic Care Clinic",
    type: "Wellness & Panchakarma Clinic",
    address: "B-12, Green Park Extension, Near District Park",
    city: "New Delhi",
    distanceKm: 6.8,
    driveTimeMins: 22,
    rating: 4.7,
    reviewCount: 490,
    phone: "+91 11 2656 7744",
    openHours: "10:00 AM – 08:00 PM",
    isOpenNow: true,
    services: ["Panchakarma Therapies", "Joint & Spine Care", "Skin & Allergies", "Herbal Dispensary"],
    lat: 28.5582,
    lng: 77.2014,
    mapX: 62,
    mapY: 22,
    googleMapsQuery: "Green+Park+Ayurvedic+Panchakarma+Clinic",
  },
];

export function ClinicMapLocator({
  selectedClinicId,
  onSelectClinic,
}: {
  selectedClinicId?: string;
  onSelectClinic: (clinic: ClinicLocation) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeClinicId, setActiveClinicId] = useState<string>(selectedClinicId || (NEARBY_CLINICS[0]?.id ?? ""));
  const [userLocName, setUserLocName] = useState("Vasant Vihar / South Delhi (GPS Detected)");
  const [isLocating, setIsLocating] = useState(false);

  const filteredClinics = NEARBY_CLINICS.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q) ||
      c.services.some((s) => s.toLowerCase().includes(q))
    );
  });

  const activeClinic = NEARBY_CLINICS.find((c) => c.id === activeClinicId) || NEARBY_CLINICS[0]!;


  function handleLocateMe() {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          setUserLocName(`Lat: ${pos.coords.latitude.toFixed(3)}, Lng: ${pos.coords.longitude.toFixed(3)} (Live Location)`);
        },
        () => {
          setIsLocating(false);
          setUserLocName("Vasant Vihar, New Delhi (Estimated)");
        },
        { timeout: 5000 }
      );
    } else {
      setIsLocating(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden space-y-4">
      {/* Top Header */}
      <div className="p-5 md:p-6 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
              <MapPin className="h-4 w-4" />
            </span>
            <h3 className="text-lg font-bold text-slate-900">Nearest AYUSH &amp; Health Centers</h3>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Choose a nearby government-empanelled or accredited clinic for in-person consultation &amp; lab tests.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 text-xs font-semibold transition-colors shrink-0"
        >
          <Crosshair className={`h-3.5 w-3.5 ${isLocating ? "animate-spin text-sky-600" : ""}`} />
          <span>{isLocating ? "Detecting..." : "Detect Live GPS"}</span>
        </button>
      </div>

      <div className="px-5 md:px-6">
        {/* User Location Bar */}
        <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-sky-50/70 border border-sky-100 text-xs text-sky-900">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2.5 w-2.5 rounded-full bg-sky-600 shrink-0 animate-ping" />
            <span className="font-semibold truncate">Current Location: {userLocName}</span>
          </div>
          <span className="font-mono text-[11px] font-bold text-sky-700 bg-white px-2.5 py-0.5 rounded-full border border-sky-200 shrink-0">
            {filteredClinics.length} Centers Found
          </span>
        </div>

        {/* Search Input */}
        <div className="relative mt-3">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search clinics by name, specialty (Panchakarma, Nadi Pariksha), or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Grid: Interactive SVG Map on Left, Clinic List & Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-t border-slate-100">
        {/* ─── Interactive Visual Map (6 Cols) ────────────────────────────── */}
        <div className="lg:col-span-6 relative bg-gradient-to-br from-slate-900 via-[#102430] to-slate-950 p-4 sm:p-6 min-h-[340px] flex flex-col justify-between overflow-hidden">
          {/* Map Grid Background Pattern */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Map Overlay Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-semibold text-sky-200 border border-white/15">
              <Navigation className="h-3.5 w-3.5 text-sky-400" />
              <span>Interactive Clinical Radar</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">South Delhi Area</span>
          </div>

          {/* SVG Map Canvas with Interactive Markers */}
          <div className="relative my-4 h-64 w-full rounded-2xl bg-slate-900/60 border border-white/10 p-2 overflow-hidden">
            <svg className="w-full h-full text-slate-700/40" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M 0,50 Q 30,30 50,50 T 100,50" fill="none" stroke="currentColor" strokeWidth="1" />
              <path d="M 50,0 Q 60,40 50,100" fill="none" stroke="currentColor" strokeWidth="1" />
              <path d="M 10,20 L 90,80" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2,2" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="15" fill="none" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="0.5" />
            </svg>

            {/* User Location Radar Pin */}
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
              style={{ left: "50%", top: "50%" }}
            >
              <span className="relative flex h-5 w-5 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-sky-500 border-2 border-white shadow-sm" />
              </span>
              <span className="text-[10px] font-bold text-white bg-slate-900/90 px-1.5 py-0.5 rounded-md border border-white/20 mt-1 whitespace-nowrap shadow-xs">
                You (Patient)
              </span>
            </div>

            {/* Clinic Map Pins */}
            {NEARBY_CLINICS.map((clinic) => {
              const isSelected = clinic.id === activeClinicId;
              return (
                <button
                  key={clinic.id}
                  type="button"
                  onClick={() => {
                    setActiveClinicId(clinic.id);
                    onSelectClinic(clinic);
                  }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-transform hover:scale-110 focus:outline-none"
                  style={{ left: `${clinic.mapX}%`, top: `${clinic.mapY}%` }}
                >
                  <div
                    className={`flex items-center justify-center rounded-xl p-1.5 shadow-md border transition-all ${
                      isSelected
                        ? "bg-emerald-500 text-white border-white ring-4 ring-emerald-400/30 scale-110"
                        : "bg-white text-slate-800 border-slate-300 hover:bg-sky-50"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <span
                    className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md mt-1 whitespace-nowrap shadow-xs ${
                      isSelected
                        ? "bg-emerald-600 text-white border border-emerald-400"
                        : "bg-slate-900/80 text-slate-200 border border-white/10"
                    }`}
                  >
                    {clinic.distanceKm} km
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Active Clinic Info Preview on Map Bottom */}
          <div className="relative z-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-3 text-white flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-sky-200 truncate">{activeClinic.name}</p>
              <p className="text-[11px] text-slate-300 truncate">
                {activeClinic.distanceKm} km away · ~{activeClinic.driveTimeMins} mins · {activeClinic.openHours}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectClinic(activeClinic)}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold shadow-xs whitespace-nowrap transition-colors"
            >
              Select Center
            </button>
          </div>
        </div>

        {/* ─── Clinic List & Detailed Profile Cards (6 Cols) ──────────────── */}
        <div className="lg:col-span-6 p-4 sm:p-5 space-y-3 max-h-[460px] overflow-y-auto bg-slate-50/50">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider font-mono">
              Available Centers ({filteredClinics.length})
            </span>
            <span className="text-xs text-slate-400">Click to choose location</span>
          </div>

          <div className="space-y-2.5">
            {filteredClinics.map((clinic) => {
              const isSelected = clinic.id === activeClinicId;
              return (
                <div
                  key={clinic.id}
                  onClick={() => {
                    setActiveClinicId(clinic.id);
                    onSelectClinic(clinic);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/15"
                      : "bg-white border-slate-200/90 hover:border-sky-300 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 px-2 py-0.5 text-[10px] font-bold border border-emerald-200">
                          <ShieldCheck className="h-3 w-3" />
                          <span>{clinic.type}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                          <span>{clinic.rating}</span>
                          <span className="text-slate-400 font-normal">({clinic.reviewCount})</span>
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{clinic.name}</h4>
                      <p className="text-xs text-slate-600 flex items-start gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{clinic.address}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block text-sm font-bold text-emerald-700">{clinic.distanceKm} km</span>
                      <span className="block text-[11px] text-slate-500 font-medium">~{clinic.driveTimeMins} mins drive</span>
                    </div>
                  </div>

                  {/* Timing & Services Pills */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{clinic.openHours}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.googleMapsQuery)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-sky-700 hover:text-sky-900 font-semibold inline-flex items-center gap-1 bg-sky-50 px-2 py-1 rounded-lg transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Directions</span>
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveClinicId(clinic.id);
                          onSelectClinic(clinic);
                        }}
                        className={`rounded-xl px-3 py-1 text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {isSelected ? "✓ Selected" : "Choose Center"}
                      </button>
                    </div>
                  </div>

                  {/* Services tags */}
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {clinic.services.map((svc) => (
                      <span
                        key={svc}
                        className="rounded-md bg-slate-100 text-slate-600 px-2 py-0.5 text-[10.5px] font-medium"
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
