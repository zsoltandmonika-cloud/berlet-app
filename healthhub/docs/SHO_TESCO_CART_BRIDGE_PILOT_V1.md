# SHO · Tesco Smart Cart Bridge v1 · 10 termékes pilot
**Dátum:** 2026-11-15 · **Állapot:** GitHubra mentve; belső funkcionális és jogosultsági ellenőrzés sikeres; valódi Tesco- és Samsung-telefonos UAT még szükséges.

## Cél
Az elfogadott **Smart List v14** és a Tesco Otthonról közötti biztonságos, felhasználó által vezérelt, termékenkénti bevásárlókosár-átadás kipróbálása. Automatikus, kereskedő által igazolt, tömeges kosárfeltöltés **NINCS**; ilyet a Tesco publikus dokumentációja és a jelenlegi SHO-integráció nem támaszt alá.

## Megnyitás
1. SHO → Shopping → „BOLTOK & VALÓDI TERMÉKEK” → **🛒 Tesco Pilot 10**.
2. Direkt tesztoldal: `/berlet-app/sh9/shopping/tesco-pilot.html`.
3. A pilot a Smart Listtel azonos Supabase Auth / családi profilkapcsolatot használja. A Tesco oldala külön nyílik meg.

## Források és valódi műveletek
- **Közös Smart List**: maximum 10 legújabb, **még nem megvett** rekord, olvasva a `public.hh_shopping_list_v1` táblából. A pilot ezen a táblán **soha nem hajt végre INSERT/UPDATE/DELETE** műveletet. A később jelölt „Megvettem” továbbra is a Smart List felelőssége.
- **10 mintatermék**: statikus tesztkészlet (tej, kenyér, banán, tojás, penne, rizs, szemes kávé, paradicsom, víz, joghurt). A DEMO állapot független a családi Smart Listtől, de a pilot saját állapotát a családi felhőbe menti. Tesztmódban sem szabad létrehozni Smart List elemet.
- **Tesco keresés**: minden termékből hivatalos, URL-kódolt `https://bevasarlas.tesco.hu/shop/hu-HU/search?query=...` link képződik. A keresés Tesco-fiókot, címet vagy szolgáltatási idősávot kérhet.
- **Terméklink megjegyzése**: opcionális, manuálisan bemásolt Tesco-termékoldal. Csak `https://bevasarlas.tesco.hu/(shop|groceries)/hu-HU/products/[0-9]+` elfogadható. A linket a Supabase CHECK és a kliens is ellenőrzi, és a következő megnyitáskor a mentett termékhez vezet.
- **✓ Kosárba tettem**: **kézi felhasználói visszajelzés**, nem Tesco API-visszaigazolás. Ugyanazzal a gombbal visszavonható. A 0/10 progress kizárólag az ilyen kézi jelölésekből áll.
- **↻ Jelölések nullázása**: a látható legfeljebb 10 termék jelölését nullázza, **a terméklinkeket nem törli**.
- A Tesco tényleges fizetése, rendelése és kosárba helyezése kizárólag a Tesco felületén történik. A SHO nem kéri el a belépési adatokat, nem mutat ellenőrizetlen árakat, nem állít készletinformációt.

## Fájlok és éles beállítás
- Új UI: `sh9/shopping/tesco-pilot.html`.
- Új motor: `sh9/shopping/tesco-pilot-v1.js`.
- Belépési gomb: `sh9/shopping/index.html`, Store Connect keresése mellett, az eredeti Golden hero és 2×2 kategóriák érintése nélkül.
- CTA-stílus: `sh9/shopping/store-connect-v2.css` + HTML CSS cache-busting.
- Családi adatbázis: `public.hh_shopping_tesco_bridge_v1`. A `(household,item_key)` kulcs egyedi; `source` demo/shared, `tesco_url`, `manually_in_basket`, `confirmation_by_profile`, `updated_by_profile` mezők, RLS és Realtime. Migráció: `sho_tesco_pilot_bridge_family_state_v1`.
- RLS SELECT/INSERT/UPDATE: jogosult Zsolt/Mónika profil; `anon` nem fér hozzá a táblához; DELETE nem szükséges a pilot működéséhez.

## QA és korlát
- Forgatókönyv-alapú, mesterséges DOM + Supabase-mock teszt: **13/13** ellenőrzés sikeres, beleértve a 10 demo sort, 1 valódi Smart List sort, keresőlinket, linkdomén-ellenőrzést, felhős kézi jelölést, visszavonást és a darabszám-progresst.
- Supabase: RLS igazolt, 3 profilhoz kötött policy, Realtime engedélyezve, `anon` SELECT tiltva. Teszt SQL tranzakció sikeres és visszagörgetett, 0 tesztrekord maradt.
- Nem tesztelt: Tesco-fiókos valódi vásárlás, Tesco termék- és időablak-függő állapot, Android WebView/böngésző-visszalépés, kéttelefonos Realtime vizuális teszt.
- A korábbi, független, helyi Shopping Smart Basket és Wishlist sem törlődik, sem nem migrálódik. A Smart List v14 kódja és elfogadott kinézete változatlan.

## Az elfogadási próba
10 mintatermék megjelenik → Tesco kereső megnyílik a kiválasztott termékre → a felhasználó a Tesco saját felületén kiválasztja és kosárba rakja → a SHO-ban kézzel ✓-el jelöli → a 0/10 mutató növekszik → ugyanazon családi profil/telefon frissítés után megmarad → másik családi eszközön is látszik. Az utolsó két lépést éles készülékeken kell még ellenőrizni.

## Hivatkozás
- Tesco hivatalos vásárlási folyamat: https://bevasarlas.tesco.hu/shop/hu-HU/zone/hogyan-rendelj-online
- Tesco hivatalos hozzáadás / mennyiség: https://www.tesco.hu/help/hu/pages/tesco-otthonrol/hogyan-vasarolhatok/hogyan-tudok-egy-termeket-a-kosarba-tenni-illetve-a-kosar-tartalman-kesobb-modositani
