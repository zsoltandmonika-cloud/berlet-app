# SHO Smart Shopping · 10 boltos Golden kártyaintegráció · 2026-11-15

**Állapot:** kód a GitHub main ágon; kiadás a Pages-publikálás ellenőrzésével. 9/9 boltra sikeres szimulált DOM és felhő-adatfolyam teszt; külön mobilos/kétprofilos valós UAT továbbra is nyitott.

## Felhasználói működés
- **Boltválasztó képernyő:** `sh9/shopping/index.html` „BOLTOK & VALÓDI TERMÉKEK” nézete 10 áruházkártyával 2×5-ös, egy képernyőbe beférő Golden Standard geometriával.
- **Minden kártya alsó gombja:** `🛒 Smart Shopping ↗`. Nem adunk hozzá második gombsorozatot, hogy a kártyák ne nyúljanak meg. A kártya logójára/boltnevére kattintva továbbra is **az eredeti áruház főoldala** nyílik meg.
- **Tesco:** meglévő, jóváhagyott `sh9/shopping/tesco-bridge-v3.html`; az oldal és a benne lévő Tesco-családi SKU-linkek változatlanok.
- **Auchan, Kifli, dm, Rossmann, eMAG, Alza, Allegro, Temu, SHEIN:** közös, boltra paraméterezett `sh9/shopping/merchant-smart-v1.html?store=<kulcs>` útvonal; 9 külön név és domain, nem egy összevont kosár.
- **Funkció:** bejelentkezett Zsolt/Mónika teljes aktív Smart List tételei (Supabase lapozás 250-es blokkban, 10 000 felső korlát), megjelenítés 40-es adagokban; egy kattintásos boltra szűrt termékkeresés és a böngésző Vissza után következő tétel. 10, bolttípushoz választott példaelem bejelentkezés nélkül is elérhető.
- **Mentett konkrét terméklink:** a felhasználó által a bolti oldalon ellenőrzött HTTPS-link opcionálisan menthető a `hh_shopping_merchant_links_v1` táblába, a bolt saját domainjéhez kötve. A következő alkalommal egy kattintással a mentett termékoldalra léphet.
- **Szabad bolti keresés:** Temu esetén ellenőrzött hivatalos kereső URL; a többi 8 új kereskedő esetén site:-ra szűrt külső kereső, amíg megbízható bolti közvetlen keresőútvonal nincs igazolva. Ezeket a felület kifejezetten „webkeresés”-ként nevezi; nem állítja, hogy a boltok saját API-ját használja.

## RLS, adatvédelem és állapot-határok
- Új nem destruktív Supabase-migráció: `sho_multistore_smart_shopping_merchant_links_family_v1`, tábla: `public.hh_shopping_merchant_links_v1`, `(household,store_key,source,item_key)` egyediség.
- Háztartás: `zsolt-monika`. `zsolt`/ `monika` hozzáférés `hh_profile_access` + `auth.uid()` alapján. Külön családi SELECT/INSERT/UPDATE RLS policy-k, anon SELECT visszavonva. Supabase realtime publikáció.
- `hh_shopping_list_v1` **csak olvasás**. Nem lépteti automatikusan „Megvettem” állapotba, és a Tesco `hh_shopping_tesco_bridge_v1` adatai érintetlenek.
- Navigációs állapot csak böngészőlap `sessionStorage`, boltonként elkülönítve. Ez nem jelenti, hogy a termék a bolt kosarába került.
- **Nem tartalmaz:** bolti kosárba helyezés, ár/készlet/termékfotó automatikus API-szinkron, kosár-ellenőrzés, fizetés, rendelés. Boltfiók-jelszót sem tárol.
- A teljes telepítési QA más SHO modulokban korábban meglévő PWA/BKK hibák miatt nem állítható projekt-szinten 100%-osan zöldnek.

