# Smart Trip V5 · Google Routes guarded backend

**Status: quota SQL deployed, Edge Function v2 deployed with JWT ON and compile-time Google requests OFF (verified 2026-11-07).**
No production Smart Trip UI, My Trips or Storage objects have been changed.
The $5 Google Billing budget is a notification, **not a hard cap**.

## Implemented
- Dedicated authenticated Edge Function (JWT, profile access, origin, JSON limits).
- Preflight quota reservation using a Postgres **transaction-level advisory lock**.
- One shared family-wide cap: **20 Google attempts/day and 200/month, UTC boundaries**.
- Atomic reservation **before** provider fetch. If quota DB or service role fails, no Google call.
- All attempts count even on provider error or timeout to prevent accidental overage.
- Endpoint request timeout 12 s; strict input size and response size.
- Approved key stays server-only; no AI forwarding, UI writes or caching.
- A compile-time OFF switch remains until launch approval.
- Authenticated `mode: secret_check` diagnostic tests only existence and basic copy-format of the server-side Google key; never calls Google, never spends quota, never exposes key value. This **does not verify Google authentication or exact byte equality**.
- Transit requests prefer FEWER_TRANSFERS and require offset-qualified RFC3339 departure times (e.g. 2026-11-27T15:00:00+01:00).
- Responses, when legally permitted and activated, are tagged text_only, Google Maps-attributed, and ai_processing disabled. No Google content to an LLM or any map.

## SQL migration applied and verified
`supabase/migrations/20261107170126_sho_smart_trip_google_quota_v1.sql` is recorded in Supabase migration history under the same timestamp.
- Isolated PostgreSQL 17 test: 25 parallel calls, exactly 20 allowed, 5 denied; monthly cap and grants passed.
- Production: quota table/function exist, RLS enabled, anon/authenticated RPC denied, service_role RPC allowed.
- 25-call production smoke test wrapped in transaction and rolled back; quota counter remains 0.
- Backup existence reported by user, but independent restoration proof and private Storage object backup remain outstanding.
- Security Advisors reports RLS-with-no-policy informational item for the quota table; deliberate because clients have no direct table access.

## Remaining activation gates
1. Review Routes API charges and EEA Google Maps Platform data-use conditions.
2. Confirm $5 budget alerts, API key restricted to Routes API, and Google Cloud
   quota reductions where possible. A shared key used elsewhere can bypass the
   in-app cap: only **this** server endpoint is covered.
3. Complete backup/restore readiness (including separate private Storage files) before broader rollout.
4. Edge Function v2 deployed with JWT ON and hardcoded OFF. Next: operator must save `HH_SMART_TRIP_GOOGLE_ROUTES_KEY` through Supabase Secrets (never chat or git); check source and auth without exposing keys.
5. Validate Google service-specific content terms, provider response, attribution and route accuracy.
6. Approve activation explicitly only after live security tests and measured costs.
7. Keep My Trips/AI integrations separate and legally reviewed.

Detailed checklists: `eea-usage-guard.md`, `google-key-onboarding.md`, and `production-rollout-gates.md`. Strict manual Google billing account / EEA terms review remains OPEN.

**Budget truth:** 20/day and 200/month limit the *number* of calls, not USD
spend. The cost may vary by SKU and cannot be guaranteed under $5 merely by
counting requests. Trial terms and Google-side billing apply independently.

Run: `node --test healthhub/tests/sho-smart-trip-v5-routes-backend.test.mjs`.

## Non-billing key diagnostic (requires signed-in user's JWT)

Supabase Dashboard > Edge Functions > `hh-smart-trip-routes-v1` > **Test**.

- Method: POST
- Content-Type: `application/json`
- Authorization: `Bearer <a legitimate signed-in Supabase Auth user JWT>`
  (a publishable/anon API key is **not** a user JWT).
- JSON body: `{"mode":"secret_check","profile":"z"}`
- No `Origin` header is needed in the Supabase Dashboard tester.
- `status: "missing"`: the runtime cannot read the secret.
- `status: "format_invalid"`: likely copy error, whitespace, quote or malformed key.
- `status: "format_ok"`: plausible secret present; **the Google key may still be wrong, revoked, or restricted**.
- `validity:"not_verified",google_request:false,quota_consumed:0` are expected.

Never send the user JWT or Google API key in chat. The Google-off hard gate
is not modified. Confirm actual Google validity only via one separately
approved, quota-counted Google Routes request after EEA review and secret setup.
