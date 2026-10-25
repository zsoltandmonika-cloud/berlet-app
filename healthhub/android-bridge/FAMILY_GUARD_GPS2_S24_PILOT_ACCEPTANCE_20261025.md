# Family Guard GPS 2.0 · S24 Ultra kiadás előtti elfogadási terv

Állapot: **NEM TELEPÍTHETŐ PILOT / NINCS OTA JÓVÁHAGYÁS**. A PR #502 draft; a PR #491 szerinti bejelentkezési és WebView-session hiba külön release blocker.

## Forrás- és aláírásellenőrzés (2026-10-25)

- PR #502 utolsó ellenőrzött kód SHA: `fe5cb2ae6d15f78c1a34f62b8bfaa5c24c524d30`; mind a négy (Level 3 Guard, HH One Android QA, unified native QA, Time Window QA) **PASS**.
- GitHub Actions `40200348397`, read-only `compare-signed-release-to-existing-keystore` job `121190010312`: **PASS**. Ellenőrizte a jelenlegi **0.15.2/build29** OTA-APK SHA-256 hashét és az OTA keystore tanúsítványának egyezését.
- Ez **nem bizonyítja** a *telefonon telepített* APK aláírását, és **nem bizonyítja** egy új GPS 2.0 pilot-APK aláírását. Aláírt új pilot még nincs megerősítve.
- A 21.4.0 FLP inkompatibilis volt a jelenlegi Kotlin 2.0 fordítóval; a PR #502 a kompatibilis **21.3.0** könyvtáron tartja a Smart Location GPS-t.

## Telepítés ELŐTT, közvetlenül Zsolt S24 Ultra készülékén

- [ ] Tulajdonos visszaigazolja a jelenleg telepített HH One verziószámot, package ID-t és az alkalmazás tényleges aláíró tanúsítványát, összevetve az éles OTA aláírásával. Semmi adattörlés.
- [ ] Rögzítjük a meglévő Health Connect, Dropbox, Guardian, Nutrition, Google/Microsoft login és profil állapotát, személyes adatok vagy tokenek PR-ba feltöltése nélkül.
- [ ] A #491 WebView/native OAuth session-fragmentációs blocker megoldva és elfogadva. Böngészőben hitelesített szolgáltatás nem válhat ki kéretlen új bejelentkezést vagy külső tabot.
- [ ] Azonos package ID, magasabb versionCode, azonos aláírás, érintetlen helyi tároló ellenőrzése.
- [ ] Csak külön jóváhagyott **privát, aláírt pilot**, NEM public OTA. Először Zsolt, Mónika csak Zsolt jóváhagyott eredménye után.

## A tényleges GPS 2.0 pilot forgatókönyve (NINCS MÉG VÉGREHAJTVA)

Mindegyik mérésnél rögzíteni kell: `smartLocationEngine`, `smartLocationMode`, `smartLocationReceiverStatus`, `smartLocationLastFixAt`, `familyGuardUploadStatus`, `familyGuardLastUploadedAt`. **Helykoordinátát nem teszünk issue-ba/PR-ba.**

1. Kifejezett owner-consent + „Mindig engedélyezett” pontos hely; Family Guard megosztási hozzájárulás külön. A foreground service folyamatos értesítése és STOP látható.
2. Bekapcsolás után két perc mérés: friss GPS-fix, `receiving` és a külön Dropbox feltöltési időpont megfigyelése. NINCS automatikus „zöld” csak attól, hogy a service aktív.
3. Képernyő lezárása 3, 10 és 30 percre; valós callback-időpont ellenőrzése, nem csupán alkalmazás-életjel.
4. Helyben állás vs biztonságos mozgásteszt: `IDLE` vs `MOVING`; átváltáskor nem keletkezhet duplikált FLP előfizetés.
5. Internet kikapcsolása/visszakapcsolása, külön GPS-mérés és Dropbox-feltöltés állapotjelzése; **nem** állítunk garantált veszteségmentes GPS-felhőt vagy offline történetet.
6. GPS-helyszolgáltatás kikapcsolás/visszakapcsolás; watchdog 150 másodperces diagnózisa és egyszeri FLP resubscribe / későbbi Android fallback, amennyiben az Android ütemezni engedi.
7. Telefonos értesítésben STOP: nincs további helyzetközlés, engedély és ismételt automatikus indítás nélkül nem indul újra. A privát felhő visszavonó rekordja internet után ellenőrizendő.
8. Telefon újraindítása és app-folyamat leállása: csak korábban kifejezetten jóváhagyott, Android által engedett helyreállítás; tilos rejtett jogkérés vagy végtelen restart loop.
9. Profil izoláció: Zsolt telefontól Mónika profiljára váltás nem változtathatja meg a *fizikai készülék tulajdonosát*. A kijelölt aktív telefonok Device Registry állapotát külön ellenőrizni kell.
10. Dropbox/Health Connect/Nutrition/RAG/Google/Microsoft web session smoke test; nincs adatok törlése, kapcsolat elvesztése, automatikus session-csere.
11. Elfogadási napló: PASS/FAIL, mérési idők és anonimizált státuszkódok, Android / HH One build, akkumulátor mód. Hibánál nincs Mónika rollout.

## Tényleges blokkolók

- #491 nyitott és draft: OAuth/WebView szétváló munkamenetek a felhasználó korábbi S24 tesztjén.
- Az új APK aláírását és a készülékre telepített APK tanúsítványát külön ellenőrizni kell.
- ChatGPT/GitHub eszközökkel **nem lehet a tulajdonos helyett fizikailag lezárni a képernyőt, módosítani Android helyjogosultságokat vagy tényleges készüléktesztet igazolni**.
- Nem módosítjuk a `healthhub/data/bridge-ota.json` éles manifestet, nem telepítünk és nem törlünk alkalmazásadatokat a tesztterv elkészítésekor.
