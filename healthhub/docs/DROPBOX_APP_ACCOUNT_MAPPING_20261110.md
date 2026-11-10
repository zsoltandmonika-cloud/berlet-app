# HealthHub / SHO Dropbox routing audit (2026-11-10)

**State:** BLOCKED FOR CUTOVER. Backup copies and draft migration code exist, but the live phones have not been migrated and the private JSON has not been rewritten.

## Account versus application

- **Canonical owner intended:** the separate Outlook.com Dropbox account already connected by the user.
- **Active HealthHub web and native HH Connect OAuth client in deployed repository code:** t68rmhh5f1l8d85 (Dropbox App Folder; API-relative /HealthHub).
- **Separate ChatGPT Analytics full-Dropbox OAuth client:** dv5a4o8h09wwgtn. This uses a separate grant and browser store. Never reuse its access token as native HH credentials.
- **Additional Developer Console app shown by user:** o2oe9qclhtoic9s. Its actual permission type, App Folder name, and mapping to installed native/web clients are not established by the URL alone.
- **Outlook mounted app roots:** /Apps/HealthHub Cloud Vault and /Apps/healthhub-vault. These are different namespaces and contain different data.

## Required proof before any cutover

1. Verify in the Dropbox Developer Console the App key, App Folder name and permission type (App folder or Full Dropbox) for o2oe9qclhtoic9s. Never share App secret or refresh tokens.
2. Identify active native OAuth account suffix for both phones and web HH_DROPBOX_VAULT.accountHint(). The ChatGPT Dropbox connector is not the HH Connect OAuth.
3. Confirm the exact namespace and folder ID of the intended canonical Outlook App Folder, then compare record IDs and preserve conflict variants.
4. Reconcile the two large -vault.json files and original clinical assets as well as Health Connect, Nutrition, Digital Wellbeing, Guardian and missing-only sources. Do not blindly prefer the largest or newest file.
5. Keep the 2026-11-10 Dropbox backup copies. Stop old writers while migrating; use revision checks and read-after-write verification.
6. Only then reauthorize native and web HH OAuth to the verified Outlook account and intended app client, preserving Supabase family device registration.
7. Verify two consecutive writes per profile to the canonical target and absence of new writes to Gmail before disconnecting the legacy link.

## Current implementation

Draft PR #843 adds a preview and merge tool for selected JSON sources. This is not production-ready while the separate app key is unresolved and clinical Vault / binary files are not covered.

This is a public technical note. No clinical values, credentials, account emails, or OAuth secrets are included.

## Verified inventory follow-up (read only)

- Outlook `/Apps/healthhub-vault` has four root JSONs only: `incoming-zsolt.json`, `incoming-monika.json`, `monika-data.json` and `zsolt-data.json`. All four last modified on **2026-10-02 or 2026-10-03**. Do not select this legacy-looking app folder as the sole target on folder name alone; preserve source originals.
- Outlook `/Apps/HealthHub Cloud Vault/HealthHub` contains current `profiles`, `master`, `orchestrator`, `guardian`, `nutrition`, `sync`, `documents`, `daily` and other operational subtrees, with active recent file writes. This is the **candidate runtime canonical folder**, NOT the old `/Apps/healthhub-vault` root.
- Runtime Android code defines Dropbox App key `t68rmhh5f1l8d85` and API-relative root `/HealthHub`. The user's Developer Console screenshot shows the **`healthhub-vault`** app has `account_info.read`, `files.metadata.read`, `files.content.read` and `files.content.write` enabled, but `files.metadata.write` is not enabled. The screenshot does **not** show permission type or App key; do not equate Developer Console URL slug to OAuth App key without inspection.
- Therefore **do not change the native App key to the separate `healthhub-vault` app** as a quick fix. The source app's account switch and a full copy between accounts are distinct operations. A wrong App key would write into another isolated app-folder namespace.

Next required proof: Dropbox Developer Console Settings (without secrets) for both the deployed runtime App key and `healthhub-vault`, verify app permission type and app-folder mapping before any live migration.
