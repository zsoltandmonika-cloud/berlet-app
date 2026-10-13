# HealthHub v423 · Alvásrekordok idővonala (első, biztonságos mérföldkő)

## Elkészült
- Külön telepíthető **Health TEST** `.hcpilot` alkalmazás, ugyanazzal az elkülönített applicationId-val, mint v422: ezt kizárólag meglévő tesztalkalmazás frissítésére használjuk.
- Alvásrekordok szerinti idővonal és a felébredés **helyi dátuma** szerint csoportosított 30 napos diagnosztika; legutóbbi 14 rekord részletei.
- Forráscsomag, helyi kezdés/vég, mért időintervallum, fázisszakaszok és nyers fáziskódonként rögzített percek.
- Átfedő rekordok nem kerülnek automatikusan összeadásra, a főalvás/szundi besorolás nincs kitalálva.
- Hiányzó alvásfázis és alváspontszám nincs nullával helyettesítve.
- Minden korábbi v422 Health Connect diagnosztikai kategória megmarad (pulzus, nyugalmi pulzus, vérnyomás, SpO₂).
- Internet, Dropbox, OTA, háttérszinkron, egészségadat-export és valódi profilváltás NINCS ebben a tesztalkalmazásban.

## Még hátravan
- Egyezőség Samsung Health képernyővel a tényleges kezdési és befejezési időpontokra és a fázisok szemantikájára.
- Az egyes fáziskódok emberi neve csak ellenőrzött Health Connect API típusleképezéssel és mintával.
- A 24 órás átfedéses olvasás és a 30 napos *napválasztós, grafikus* Sleep modul nincs még megvalósítva.
- Az Activity dátumválasztó UI meglévő moduljának tényleges újrafelhasználása külön fejlesztés.
- A HealthHub központi, két profilt biztonságosan elkülönítő, automatikus szinkronja továbbra sem bizonyított.

## Windows fordítási és biztonsági kapu
A v423 ág helyi letöltése után, az Android bridge könyvtárban:
```powershell
& 'C:\Gradle\gradle-8.14.6\bin\gradle.bat' :app:assembleHcpilot --no-daemon --console=plain
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\tools\verify-hc-pilot.ps1'
```
A két PASS mellett ellenőrizzük, hogy a csomagnév `hu.zsoltmonika.healthhubbridge.hcpilot`, és nincs internet / éles deep link / háttér Health Connect jogosultság. Csak utána másolható ki és telepíthető a v422 Health TEST alkalmazás **frissítéseként**. A produkciós Connect és Samsung Beta marad érintetlen.

## Telefonos elfogadási feltételek
1. 30 napos teszt beolvassa az alvásrekordokat és csoportosítja az ébredés napjára.
2. Legalább két ismert éjszakát egyeztetünk a Samsung Health kijelzőjével.
3. A hiányzó fázis, rekord, SpO₂ és nyugalmi pulzus nem válik becsült vagy nullának tekintett mérési értékké.
4. A forrás és az időzóna látható, adatfeltöltés nem történik.