## Források és tesztelés
- `sh9/shopping/store-connect-v2.js`: mind a 10 kártya belső Smart Shopping gombja + hivatalos brand-link.
- `sh9/shopping/visual-cards-v3.css`: kontrasztos Smart CTA, az eredeti 5×2 viewport layout változatlan.
- `sh9/shopping/index.html`: a felső redundáns Tesco CTA eltávolítva, JS/CSS gyorsítótár verziózva.
- `sh9/shopping/merchant-smart-v1.html` + `.js`: a 9 boltos felület.
- QA: 9/9 boltnál teljes listás, 261 aktív tételes, 40→80 soros, next-after-back, RLS-állapotot imitáló linkmentési, boltos keresési és Smart List integritási kontrollok sikeresek.
- Tényleges Android/PC kétprofilos próbát és valódi bolti találatok felhasználói validálását nem végeztük el.

**Későbbi fejlesztési kapu:** kereskedőnként csak ellenőrzött API vagy engedélyezett partner-hozzáférés alapján lehet valódi direkt kosárfeltöltést, ár- és készletszinkront bevezetni.
## Golden UX finomítás · dupla koppintás · 2026-11-15
- A felhasználó a nagy „Keresés a Tescóban” gomb **helyett** a terméksoron történő dupla kattintást / dupla koppintást kérte. Megvalósult Tescon és a kilenc többi áruház közös motorjában.
- **Egy koppintás:** kiválasztja és fókuszba hozza a terméket. **Ugyanazon terméksor dupla koppintása (450 ms):** ugyanabban a böngészőlapban megnyitja a mentett hivatalos terméklinket, vagy a hivatalos Tesco-keresőt / boltra szűrt webkeresőt. Böngésző Vissza után a következő termék kerül előtérbe.
- A főpanelen a korábbi teljes szélességű gomb helyén egy **kisméretű akadálymentes megnyitási link** maradt. A felületben látható útmutató és `touch-action: manipulation` CSS segíti a dupla mobilkoppintást és csökkenti a böngésző dupla-koppintás nagyításával való ütközést.
- A Tesco Golden v3 terméklogikáján ez felhasználó által jóváhagyott UX-módosítás, a v1/v2 pilotok és a 10 boltos kártyarács érintetlenek; a Smart List kizárólag olvasott. Teszt: forrás szintaktika, Tesco és Auchan szimulált dupla koppintás és Vissza-útvonal sikeres; terméklista statikus fallback megmaradt.
- GitHub Pages publikálás sikeres a módosítások után: Tesco `42c3f4e2f8fd01ab18a582150b0b7ea7df42a7b0`, többbolt `c6c3a65093eff382ddcc75450e5ddaf9be03da83`. **Tényleges Android dupla koppintás UAT még szükséges.**

## Auchan pontos SKU-handoff · 2026-11-15
- **Hiba és felhasználói elvárás:** a „UHT laktózmentes tej 1.5%” terméksor dupla kattintása nem a Google `site:auchan.hu` találati oldalára, hanem **közvetlenül a kiválasztott Auchan-terméklapra** kell vigyen. A Google-köztes oldal extra kattintás, és nem igazolja, hogy a találat a kívánt termék.
- **Felhasználó által megadott és a hivatalos oldalon ellenőrzött terméklap:** `https://auchan.hu/shop/auchan-kedvenc-laktozmentes-uht-tej-15percent-1-l.p-931877`, „Auchan Kedvenc laktózmentes UHT tej 1,5% 1 l”.
- A Smart Shopping **a név szerint jóváhagyott, pontos termékpárosítást** Google nélkül használja az aktuális családi Smart List „UHT laktózmentes tej 1.5%” tételéhez. Az `1,5%` forma is támogatott, és a saját Auchan keresőmezőben azonos pontos szövegre szintén direkt link nyílik.
- **Családi terméklink-tanulás:** az RLS-védett `hh_shopping_merchant_links_v1` korábbi rekordjainak `name_snapshot` mezőit is összehasonlítjuk normalizált, pontos egyezéssel; így azonos nevű új Smart List tétel új UUID mellett is használhatja a már ismert linket. Az adott listaelemhez mentett érvényes linknek továbbra is elsőbbsége van.
- **Biztonság:** egy „Mizo” vagy „Riska” márkájú terméket sem rendelhetünk hozzá önkényesen az Auchan Kedvenc SKU-hoz; a többi, még nem azonosított termék továbbra is boltra szűrt keresést nyit meg. Valódi általános SKU-egyeztetéshez engedélyezett bolti termékadat-hozzáférés kell.
- **QA:** 10/10 célzott teszt sikeres, beleértve a direkt SKU-átadást, `1,5%` normalizálást, márkás termék elkülönítését, boltok közötti izolációt, korábbi párosítás újrafelhasználását, dupla kattintást és a teljes Smart List változatlanságát. A forrás és a HTML-be beépített futtató egyezik. GitHub Pages build sikeres (`b8e75d93fa88511ba462aec4a1c8d5a139e5b64b`). Valódi mobilos UAT nyitott.

