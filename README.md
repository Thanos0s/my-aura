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
SARVAM_LLM_MODEL=sarvam-m
```

Without a Sarvam key, the kiosk uses **typed chips** and a small heuristic extractor. Without Convex, the kiosk still runs **locally**; logged-in stations need Convex.

## Demo logins

On Home or `/login`, click **Seed demo users**. PIN is **1234** (stored hashed). Session: `localStorage` + Convex `userId`.

| Role | Email | PIN | Route |
| --- | --- | --- | --- |
| Patient | `patient@aura.local` | 1234 | `/patient` (alias `/portal/patient`) |
| Practitioner | `practitioner@aura.local` | 1234 | `/practitioner` (`/doctor` redirects here) |
| Dietitian | `dietitian@aura.local` | 1234 | `/dietitian` |
| Admin | `admin@aura.local` | 1234 | `/admin` |

Walk-up kiosk (no login): `/kiosk`. Logged-in patients use the same intake engine, bound to their patient record.

Public registration is **patient-only**. Other roles are seeded or assigned by admin.

## Routes

- `/` — product landing (all features, pipelines, four roles)
- `/login` — role picker + demo login
- `/login?role=patient|practitioner|dietitian|admin`
- `/kiosk` — walk-up intake
- `/patient` — portal (case taking, symptoms, Ahara-Vihara, plans, adherence, booking, messages)
- `/practitioner` — queue, history, editable AI summary, Dashavidha interpretation, OCR, FHIR mock, care plans, referrals
- `/dietitian` — referred patients, approved summary only, diet plans, adherence, messages, progress notes
- `/admin` — users/roles, knowledge base, documents queue, audit (doctorEdits + admin actions), analytics, issues
- `/staff` — red-flag floor alerts

## Schema additions

`users`, `symptomLogs`, `lifestyleLogs`, `carePlans`, `dietPlans`, `meals`, `adherenceLogs`, `appointments`, `messages`, `referrals`, `practitionerNotes`, `ayurvedaAssessments`, `knowledgeBase`, `issueReports`, `auditLogs`, `dietitianProgressNotes`. Patients may link `userId`. Indexes on `userId` / `patientId` (and role, email, visit, dietitian) as used by queries.

Wearables are out of scope. ABDM push is the local `/api/mock-abdm` simulator. No live payments.
