# Dedicated Document Pipeline & OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated, safety-gated Document Pipeline and OCR review workstation in the Practitioner Console (`/practitioner`) with Sarvam Document AI integration, Tesseract fallback, a 5-stage visual progress tracker, and strict isolation preventing automatic merges into medicines or allergies.

**Architecture:** 
- A server-side OCR route (`/api/ocr`) that interfaces with Sarvam Document AI when `SARVAM_API_KEY` is present and gracefully falls back to local Tesseract.js.
- A metadata and safety engine (`src/lib/documents/metadata.ts`) that extracts candidate medicine/lab chips, flags review requirements, and enforces `mergedIntoClinicalSlots: false`.
- A dedicated 3-column clinical layout in `src/app/practitioner/page.tsx` hosting a new `DocumentPipelinePanel` component in the right rail with live stage indicators, upload drop-zone, and interactive review cards.

**Tech Stack:** Next.js 15.5 (App Router), React 19, Convex (realtime backend & storage), Sarvam Document AI / Tesseract.js, Tailwind CSS 4, Vitest, TypeScript.

## Global Constraints

- **Never Silent-Merge**: OCR extracted text is kept in a separate reference track and must never auto-populate active medicines or allergies.
- **Review Gating**: Any document extract with confidence < 70%, handwriting detected, or pending/failed status blocks doctor visit sign-off until explicitly confirmed or corrected.
- **Provider Parity**: Uses existing `SARVAM_API_KEY` when configured; falls back cleanly to Tesseract.js without runtime crashes if the key is unset.

---

### Task 1: Enhance OCR Engine & Document Metadata Extraction

**Files:**
- Modify: `src/app/api/ocr/route.ts`
- Modify: `src/lib/documents/metadata.ts`
- Modify: `src/lib/documents/metadata.test.ts`

**Interfaces:**
- Consumes: `SARVAM_API_KEY` environment variable, multipart `file` and `kind` (`prescription` | `lab` | `scan`).
- Produces: `DocumentExtractMeta` with `confidence`, `reviewRequired`, `handwritingLikely`, `candidateMedicines`, `candidateLabs`, `rawText`, and `mergedIntoClinicalSlots: false`.

- [ ] **Step 1: Write failing tests for expanded metadata parsing**

```typescript
// In src/lib/documents/metadata.test.ts
import { describe, expect, it } from "vitest";
import {
  buildDocumentExtractMeta,
  extractBlocksApprove,
  getConfidenceBadge,
} from "./metadata";

describe("Document Metadata & Safety", () => {
  it("extracts candidate medicines and labs with safety flags", () => {
    const raw = "Rx: Tab Metformin 500mg OD\nParacetamol 650mg SOS\nHb: 11.2 g/dL\nTSH: 2.4";
    const meta = buildDocumentExtractMeta({
      kind: "prescription",
      rawText: raw,
      confidence: 0.85,
    });
    expect(meta.mergedIntoClinicalSlots).toBe(false);
    expect(meta.reviewRequired).toBe(false);
    expect(meta.structuredFields.possibleMedicines.length).toBeGreaterThan(0);
    expect(meta.structuredFields.possibleLabs.length).toBeGreaterThan(0);
  });

  it("assigns correct confidence tiers and badges", () => {
    expect(getConfidenceBadge(0.92)).toEqual({
      tier: "high",
      label: "High Confidence",
      color: "text-success",
    });
    expect(getConfidenceBadge(0.62)).toEqual({
      tier: "review",
      label: "Review Required",
      color: "text-warning",
    });
    expect(getConfidenceBadge(0.40)).toEqual({
      tier: "low",
      label: "Low Confidence / Scrawl",
      color: "text-pulse",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/documents/metadata.test.ts`
Expected: FAIL with `getConfidenceBadge is not a function`.

- [ ] **Step 3: Implement `getConfidenceBadge` and update Sarvam Document AI integration in `/api/ocr/route.ts`**

