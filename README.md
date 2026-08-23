# My Aura — AI-assisted OPD case-taking

Ministry of AYUSH / AIIA problem statement **PS 26047**. Browser kiosk + role consoles. **Never auto-diagnostic.** The Ayurveda practitioner has final clinical authority; AI does not auto-commit diagnosis or treatment.

## Run

```bash
npm install
npm test
npx tsc --noEmit
npm run dev
```

In a second terminal, after `npx convex login` (once):

```bash
npx convex dev
```

Copy `NEXT_PUBLIC_CONVEX_URL` into `.env.local`. Optional:

```
SARVAM_API_KEY=
SARVAM_LLM_MODEL=sarvam-105b
```

Without a Sarvam key, the kiosk uses **typed chips** and a small heuristic extractor. Without Convex, the kiosk still runs **locally**; logged-in stations need Convex.

## Auth

**Patient** (`/login/patient`) and **practitioner** (`/login/doctor`) use **Firebase Auth** (email / password). Convex verifies the Firebase ID token (`convex/auth.config.ts`) and `ensureFromFirebase` creates or links the Convex `users` row.

Enable Email/Password in the Firebase console, then set in `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

On the Convex side, put the **same project id** in `convex/firebaseAuth.ts` (`FIREBASE_AUTH_PROJECT_ID`) so ID tokens can be verified. Then restart `npx convex dev`.

Until those vars exist, patient/clinic gates fall back to hashed PIN.

**Admin** stays PIN. Seed demo users: PIN **1234**.

| Role | Email | Fallback PIN | Route |
| --- | --- | --- | --- |
| Patient | `patient@aura.local` | 1234 | `/patient` |
| Practitioner | `practitioner@aura.local` | 1234 | `/practitioner` |
| Dietitian | `dietitian@aura.local` | 1234 | `/dietitian` |
| Admin | `admin@aura.local` | 1234 | `/admin` |

Walk-up kiosk (no login): `/kiosk`.

## Routes

- `/` — product landing (features, website flow, four roles)
- `/login` — choose Patient, Admin, or Clinic staff
- `/login/patient` — Firebase patient login / register → `/patient`
- `/login/doctor` — Firebase practitioner login / register → `/practitioner`
- `/login/admin` — admin PIN login → `/admin`
- `/login/staff` — practitioner or dietitian → `/practitioner` or `/dietitian`
- `/kiosk` — walk-up intake
- `/patient` — portal (case taking, symptoms, Ahara-Vihara, plans, adherence, booking, messages)
- `/practitioner` — queue, history, editable AI summary, Dashavidha interpretation, OCR, FHIR mock, care plans, referrals
- `/dietitian` — referred patients, approved summary only, diet plans, adherence, messages, progress notes
- `/admin` — users/roles, knowledge base, documents queue, audit (doctorEdits + admin actions), analytics, issues
- `/staff` — red-flag floor alerts

## Schema additions

`users`, `symptomLogs`, `lifestyleLogs`, `carePlans`, `dietPlans`, `meals`, `adherenceLogs`, `appointments`, `messages`, `referrals`, `practitionerNotes`, `ayurvedaAssessments`, `knowledgeBase`, `issueReports`, `auditLogs`, `dietitianProgressNotes`. Patients may link `userId`. Indexes on `userId` / `patientId` (and role, email, visit, dietitian) as used by queries.

Wearables are out of scope. ABDM push is the local `/api/mock-abdm` simulator. No live payments.
