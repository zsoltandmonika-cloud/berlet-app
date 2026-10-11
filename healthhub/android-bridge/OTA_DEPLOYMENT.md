# HealthHub Connect OTA (Google Play nélkül) · v0.14

## Mi épült meg?

- `HealthHub Connect`: új, a telefonon jóváhagyott OTA-frissítési képernyő.
- Android WorkManager: a release-manifeszt óránként ellenőrizhető, és értesítés küldhető (ha az értesítési engedélyt megadták). Az Android időzíthet késve.
- `Admin Center → Central Sync Orchestrator → APP UPDATE CHECK`: távoli **frissítésellenőrzési kérés** Android-eszközöknek Dropboxon keresztül. Ez nem távoli, jóváhagyás nélküli telepítés.
- Leíró: `healthhub/data/bridge-ota.json` (csak valódi, aláírt kiadáskor jön létre).
- A kliens elutasítja a nem egyező alkalmazásazonosítót, a nem újabb `versionCode`-ot, a nem megengedett profilra szóló kiadást, a nem egyező letöltési címet és az SHA-256 hibát.
- Az Android telepítéskor az aláírásazonosságot és az alkalmazás jogosultságait ellenőrzi.

## Első üzembe helyezés: egyszeri aláírókulcs-beállítás

**Jelenleg az OTA-terítés nem aktív, amíg a négy GitHub Actions titok hiányzik.** Ez szándékos; debug kulccsal soha nem publikálunk automatikusan telepíthető OTA release-t.

1. Biztonságos saját gépen hozz létre egy **hosszú élettartamú**, saját Android app signing keystore-t, és mentsd offline biztonságos helyre. A kulcs nélkül a jövőben nem lehet a telepített appot adatvesztés nélkül ugyanazzal a package ID-val frissíteni.
   Példa saját gépen, ahol a `keytool` elérhető:
   ```sh
   keytool -genkeypair -v -keystore healthhub-connect-ota.jks -storetype PKCS12 -keyalg RSA -keysize 3072 -validity 10000 -alias healthhub-ota
   ```
   A jelszavakat **soha ne küldd el a chatben, és ne commitold a GitHubba**.
2. GitHub repo → Settings → Secrets and variables → Actions → New repository secret:
   - `HH_OTA_KEYSTORE_B64`: a teljes `.jks` bináris fájl Base64 kódolva, sorvégek nélkül
   - `HH_OTA_KEYSTORE_PASSWORD`: keystore-jelszó
   - `HH_OTA_KEY_ALIAS`: alias (`healthhub-ota`)
   - `HH_OTA_KEY_PASSWORD`: kulcsjelszó (PKCS12 esetén általában ugyanaz)
3. **NEM szabad** a kulcsot közös Dropboxba, a HealthHub nyilvános oldalára vagy a repóba helyezni.
4. A `HealthHub Connect · Signed OTA` GitHub workflow automatikusan ellenőrzi a négy secret meglétét. Ha nincs meg valamelyik, biztonságosan kihagyja a kiadást.
5. Első éles kiadás: `healthhub-connect-ota-v0.14.0` aláírt release és SHA-256 manifest, alapból csak a `zsolt` profilra. Sikeres próba után a workflow `workflow_dispatch` bemenetén `rollout=all` (mindkét profil).

## Nagyon fontos: egyszeri debug → stabil APK migráció

A korábbi `v0.12.0` és az esetleges helyi `v0.13.0` APK-k **debug aláírásúak lehetnek**. A GitHub Actions korábban futásonként új debug kulccsal épített, ezért Android nem engedi az ilyen appok folyamatos, helybeni frissítését más kulccsal.

**Nem tudjuk megígérni az adatok megőrzését az egyszeri átálláskor.** A régi APK eltávolítása törölheti a helyi Dropbox hitelesítést és Health Connect-engedélyeket. A kritikus adatok Dropboxban megmaradnak, de az új appnak újra kell engedélyt adni, és ki kell választani a helyes telefon-tulajdonos profilt. A migrációhoz először ellenőrizd mindkét eszközön a friss szinkront; majd csak **Zsolt telefonján** tesztelj.

A webes HealthHub-frissítések és a natív APK-frissítések technikailag különbözőek. A natív appban az Android csomagtelepítője kéri a végső felhasználói jóváhagyást; a ChatGPT nem kap és nem igényel közvetlen rendszergazdai hozzáférést a telefonhoz.

## Biztonság és üzembiztonság

- Nincs csendes, tetszőleges távoli APK telepítés.
- A központi parancs csak OTA-ellenőrzést / értesítést kérhet, nem kerülheti meg az Android telepítőt.
- Csak HTTPS, rögzített GitHub Releases URL-séma, SHA-256, `versionCode` és Android aláírásellenőrzés.
- Először Zsolt, utána Mónika; az automatizált Health Connect → Dropbox szinkron ettől független.
- A régi debug APK-k archivált tesztkiadások, a CI továbbra is készít build artifactot, de nem publikál többé debug APK-t éles OTA-ként.
- Ha egy kiadás hibás, az OTA manifesztet le lehet venni vagy a rollout-profilt vissza lehet vonni; Androidon az **APK-verzió visszaléptetése általában nem támogatott**, ezért a helyreállítás jellemzően magasabb verziószámú, kijavított új kiadás.

## Élesítési tesztterv

1. GitHub CI: `assembleDebug` sikeres.
2. Aláírókulcs biztonságosan beállítva.
3. GitHub signed OTA release: `apksigner verify` sikeres, SHA-256 manifestben megegyezik.
4. Zsolt telefonja: helyes profil, update értesítés, kézi telepítési jóváhagyás.
5. Visszajelzés a Dropbox Device Orchestratorban: telepített verzió, `otaCandidateVersion`, utolsó Health Connect szinkron és valós friss mérési időbélyeg.
6. Legalább egy sikeres automatikus szinkron után szélesítés Mónikára.

**Állapot:** implementálva, de titkok és valódi kéttelefonos telepítési teszt nélkül NEM tekintendő éles OTA-nak.
