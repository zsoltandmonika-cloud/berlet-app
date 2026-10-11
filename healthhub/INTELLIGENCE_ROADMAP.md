# HealthHub Intelligence · Technical design and acceptance criteria
**Owner:** Ask Léna / HealthHub Intelligence engineering
**Start:** 2026-10-11
**Baseline:** v387 HealthHub web, v0.14.0 signed Connect, Dropbox Health Connect and Samsung SDK.
**Principle:** HealthHub is a personal decision-support assistant, *not* an autonomous clinician.

## Architecture
Phone / watch → Samsung Health + Health Connect → HealthHub Connect →
encrypted/private Dropbox profile vault → v289 health context →
v328 source inventory → **v388 Intelligence Provenance Gate** →
authenticated, explicitly consented Ask Léna AI request → streamed, sourced answer.

- The two household profiles must never be mixed, including async/profile-switch cases.
- Report each source's actual observation timestamp. A generated report time is NOT a fresh measurement.
- Distinguish **measured**, **estimated**, **derived trend**, **prior document summary**, **original PDF extract** and **missing data**.
- Missing measurements remain unknown, not zero.
- The assistant may offer observations and next steps, not definitive diagnoses or medication adjustments.
- Health data is never committed to GitHub; private data remains in existing authenticated vault.
- AI calls remain explicitly initiated by the person, with login/permissions; never background send private health data.
- The backend remains the gatekeeper for authentication and patient-profile authorization.

## Phases, in priority order

### I-01 (v388) · Data provenance and freshness guard — IMPLEMENTED
- Validates consent and profile before forming the AI request.
- Reads the real Health Connect export timestamp separately from context generation.
- Marks Activity stale when the Health Connect export cannot be shown newer than six hours.
- Marks out-of-date measurements, sleep, and already-stale source categories as uncertainty.
- Carries the warnings into the existing authorized AI request as source metadata; answer footer discloses any uncertainty.
- Pure local utility, no new data transmission beyond the user-initiated preexisting AI request.
- Regression tests: no shared-profile data, consent required, input immutability, stale and fresh source handling.
- No change to mobile APK, medication data or underlying Dropbox health records.

### I-02 (v389) · Unified measurement evidence ledger — FIRST IMPLEMENTATION
- Pure read-only, profile-scoped in-memory ledger `healthhub.intelligence.ledger/1`.
- For each verified source datum: profile, measurement type, value, unit, observedAt with day/instant precision,
  exportedAt when known, source system, classification (measured/reported/derived/estimated),
  traceable data path and source-aware deduplication ID.
- Preserve overlapping HC/context and Samsung SDK records as **different observations**.
  Source disagreements are reported, not converted into diagnostic errors.
- The source that exported more recently can be identified without asserting its value is medically correct.
- A legacy `0` in the v289 Activity cache might mean an unavailable measurement;
  it MUST NOT automatically become a measured zero active calorie value.
- Sleep intervals remain individual segments, not fabricated whole nights.
- Includes safe bounds, impossible future timestamps, and strict cross-profile handling.
- Builds locally during a consented Ask Léna request. Only a limited **provenance summary**
  is attached to the existing approved AI payload, never the full ledger, raw report or tokens.
- Reads Samsung snapshot **only if the existing Activity screen has already loaded and
  verified the same profile**, otherwise does not claim Samsung current-day measurements.
- Regression tests cover Mónika's 39 vs 16 active-minute divergence, duplicate data,
  source timestamp ordering, missing zeros, sleep segments and profile separation.
- **Still to do:** produce truly canonical per-observation source metadata at native ingestion
  (v289 source cache currently merges HC and local records), measuredAt exact times for daily
  aggregates where providers expose them, and an independently tested persistent private
  evidence-ledger cache. No source records are mutated in v389.

### I-03 (v390) · Time-series intelligence — FIRST IMPLEMENTATION
- Read-only, profile-scoped 7/30/90-day temporal analytics built from the already normalized I-02 ledger.
- Separate activity's **completed Budapest-calendar days** from today's ongoing totals.
  Today's partial steps NEVER inflate last-seven-day averages.
- Reports numeric **coverage** and minimum quality threshold (at least 70% of days) for every window.
  Missing values are **not zeros**, and an average or percentage comparison is withheld if either
  current or previous comparison window lacks sufficient measured-day coverage.
- Calculates separate metric windows for steps, source-reported active minutes, timestamped measured pulse,
  and recorded sleep intervals; a single pulse reading does not become a pulse trend or resting heart rate.
- Groups nocturnal sleep sessions by Budapest night, counts overlapping intervals just once,
  excludes intervening wake periods and daytime naps, and *never calls the result a confirmed full night*.
  A session closed this morning is eligible for the newest night window even when daytime activity is partial.
- If only 35 daily activity rows/14 recent sleep sessions are accessible, 90-day coverage is correctly
  insufficient; no fabricated history, benchmark or correlation.
- A bounded, source-labeled 7/30/90 evidence brief is included in the existing consented Ask Léna request;
  complete session records and time-series arrays remain in local memory.
- The research monitor and response provenance disclose I-03 coverage. The feature is explanatory, not
  diagnostic: absence of an association is not medical reassurance, and correlation is not causality.
- Synthetic regression tests include 7-vs-7 trends, partially observed days, 30/90 insufficiency,
  fragmented sleep, duplicate and overlapping records, new morning sleep and profile isolation.
