"use client";

import { useId, useState } from "react";
import { Check, ShieldCheck, Loader2, Camera, FolderUp, Bookmark, FileText, Edit2, CheckCircle2 } from "lucide-react";
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
  viewMode = "practitioner",
  disabled = false,
}: {
  extracts?: DocumentExtractItem[];
  onUpload?: (file: File, kind: DocumentKind) => Promise<void>;
  onReview?: (
    extractId: Id<"documentExtracts">,
    status: "confirmed" | "corrected",
    draftJson?: string
  ) => Promise<void>;
  viewMode?: "practitioner" | "patient";
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
        // Prescription Schema
        patient_details?: { name?: string | null; age?: string | number | null; gender?: string | null };
        doctor_details?: { name?: string | null; specialty?: string | null };
        vitals?: { blood_pressure?: string | null; weight?: string | null };
        diagnoses?: string[];
        medications?: Array<{
          drug_name: string;
          dosage?: string;
          frequency?: string;
          duration?: string;
          instructions?: string;
        }>;
        follow_up_advice?: string | null;
        // Lab Schema
        patient_name?: string | null;
        collection_date?: string | null;
        lab_name?: string | null;
        test_results?: Array<{
          biomarker_name: string;
          observed_value: string | number;
          unit?: string;
          reference_range?: string;
          is_abnormal?: boolean | null;
        }>;
        interpretation_notes?: string | null;
        // Scan / Discharge Summary Schema
        admission_date?: string | null;
        discharge_date?: string | null;
        primary_diagnosis?: string | null;
        chief_complaints?: string[];
        procedures_performed?: string[];
        hospital_course_summary?: string;
        discharge_medications?: string[];
        follow_up_instructions?: string | null;
        // Fallback fields
        structuredFields?: {
          possibleMedicines?: string[];
          possibleLabs?: string[];
        };
        clinical?: {
          valid_medical_document?: boolean;
          error_message?: string;
          patient_name?: string | null;
          doctor_name?: string | null;
          prescribed_medicines?: Array<{ name: string; dosage?: string; frequency?: string }>;
          ayush_formulations?: Array<{ name: string; composition?: string; timing?: string }>;
          needs_human_review?: boolean;
        };
        valid_medical_document?: boolean;
        error_message?: string;
      };
    } catch {
      return null;
    }
  }


  function extractCleanPoints(text: string): string[] {
    if (!text) return [];
    const blocks = text
      .split(/\n\n+|\n(?=[-•*]|\d+\.)/)
      .map((s) => s.replace(/^[-•*]\s*|^\d+\.\s*/, "").trim())
      .filter((s) => s.length > 0);
    return blocks.length > 0 ? blocks : [text.trim()];
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
                  {isCompleted ? <Check className="h-3 w-3 inline" /> : step.num}
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
          <ShieldCheck className="h-4 w-4 text-emerald-600 inline" />
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
                  <Loader2 className="h-4 w-4 animate-spin text-sky-600 inline" />
                  <p className="font-mono text-xs text-sky-700 font-bold">Processing OCR…</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-slate-400"><Camera className="h-4 w-4" /><span className="text-xs">/</span><FolderUp className="h-4 w-4" /></div>
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
            const clinical = meta?.clinical;
            const rejectedDoc =
              clinical?.valid_medical_document === false || meta?.valid_medical_document === false;
            const rejectNote = clinical?.error_message || meta?.error_message;
            const points = extractCleanPoints(ex.rawText);

            // PATIENT CHATBOT FRIENDLY VIEW
            if (viewMode === "patient") {
              return (
                <div
                  key={ex._id}
                  className="rounded-3xl bg-gradient-to-b from-white to-slate-50/60 p-5 shadow-sm border border-slate-200/80 transition-all space-y-3.5"
                >
                  {/* Chatbot Avatar Header */}
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1b343f] to-teal-700 text-white text-base shadow-xs">
                        
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">Aura Health Bot</span>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Summary of your {meta?.kind || "uploaded prescription"}
                        </p>
                      </div>
                    </div>

                    <span className="font-mono text-[10px] text-slate-400">
                      {ex.createdAt
                        ? new Date(ex.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Today"}
                    </span>
                  </div>

                  {/* Friendly Bot Speech Bubble */}
                  <div className="rounded-2xl bg-sky-50/70 p-3.5 border border-sky-100/80">
                    <p className="text-xs text-sky-950 font-medium leading-relaxed">
                       <em>&quot;Here is the simple breakdown of the document you uploaded:&quot;</em>
                    </p>

                    {/* Point-wise detected items */}
                    <div className="mt-3 space-y-2">
                      {points.map((pt, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 rounded-xl bg-white p-2.5 text-xs text-slate-800 shadow-2xs border border-sky-100"
                        >
                          <span className="text-sky-600 font-bold text-xs mt-0.5">•</span>
                          <span className="leading-relaxed font-medium">{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Structured Data View (Prescription Schema) */}
                  {meta?.medications && meta.medications.length > 0 && (
                    <div className="rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                           Prescribed Medications ({meta.medications.length})
                        </p>
                        {meta.doctor_details?.name && (
                          <span className="text-[10px] text-emerald-700 font-medium">
                            Dr. {meta.doctor_details.name} {meta.doctor_details.specialty ? `(${meta.doctor_details.specialty})` : ""}
                          </span>
                        )}
                      </div>

                      <div className="divide-y divide-emerald-100/80 rounded-xl bg-white border border-emerald-100 overflow-hidden">
                        {meta.medications.map((med, i) => (
                          <div key={i} className="p-2.5 text-xs text-slate-800 space-y-0.5">
                            <div className="flex items-center justify-between font-bold text-slate-900">
                              <span>{med.drug_name}</span>
                              {med.dosage && (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800 font-mono">
                                  {med.dosage}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                              {med.frequency && <span>⏰ {med.frequency}</span>}
                              {med.duration && <span> {med.duration}</span>}
                              {med.instructions && <span className="text-emerald-700 font-medium">ℹ️ {med.instructions}</span>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {meta.diagnoses && meta.diagnoses.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase font-mono">Diagnoses:</span>
                          {meta.diagnoses.map((d, i) => (
                            <span key={i} className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-emerald-100">
                              {d}
                            </span>
                          ))}
                        </div>
                      )}

                      {meta.follow_up_advice && (
                        <p className="text-[11px] text-emerald-900 bg-white/80 p-2 rounded-lg border border-emerald-100">
                          <Bookmark className="h-3.5 w-3.5 text-teal-600 inline mr-1" /> <strong>Follow-up:</strong> {meta.follow_up_advice}
                        </p>
                      )}
                    </div>
                  )}

                  {/* AI Structured Data View (Lab Sheet Schema) */}
                  {meta?.test_results && meta.test_results.length > 0 && (
                    <div className="rounded-2xl bg-indigo-50/70 p-3.5 border border-indigo-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                           Lab Test Results ({meta.test_results.length})
                        </p>
                        {meta.lab_name && (
                          <span className="text-[10px] text-indigo-700 font-medium">{meta.lab_name}</span>
                        )}
                      </div>

                      <div className="divide-y divide-indigo-100/80 rounded-xl bg-white border border-indigo-100 overflow-hidden">
                        {meta.test_results.map((tr, i) => (
                          <div key={i} className="p-2.5 text-xs flex items-center justify-between gap-2">
                            <div>
                              <p className="font-bold text-slate-900">{tr.biomarker_name}</p>
                              {tr.reference_range && (
                                <p className="text-[10px] text-slate-400 font-mono">Ref: {tr.reference_range}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1.5 justify-end">
                                <span className="font-mono font-bold text-slate-800">
                                  {tr.observed_value} {tr.unit || ""}
                                </span>
                                {tr.is_abnormal && (
                                  <span className="rounded bg-rose-100 text-rose-800 px-1.5 py-0.5 text-[9px] font-bold uppercase font-mono">
                                    Abnormal
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {meta.interpretation_notes && (
                        <p className="text-[11px] text-indigo-900 bg-white/80 p-2 rounded-lg border border-indigo-100">
                          <FileText className="h-3.5 w-3.5 text-teal-600 inline mr-1" /> <strong>Interpretation:</strong> {meta.interpretation_notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* AI Structured Data View (Discharge Summary Schema) */}
                  {meta?.hospital_course_summary && (
                    <div className="rounded-2xl bg-amber-50/70 p-3.5 border border-amber-100 space-y-2.5">
                      <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-900">
                         Hospital Course & Discharge Summary
                      </p>
                      <div className="rounded-xl bg-white p-3 border border-amber-100 text-xs text-slate-700 leading-relaxed">
                        {meta.hospital_course_summary}
                      </div>
                      {meta.primary_diagnosis && (
                        <p className="text-xs text-amber-950 font-medium">
                          <strong>Primary Diagnosis:</strong> {meta.primary_diagnosis}
                        </p>
                      )}
                      {meta.discharge_medications && meta.discharge_medications.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider font-mono text-amber-800">
                            Discharge Medications:
                          </p>
                          <ul className="mt-1 space-y-1">
                            {meta.discharge_medications.map((dm, i) => (
                              <li key={i} className="text-xs text-slate-800 flex items-center gap-1.5">
                                <span className="text-amber-600 font-bold">•</span> {dm}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {meta.follow_up_instructions && (
                        <p className="text-[11px] text-amber-900 bg-white/80 p-2 rounded-lg border border-amber-100">
                          <Bookmark className="h-3.5 w-3.5 text-teal-600 inline mr-1" /> <strong>Instructions:</strong> {meta.follow_up_instructions}
                        </p>
                      )}
                    </div>
                  )}

                  {rejectedDoc && (
                    <div className="rounded-2xl bg-rose-50 p-3.5 border border-rose-200 text-xs text-rose-900">
                      <p className="font-bold">Not a clinical document</p>
                      <p className="mt-1">{rejectNote || "This upload was rejected as non-medical."}</p>
                    </div>
                  )}

                  {clinical?.valid_medical_document && (clinical.prescribed_medicines?.length || clinical.ayush_formulations?.length) ? (
                    <div className="rounded-2xl bg-emerald-50/80 p-3.5 border border-emerald-100 space-y-2">
                      <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                        Structured clinical extract
                      </p>
                      {clinical.patient_name && (
                        <p className="text-xs text-emerald-950">Patient: {clinical.patient_name}</p>
                      )}
                      {clinical.doctor_name && (
                        <p className="text-xs text-emerald-950">Doctor: {clinical.doctor_name}</p>
                      )}
                      {clinical.prescribed_medicines?.map((m, i) => (
                        <p key={`med-${i}`} className="text-xs text-slate-800">
                          • {m.name} {m.dosage} {m.frequency}
                        </p>
                      ))}
                      {clinical.ayush_formulations?.map((f, i) => (
                        <p key={`ayush-${i}`} className="text-xs text-slate-800">
                          • {f.name} {f.composition} {f.timing}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {/* Fallback Medicines / Lab Quick Badges (when structured schema not available) */}
                  {!meta?.medications && !meta?.test_results && (candidateMeds.length > 0 || candidateLabs.length > 0) && (
                    <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100 space-y-2">
                      {candidateMeds.length > 0 && (
                        <div>
                          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                             Detected Medicines
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {candidateMeds.map((med, i) => (
                              <span
                                key={i}
                                className="rounded-lg bg-emerald-50 text-emerald-900 px-2.5 py-1 text-xs font-semibold border border-emerald-200"
                              >
                                {med}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {candidateLabs.length > 0 && (
                        <div>
                          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                             Detected Lab Values
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {candidateLabs.map((lab, i) => (
                              <span
                                key={i}
                                className="rounded-lg bg-indigo-50 text-indigo-900 px-2.5 py-1 text-xs font-semibold border border-indigo-200"
                              >
                                {lab}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Doctor Verification Status Notice */}
                  <div className="flex items-center justify-between rounded-xl bg-slate-100/80 px-3 py-2 text-[11px]">
                    <span className="text-slate-600">
                      Doctor Review:{" "}
                      <strong className={ex.reviewStatus === "confirmed" ? "text-emerald-700" : "text-amber-700"}>
                        {ex.reviewStatus === "confirmed" ? <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Verified by Doctor</span> : "Pending Doctor Review"}
                      </strong>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ex.reviewStatus === "confirmed" ? "Ready" : "Will verify at OPD"}
                    </span>
                  </div>
                </div>
              );
            }


            // PRACTITIONER DASHBOARD CLINICAL VIEW (Matches exact screenshot design)
            return (
              <div
                key={ex._id}
                className={`rounded-3xl bg-white p-4 shadow-sm border transition-all ${
                  isBlocked ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-100"
                }`}
              >
                {/* Top Header Line */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      {meta?.kind || "PRESCRIPTION"}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {ex.createdAt
                        ? new Date(ex.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
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

                {/* Status Line */}
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

                {/* Detected Hints Section (Matching exact box styling in user screenshot) */}
                <div className="mt-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
                     DETECTED RX HINTS:
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {points.map((pt, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-2.5 font-mono text-[11px] text-slate-700 leading-relaxed"
                      >
                        {pt}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Collapsible Raw Text Inspector */}
                <div className="mt-3 border-t border-slate-100 pt-2.5">
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
                      STRUCTURED EXTRACT / CORRECTION:
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
                      <span className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        Confirm Extract
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn-ghost px-3.5 py-1 text-xs font-semibold"
                      onClick={() =>
                        void onReview(ex._id, "corrected", draft)
                      }
                    >
                      <span className="flex items-center gap-1.5">
                        <Edit2 className="h-3.5 w-3.5" />
                        Save Correction
                      </span>
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


