# SHO / HealthHub · Központi projektlogbook
## Pótlólagos mérföldkő-napló · 2026-10-28 – 2026-11-12

**Állapot dátuma:** 2026-11-12 (Europe/Budapest)  
**Projekt:** Smart Hub One (SHO/SH9) + HealthHub  
**Forrásigazság:** GitHub `main`, verziózott PR-ok, [Project Control master](../project-control.json), [2026-11-10 Dropbox routing audit](./DROPBOX_APP_ACCOUNT_MAPPING_20261110.md); külön jelölve a felhasználói mobilteszt.  
**Adatvédelem:** kizárólag technikai státusz. Nem tartalmaz személyes egészségügyi adatokat, rendelési e-maileket, címeket, jelszavakat, OAuth-tokeneket, titkokat vagy egyedi készülékazonosítókat.

> Ez a dokumentum az október 27-én megállt központi logbook *pótlása*, nem új alkalmazáskiadás. A `project-control.json` korábbi `liveBuild: v380` mezője történeti címke: a modulok tényleges verzióit az élő HTML-include-ok és a GitHub commitok igazolják. A CI, a főági merge és a telefonos élő elfogadás külön bizonyítékszint.

### 1. 2026. november 9–11. · Outlook Dropbox-migráció és családi GPS-cutover

**Cél:** a két korábbi Dropbox-fiók/alkalmazásmappa széttartó írásait felmérni; az Outlookhoz tartozó **kanonikus HealthHub Cloud Vault** legyen a működő cél, az elavult Gmail/GPS útvonal ne keveredjen a két profilhoz. A változtatás nem azonos az Outlook levelezés vagy a naptár migrációjával.

