# HH One · OTA Auto Push V2 (Play-szerű terítés)
Dátum: 2026-11-18 · **DÖNTÉS / FEJLESZTÉSI SPECIFIKÁCIÓ · NEM ÉLESÍTVE**

## Felhasználói golden standard
- Az éppen folyamatban lévő 0.15.22/build49 Samsung APK helyi teszttelepítése után **nem akarunk újabb kézzel letöltött/átmásolt APK-t**.
- Zsolt és Mónika S24 Ultra: saját profil, saját rollout, külön telepített verzió megengedett.
- Zsolt fejlesztői canary először, Mónika csak előzetesen ellenőrzött buildet kapjon. Mónika kezében lévő telefont minimálisan foglaljuk le.
- A felhasználó vagy a jóváhagyott CI-releaser a központi adminból indítja a kiadást, a telefon saját jogosultságai szerint automatikusan fogadja a Play-frissítést. A ChatGPT kiadási művelete csak a csatlakoztatott jogosultságok és kifejezett release-jóváhagyás alapján indítható.
- Tilos felhasználói megerősítést megkerülő/ADB/accessibility/burkolt remote APK-install, jogosulatlan MDM vagy saját telepítőnek álcázott Play-update.
- Telefon adat, jogosultság, Dropbox/Health Connect/Samsung Health megmarad. Nulla valós mérés hiányzó mezőben ne váljon kitalált adattá.

## Megvalósítás: elsődleges Google Play Internal Testing (később closed track)
1. **Play Console tulajdonosi beállítás**: fejlesztői Play-fiók, `hu.zsoltmonika.healthhubbridge` package név, a két tulajdonos külön tesztelői címe és opt-inje. Internal testing nem általános publikus bolti listázás.
2. **Kulcskompatibilitási kapu (NO GO amíg nincs igazolva)**: a v0.15.20/build47 eredeti OTA APK és a v0.15.22/build49 Samsung candidate `apksigner` SHA-256 certje legyen azonos. Play App Signing **app signing certificate** legyen azonos az eddig telefonokra telepített csomag aláírásával (saját jelenlegi key importálásának lehetőségét Play Console-ban előre felmérni). Az *upload key* önmagában NEM oldja meg a telepített APK-kompatibilitást. Eltérő app signing cert => nincs in-place Play átmenet, semmilyen uninstall/reset automatikusan.
3. **Samsung Health partner kapu**: package + az Androidra települő app tényleges cert SHA-256 Samsung partnerlistán; developer mode nem gyártási alternatíva. A 1.1.0 AAR csak ellenőrzött, privát GitHub Secrets útvonalon léphet be az aláírt buildbe.
4. **Play-kompatibilis Android App Bundle (AAB)**: Gradle Play flavor / release variant, Samsung SDK privát modul, változatlan appId, növekvő `versionCode > 49`, Play upload signing, Health Connect jogosultság- és adatvédelmi nyilatkozatok, Play policy-ellenőrzések. Play-disztribúcióból **távolítsuk el az `android.permission.REQUEST_INSTALL_PACKAGES` engedélyt** és tiltsuk az appon belüli saját APK-telepítést, mert Play policy tiltja a saját app alternatív frissítését; a GitHub OTA továbbra is kizárólag régi, nem-Play csatornán maradhat.
5. **Központi engedélyezett release**: privát CI összeállítja az AAB-t, ellenőrzi a package+cert+verzió+Samsung SDK integritást, először pilot trackre adja át. Google Play Developer Publishing API hitelesítés GitHub Actions titokból, a release indítása külön jóváhagyott, auditált workflow_dispatch/admin művelettel. Publikációs hiba esetén nincs csendes rollback/uninstall, csak magasabb verziós javítókiadás.
6. **Terítés, megfigyelés**: Play automatikus appfrissítések engedélyezése a két tesztelő készüléken, telepítési ütem Android/Play döntés. Canarystage `zsolt`, majd külön `monika` amennyire Play track/tesztelőlisták engedik. Verzió, update seen/install ok, utolsó sikeres owner-scope szinkron mérhető. Kiadás hibakor megállítható, de már telepített app nem downgrade-elhető.
7. **Kizáró kapu: valódi készülékes megfelelés**: Zsoltnál két megerősített unattended Samsung-mérés + Dropbox readback; Mónikánál külön Health Connect és Samsung permissions, Watch9 mérések, owner isolation. Feltöltés vagy hiányos mérés nem lehet automatikusan ténynek titulálva.

## Átmeneti működés: saját OTA marad figyelő/fallback, nem silent install
- A jelenlegi `OtaUpdateManager.kt` 6 óránként ellenőrzi a `healthhub/data/bridge-ota.json` fájlt. SHA-256-ot ellenőriz, valós nem-mért Wi-Fi-n előre letölt, értesítéssel hívja a rendszertelepítőt.
- Ez **nem valódi zero-touch silent install**: Android / PackageInstaller user approval kellhet. A jelenlegi production 0.15.20/build47 manifestet **ne módosítsuk** és ne küldjünk nem-Samsung APK-t a Samsung canary telefonjára.
- Nem szabad saját OTA és Play release ugyanazon appon párhuzamos, egymásra frissítő csatornáit aktívan keverni. A Play-átállás készülékenként ellenőrzött, egyszeri enrollmenttel történjen.
- Ha Play-fiók, Samsung partnerengedély vagy signing migration nem elérhető, a valódi Play-szerű automatikus telepítés **NO GO**; ilyenkor a legkisebb beavatkozást igénylő, de Android-jóváhagyásos OTA a korrekt fallback. Ne ígérjünk nullakattintásos telepítést.

## Biztonsági és üzemi release-mátrix
| Állapot | Zsolt | Mónika | Megjegyzés |
|---|---|---|---|
| Most, 0.15.22 candidate | telepített, 1 órás beállítás igazolva | saját telepítés/permission tisztázandó | CI aláírt teszt; NEM OTA |
| Play-fiók, Samsung-partner, signing ellenőrzés | először | változatlan | nincs adatvesztéses kísérlet |
| Play pilot AAB, privacy / health policy review | auto update beállítva | változatlan | tesztelői opt-in kell |
| Két valid szinkron + visszaolvasás | PASS szükséges | adatforrás audit szükséges | semmi becsült adat |
| Monika Play rollout | stabil build | Play auto update | lehet késleltetés a Play-ben |
| Hibás release | stop staged rollout | stop staged rollout | hotfix magasabb verzióval |

## Dokumentáció
- https://support.google.com/googleplay/android-developer/answer/9845334
- https://support.google.com/googleplay/android-developer/answer/9859350
- https://developer.android.com/studio/publish/app-signing
- https://developer.android.com/google/play/developer-api
- https://support.google.com/googleplay/android-developer/answer/12085295
- https://developer.samsung.com/health/data/process.html

**Release állapot: ARCHITECTURE APPROVED FOR DEVELOPMENT, NOT BUILT / NOT PLAY CONNECTED.**
