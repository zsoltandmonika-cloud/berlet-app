> **2026-11-02 · V934 FELÜLÍRÁS:** A három különálló pirula vizuális szabványa megszűnt. Az összes aktív oldal új Golden Standardja a 4 zónás, 50 px magas, 40%-ban áttetsző SHO Unified Glass Dock. Részletek: [GOLDEN_STANDARD_UNIFIED_DOCK_V934.md](./GOLDEN_STANDARD_UNIFIED_DOCK_V934.md). A dokumentum alábbi részei történeti leírások; az adat- és jogosultságbiztonsági elvek változatlanok.

# SH9 / HealthHub · GOLDEN STANDARD · három globális vezérlő

**Állapot:** v918 globális bevezetés bekötve mind a **22 aktív, felhasználói alkalmazásoldalon és aloldalon** (beleértve a kategóriafa mélyebb BKK/MÁV/Volán/Smart Trip/My Trips ágait és a releváns előnézeteket). **A telefonos vizuális és teljes E2E jóváhagyás még hátravan.**
**Jóváhagyott alap:** SH9 v916 (2026-11-02). A három vezérlő funkciója: 🇭🇺/🇨🇦 nyelv, Feladatok/Tasks, Zsolt/Mónika profil.
**Hatókör:** valamennyi **aktívan navigálható** SH9/HealthHub és családi modul; régi verziószámú archív HTML-ek, tesztelő/preview oldalak csak indokolt esetben, külön jóváhagyással.

## Nem változtatható vizuális szerződés

- **Közös kinézet:** mindhárom, pontosan azonos, **teljesen átlátszatlan sötétkék** `#0C2446` hátterű és azonos árnyékú, kapszula alakú vezérlő.
- **Méret:** 90 × 47 CSS px érintési terület, 34 px magas látható kapszula; a vizuális forma, keretvastagság és betűstílus mindháromnál egységes.
- **Profilfüggő keret mindháromon:** Zsolt `#79BFFF` (kék); Mónika `#F9A6D3` (pink). A **háttér színe profilváltáskor sem módosul**.
- **Elhelyezés:** nyelv- és Feladatok-kapszula egymás mellett bal felül; profil-kapszula bal alul, függőlegesen a nyelvi kapszulával igazítva. SH9 kezdőlap: a jóváhagyott v916 koordináták; más oldalakon a megfelelő Hero/safe-area referenciapont mellett, gombütközés nélkül.
- **Feliratok:** a Feladatok/Tasks az aktív nyelvet, a profilgomb a kiválasztott személy nevét mutatja; a zászlók 🇭🇺 és 🇨🇦 maradnak. Hozzáférhető címkék és jól látható fókusz.
- **Ne jelenjen meg a `GOLDEN STANDARD` felirat a felhasználói felületen.** Ez belső műszaki és dizájnszabvány, nem reklámszlogen.

## Kötelező implementációs architektúra

**Egyszeri megoldás:** egy közös, verziózott komponens (javasolt: `sh9/shared/sh9-golden-controls-v1.js` és `.css`), amit az aktív entry page-ek betöltenek. A shared komponens egyszer hozza létre/veszi át a három vezérlőt, és ugyanazt a stílust, UI-állapotot és eseménykezelést alkalmazza mindenütt. A SH9 főoldal **v916-os megjelenése referencia**, a globális komponens váltja a helyi implementációt, nem duplikálja.

- **Profil:** közös állapot `localStorage['hh-profile']` (`z`/`m`); a globális gomb a **modul meglévő, kanonikus profilváltó handlerére** kapcsolódik (pl. `guardianProfileSwitch`, `fhProfileSwitch`, `profileBtn`, BKK/MÁV/Volán egyedi `profile` kontrollja). Nem elég csak a storage-ot felülírni, mert a moduloknak frissíteniük kell a saját adatokat, nézetet, térképet vagy jogosultságellenőrzést. Az ismételt kattintás és dupla váltás tilos. Események és többfüles storage-változások megfigyelése.
- **Feladatok:** a jelenlegi `sh9-tasks-golden-v901.js` funkcionális belépési útvonala megmarad (`/berlet-app/sh9/family-hub/`). A meglévő singleton gombot **át kell venni és lecserélni**, nem másodikat mellé létrehozni. Family Tasks Quick Add és egyéb overlay működését megtartani.
- **Nyelv:** a közös `sh9-language-v1` (`hu`/`en`) preferenciát és a SH9 nyelvi eseményét használja, az alkalmazás saját i18n rendszeréhez csatlakozik. A vezérlők és támogatott oldalak helyi szövegei azonnal frissülnek; a fordítatlan modulokat külön nyelvi auditban fel kell térképezni, nem szabad teljes fordítást színlelni.
- **Legacy:** meglévő profil- és Task gomb csak akkor rejthető el, ha a shared új vezérlő az adott oldalon már sikeresen felépült **és** a kanonikus profilváltás helyesen működik. Hiba esetén az eredeti vezérlő marad elérhető (fail-safe). Új régi/fényes profilgomb ne villanjon fel betöltéskor.
- **Védett működés:** HH ONE valós státuszjelzője, az ötös alsó taskbar, OTA, GPS/követés, személyes egészségadatok, BKK/MÁV/Volán útvonaltervezés, Quick Add és bejelentkezés nem sérülhetnek.