**Megvalósult és alátámasztott:**
- A forrás Gmail és a cél Outlook Dropbox elkülönített összevonásához biztonságos előnézet / másolási eszköz készült ([PR #843](https://github.com/zsoltandmonika-cloud/berlet-app/pull/843), [PR #844](https://github.com/zsoltandmonika-cloud/berlet-app/pull/844)). A külön `healthhub-vault` App Folder és a **HealthHub Cloud Vault / HealthHub** nem ugyanaz a névtér; a natív Dropbox app-kulcsot nem lehet önkényesen kicserélni.
- **2026-11-10 esti ellenőrzés:** a két fizikai HH One telefon a saját profiljához kötött friss natív GPS-t az Outlook HealthHub App Folderbe írta; a Family Guard v1178 Outlook-oldali olvasót használt. A felhasználó megerősítette, hogy mindkét személy megjelent a térképen. A korábbi Gmail-es natív GPS-frissülés megszűnt.
- A külön, egyszeri Gmail account-review/remote szolgáltatás v1179 alatt kivezetésre került. Ez **nem** bizonyítja az összes régi Gmail-engedély visszavonását vagy a régi adatok törlését.

**Még nem zárt adatbiztonsági és funkcionális feladatok:**
1. A Gmail-oldali Mónika-profil Vault, Digital Wellbeing és nem GPS eredetű Health/Activity/Sleep adatok **rekordszintű egyeztetése**, ellenőrzött visszaállítható biztonsági mentéssel. A november 11-i felhasználói visszajelzés szerint az alvás- és aktivitásadatok letöltése hiányos maradt az engedélyek ellenőrzése és kézi szinkron után is.
2. Régi Gmail-webkliens/automatizmus írók megszűnésének tényleges bizonyítása. Nincs megerősítve, hogy minden legacy OAuth grant vissza van vonva.
3. Family Guard: időnként eltűnő térképjelölők, amelyek manuális képfrissítésre visszajönnek; reprodukció és állapotfrissítési javítás mindkét profilon, **adatvesztés ténye nem bizonyított**.
4. A fizikai készülékpárosítás, külön Health Vault webes munkamenet és Dropbox OAuth-engedély egymástól eltérő rétegek. Ezeket nem kezeljük egyetlen általános „migráció kész” jelzéssel.

**Biztonsági tiltás:** a legacy Gmail Vault törlése, vak összeolvasztása, forrásjogosultságok elhamarkodott visszavonása és a kanonikus natív App key átírása **tilos**, amíg a fenti egyeztetés nincs dokumentáltan kész.

### 2. 2026. november 6–11. · SHO Smart Trip / Smart Match / Family Guard

- **Smart Trip V5:** párhuzamos keresési és szerveroldali Google Routes adapter/pilot, validált BKK–MÁV–Volán szakaszok, A-terv prioritás, szolgáltatói logók, hivatalos jegylinkek, prémium útvonal-flow. A tényleges pilot/deploy és egyes viselkedések verziónként vizsgálandók: [PR #824](https://github.com/zsoltandmonika-cloud/berlet-app/pull/824), [#826](https://github.com/zsoltandmonika-cloud/berlet-app/pull/826), [#832](https://github.com/zsoltandmonika-cloud/berlet-app/pull/832). A **kevesebb mint 30 mp-es teljes útkeresés** cél, nem általánosan bizonyított SLA.
- **Smart Match:** kitűzhető menetrendi timeline és személyre szabott iránysablonok ([#860](https://github.com/zsoltandmonika-cloud/berlet-app/pull/860)), mobilos, profilhoz illeszkedő Family Guard/Smart Location felület és BKK Watchlist ([#879](https://github.com/zsoltandmonika-cloud/berlet-app/pull/879), [#887](https://github.com/zsoltandmonika-cloud/berlet-app/pull/887), [#889](https://github.com/zsoltandmonika-cloud/berlet-app/pull/889)).
- Nyitott elfogadási feltételek: otthonról induló sablon helyes kezdőpontja; kitűzött útvonal visszafordítása; tényleges indulási idő és átszállási tartalék; kéttelefonos térképkövetés frissítési stabilitása. A megjelenő útvonal nem önmagában bizonyíték valódi járat- és időadatokra.

### 3. 2026. november 7–12. · HealthHub Nutrition, Recept Stúdió és két Smart Action

- **Nutrition workflow:** Gyors bevitel → Kedvencek, AI Scan → Kedvencek, négyelemű 2×2 Recept Stúdió és editálható recept-/napló-kártyák ([#805](https://github.com/zsoltandmonika-cloud/berlet-app/pull/805), [#806](https://github.com/zsoltandmonika-cloud/berlet-app/pull/806), [#809](https://github.com/zsoltandmonika-cloud/berlet-app/pull/809)).
- **Interfood Smart Lunch v1178–v1183:**
  - Hivatalos nyilvános Interfood étlap + pontos ételnév/dátum/kód/tápérték-egyezés ([#894](https://github.com/zsoltandmonika-cloud/berlet-app/pull/894), [#896](https://github.com/zsoltandmonika-cloud/berlet-app/pull/896)).
  - **Külön, opt-in Outlook Mail.Read engedélyhez kötött privát rendelésbridge**, titkosított szerveroldali adatkapcsolat és időzített ellenőrzés ([#897](https://github.com/zsoltandmonika-cloud/berlet-app/pull/897)). A mobilos Health Vault Google SSO belépés a Beállításokba került, a technikai belépő eltűnt a Smart Lunch kártyáról ([#898](https://github.com/zsoltandmonika-cloud/berlet-app/pull/898)).
  - Egyérintéses „Igen!” naplózás és opcionális csillagok; 10 másodpercig látható, legfeljebb 30 másodpercig érvényes visszavonás, halk csillaghang és támogatott haptika ([#899](https://github.com/zsoltandmonika-cloud/berlet-app/pull/899)); három jóváhagyott RAG Buddy (zöld/sárga/piros, [#900](https://github.com/zsoltandmonika-cloud/berlet-app/pull/900)); prémium Glassy UI és lilás-rózsaszín eredeti fotókeret ([#901](https://github.com/zsoltandmonika-cloud/berlet-app/pull/901)).
- **Interfood ételeim v1184:** külön privát mentettkártya-tár; kompakt kártyák, tápértékchipek, hivatalos képbetöltési hiba javítása és nagyítható fénykép, kizárólag pontosan azonosítható hivatalos képlink-fallback ([#902](https://github.com/zsoltandmonika-cloud/berlet-app/pull/902)).
- **Két megkülönböztetett Smart Action:** (1) megrendelt mai ebéd tudatos elfogyasztás/értékelés naplózása, (2) mentett ételkártya külön egyérintéses naplózása. **Nyitott integrációs kockázat:** ugyanazt a rendelést ne lehessen e két útvonalon kétszer könyvelni. A felületet a felhasználó november 12-én elfogadta; ez nem egyenlő a két útvonal közös deduplikációs tesztjével.

### 4. Minőségbiztosítás, pontos bizonyítékszintek

- 2026-11-12: a Smart Lunch v1183 és az Interfood Ételeim v1184 kódja a GitHub **main** ágba került, a célzott Smart Lunch, Interfood Live/Photo, Outlook Bridge és Nutrition napló ellenőrzések sikeresen lefutottak. A felhasználó az új kártyatárat és a képeket működőnek jelezte.
- A tágabb **HealthHub Level 3 Guard** és történeti Timeline QA ellenőrzések ugyanebben a munkamenetben hibás státuszt adtak; nem állítható, hogy a teljes rendszer CI-je zöld. Külön hibatriázs szükséges.
- A fiókmigráció GPS oldala felhasználói és routing-audit alapján elfogadott; a nem GPS/Health/Sleep adatok végső egyezése **nem** bizonyított. Az átállás nem nevezhető teljes adat-migrációnak.

### 5. Nyitott, prioritás szerint rendezett teendők

| Pri. | Feladat | Elfogadási feltétel |
|---|---|---|
| P0 | Outlook↔legacy Gmail nem GPS Vault egyeztetés | Profilszintű leltár, darabszám/hash, konfliktusjegyzék, tartós backup; hiányzó Health/Activity/Sleep források visszaállása |
| P0 | Legacy Gmail írók és OAuth engedélyek rendezése | 2 egymást követő megfigyelt szinkron, azonosított aktív írók; utólagos biztonságos kivezetés külön engedéllyel |
| P1 | Family Guard GPS UI frissítési hiba | A jelölők nem tűnnek el újrarajzoláskor; két készülékes élő teszt |
| P1 | Nutrition Smart Action deduplikáció | Ugyanazon rendelés napi kalóriája csak egyszer szerepel akkor is, ha mindkét műveleti útvonalat használják |
| P1 | Smart Trip A-terv és Smart Match mobilos e2e | Kezdőpont, menetidő, irányváltás, csatlakozás és szolgáltatói forrás ellenőrzése |
| P1 | Level 3 / Timeline QA megmaradt hibái | Ismételhető hibadiagnózis és zöld CI, regresszió nélkül |

### 6. Folytatási szabály

A következő fejlesztések előtt a **P0 migrációs adatbiztonsági hiányokat** kell rendezni. Minden release-nél: célzott CI → főági merge → valódi mobilteszt → Project Control naplófrissítés. A GitHub PR nem helyettesíti a privát, kétprofilos telefonos ellenőrzést.
