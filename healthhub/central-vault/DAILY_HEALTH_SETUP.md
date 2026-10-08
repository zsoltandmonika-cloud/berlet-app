# HealthHub Personal Daily Health — Activation checklist (v319)

## Scope

**Phase 1:** safe opt-in, per-profile synchronization of the Daily Health factor checkboxes, notes, custom items and AI consent flag.

**Not live yet:** automated private personal AI briefs; scheduled private generation; protected display of those briefs. The existing `daily-health-ai-public.json` and its GitHub Actions job remain entirely **public-only**. Never put diagnoses, tokens or personal summaries in the public GitHub repository.

**No clinical data uploads at deploy:** `central-vault/config.js` ships with `enabled: false`; no Supabase network request or data upload occurs until the operator configures Supabase AND signs in AND presses an explicit "Első feltöltés" button for each profile.

## Initial setup (EU region)

1. Create a Supabase project in an EU region. Save the database password privately; NEVER put it in the repository.
2. In the SQL Editor run `healthhub/central-vault/schema.sql` (existing Health Vault foundation).
3. In the SQL Editor run `healthhub/central-vault/daily-health-private-schema.sql`.
4. Under Authentication > Providers enable Email authentication, and configure appropriate confirmation/SMTP settings. Create a verified household Auth user (for example with Dashboard user invite and password setup). DO NOT send email/password or session tokens to ChatGPT.
5. Open Authentication > Users, copy the Auth user's UUID. In the existing `schema.sql`, the final **commented** bootstrap statements create household membership and both profiles. Replace the placeholder UUID in those statements in your PRIVATE SQL Editor and execute there. **Never commit the modified bootstrap containing UUID/user details.**
6. Check that the household `zsolt-monika` exists, the new Auth user is a member, and profiles `monika` and `zsolt` both exist.
7. **Do not enable sync without testing RLS.** Anonymous role must not read settings; an authenticated user outside the household must see no rows; a household member must be able to read only its household. Verify that stale version writes yield `conflict: true` without overwriting.
8. In `healthhub/central-vault/config.js` place the project's **Project URL** and **publishable key / legacy anon key only** and change `enabled: true`. The project URL and publishable key are browser-safe once RLS is audited. NEVER paste service-role, secret, passwords, refresh tokens or medical data here.
9. Redeploy GitHub Pages. On a trusted device, open Daily Health > ⚙️ Beállítások, sign in with the configured household's email/password. The password is submitted over HTTPS directly to Supabase Auth; the app does not save passwords.
10. For Mónika and Zsolt **separately**, press `⬆️ Első feltöltés`. This is a deliberate authorization to place selected factor settings in the private Supabase database. If data already exist, resolve explicit per-profile **local vs. cloud** conflict.
11. Test real bidirectional sync on a second device using the same household Auth user, and then verify a stale copy cannot silently overwrite remote values. Verify sign-out and logged-out behavior, and backup/restore before production use.

## Current storage and security properties

- Local storage: `localStorage['hh-daily-health-factors-317']`, which remains untouched during deployment.
- Client session: browser `sessionStorage['hh-supabase-health-session-v1']`; no password is saved. Session tokens are not encrypted in the browser and are vulnerable to same-origin script compromise. Use trusted personal devices only and audit the entire HealthHub frontend before storing sensitive data.
- Transport: HTTPS directly to Supabase Auth + PostgREST with short-lived bearer auth.
- SQL: RLS allows authenticated **household members** to read the two profiles; anonymous role has zero grants. Writes occur through an authenticated, size-limited, optimistic-version RPC. The server protects against unintentional last-writer-wins overwrites.
- Consent: existing `aiOptIn` remains **manual Ask Léna only**. It does NOT trigger upload to OpenAI, and it is NOT permission for an automated personal briefing.
- On connection or sync failure, keep local edits, show error, and do not claim remote success.
- The existing legacy allergy/headache preference fields live in a separate localStorage key and are not migrated by this module. Only the v317 list is synchronized.
- Supabase is not necessarily appropriate for regulated clinical data without a separate compliance and security review; regional DB residence does not automatically control the location of all third-party API processing.

## Next phase: private morning AI

Create a **separate**, authenticated Edge Function (server-side secrets only) and a **private RLS-protected** per-profile briefing table. Each day:
- Read today's validated public weather, pollen, air quality and NNGYK snapshots.
- Read only the household's explicitly consented factor list and minimal necessary notes; preserve verified vs. self-reported distinctions.
- Call OpenAI on the server with `store: false` and validate structured output.
- Write **private** Mónika and Zsolt briefs separately into the protected database, never `healthhub/data/` or Actions logs.
- Trigger via Supabase scheduled Edge Functions, and let the authenticated HealthHub UI retrieve personal briefs. Use stale-data checks, retries, failure states and a clear consent control for **automated** health processing.

Until this phase is deployed, do not label the morning AI public narrative as personalized.

Official background: https://supabase.com/docs/guides/database/postgres/row-level-security
and https://supabase.com/docs/guides/functions/schedule-functions
