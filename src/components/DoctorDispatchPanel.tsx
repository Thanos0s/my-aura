"use client";

import { useCallback, useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Navigation,
  MapPin,
  Clock,
  AlertTriangle,
  Zap,
  RotateCw,
  Plus,
  Compass,
  ShieldCheck,
} from "lucide-react";

interface DoctorDispatchPanelProps {
  practitionerUserId: Id<"users">;
}

export function DoctorDispatchPanel({ practitionerUserId }: DoctorDispatchPanelProps) {
  const getDoctorQueue = useAction(api.consultations.getDoctorQueue);
  const markDelayed = useMutation(api.consultations.markDelayed);
  const requestConsultation = useMutation(api.consultations.requestConsultation);
  const patients = useQuery(api.clinical.listPatientsForPractitioner, { sessionUserId: practitionerUserId });

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [patientId, setPatientId] = useState<Id<"patients"> | "">("");
  const [consultationType, setConsultationType] = useState<"HOME_VISIT" | "CLINIC_OPD" | "TELECONSULT">("HOME_VISIT");
  const [urgency, setUrgency] = useState<"ROUTINE" | "PRIORITY" | "EMERGENCY">("ROUTINE");
  const [address, setAddress] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [lat, setLat] = useState<number>(28.5355);
  const [lng, setLng] = useState<number>(77.1585);
  const [consultMinutes, setConsultMinutes] = useState(25);
  const [submitting, setSubmitting] = useState(false);

  const midnightToday = useCallback(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime() + selectedDayOffset * 24 * 60 * 60 * 1000;
  }, [selectedDayOffset]);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDoctorQueue({
        practitionerUserId,
        dayStart: midnightToday(),
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load route optimizer queue");
    } finally {
      setLoading(false);
    }
  }, [getDoctorQueue, practitionerUserId, midnightToday]);

  useEffect(() => {
    if (practitionerUserId) {
      void loadQueue();
    }
  }, [practitionerUserId, loadQueue]);


  async function handleDelay(appointmentId: Id<"appointments">, addMinutes: number) {
    try {
      await markDelayed({ sessionUserId: practitionerUserId, appointmentId, delayMinutes: addMinutes });
      await loadQueue();
    } catch (err: any) {
      alert("Failed to adjust delay: " + (err?.message || "Unknown error"));
    }
  }

  async function handleCreateConsult(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) {
      alert("Please select a patient");
      return;
    }
    setSubmitting(true);
    try {
      const windowStart = midnightToday() + 9 * 60 * 60 * 1000;
      await requestConsultation({
        sessionUserId: practitionerUserId,
        practitionerUserId,
        patientId: patientId as Id<"patients">,
        preferredWindowStart: windowStart,
        preferredWindowEnd: windowStart + 8 * 60 * 60 * 1000,
        consultationType,
        urgency,
        address: address.trim() || "Local residence",
        pinCode: pinCode.trim() || "110016",
        geo: { lat, lng },
        estimatedConsultMinutes: Number(consultMinutes) || 25,
      });
      setShowAddModal(false);
      setAddress("");
      setPinCode("");
      await loadQueue();
    } catch (err: any) {
      alert("Failed to schedule consultation: " + (err?.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  }


  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Compass className="h-4 w-4" />
            </span>
            <p className="font-mono text-xs uppercase tracking-wider text-teal-700 font-bold">
              Route Engine · VRP / TSP
            </p>
          </div>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Doctor Dispatch & Travel Optimizer
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mathematical travel itinerary optimization with OSRM road matrix & emergency detour insertion
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
            <button
              onClick={() => setSelectedDayOffset(0)}
              className={`rounded-lg px-3 py-1 transition-all ${
                selectedDayOffset === 0
                  ? "bg-[#1b343f] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDayOffset(1)}
              className={`rounded-lg px-3 py-1 transition-all ${
                selectedDayOffset === 1
                  ? "bg-[#1b343f] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tomorrow
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Visit
          </button>

          <button
            onClick={() => void loadQueue()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Recalculate Route"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Distance Engine
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                  data.distanceSource === "osrm"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                <Zap className="h-3 w-3" />
                {data.distanceSource === "osrm"
                  ? "OSRM Road Matrix"
                  : "Haversine Traffic Model"}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {data.distanceSource === "osrm"
                ? "Exact street-level turn-by-turn road durations"
                : "Real-time mathematical speed & traffic estimate"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Scheduled Stops
            </p>
            <p className="mt-1 text-xl font-black text-slate-800">
              {data.queue.length} <span className="text-xs font-normal text-slate-500">Patients</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {data.legacyCount > 0 ? `+${data.legacyCount} clinic OPD bookings` : "All stops geo-routed"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Travel Time
            </p>
            <p className="mt-1 text-xl font-black text-teal-800">
              {data.queue
                .reduce((acc: number, q: any) => acc + (q.travelFromPreviousMinutes || 0), 0)
                .toFixed(0)}{" "}
              <span className="text-xs font-normal text-slate-500">Mins</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Total Distance:{" "}
              {data.queue
                .reduce((acc: number, q: any) => acc + (q.distanceFromPreviousKm || 0), 0)
                .toFixed(1)}{" "}
              Km
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Emergencies Inserted
            </p>
            <p className="mt-1 text-xl font-black text-rose-700">
              {data.queue.filter((q: any) => q.urgency === "EMERGENCY").length}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Minimum detour sequencing algorithm
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          <p className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Optimization Error
          </p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {loading && !data && (
        <div className="py-16 text-center text-slate-400">
          <RotateCw className="h-8 w-8 animate-spin mx-auto text-teal-600 mb-2" />
          <p className="text-sm font-semibold text-slate-600">Solving Travelling Salesperson Route Matrix...</p>
          <p className="text-xs text-slate-400 mt-1">Clustering coordinates and computing driving distance graphs</p>
        </div>
      )}

      {data && data.queue.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
          <Navigation className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Scheduled Home Visits for this Date</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Book geo-located home visit appointments to see the mathematical route optimization and sequence in action.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800"
          >
            <Plus className="h-3.5 w-3.5" /> Book First Consultation
          </button>
        </div>
      )}

      {data && data.queue.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Optimal Sequence Schedule ({data.queue.length} Stops)
            </p>
            <span className="text-[11px] text-slate-400">
              Start Departure: {formatTime(data.queue[0].estimatedArrivalAt - data.queue[0].travelFromPreviousMinutes * 60000)}
            </span>
          </div>

          <div className="space-y-3">
            {data.queue.map((entry: any) => {
              const isEmergency = entry.urgency === "EMERGENCY";
              const isPriority = entry.urgency === "PRIORITY";

              return (
                <div
                  key={entry.appointmentId}
                  className={`rounded-2xl border transition-all p-4 shadow-xs ${
                    isEmergency
                      ? "border-rose-300 bg-rose-50/50 shadow-rose-100"
                      : isPriority
                      ? "border-amber-200 bg-amber-50/30"
                      : "border-slate-200/90 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl font-black text-xs ${
                          isEmergency
                            ? "bg-rose-600 text-white"
                            : "bg-[#1b343f] text-white"
                        }`}
                      >
                        #{entry.sequenceIndex}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">
                            {entry.patientName}
                          </h4>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isEmergency
                                ? "bg-rose-100 text-rose-800"
                                : isPriority
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {entry.urgency}
                          </span>

                          <span className="rounded-full bg-teal-50 border border-teal-200/60 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                            {entry.consultationType.replace("_", " ")}
                          </span>

                          {entry.zoneId && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                              Zone {entry.zoneId}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-slate-600 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{entry.address || "Residence address"}</span>
                          {entry.pinCode && (
                            <span className="font-mono text-slate-500 font-semibold">
                              (PIN: {entry.pinCode})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end text-right">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                        <Clock className="h-3.5 w-3.5 text-teal-700" />
                        <span>{formatTime(entry.estimatedArrivalAt)}</span>
                        <span className="text-slate-400">→</span>
                        <span>{formatTime(entry.estimatedDepartureAt)}</span>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                        <span>
                          Travel: <strong>{entry.travelFromPreviousMinutes.toFixed(0)} min</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Distance: <strong>{entry.distanceFromPreviousKm.toFixed(1)} km</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>
                        Buffer margin: <strong>{entry.bufferMinutes}m</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">Add Delay:</span>
                      <button
                        onClick={() => handleDelay(entry.appointmentId, 15)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        +15m
                      </button>
                      <button
                        onClick={() => handleDelay(entry.appointmentId, 30)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        +30m
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Book Geo-Location Consultation</h3>
                <p className="text-xs text-slate-500">Adds patient visit to the live VRP/TSP dispatcher</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateConsult} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Patient</label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value as Id<"patients">)}
                  required
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-teal-600"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients?.map((p) => (
                    <option key={p.patientId} value={p.patientId}>
                      {p.displayName} ({p.lastStatus})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Consultation Type</label>
                  <select
                    value={consultationType}
                    onChange={(e: any) => setConsultationType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 font-semibold"
                  >
                    <option value="HOME_VISIT">Home Visit</option>
                    <option value="CLINIC_OPD">Clinic OPD</option>
                    <option value="TELECONSULT">Teleconsult</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Urgency Priority</label>
                  <select
                    value={urgency}
                    onChange={(e: any) => setUrgency(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 font-semibold"
                  >
                    <option value="ROUTINE">Routine</option>
                    <option value="PRIORITY">Priority</option>
                    <option value="EMERGENCY">Emergency (Immediate Detour)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Pocket 2, Sector B, Vasant Kunj"
                  required
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    placeholder="110070"
                    required
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(parseFloat(e.target.value) || 28.5355)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(parseFloat(e.target.value) || 77.1585)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={consultMinutes}
                    onChange={(e) => setConsultMinutes(parseInt(e.target.value) || 25)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 font-mono"
                  />
                </div>
              </div>


              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add to Dispatch Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}