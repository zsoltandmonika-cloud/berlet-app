# HealthHub Medical Knowledge Search — MKB QA v703 (2026-10-19)

## Outcome and status
- HealthHub-Core database: original medical PDFs remain unmodified. 207 text-integrity-verified PDF documents, 337 verified pages, of which 336 contain nonempty text.
- SQL search foundation: `hh_mkb_search_documents` view, `hh_mkb_search_verified_internal` (service-role only; **not used by the preview**).
- Source consent verification: `hh_mkb_verify_selected_pages_internal`, service-role only; checks exact patient profile, original source UUID, original page number and approved quote against a verified canonical page. Returns **metadata only**, not extra document text.
- Separate Supabase Edge Function `hh-mkb-search-preview` v3, using existing v395 clinical verifier and secure authenticated request flow. The normal `smooth-endpoint-v395` remains untouched.
- GitHub client v703 routing is opt-in via `?hhMkbQA=v1`. The active profile must have explicitly approved original PDF evidence in the request. Otherwise existing routing is preserved. No hidden whole-document expansion.

## Privacy and clinical constraints
1. JWT `getUser()`, `hh_profile_access`, consent and request rate limiting all run before any verification RPC call.
2. New search verification applies to **only** the source IDs, page numbers and short excerpts actually included in the already approved AI request. Never append unapproved pages or documents to `documentEvidence`.
3. A location term appearing in source text is an **említés** (mention), not a verified facility or treatment site, and not a diagnosis. Documents from other locations can mention the selected city.
4. The 11 known excluded Samsung Watch EKG PDFs remain excluded; never auto-reimport.
5. No tokens, personal medical content or imported PDF bytes belong in GitHub. Source code and test fixtures are synthetic.

## Deployment / QA
- Preview backend deployed independently in Supabase; GitHub Pages changes do not deploy it.
- Test only after GitHub PR tests are green and merged, by opening:
  `https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/?hhMkbQA=v1`
- In Ask Léna: select the correct authorized patient profile, enter a clinical location/history question (for example `Milyen orvosi események történtek Kazincbarcikán?`), open `Forrásolt orvosi tudás`, inspect ranked source quotations, explicitly approve the selected excerpts, then run detailed research. Check the on-screen `MKB QA v1` line, real streamed answer, cited PDF titles/page numbers and absence of invented event locations.
- Also test with no PDF approval, with profile switch, and with the query flag removed. Default route must remain unchanged.
- An accessible authenticated HTTP/SSE and mobile test **has not been completed** in the AI tool environment; code deployment and role-based SQL tests do not constitute `LIVE VERIFIED` or user acceptance.

## Verified SQL tests
- `hh_mkb_verify_selected_pages_internal`: valid authorized citation 1 match; cross-profile 0; forged source 0.
- `hh_mkb_search_verified_internal` as service_role: 8 matching pages on Mónika/Kazincbarcik prefix (raw text mention, not confirmed clinical event).

## Rollback
- Remove `hhMkbQA=v1` from the URL to immediately use unchanged production clinical routing.
- Revert v703 client routing commit / index cache-buster if UI regression. The preview Edge Function is a separate slug and can be disabled without modifying production v395.
- Never delete or reclassify original patient data as a rollback step.

## Remaining product work
- Authenticated preview HTTP/SSE end-to-end, S24 Ultra real-device acceptance, multi-location/doctor/facility interpretation with evidence grading, query ranking and performance, non-destructive completion of structured event/fact extraction.
