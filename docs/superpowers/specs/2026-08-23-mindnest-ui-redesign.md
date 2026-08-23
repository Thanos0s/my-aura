# Sitewide UI/UX Redesign — Mindnest Wellness Aesthetic

**Date:** 2026-08-23  
**Problem:** PS 26047 Ministry of AYUSH / AIIA  
**Status:** Approved for Implementation

---

## 1. Goal & Aesthetic Direction

Transform the entire **My Aura** visual theme and UI layout from a dark cyberpunk style to the airy, serene, and modern **Mindnest** health & wellness dashboard aesthetic.

### Visual Foundations:
- **Canvas / Background**: Radiant soft ice-cyan ambient background (`#edf5f8` to `#e2eff5`).
- **Cards & Surfaces**: Clean white cards (`#ffffff`) with ultra-smooth 24px-32px rounded corners (`rounded-3xl`), soft ambient drop-shadows (`shadow-[0_8px_30px_rgb(20,40,60,0.04)]`), and subtle borders (`border-slate-100/80`).
- **Palette**:
  - Deep Ocean Slate (`#1b343f` to `#2c4f5d`): Used for hero banners, dark action pills, and contrast elements.
  - Light Ice Blue (`#bde0ef` to `#0284c7`): Used for active tab highlights, organ/dosha selectors, and accent chips.
  - Emerald / Ayurvedic Sage (`#0d9488` / `#059669`): Health badges, live status, and confirmation pills.
  - Slate Neutrals: `#0f172a` (slate-900 heading), `#64748b` (slate-500 body), `#94a3b8` (slate-400 overlines).
- **Navigation**: Floating vertical pill sidebar on the left with clean glyph icons and bottom profile avatar.
- **Controls**: Full pill-shaped action buttons (`rounded-full`), clean input fields (`rounded-xl border-slate-200 bg-slate-50 focus:bg-white`), and soft tag badges.

---

## 2. Key Screen Transformations

### 2.1 Patient Portal (`/patient`) — Mindnest Dashboard Layout
Maps the user-provided Mindnest layout directly to Ayurvedic case-taking & patient health concepts:
1. **Top Greeting & Header**:
   - `Good Morning, [Name]` subtitle with large bold title: `How's your health balance today?`
   - Right utility bar with search pill and quick action buttons.
2. **Hero Spotlight Card (Left Top)**:
   - Deep ocean-slate gradient card with typography ("AI-Guided Intake & Dinacharya"), CTA button ("Start Consultation / Intake"), social proof stats (`👥 9K+ Patients Managed`), and elegant wellness visual.
3. **Health & Dosha Overview Card (Right Top)**:
   - Displays vital health metrics (`88 bpm · Vata-Pitta Balance · Steady & Healthy`).
   - Interactive Dosha/Organ selector pill buttons (`🫀 Vata`, `🧠 Pitta`, `🫁 Kapha`, `🩺 Dashavidha`).
   - Visual anatomical / Dosha representation with status tags (`110/80`, `Normal Agni`, `Pravara Bala`).
   - Action pill button: `🌿 Improve Health / Record Intake`.
4. **Metrics & Routine Row (Bottom Grid)**:
   - **Ahara / Calories Card**: Bar chart visualization of nutrition progress and bold count (`1,858 Kcal`).
   - **Hydration / Vihara Card**: Fluid wave graphic, water goal tracker, and bold count (`750 ml · 35% Completed`).
   - **Dinacharya / Daily Care Schedule Card**: Day selector tabs (`Sat`, `Sun`, `Mon` [active], `Tue`, `Wed`) and routine task checklist with action buttons (`Start` / `✓ Done`).
5. **Dedicated Portals**:
   - Tab switcher for `Dashboard`, `Intake / Case Taking`, `Documents & OCR`, `Symptoms`, `Care & Diet`, `Appointments`, and `Messages`.

### 2.2 Practitioner Console (`/practitioner`)
- Integrated 3-column workstation styled in clean white rounded-3xl cards:
  - Left: Patient queue with clean role chips and status badges.
  - Center: Consultation desk (SOCRATES, *Dashavidha*, doctor notes, care plans, FHIR export).
  - Right: Dedicated `DocumentPipelinePanel` with color-coded confidence badges, OCR candidate chips, and safety rail banner.
  - Top view switcher in sleek pill style (`🔲 3-Column Split`, `📋 Consultation Desk`, `📄 Document Pipeline & OCR`).

### 2.3 Walk-up Kiosk (`/kiosk`) & KioskWizard
- Serene light-themed kiosk interface with large friendly touch cards, Indic language selector pills, and voice input indicators.

### 2.4 Landing Page (`/`), Login Gates (`/login/*`), and Admin/Dietitian/Staff Consoles
- Transformed with consistent Mindnest styling, floating cards, clean typography, and responsive grid layouts.

---

## 3. Verification Plan

1. **Automated Unit Tests**:
   - Run `npm test` across all 8 Vitest suites to ensure 100% logic and test compatibility.
2. **TypeScript Strict Type Check**:
   - Run `npx tsc --noEmit` to verify 0 type errors.
3. **ESLint Quality Check**:
   - Run `npm run lint` to verify 0 errors and 0 warnings.
4. **Visual & Layout Inspection**:
   - Verify all routes (`/`, `/patient`, `/practitioner`, `/dietitian`, `/admin`, `/kiosk`, `/login/*`) render with the Mindnest aesthetic and responsive behavior.
