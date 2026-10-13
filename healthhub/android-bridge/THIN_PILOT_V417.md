# v417: izolált, csak helyi Samsung Health SDK próba

**Status:** Fejlesztési ág; nem került éles `main` ágba. Nem produkciós release, telefonon még nem tesztelt.

## Működési korlátok

- Új **pilot** buildtípus, alkalmazásazonosító: `hu.zsoltmonika.healthhubbridge.thinpilot`. Nem települhet rá a jelenlegi `hu.zsoltmonika.healthhubbridge` alkalmazásra.
- Kizárólag a `ThinPilotActivity` indítható; az eredeti `MainActivity` és az OAuth/deep-link/OTA bejáratok eltávolítva a pilot manifestből.
- Nincs INTERNET, REQUEST_INSTALL_PACKAGES, Health Connect olvasási vagy POST_NOTIFICATIONS engedély. A Samsung SDK saját engedélykérését a felhasználó indítja kézzel.
- Egy napos, előtéri Samsung Health SDK-olvasás. Csak képernyőn jelenít meg napi kalóriát, percet, távot és emeletadatot; hiányzó mezők nem válnak nullává.
- Sem Dropbox-, sem háttérszinkron-, sem távoli vezérlés-, sem automatikus Samsung-beolvasás nincs ebben a pilotban. Az eredeti Connect v0.14 és Beta változatlan.
- `assemblePilot` csak akkor indulhat, ha a Samsung gyártói `app/libs/samsung-health-data-api.aar` fájl a helyi fejlesztői környezetben megvan. Gyártói AAR nyilvános GitHub-feltöltése tilos.

## Helyi build (a korábban sikeresen összeállított Windows környezetben)

A már kész `C:\HealthHubBuild\healthhub-v416-source\healthhub\android-bridge` projekten dolgozz. Az APK nem készül el automatikusan a PR megnyitásakor.

1. Nyisd meg a PowerShellt, és lépj a repó gyökérmappájába:
   `C:\HealthHubBuild\healthhub-v416-source`
2. Ellenőrizd, hogy a helyi munkában nincs megőrzendő változtatás (`git status --short`), majd válts a v417 fejlesztési ágra. `local.properties` és a Samsung AAR maradjon helyi, git-ignored fájl.
3. Fordítás: `C:\Gradle\gradle-8.14.6\bin\gradle.bat :app:assemblePilot --no-daemon --console=plain`, a `healthhub\android-bridge` könyvtárból. A pilot build nevét ne keverd az `assembleDebug` normál Connect APK-val.
4. Ellenőrzés: `tools\verify-thin-pilot.ps1`, amely megvizsgálja a csomagnevet, az elvárt főképernyőt, az engedélyeket, a manifestet és a SHA-256 lenyomatot.
5. **Ha bármelyik ellenőrzés hibás, nincs telepítés.** A Samsung SDK használhatóságát ez a fordítás még nem igazolja; első teszthez felhasználói Samsung engedély és esetleges fejlesztői SDK-mód/alkalmazásazonosító jogosultság kell.

## Telefonos próba engedélyezési kapu

Pilot APK kizárólag akkor telepíthető, ha a helyi build `BUILD SUCCESSFUL`, a verifikációs script `PASS`, és egyértelmű az alkalmazásazonosító. A következő eszközös teszt csak kézi, helyi Samsung-olvasás. Nem kell és nem szabad a Connectet vagy a Samsung Betát törölni.

## További lépések

A sikeres helyi adatolvasás után külön egyesített, aláírásazonos produkciós csomagot és szinkron-adatkonzisztencia teszteket készítünk; legalább két valódi automatikus ciklus sikere után merülhet fel a Beta eltávolítása.
