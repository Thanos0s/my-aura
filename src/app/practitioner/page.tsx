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
      return;
    }

    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) throw new Error("File upload to storage failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };

      const ocrForm = new FormData();
      ocrForm.append("file", file);
      ocrForm.append("kind", kind);
      const ocrRes = await fetch("/api/ocr", { method: "POST", body: ocrForm });
      const ocrData = (await ocrRes.json()) as {
        text?: string;
        confidence?: number;
        structured?: object;
        failed?: boolean;
      };

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
      setNotice(e instanceof Error ? e.message : "Document upload failed");
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
    <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_400px]">
      <aside className="border-b border-graphite p-4 lg:border-r lg:border-b-0">

        <p className="tl-overline">Clinic</p>
        <h1 className="mt-1 text-xl">Practitioner</h1>
        <p className="mt-1 font-mono text-[11px] text-ash">Final authority. Never auto-diagnostic.</p>
        <p className="tl-overline mt-4">Patients</p>
        <ul className="mt-2 space-y-1">
          {patients?.map((p) => (
            <li key={p.patientId}>
              <button
                className={`w-full rounded-[4px] border border-graphite p-2 text-left text-sm ${
                  patientFilter === p.patientId ? "nav-active" : ""
                }`}
                onClick={() => setPatientFilter(p.patientId)}
              >
                {p.displayName}
                <span className="block font-mono text-[10px] text-ash">{p.lastStatus}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="tl-overline mt-4">Queue</p>
        <ul className="mt-2 space-y-2">
          {queue?.map((v) => (
            <li key={v._id}>
              <button
                className={`w-full rounded-[4px] border p-3 text-left ${
                  v.status === "escalated" ? "border-pulse bg-onyx text-display" : "border-graphite"
                } ${selected === v._id ? "nav-active pl-4" : ""}`}
                onClick={() => {
                  setSelected(v._id);
                  setPatientFilter(v.patientId);
                }}
              >
                <span className="block font-mono text-[10px] uppercase text-mist">{v.status}</span>
                <span className="text-sm">
                  {v.pathway} · {v.languageCode}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="space-y-6 p-4 md:p-6">
        {!detail ? <p className="text-mist">Select a visit from the queue.</p> : (
          <>
            {detail.flags.some((f) => f.escalationStatus === "open") ? (
              <div className="tl-card border-pulse bg-onyx p-4">
                <p className="tl-overline text-pulse">Red flag</p>
                {detail.flags.map((f) => (
                  <p key={f._id} className="mt-2 font-mono text-sm">
                    {f.questionId}{" "}
                    <button
                      className="btn-pulse ml-2 px-3 py-1 text-xs"
                      onClick={() => void acknowledgeRedFlag({ eventId: f._id })}
                    >
                      acknowledge
                    </button>
                  </p>
                ))}
              </div>
            ) : null}
            <div className="border-b border-graphite pb-4">
              <p className="tl-overline">Case</p>
              <h2 className="mt-1 text-3xl">{detail.patientName}</h2>
              <p className="mt-1 text-mist">
                {detail.abhaId ? `ABHA ${detail.abhaId}` : "No ABHA"} · {detail.visit.pathway}
              </p>
            </div>
            {notice ? <p className="tl-surface p-3 font-mono text-sm text-warning">{notice}</p> : null}

            <section>
              <p className="tl-overline">History</p>
              <h3 className="text-xl">Previous consultations</h3>
              <ul className="mt-2 font-mono text-sm">
                {history?.map((v) => (
                  <li key={v._id}>
                    <button className="text-pulse" onClick={() => setSelected(v._id)}>
                      {new Date(v.createdAt).toLocaleString()} · {v.status}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-xl">Symptom timeline</h3>
              {symptoms?.map((s) => (
                <p key={s._id} className="font-mono text-sm text-mist">
                  {new Date(s.createdAt).toLocaleString()} · {s.severity}/10 · {s.text}
                </p>
              ))}
            </section>

            {intake ? <StructuredRecord intake={intake} onCorrect={correct} /> : null}

            {intake ? (
              <section className="border-t border-graphite pt-4">
                <p className="tl-overline">Validation</p>
                {canCompleteIntake({ ...intake, patientRecapConfirmed: true }).reasons.map((r) => (
                  <p key={r} className="font-mono text-sm text-warning">{r}</p>
                ))}
              </section>
            ) : null}

            <section className="border-t border-graphite pt-4">
              <p className="tl-overline">Dashavidha</p>
              <h3 className="text-xl">Practitioner interpretation only</h3>
              <p className="text-sm text-mist">AI slots are not a diagnosis. You write the assessment.</p>
              <textarea
                className="tl-input mt-2"
                rows={3}
                defaultValue={ayurveda?.interpretation ?? ""}
                onChange={(e) => setInterpretation(e.target.value)}
              />
              <button
                className="btn-ghost mt-2 px-4 py-1.5 text-sm"
                onClick={() =>
                  selected
                    ? void saveAyurveda({
                        sessionUserId: actorId,
                        visitId: selected,
                        interpretation: interpretation || ayurveda?.interpretation || "",
                      })
                    : undefined
                }
              >
                Save assessment
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

      <section className="border-t border-graphite p-4 xl:border-t-0 xl:border-l xl:p-6 min-w-0 bg-surface/30">
        <DocumentPipelinePanel
          extracts={detail?.extracts ?? []}
          onUpload={handleDoctorUpload}
          onReview={handleDoctorReview}
          disabled={!selected}
        />
      </section>
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
