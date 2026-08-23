# Mindnest UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the entire website into the serene, modern Mindnest health & wellness aesthetic—featuring an ice-cyan ambient background, rounded-3xl white cards, floating pill sidebar navigation, deep ocean-slate hero banners, Dosha/organ health visualizers, hydration/calorie metrics, and Dinacharya routine planners.

**Architecture:**
- Modernized global design system in `src/app/globals.css` with light-mode variables, rounded-3xl elevation, and pill controls.
- Reusable `ConsoleShell` and navigation sidebar incorporating the floating white pill navigation.
- Patient Portal (`src/components/PatientStation.tsx`) faithfully recreating the Mindnest dashboard layout with Ayurvedic case-taking capabilities.
- Matching redesigns across Practitioner Console, Kiosk Wizard, Landing Page, Login gates, and Dietitian/Admin stations.

**Tech Stack:** Next.js 15.5, React 19, Tailwind CSS 4, Convex, Lucide/SVG icons, TypeScript, Vitest.

---

### Task 1: Global Theme, Color Tokens, and CSS System

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/ConsoleShell.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update `src/app/globals.css` with Mindnest tokens**
- [ ] **Step 2: Update `src/components/ConsoleShell.tsx` with floating pill navigation**
- [ ] **Step 3: Verify TypeScript compilation with `npx tsc --noEmit`**
- [ ] **Step 4: Commit Task 1**

---

### Task 2: Patient Portal Mindnest Dashboard

**Files:**
- Modify: `src/components/PatientStation.tsx`

- [ ] **Step 1: Build the Mindnest hero banner, Health/Dosha overview card, and metrics grid**
- [ ] **Step 2: Connect interactive dosha selector, Ahara calories bar chart, hydration tracker, and Dinacharya schedule**
- [ ] **Step 3: Integrate Document Pipeline & OCR tab with matching Mindnest card design**
- [ ] **Step 4: Verify type safety and tests with `npx tsc --noEmit` and `npm test`**
- [ ] **Step 5: Commit Task 2**

---

### Task 3: Redesign Practitioner Console, Kiosk, Landing Page, and Login Gates

**Files:**
- Modify: `src/app/practitioner/page.tsx`
- Modify: `src/components/DocumentPipelinePanel.tsx`
- Modify: `src/components/LandingPage.tsx`
- Modify: `src/components/LoginPanel.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/dietitian/page.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/staff/page.tsx`

- [ ] **Step 1: Update Practitioner Console and DocumentPipelinePanel to Mindnest white card styling**
- [ ] **Step 2: Update Landing Page, Login gates, and auxiliary consoles (Dietitian, Admin, Staff)**
- [ ] **Step 3: Verify type safety and linting with `npx tsc --noEmit` and `npm run lint`**
- [ ] **Step 4: Commit Task 3**

---

### Task 4: Full System Verification & Regression Testing

**Files:**
- Run: Vitest unit test suite (`npm test`)
- Run: TypeScript build check (`npx tsc --noEmit`)
- Run: ESLint quality check (`npm run lint`)

- [ ] **Step 1: Run complete test suite**
- [ ] **Step 2: Run type check & lint**
- [ ] **Step 3: Update walkthrough artifact and finalize**
