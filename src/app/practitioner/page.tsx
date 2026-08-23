"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { convexConfigured } from "@/app/providers";
import { buildFhirBundle } from "@/lib/fhir/bundle";
import { extractBlocksApprove, type DocumentKind } from "@/lib/documents/metadata";
import { DocumentPipelinePanel } from "@/components/DocumentPipelinePanel";
import {
  canCompleteIntake,
  DASHAVIDHA_FACTORS,
  normalizeDashavidha,
  type IntakeState,
  type Slot,
} from "@/lib/intake/engine";
import { RoleGate, useAuraSession } from "@/components/useAuraSession";

export default function PractitionerPage() {
  if (!convexConfigured()) {
    return (
      <main className="px-4 py-8 md:px-8">
        <p className="tl-overline">Clinic</p>
        <h1 className="mt-2 text-2xl">Practitioner</h1>
        <p className="mt-4 text-body">Run Convex and sign in as practitioner@aura.local.</p>
      </main>
    );
  }
  return (
    <RoleGate allow={["practitioner", "admin"]} label="Practitioner">
      <PractitionerApp />
    </RoleGate>
  );
}

function PractitionerApp() {
  const session = useAuraSession();
  const sessionUserId = session?.userId as Id<"users"> | undefined;
  const queue = useQuery(api.visits.listQueue);
  const patients = useQuery(
    api.clinical.listPatientsForPractitioner,
    sessionUserId ? { sessionUserId } : "skip"
  );
  const dietitians = useQuery(
    api.auth.listDietitians,
    sessionUserId ? { sessionUserId } : "skip"
  );
  const [selected, setSelected] = useState<Id<"visits"> | null>(null);
  const [patientFilter, setPatientFilter] = useState<Id<"patients"> | null>(null);
  const detail = useQuery(api.visits.visitDetail, selected ? { visitId: selected } : "skip");
  const doctorEdit = useMutation(api.visits.doctorEdit);
  const approveVisit = useMutation(api.visits.approveVisit);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const attachDocument = useMutation(api.documents.attachDocument);
  const reviewExtract = useMutation(api.documents.reviewExtract);
  const acknowledgeRedFlag = useMutation(api.visits.acknowledgeRedFlag);
  const saveNote = useMutation(api.clinical.savePractitionerNote);
  const saveCare = useMutation(api.clinical.saveCarePlan);
  const saveAyurveda = useMutation(api.clinical.saveAyurvedaAssessment);
  const refer = useMutation(api.diet.referToDietitian);
  const approveDiet = useMutation(api.diet.approveDietPlan);
  const setAppt = useMutation(api.clinical.setAppointmentStatus);
  const sendMessage = useMutation(api.messaging.sendMessage);
  const [viewMode, setViewMode] = useState<"split" | "desk" | "pipeline">("split");
  const [notice, setNotice] = useState("");
  const [note, setNote] = useState("");
  const [careTitle, setCareTitle] = useState("Care plan");
  const [careBody, setCareBody] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [msg, setMsg] = useState("");

  const patientId = detail?.visit.patientId ?? patientFilter;
  const chartArgs =
    sessionUserId && patientId ? { sessionUserId, patientId } : "skip";
  const history = useQuery(api.visits.listPatientVisits, chartArgs);
  const symptoms = useQuery(api.clinical.listSymptoms, chartArgs);
  const notes = useQuery(
    api.clinical.listPractitionerNotes,
    sessionUserId && patientId ? { sessionUserId, patientId } : "skip"
  );
  const carePlans = useQuery(api.clinical.listCarePlans, chartArgs);
  const dietPlans = useQuery(api.diet.listDietPlans, chartArgs);
  const adherence = useQuery(api.clinical.listAdherence, chartArgs);
  const appts = useQuery(api.clinical.listAppointments, sessionUserId ? { sessionUserId } : "skip");
  const ayurveda = useQuery(
    api.visits.getAyurvedaAssessment,
    sessionUserId && selected ? { sessionUserId, visitId: selected } : "skip"
  );
  const progress = useQuery(
    api.diet.listProgressNotes,
    sessionUserId && patientId ? { sessionUserId, patientId } : "skip"
  );
  const messages = useQuery(api.messaging.listMessages, chartArgs);

  const intake = useMemo(() => {
    if (!detail) return null;
    try {
      const parsed = JSON.parse(detail.visit.intakeJson) as IntakeState;
      return { ...parsed, dashavidha: normalizeDashavidha(parsed.dashavidha) };
    } catch {
      return null;
    }
  }, [detail]);

  const ocrBlocked = Boolean(
    detail?.extracts.some((ex) =>
      extractBlocksApprove({
        reviewStatus: ex.reviewStatus,
        confidence: ex.confidence,
        structuredJson: ex.structuredJson,
      })
    )
  );

  if (!sessionUserId) return null;
  const actorId = sessionUserId;
  const doctorName = session?.displayName ?? "Practitioner";

  async function handleDoctorUpload(file: File, kind: DocumentKind) {
    if (!selected) {
      setNotice("Please select a visit from the queue to attach documents.");
      throw new Error("Please select a patient visit from the queue first.");
    }
    try {
      const uploadUrl = await generateUploadUrl();
      const storagePromise = fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      }).then(async (res) => {
        if (!res.ok) throw new Error("File upload to storage failed");
        return (await res.json()) as { storageId: Id<"_storage"> };
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

      const [{ storageId }, ocrData] = await Promise.all([storagePromise, ocrPromise]);

      await attachDocument({
        visitId: selected,
        storageId,
        kind: kind === "scan" ? "scan" : kind,
        rawText: ocrData.text ?? "",
        structuredJson: JSON.stringify(ocrData.structured ?? {}),
        confidence: ocrData.confidence ?? 0,
        failed: ocrData.failed,
      });
      setNotice(`Document attached (${kind}). Doctor review required before visit approval.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Document upload failed";
      setNotice(msg);
      throw new Error(msg);
    }
  }


  async function handleDoctorReview(
    extractId: Id<"documentExtracts">,
    status: "confirmed" | "corrected",
    draftJson?: string
  ) {
    try {
      await reviewExtract({
        extractId,
        reviewStatus: status,
        structuredJson: draftJson,
        sessionUserId: actorId,
      });
      setNotice(status === "confirmed" ? "Document extract confirmed." : "Document correction saved.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Review action failed");
    }
  }

  async function correct(path: string, original: string, next: string) {
    if (!selected || !intake) return;
    const updated = structuredClone(intake);
    applyPath(updated, path, next);
    await doctorEdit({
      visitId: selected,
      fieldPath: path,
      originalValue: original,
      correctedValue: next,
      doctorName,
      intakeJson: JSON.stringify(updated),
      sessionUserId: actorId,
    });
  }

  async function approve() {
    if (!selected || !detail || !intake) return;
    if (ocrBlocked) {
      setNotice("Low-confidence / pending OCR must be confirmed or corrected before approve.");
      return;
    }
    try {
      const bundle = buildFhirBundle({
        patientId: detail.visit.patientId,
        displayName: detail.patientName,
        language: detail.visit.languageCode,
        chiefComplaint: intake.socrates.chiefComplaint.value || "unspecified",
        medications: [intake.history.currentMedicines.value || "none known"],
        allergies: [intake.history.allergies.value || "none known"],
      });
      await fetch("/api/mock-abdm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bundle),
      });
      const result = await approveVisit({
        visitId: selected,
        doctorName,
        fhirBundleJson: JSON.stringify(bundle, null, 2),
        sessionUserId: actorId,
      });
      setNotice(`Approved. Hash ${result.recordHash.slice(0, 12)}… AI did not commit this.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Approve failed");
    }
  }

  return (
    <div
      className={`grid min-h-[calc(100vh-5rem)] grid-cols-1 gap-6 ${
        viewMode === "split"
          ? "lg:grid-cols-[240px_1fr_380px] 2xl:grid-cols-[260px_1fr_420px]"
          : "lg:grid-cols-[260px_1fr]"
      }`}
    >
      {/* Left Column: Clinic & Patient Queue */}
      <aside className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100/90 h-fit space-y-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold">OPD Desk</p>
          <h1 className="text-xl font-bold text-slate-900">Practitioner Console</h1>
          <p className="text-xs text-slate-500 mt-0.5">Final authority. Never auto-diagnostic.</p>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">Patients</p>
          <ul className="space-y-1.5">
            {patients?.map((p) => (
              <li key={p.patientId}>
                <button
                  className={`w-full rounded-2xl border p-2.5 text-left text-xs font-semibold transition-all ${
                    patientFilter === p.patientId
                      ? "bg-[#1b343f] text-white shadow-xs border-[#1b343f]"
                      : "border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                  onClick={() => setPatientFilter(p.patientId)}
                >
                  {p.displayName}
                  <span className={`block font-mono text-[10px] font-normal mt-0.5 ${patientFilter === p.patientId ? "text-slate-300" : "text-slate-400"}`}>
                    {p.lastStatus}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">Queue</p>
          <ul className="space-y-2">
            {queue?.map((v) => (
              <li key={v._id}>
                <button
                  className={`w-full rounded-2xl border p-3 text-left transition-all ${
                    v.status === "escalated"
                      ? "border-rose-300 bg-rose-50 text-rose-900 shadow-xs"
                      : selected === v._id
                        ? "bg-[#1b343f] text-white shadow-xs border-[#1b343f]"
                        : "border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                  onClick={() => {
                    setSelected(v._id);
                    setPatientFilter(v.patientId);
                  }}
                >
                  <span className={`block font-mono text-[10px] uppercase font-bold ${
                    selected === v._id ? "text-slate-300" : "text-slate-500"
                  }`}>
                    {v.status}
                  </span>
                  <span className="text-xs font-semibold">
                    {v.pathway} · {v.languageCode}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Center Column: Clinical Consultation Desk */}
      <main className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100/90 space-y-6 min-w-0">
        {!detail ? (
          <div className="text-center py-16 text-slate-400">
            <span className="text-3xl">🩺</span>
            <p className="mt-2 text-sm">Select a patient visit from the queue to start consultation.</p>
          </div>
        ) : viewMode === "pipeline" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="font-mono text-xs text-slate-400 uppercase tracking-wider">Case Documents</p>
                <h2 className="mt-0.5 text-2xl font-bold text-slate-900">{detail.patientName}</h2>
                <p className="text-xs text-slate-500">
                  {detail.abhaId ? `ABHA ${detail.abhaId}` : "No ABHA"} · {detail.visit.pathway} · {detail.visit.languageCode}
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                  onClick={() => setViewMode("split")}
                >
                  🔲 3-Column Split
                </button>
                <button
                  type="button"
                  className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                  onClick={() => setViewMode("desk")}
                >
                  📋 Consultation Desk
                </button>
                <button
                  type="button"
                  className="rounded-full px-3.5 py-1.5 text-xs font-semibold bg-[#1b343f] text-white shadow-xs"
                  onClick={() => setViewMode("pipeline")}
                >
                  📄 Document Pipeline & OCR ({detail.extracts.length})
                </button>
              </div>
            </div>

            <DocumentPipelinePanel
              extracts={detail.extracts}
              onUpload={handleDoctorUpload}
              onReview={handleDoctorReview}
              disabled={!selected}
            />
          </div>
        ) : (
          <>
            {detail.flags.some((f) => f.escalationStatus === "open") ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-xs">
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-rose-700">⚠️ Red Flag Alert</p>
                {detail.flags.map((f) => (
                  <p key={f._id} className="mt-2 font-mono text-xs text-rose-950 flex items-center justify-between">
                    <span>{f.questionId}</span>
                    <button
                      className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 text-xs font-bold transition-colors"
                      onClick={() => void acknowledgeRedFlag({ eventId: f._id })}
                    >
                      Acknowledge
                    </button>
                  </p>
                ))}
              </div>
            ) : null}

            {/* Case Header & View Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="font-mono text-xs text-slate-400 uppercase tracking-wider">Clinical Case</p>
                <h2 className="mt-0.5 text-2xl font-bold text-slate-900">{detail.patientName}</h2>
                <p className="text-xs text-slate-500">
                  {detail.abhaId ? `ABHA ${detail.abhaId}` : "No ABHA"} · {detail.visit.pathway}
                </p>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    viewMode === "split"
                      ? "bg-[#1b343f] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  onClick={() => setViewMode("split")}
                >
                  🔲 3-Column Split
                </button>
                <button
                  type="button"
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    viewMode === "desk"
                      ? "bg-[#1b343f] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  onClick={() => setViewMode("desk")}
                >
                  📋 Consultation Desk
                </button>
                <button
                  type="button"
                  className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                  onClick={() => setViewMode("pipeline")}
                >
                  📄 Document Pipeline & OCR ({detail.extracts.length})
                </button>
              </div>
            </div>

            {viewMode === "desk" && (
              <div className="flex items-center justify-between rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📄</span>
                  <div>
                    <p className="text-xs font-bold text-sky-950">
                      Document Pipeline: {detail.extracts.length} attached {ocrBlocked ? "· review pending" : ""}
                    </p>
                    <p className="text-[11px] text-sky-700">
                      Physical documents are reviewed in the dedicated OCR station without auto-merging into active medications.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-ghost px-4 py-1.5 text-xs font-semibold"
                  onClick={() => setViewMode("pipeline")}
                >
                  Open Document Station →
                </button>
              </div>
            )}

            {notice ? <p className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-mono text-amber-900">{notice}</p> : null}

            <section className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="font-mono text-[10px] uppercase font-bold text-slate-400">History</p>
              <h3 className="text-base font-bold text-slate-900 mt-1">Previous Consultations</h3>
              <ul className="mt-2 font-mono text-xs space-y-1">
                {history?.map((v) => (
                  <li key={v._id}>
                    <button className="text-sky-700 hover:underline font-semibold" onClick={() => setSelected(v._id)}>
                      {new Date(v.createdAt).toLocaleString()} · {v.status}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Symptom Timeline</h3>
              <div className="mt-2 space-y-1">
                {symptoms?.map((s) => (
                  <p key={s._id} className="font-mono text-xs text-slate-700">
                    {new Date(s.createdAt).toLocaleString()} · Severity {s.severity}/10 · {s.text}
                  </p>
                ))}
              </div>
            </section>

            {intake ? <StructuredRecord intake={intake} onCorrect={correct} /> : null}

            {intake ? (
              <section className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="font-mono text-[10px] uppercase font-bold text-slate-400">Validation</p>
                {canCompleteIntake({ ...intake, patientRecapConfirmed: true }).reasons.map((r) => (
                  <p key={r} className="font-mono text-xs text-amber-800 font-semibold">{r}</p>
                ))}
              </section>
            ) : null}

            <section className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="font-mono text-[10px] uppercase font-bold text-slate-400">Dashavidha Pariksha</p>
              <h3 className="text-base font-bold text-slate-900 mt-1">Practitioner Assessment & Interpretation</h3>
              <p className="text-xs text-slate-500">AI slots provide intake assistance. Practitioner writes the final clinical assessment.</p>
              <textarea
                className="tl-input mt-2"
                rows={3}
                defaultValue={ayurveda?.interpretation ?? ""}
                onChange={(e) => setInterpretation(e.target.value)}
                placeholder="e.g. Vata-Pitta Prakriti with mild Sama Agni, Pravara Bala..."
              />
              <button
                className="btn-pulse mt-2 px-4 py-1.5 text-xs font-semibold"
                onClick={() => {
                  if (!selected || !sessionUserId) return;
                  void saveAyurveda({
                    sessionUserId,
                    visitId: selected,
                    interpretation,
                  }).then(() => setNotice("Ayurveda assessment saved."));
                }}
              >
                Save Dashavidha Assessment
              </button>
            </section>


            <section className="border-t border-graphite pt-4">
              <h3 className="text-xl">Practitioner notes</h3>
              {notes?.map((n) => (
                <p key={n._id} className="mt-1 text-sm text-mist">
                  {n.body}
                </p>
              ))}
              <textarea className="tl-input mt-2" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              <button
                className="btn-ghost mt-2 px-4 py-1.5 text-sm"
                onClick={async () => {
                  if (!patientId || !note.trim()) return;
                  await saveNote({ sessionUserId: actorId, patientId, visitId: selected ?? undefined, body: note });
                  setNote("");
                }}
              >
                Add note
              </button>
            </section>

            <section className="border-t border-graphite pt-4">
              <h3 className="text-xl">Care / treatment plan</h3>
              {carePlans?.map((p) => (
                <p key={p._id} className="tl-tag mt-1">
                  {p.status} · {p.title}
                </p>
              ))}
              <input className="tl-input mt-2" value={careTitle} onChange={(e) => setCareTitle(e.target.value)} />
              <textarea className="tl-input mt-2" rows={3} value={careBody} onChange={(e) => setCareBody(e.target.value)} />
              <div className="mt-2 flex gap-2">
                <button
                  className="btn-ghost px-3 py-1.5 text-sm"
                  onClick={() =>
                    patientId
                      ? void saveCare({
                          sessionUserId: actorId,
                          patientId,
                          visitId: selected ?? undefined,
                          title: careTitle,
                          body: careBody,
                          status: "draft",
                        })
                      : undefined
                  }
                >
                  Save draft
                </button>
                <button
                  className="btn-pulse px-3 py-1.5 text-sm"
                  onClick={() =>
                    patientId
                      ? void saveCare({
                          sessionUserId: actorId,
                          patientId,
                          visitId: selected ?? undefined,
                          title: careTitle,
                          body: careBody,
                          status: "approved",
                        })
                      : undefined
                  }
                >
                  Approve for patient
                </button>
              </div>
            </section>

            <section className="border-t border-graphite pt-4">
              <h3 className="text-xl">Dietitian referral</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {dietitians?.map((d) => (
                  <button
                    key={d._id}
                    className="btn-ghost px-3 py-1 text-sm"
                    onClick={() =>
                      patientId
                        ? void refer({
                            sessionUserId: actorId,
                            patientId,
                            dietitianUserId: d._id,
                            visitId: selected ?? undefined,
                          })
                        : undefined
                    }
                  >
                    Refer {d.displayName}
                  </button>
                ))}
              </div>
              {dietPlans?.map((p) => (
                <div key={p._id} className="tl-card mt-2 p-3">
                  <p>
                    {p.title} · {p.practitionerApproved ? "approved" : "pending"}
                  </p>
                  <button
                    className="btn-pulse mt-2 px-3 py-1 text-xs"
                    onClick={() => void approveDiet({ sessionUserId: actorId, planId: p._id, approved: true })}
                  >
                    Approve diet plan for patient
                  </button>
                </div>
              ))}
              {progress?.map((p) => (
                <p key={p._id} className="mt-1 text-sm text-mist">
                  Dietitian: {p.body}
                </p>
              ))}
            </section>

            <section className="border-t border-graphite pt-4">
              <h3 className="text-xl">Follow-up / adherence</h3>
              {appts?.map((a) => (
                <p key={a._id} className="mt-1 font-mono text-sm">
                  {new Date(a.scheduledAt).toLocaleString()} · {a.status}{" "}
                  <button
                    className="btn-ghost px-2 py-0.5 text-xs"
                    onClick={() =>
                      void setAppt({ sessionUserId: actorId, appointmentId: a._id, status: "confirmed" })
                    }
                  >
                    confirm
                  </button>
                </p>
              ))}
              {adherence?.map((a) => (
                <p key={a._id} className="font-mono text-xs text-ash">
                  {a.kind} · {a.note} · {a.done ? "done" : "missed"}
                </p>
              ))}
            </section>

            <section className="border-t border-graphite pt-4">
              <h3 className="text-xl">Messages</h3>
              {messages?.map((m) => (
                <p key={m._id} className="text-sm">
                  {m.fromName}: {m.body}
                </p>
              ))}
              <textarea className="tl-input mt-2" rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} />
              <button
                className="btn-ghost mt-2 px-3 py-1 text-sm"
                onClick={async () => {
                  if (!patientId || !msg.trim()) return;
                  await sendMessage({
                    sessionUserId: actorId,
                    patientId,
                    visitId: selected ?? undefined,
                    toRole: "patient",
                    body: msg,
                  });
                  setMsg("");
                }}
              >
                Message patient
              </button>
            </section>

            <section className="border-t border-graphite pt-4">
              <h3 className="text-xl">Doctor edits</h3>
              {detail.edits.length === 0 ? (
                <p className="mt-1 text-xs text-mist">No manual corrections made yet.</p>
              ) : (
                detail.edits.map((e) => (
                  <p key={e.createdAt} className="mt-1 font-mono text-sm text-mist">
                    {e.fieldPath}: {e.originalValue} → {e.correctedValue} ({e.doctorName})
                  </p>
                ))
              )}
            </section>

            <section className="border-t border-graphite pt-4">
              <p className="tl-overline">HIS / EMR</p>
              <h3 className="text-xl">FHIR bundle (mocked ABDM)</h3>
              <pre className="tl-surface mt-2 max-h-64 overflow-auto p-3 text-xs text-success">
                {detail.fhirJson ?? "Generated on approve."}
              </pre>
            </section>

            {ocrBlocked ? (
              <div className="rounded border border-pulse bg-onyx/90 p-4 text-xs">
                <p className="font-semibold text-warning">⚠️ Approval Gated on Document Review</p>
                <p className="mt-1 text-mist">
                  Attached document extracts have pending reviews or low confidence scores. Confirm or correct them in the Document Pipeline panel on the right before finalizing this visit.
                </p>
              </div>
            ) : null}

            <button className="btn-pulse px-6 py-3" disabled={ocrBlocked} onClick={() => void approve()}>
              {ocrBlocked ? "Approve blocked — Doctor OCR review required" : "Approve and save (practitioner)"}
            </button>
          </>
        )}
      </main>

      {viewMode === "split" && (
        <section className="border-t border-graphite p-4 lg:border-t-0 lg:border-l lg:p-5 min-w-0 bg-surface/20">
          <DocumentPipelinePanel
            extracts={detail?.extracts ?? []}
            onUpload={handleDoctorUpload}
            onReview={handleDoctorReview}
            disabled={!selected}
          />
        </section>
      )}
    </div>
  );
}



function SlotFields({
  rows,
  onCorrect,
}: {
  rows: Array<{ path: string; label: string; value: string; confidence: number }>;
  onCorrect: (path: string, original: string, next: string) => void;
}) {
  return (
    <div className="mt-2 space-y-3">
      {rows.map((row) => (
        <label key={row.path} className="block">
          <span className="tl-overline">
            {row.label} · confidence {Math.round(row.confidence * 100)}%
          </span>
          <input
            className="tl-input"
            defaultValue={row.value}
            onBlur={(e) => {
              if (e.target.value !== row.value) onCorrect(row.path, row.value, e.target.value);
            }}
          />
        </label>
      ))}
    </div>
  );
}

function asRows(prefix: string, record: Record<string, Slot>, labels?: Record<string, string>) {
  return Object.entries(record).map(([k, s]) => ({
    path: `${prefix}.${k}`,
    label: labels?.[k] ?? k,
    value: s.value || s.status,
    confidence: s.confidence,
  }));
}

function StructuredRecord({
  intake,
  onCorrect,
}: {
  intake: IntakeState;
  onCorrect: (path: string, original: string, next: string) => void;
}) {
  const dashLabels = Object.fromEntries(DASHAVIDHA_FACTORS.map((f) => [f.key, f.label]));
  return (
    <div className="space-y-6">
      <section className="border-t border-graphite pt-4">
        <p className="tl-overline">AI draft</p>
        <h3 className="text-xl">Editable case summary</h3>
        <SlotFields rows={asRows("dashavidha", intake.dashavidha, dashLabels)} onCorrect={onCorrect} />
      </section>
      <section className="border-t border-graphite pt-4">
        <h3 className="text-xl">Clinical history</h3>
        <SlotFields rows={asRows("socrates", intake.socrates)} onCorrect={onCorrect} />
        <SlotFields rows={asRows("ros", intake.ros)} onCorrect={onCorrect} />
        <SlotFields rows={asRows("history", intake.history)} onCorrect={onCorrect} />
      </section>
      <section className="border-t border-graphite pt-4">
        <h3 className="text-xl">Ahara-Vihara</h3>
        <SlotFields rows={asRows("aharaVihara", intake.aharaVihara ?? {})} onCorrect={onCorrect} />
      </section>
    </div>
  );
}

function applyPath(intake: IntakeState, path: string, value: string) {
  const [group, key] = path.split(".");
  const patch = { value, status: "doctor_corrected" as const, source: "clinician" as const };
  if (group === "socrates" && key && key in intake.socrates) {
    intake.socrates[key as keyof IntakeState["socrates"]] = {
      ...intake.socrates[key as keyof IntakeState["socrates"]],
      ...patch,
    };
  }
  if (group === "history" && key && key in intake.history) {
    intake.history[key as keyof IntakeState["history"]] = {
      ...intake.history[key as keyof IntakeState["history"]],
      ...patch,
    };
  }
  if (group === "ros" && key && key in intake.ros) {
    intake.ros[key as keyof IntakeState["ros"]] = {
      ...intake.ros[key as keyof IntakeState["ros"]],
      ...patch,
    };
  }
  if (group === "dashavidha" && key && key in intake.dashavidha) {
    intake.dashavidha[key as keyof IntakeState["dashavidha"]] = {
      ...intake.dashavidha[key as keyof IntakeState["dashavidha"]],
      ...patch,
    };
  }
  if (group === "aharaVihara" && key && intake.aharaVihara && key in intake.aharaVihara) {
    intake.aharaVihara[key as keyof IntakeState["aharaVihara"]] = {
      ...intake.aharaVihara[key as keyof IntakeState["aharaVihara"]],
      ...patch,
    };
  }
}
