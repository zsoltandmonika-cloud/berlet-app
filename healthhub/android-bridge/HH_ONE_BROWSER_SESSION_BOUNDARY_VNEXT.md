# HH One / SH9 · Browser Session Boundary (secure pilot design)

2026-10-25. **Status: draft, source-only. Not merged, signed, installed or OTA deployed.**

## Reproduced root cause (repository inventory)

| Component | Credential/session source | Important behavior |
| --- | --- | --- |
| HH One native | Android `SharedPreferences` and `DropboxVaultClient` | Health Connect / GPS / native Dropbox data and explicit Family Guard consent. |
| HH One embedded `Sh9WebActivity` | Android System WebView cookie and site storage | New WebView does **not** inherit Chrome/Edge OAuth browser state or browser localStorage. |
| HealthHub Vault, Nutrition, Family Guard web | Web origin `localStorage['hh-dropbox-token-v2']` in the **particular** browser profile | A logged-in Edge/Chrome session can appear disconnected inside WebView. |
| SH9 Microsoft Agenda | Browser-owned Microsoft SPA OAuth state | Existing external-browser navigation is retained unchanged. |
| SH9 Google Drive | Browser-issued Google OAuth access token | User-granted browser scope; cannot be copied into WebView/native automatically. |

Never move native OAuth refresh grants to JS query strings, JavascriptInterface, shared clipboard, injected cookies, or a public repo. An in-app WebView is not a credential bridge.

## Narrow, opt-in solution in this PR

1. Maintain the existing Premium Glass SH9 launchpad inside the lightweight fullscreen WebView, without visually changing the launchpad.
2. Intercept ONLY top-level HTTPS navigation **from a trusted non-HealthHub page into** `https://zsoltandmonika-cloud.github.io/berlet-app/healthhub[/...]`, which includes the HealthHub and Family Guard launch tiles and Admin routes.
3. Show a clear, cancellable choice:
    - **Existing browser connection** (recommended): launch browser-owned **Android Custom Tab** from the device's default supporting browser. Existing browser cookies/site storage MAY be reused **only if that provider/profile already has the corresponding login**. AndroidX browser `1.8.0`. Browser controls remain visible for trustworthy origin identity. If no Custom Tabs handler, fall back to normal default browser.
    - **Separate HH One view**: deliberately load the selected module into WebView, which may ask for independent authentication. Do **not** represent this as the Chrome/Edge session.
    - **Cancel**: stay on SH9; no login or device state changes.
4. While inside already-chosen embedded HealthHub, internal links behave normally: no repeat dialogs or redirect loops. One dialog at a time, dismiss on Activity destruction.
5. Retain Calendar's browser-owned sign-in and external auth flows. Block unknown schemes, untrusted hosts, HTTP downgrade and file URLs as before. No profile switching, token copying, cookie clearing, implicit Android grants or web user-data migration.
6. Add source regression checks + native compile to the established PR CI. **No modification to production `bridge-ota.json`, Android applicationId, versionCode or existing local credentials.**

### Limits / QA

- Custom Tabs are not a signed app's own isolated WebView; the provider may display browser UI and the cookie jar is the **chosen provider**, not necessarily a different browser the family previously used.
- Custom Tab is not a guarantee of seamless Microsoft/Google OAuth or background web GPS, nor a full end-to-end auth bridge. Separate native and web grants remain separate.
- Some Android 15/One UI default-browser configurations, deep links and unsupported Custom Tab providers may behave differently; **physical S24 test still required**.
- Existing native Dropbox credential preservation and refresh safety patch tracked in draft PR #503; GPS FLP watchdog tracked in #502; broad PR #491 remains rejected due to the earlier 0.15.4 WebView session regression.

### On-device acceptance sequence (Zsolt's S24 Ultra first)

1. Record installed HH One build, signing cert, preferred default browser and its *already authenticated* HealthHub/Dropbox + Outlook status. Do not disconnect, uninstall or clear any app data.
2. From SH9 tap **HealthHub** then **Family Guard**. Choose existing browser; verify that same browser's logged-in state is visible without having to redo Dropbox authorizations.
3. Close the Custom Tab and verify one-tap return to SH9, no duplicate native settings activity, no new unrelated browser tab.
4. Repeat with **Külön HH One nézet**; it must explicitly show that its own WebView login is separate, and must NOT silently adopt any browser session or native grant. Cancel selection does nothing.
5. Check Android site geolocation prompts remain consented, personal profile isolation, Nutrition browser data, Outlook Agenda, food-scan permissions, GPS STOP and cloud timestamp.
6. Repeat with Edge default vs Chrome default on the same authorized device; verify that the provider/profile matters and no unexpected account is selected.
7. Test offline/online, screen locked native GPS continued if separately approved, Dropbox continuity without forced reconnection, and the delayed auth return.
8. Evidence: anonymized UI PASS/FAIL, *not* login codes, access/refresh tokens, GPS coordinates or private health records. If any stage fails, keep PRs draft, release gate stays BLOCKED.

**Shipping gate:** PR #491 session behavior + #503 Dropbox + #502 GPS must be reconciled and accepted on the S24 before any new signed release/OTA to Mónika.
