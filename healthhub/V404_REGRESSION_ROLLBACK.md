# HealthHub v405 · v404 clinical story emergency rollback (2026-10-12)

## Why
After v404, the same Mónika 2024-06-17-to-discharge Golden Standard question produced **only**:
> A rendelkezésre álló kivonatokból ehhez a konkrét kérdéshez most nem sikerült ellenőrzött személyes eseményleírást összeállítani.

This is a severe user-visible regression: v403 had already produced a materially more detailed narrative from prior JSON summaries when no original PDF page was available. A passing synthetic unit test was not sufficient evidence of end-to-end story quality.

## Actions taken
- Restored `healthhub/index.html` and `healthhub/live-v331.js` byte-for-byte from known-good v403 commit `37cad7bf5c3d14505dc3bc56d0a32804786f981b`.
- Restored `supabase/functions/smooth-endpoint-v395/index.ts` from the same v403 commit, keeping it in sync with the explicitly redeployed Supabase Edge Function; `audit.mjs` was already unchanged between v403 and v404.
- Supabase Edge Function `smooth-endpoint-v395` was redeployed using v403 `index.ts` and `audit.mjs`, `verify_jwt=false` retained because the function's existing auth/profile/consent checks remain inside its code.
- The experimental `focus.mjs` and its test source remain in GitHub for offline diagnosis only, **not** imported or used by the restored production clinical server.
- No patient records or document files changed.

## Regression investigation (still open)
At present, the exact reason the v404 draft yielded no retained clinical paragraphs is **not demonstrated**. The problem could be model draft composition, the new focus filter, the appended/direct question changes, or interaction with the existing source auditor. It is **not established** that the patient's underlying record disappeared.

Before another production change:
1. Use a sanitized, synthetic but realistic data fixture with at least five distinct original/secondary timeline stages, including long and mixed-heading memory paragraphs.
2. Test server draft -> strict source audit -> focus editing -> final rendering **together**, not just the helper functions in isolation.
3. Prove the focused answer still retains requested start, treatment, and discharge stages and yields a nonempty story.
4. Prefer a feature flag and automated rollback criteria; no change should replace the only user-visible story with the generic no-evidence fallback merely because of stylistic editing.
5. Re-run the user-approved Golden Standard question on the same device, profile, consent and document inventory; accept only if measurably better than v403.

## Acceptance of this rollback
GitHub main must once again serve the v403 HTML/Ask Léna scripts; Supabase must report a newly active version with exactly the v403 index and audit source. A real end-to-end browser test requires the user's own authenticated HealthHub session.
