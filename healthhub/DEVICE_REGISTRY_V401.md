# HealthHub v401 – Eszköznyilvántartás és biztonságos housekeeping

## Cél
A HealthHub több, ugyanilyen Samsung modellnek látszó regisztrációt is tárol. Azonos modellnév **nem** igazolja, hogy két rekord ugyanahhoz a fizikai készülékhez tartozik. Emiatt nem szabad automatikusan összevonni vagy törölni eszközöket.

## A v401 működése
- Az Admin Center **Családi eszközregiszter** panelje a Dropbox `/HealthHub/orchestrator/devices/*.json` regisztrációkból olvas.
- A kezelő egy-egy pontos `deviceId`-t jelölhet ki Zsolt és Mónika aktív fizikai telefonjaként. Azonosítás előtt érdemes a telefonon megnyitni a HealthHub Connectet, és megvizsgálni a frissülő `lastSeenAt` időpontot.
- A kijelölést és az archiválási jelzőket a külön `/HealthHub/orchestrator/device-registry-v401.json` fájl rögzíti. **Nincs automatikus migráció, összevonás vagy törlés.**
- Minden változtatás előtt külön `device-registry-backup-*.json` pillanatkép készül ugyanitt. Az utolsó (maximum 15) módosítás visszavonható.
- A régi regisztrációk `📦 Archiválás` funkciója kizárólag *metaadatot* módosít, nem töröl sem regisztrációt, sem egészségügyi adatot, sem meglévő parancsot vagy státuszt.
- A v305 Orchestrator **és** a v306 Health Connect távoli parancsküldése csak az előre kiválasztott Android eszközre engedélyezett. Nincs több `profileCapability` alapú, véletlen webes vagy duplikált Android célpont.
- Az `ALL DEVICES` gomb a v401-től **kizárólag a kijelölt fizikai telefonokat** jelenti. Minden küldött parancsnak egyértelmű tulajdonosprofilja van.
- Elavult `PENDING` státuszokat tájékoztató jelzéssel különböztetünk meg, de nincs automatikus parancstörlés vagy téves `DONE` átírás.

## Mit NEM old meg
- **Nem** biztosítja az Android háttérfolyamatának automatikus újraindulását `BOOT_COMPLETED` után. A Boot Recovery / WorkManager ellenőrzés külön feladat; lásd GitHub issue #145.
- **Nem** kényszeríti ki a Samsung Health → Health Connect szinkronizálást.
- **Nem** garantál azonnali távoli végrehajtást. A telefon `PENDING` maradhat, amíg a natív alkalmazás újra nem ellenőrzi a Dropbox parancssort.
- **Nem** teszi bizonyítottan frissé az egészségügyi méréseket pusztán egy `DONE` státusz alapján.

## Integrációs teszt az S24 Ultrán
1. Nyisd meg a HealthHub **v401** Admin Centert, majd a **Családi eszközregiszter** panelt.
2. Nyisd meg külön a Zsolt, majd a Mónika telefonon a HealthHub Connectet. Frissítsd a regiszter állapotát. Azonosítsd a frissen jelentkező készülékek egyedi ID-végződését.
3. Kézzel jelöld ki mindkét profilon az **egy** fizikai telefont. Ellenőrizd, hogy minden kiválasztás előtt létrejött a Dropboxban a backup fájl.
4. Mónika telefonsorában indíts **SYNC NOW** parancsot; ellenőrizd a `PENDING` → natív visszajelzési állapotot, majd külön a Health Connect import időbélyegét és az adatkorát.
5. Egy régi, **nem kijelölt** regisztrációt archiválj, és próbáld ki a **visszavonást**. Az egészségügyi adatokhoz és a natív parancssorhoz ekkor nem nyúlhat a housekeeping.
6. Ellenőrizd, hogy v305 / v306 nem engedi a nem kijelölt vagy archivált célpont felé a szinkronizálást.
7. Újraindítás után külön teszteld a natív háttérfeladat ébredését az issue #145 alapján.

## Statikus és szimulált ellenőrzések
- v305, v306, v401 JavaScript syntax: PASS.
- V305 vezérlő-guard szimuláció: `monika` → 1 kiválasztott telefon; `all` → pontosan 2 kijelölt; régi és webes célpont elutasítva; profilScope tulajdonoshoz rendelve.
- V401 metaadat-szimuláció: kijelölés → backup → módosítás; archiválás → backup → módosítás; undo → backup → módosítás; kiválasztási guard helyes.

**Figyelem:** Ezek nem helyettesítik a valódi böngészős, Dropbox- és Android integrációs tesztet. A telefontulajdonosok kiválasztását a felhasználónak kell jóváhagynia.
