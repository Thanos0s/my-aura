# AI-Assisted Patient Case-Taking — Design

**Date:** 2026-08-23  
**Problem:** PS 26047 Ministry of AYUSH / AIIA  
**Status:** Approved for implementation (full PRD slice including OCR, hash-chain, mocked FHIR)

## Goal

Browser kiosk takes a structured, multilingual history (voice + touch) before the doctor sees the patient. Output is an editable summary, never auto-diagnostic, persisted in Convex, with OCR review, hash-chain tamper evidence, and mocked ABDM FHIR push.

## Stack

- Next.js App Router (kiosk + doctor + staff + admin)
- Convex (encrypted cloud case record, realtime)
- Speech gateway: Sarvam Saaras v4 (STT), Sarvam-105B (extract JSON), Bulbul v3 (TTS) — keys server-side only
- Ontology engine: deterministic TypeScript (SOCRATES + red flags + Dashavidha)
- Offline: IndexedDB typed fallback when Sarvam/network unavailable

## Out of scope

Wearables/smartwatch. Live ABDM credentials. Production Hyperledger. DPDP legal audit. Handwriting OCR accuracy claims.

## Safety

Red flags first. Self-harm → human only. LLM fills slots only. Doctor must approve. Attendant provenance. Drugs/allergies required.

See conversation design sections 1–4 for architecture, data model, engine, and UI.