## Bevezetési mátrix és sorrend

| Hullám | Aktív felületek | Teendő és ellenőrzés |
|---|---|---|
| 0 – Shared komponens | `sh9/index.html` | A v916 referencia kinézetet közös CSS/JS komponensbe szervezni; 3 gomb, 1 profilfrissítés, 1 Tasks link, 1 nyelvi állapot. |
| 1 – Első pilot | `sh9/smart-travel/index.html`, `sh9/family-hub/index.html` | Jelenlegi Task csere, `fhProfileSwitch` natív vezérlő megtartása, nyelv és Quick Add teszt. |
| 2 – Közlekedés | `sh9/smart-travel/public-transport/index.html`, `bkk/index.html`, `bkk/grand-concept/index.html`, `mav/index.html`, `volan/index.html`, `smart-trip/index.html`, `sh9/smart-travel/my-trips/index.html` | Külön profilvezérlők adapterei; útvonal, indulási tábla, térkép, foglalások ne romoljanak. |
| 3 – HealthHub | `healthhub/index.html`, `healthhub/guardian/index.html`, `healthhub/nutrition/index.html`, `healthhub/digital-health/index.html`, `healthhub/usage-control/index.html` | Kanonikus profilváltás, profilhoz kötött mérések/adatok, HH ONE állapot és Guardian követés megőrzése. |
| 4 – Családi és kiegészítő | `recepttar/index.html`, `recepttar-studio/index.html`, és az összes további **aktív** navigációs oldal | Régi Task/profil gomb cseréje; ugyanazon UI-minta és keresztoldali szinkron. |
| Külön ellenőrzés | `healthhub/nutrition-preview/`, `healthhub/digital-wellbeing-preview/`, régi `family-guard-v*.html`, `time-machine-v534.html`, diagnosztika/auth callback | Ne masszírozzunk archív snapshotokat automatikusan; preview oldalt akkor migráljuk, ha aktuális éles navigációból elérhető. |

**Figyelem, korábbi szabványütközés:** a `healthhub/docs/GOLDEN-STANDARD-RULE.md` régebbi, 45 × 45 px-es felső jobb profilképet és HH ONE bal felső kapszulát ír elő. Az új, explicit jóváhagyott **háromgombos vezérlő** ezeknél a **profilváltó vizuális kialakítását** felülírja az érintett migrált oldalakon. A HH ONE **valódi állapotjelzőjének szolgáltatását nem törli**; helyét ütközés nélkül kell biztosítani. A régi dizájn-specifikáció többi, releváns biztonsági/viselkedési szabálya érvényben marad.

## Átadási és kiadási kapu

Minden hullám akkor elfogadható, ha mindhárom gomb ugyanúgy néz ki Zsoltnál és Mónikánál (kizárólag a keret színe változik), pontosan egyszer szerepel, a profilváltás minden modult helyesen frissít, a 🇭🇺/🇨🇦 és a Feladatok működik, a korábbi gombok nem látszanak, nincs vezérlő- vagy safe-area átfedés, a navigáció marad, és a két profillal valódi Galaxy S24 Ultra képernyőn is jóváhagyott a látvány. Automatizált DOM/CSS/állapot/regressziós tesztek és szükség esetén visszaállítható kapcsoló kötelező.

**Nem tartozik bele az első körbe:** backend migráció, új AI funkció, új adatbázis, teljes termék-fordítás vagy a történeti archív oldalak tömeges átírása.

**Végcél:** ugyanaz a három vezérlő, ugyanaz a kód, ugyanaz a viselkedés és azonos vizuális minőség az összes aktív SH9 / HealthHub oldalon.

## v918 · kiterjesztés az egész kategóriafára (2026-11-02)

- **Egyetlen közös CSS és JavaScript:** `sh9/shared/sh9-golden-controls-v1.css`, `sh9/shared/sh9-golden-controls-v1.js`.
- **22 felhasználói HTML belépési oldalba bekötve**, nemcsak a kategóriák rootjába. Minden kategóriaág és minden azon belüli dinamikus nézet ugyanabban a HTML-dokumentumban használja a közös vezérlőket.
- **Profiladapterek:** Family Tasks jogosultságkapuja, Family Guard, Nutrition, BKK (két UI-változat), MÁV, Volán, Smart Trip AI, My Trips, Digital Health, HealthHub kanonikus profilkapcsoló. A meglévő profilkezelők maradnak az illetékesek.
- **A régi Task szkript betöltése kivezetve** a felsorolt lapokon, a HealthHub `document.open()` klasszikus tartalék felületén is.
- **Legacy gomb:** csak az új közös vezérlés és az illetékes profilhandler megléte esetén rejtjük a régi vizuális vezérlőt; Family Tasks Quick Add saját gombja a feladatlapon működőképes marad.
- **Kivételek:** a `healthhub/guardian/family-guard-v*.html` verziómentések, a `sh9/releases/` történeti mentései, `healthhub/force-v*.html`, az OAuth-visszahívó, valamint a dokumentációs Architecture Grand Design. Nem kategóriafabeli, aktív felhasználói modulok.
- **Regressziós ellenőrzés:** `healthhub/tests/sh9-golden-controls-global-v918.test.cjs`. A kód- és hivatkozásellenőrzés nem helyettesíti a két Samsung Galaxy S24 Ultra készüléken történő valódi vizuális/szerepkör teszteket.

