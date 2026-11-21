# HealthHub · Dropbox split-brain incident and safe cutover (2026-11-10)

Status: **OPEN / READ-ONLY AUDIT + UI SAFETY FIX; NO DATA MIGRATION OR ACCOUNT DELETION PERFORMED**

## Incident

Two different authorized Dropbox account contexts may each contain an App Folder
with the identical logical path `/HealthHub`. Equal paths are **not** equal account
identities. Native HH ONE, the web HealthHub Dropbox Vault, and the ChatGPT Dropbox
connector use independent OAuth grants. A working Supabase device pair does not
prove its Dropbox writes reach the same account as a browser Family Guard reader.

No real account e-mail addresses, account-ID suffixes, device IDs, coordinates,
medical records, or OAuth tokens are stored in this public repository.

## Evidence at incident opening

- Dropbox context A, accessible through the ChatGPT connector: profile vault and
  health snapshots from both profiles; fresh native Mónika Family Guard
  `/HealthHub/guardian/native-live/monika.json`; no native Zsolt
  `zsolt.json`; legacy device registry has no Zsolt selection.
- Dropbox context B, observed in the operator's signed-in browser: more profile
  files; an HH ONE Digital Wellbeing upload for Zsolt was confirmed by its
  Dropbox modified timestamp. Mónika profile files are also present, but their
  presence **alone does not prove** that her phone currently writes to B.
- Both Android devices have central Supabase owner-verified identities. This
  verifies pairing, **not** Dropbox destination or GPS publication.

**Never infer the target account from the folder path, file names, display name,
or a central pairing.** Compare actual OAuth Dropbox account IDs.

## Actual writing and reading surfaces

| Component | OAuth binding | Destination |
| --- | --- | --- |
| Native HH ONE Health Connect, manual + scheduled | Physical phone's `healthhub_connect` Android preferences / native refresh token | `/HealthHub/profiles/<owner>-health-connect.json` |
| Native Digital Wellbeing | Same physical phone native credential, owner locked | `/HealthHub/profiles/<owner>-digital-wellbeing.json` |
| Native Family Guard GPS | Same physical phone native credential, requires owner consent + GPS + identity verification | `/HealthHub/guardian/native-live/<owner>.json` |
| Native orchestration heartbeat | Same physical phone native credential | `/HealthHub/orchestrator/devices/<device-id>.json` |
| HealthHub web Vault | Browser-specific OAuth token `hh-dropbox-token-v2` | `/HealthHub/profiles/<profile>-vault.json` and other permitted web sinks |
| Family Guard web reader | HealthHub web Vault token; fallback to same browser token | Reads `/HealthHub/guardian/native-live/<profile>.json` |
| ChatGPT Dropbox app | Separate ChatGPT connector authorization | Read/write only account and scope granted in ChatGPT |
| Supabase family pairing | Independent Supabase authorization | Not a Dropbox write path |

## Safety invariants

1. Never delete, archive, overwrite, or replace a source account solely because
   another appears more complete.
2. Inspect the **actual account identity** for each source: Android native
   `Natív Dropbox fiókazonosító vége`; browser `Webes Dropbox-fiók`;
   ChatGPT connector account identity. An unknown old token means **UNKNOWN**,
   not MATCHED.
3. A canonical target must be explicitly chosen by owners, verified as writable
   by both phones and readable by both web Family Guard profiles.
4. Make independent, time-stamped, restorable backups of both account trees;
   verify by re-reading content and metadata (counts and hashes), without
   copying health data to public GitHub or third-party logs.
5. Inventory paths and revisions; categorize exclusive, same-hash, conflicting,
   and missing on each side. A `profiles/<owner>-*.json` file must keep its
   original owner label. No last-write-wins merge of health or GPS snapshots.
6. Stage **missing-only** files to the canonical account under a clearly
   named quarantine/migration prefix; do not overwrite canonical files.
   Resolve conflicts per data schema with separately verified readback.
7. With both phones backed up, use HH ONE `Dropbox-fiók ellenőrzése / váltása`,
   entering the actual canonical account ID's last eight characters. The native
   callback rejects an account mismatch while preserving the existing token.
   **Beware:** a successful native authorization can trigger health export.
8. Verify a fresh, owner-matched Android heartbeat and live native GPS sample
   from **both** phones in that same canonical account; verify the web family
   reader uses that account and shows current location, battery consent and
   freshness. A stale cache is not proof.
9. Only after an observation window and owner approval, stop writes to the old
   account, revoke unwanted OAuth grants, and review the old account for deletion.
   Do **not** delete the Dropbox account automatically from code.

## Cutover sequence / reversible runbook

- **Phase 0 (now):** no deletes, no remote token overwrite; stop speculative
  manual Vault uploads/merges. Preserve healthy GPS sharing until cutover.
- **Phase 1:** collect read-only account ID suffixes from **both** native
  phones, web HealthHub, and ChatGPT connector. Record timestamped inventory
  from both account contexts; establish which source last wrote every file.
- **Phase 2:** back up both vaults separately and verify restore; agree on the
  canonical account (prefer completeness **after**, not before, verification).
- **Phase 3:** repair native phone credential(s) using built-in account-match
  flow with explicit owner approval and matching suffix. Then repoint web OAuth;
  reconnect ChatGPT's independent Dropbox authorization if desired.
- **Phase 4:** confirm latest native `zsolt.json` and `monika.json`,
  corresponding Android device reports, Health Connect + Digital Wellbeing
  readbacks and Family Guard frontend behavior in one account. Preserve
  fresh-sample, owner consent and RLS constraints.
- **Phase 5:** only when source hashes, missing-only migration, restore tests
  and all functionality pass, revoke the obsolete account's app authorization.
  Account deletion is separate and requires explicit approval.

## Rollback and no-go

If either native GPS disappears, owner proof fails, account ID differs, health
readback is missing, or a backup cannot be restored: **STOP**. Do not proceed
to account removal. Use the saved OAuth state only through a new owner-approved
login and restore from the separately stored account backup; never publish
private tokens or coordinates as part of diagnostics.

## Code follow-ups

- UI guard in `device-registry-v401.js`: expose browser Dropbox account suffix
  outside collapsed legacy diagnostics; remind users not to merge until verified.
- Future fix: central owner-scoped Dropbox account fingerprint agreement and
  cross-module write gating after full migration and privacy review. The
  immediate UI patch is **diagnostic**, not a silent reauthorization.
