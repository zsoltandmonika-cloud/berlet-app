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

### I-02 · Unified measurement evidence ledger
- Canonical read-only schema per observation: profile, source application, origin (Health Connect/Samsung/manual),
  measuredAt, exportedAt, receivedAt, quality, unit, original value, derived status and deduplication key.
- Merge by source time and authority; preserve both records where measurements legitimately differ.
- Eliminate stale Samsung summary overwriting new Health Connect (already mitigated for today's Activity in v387).
- Test on real anonymized scenarios for each profile and missing/duplicated observations.

### I-03 · Time-series intelligence
- Daily and weekly trends for steps, measured pulse, sleep duration and actual readings.
- Quantify completeness before making comparisons; partial days, missing days, sleep interruptions and
  inferred calorie values require explicit caveats.
- For Mónika's cardiac context: stricter limits on inference and follow-up suggestions.
- Clinical-risk escalation stays separate from wellness trends.

### I-04 · Evidence-backed Ask Léna answers
- Retrieve relevant records with date provenance and page references where permitted.
- Structure answers with measured facts, context, possible interpretations, uncertainties and a sensible next step.
- No automatic reading of arbitrary patient documents and no assertion of unverified links.
- Benchmark against synthetic, anonymized questions and real sources only with explicit permission.

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