## v919 · Egészség belső aloldalak pozíciójavítása (2026-11-02)

- A HealthHub egyetlen HTML dokumentumon belül jeleníti meg a **másodszintű Egészség** nézetet (`#healthSection.page.on`) a Leletek, Gyógyszerek és Egészségügyi összkép tartalmaival. A v918 tévesen a `body` elemhez rögzítette a profilkapcsolót; ez lecsúszást okozott.
- A közös JS most az **éppen aktív** nézet `.healthSubHero` eleméhez mozgatja a *három* vezérlőt, és figyeli a belső oldalváltásokat (`MutationObserver`, `class`/`hidden`).
- A régi `health-subhero-layout-v576.css` szándékosan középre pozicionálja a `.healthSubHero > div` elemeket; a háromgombos sor szintén div. A v919 célzott, nagyobb prioritású CSS felülírja ezt **csak** a közös vezérlőn. A felső két gomb Hero-bal-fent, a profilváltó Hero-bal-lent marad.
- Az eredeti `.backBtn` lentebb igazodik, hogy a zászlókat ne takarja. Az eredeti profil- és egészségügyi adatkezelő logika változatlan.
- A HealthHub `index.html` mindkét példányban (kezdeti dokumentum és rekonstruált shell) új `v=919-health-hero-anchor` CSS/JS hivatkozást kapott a cache érvénytelenítésére.
- A DOM-alapú oldalváltás szimuláció sikeres; **valódi Galaxy S24 Ultra megjelenítés/érintési teszt még szükséges**.

## v924 · Alsó navigáció új GOLDEN STANDARD (2026-11-02)

**Jóváhagyott kiindulópont:** SH9 v923. **Felhasználói követelmény:** a teljes aktív főoldal/alkategória/aloldal fában ugyanaz a két alsó navigációs ikon legyen.

- **Kezdőlap ikon:** átlátszó, keret/fehér kör/árnyékoló réteg nélkül, 28 × 28 px, Zsoltnál `#79BFFF`, Mónikánál `#F9A6D3`. A Kezdőlap felirat meglévő stílusa megmarad.
- **Ask Léna ikon és felirat:** ugyanaz a profilfüggő világoskék/pink, keret és árnyékréteg nélkül; a felirat kötelezően az ikon színét követi.
- **Többi navigációs gomb:** egyedi funkciók és eseménykezelők nem módosulnak; meglévő 5 slotos SH9-navigációban a 2. hely az Ask Léna lesz (a régi Idővonal/HealthRadar parancs közvetlen shortcutja továbbra is a HealthHub saját képernyőin elérhető). A Recepttár és Studio saját Kedvencek/Admin kezelőjét nem töröljük.
- **Közös kód, nem oldalankénti másolat:** `sh9/shared/sh9-golden-bottom-nav-v924.css` és `sh9/shared/sh9-golden-bottom-nav-v924.js`; a `hh-profile` / `data-sh9-golden-profile` a színek egyetlen forrása.
- **Lefedettség:** 22 aktív/tesztelhető HTML entry page, minden aloldali ág, köztük BKK Grand, MÁV, Volán, Smart Trip, My Trips, Family Tasks, Family Guard, Nutrition, Digital Health, Recepttár, Recepttár Studio és az admin/usage.
- **HealthHub specialitás:** a `document.open/write` újraépített oldal külön is beemeli a CSS/JS-t; a dinamikusan létrejövő `#sh9GlobalNavV24` vezérlőre a komponens figyel, így nem kell véglegesen duplikálni a taskbart.
- **Ha egy oldalon nincs natív SH9 alsó navigáció:** a közös JS biztonságos, 5 elemes navigációs fallbackot hoz létre. A Nutrition preview saját napló-dockja és a Bérlet-alkalmazás három bérletkezelő gombja megmarad, az új navigáció nem fedheti el őket.
- **Szigorúan nem érintett:** OTA, GPS, adatbázis, egészségadatok, meglévő profiljogosultságok, a felső GOLDEN STANDARD három kapszulája, valamint a központi 3 × 3 SH9 modulkártyák.
- **Teszt:** `healthhub/tests/sh9-golden-bottom-nav-v924.test.cjs`; statikus lefedettség és szín/DOM-szabvány. Készülékes vizuális és teljes end-to-end teszt még szükséges.

**Kötelező jövőbeli szabály:** minden új aktív modul és almodul a v924 közös alsó navigációt is töltse be; ne készüljön új, oldalanként festett Home/Ask Léna ikon.
