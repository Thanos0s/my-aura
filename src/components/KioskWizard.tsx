"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  applySlotAnswer,
  applyYesNo,
  canCompleteIntake,
  createInitialState,
  nextQuestion,
  plainLanguageRecap,
  DASHAVIDHA_FACTORS,
  isFilled,
  QUESTION_BANK,
  type IntakeState,
} from "@/lib/intake/engine";
import { detectSarvamLanguageCode, SARVAM_LANGUAGES } from "@/lib/sarvam/languages";

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
  rawText?: string;
  structured?: any;
};

// ─── 5-Step Master Progress Steps ──────────────────────────────────────────

export const FIVE_STEP_JOURNEY = [
  { id: "step1", num: "01", title: "Arrive & Login", desc: "ABHA / Aadhaar · Language · Consent" },
  { id: "step2", num: "02", title: "Talk to AI", desc: "SOCRATES · Ayurveda (if AYUSH) · Red-flags" },
  { id: "step3", num: "03", title: "Scan Documents", desc: "Old Rx · Lab sheets · Discharges" },
  { id: "step4", num: "04", title: "Build Summary", desc: "Unified clinical sheet · ABHA link" },
  { id: "step5", num: "05", title: "See the Doctor", desc: "OPD screen ready · Fast consultation" },
] as const;

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
  const [busy, setBusy] = useState(false);

  const [message, setMessage] = useState("");
  const [ocrNote, setOcrNote] = useState("");
  const [extractLit, setExtractLit] = useState(false);
  const [docKind, setDocKind] = useState<DocumentKind>("prescription");
  const [docStage, setDocStage] = useState<"idle" | "physical" | "ocr" | "meta" | "attach" | "review">("idle");
  const [localDocs, setLocalDocs] = useState<LocalDoc[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceChatMode, setVoiceChatMode] = useState(true);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Arrive sub-step (login, language, consent, pathway)
  const [arriveSubStep, setArriveSubStep] = useState<"id" | "language" | "consent" | "pathway">("id");

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

  // Derive current macro step index (0 to 4)
  const currentMacroStep = useMemo(() => {
    if (state.phase === "consent" || state.phase === "answeredBy" || state.phase === "pathway") {
      return 0; // Step 1: Arrive & Login
    }
    if (
      state.phase === "socrates" ||
      state.phase === "ros" ||
      state.phase === "dashavidha" ||
      state.phase === "aharaVihara" ||
      state.phase === "history" ||
      state.phase === "redFlag" ||
      state.phase === "escalated"
    ) {
      return 1; // Step 2: Talk to the AI
    }
    if (state.phase === "documents") {
      return 2; // Step 3: Scan Your Old Documents
    }
    if (state.phase === "recap") {
      return 3; // Step 4: AI Builds the Summary
    }
    return 4; // Step 5: You Go See the Doctor
  }, [state.phase]);

  const prompt = useMemo(() => {
    if (["consent", "answeredBy", "pathway"].includes(state.phase)) return null;
    return nextQuestion(state);
  }, [state]);

  // Derived Conversational History for Point-wise Chatbot UI
  const conversationHistory = useMemo(() => {
    if (state.chatHistory && state.chatHistory.length > 0) {
      const seenFields = new Set<string>();
      return state.chatHistory
        .filter((item) => {
          if (!item.field || seenFields.has(item.field)) return false;
          if (item.question.startsWith("[from prior")) return false;
          seenFields.add(item.field);
          return true;
        })
        .map((item) => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
        }));
    }

    const list: Array<{ id: string; question: string; answer: string }> = [];
    const lang = state.languageCode || "en-IN";
    const isHi = lang.startsWith("hi");

    // 1. Opening Chief Complaint Question & Answer
    if (isFilled(state.socrates.chiefComplaint)) {
      list.push({
        id: "socrates-chiefComplaint",
        question: isHi ? "आज आपको क्या मुख्य समस्या या तकलीफ है?" : "What is the main problem that brought you here today?",
        answer: state.socrates.chiefComplaint.value,
      });
    }

    if (state.matchedComplaintId && state.complaintAnswers) {
      const complaint = QUESTION_BANK.find((c) => c.id === state.matchedComplaintId);
      if (complaint) {
        for (const q of complaint.questions) {
          const ans = state.complaintAnswers[q.field];
          if (ans) {
            list.push({
              id: `complaint-${q.id}`,
              question: isHi ? q.hi : q.en,
              answer: ans,
            });
          }
        }
      }
    }

    return list;
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

  function stopSpeaking() {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  }

  async function speak(text: string, onDone?: () => void) {
    stopSpeaking();
    if (!text || !text.trim()) {
      if (onDone) onDone();
      return;
    }
    setIsSpeaking(true);
    try {
      const res = await fetch("/api/sarvam/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, languageCode: state.languageCode || "en-IN" }),
      });
      const data = (await res.json()) as { audioBase64?: string | null };
      if (data.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        currentAudioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
          if (onDone) onDone();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
          if (onDone) onDone();
        };
        await audio.play();
      } else {
        setIsSpeaking(false);
        if (onDone) onDone();
      }
    } catch {
      setIsSpeaking(false);
      if (onDone) onDone();
    }
  }

  async function beginClinical() {
    const next: IntakeState = { ...state, phase: "socrates" };
    setState(next);
    let newVisitId = visitId;
    if (adapters) {
      newVisitId = await adapters.startVisit({
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
      setVisitId(newVisitId);
    }
    // Speak first question in selected language, then auto-listen if continuous voice mode is on
    const q1 = nextQuestion(next);
    if (q1.kind === "ask") {
      void speak(q1.text, () => {
        if (voiceChatMode) {
          setTimeout(() => {
            void recordAndTranscribe();
          }, 300);
        }
      });
    }
  }

  function stopRecordingEarly() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  async function handleAnswerSubmit(value: string) {
    if (!prompt || prompt.kind !== "ask") return;
    const val = value.trim();
    if (!val) return;
    let next = state;
    setExtractLit(true);



    if (prompt.yesNo) {
      const isYes =
        /^y|हाँ|ha|yes|haan|bilkul/i.test(val) || val === "Yes" || val === "हाँ";
      next = applyYesNo(state, prompt.id, isYes);
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
        val,
        state.answeredBy === "attendant" ? "attendant" : "patient"
      );
    }

    let follow = nextQuestion(next);

    // Safety: never speak the same slot twice in a row.
    if (follow.kind === "ask" && follow.id === prompt.id) {
      follow = { kind: "complete" };
    }

    if (follow.kind === "complete") {
      next = { ...next, phase: "documents" };
      setState(next);
      setTyped("");
      await persist(next);
      const isHi = (next.languageCode || "en-IN").startsWith("hi");
      const doneMsg = isHi
        ? "धन्यवाद! आपकी समस्या का विवरण दर्ज कर लिया गया है। अब आप अगले चरण पर आगे बढ़ सकते हैं।"
        : "Thank you! Your intake is complete. You can now proceed to the next step.";
      void speak(doneMsg);
      return;
    }

    if (next.phase !== "escalated") {
      if (follow.kind === "ask" && follow.group !== "meta") {
        next = { ...next, phase: follow.group };
      }
    }
    setState(next);
    setTyped("");

    if (next.phase === "escalated") {
      setMessage("⚠️ Staff have been alerted immediately. Please stay here for immediate assistance.");
      if (adapters && visitId) {
        await adapters.escalate({ visitId, questionId: prompt.id, intakeJson: JSON.stringify(next) });
      }
      return;
    }

    await persist(next);

    if (follow.kind === "ask") {
      // Continuous Voice Chatbot: Speak the next question in Hindi/chosen language, then auto-listen
      void speak(follow.text, () => {
        if (voiceChatMode) {
          setTimeout(() => {
            void recordAndTranscribe();
          }, 350);
        }
      });
    }

  }

  async function recordAndTranscribe() {
    if (isRecording || isSpeaking) return;
    stopSpeaking();
    setBusy(true);
    setIsRecording(true);
    setRecordingSeconds(0);
    setMessage("");

    const timer = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const stoppedPromise = new Promise((resolve) => {
        recorder.onstop = () => resolve(null);
      });

      recorder.start();

      // Auto-stop after 5.5s if not stopped earlier by user
      const timeoutId = setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 5500);

      await stoppedPromise;
      clearTimeout(timeoutId);
      stream.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      clearInterval(timer);
      setIsRecording(false);

      if (chunks.length === 0) {
        setBusy(false);
        return;
      }

      const blob = new Blob(chunks, { type: "audio/webm" });
      if (blob.size < 200) {
        setBusy(false);
        return;
      }

      const form = new FormData();
      form.set("audio", blob, "speech.webm");
      form.set("languageCode", state.languageCode || "en-IN");
      const stt = await fetch("/api/sarvam/stt", { method: "POST", body: form });
      const sttJson = (await stt.json()) as { text?: string; error?: string; languageCode?: string };

      if (!sttJson.text || !sttJson.text.trim()) {
        setMessage(
          sttJson.error ??
            (state.languageCode.startsWith("hi")
              ? "आवाज़ नहीं सुनी गई। कृपया फिर से बोलें या नीचे दिए गए विकल्पों पर टैप करें।"
              : "No speech recognized. Please speak again or tap a quick chip below.")
        );
        return;
      }

      const recognized = sttJson.text.trim();
      setTyped(recognized);

      // Automatically commit the spoken answer to continue conversational chatbot flow
      await handleAnswerSubmit(recognized);

    } catch {
      clearInterval(timer);
      setIsRecording(false);
      setState((s) => ({ ...s, offlineMode: true }));
      setMessage(
        state.languageCode.startsWith("hi")
          ? "माइक्रोफोन उपलब्ध नहीं है। आप नीचे दिए गए विकल्पों पर टैप कर सकते हैं।"
          : "Microphone not available. You can tap the quick chips or type freely."
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitTyped() {
    if (!typed.trim()) return;
    await handleAnswerSubmit(typed.trim());
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
        structured?: any;
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
          confidence: result.confidence ?? 0.9,
          reviewRequired: result.reviewRequired ?? false,
          handwritingLikely: (result.confidence ?? 0) < 0.55,
          rawText: result.text ?? "",
          structuredFields: { possibleMedicines: [], possibleLabs: [] },
          attachedToVisit: true,
          mergedIntoClinicalSlots: false,
        } as DocumentExtractMeta);

      setOcrNote(
        `${result.note ?? "AI clinical data extracted."} Confidence: ${Math.round((result.confidence ?? 0.92) * 100)}%.`
      );
      setMessage(result.note || "Document parsed and attached to your clinical chart.");

      setLocalDocs((prev) => [
        ...prev,
        {
          kind: docKind,
          confidence: result.confidence ?? 0.92,
          reviewRequired: result.reviewRequired ?? false,
          note: result.note ?? "",
          rawText: result.text ?? "",
          structured: result.structured ?? meta,
        },
      ]);
      setDocStage("attach");

      if (adapters && visitId && adapters.uploadDocument) {
        await adapters.uploadDocument({
          visitId,
          file,
          kind: docKind,
          rawText: result.text ?? "",
          structuredJson: JSON.stringify(meta),
          confidence: result.confidence ?? 0.92,
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
    <div className="mx-auto max-w-[1280px] px-3 py-4 md:px-6 space-y-5">
      {/* ─── 5-Step Strict Patient Journey Progress Bar ─────────────────── */}
      <div className="rounded-3xl bg-white p-4 md:p-5 shadow-sm border border-slate-100/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              5-Step OPD Intake Workflow
            </span>
            <h2 className="text-base md:text-lg font-bold text-slate-900 mt-1">
              {boundProfile ? `Case Taking · ${displayName}` : "Patient Registration & AI Intake"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-700">
              Step {currentMacroStep + 1} of 5
            </span>
          </div>
        </div>

        {/* Step Icons & Progress Grid */}
        <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {FIVE_STEP_JOURNEY.map((step, idx) => {
            const isCurrent = idx === currentMacroStep;
            const isDone = idx < currentMacroStep;
            return (
              <div
                key={step.id}
                className={`flex flex-col p-2.5 rounded-2xl border transition-all ${
                  isCurrent
                    ? "bg-[#1b343f] text-white border-[#1b343f] shadow-sm"
                    : isDone
                    ? "bg-emerald-50 text-emerald-950 border-emerald-200"
                    : "bg-slate-50 text-slate-400 border-slate-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      isCurrent
                        ? "bg-white text-[#1b343f]"
                        : isDone
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isDone ? "✓" : step.num}
                  </span>
                  {isCurrent && (
                    <span className="animate-pulse flex h-2 w-2 rounded-full bg-sky-400" />
                  )}
                </div>
                <p className="mt-2 text-xs font-bold leading-tight">{step.title}</p>
                <p className={`text-[10px] line-clamp-1 mt-0.5 ${isCurrent ? "text-slate-200" : isDone ? "text-emerald-700" : "text-slate-400"}`}>
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900 flex items-center justify-between gap-3">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="text-amber-700 font-bold hover:text-amber-900">
            ✕
          </button>
        </div>
      ) : null}

      {/* Main Container */}
      {clinical ? (
        <div className="grid gap-4 lg:grid-cols-[250px_1fr_250px]">
          <IntakePipelineRail state={state} extractLit={extractLit} />
          <div className="min-w-0">{renderMain()}</div>
          <DocumentPipelineRail
            stage={clinical ? (docStage === "idle" ? "physical" : docStage) : "idle"}
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
        {/* ══════════════════════════════════════════════════════════════════════
            STEP 1: ARRIVE & LOGIN
            Scan ABHA / Aadhaar ID · Language Selection · Consent · Doctor Pathway
           ══════════════════════════════════════════════════════════════════════ */}
        {state.phase === "consent" || state.phase === "answeredBy" || state.phase === "pathway" ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <span className="font-mono text-xs font-bold text-sky-800 uppercase tracking-wider">
                Step 01 · Arrive &amp; Patient Check-In
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">Welcome to My-Aura OPD Kiosk</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Scan your ABHA ID or Aadhaar, pick your preferred language, and provide consent.
              </p>
            </div>

            {/* Sub-step 1: ABHA / Aadhaar ID Scan or Register */}
            {arriveSubStep === "id" && (
              <div className="space-y-4 max-w-xl">
                <div className="rounded-2xl bg-sky-50/70 p-4 border border-sky-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs font-bold text-sky-950 uppercase tracking-wider">
                      🪪 ABHA ID / Aadhaar Scan
                    </p>
                    <button
                      type="button"
                      className="rounded-lg bg-sky-600 text-white px-2.5 py-1 text-xs font-bold shadow-xs hover:bg-sky-700 transition-colors"
                      onClick={() => {
                        setAbhaId("91-9876-5432-1098@abdm");
                        if (!displayName || displayName === "Patient") setDisplayName("Rajesh Kumar");
                      }}
                    >
                      ⚡ Quick Scan Demo ABHA
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      ABHA ID / ABHA Address / Aadhaar Number
                    </label>
                    <input
                      type="text"
                      className="tl-input mt-1 text-sm font-mono"
                      placeholder="e.g. 91-9876-5432-1098@abdm"
                      value={abhaId}
                      onChange={(e) => setAbhaId(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Your Full Name</label>
                    <input
                      type="text"
                      className="tl-input mt-1 text-sm font-semibold text-slate-900"
                      placeholder="e.g. Rajesh Kumar"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-mono text-[11px] font-bold text-slate-600 uppercase">Who is answering?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all ${
                        state.answeredBy === "patient"
                          ? "bg-[#1b343f] text-white border-[#1b343f] shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                      onClick={() => setState({ ...state, answeredBy: "patient" })}
                    >
                      👤 I am the patient
                    </button>
                    <button
                      type="button"
                      className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all ${
                        state.answeredBy === "attendant"
                          ? "bg-[#1b343f] text-white border-[#1b343f] shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                      onClick={() => setState({ ...state, answeredBy: "attendant" })}
                    >
                      🤝 Attendant / Caregiver
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-pulse w-full py-3 text-xs font-bold"
                  onClick={() => setArriveSubStep("language")}
                >
                  Continue to Language Selection →
                </button>
              </div>
            )}

            {/* Sub-step 2: Regional Language Selection */}
            {arriveSubStep === "language" && (
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Choose Your Language</h3>
                    <p className="text-xs text-slate-500">
                      The AI will speak, listen, and format questions in your selected language.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost px-3 py-1 text-xs font-semibold flex items-center gap-1.5"
                    onClick={() => void speak("नमस्ते! आप अपनी भाषा चुन सकते हैं।")}
                  >
                    🔊 Test Audio
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SARVAM_LANGUAGES.slice(0, 8).map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        state.languageCode === lang.code
                          ? "bg-[#1b343f] text-white border-[#1b343f] shadow-xs"
                          : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                      }`}
                      onClick={() => {
                        setState({ ...state, languageCode: lang.code });
                        const greeting = lang.code.startsWith("hi")
                          ? "नमस्ते! माय-ऑरा स्वास्थ्य सहायक में आपका स्वागत है।"
                          : "Hello! Welcome to My-Aura health assistant.";
                        void speak(greeting);
                      }}
                    >
                      <p className="font-bold text-xs">{lang.name}</p>
                      <p className="font-mono text-[10px] text-slate-400 mt-0.5">{lang.code}</p>
                    </button>
                  ))}

                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    className="btn-ghost px-4 py-2 text-xs font-semibold"
                    onClick={() => setArriveSubStep("id")}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="btn-pulse flex-1 py-2.5 text-xs font-bold"
                    onClick={() => setArriveSubStep("consent")}
                  >
                    Continue to Consent →
                  </button>
                </div>
              </div>
            )}

            {/* Sub-step 3: Consent & Audio Explanation */}
            {arriveSubStep === "consent" && (
              <div className="space-y-4 max-w-xl">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Patient Consent &amp; Privacy</h3>
                  <p className="text-xs text-slate-500">
                    Control what clinical data is shared with your doctor and linked to your ABHA health record.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2.5">
                  {(
                    [
                      ["shareHistory", "Share medical history with the treating doctor"],
                      ["shareAyush", "Share Ayurveda / Dashavidha answers (Prakriti, Agni)"],
                      ["shareAbha", "Link and push encounter summary to my ABHA record"],
                      ["retainAfterEncounter", "Keep health record active for follow-up care"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-[#1b343f] focus:ring-sky-500 h-4 w-4"
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
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn-ghost px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
                    onClick={() =>
                      void speak(
                        "Please confirm what data you would like to share with the doctor and ABHA. You may tap I agree to continue."
                      )
                    }
                  >
                    🔊 Listen to Voice Explanation
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    className="btn-ghost px-4 py-2 text-xs font-semibold"
                    onClick={() => setArriveSubStep("language")}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="btn-pulse flex-1 py-2.5 text-xs font-bold"
                    onClick={() => setArriveSubStep("pathway")}
                  >
                    I Agree &amp; Select Doctor Pathway →
                  </button>
                </div>
              </div>
            )}

            {/* Sub-step 4: Doctor OPD Pathway Selection */}
            {arriveSubStep === "pathway" && (
              <div className="space-y-4 max-w-xl">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Select Doctor OPD Pathway</h3>
                  <p className="text-xs text-slate-500">
                    Choose whether you are visiting an Ayurvedic OPD or a Regular Allopathic OPD.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    className={`p-4 rounded-3xl border text-left transition-all space-y-1.5 ${
                      state.pathway === "allopathic"
                        ? "bg-[#1b343f] text-white border-[#1b343f] shadow-md ring-2 ring-sky-300"
                        : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                    }`}
                    onClick={() => setState({ ...state, pathway: "allopathic" })}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">🩺</span>
                      {state.pathway === "allopathic" && <span className="text-xs font-bold">Selected ✓</span>}
                    </div>
                    <p className="font-bold text-sm">Regular / Allopathic OPD</p>
                    <p className={`text-[11px] leading-relaxed ${state.pathway === "allopathic" ? "text-slate-200" : "text-slate-500"}`}>
                      Standard clinical interview (SOCRATES, ROS, Meds &amp; Allergies). Skips Ayurveda interview.
                    </p>
                  </button>

                  <button
                    type="button"
                    className={`p-4 rounded-3xl border text-left transition-all space-y-1.5 ${
                      state.pathway === "ayush"
                        ? "bg-[#1b343f] text-white border-[#1b343f] shadow-md ring-2 ring-emerald-300"
                        : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                    }`}
                    onClick={() => setState({ ...state, pathway: "ayush" })}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">🌿</span>
                      {state.pathway === "ayush" && <span className="text-xs font-bold">Selected ✓</span>}
                    </div>
                    <p className="font-bold text-sm">Ayurvedic OPD (AIIA-type)</p>
                    <p className={`text-[11px] leading-relaxed ${state.pathway === "ayush" ? "text-slate-200" : "text-slate-500"}`}>
                      Runs extended Dashavidha Pariksha (Prakriti, Vikriti, Agni, Satva) + Ahara-Vihara assessment.
                    </p>
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    className="btn-ghost px-4 py-2 text-xs font-semibold"
                    onClick={() => setArriveSubStep("consent")}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="btn-pulse flex-1 py-3 text-xs font-bold text-white"
                    onClick={() => void beginClinical()}
                  >
                    🚀 Start AI Case Taking Questions →
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : null}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 2: TALK TO THE AI (CONTINUOUS VOICE CHATBOT & INTERACTIVE CONVERSATION)
            SOCRATES Sequence · Ayurveda Dashavidha (if AYUSH) · Emergency Safety
           ══════════════════════════════════════════════════════════════════════ */}
        {prompt && prompt.kind === "ask" && state.phase !== "documents" && state.phase !== "complete" && state.phase !== "recap" ? (
          <section className="rounded-3xl bg-white p-5 md:p-6 shadow-sm border border-slate-100/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-[10px] font-bold text-sky-800 uppercase tracking-wider bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  Step 02 · Voice Chatbot · {prompt.group.toUpperCase()}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {state.languageCode.startsWith("hi") ? "एआई स्वास्थ्य सहायक से बात करें" : "Speak with Aura Health AI"}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {state.pathway === "ayush" && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800 border border-emerald-200">
                    🌿 Ayurvedic OPD
                  </span>
                )}
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-all flex items-center gap-1.5 ${
                    voiceChatMode
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  onClick={() => {
                    const nextMode = !voiceChatMode;
                    setVoiceChatMode(nextMode);
                    if (nextMode) {
                      void speak(prompt.text, () => {
                        setTimeout(() => void recordAndTranscribe(), 300);
                      });
                    } else {
                      stopSpeaking();
                      stopRecordingEarly();
                    }
                  }}
                >
                  <span>{voiceChatMode ? "🎙️ Voice Bot: ON" : "⌨️ Touch Mode"}</span>
                </button>
              </div>
            </div>

            {/* Dashavidha Indicator (If running Ayurvedic assessment) */}
            {prompt.group === "dashavidha" && (
              <div className="rounded-2xl bg-emerald-50/70 p-3 border border-emerald-200/80 space-y-1.5">
                <p className="font-mono text-[10px] font-bold text-emerald-950 uppercase tracking-wider">
                  🌿 Dashavidha Pariksha Factor Checklist (10 Ayurvedic Pillars):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {DASHAVIDHA_FACTORS.map((factor, i) => (
                    <div
                      key={factor.key}
                      className={`p-1.5 rounded-xl text-[10px] font-mono border ${
                        prompt.id === factor.key
                          ? "bg-emerald-700 text-white border-emerald-800 font-bold"
                          : isFilled(state.dashavidha[factor.key])
                          ? "bg-white text-emerald-900 border-emerald-200 font-semibold"
                          : "bg-white/60 text-slate-400 border-slate-100"
                      }`}
                    >
                      <span>{String(i + 1).padStart(2, "0")} {factor.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Conversational Point-Wise Chatbot Thread ─────────────────── */}
            <div className="rounded-3xl bg-slate-50/80 p-4 border border-slate-200/80 space-y-3 max-h-[420px] overflow-y-auto">
              <div className="text-center">
                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                  Chatbot Consultation Thread · {state.languageCode}
                </span>
              </div>

              {/* Past Exchanges in Order */}
              {conversationHistory.map((item, idx) => (
                <div key={item.id || idx} className="space-y-2">
                  {/* AI Question on Left */}
                  <div className="flex items-start gap-2.5 max-w-xl">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sm shadow-xs border border-sky-200">
                      🤖
                    </div>
                    <div className="rounded-2xl bg-white p-3 shadow-xs border border-slate-200 text-xs text-slate-800">
                      <p className="font-semibold text-slate-900">{item.question}</p>
                    </div>
                  </div>

                  {/* Patient Answer on Right */}
                  <div className="flex items-start justify-end gap-2.5 max-w-xl ml-auto">
                    <div className="rounded-2xl bg-[#1b343f] p-3 shadow-xs text-xs text-white">
                      <p className="font-medium">{item.answer}</p>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xs font-bold text-emerald-900 shadow-xs border border-emerald-200">
                      👤
                    </div>
                  </div>
                </div>
              ))}

              {/* ── Active AI Question Bubble ──────────────────────────────── */}
              <div className="flex items-start gap-2.5 max-w-2xl pt-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm">
                  🤖
                </div>
                <div className="flex-1 rounded-2xl bg-white p-4 shadow-sm border border-sky-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900">Aura Clinical AI</span>
                      {isSpeaking ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200 animate-pulse">
                          🔊 {state.languageCode.startsWith("hi") ? "AI बोल रहा है..." : "AI speaking..."}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {state.languageCode}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="text-xs text-sky-700 hover:text-sky-950 font-bold flex items-center gap-1 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-xl transition-colors"
                      onClick={() => void speak(prompt.text)}
                    >
                      🔊 {state.languageCode.startsWith("hi") ? "दोबारा सुनें" : "Listen Again"}
                    </button>
                  </div>

                  <h3 className="text-base md:text-lg font-bold text-slate-900 leading-snug">
                    {prompt.text}
                  </h3>

                  {/* Audio visualizer bar when speaking */}
                  {isSpeaking && (
                    <div className="flex items-center gap-1 py-1">
                      <span className="h-2.5 w-1 bg-sky-500 rounded-full animate-bounce" />
                      <span className="h-4 w-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.15s]" />
                      <span className="h-3 w-1 bg-sky-600 rounded-full animate-bounce [animation-delay:0.3s]" />
                      <span className="h-5 w-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.45s]" />
                      <span className="text-[11px] text-sky-800 font-mono font-medium ml-1">
                        {state.languageCode.startsWith("hi") ? "सुनें और उत्तर दें..." : "Listening for answer..."}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Active Listening / User Speaking Status Bubble ──────────── */}
              {isRecording && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 rounded-full bg-rose-600" />
                    <span className="text-xs font-bold">
                      {state.languageCode.startsWith("hi")
                        ? `🎙️ आपकी आवाज़ सुनी जा रही है (${recordingSeconds}s)... बोलिए`
                        : `🎙️ Listening to you (${recordingSeconds}s)... Speak now`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 text-xs font-bold shadow-xs transition-colors"
                    onClick={() => stopRecordingEarly()}
                  >
                    ✓ {state.languageCode.startsWith("hi") ? "पूरा हुआ (भेजें)" : "Done (Send)"}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Answer Chips (One-Tap Instant Answers) */}
            {prompt.chips && prompt.chips.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {state.languageCode.startsWith("hi") ? "त्वरित उत्तर विकल्प (टैप करें):" : "Quick Answer Chips (Tap to answer):"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {prompt.chips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:border-sky-500 hover:bg-sky-50 shadow-2xs hover:shadow-xs transition-all active:scale-95"
                      onClick={() => {
                        void handleAnswerSubmit(chip);
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Voice Mic Trigger & Manual Type Input */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <button
                disabled={busy || isSpeaking}
                type="button"
                className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all sm:w-56 shrink-0 ${
                  isRecording
                    ? "bg-rose-600 text-white border-rose-600 animate-pulse shadow-md"
                    : "bg-[#1b343f] text-white border-[#1b343f] hover:bg-[#274d5d] shadow-xs"
                }`}
                onClick={() => {
                  if (isRecording) {
                    stopRecordingEarly();
                  } else {
                    void recordAndTranscribe();
                  }
                }}
              >
                <span className="text-base">{isRecording ? "⏹️" : "🎙️"}</span>
                <span>
                  {isRecording
                    ? state.languageCode.startsWith("hi")
                      ? `रिकॉर्डिंग बंद करें (${recordingSeconds}s)`
                      : `Stop Recording (${recordingSeconds}s)`
                    : state.languageCode.startsWith("hi")
                    ? "बोलकर उत्तर दें (Mic)"
                    : "Tap to Speak Answer"}
                </span>
              </button>

              <div className="flex-1 flex items-center gap-1.5">
                <input
                  type="text"
                  className="tl-input text-xs py-2.5 flex-1"
                  placeholder={
                    state.languageCode.startsWith("hi")
                      ? "या यहाँ अपना उत्तर टाइप करें..."
                      : "Or type your answer here..."
                  }
                  value={typed}
                  onChange={(e) => {
                    setTyped(e.target.value);
                  }}
                  onKeyDown={(e) => {

                    if (e.key === "Enter" && typed.trim()) {
                      void submitTyped();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={!typed.trim()}
                  className="rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition-colors shrink-0"
                  onClick={() => void submitTyped()}
                >
                  {state.languageCode.startsWith("hi") ? "भेजें →" : "Send →"}
                </button>
              </div>
            </div>
          </section>
        ) : null}


        {/* Emergency Staff Alert Screen (Red Flag Escalation) */}
        {state.phase === "escalated" && (
          <section className="rounded-3xl bg-rose-50 border-2 border-rose-400 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚨</span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                Emergency Triage Alert Dispatched
              </span>
            </div>
            <h2 className="text-xl font-bold text-rose-950">Clinical Staff Have Been Alerted</h2>
            <p className="text-xs text-rose-900 leading-relaxed">
              Your response indicates symptoms that require immediate clinical evaluation (chest pain / severe breathlessness / red-flag).
              Please remain seated at the triage station. A nurse is attending to you immediately.
            </p>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 3: SCAN YOUR OLD DOCUMENTS
            Prescription (Rx) · Lab Sheet · Scan / Discharge Summary
           ══════════════════════════════════════════════════════════════════════ */}
        {state.phase === "documents" && (
          <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <span className="font-mono text-xs font-bold text-sky-800 uppercase tracking-wider">
                Step 03 · Scan Your Old Documents
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">Upload Prescriptions, Labs &amp; Summaries</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Our AI extracts medications, dosages, lab biomarkers, and hospital notes into your clinical chart.
              </p>
            </div>

            {/* Document Kind Tabs */}
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["prescription", "💊 Prescription (Rx)"],
                  ["lab", "🔬 Lab Sheet"],
                  ["scan", "🏥 Scan / Discharge"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all ${
                    docKind === id
                      ? "bg-[#1b343f] text-white border-[#1b343f] shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                  onClick={() => {
                    setDocKind(id);
                    setDocStage("physical");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Upload Area */}
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center space-y-2">
              <span className="text-2xl">📸 / 📁</span>
              <p className="text-xs font-bold text-slate-800">
                Take photo or attach {docKind === "prescription" ? "Prescription" : docKind === "lab" ? "Lab Report" : "Discharge Summary"}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                AI extraction applies specialized clinical JSON schema
              </p>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={busy}
                className="mt-2 text-xs font-mono text-slate-700"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onUpload(file);
                }}
              />
            </div>

            {ocrNote && (
              <div className="rounded-xl bg-sky-50 p-3 text-xs text-sky-900 font-mono border border-sky-200">
                {ocrNote}
              </div>
            )}

            {/* Scanned Document Items List */}
            {localDocs.length > 0 && (
              <div className="space-y-2">
                <p className="font-mono text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Attached Document Extracts ({localDocs.length}):
                </p>
                <div className="space-y-2">
                  {localDocs.map((d, i) => (
                    <div
                      key={i}
                      className="rounded-2xl bg-white p-3 border border-slate-200 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-900 uppercase font-mono">{d.kind}</span>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{d.note || "Parsed with AI"}</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold font-mono">
                        {Math.round(d.confidence * 100)}% Confidence
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                className="btn-pulse w-full py-3 text-xs font-bold"
                onClick={() => setState({ ...state, phase: "recap" })}
              >
                {localDocs.length > 0 ? "✓ Proceed to AI Summary (" + localDocs.length + " attached) →" : "Skip Document Scan & Build Summary →"}
              </button>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 4: AI BUILDS THE SUMMARY
            Unified Case Sheet · Patient Verification & Audit Confirmation
           ══════════════════════════════════════════════════════════════════════ */}
        {state.phase === "recap" && (
          <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <span className="font-mono text-xs font-bold text-sky-800 uppercase tracking-wider">
                Step 04 · AI Builds the Summary
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">Review Your Clinical Summary</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Combines your conversation + old documents into one clean medical summary linked to ABHA.
              </p>
            </div>

            {/* Formatted Medical Summary Box */}
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-xs text-slate-900">OPD Encounter Summary</span>
                <span className="font-mono text-[10px] text-slate-500">
                  ABHA: {abhaId || "Linked"} · {state.pathway.toUpperCase()} OPD
                </span>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed font-mono">
                {plainLanguageRecap(state)}
              </p>
            </div>

            {/* Documents Timeline Overview */}
            {localDocs.length > 0 && (
              <div className="rounded-2xl bg-sky-50/60 p-3.5 border border-sky-100 space-y-1.5">
                <p className="font-mono text-[10px] font-bold text-sky-900 uppercase tracking-wider">
                  📎 Attached Documents ({localDocs.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {localDocs.map((d, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-800 border border-sky-200"
                    >
                      {d.kind === "prescription" ? "💊 Rx" : d.kind === "lab" ? "🔬 Lab" : "🏥 Summary"} ({Math.round(d.confidence * 100)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn-pulse w-full py-3.5 text-xs font-bold"
              onClick={() => void finishRecap()}
            >
              ✓ Confirm Summary &amp; Send to Doctor&apos;s OPD Desk →
            </button>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 5: YOU GO SEE THE DOCTOR
            Doctor Queue Ready · Instant Consultation & Treatment
           ══════════════════════════════════════════════════════════════════════ */}
        {state.phase === "complete" && (
          <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-2xl">
              ✓
            </div>

            <div className="space-y-1">
              <span className="font-mono text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Step 05 · Ready for Doctor Examination
              </span>
              <h2 className="text-2xl font-bold text-slate-900">Your Case Sheet is Ready!</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Please proceed to the OPD Doctor Room. The doctor&apos;s screen is already populated with your complete case history.
              </p>
            </div>


            <div className="grid gap-3 sm:grid-cols-2 max-w-xl mx-auto text-left">
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <p className="font-mono text-[10px] font-bold uppercase text-slate-500">Doctor Queue Status</p>
                <p className="text-lg font-bold text-slate-900 mt-1">Ready for Consultation</p>
                <p className="text-xs text-slate-500 mt-1">
                  Doctor reads your summary in seconds and spends limited time treating you.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <p className="font-mono text-[10px] font-bold uppercase text-slate-500">ABHA &amp; Audit Chain</p>
                <p className="text-lg font-bold text-slate-900 mt-1">Encounter Anchored</p>
                <p className="text-xs text-slate-500 mt-1">
                  Linked to {abhaId || "ABHA Profile"}. Ready for ABDM FHIR bundle push on approval.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto">
              <Link
                href="/practitioner"
                className="btn-pulse w-full py-3 text-xs font-bold text-center block text-white"
              >
                👨‍⚕️ View Doctor OPD Console →
              </Link>
            </div>
          </section>
        )}
      </>
    );
  }
}
