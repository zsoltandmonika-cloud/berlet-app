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