## Korrigált, felhasználó által jóváhagyott célfolyamat · 2026-11-15
**Shopping List → Smart Shopping Bridge → a választott kereskedő SAJÁT találati listája → termék kiválasztása → kereskedő kosara.**

- A felhasználó jelezte, hogy az Auchan „UHT laktózmentes tej 1.5%” kereséséhez nem egy önkényesen kiválasztott Auchan Kedvenc SKU kell; a **teljes Auchan-találati lista** kell. Ennek példáját saját linkkel igazolta: `https://auchan.hu/shop/search?q%5B%5D=lakt%25C3%25B3zmentes%2520UHT%2520tej%25201%252C5%2525%25201%2520l`.
- **Hibajavítás:** a korábban beégetett `DIRECT_AUCHAN_PRODUCTS` kényszerpárosítást megszüntettük. A dupla koppintás **alapértelmezésben mindig keresési találati listára** vezet. A már kifejezetten felhasználó által mentett konkrét terméklink kizárólag *külön, opcionális* kisméretű link marad, nem írja felül az alap keresést.
- Keresési célok: **Tesco** `bevasarlas.tesco.hu/shop/hu-HU/search?query=`; **Auchan** `auchan.hu/shop/search?q%5B%5D=` (a felhasználói linknek megfelelő dupla URL-kódolással); **Kifli** `kifli.hu/kereses?q=...&companyId=1`; **dm** `dm.hu/search?query=...&searchType=product`; **Rossmann** `shop.rossmann.hu/talalatok?q=`; **eMAG** `emag.hu/search/...`; **Alza** `alza.hu/search.htm?exps=`; **Allegro** `allegro.hu/kereses?string=`; **Temu** `temu.com/hu/search_result.html?search_key=`; **SHEIN** `hu.shein.com/pdsearch/.../`.
- **Forrásállapot:** merchant natív URL-formátumok publikus példák és a felhasználó által tesztelt Auchan útvonal alapján. A címek JavaScript-beli összeállítása mind a 9 új kereskedőnél 9/9 mock QA sikeres, Tesco 11/11 mock QA sikeres. **A teljes keresőműködés valós mobilon és a bolti belépett munkamenetben még tesztelendő.** Az áruházak megváltoztathatják a URL-sémát.
- **Ár szerinti rendezés:** cél a megfelelő termékek egységár szerinti, növekvő sorrendű ajánlása eredeti fotóval, aktuális árral, készlettel és direkt terméklinkkel. Ez **NEM működő funkció**, mert a Bridge-nek még nincs mind a 10 boltra hiteles, engedélyezett termék-/ár-/készlet-feedje. Jelenleg a kereskedő oldalán használható annak saját rendezése.
- **Kosár:** a Bridge átadja a vásárlási szándékot és gyorsítja a soron következő termék keresését, de **nem tölti fel automatikusan** a bolti kosarat. A konkrét terméket a felhasználó a kereskedő weboldalán választja és helyezi a kosárba. A Smart List vásárlási állapota változatlan.
- Implementáció: `merchant-smart-v1.js` és a HTML-be beépített azonos szkript (9 natív útvonal), `tesco-bridge-v3.js` és saját HTML-be beépített szkript (Tesco natív találatok + opcionális SKU-link).

