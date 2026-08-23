"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  applyExtraction,
  applySlotAnswer,
  applyYesNo,
  canCompleteIntake,
  createInitialState,
  nextQuestion,
  plainLanguageRecap,
  DASHAVIDHA_FACTORS,
  isFilled,
  type IntakeState,
} from "@/lib/intake/engine";
import { detectSarvamLanguageCode, isDemoGradeLanguage } from "@/lib/sarvam/languages";
import { clearOfflineVisit, saveOfflineVisit } from "@/lib/offline/cache";
import type { DocumentExtractMeta, DocumentKind } from "@/lib/documents/metadata";
import { DocumentPipelineRail, IntakePipelineRail } from "@/components/PipelineRails";

export type BoundProfile = {
  displayName: string;
  sessionUserId: string;
};

export type KioskAdapters = {
  startVisit: (args: {
    displayName: string;
    abhaId?: string;
    languageCode: string;
    kioskId: string;
    pathway: "allopathic" | "ayush";
    answeredBy: "patient" | "attendant";
    intakeJson: string;
    shareHistory: boolean;
    shareAyush: boolean;
    shareAbha: boolean;
    retainAfterEncounter: boolean;
    sessionUserId?: string;
  }) => Promise<string>;
  saveIntake: (args: {
    visitId: string;
    intakeJson: string;
    recapText?: string;
    status?: "intake" | "awaiting_patient_confirm" | "escalated";
  }) => Promise<null>;
  escalate: (args: { visitId: string; questionId: string; intakeJson: string }) => Promise<null>;
  confirmRecap: (args: { visitId: string; recapText: string; intakeJson: string }) => Promise<null>;
  uploadDocument?: (args: {
    visitId: string;
    file: File;
    kind: "prescription" | "lab" | "scan" | "discharge" | "other";
    rawText: string;
    structuredJson: string;
    confidence: number;
    failed?: boolean;
  }) => Promise<void>;
};

type LocalDoc = {
  kind: DocumentKind;
  confidence: number;
  reviewRequired: boolean;
  note: string;
};

