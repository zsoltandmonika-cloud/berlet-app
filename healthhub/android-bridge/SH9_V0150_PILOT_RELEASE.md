# HH One + SH9 v0.15.0 (build 27) · staged S24 Ultra pilot

**Current implementation state:** release candidate only until manually signed and published.
The installed signed baseline is HH One **0.14.6 / build 26** at
`healthhub-connect-ota-v0.14.6`; its public manifest remains UNCHANGED during
development. The unified app uses the SAME Android applicationId and signing key.

## Pilot objective

One installed signed HH One Android app runs Health Connect + Dropbox sync,
SH9 Golden Standard fullscreen web launcher, explicit GPS foreground service,
and existing periodic **signed OTA update checks**.

The *web application* updates on GitHub Pages without an APK rebuild; native
permissions, services, package code and signing only change via APK update.

## Features to validate on Zsolt's S24 Ultra

1. Existing HH One app (signed 0.14.6) shows the expected current version,
   selected device owner profile, and fresh Health Connect / Dropbox sync.
2. Record pre-upgrade data and ensure Dropbox sync completed successfully.
3. Open HH One settings, enable update notifications if desired; check the OTA
   candidate when the signed pilot manifest is published.
4. Confirm the Android install prompt shows the SAME signed package; update
   **in place**, NOT by uninstalling the signed 0.14.6 app.
5. Open **SH9 Start Page**. Confirm Buddy Hero, 9 Premium Glass modules, 5 dock
   buttons, 3 pink live info cells, HealthHub link, Family Guard, Smart Travel
   and Ask Léna. For preferred startup, enable **SH9 legyen a kezdőoldal**.
6. The SH9 Outlook Agenda tile routes to the **phone's browser** SH9 Agenda
   (same browser used for Microsoft authorization). No OAuth token is copied
   into HH One WebView; sign in once in that browser if needed.
7. GPS starts **OFF**. In HH One settings select 30 sec, tap GPS bekapcsolása,
   grant **precise location**, confirm ongoing visible notification and
   current active status. Stop from notification and verify inactive.
8. Repeat with 15 sec and 60 sec. Test stopping in Android, a temporary GPS
   provider-off scenario, and revoking location permission. GPS must fail
   closed. Confirm there are no GPS coordinates saved or published.
9. Measure battery impact (e.g. a short outdoor test) and location quality
   in SH9 map separately. This service can NOT override a third-party app's
   background location restrictions.
10. Return to HH One and perform fresh Health Connect sync; verify owner
    profile and existing automation remain intact.
11. Do not widen rollout until the real S24 Ultra pilot is accepted.

## Manual signed release steps (ONLY after QA passes)

GitHub Actions:
`https://github.com/zsoltandmonika-cloud/berlet-app/actions/workflows/healthhub-connect-ota-release.yml`

Use **Run workflow → branch main → rollout: pilot → Run workflow**.

The existing workflow:
- Requires preconfigured GitHub encrypted signing credentials.
- Assembles the RELEASE app, checks the APK signature and download checksum.
- Compares the release APK certificate with the real signed v0.14.6 baseline.
- Checks versionCode 27 is greater than the baseline 26.
- Publishes immutable `healthhub-connect-ota-v0.15.0` only if all checks pass.
- Updates `healthhub/data/bridge-ota.json` with the SHA-256 and only
  `rolloutProfiles: ["zsolt"]` for this first pilot.
- Cannot silently install to Android: phone owner must explicitly approve.

**Important:** `workflow_dispatch` is required; source pushes do NOT publish
signed APKs automatically. If the GitHub Actions job fails or signing secrets
are missing, do not sideload an unrelated debug-signed APK or reinstall HH One.

## Rollout to Mónika

After the pilot passes, explicitly approve widening the **already verified**
release manifest to include both `zsolt` and `monika`, without changing the
same immutable APK/sha256/signing identity. Do not try `rollout=all` on the
same version through the existing release workflow after the pilot, because
its monotonic-version gate rejects reissuing v0.15.0. A separate reviewed,
manual manifest rollout adjustment is required.

## Open limitations

- Native Outlook MSAL login is not implemented. The launchpad offers a
  browser-owned Outlook Agenda fallback; the account may need separate
  browser sign-in.
- GPS interval specifies requested updates, not a guaranteed satellite lock
  or OS scheduling frequency.
- Actual on-device foreground GPS behavior, battery and update-in-place
  behavior cannot be verified solely through GitHub CI.


## 2026-10-24 · Mónika bővített OTA jogosultság (GPS)

- A **korábban már kiadott, aláírt** `healthhub-connect-ota-v0.15.0` APK (build 27) Zsolt mellett **Mónika** profil számára is engedélyezve lett a változatlan, SHA-256 ellenőrzött leíróban.
- Ez **nem új kiadás** és nem natív GPS kapcsoló: `healthhub/data/bridge-ota.json` `rolloutProfiles = ["zsolt", "monika"]`. Az aláírás, a letöltési URL és az APK-kód változatlan.
- Mónika telefonján a **natív HH One / HealthHub Connect alkalmazás** `Tulajdonosprofil: Mónika` beállításával nyomd meg a **„🔎 Új Connect-verzió ellenőrzése”** gombot. Ha a v0.14.6 van telepítve, a v0.15.0 felajánlható; **a tényleges telepítéshez Android-jóváhagyás kell**.
- Frissítés után: natív **HH One beállítások → 📍 SH9 · GPS kapcsolat fenntartása**. Válassz **15 / 30 / 60 másodperc** közül (kezdetben 30 mp), mentés, majd **📍 GPS bekapcsolása** és precíz helyhozzáférés jóváhagyása. A GPS aktív állapot Android-értesítést ad, és abból leállítható.
- **Korlát:** a GPS foreground service nem képes garantálni a más alkalmazások saját GPS-/háttérhelyhozzáférését, illetve a folyamatos műholdas pozíciót. Folyamatos futása plusz akkumulátorhasználattal jár. Nincs GPS-koordináta mentés vagy központi feltöltés.
- **Fontos eszközazonosító:** a natív OTA-ellenőrzés a *telefonon beállított tulajdonosprofilból* dolgozik, nem attól, hogy melyik készülék van jelenleg kijelölve a Dropbox Eszközregiszterben. A központi **OTA CHECK** parancs ugyanakkor a pontos kijelölt Android-ID-t célozza, ezért a régi regisztrációt és az új készüléket ne keverjük össze. Ne archiválj régi eszközt az új telepítés ellenőrzése előtt.
- Ha az APK telepítője aláírásütközésről ír, **ne távolítsd el az alkalmazást**, mert az helyi adat- vagy beállításvesztést okozhat. Ellenőrizd a telefonon telepített app eredetét és aláírását.

