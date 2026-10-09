# HealthHub v329 · Source-first Ask Léna
2026-10-09

## Why
The Android v328 screenshots confirmed accurate 8-source collection (6 with data, 2 missing) for a headache question: symptom diary, vitals, environment, medications, records index, infection watch. The existing Ask Léna route still treated an absent **relevant archived PDF** as a reason to give no usable answer. The card correctly reported 0 matching PDFs despite 38 indexed, 33 archived records. It was a **router gating failure**, not a failed data-collection job.

## Scope
- Existing **📚 Kutatás** now runs v328 source verification, obtains a same-profile validated source report, and creates a new **❤️ Léna javaslata** card *before* any optional Drive/PDF RAG operation.
- Uses actual timestamps and values from the existing HealthHub context. Headache sample path considers severity/outcome, BP value and age, pulse, oxygen measurement, sleep 72h, activity, 6h pressure trend.
- Numeric guardrails prevent old BP from being described as fresh, avoid assuming a weather cause, treat sleep segmentation and pulse oximetry cautiously.
- Clear practical low-risk steps + escalation precautions. No unsupported OTC drug suggestions or dosage alterations.
- If no matching PDF exists: show a **successful, local evidence summary**, not “A kutatás megállt”; no need to upload a medical record or link Google Drive.
- The original Drive PDF extraction and handoff remains available **only where relevant archived originals exist**, the existing optional checkbox is checked and RAG readiness is confirmed.
- Update RAG block caption to **“Kórlap-kutatás · opcionális”**, so its missing Drive status cannot be mistaken for the Ask Léna engine being unavailable.
- Source bridge now returns a verified result and clears stale results on failures, guarding against cross-profile rendering.

## What this is not
This v329 answer is explicitly marked as **deterministic, local, rule-based preliminary analysis**, not a live ChatGPT/OpenAI answer. The actual authenticated, consented OpenAI-powered reasoning is a separate next step; **do not mislabel the interim answer as model-generated**. No health data is sent to ChatGPT, Drive or GitHub by the new component.

## Privacy and testing
- Existing clinical data storage, Health Connect import, measurements, Dropbox sync, Supabase auth, old Drive archive mechanism remain untouched.
- Only changes: small source bridge return-value fix, Ask Léna routing/messages, new standalone v329 answer module, cache tags and a synthetic regression test.
- Static source and HTML bootstrap syntax validated. Simulated 141/88, 90 BPM, symptom 6/10, 92% SpO2 and 5.5 hPa synthetic case manually validated against expected output, including 92%-specific conditional red-flag language and old-BP time qualification.
- Synthetic regression: `node healthhub/scripts/lena-source-first-v329.test.cjs`.
- S24 Ultra real browser smoke test still required.

## S24 Ultra smoke test
1. Load `healthhub/index.html?hhv=329`.
2. In Zsolt profile ask: “Léna, miért fáj a fejem?” Tap **📚 Kutatás**.
3. Verify the **❤️ Léna javaslata** card appears *before* the 8-source data inspector; check concrete dates/values match.
4. Verify no “nincs releváns Drive-lelet” stopping error appears when the RAG returns 0 matching PDFs.
5. Uncheck optional Drive permission and repeat; local answer must still be produced.
6. Switch to Mónika and repeat. Zsolt's diary, metrics and medication must not be shown.
7. Check unrelated HealthHub pages unaffected.