export function KioskWizard({
  adapters,
  boundProfile,
}: {
  adapters: KioskAdapters | null;
  boundProfile?: BoundProfile;
}) {
  const [state, setState] = useState<IntakeState>(() => createInitialState("en-IN"));
  const [displayName, setDisplayName] = useState(boundProfile?.displayName ?? "Patient");
  const [abhaId, setAbhaId] = useState("");
  const [visitId, setVisitId] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [textBus, setTextBus] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ocrNote, setOcrNote] = useState("");
  const [extractLit, setExtractLit] = useState(false);
  const [docKind, setDocKind] = useState<DocumentKind>("prescription");
  const [docStage, setDocStage] = useState<"idle" | "physical" | "ocr" | "meta" | "attach" | "review">(
    "idle"
  );
  const [localDocs, setLocalDocs] = useState<LocalDoc[]>([]);

  useEffect(() => {
    const tags =
      typeof navigator.languages !== "undefined" && navigator.languages.length > 0
        ? [...navigator.languages]
        : [navigator.language];
    const detected = detectSarvamLanguageCode(tags);
    setState((s) => (s.phase === "consent" ? { ...s, languageCode: detected } : s));
  }, []);

  useEffect(() => {
    saveOfflineVisit({ state, displayName, visitId });
  }, [state, displayName, visitId]);

  const prompt = useMemo(() => {
    if (["consent", "answeredBy", "pathway"].includes(state.phase)) return null;
    return nextQuestion(state);
  }, [state]);

  const clinical = !["consent", "answeredBy", "pathway", "escalated"].includes(state.phase);

  async function persist(next: IntakeState, status?: "intake" | "awaiting_patient_confirm" | "escalated") {
    if (!adapters || !visitId) return;
    await adapters.saveIntake({
      visitId,
      intakeJson: JSON.stringify(next),
      recapText: plainLanguageRecap(next),
      status,
    });
  }

  async function beginClinical() {
    const next: IntakeState = { ...state, phase: "socrates" };
    setState(next);
    if (adapters) {
      const id = await adapters.startVisit({
        displayName,
        abhaId: abhaId || undefined,
        languageCode: state.languageCode,
        kioskId: boundProfile ? "patient-portal" : "kiosk-demo-1",
        pathway: state.pathway,
        answeredBy: state.answeredBy === "attendant" ? "attendant" : "patient",
        intakeJson: JSON.stringify(next),
        shareHistory: state.consent.shareHistory,
        shareAyush: state.consent.shareAyush,
        shareAbha: state.consent.shareAbha,
        retainAfterEncounter: state.consent.retainAfterEncounter,
        sessionUserId: boundProfile?.sessionUserId,
      });
      setVisitId(id);
    }
  }

  async function speak(text: string) {
    try {
      const res = await fetch("/api/sarvam/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, languageCode: state.languageCode || "en-IN" }),
      });
      const data = (await res.json()) as { audioBase64?: string | null };
      if (data.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        await audio.play();
      }
    } catch {
      /* typed mode is enough */
    }
  }

  async function recordAndTranscribe() {
    setBusy(true);
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.start();
      await new Promise((r) => setTimeout(r, 4000));
      recorder.stop();
      await new Promise((r) => {
        recorder.onstop = () => r(null);
      });
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: "audio/webm" });
      const form = new FormData();
      form.set("audio", blob, "speech.webm");
      form.set("languageCode", state.languageCode || "en-IN");
      const stt = await fetch("/api/sarvam/stt", { method: "POST", body: form });
      const sttJson = (await stt.json()) as { text?: string; error?: string; languageCode?: string };
      if (!sttJson.text) {
        setState((s) => ({ ...s, offlineMode: true }));
        const detail =
          typeof (sttJson as { detail?: unknown }).detail === "string"
            ? (sttJson as { detail: string }).detail.slice(0, 180)
            : "";
        setMessage(
          detail
            ? `${sttJson.error ?? "Voice unavailable"}: ${detail}`
            : (sttJson.error ?? "Voice unavailable. Use touchscreen chips — same text bus.")
        );
        return;
      }
      const sttLanguage = sttJson.languageCode
        ? detectSarvamLanguageCode(sttJson.languageCode)
        : state.languageCode;
      setTyped(sttJson.text);
      setTextBus(sttJson.text);
      const extracted = await fetch("/api/sarvam/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: sttJson.text }),
      });
      const ex = (await extracted.json()) as { extracted?: Record<string, string> };
      if (ex.extracted) {
        setExtractLit(true);
        const next = { ...applyExtraction(state, ex.extracted), languageCode: sttLanguage };
        setState(next);
        await persist(next);
      } else if (sttLanguage !== state.languageCode) {
        setState((s) => ({ ...s, languageCode: sttLanguage }));
      }
    } catch {
      setState((s) => ({ ...s, offlineMode: true }));
      setMessage("Microphone or network failed. Continue with touchscreen chips on the same bus.");
    } finally {
      setBusy(false);
    }
  }

  async function submitTyped() {
    if (!prompt || prompt.kind !== "ask") return;
    const value = typed.trim();
    if (!value) return;
    setTextBus(value);
    let next = state;
    if (prompt.yesNo) {
      next = applyYesNo(state, prompt.id, /^y/i.test(value) || value === "Yes");
    } else if (
      prompt.group === "socrates" ||
      prompt.group === "history" ||
      prompt.group === "ros" ||
      prompt.group === "dashavidha" ||
      prompt.group === "aharaVihara"
    ) {
      next = applySlotAnswer(
        state,
        prompt.group,
        prompt.id,
        value,
        state.answeredBy === "attendant" ? "attendant" : "patient"
      );
    }
    const follow = nextQuestion(next);
    if (next.phase !== "escalated") {
      if (follow.kind === "ask" && follow.group !== "meta") {
        next = { ...next, phase: follow.group };
      } else if (follow.kind === "complete") {
        next = { ...next, phase: "recap" };
      }
    }
    setState(next);
    setTyped("");
    if (next.phase === "escalated") {
      setMessage("Staff have been alerted. Stay here. This is not handled by the computer alone.");
      if (adapters && visitId) {
        await adapters.escalate({ visitId, questionId: prompt.id, intakeJson: JSON.stringify(next) });
      }
      return;
    }
    await persist(next);
    if (follow.kind === "ask") {
      void speak(follow.text);
    }
  }

  async function onUpload(file: File) {
    setBusy(true);
    setDocStage("ocr");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", docKind);
      let result: {
        text?: string;
        confidence?: number;
        failed?: boolean;
        note?: string;
        reviewRequired?: boolean;
        structured?: DocumentExtractMeta;
      } = {};
      try {
        const ocr = await fetch("/api/ocr", { method: "POST", body: form });
        if (ocr.ok) {
          result = (await ocr.json()) as typeof result;
        }
      } catch (err) {
        console.warn("Kiosk OCR fetch failed:", err);
      }
      setDocStage("meta");

      const meta =
        result.structured ??
        ({
          kind: docKind,
          confidence: result.confidence ?? 0,
          reviewRequired: result.reviewRequired ?? true,
          handwritingLikely: (result.confidence ?? 0) < 0.55,
          rawText: result.text ?? "",
          structuredFields: { possibleMedicines: [], possibleLabs: [] },
          attachedToVisit: true,
          mergedIntoClinicalSlots: false,
        } satisfies DocumentExtractMeta);
      setOcrNote(
        `${result.note ?? ""} Kind ${meta.kind}. Confidence ${Math.round(meta.confidence * 100)}%. Not merged into meds/allergies.`
      );
      setMessage(ocrNote || result.note || "Document attached for doctor review.");
      setLocalDocs((prev) => [
        ...prev,
        {
          kind: meta.kind,
          confidence: meta.confidence,
          reviewRequired: meta.reviewRequired,
          note: result.note ?? "",
        },
      ]);
      setDocStage("attach");
      if (adapters && visitId && adapters.uploadDocument) {
        await adapters.uploadDocument({
          visitId,
          file,
          kind: docKind === "scan" ? "scan" : docKind,
          rawText: result.text ?? "",
          structuredJson: JSON.stringify(meta),
          confidence: result.confidence ?? 0,
          failed: result.failed,
        });
      }
      setDocStage("review");
    } finally {
      setBusy(false);
    }
  }

  async function finishRecap() {
    const withConfirm = { ...state, phase: "recap" as const, patientRecapConfirmed: true };
    const check = canCompleteIntake(withConfirm);
    if (!check.ok) {
      setMessage(check.reasons.join(" · "));
      return;
    }
    setState({ ...withConfirm, phase: "complete" });
    if (adapters && visitId) {
      await adapters.confirmRecap({
        visitId,
        recapText: plainLanguageRecap(withConfirm),
        intakeJson: JSON.stringify(withConfirm),
      });
    }
    clearOfflineVisit();
  }

  const reviewPending = localDocs.filter((d) => d.reviewRequired).length;

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
      <p className="tl-overline">{boundProfile ? "Portal · case taking" : "Pipeline · kiosk"}</p>
      <h1 className="mt-1 text-3xl">{boundProfile ? "Logged-in intake" : "Patient kiosk"}</h1>
      <p className="mt-1 text-mist">
        Voice and touchscreen are equal first-class inputs into one speech/text bus. LLM fills slots only —
        never a diagnosis.{" "}
        {state.answeredBy === "attendant" ? "Answered by attendant. " : null}
        {!adapters ? "Local demo — start Convex to sync the doctor screen." : null}
      </p>
      {message ? (
        <p className="tl-card mt-3 border-pulse bg-onyx p-3 text-display">{message}</p>
      ) : null}

      {clinical ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[240px_1fr_240px]">
          <IntakePipelineRail state={state} extractLit={extractLit} />
          <div className="min-w-0">{renderMain()}</div>
          <DocumentPipelineRail
            stage={
              clinical
                ? docStage === "idle"
                  ? "physical"
                  : docStage
                : "idle"
            }
            attached={localDocs.length}
            reviewPending={reviewPending}
          />
        </div>
      ) : (
        renderMain()
      )}
    </div>
  );

  function renderMain() {
    return (
      <>
      {state.phase === "consent" ? (
        <section className="mt-6 space-y-3 border-t border-graphite pt-6">
          <p className="tl-overline">Consent</p>
          <h2 className="text-2xl">What may we share?</h2>
          <p className="text-body">Each section is optional. Audio explanation uses Bulbul when a Sarvam key is set.</p>
          {(
            [
              ["shareHistory", "Share history with the doctor"],
              ["shareAyush", "Share AYUSH / Dashavidha answers"],
              ["shareAbha", "Link / share with ABHA (optional)"],
              ["retainAfterEncounter", "Keep record after this visit (off = encounter only)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-lg text-display">
              <input
                type="checkbox"
                className="h-6 w-6"
                checked={state.consent[key]}
                onChange={(e) =>
                  setState({
                    ...state,
                    consent: { ...state.consent, [key]: e.target.checked },
                  })
                }
              />
              {label}
            </label>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              className="btn-ghost px-5 py-3"
              onClick={() => void speak("Please choose what to share. You can change any box.")}
            >
              Play audio explanation
            </button>
            <button className="btn-pulse px-5 py-3" onClick={() => setState({ ...state, phase: "answeredBy" })}>
              Continue
            </button>
          </div>
        </section>
      ) : null}

      {state.phase === "answeredBy" ? (
        <section className="mt-6 space-y-3 border-t border-graphite pt-6">
          <p className="tl-overline">Identity</p>
          <h2 className="text-2xl">Who is answering?</h2>
          <button className="tl-card block w-full p-4 text-left text-xl text-display" onClick={() => setState({ ...state, answeredBy: "patient", phase: "pathway" })}>
            I am the patient
          </button>
          <button className="tl-card block w-full p-4 text-left text-xl text-display" onClick={() => setState({ ...state, answeredBy: "attendant", phase: "pathway" })}>
            I am an attendant / caregiver
          </button>
        </section>
      ) : null}

      {state.phase === "pathway" ? (
        <section className="mt-6 space-y-3 border-t border-graphite pt-6">
          <p className="tl-overline">Pathway</p>
          <h2 className="text-2xl">Which doctor today?</h2>
          <button
            className={`block w-full p-4 text-left text-xl ${state.pathway === "allopathic" ? "tl-surface border-pulse" : "tl-card"}`}
            onClick={() => setState({ ...state, pathway: "allopathic" })}
          >
            Allopathic {state.pathway === "allopathic" ? "✓" : ""}
          </button>
          <button
            className={`block w-full p-4 text-left text-xl ${state.pathway === "ayush" ? "tl-surface border-pulse" : "tl-card"}`}
            onClick={() => setState({ ...state, pathway: "ayush" })}
          >
            Ayurvedic / Dashavidha {state.pathway === "ayush" ? "✓" : ""}
          </button>
          <div className="pt-4">
            <label className="tl-overline block">Name</label>
            <input className="tl-input text-xl" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <label className="tl-overline mt-4 block">ABHA ID (optional)</label>
            <input className="tl-input text-xl" value={abhaId} onChange={(e) => setAbhaId(e.target.value)} />
            <button className="btn-pulse mt-6 w-full py-4 text-xl" onClick={() => void beginClinical()}>
              Start health questions
            </button>
          </div>
        </section>
      ) : null}

      {state.phase === "escalated" ? (
        <section className="tl-card mt-8 border-pulse bg-onyx p-8">
          <p className="tl-overline status-live text-pulse">Staff alert</p>
          <h2 className="mt-2 text-3xl text-display">Please wait for staff</h2>
          <p className="mt-4 text-xl text-body">A nurse has been alerted. Do not continue the kiosk questionnaire.</p>
        </section>
      ) : null}

      {prompt && prompt.kind === "ask" && state.phase !== "documents" && state.phase !== "complete" && state.phase !== "recap" ? (
        <section className="border-t border-graphite pt-2 lg:border-0 lg:pt-0">
          <p className="tl-overline">
            Conversation engine · {prompt.group} · not a free-form interview
          </p>
          <h2 className="mt-1 text-2xl">{prompt.text}</h2>
          {prompt.group === "dashavidha" ? (
            <ol className="tl-surface mt-3 space-y-1 p-3">
              {DASHAVIDHA_FACTORS.map((factor, i) => (
                <li key={factor.key} className="flex gap-2 text-sm">
                  <span className="font-mono text-[10px] text-ash">{String(i + 1).padStart(2, "0")}</span>
                  <span className={prompt.id === factor.key ? "text-pulse" : "text-display"}>{factor.label}</span>
                  <span className="text-mist">{factor.hint}</span>
                  <span className="ml-auto font-mono text-[10px] text-ash">
                    {isFilled(state.dashavidha[factor.key]) ? "in" : prompt.id === factor.key ? "now" : "—"}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
          {!isDemoGradeLanguage(state.languageCode) ? (
            <p className="mt-1 font-mono text-sm text-warning">ASR for this language may be weaker. Prefer chips if unsure.</p>
          ) : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              disabled={busy}
              className="tl-card p-4 text-left"
              onClick={() => void recordAndTranscribe()}
            >
              <p className="tl-overline">Equal input</p>
              <p className="text-xl text-display">{busy ? "Listening…" : "Voice"}</p>
              <p className="mt-1 text-sm text-mist">STT into the speech/text bus, then JSON extract only.</p>
            </button>
            <div className="tl-card p-4">
              <p className="tl-overline">Equal input</p>
              <p className="text-xl text-display">Touchscreen</p>
              <p className="mt-1 text-sm text-mist">Chips and typing use the same bus. No separate form.</p>
            </div>
          </div>

          <p className="tl-overline mt-4">Speech / text bus</p>
          <p className="font-mono text-xs text-ash">Last in: {textBus || "—"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(prompt.chips ?? []).map((chip) => (
              <button
                key={chip}
                className="btn-ghost px-4 py-3 text-lg"
                onClick={() => {
                  setTyped(chip);
                  setTextBus(chip);
                }}
              >
                {chip}
              </button>
            ))}
          </div>
          <textarea
            className="tl-input mt-4 text-xl"
            rows={3}
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              setTextBus(e.target.value);
            }}
          />
          <button className="btn-pulse mt-4 px-5 py-3" onClick={() => void submitTyped()}>
            Save to structured record
          </button>
        </section>
      ) : null}

      {state.phase === "documents" ? (
        <section className="space-y-4">
          <p className="tl-overline">Physical documents</p>
          <h2 className="text-2xl">Camera or file — attached, not merged</h2>
          <p className="text-body">
            Prescription, lab, or scan. OCR fills metadata for the doctor. It does not write into medicines or allergies.
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["prescription", "Prescription"],
                ["lab", "Lab report"],
                ["scan", "Scan / discharge"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                className={docKind === id ? "btn-pulse px-4 py-2" : "btn-ghost px-4 py-2"}
                onClick={() => {
                  setDocKind(id);
                  setDocStage("physical");
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="font-mono text-sm text-mist"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onUpload(file);
            }}
          />
          <p className="font-mono text-sm text-ash">{ocrNote}</p>
          {localDocs.map((d, i) => (
            <p key={i} className="tl-tag">
              {d.kind} · {Math.round(d.confidence * 100)}% · {d.reviewRequired ? "doctor review" : "queued"}
            </p>
          ))}
          <button
            className="btn-pulse px-5 py-3"
            onClick={() => setState({ ...state, phase: "recap" })}
          >
            Skip / continue to recap
          </button>
        </section>
      ) : null}

      {state.phase === "recap" ? (
        <section>
          <p className="tl-overline">Validation / confidence</p>
          <h2 className="text-2xl">Please confirm this summary</h2>
          <p className="tl-surface mt-4 p-4 text-lg text-body">{plainLanguageRecap(state)}</p>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.08em] text-ash">
            Required: medicines, allergies, Ahara-Vihara, red-flag pass. Dashavidha complete or clinician to assess.
          </p>
          <div className="tl-card mt-4 p-4">
            <p className="tl-overline">Physical documents (optional)</p>
            <p className="mt-1 text-sm text-mist">Side pipeline before doctor summary. Not merged into meds/allergies.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["prescription", "Prescription"],
                  ["lab", "Lab report"],
                  ["scan", "Scan / discharge"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  className={docKind === id ? "btn-pulse px-3 py-1 text-sm" : "btn-ghost px-3 py-1 text-sm"}
                  onClick={() => setDocKind(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="mt-2 font-mono text-sm text-mist"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file);
              }}
            />
            <p className="mt-2 font-mono text-xs text-ash">{ocrNote}</p>
          </div>
          <button className="btn-pulse mt-4 w-full py-4 text-xl" onClick={() => void finishRecap()}>
            Yes, send to dual outputs
          </button>
        </section>
      ) : null}

      {state.phase === "complete" ? (
        <section className="space-y-4">
          <p className="tl-overline">Dual output</p>
          <h2 className="text-3xl">Thank you</h2>
          <p className="text-xl text-body">
            Nothing is a diagnosis until the doctor reviews it. HIS/EMR push is mocked ABDM/FHIR on approve.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/practitioner" className="tl-card border-pulse block p-5">
              <p className="tl-overline">Endpoint 1</p>
              <p className="mt-1 text-xl text-display">Practitioner queue</p>
              <p className="mt-2 text-mist">Doctor dashboard — three tracks, validation, OCR review.</p>
            </Link>
            <div className="tl-card p-5">
              <p className="tl-overline">Endpoint 2</p>
              <p className="mt-1 text-xl text-display">HIS / EMR</p>
              <p className="mt-2 text-mist">
                Mocked ABDM/FHIR bundle via <code>/api/mock-abdm</code> when the doctor approves. Not live ABDM.
              </p>
            </div>
          </div>
        </section>
      ) : null}
      </>
    );
  }
}