## 11. bolt: Shoperia · 2026-11-16
- **Új bolt:** https://shoperia.hu/; kategóriák: Drogéria & Szépség, Otthon & Háztartás. Kártya, hivatalos domain/favikon és külön `?store=shoperia` Smart Shopping útvonal.
- **Közös lista:** azonos, csak olvasó Smart List; boltonként külön linkmentés az eddigi RLS-védett `hh_shopping_merchant_links_v1` táblában; 10 termékes drogéria-demo.
- **Keresési bizonyíték:** a webáruház saját, paraméterezett keresőútvonala még nincs hitelesítve. Emiatt a dupla koppintás és a szabad keresés egyértelműen jelzett `site:shoperia.hu` webkeresést nyit, nem egy kiválasztott SKU-t és nem feltételezett bolti kosarat.
- **Vizuális Golden:** a boltkártyák száma 10→11; mobilon 6 kompakt sor, a Shoperia utolsó, kéthasábos csempén, a katalógus a következő panelen marad. Felső Hero és 6 kategóriacsempe nem módosult.
- **Kód:** `store-connect-v2.js`, `merchant-smart-v1.html` és `.js`, `visual-cards-v3.css`, `index.html` cache-busting. GitHub forrásoknál JavaScript- és HTML-be ágyazott script-szintaxis ellenőrzés sikeres; tényleges készülékes UAT / Pages publikálási ellenőrzés még nyitott.

## 12. bolt: ALDI Online Shop · 2026-11-16
- **Új webshop:** `https://shop.aldi.hu/kezdooldal` (a felhasználó által megadott UTM/hirdetési azonosítók nélkül). Kategóriák: Élelmiszer, Drogéria & Szépség, Otthon & Háztartás.
- **Áruházválasztó:** az ALDI a Tesco melletti új kártya; kártyán belüli Smart Shopping CTA `merchant-smart-v1.html?store=aldi`, hiteles áruházdomain `shop.aldi.hu`. 12 áruház, hat 2-oszlopos mobil sor.
- **Közös lista + terméklinkek:** a meglévő csak olvasható Smart List és jogosultságvédett `hh_shopping_merchant_links_v1` bolt-specifikus mentés; semmilyen kosárba helyezési vagy automatikus megrendelési állítás nincs.
- **Keresési útvonal:** natív ALDI kereső URL-séma nem hitelesíthető, ezért transzparens `site:shop.aldi.hu <termék>` külső webkeresés. Dupla koppintás / szabad keresés így működik; nem önkényes egyedi terméklapra lépés.
- **Vizuális standard:** Golden kártyamagasság és kategóriák változatlanok; az előző, páratlan számú (11) boltos Shoperia-széthúzás CSS-e már csak páratlan darabszámnál aktiválódik. A termékkatalógus továbbra is külön panel.
- **QA:** 12 kártya, két ALDI-mintakeresés (arabica kávé + laktózmentes tej), JS + inline HTML script syntax, belső és inline keresőegyezés, 2×6 CSS és cache-busting ellenőrzés: PASS. Teljes mobilos, élő ALDI oldali UAT és GitHub Pages publikáció végponttól végpontig még nyitott.

