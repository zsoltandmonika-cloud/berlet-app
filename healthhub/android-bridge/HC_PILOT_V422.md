# HealthHub v422 – izolált Health Connect-alvás és vitális adatdiagnosztika

**Státusz:** fejlesztési ág. Forráskód készen, még nincs helyi Windows build és telefonos teszt.

## Miért külön APK?

A v421-es `assembleDebug` az éles Connect alkalmazásazonosítójával készül, ezért a telepítése veszélyeztethetné a már működő telepítést. A v422 új, csak olvasó tesztváltozata `hu.zsoltmonika.healthhubbridge.hcpilot` azonosítóval települ, külön a v420 Samsung Thin TEST `.thinpilot` csomagtól és az éles Connecttől.

## Kizárólag helyi funkciók

- Felhasználói gombra Health Connect engedélykérés **csak** alvás, pulzus, nyugalmi pulzus, vérnyomás, véroxigén adatokhoz.
- Utolsó 24 óra / 30 nap; minden rekordoldal lapozott lekérése.
- Megjelenít csak rekordszámot, pulzusminták számát, alvásfázis-szakaszok számát és az eredeti `sourcePackage` értékeket.
- Nincs mobilon megjelenített profilválasztó: a teszt a telefon aktuális Health Connect-tárát olvassa, **nem** állítja, hogy valamelyik családtagot kiválasztja.
- Nincs INTERNET, háttér Health Connect-hozzáférés, Dropbox vagy OTA, nincs fájlba export; nem tartja meg az eredményeket tartósan.

## Windows teszt

A meglévő `C:\HealthHubBuild\healthhub-v416-source` repóba fetch/branch váltás után a `healthhub\android-bridge` alkönyvtárban:
```powershell
& 'C:\Gradle\gradle-8.14.6\bin\gradle.bat' :app:assembleHcpilot --no-daemon --console=plain
```
Majd:
```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\tools\verify-hc-pilot.ps1'
```
A két biztonsági `PASS`, a helyes `.hcpilot` csomagnév és a fejlesztői aláírás ellenőrzése előtt **nincs telefonos telepítés**. A build Samsung gyártói AAR nélkül is lefordulhat, mert ez kizárólag a Health Connect SDK-t teszteli.

## Elfogadási kapuk

- A v422 tényleges `BUILD SUCCESSFUL` és teljes APK jogosultságellenőrzés.
- A telefon Health Connect beállításában hozzáférés explicit engedélyezése; a valós rekordszámok összevetése a Samsung Health / Health Connect forrásokkal.
- A Health Connect speciális engedélykérése, időkorlátai és fázisrekordjai tesztelendők, külön az éjfélen átnyúló alvásra.
- A sikeres pilot **nem** jelenti, hogy az éles háttérszinkron kész; később külön kiadási aláírás és két megbízható automatikus ciklus igazolása szükséges.

Ne töröld a HealthHub Connect v0.14, Samsung Beta v0.14 vagy Thin Collector v420 alkalmazásokat.
