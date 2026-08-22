"use client";

import {
  CANONICAL_STEPS,
  DASHAVIDHA_FACTORS,
  filledCount,
  isFilled,
  type IntakeState,
} from "@/lib/intake/engine";

const ARCHITECTURE = [
  { id: "modality", label: "Voice | Touch" },
  { id: "bus", label: "Speech / Text" },
  { id: "llm", label: "LLM extract" },
  { id: "engine", label: "Conversation engine" },
  { id: "record", label: "Structured record" },
  { id: "dual", label: "Doctor + HIS" },
] as const;

const DOC_STAGES = [
  { id: "physical", label: "Physical documents" },
  { id: "ocr", label: "OCR + understanding" },
  { id: "meta", label: "Rx / lab / scan metadata" },
  { id: "attach", label: "Attach to visit" },
  { id: "review", label: "Doctor review" },
] as const;

function canonicalId(phase: IntakeState["phase"]): (typeof CANONICAL_STEPS)[number]["id"] {
  if (["consent", "answeredBy", "pathway"].includes(phase)) return "patientState";
  if (phase === "socrates") return "chiefComplaint";
  if (phase === "ros") return "clinicalHistory";
  if (phase === "dashavidha") return "dashavidha";
  if (phase === "aharaVihara") return "aharaVihara";
  if (phase === "history") return "medsHistory";
  if (phase === "redFlag") return "redFlag";
  if (phase === "recap" || phase === "documents") return "completion";
  if (phase === "complete") return "doctorSummary";
  return "patientState";
}

export function IntakePipelineRail({
  state,
  extractLit,
}: {
  state: IntakeState;
  extractLit: boolean;
}) {
  const step = canonicalId(state.phase);
  const askPhase = ["socrates", "ros", "dashavidha", "aharaVihara", "history", "redFlag"].includes(
    state.phase
  );
  const dash = state.dashavidha;

  return (
    <aside className="space-y-4">
      <div className="tl-card p-4">
        <p className="tl-overline">Architecture</p>
        <ol className="mt-3 space-y-1">
          {ARCHITECTURE.map((item, i) => {
            const on =
              (item.id === "llm" && extractLit) ||
              (item.id === "engine" && askPhase) ||
              (item.id === "modality" && askPhase) ||
              (item.id === "bus" && askPhase) ||
              (item.id === "record" && (state.phase === "recap" || state.phase === "documents")) ||
              (item.id === "dual" && state.phase === "complete");
            return (
              <li key={item.id} className="flex gap-2">
                <span className={`font-mono text-[10px] ${on ? "text-pulse" : "text-ash"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={on ? "text-display" : "text-mist"}>{item.label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="tl-card p-4">
        <p className="tl-overline">Canonical spine</p>
        <ol className="mt-3 space-y-2">
          {CANONICAL_STEPS.map((item, i) => {
            const on = item.id === step;
            return (
              <li key={item.id} className="flex items-start gap-2">
                <span className={`mt-0.5 font-mono text-[10px] ${on ? "text-pulse" : "text-ash"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={on ? "text-display" : "text-mist"}>{item.label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className={`tl-surface p-4 ${state.phase === "dashavidha" ? "border-pulse" : ""}`}>
        <p className="tl-overline">Dashavidha · 10 factors</p>
        <p className="mt-1 text-xs text-mist">No automatic dosha labels. Clinician interprets.</p>
        <ol className="mt-3 space-y-1">
          {DASHAVIDHA_FACTORS.map((factor, i) => {
            const slot = dash[factor.key];
            const done = slot ? isFilled(slot) : false;
            return (
              <li key={factor.key} className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] text-ash">{String(i + 1).padStart(2, "0")}</span>
                <span className={done ? "text-pulse" : "text-display"}>{factor.label}</span>
                <span className="font-mono text-[10px] text-ash">{done ? "in" : "—"}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ash">
          {filledCount(dash).filled}/10
          {state.pathway !== "ayush" ? " · AYUSH pathway emphasizes this tree" : ""}
        </p>
      </div>
    </aside>
  );
}

export function DocumentPipelineRail({
  stage,
  attached,
  reviewPending,
}: {
  stage: "physical" | "ocr" | "meta" | "attach" | "review" | "idle";
  attached: number;
  reviewPending: number;
}) {
  return (
    <aside className="tl-card p-4">
      <p className="tl-overline">Document pipeline</p>
      <ol className="mt-3 space-y-2">
        {DOC_STAGES.map((item, i) => {
          const idx = DOC_STAGES.findIndex((s) => s.id === stage);
          const on = item.id === stage || (stage !== "idle" && i <= idx);
          return (
            <li key={item.id} className="flex items-start gap-2">
              <span className={`mt-0.5 font-mono text-[10px] ${on ? "text-pulse" : "text-ash"}`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={on ? "text-display" : "text-mist"}>{item.label}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-ash">
        Attached {attached} · doctor review pending {reviewPending}
      </p>
      <p className="mt-2 text-xs text-mist">Side rail — OCR never silent-merges into medicines or allergies.</p>
    </aside>
  );
}
