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

### 7. 2026. november 15. · SHO Smart List v10 „Smart Save” checkpoint
- **Felhasználó által jóváhagyott állapot:** egy közös családi bevásárlólista, megvásárolt tételek az elején, egykattintásos pipálás/törlés (szokásos tételeknél nincs megerősítő prompt), hang- és rezgés-visszajelzés.
- **Vizuális standard:** hero és profilváltó nélkül, kompakt 58 px terméksorok, megtartott jól olvasható terméknév, pontos termékszintű emoji vagy hiteles termékfotó.
- **Főkategóriák:** Élelmiszer, Drogéria, Otthon és háztartás, Divat, Elektronika; prediktív termékjavaslatok.
- **Új v10 elem:** mennyiség/súly gomb közvetlenül a termék mellett; alsó szerkesztőben db/kg/g/l/ml stb., +/- és Supabase-mentés; a sor méretét nem növeltük.
- **Állapot:** GitHub `main` mentés megtörtént. HTML commit `ccc42b207c3113ad82eb39f1826b1d8664869ff7`, JS commit `832198441bb52b9413e91f413595e76c9a46b9db`; v10 script hivatkozás érvényes. A felhasználó pozitív vizuális visszajelzést adott. A kéttelefonos felhőszinkron és a mennyiség-konkurencia tesztje külön ellenőrzendő.
- **Funkcionális leírás:** [SHO Smart List Golden v1](./SHO_SMART_LIST_GOLDEN_V1.md)

### 8. 2026. november 15. · Smart List v11, hat függőleges kategória-progress sor
- A felhasználó elfogadta a Listonic-stílusú, vertikális kategóriastátusz-ötletet. `Mind` + öt Shopping főkategória jelenik meg.
- Élő, adatvezérelt **megvett / összes** értékek és zöld progress bar, kategóriára koppintva terméklista és fejléc szűrés, ismételt koppintással vissza a teljes listára.
- A Smart List v10 jóváhagyott terméksorai, mennyiség/súly editorja és felhőműveletei megmaradtak.
- GitHub mentés: JS `d2bec2e51d77bd178242d68de6d70e09bbb0155c`, HTML `09ac830af50d8fa77a533fa39eb3a44bb89685e4`. Belső funkcionális regresszióteszt sikeres, **Samsung mobilos vizuális ellenőrzés hátravan**.
- Részletek: [Smart List Golden specifikáció](./SHO_SMART_LIST_GOLDEN_V1.md)

### 9. 2026. november 15. · Smart List v13: két felső ikon és közös Kedvencek
- A felső Shopping/Home ikonok helyén Kedvencek/Bevásárlólista nézetváltó; a lent lévő navigáció érintetlen.
- Tartós `hh_shopping_favorites_v1` felhőtábla, családi RLS és Realtime, meglévő szívecskés tételek egyszeri átemelése. A listaelem törlésétől függetlenül megőrzött kedvencek.
- Kedvenc `＋` visszaad a közös listához, a saját `♥` levétel a kedvencgyűjteményből töröl. Meglévő kompakt v12 terméksor/mennyiség/súly és hat progress sor változatlan.
- SQL migráció sikeres, 4 politika, RLS és publikáció ellenőrizve; rollback QA teszt, 0 tesztszemét. HTML commit `77957e103da6d69edb45e87cde750bcb926c6159`; JS commit `103f026c3bdd099c5cd8508b5443da71944b25b3`.
- **Nyitott:** két telefonos élő kedvenc-/visszaadás-szinkron UAT. A Shopping régi helyi Wishlistje még független, migráció csak külön tervezetten.

### 10. 2026. november 15. · Smart List v14 navigáció és Tesco Cart Bridge 10 termékes pilot
- Smart List alsó navigáció: **Kezdőlap → Ask Léna → Smart List 🛒 → Shopping**. Family Hub ikon ebből a dockból kivezetve, Ask Léna a közös ChatGPT-projektindítóra kötve. V14 HTML commit `04e95a33e77c996a751f8b88a33c9ffa5f7e166a`; JS `7994d0b5deae375fdadf3f15015ddb4b9d1c2133`.
- Új Shopifytól független **Tesco Smart Cart Bridge** pilot: `sh9/shopping/tesco-pilot.html` + `tesco-pilot-v1.js`. Elérhető a Shopping „BOLTOK & VALÓDI TERMÉKEK” keresője mellől a **🛒 Tesco Pilot 10** gombbal. Két adatforrás: a közös felhős Smart List maximum 10 aktív tétele, illetve 10 külön mintatermék.
- Működő, ellenőrzött Tesco termékkeresés `/shop/hu-HU/search?query=...`; opcionális ellenőrzött termékoldal-link mentés (kizárólag hivatalos Tesco SKU URL). Felhasználó által kézzel jelzett „Kosárba tettem”, visszavonás, felhős 0/10 haladás és nullázás. A Tesco felületén történik a tényleges kosárművelet: **nem** kereskedő által visszaigazolt automatikus kosárátadás.
- Migráció: `sho_tesco_pilot_bridge_family_state_v1`, új `public.hh_shopping_tesco_bridge_v1` tábla, 3 családi RLS policy, Realtime és tiltott anonim olvasás. QA teszt rollback után 0 rekord; böngészőmockban 13/13 pass, JS szintaxis OK.
- A Smart List v14 és a Shopping elfogadott képes kategóriakártyái érintetlenek; csak kompakt pilot-indítógomb került a meglévő Shop Connect műveleti sorba.
- **Nyitott:** mobilos end-to-end Tesco belépés/termékkeresés/kosárba helyezés, kétprofilos szinkron és böngésző-visszalépés UAT. A Tesco kosártartalmát a SHO nem olvassa és a rendelést nem adja le.
- Részletes QA, architektúra és átadási korlát: [Tesco Cart Bridge v1 specifikáció](./SHO_TESCO_CART_BRIDGE_PILOT_V1.md).

