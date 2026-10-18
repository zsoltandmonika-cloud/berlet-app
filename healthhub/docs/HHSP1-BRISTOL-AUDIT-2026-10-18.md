# HHSP1 / Nutrition Bristol · audit és biztonságos javítás
**Dátum:** 2026-10-18  
**Érintett éles verzió:** Nutrition v650 (main)  
**Státusz:** ellenőrzött kódeltérés; javítás az `audit/hh-audit-001-hhsp1` ágon, még nem élesítve.

## Ellenőrzött megállapítás
- A `healthhub/nutrition/index.html` v650 egyszerre töltötte be a régi `hh-bristol-carousel-v649.js/.css` és az új `hh-bristol-wheel-v649.js/.css` rendszereket.
- Mindkettő saját Bristol-kártyafületet hoz létre, és vannak azonos CSS osztályai (`.hh-bristol-card`, `.hh-bristol-art`, stb.). Ez duplikált vizuális választót és CSS-ütközést okozhat. **Ez statikus kódvizsgálattal bizonyított betöltési hiba**, nem csupán feltételezés.
- A régi natív `<select id="bristol">` mező a kódban megmarad, de az új UI bootolása után CSS-el rejtett. **Megőrzendő:** a naplózási adatút 1–7 numerikus értékei és a meglévő Dropbox séma kompatibilitása miatt.
- Az ételhasonlatos 7-kártyás UI `✎ Képek` gombja a közös `HH_BEVITEL_CATEGORY_V644.openEditor('bristol')` szerkesztőt hívja. **Csak a kártyák képei szerkeszthetők**, a skála számozása, kategóriák elnevezése és klinikai jelentése változatlan.
- A szerkesztő a közös családi Dropbox-képtárhoz kapcsolódik; a tényleges felhasználói bejelentkezési, feltöltési és készülékes E2E tesztet nem végeztük el.

## Végrehajtott biztonságos HHSP1 javítás
**Branch:** `audit/hh-audit-001-hhsp1`  
**Commit:** `1fc601ea08f736ba5d4dfdd9892fad51b2f43b3a`  
**Módosítás:** a régi Bristol carousel JS és CSS két importjának eltávolítása a Nutrition `index.html` fájlból.
**Nem módosítottunk** Bristol-értékeket, Dropbox logikát, profiladatokat, más Nutrition modulokat vagy a kanonikus, rejtett form mezőt. A korábbi fájlokat sem töröltük, amíg a teljes referenciakeresés nem zárul.

## Visszaállítás
Kiinduló main commit: `93fe06c5be9f8cbadcfc03486fd4f802d6fc9240`.
Biztonsági referenciaág: `backup/hh-pre-hhsp1-20261018-v650`.
Bármely sikertelen acceptance esetén a Nutrition `index.html` egyetlen, auditágon végzett import-módosítása visszaállítható a fenti kiinduló commitból.

## Kötelező QA élesítés előtt
1. S24 Ultra / Chrome: `Nutrition → BODY BALANCE → Széklet rögzítése`; **pontosan egy** ételhasonlatos Bristol-választó.
2. 1/4/7 kártya kiválasztása, visszaállítás, mentés; helyes `bristol` 1–7 érték és időpont a megfelelő profil naplójában.
3. `✎ Képek`: saját kép feltöltése, mentés Dropboxba, megjelenés frissítés után, másik profilon is; nincs adatkeveredés.
4. Mégse, nincs kiválasztva, offline, Dropbox hiba: a felület érthetően reagál, naplóadat nem sérül.
5. Vizelet, folyadék, étel, GyorsNasi és Léna Cookbook regressziómentes.
6. Kétprofilos, mobilos és desktop responsive ellenőrzés.

**Kiadási kapu:** kódalapú importjavítás kész az auditágon; éles main deploy és készülékes E2E acceptance még hiányzik. Ne jelöljük Done-nak addig.

## 2026-10-18 · Kioldott HHSP1 hotfix státusz
- **PR:** [#343](https://github.com/zsoltandmonika-cloud/berlet-app/pull/343), összevonva a `main` ágba.
- **Main merge SHA:** `fc970ee13826c9a2776509a845391202d230b2b1`.
- **Tartalom:** a Nutrition `index.html` két elavult Bristol carousel importja eltávolítva. A Sleep működése változatlan; két elavult CI-teszt böngészőstubja/cache-kulcs ellenőrzése kijavítva.
- **GitHub Actions:** HealthHub Level 3 Guard PASS, Pages build PASS, Pages deploy PASS, report-build-status PASS.
- **Éles webes/készülékes end-to-end QA:** továbbra is nyitott. Az automatikus Pages deploy sikeres státusza nem bizonyítja a mobil UI és a Dropboxból való képfeltöltés működését.
- **Visszaállítás:** `backup/hh-pre-hhsp1-20261018-v650` ág megőrizve.
- **Release besorolás:** Bristol hotfix kiadva; a teljes HHSP1 audit/service pack **nem** tekinthető lezártnak.

## 2026-10-18 · Felhasználói acceptance: Bristol képszerkesztés

- **Felhasználói visszajelzés:** a v650 HHSP1 éles Nutrition Bristol képszerkesztője működik; a felhasználó saját, cukrászdai termékeket ábrázoló képeket töltött fel a Bristol-kártyákhoz.
- **Felhasználó által megerősítve:** a képszerkesztés és képfeltöltés sikeres a saját használati környezetében. Külön szerkesztői regressziós hiba nem jelentkezett a visszajelzésben.
- **Még nyitott E2E ellenőrzés:** képek visszatöltése újratöltés után, profilváltás és másik készülék/böngésző, a Dropbox tartós felhőszinkronja, 1–7 típusok mentése. A felhasználói sikeres feltöltés önmagában nem bizonyítja mindegyiket.
- **Adatvédelem:** az egyéni képeket nem másoljuk be a publikus GitHub-repozitóriumba, csak a teszt tényét dokumentáljuk.
