# Dedicated Document Pipeline & OCR UI/UX — Design Spec

**Date:** 2026-08-23  
**Problem:** PS 26047 Ministry of AYUSH / AIIA  
**Status:** Approved for Implementation

---

## 1. Goal & Clinical Principles

Provide a dedicated, intuitive, and safety-gated **Document Pipeline & OCR Workstation** within the Practitioner Console (`/practitioner`).

### Core Principles
1. **5-Stage Document Spine**:
   - `01 Physical documents` — Paper prescriptions, lab sheets, and discharge scans captured/uploaded via kiosk or practitioner desk.
   - `02 OCR + understanding` — Sarvam Document AI text recognition with Tesseract.js local/offline fallback.
   - `03 Rx / lab / scan metadata` — Heuristic & structural extraction of candidate medications and lab biomarkers.
   - `04 Attach to visit` — Immutable attachment to Convex `documents` and `documentExtracts` tables.
   - `05 Doctor review` — Clinician inspection, manual corrections, and verification.
2. **Clinical Safety Guarantee**:
   - **Never Silent-Merge**: OCR extracted text is strictly isolated in a parallel document track (`mergedIntoClinicalSlots: false`). It never automatically commits or writes into the active medication list or allergy list.
   - **Confidence Gating**: Low confidence (< 70%), handwriting scrawls, or failed extractions trigger mandatory doctor review and block final visit sign-off until explicitly confirmed or corrected.

---

## 2. Architecture & Data Flow

```
[Camera / File Upload (Kiosk or Practitioner Desk)]
                    │
                    ▼
          [/api/ocr Route]
                    │
   ┌────────────────┴────────────────┐
   │ If SARVAM_API_KEY present:      │ If missing / offline:
   ▼                                 ▼
[Sarvam Document AI API]     [Local Tesseract.js Engine]
   │                                 │
   └────────────────┬────────────────┘
                    │ Raw Text + Confidence Score
                    ▼
       [Metadata & Heuristic Parser]
         (src/lib/documents/metadata.ts)
         - Identifies candidate Rx & Lab tokens
         - Detects handwriting likelihood (< 55%)
         - Sets reviewRequired flag (< 70% or handwriting)
         - Guarantees mergedIntoClinicalSlots = false
                    │
                    ▼
          [Convex Database]
         - documents: { visitId, storageId, kind, createdAt }
         - documentExtracts: { documentId, visitId, rawText, structuredJson, confidence, reviewStatus }
                    │
                    ▼
       [Practitioner Workstation UI]
         - Realtime reactive subscription via Convex useQuery
         - Live stage tracker (01 to 05) & pending count
         - Side-by-side OCR review & correction controls
```

---

## 3. UI/UX Specification for Practitioner Console (`/practitioner`)

### 3.1 3-Column Workstation Layout
The screen layout transitions to a 3-column clinical workstation:
- **Left Column (`240px - 260px`)**: OPD Queue, patient switcher, and previous visit logs.
- **Center Column (`1fr`)**: Primary clinical consultation desk (SOCRATES chief complaint, Dashavidha assessment, doctor notes, care plans, referrals, and ABDM FHIR bundle).
- **Right Column (`380px - 420px`)**: Dedicated Document Pipeline & OCR Station.

### 3.2 Right Column Components:
1. **Pipeline Header & 5-Stage Step Tracker**:
   - Visual progress numbered list showing stages `01` through `05`.
   - Current stage dynamically highlighted based on state (e.g. uploading, processing, awaiting review, all confirmed).
   - Live summary badge: `Attached {N} · doctor review pending {M}`.
2. **Safety Callout Card**:
   - Styled banner:
     > 🛡️ **Clinical Safety Rail**  
     > OCR outputs never silent-merge into medicines or allergies. All document extracts are maintained as auxiliary reference records requiring clinician verification.
3. **Practitioner Upload Zone**:
   - Direct file picker / camera capture input.
   - Document kind selector (`Prescription`, `Lab Report`, `Scan / Discharge`).
   - Live uploading/processing spinners with step-by-step feedback.
4. **Document & OCR Extract Cards**:
   - Document kind tag & capture timestamp.
   - Confidence percentage badge with color coding:
     - 🟢 **High Confidence (>= 70%)**: Printed text recognized cleanly.
     - 🟡 **Review Required (50-69%)**: Handwriting detected or noisy print.
     - 🔴 **Failed / Scrawl (< 50%)**: Image stored for manual doctor reading.
   - Candidate token chips:
     - 💊 **Candidate Rx**: Detected medicines, dosages, and frequencies.
     - 🔬 **Candidate Labs**: Detected test parameters and values.
   - Collapsible Raw OCR text view.
   - Editable Structured JSON / Textarea drawer for doctor corrections.
   - Action buttons:
     - `Confirm Extraction` (sets `reviewStatus = "confirmed"`)
     - `Save Correction` (updates `structuredJson` and sets `reviewStatus = "corrected"`)
5. **Approval Blocking Integration**:
   - If any attached extract has `reviewStatus == "pending"` or `reviewStatus == "failed"`, the main visit `Approve and save` button in the center column is disabled with an explanatory tooltip and counter.

---

## 4. Verification & Testing Plan

1. **Unit Tests (`src/lib/documents/metadata.test.ts`)**:
   - Verify `buildDocumentExtractMeta` correctly identifies medicine hints, lab hints, confidence thresholds, and sets `mergedIntoClinicalSlots: false`.
   - Verify `extractBlocksApprove` blocks approval on pending/low-confidence/failed extracts and passes confirmed/corrected extracts.
2. **Type Safety & Build**:
   - Execute `npx tsc --noEmit` to guarantee full TypeScript strict typing across all components.
3. **End-to-End Console Verification**:
   - Test document upload from the practitioner station.
   - Verify 5-stage tracker advances from `01 Physical documents` to `05 Doctor review`.
   - Verify status counters update in real time (`Attached N · doctor review pending M`).
   - Confirm and correct document extracts and observe instant unblocking of the visit approval action.