## 12 boltos közös Smart List belépő javítása · 2026-11-16
- **Felhasználói hiba:** a Smart Shopping gombon át a Tesco a közös bevásárlólistát nyitotta meg, a másik 11 bolt viszont korábbi `demo` nézetet tarthatott meg a boltonként külön tárolt `sessionStorage` miatt.
- **Javítás:** `merchant-smart-v1.html` és az azonos logikájú `.js` most mindig a közös, felhős Smart Listtel indul; a 10 demótermék csak manuális opció, és nem írhatja felül a következő boltnál a közös lista alapértelmezését. A boltkártyák útvonala explicit `view=shared` és HTML cache-busting `rev` paramétert kapott.
- **Adatbetöltés:** a közös lista külön, elsődleges Supabase-olvasás; a mentett merchant-specifikus SKU-linkek opcionális második betöltése nem blokkolhatja a listát. Látható szinkron-, bejelentkezési és hibastátuszok.
- **Érintetlen:** Tesco Golden Bridge v3, családi lista írási funkciói, RLS, mentett termékkapcsolatok, keresési URL-sémák, alap Golden csempegeometria.
- **QA:** mind a 11 másik áruházra szimulált, bejelentkezett családi felhőbetöltés (4 tétel) 11/11 sikeres; link API hiba mellett is 4 tétel betöltve; nincs bejelentkezés esetén nem jelenik meg megtévesztő 10 mintatermék. A tényleges Android és GitHub Pages UI-UAT még nyitott.

## Kritikus multi-store Bridge javítás · 2026-11-16

**Felhasználói képernyőképes bugreprodukció:** Tesco Golden Bridge: közös 4 aktív termék rendben; Auchan és többi kereskedő: demo / 1/10, felhőbetöltés elakad, beágyazott catch: `Cannot set properties of null (setting 'textContent')`.

**Közvetlen ok:** a multi-store `merchant-smart-v1.html` korábbi szövegmódosításakor eltűnt a `storeDomain` ID-jű elem, a két közös futtató (`merchant-smart-v1.html` inline és `.js`) `render()` függvénye mégis végrehajtotta a `$('storeDomain').textContent=store.domain` sort. Minden render összeomlott, így a korábbi, statikus fallback és demo látszott.

**Javítás:** mindkét scriptből eltávolítottuk a már szükségtelen DOM-módosítást (a bolt domainje továbbra is megjelenik a hivatalos áruházlinken és a keresési leírásban). Az űrlap és a közös lista nem változott. `store-connect-v2.js` Smart Shopping linkjei `rev=20261116b` verziót kaptak, a Shopping főoldal `store-connect-v2.js?v=store-smart-shared-v3-20261116` hivatkozással töri a régi gyorsítótárat.

**QA:** 31 tényleges HTML ID és összes JS `getElementById` hivatkozás egyeztetve (0 hiányzó); JavaScript és inline script szintaxis PASS; 11/11 nem Tesco áruházban valódi HTML-ID-ket tiszteletben tartó DOM + mock Supabase teszt: 4/4 közös listaelem renderelődik, nem demó. A JS újraindítása és GitHub main állapot ellenőrizve. Éles mobilos felhasználói teszt szükséges a Pages kiszolgálási cache és a bejelentkezett Supabase session ellenőrzéséhez.

## Dinamikus áruházak + Full Basket Match + Local-First V1 · 2026-11-16

**Cél:** teljes közös bevásárlókosár előkészítése egy boltra vagy minden aktív áruházra; új webáruház felvétele/kikapcsolása kódmódosítás nélkül. Integráció a délelőtt bevezetett Local-First mintához.

