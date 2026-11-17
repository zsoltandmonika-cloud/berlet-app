# SHO Kosár Match V2.1 · Képes, vonalkódos termékjelöltek

**2026. november 17. · V2.0→V2.1 bővítés**

## A felhasználó kérése
A Tesco + Auchan kosárpárosítás legyen több egyszerű keresőlinkeknél: valódi termékfotó, márka, pontos kiszerelés és később valódi ár. A Golden Shopping hero és 12 boltos áruháztábla nem változhat. A családi Smart List az alap, kézi árbevitelt nem kér a felhasználó.

## Megvalósult
- A Kosár Match V2.0-ban minden aktív Smart List tételnél megjelenik a **📸 Képes termékjelöltek** gomb a működő Tesco/Auchan találati linkek alatt.
- Csak felhasználói koppintásra küld kérdést a **már aktív, 2. verziójú** Supabase `sho-shopping-products-v1` Edge Functionnek. Nincs automatikus 50-100 termékes tömeges adatlekérés.
- Az Edge Function Open Food Facts terméknév, márka, kiszerelés, EAN/vonalkód és valódi katalógusfotó adatait adja. A meglévő `product-match-core-v21.js` valós adatai alapján legfeljebb 4 jelölt: erős vagy ellenőrizendő egyezés; az ismerten rossz %-os összetétel/kiszerelés kizárva.
- A fotó csak **`images.openfoodfacts.org`** vagy **`static.openfoodfacts.org`** igazolt HTTPS domainről tölthető be; hibánál neutrális jelölő. Nincs generált webshoptermék-fotó.
- Termékjelöltenként a már bevált hivatalos **Tesco** és **Auchan** keresőoldalának közvetlen linkje, valamint az OFF vonalkódos termékadatlap külön gombon.
- Katalógusadat-cache 10 perc a böngésző sessionStorage-jében, amelyet megoszt a 3 boltos Smart Product Match moduljával. Új hívások: maximum kettő percenként a Kosár Match felületéről, timeout 11 másodperc; az Edge Function saját további korlátot érvényesít.
- Offline, API-túllépés vagy nem releváns jelölt esetén korrekt visszajelzés, Tesco/Auchan bolti keresés zavartalanul megmarad.
- A mobilképernyőn a képes jelöltek 110px valódi fotókkal, könnyen nyitható bolti gombokkal. Az alap Golden áruházi panelek és a meglévő kosárszinkron változatlanok.

## Az árak státusza
Ez **valódi katalógustermék-azonosítás**, **nem** ellenőrzött Tesco/Auchan polci vagy online ár, készlet vagy áruházkosár-állapot. A készüléknek nem kell kézzel árat beírni.

2026-11-17-én ellenőrzött lehetséges, de **nem integrált** adatforrások:
- GVH állami Árfigyelő: https://arfigyelo.gvh.hu/ . Tesco/Auchan napi **bolti** árak egy meghatározott termékkörben; **nem igazolja** egy adott webshopkosár online árát, kiszállíthatóságát vagy készletét. Általános felhasználási feltételek: https://arfigyelo.gvh.hu/docs/arfigyelo_rendszer_AFF_latogato.pdf . Az adatok nagyobb léptékű újrahasznosításához a jogosultságot tisztázni kell.
- ReefAPI Tesco HU: https://reefapi.com/tesco-api , kereskedelmi API-ként hirdeti magát; előfizetés/jogosultság és tényleges minőség nem igazolt.
- GetRealPrice Auchan HU: https://getrealprice.com/auchan-hu-adatgyujtes , naponta frissített CSV/JSON/API termékárfeedeket kínál, de a nyilvános minta 2026.04.30-i, nem élő validált jelenlegi teszteredmény.

**Következő kapu:** Jogosított, friss, boltonkénti online bruttó ár + kiszerelés + termékazonosító + megfigyelési idő + várható szállítási díj. Csak ezzel engedhető a „legolcsóbb” ár szerinti rendezés és a kétboltos végösszeg. Új áruházi API vagy háttér-scrape nélkül most **nem** mutatunk árat.

## QA
A `.github/workflows/sho-basket-candidates-v21.yml` futtatja a V2.1 fotó/matching/cache/offline/rate-limit QA-t és a V2.0 Kosár Match + Golden V2 URL-regressziókat. Valós mobil UAT: termék kipróbálása a Smart Listből, 2 áruházi link, képes jelölt-választás, másodszori koppintás cache-ből, rossz kiszerelés kizárása, vissza gomb.

Biztonsági visszaállítás: `backup/shopping-before-basket-product-candidates-v21-20261117`.