- **Still to do:** a richer native time series and individual sensor timestamps, broader sleep-stage
  completeness, measured resting pulse (if source supports it), and robust cross-domain relationships.
  For Mónika, clinical-risk escalation must be a separate, conservatively validated safety pipeline.

### I-04 (v391) · Clinical Intelligence & Evidence Engine — FIRST IMPLEMENTATION
- Integrates an explicit, read-only Clinical Evidence preflight **after the existing v364 authorized RAG** retrieval and before Ask Léna's authenticated server call. The I-04 module itself does not read additional documents, fetch files, or store medical data.
- Validates active patient profile, prior user-initiated AI consent, original PDF excerpt-specific consent, document identity, excerpt length, page number, and source timestamps.
- Blocks unauthorized PDF extracts; rejects page-less 'original' extracts; keeps independent documents and events from the same year separate. Source identifiers are tied to the specific document and page.
- Clinical document date and file upload date are different. A date *mentioned within* a PDF is not automatically a verified injury/event or treatment date. Invalid date metadata becomes 'unknown' rather than hallucinated precision.
- Distinguishes **original page-identified PDF excerpts** from **previously written JSON summaries**. Neither is treated as a fully reviewed medical chart by default.
- Renders an expandable original-source verification panel beneath completed AI answers. Each listed source has a type, date-precision disclaimer, title and PDF page when actually present, without inventing clickable links.
- Profile medication list is **not reconciled with actual prescriptions or ingestion**. Source quality warnings explicitly avoid asserting current medication use, drug interaction, clinical diagnoses or treatment changes.
- Sends only the already-approved excerpts plus compact provenance metadata in the existing explicitly user-initiated, server-authorized Ask Léna request. No new unrestricted background AI or health-data transfer is introduced.
- Synthetic tests exercise same-year distinct records, PDF permission, missing page, malformed clinical dates, upload-versus-event dates, client-data immutability and cross-profile fail-closed behavior.
- **Still to do:** a server-side structured clinical claim/citation verifier, reliable medical document coverage analysis, professional clinical review of any risk rules, and a supervised UX for uncertainty and adverse medication interactions. AI-generated prose may still contain interpretation errors; the local panel shows which excerpts were supplied, **not that every generated claim is proven**.
- Existing v364 retrieval can only read a bounded subset of PDF pages and question-ranked documents. Missing evidence must not be presented as proof that a disease or finding is absent.


### I-04b (v393) · Adaptive Deep Research & original medical PDF retrieval — FIRST PASS
**Trigger:** User feedback on a multiweek, historical medical history question. A three-summary/no-original answer was medically generic despite many records in the personal vault.

- A *generic* Hungarian query-aware research planner distinguishes quick questions from medical history, physiological explanation and complex timeline/reconstruction questions. No condition- or patient-specific fixed answer.
- For deep clinical questions, ranks up to 12 potentially related personal documents by keywords, medical synonyms, document date/year, category and prior explanation. More diverse records (including ambulance, intensive care, admissions and discharge) can be considered, rather than reading only 3 top summaries.
- Within an existing explicit original-PDF consent, searches up to 6 candidate PDF files and 24 pages each, retaining up to 6 high-ranked page-numbered PDF excerpts, plus short historic JSON explanations (8 evidence items in total).
- Reads patient-owned, original IndexedDB PDF bytes with same-profile metadata and optional already-authorized Google Drive archived files. Dropbox *structured JSON vault* must not be mistaken for a universally accessible PDF storage service.
- A scanned image PDF without a searchable text layer remains an unavailable original-text source. No OCR or false page citation is added.
- Emits provenance status: related files ranked, PDF files attempted, pages scanned, original-page extracts present, and why original records might be missing. If none, the AI prompt explicitly says personal clinical detail cannot be confirmed.
- Enriches the existing **user-initiated** server-side AI request with a concise reasoning guideline (clinical facts vs generic physiology vs possible causes vs unknowns). Seeks a detailed answer when the question merits it, rather than equating brevity with quality.
- Does **not** assert any ambulance arrival time, total arrest/no-flow interval, sedation rationale, neurological prognosis, or recovered memory without original primary documentation.
- Original question remains unchanged in UI and Ask Léna history. All earlier v388–v392 safety, provenance and sharing behaviors must be preserved.
- **Current limitation:** client-side request steering cannot force the remote model's output length, grant access to missing PDFs, verify every generated sentence, OCR scanned documents or guarantee a complete event chart. A future server-managed multipass evidence gathering and claim-validation workflow is still needed.

**Acceptance criteria:** synthetic test proves beyond-12th-page original extraction, multiple distinct same-year records, explicit PDF consent, wrong-profile prevention, missing-original warnings and no mutation of originals. Real patient validation should include timestamp-by-timestamp evidence, named document references and honest missing segments.

### I-05 · Continual monitoring and operational reliability
- Admin Center visibility into latest source date, stale inputs, sync lag, unsuccessful analyses and model availability.
- Separate app OTA deployment from record synchronization; don't disrupt current Connect.
- Explicit device-by-device test gates before rolling out to both phones.

## Done criteria for the first phase
- Ask Léna works for each correct authorized profile and refuses mismatched context.
- Timestamp provenance is visible and passed with data to the AI in an explicitly consented request.
- Old Activity export is never labelled live without warning.
- The verified measurements stay unchanged at source.
- CI Node regression and GitHub Level 3 Guard green; webpage loads normally on both phones.
- No APK installation required.
