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
