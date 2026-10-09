# HealthHub v328 · Intelligence Context Bridge
2026-10-09

## Delivered
- Existing Ask Léna page gets a new premium, mobile-friendly “Intelligence · Valódi HealthHub adatok” panel.
- Existing **Kutatás** action automatically runs the Bridge first. The panel also has an independent “Intelligence adatellenőrzés” control so the data audit can be repeated without triggering legacy Drive research.
- Eight read-only, profile-scoped data adaptors:
  1. Symptoms: `hh-symptom-journal-v1`, active profile only, deleted items excluded; relevant episodes prioritized. Reads the already-present local cache. Does **not** pull from Dropbox.
  2. HealthRadar vitals: latest BP/pulse/weight/glucose/O2 and known averages from `hhGetLenaHealthContext289`.
  3. Sleep: last recorded session and precomputed 72h/7d/30d aggregates.
  4. Activity: recent steps/active minutes and averages.
  5. Environment: read-only `HH_ENVIRONMENT_V1.getCurrent()`, fallback to `HH_DAILY_HEALTH_V312.getContext()`.
  6. Infections: `HH_INFECTION_WATCH_V1.get()`, publication-period date explicit.
  7. Profile/medications: local context; includes explicit reminder that prescribed medication status is not verified.
  8. Clinical record index: document counts, mirrored-link counts and question-related title matches **only**, not PDF contents.
- Each source shows actual values and time stamps where available, plus `available`, `stale` or `missing` state and an explicit data limitation note. Nothing is marked available when all of that source's values are missing.
- Legacy v289 / v295–v299, profile switching, Drive archiving, health stores, Dropbox sync, environmental fetch logic and AI generation remain unchanged.
- No background network call from the Bridge and no automatic transfer of health data to Google Drive, ChatGPT or GitHub.

## Explicit limitations
- This is a **local source-verification deliverable**, not an AI diagnosis or final advice engine. The old Drive-RAG path remains separate; direct, authenticated private AI generation is future work.
- The existing v289 collector does not currently expose stage-level deep sleep / REM values; the UI says so rather than guessing.
- If local symptom cache is behind Dropbox, the preview can be outdated. It must never claim to have refreshed the cloud.
- Cached environmental observations can become old; the UI shows a stale badge after 3 hours. Infection period >21 days is also flagged.
- Source relevance is a cautious keyword filter, not semantic understanding.
- Browser/device functional validation (including Android S24 Ultra) still required.

## QA
- Static JavaScript checks on Bridge, existing Ask Léna file, and the HTML bootstrap.
- In-memory synthetic checks for the 8 expected data sources, profile isolation, symptoms and unrelated pain not conflated, actual blood pressure/sleep/activity/environment values, absent data and stale environment.
- Node regression script: `node healthhub/scripts/intelligence-context-v328.test.cjs`.

## Manual smoke test
1. Open `healthhub/index.html?hhv=328`; go to Ask Léna.
2. Enter “Miért fáj a fejem?” and click **Kutatás**, or use **Intelligence adatellenőrzés** for the local-only audit.
3. Check exact profile, values, date stamps, all eight cards. Confirm the headache record matches but other pain entries do not.
4. Switch to the other profile, rerun and confirm there is no health data mixing.
5. Check empty/stale source states; check no extra Drive login was triggered by the independent audit.
6. Check homepage, Sleep, Activity, symptom editor, and previously working research are untouched.
