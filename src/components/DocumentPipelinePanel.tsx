"use client";

import { useId, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import {
  getConfidenceBadge,
  type DocumentKind,
  extractBlocksApprove,
} from "@/lib/documents/metadata";

export const DOC_STAGES = [
  { id: "physical", num: "01", label: "Physical documents" },
  { id: "ocr", num: "02", label: "OCR + understanding" },
  { id: "meta", num: "03", label: "Rx / lab / scan metadata" },
  { id: "attach", num: "04", label: "Attach to visit" },
  { id: "review", num: "05", label: "Doctor review" },
] as const;

export type DocumentExtractItem = {
  _id: Id<"documentExtracts">;
  rawText: string;
  confidence: number;
  reviewStatus: string;
  structuredJson: string;
  documentId?: Id<"documents">;
  visitId?: Id<"visits">;
  createdAt?: number;
};


export function DocumentPipelinePanel({
  extracts = [],
  onUpload,
  onReview,
  disabled = false,
}: {
  extracts?: DocumentExtractItem[];
  onUpload?: (file: File, kind: DocumentKind) => Promise<void>;
  onReview?: (
    extractId: Id<"documentExtracts">,
    status: "confirmed" | "corrected",
    draftJson?: string
  ) => Promise<void>;
  disabled?: boolean;
}) {
  const [selectedKind, setSelectedKind] = useState<DocumentKind>("prescription");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [extractDrafts, setExtractDrafts] = useState<Record<string, string>>({});
  const [showRaw, setShowRaw] = useState<Record<string, boolean>>({});
  const fileInputId = useId();

  const totalAttached = extracts.length;
  const reviewPending = extracts.filter((ex) =>
    extractBlocksApprove({
      reviewStatus: ex.reviewStatus,
      confidence: ex.confidence,
      structuredJson: ex.structuredJson,
    })
  ).length;

  // Determine current active stage
  const currentStageIndex = isProcessing
    ? 1 // OCR + understanding
    : totalAttached === 0
      ? 0 // Physical documents
      : reviewPending > 0
        ? 4 // Doctor review pending
        : 4; // Completed / reviewed

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    try {
      setIsProcessing(true);
      setStatusMessage("Running OCR extraction & metadata parsing…");
      await onUpload(file, selectedKind);
      setStatusMessage("Document successfully attached and parsed.");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  }

  function parseStructuredMeta(jsonStr: string) {
    try {
      return JSON.parse(jsonStr) as {
        kind?: string;
        handwritingLikely?: boolean;
        structuredFields?: {
          possibleMedicines?: string[];
          possibleLabs?: string[];
        };
      };
    } catch {
      return null;
    }
  }

  return (
    <aside className="space-y-4">
      {/* 5-Stage Visual Progress Tracker */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100/90">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Document Pipeline</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
            5 Stages
          </span>
        </div>

        <ol className="mt-3.5 space-y-2">
          {DOC_STAGES.map((step, i) => {
            const isCurrent = i === currentStageIndex;
            const isCompleted = totalAttached > 0 && i < currentStageIndex;
            return (
              <li key={step.id} className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isCurrent
                      ? "bg-[#1b343f] text-white shadow-xs"
                      : isCompleted
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isCompleted ? "✓" : step.num}
                </span>
                <div className="min-w-0 flex-1">
                  <span
                    className={`text-xs font-medium ${
                      isCurrent
                        ? "font-bold text-slate-900"
                        : isCompleted
                          ? "text-slate-700"
                          : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Counter Summary */}
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-2.5 font-mono text-[11px] border border-slate-100">
          <span className="text-slate-500">Attached: <strong className="text-slate-900">{totalAttached}</strong></span>
          <span className={reviewPending > 0 ? "text-amber-700 font-bold" : "text-emerald-700 font-bold"}>
            Doctor review pending: <strong>{reviewPending}</strong>
          </span>
        </div>
      </div>

      {/* Safety Rail Guarantee Callout */}
      <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm">🛡️</span>
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-sky-900">
            Clinical Safety Guarantee
          </p>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
          OCR output <strong>never silent-merges</strong> into active medications or allergies. All extracted records remain auxiliary reference data until clinician verification.
        </p>
      </div>

      {/* Doctor / Patient Upload Station */}
      {onUpload && (
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100/90">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Desk Upload & Scan</p>
          <p className="mt-1 text-xs text-slate-500">
            Capture or attach physical Rx, lab reports, or discharge summaries.
          </p>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {(
              [
                ["prescription", "Prescription"],
                ["lab", "Lab Sheet"],
                ["scan", "Scan / Disch."],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`px-2 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  selectedKind === id
                    ? "bg-[#1b343f] text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
                onClick={() => setSelectedKind(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <label
              htmlFor={fileInputId}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
                isProcessing
                  ? "border-sky-400 bg-sky-50/50 cursor-not-allowed"
                  : "border-slate-200 bg-slate-50 hover:border-sky-400 hover:bg-sky-50/30"
              }`}
            >
              {isProcessing ? (
                <div className="space-y-1">
                  <span className="inline-block animate-spin text-sky-600 text-lg">⚙</span>
                  <p className="font-mono text-xs text-sky-700 font-bold">Processing OCR…</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-base text-slate-500">📷 / 📁</span>
                  <p className="text-xs font-bold text-slate-800">Click to upload or snap photo</p>
                  <p className="font-mono text-[10px] text-slate-400">Sarvam Document AI / Tesseract fallback</p>
                </div>
              )}
              <input
                id={fileInputId}
                type="file"
                accept="image/*"
                capture="environment"
                disabled={isProcessing || disabled}
                className="hidden"
                onChange={(e) => void handleFileChange(e)}
              />
            </label>
          </div>

          {statusMessage && (
            <p className="mt-2 font-mono text-[11px] text-slate-600 font-medium">{statusMessage}</p>
          )}
        </div>
      )}

      {/* OCR Extract Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Attached Document Extracts ({totalAttached})
          </p>
        </div>

        {extracts.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 text-center border border-slate-100">
            <p className="text-xs text-slate-400">No physical documents attached to this visit yet.</p>
          </div>
        ) : (
          extracts.map((ex) => {
            const badge = getConfidenceBadge(ex.confidence);
            const meta = parseStructuredMeta(ex.structuredJson);
            const isBlocked = extractBlocksApprove({
              reviewStatus: ex.reviewStatus,
              confidence: ex.confidence,
              structuredJson: ex.structuredJson,
            });
            const draft = extractDrafts[ex._id] ?? ex.structuredJson;
            const isOpenRaw = Boolean(showRaw[ex._id]);

            const candidateMeds = meta?.structuredFields?.possibleMedicines ?? [];
            const candidateLabs = meta?.structuredFields?.possibleLabs ?? [];

            return (
              <div
                key={ex._id}
                className={`rounded-3xl bg-white p-4 shadow-sm border transition-all ${
                  isBlocked ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-100"
                }`}
              >
                {/* Card Top: Kind, Confidence, Review Badge */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      {meta?.kind || "Document"}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {ex.createdAt
                        ? new Date(ex.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Attached"}
                    </span>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                      badge.tier === "high"
                        ? "bg-emerald-100 text-emerald-800"
                        : badge.tier === "review"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {Math.round(ex.confidence * 100)}% · {badge.label}
                  </span>
                </div>

                {/* Status Indicator */}
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-slate-500">Status:</span>
                  <span
                    className={`font-mono text-[11px] uppercase font-bold ${
                      ex.reviewStatus === "confirmed"
                        ? "text-emerald-700"
                        : ex.reviewStatus === "corrected"
                          ? "text-sky-700"
                          : "text-amber-700"
                    }`}
                  >
                    {ex.reviewStatus}
                  </span>
                </div>

                {/* Candidate Hints from OCR */}
                {(candidateMeds.length > 0 || candidateLabs.length > 0) && (
                  <div className="mt-2.5 space-y-1.5 rounded-2xl bg-slate-50 p-2.5 text-xs border border-slate-100">
                    {candidateMeds.length > 0 && (
                      <div>
                        <span className="font-mono text-[10px] font-bold text-slate-600 uppercase">
                          💊 Detected Rx Hints:
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {candidateMeds.map((med, idx) => (
                            <span
                              key={idx}
                              className="rounded-lg bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-800 border border-slate-200"
                            >
                              {med}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {candidateLabs.length > 0 && (
                      <div className="mt-1.5">
                        <span className="font-mono text-[10px] font-bold text-slate-600 uppercase">
                          🔬 Detected Lab Hints:
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {candidateLabs.map((lab, idx) => (
                            <span
                              key={idx}
                              className="rounded-lg bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-800 border border-slate-200"
                            >
                              {lab}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsible Raw Text Inspector */}
                <div className="mt-2.5">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-[11px] text-slate-500 hover:text-slate-800 font-semibold"
                    onClick={() =>
                      setShowRaw((prev) => ({ ...prev, [ex._id]: !isOpenRaw }))
                    }
                  >
                    <span className="font-mono">
                      {isOpenRaw ? "Hide Raw OCR Text" : "View Raw OCR Text"}
                    </span>
                    <span>{isOpenRaw ? "▲" : "▼"}</span>
                  </button>

                  {isOpenRaw && (
                    <pre className="mt-1.5 max-h-36 overflow-auto rounded-xl bg-slate-50 p-2.5 font-mono text-[11px] text-slate-600 whitespace-pre-wrap border border-slate-200">
                      {ex.rawText || "(empty / unreadable)"}
                    </pre>
                  )}
                </div>

                {/* Doctor Correction Textarea */}
                <div className="mt-2.5">
                  <label className="block">
                    <span className="font-mono text-[10px] text-slate-500 uppercase font-semibold">
                      Structured Extract / Correction:
                    </span>
                    <textarea
                      className="tl-input mt-1 font-mono text-xs"
                      rows={2}
                      value={draft}
                      onChange={(e) =>
                        setExtractDrafts((d) => ({
                          ...d,
                          [ex._id]: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                {/* Action Buttons */}
                {onReview && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn-pulse px-3.5 py-1 text-xs font-semibold"
                      onClick={() => void onReview(ex._id, "confirmed")}
                    >
                      ✓ Confirm Extract
                    </button>
                    <button
                      type="button"
                      className="btn-ghost px-3.5 py-1 text-xs font-semibold"
                      onClick={() =>
                        void onReview(ex._id, "corrected", draft)
                      }
                    >
                      ✎ Save Correction
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

