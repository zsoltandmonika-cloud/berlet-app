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
