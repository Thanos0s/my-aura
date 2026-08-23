"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { DocumentPipelinePanel } from "./DocumentPipelinePanel";
import type { DocumentKind } from "@/lib/documents/metadata";

type Tab =
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
  const [tab, setTab] = useState<Tab>("intake");
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

  async function handlePatientUpload(file: File, kind: DocumentKind) {
    const postUrl = await generateUploadUrl({});
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!result.ok) throw new Error("File upload failed");
    const json = (await result.json()) as { storageId: Id<"_storage"> };

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

    let activeVisitId = visits?.[0]?._id;
    if (!activeVisitId) {
      activeVisitId = await startVisit({
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
        sessionUserId,
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
    <div className="px-4 py-6 md:px-8">
      <p className="tl-overline">Portal</p>
      <h1 className="mt-1 text-3xl">{displayName}</h1>
      <p className="mt-1 text-mist">
        Approved plans only. AI case-taking is a draft until the practitioner signs.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["intake", "Case taking"],
            ["documents", `Documents & OCR (${documentExtracts?.length ?? 0})`],
            ["symptoms", "Symptoms"],
            ["lifestyle", "Ahara-Vihara"],
            ["plans", "Care & diet"],
            ["adherence", "Check-ins"],
            ["book", "Follow-up"],
            ["messages", "Messages"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "btn-pulse px-3 py-1.5 text-sm" : "btn-ghost px-3 py-1.5 text-sm"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "intake" ? (
        <div className="mt-4">
          <p className="mb-2 font-mono text-xs text-ash">
            Bound visits: {visits?.length ?? 0}. Same engine as /kiosk, linked to this account.
          </p>
          {intake}
        </div>
      ) : null}

      {tab === "documents" ? (
        <section className="mt-6 max-w-3xl space-y-4">
          <div>
            <p className="tl-overline">Medical Documents</p>
            <h2 className="text-xl text-display">Prescriptions, Lab Sheets & Scans</h2>
            <p className="mt-1 text-sm text-mist">
              Upload physical records from past visits or external clinics. OCR extracts candidate text for your doctor to review. Content is never automatically merged into your medications without doctor verification.
            </p>
          </div>

          <DocumentPipelinePanel
            extracts={documentExtracts ?? []}
            onUpload={handlePatientUpload}
          />
        </section>
      ) : null}


      {tab === "symptoms" ? (
        <section className="mt-6 space-y-3">
          <h2 className="text-xl">Symptom log</h2>
          <textarea className="tl-input" rows={3} value={symptomText} onChange={(e) => setSymptomText(e.target.value)} />
          <label className="block font-mono text-sm">
            Severity {severity}
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
            className="btn-pulse px-4 py-2"
            onClick={async () => {
              if (!symptomText.trim()) return;
              await logSymptom({ sessionUserId, text: symptomText, severity });
              setSymptomText("");
            }}
          >
            Log symptom
          </button>
          <ol className="space-y-2">
            {symptoms?.map((s) => (
              <li key={s._id} className="tl-card px-3 py-2">
                <span className="font-mono text-[10px] text-ash">
                  {new Date(s.createdAt).toLocaleString()} · {s.severity}/10
                </span>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {tab === "lifestyle" ? (
        <section className="mt-6 space-y-3">
          <h2 className="text-xl">Ahara-Vihara</h2>
          <p className="text-sm text-mist">Editable. Last saved {lifestyle ? new Date(lifestyle.updatedAt).toLocaleString() : "never"}.</p>
          {(
            [
              ["mealTimes", "Meal times"],
              ["dietType", "Diet type"],
              ["sleep", "Sleep"],
              ["waterIntake", "Water"],
              ["teaCoffeeSubstances", "Tea / coffee / substances"],
              ["notes", "Notes"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="tl-overline">{label}</span>
              <input
                className="tl-input"
                defaultValue={lifestyle?.[key] ?? ""}
                onChange={(e) => setLife((l) => ({ ...l, [key]: e.target.value }))}
              />
            </label>
          ))}
          <button
            className="btn-pulse px-4 py-2"
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
            Save lifestyle
          </button>
        </section>
      ) : null}

      {tab === "plans" ? (
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <h2 className="text-xl">Practitioner-approved care</h2>
            {care?.length === 0 ? <p className="mt-2 text-mist">None shared yet.</p> : null}
            {care?.map((p) => (
              <article key={p._id} className="tl-card mt-2 p-3">
                <p className="tl-tag">{p.status}</p>
                <h3 className="text-lg">{p.title}</h3>
                <p className="whitespace-pre-wrap text-mist">{p.body}</p>
              </article>
            ))}
          </div>
          <div>
            <h2 className="text-xl">Diet plans</h2>
            <p className="text-sm text-mist">Visible if practitioner-approved or marked shareable.</p>
            {diet?.map((p) => (
              <article key={p._id} className="tl-card mt-2 p-3">
                <p className="tl-tag">
                  {p.practitionerApproved ? "practitioner approved" : "shareable"}
                </p>
                <h3 className="text-lg">{p.title}</h3>
                <p className="text-mist">{p.notes}</p>
                {p.meals.map((m) => (
                  <p key={m._id} className="mt-1 font-mono text-sm">
                    {m.label}: {m.itemsText}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "adherence" ? (
        <section className="mt-6 space-y-3">
          <h2 className="text-xl">Adherence check-in</h2>
          <textarea className="tl-input" rows={2} value={checkin} onChange={(e) => setCheckin(e.target.value)} />
          <button
            className="btn-pulse px-4 py-2"
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
            Log check-in
          </button>
          <ul className="space-y-2">
            {adherence?.map((a) => (
              <li key={a._id} className="tl-surface px-3 py-2 font-mono text-sm">
                {new Date(a.createdAt).toLocaleString()} · {a.kind} · {a.done ? "done" : "missed"} · {a.note}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "book" ? (
        <section className="mt-6 space-y-3">
          <h2 className="text-xl">Book / follow-up</h2>
          <select
            className="tl-input"
            value={practId}
            onChange={(e) => setPractId(e.target.value as Id<"users">)}
          >
            <option value="">Select practitioner</option>
            {practitioners?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.displayName}
              </option>
            ))}
          </select>
          <input
            className="tl-input"
            type="datetime-local"
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
          />
          <button
            className="btn-pulse px-4 py-2"
            onClick={async () => {
              if (!practId || !slot) return;
              await requestAppointment({
                sessionUserId,
                practitionerUserId: practId,
                scheduledAt: new Date(slot).getTime(),
                notes: "Follow-up",
              });
            }}
          >
            Request slot
          </button>
          <ul className="mt-4 space-y-2">
            {appointments?.map((a) => (
              <li key={a._id} className="tl-card px-3 py-2">
                {new Date(a.scheduledAt).toLocaleString()} · {a.status}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "messages" ? (
        <section className="mt-6 space-y-3">
          <h2 className="text-xl">Thread</h2>
          <div className="flex gap-2">
            <button
              className={toRole === "practitioner" ? "btn-pulse px-3 py-1 text-sm" : "btn-ghost px-3 py-1 text-sm"}
              onClick={() => setToRole("practitioner")}
            >
              Practitioner
            </button>
            <button
              className={toRole === "dietitian" ? "btn-pulse px-3 py-1 text-sm" : "btn-ghost px-3 py-1 text-sm"}
              onClick={() => setToRole("dietitian")}
            >
              Dietitian
            </button>
          </div>
          <div className="tl-surface max-h-64 space-y-2 overflow-auto p-3">
            {messages?.map((m) => (
              <p key={m._id} className="text-sm">
                <span className="font-mono text-[10px] text-ash">
                  {m.fromName} → {m.toRole}
                </span>
                <br />
                {m.body}
              </p>
            ))}
          </div>
          <textarea className="tl-input" rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} />
          <button
            className="btn-pulse px-4 py-2"
            onClick={async () => {
              if (!msg.trim()) return;
              await sendMessage({ sessionUserId, toRole, body: msg });
              setMsg("");
            }}
          >
            Send
          </button>
        </section>
      ) : null}
    </div>
  );
}
