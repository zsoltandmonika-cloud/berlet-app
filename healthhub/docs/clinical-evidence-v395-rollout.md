# HealthHub v395 · Clinical Evidence Verification (pilot)
Date: 2026-10-11

## Reason
The Mónika case showed a non-evidenced assertion of "at least 20 minutes" of poor brain perfusion. This was not supported by the visible clinical sources. A successful text generation does not mean the model proved a historical clinical interval.

The existing `smooth-endpoint` remains unchanged. The new opt-in, authenticated, server-side `smooth-endpoint-v395` is selected only by the existing Ask Léna frontend for **detailed clinical research** with user consent, correct profile authorization, and **no attached photo**. Other requests keep the previous stable path.

## Two-phase request, deterministic final audit
1. Extract potential medical facts with exact quotations from explicitly authorized, previously extracted page-level original PDF snippets. The first model pass returns strict JSON. The deterministic verifier accepts a fact only if its quote is a literal substring of the supplied excerpt, the source ID really exists, and every numeric claim, including duration units, is present in the quote.
2. A separate, higher-budget model pass produces structured sections consisting of documented, general physiology, possible interpretation or unknown paragraphs. Documentary claims must cite only accepted original-source IDs. Prior AI JSON explanations are explicitly secondary sources and cannot establish facts.
3. A deterministic paragraph-level check **demotes** claims with missing/unknown references, unsupported explicit durations, and unsupported clinical dates to an explicit "not confirmed" notice **before** displaying the answer.
4. The Edge function reports counts of checked paragraphs, verified excerpts and demoted claims in the existing SSE `done` event, disclosed in the Ask Léna footer.

## Security and operational boundaries
- The new Edge function performs JWT `getUser`, `hh_profile_access` authorization, hourly request limiting, consent check and PDF permission check **before** invoking either AI pass.
- `verify_jwt=false` is intentional **only because** the Edge function validates the user's JWT and profile permissions explicitly using Supabase Auth plus RLS context; matching the existing authenticated `smooth-endpoint` route. Without this custom check, a request MUST be rejected.
- No additional Dropbox or Google Drive access by server; no external document collection, and no conversation logging. Raw excerpts go only to the existing OpenAI AI service in a **user-initiated** request when original-PDF consent is true.
- No persistence of PDF text, verified facts, or drafted answers in the Edge function; OpenAI API requests use `store:false`.
- If either pass fails, the server sends a typed SSE error and never silently substitutes an unverified quick response.
- The client's profile-switch abort handling still applies. If the new endpoint is disabled, roll back the frontend URL switch without modifying the existing quick-response backend.

## Honest limitations
- A quote matching client-supplied extracted text is **not** independent verification of the original PDF's authenticity, correctness, or medical interpretation.
- Numeric unit-matching and citation checks can reject particular fabricated duration/record claims; they cannot prove the medical truth of every retained sentence, nor validate a clinical mechanism or medication list.
- The module only sees the limited original PDF excerpts provided by the existing v393 client, not every page in a patient's medical history. Scanned PDF images without a text layer may still be inaccessible.
- Different clinicians may interpret the course of neurological recovery differently. The tool is not a treating clinician or medical device.
- If a model answers incorrectly even with a supported excerpt, clinician review and fuller original records remain necessary.

## Rollout checklist
- [x] Static structure and safety tests with synthetic data
- [ ] Node and Deno checks in GitHub CI green
- [ ] Deploy **new** `smooth-endpoint-v395` without touching `smooth-endpoint`
- [ ] Verify new function version is active and no authentication bypass
- [ ] Merge web frontend route switch; run GitHub Pages deployment
- [ ] Real consented user test on Mónika's 2024 case, then Zsolt, inspect disclosed source IDs and inferred timelines
- [ ] Reevaluate any unsourced episode minute counts against original OMSZ and ICU source times, not estimated CPR duration

## Reproduction prompts
- Synthetic original excerpt contains EF 20–25% but **no 20-minute arrest interval**: the sentence "at least 20 minutes of poor perfusion" must be downgraded.
- A real, explicitly dated source citing a 3-minute interval, if literally documented, may retain its reference and interval, but the reference alone is not a medical validation of the interpretation.