**Elkészült:**
- Supabase public.hh_shopping_store_prefs_v1 családi áruház-regiszter, 3 RLS policy (SELECT/INSERT/UPDATE), authenticated jogosultság, hh_profile_access-ellenőrzés, anon grant nincs. A 12 jelenlegi áruház megmaradt alapállapotnak; az első testreszabáskor kerül be az adatbázisba rekord.
- sh9/shopping/store-registry-v1.js és store-manager-v1.html/.js: áruház hozzáadása HTTPS-cím/kategóriák alapján, ki-/bekapcsolás, felhőmentés, helyi snapshot; marketingparaméterek törlése, biztonságos domainellenőrzés. A Shopping boltkártyái dinamikusak; 12-nél több esetén a rács belül görgethető, a standard kártyák nem zsugorodnak túl.
- merchant-search-v1.js: ismert boltok natív találati keresői; ALDI, Shoperia és új boltok jelzett, domainre szűrt külső webkeresése.
- merchant-basket-v1.js/.css: a 11 nem Tesco egyboltos Bridge teljes listás előkészítése egy gombbal, mentett hivatkozások külön megjelenítése. A Tesco Golden v3 forrás érintetlen.
- basket-matrix-v1.html/.js: összboltos, kategóriaérzékeny Full Basket Match; családi Supabase lista + opcionális mentett bolti/Tesco terméklinkek, egy kattintásos keresési mátrix, 50 termékes lapozható megjelenítés.
- shopping-local-v1.js: felhasználói azonosító szerint elkülönített IndexedDB read-through cache a családi listára és terméklinkekre. Supabase marad a hiteles forrás; nincs ár/token lokális tárolása vagy periódikus polling. Visszatéréskor a Bridge minimum 5 perc frissességi ablakot használ, és nem duplikál kezdeti oldalletöltéskor.
- SHO fő Shopping felületen megjelent a Boltok kezelése és a Teljes kosár belépő.

**QA:** 12 alapbolt és új 13. tesztbolt merge, kikapcsolt ALDI kizárása és biztonságtalan URL blokkolása sikeres. 11/11 nem Tesco Bridge: 4/4 családi tétel és 4/4 kötegelt keresés mock teszt sikeres; egy új custom bolttal és offline helyi cache-fallbackkel is. Az all-store mátrix 2 termék/4 aktív bolt/4 releváns keresési útvonal/1 Tesco-link online és cached-offline mock tesztje sikeres. DB RLS aktív, 3 policy, kezdeti üres boltprefs tábla; próbaadat nem került a felhőbe.

**Nem kész / UAT:** nincs hitelesen összekötött bolti ár- és készletfeed, automatikus SKU-egyezés, bolti kosárfeltöltés vagy garantált offline hidegindítás. A GitHub Pages közvetlen elérése e környezetből nem ellenőrizhető; Samsung Internet/HH ONE éles teszt nyitott.


## Full Basket Match V2: minden termék × minden aktív áruház · 2026-11-16

- Felhasználói hiba: az élelmiszerek (például 1 kg arabica szemes kávé) csak Tesco/Auchan/Kifli/ALDI boltokra szűrődtek, így kimaradt eMAG/Allegro/Alza/dm/Rossmann. A bolti kategória nem zárhat ki potenciális kereskedőt.
- Javítás: a basket-matrix-v1.js minden közös listás terméket minden aktív áruházzal párosít a bolti kategóriáktól függetlenül. Kizárólag a felhasználói enabled=false állapot zár ki boltot. A Tesco alapadatában a Divat & Stílus is szerepel. A Golden formátum és teljes felületű kattintható kereskedői kártyák megmaradtak.
- A 3. Golden stat csempe száma a lehetséges keresési utak száma, nem igazolt terméktalálat. A bolti találatok tényleges darabszámának/céltárgyának megállapításához új, ellenőrzött kereskedői adatforrás szükséges. Amíg nincs 0 találatot igazoló adat, az oldalon nem szabad nulla terméket állítani, és egy boltot sem szabad automatikusan tévesen elrejteni. Az ilyen automatikus 0 találatos rejtés továbbra is nyitott fejlesztés.
- A felületi szövegek a keresési útvonalat egyértelműen megkülönböztetik az igazolt találattól. Cache-bust: basket-matrix-v1.js?v=4, valamint a főoldali store-registry és store-connect verziója frissítve.
- QA: mock Supabase 18 aktív termékkel és 12 aktív bolttal 216 keresési útvonalat ad; az arabica kávé mind a 12 boltnál szerepel, beleértve eMAG, Allegro, Alza, dm, Rossmann. ALDI kikapcsolva: 11 aktív bolt, 198 útvonal, ALDI nélkül. DOM hivatkozások, script szintaxis rendben. Valódi bolti találati visszaellenőrzés és Samsung UAT külön lépés.