### 11. 2026. november 15. · Tesco Smart Cart Bridge v2 — kattintástakarékos pilot
- A v1 kézi „Kosárba tettem” jelölését elhagytuk a **v2** új képernyőjén. Az új út: közös Smart List vagy 10 mintatermék → aktív Tesco-keresés/mentett terméklink egy koppintással → böngésző Vissza → következő termék automatikusan előkészítve.
- A „következő” kizárólag `sessionStorage` navigációs állapot, nem Tesco kosár-visszaigazolás vagy vásárlási állapot. A közös listát a v2 **csak olvassa**. A párosított Tesco SKU-linkek a meglévő családi felhőtáblába mennek, a v1 kézi jelölései érintetlenek.
- Új v2 fájlok: `sh9/shopping/tesco-bridge-v2.html` és `tesco-bridge-v2.js`. Belépési pont: Shopping → Boltok & valódi termékek → **Tesco Bridge v2**. A v1 külön oldalon rollback célra megmarad. A Golden Shopping Hero és Smart List érintetlen.
- Belső DOM/felhőmock ellenőrzés: **13/13** sikeres, régi `removeChild` hiba nem szerepel a v2-ben. Nem automatizált Tesco-kosárfeltöltés.
- Részletek: [Tesco Bridge v2](./SHO_TESCO_CART_BRIDGE_V2.md). **Nyitott:** valódi Tesco/Samsung Internet navigáció, terméklink és kéttelefonos UAT.

### 12. 2026. november 15. · Tesco Smart Shopping v3 GOLDEN RELEASE
- A felhasználó jóváhagyta a v3 kattintástakarékos Tesco-konceptet, majd kérte a véglegesítést. **Tesco Smart Shopping** néven a Shopping / Boltok & valódi termékek részből a `tesco-bridge-v3.html` nyílik, a 10 termékes v1 pilot és v2 rollback-ként megmarad.
- Funkció: teljes aktív családi Smart List felhőből lapozva, termékenként Tesco keresés vagy mentett hivatalos SKU-link, böngésző Vissza után következő termék, önálló hivatalos Tesco-kategóriák és kereső. Nem írja a Smart List vásárlási állapotát.
- Teszt: 12/12 kiterjesztett mock DOM + felhő QA, 260 aktív tétel 2 szakaszban, 40-es mobil render, korábbi regressziós hibák nélkül. GitHub Pages build a v3 Shopping gombot tartalmazó commithoz sikeres; a végső release build külön ellenőrzendő.
- **Limitáció:** nincs Tesco-kosár-/ár-/készlet-/rendelés API. Minden tényleges vásárlás a Tesco webáruház oldalán történik, és a kétprofilos Android/PC éles UAT nyitott.
- Forrás: [Tesco Smart Shopping v3 Golden contract](./SHO_TESCO_CART_BRIDGE_V3.md), `healthhub/project-control.json → tescoShoppingRelease`. A v3 Golden felülethez később csak új verzióban nyúlunk.
- A projekt általános `SH9 · Edge Installable PWA QA` és `HealthHub Level 3 Guard` CI-hibái külön, nem Tesco-specifikusak (natív navigációs fallback tesztek, BKK favorites ellenőrzés); nem értelmezhetők sikeresnek. Ez **nem** teljes projektszintű zöld QA.

### 13. 2026. november 15. · Smart Shopping mind a 10 áruházkártyán
- Jóváhagyott dizájn: a külön felső Tesco CTA helyett **mind a 10 áruházkártyán belül** látszik az `🛒 Smart Shopping ↗` gomb; a bolt neve és logója továbbra is közvetlen bolt-link. A teljes 2×5 viewport Golden Standard maradt, nincs új sor vagy magasítás.
- Tesco változatlan Golden v3; Auchan, Kifli, dm, Rossmann, eMAG, Alza, Allegro, Temu és SHEIN az új közös `merchant-smart-v1.html?store=...` oldalra kötve. Teljes családi Smart List, következő termék, opcionális konkrét bolti terméklink felhős mentése. A nyolc nem igazolt közvetlen keresési útvonalú kereskedőnél boltra szűrt külső webkeresés; Temunál saját kereső.
- Új RLS-védett Supabase tábla: `hh_shopping_merchant_links_v1` (külön a Tesco bridge táblától), 3 családi policy, anon SELECT kizárva, Realtime bekapcsolva. A Smart List táblát csak olvassuk, és nem jelezzük automatikusan megvásároltnak.
- Mock DOM + felhőmotor ellenőrzés: **9/9 üzlet sikeres**: 261 aktív elem, 40→80 tételes megjelenítés, következő termék Vissza után, kereskedő-specifikus URL-mentés és direct open. A Tesco Golden forrás nem változott.
- Határ: a vásárlási átadás *nem* közvetlen kosár-API vagy automatikus feltöltés. Valódi Samsung Internet / Edge és két családi profilos UAT még nyitott.
- Dokumentáció: [10 boltos Golden integráció](./SHO_SMART_SHOPPING_10_STORES_GOLDEN_20261115.md). A későbbi valódi kosárintegráció külön fejlesztési kapu.

### 6. Folytatási szabály

A következő fejlesztések előtt a **P0 migrációs adatbiztonsági hiányokat** kell rendezni. Minden release-nél: célzott CI → főági merge → valódi mobilteszt → Project Control naplófrissítés. A GitHub PR nem helyettesíti a privát, kétprofilos telefonos ellenőrzést.
