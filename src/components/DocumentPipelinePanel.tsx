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
      <div className="tl-card p-4">
        <div className="flex items-center justify-between border-b border-graphite pb-2">
          <p className="tl-overline">Document Pipeline</p>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ash">
            5 Stages
          </span>
        </div>

        <ol className="mt-3 space-y-2">
          {DOC_STAGES.map((step, i) => {
            const isCurrent = i === currentStageIndex;
            const isCompleted = totalAttached > 0 && i < currentStageIndex;
            return (
              <li key={step.id} className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 font-mono text-[11px] font-semibold transition-colors ${
                    isCurrent
                      ? "text-pulse"
                      : isCompleted
                        ? "text-success"
                        : "text-ash"
                  }`}
                >
                  {isCompleted ? "✓" : step.num}
                </span>
                <div className="min-w-0 flex-1">
                  <span
                    className={`text-xs font-medium ${
                      isCurrent
                        ? "text-display font-semibold"
                        : isCompleted
                          ? "text-display"
                          : "text-mist"
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
        <div className="mt-3.5 flex items-center justify-between rounded bg-onyx px-2.5 py-1.5 font-mono text-[11px]">
          <span className="text-mist">Attached: <strong className="text-display">{totalAttached}</strong></span>
          <span className={reviewPending > 0 ? "text-warning font-semibold" : "text-success"}>
            Doctor review pending: <strong>{reviewPending}</strong>
          </span>
        </div>
      </div>

      {/* Safety Rail Guarantee Callout */}
      <div className="rounded border border-graphite bg-onyx/70 p-3.5 shadow-sm">
        <div className="flex items-center gap-2 text-pulse">
          <span className="text-sm font-bold">🛡️</span>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-display">
            Clinical Safety Rail
          </p>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-mist">
          OCR output <strong>never silent-merges</strong> into medicines or allergies. All extracted records remain in this auxiliary pipeline until clinician verification.
        </p>
      </div>

      {/* Doctor Upload & Scan Station */}
      {onUpload && (
        <div className="tl-card p-4">
          <p className="tl-overline">Desk Upload & Scan</p>
          <p className="mt-1 text-xs text-mist">
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
                className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                  selectedKind === id
                    ? "bg-pulse text-onyx font-semibold"
                    : "bg-surface text-mist hover:text-display border border-graphite"
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
              className={`flex cursor-pointer flex-col items-center justify-center rounded border border-dashed p-4 text-center transition-colors ${
                isProcessing
                  ? "border-pulse bg-onyx/50 cursor-not-allowed"
                  : "border-graphite bg-surface hover:border-pulse"
              }`}
            >
              {isProcessing ? (
                <div className="space-y-1">
                  <span className="inline-block animate-spin text-pulse text-lg">⚙</span>
                  <p className="font-mono text-xs text-pulse">Processing OCR…</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-base text-mist">📷 / 📁</span>
                  <p className="text-xs font-medium text-display">Click to upload or snap photo</p>
                  <p className="font-mono text-[10px] text-ash">Sarvam Document AI / Tesseract fallback</p>
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
            <p className="mt-2 font-mono text-[11px] text-mist">{statusMessage}</p>
          )}
        </div>
      )}

      {/* OCR Extract Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="tl-overline">Attached Document Extracts ({totalAttached})</p>
        </div>

        {extracts.length === 0 ? (
          <div className="tl-surface rounded p-4 text-center">
            <p className="text-xs text-mist">No documents attached to this visit yet.</p>
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
                className={`tl-card rounded p-3.5 transition-all ${
                  isBlocked ? "border-pulse bg-onyx/40" : "border-graphite"
                }`}
              >
                {/* Card Top: Kind, Confidence, Review Badge */}
                <div className="flex items-center justify-between gap-2 border-b border-graphite pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-mist">
                      {meta?.kind || "Document"}
                    </span>
                    <span className="font-mono text-[10px] text-ash">
                      {ex.createdAt
                        ? new Date(ex.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Attached"}
                    </span>

                  </div>

                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                      badge.tier === "high"
                        ? "bg-success/20 text-success"
                        : badge.tier === "review"
                          ? "bg-warning/20 text-warning"
                          : "bg-pulse/20 text-pulse"
                    }`}
                  >
                    {Math.round(ex.confidence * 100)}% · {badge.label}
                  </span>
                </div>

                {/* Status Indicator */}
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-ash">Status:</span>
                  <span
                    className={`font-mono text-[11px] uppercase font-semibold ${
                      ex.reviewStatus === "confirmed"
                        ? "text-success"
                        : ex.reviewStatus === "corrected"
                          ? "text-pulse"
                          : ex.reviewStatus === "failed"
                            ? "text-warning"
                            : "text-warning"
                    }`}
                  >
                    {ex.reviewStatus}
                  </span>
                </div>

                {/* Candidate Hints from OCR */}
                {(candidateMeds.length > 0 || candidateLabs.length > 0) && (
                  <div className="mt-2.5 space-y-1.5 rounded bg-surface p-2 text-xs">
                    {candidateMeds.length > 0 && (
                      <div>
                        <span className="font-mono text-[10px] font-semibold text-mist uppercase">
                          💊 Detected Rx Hints:
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {candidateMeds.map((med, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-onyx px-1.5 py-0.5 font-mono text-[10px] text-display border border-graphite"
                            >
                              {med}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {candidateLabs.length > 0 && (
                      <div className="mt-1.5">
                        <span className="font-mono text-[10px] font-semibold text-mist uppercase">
                          🔬 Detected Lab Hints:
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {candidateLabs.map((lab, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-onyx px-1.5 py-0.5 font-mono text-[10px] text-display border border-graphite"
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
                    className="flex w-full items-center justify-between text-[11px] text-mist hover:text-display"
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
                    <pre className="mt-1.5 max-h-36 overflow-auto rounded bg-onyx p-2 font-mono text-[11px] text-ash whitespace-pre-wrap">
                      {ex.rawText || "(empty / unreadable)"}
                    </pre>
                  )}
                </div>

                {/* Doctor Correction Textarea */}
                <div className="mt-2.5">
                  <label className="block">
                    <span className="font-mono text-[10px] text-mist uppercase">
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
                      className="btn-pulse px-3 py-1 text-xs font-medium"
                      onClick={() => void onReview(ex._id, "confirmed")}
                    >
                      ✓ Confirm Extract
                    </button>
                    <button
                      type="button"
                      className="btn-ghost px-3 py-1 text-xs font-medium"
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