Update `src/lib/documents/metadata.ts` to export `getConfidenceBadge` and refine hints.
Update `src/app/api/ocr/route.ts` to attempt calling Sarvam's Document AI endpoint if `SARVAM_API_KEY` is present, falling back to Tesseract.js.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/documents/metadata.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/documents/metadata.ts src/lib/documents/metadata.test.ts src/app/api/ocr/route.ts
git commit -m "feat(ocr): enhance metadata extraction and confidence badge helper"
```

---

### Task 2: Build the Dedicated `DocumentPipelinePanel` Component

**Files:**
- Create: `src/components/DocumentPipelinePanel.tsx`
- Modify: `src/components/PipelineRails.tsx` (ensure export compatibility)

**Interfaces:**
- Consumes:
  - `extracts`: Array of Convex `documentExtracts` rows
  - `onUpload`: `(file: File, kind: "prescription" | "lab" | "scan") => Promise<void>`
  - `onReview`: `(extractId: Id<"documentExtracts">, status: "confirmed" | "corrected", draftJson?: string) => Promise<void>`
  - `sessionUserId`: `Id<"users">`
- Produces: Visual 5-stage tracker, safety rail banner, in-consultation file/camera uploader, and interactive OCR review cards.

- [ ] **Step 1: Create `src/components/DocumentPipelinePanel.tsx`**

Implement the full component with:
- Top 5-stage visual step indicator:
  - `01 Physical documents`
  - `02 OCR + understanding`
  - `03 Rx / lab / scan metadata`
  - `04 Attach to visit`
  - `05 Doctor review`
- Live badge: `Attached {total} · doctor review pending {pending}`
- Safety Rail Callout banner:
  - *"🛡️ Side rail — OCR never silent-merges into medicines or allergies. Clinician must explicitly verify."*
- Upload drop zone with Document Kind selector (`Prescription`, `Lab Report`, `Scan / Discharge`) and file input.
- Document extract cards displaying:
  - Kind, date/time, and Confidence Badge pill (High / Review Required / Scrawl).
  - Detected candidate medicines & labs chip list.
  - Collapsible Raw OCR text view.
  - Editable JSON / text area for doctor corrections.
  - `Confirm Extraction` and `Save Correction` buttons.

- [ ] **Step 2: Typecheck the new component**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/DocumentPipelinePanel.tsx src/components/PipelineRails.tsx
git commit -m "feat(ui): create dedicated DocumentPipelinePanel component"
```

---

### Task 3: Integrate 3-Column Layout in Practitioner Console (`/practitioner`)

**Files:**
- Modify: `src/app/practitioner/page.tsx`

**Interfaces:**
- Connects Convex `api.documents.attachDocument`, `api.documents.generateUploadUrl`, and `api.documents.reviewExtract`.
- Integrates `DocumentPipelinePanel` in the right column of the grid layout (`lg:grid-cols-[240px_1fr_400px]`).
- Updates the main `Approve and save` button with blocking status if `ocrBlocked` is true.

- [ ] **Step 1: Update `PractitionerApp` layout and handlers**

- Reconfigure grid layout to `grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_400px]`.
- Add upload handler in `PractitionerApp` utilizing Convex storage `generateUploadUrl` and `/api/ocr`.
- Replace the inline OCR section in the center column with the dedicated `DocumentPipelinePanel` in the right column.
- Provide a summary indicator in the center column referencing the right rail when OCR approval is pending.

- [ ] **Step 2: Verify type safety & tests**

Run: `npx tsc --noEmit`
Run: `npm test`
Expected: PASS (0 errors, all 8 test suites passing).

- [ ] **Step 3: Commit**

```bash
git add src/app/practitioner/page.tsx
git commit -m "feat(practitioner): integrate 3-column layout with dedicated document pipeline rail"
```

---

### Task 4: Full System Verification & Regression Testing

**Files:**
- Run: Vitest unit test suite
- Run: TypeScript build check
- Run: Manual validation flow check

- [ ] **Step 1: Run complete test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: Exits with code 0.

- [ ] **Step 3: Commit all changes**

```bash
git status
git commit -m "chore: complete document pipeline and OCR station implementation"
```
