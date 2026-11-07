# Smart Trip V5 · Google Routes secret onboarding (manual operator step)

**Do NOT paste API keys into chat, GitHub issues, PRs, screenshots or CI logs.**
The Supabase connector used in this project cannot write Edge Function Secrets.

1. Google Cloud Console > APIs & Services > Credentials: ensure the selected
   API key belongs to **SHO-SmartTrip-AI** project, is restricted to **Routes API**
   only, and has no browser use. Application restriction None allows leaked keys
   to be used elsewhere: prefer additional Google-side restrictions if compatible
   with the actual server's egress arrangement.
2. Google Cloud Billing > Budgets: confirm existing $5 monthly alert. This is
   **not** a hard cap; the backend's 20/day, 200/month protects only requests
   via our one authenticated endpoint.
3. Supabase Dashboard > HealthHub-Core > Edge Functions > Secrets:
   https://supabase.com/dashboard/project/vhsrupphzcjkdrusonzh/settings/functions
   or find Edge Functions > Secrets in the left sidebar.
4. Add a new secret:
   - Key: `HH_SMART_TRIP_GOOGLE_ROUTES_KEY`
   - Value: paste the Google Cloud key **inside the Supabase dashboard only**.
   - Save. Never reveal the value to ChatGPT or public clients.
5. DO NOT create or enable `HH_SMART_TRIP_V5_APPROVED=true` yet. Even if set,
   deployed code currently enforces compile-time `false`.
6. After save, verify the name appears in Secrets; do **not** share the value.
7. Report back only: `Google Routes secret: kész`.

Other operational requirements: confirm database and private Storage object
backup status, Google EEA terms review, origin/profile auth smoke test, provider
attribution, deliberate activation and first real API request.

## Working endpoint
- Edge Function: `hh-smart-trip-routes-v1` deployed **OFF**, JWT verification ON.
- Existing auth checks include user token and per-profile `hh_profile_access`.
- No V5 UI call to the endpoint yet. Existing production Smart Trip untouched.

## Costs
At most 20 daily/200 monthly *reservation attempts* from this backend.
No guaranteed $5 cap; a stolen key or calls from outside the proxy bypass
the Supabase rate counter.
