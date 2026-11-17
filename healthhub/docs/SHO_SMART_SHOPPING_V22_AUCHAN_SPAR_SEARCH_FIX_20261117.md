# SHO Shopping V2.2 · Auchan és SPAR keresési találatok javítása

**Dátum:** 2026-11-17

## Felhasználói hiba
A 3 boltos Smart Search pilotban a Tesco találati listája megfelelő volt, az Auchan és SPAR áruházaké nem.

## Közvetlen okok
1. A SPAR keresés `destination('spar', term)` függvénye teljesen figyelmen kívül hagyta a terméket, minden keresés ugyanarra a Wolt SPAR-üzletválasztóra vezetett.
2. A képes Open Food Facts kártyák Auchan keresőjének a `p.name + p.brand + p.quantity` összefűzött szövegét adtuk át, ami túl sok szűkítő elemet és ismétlődő adatokat tartalmazhatott.
3. A teljes, 1,5%, 1 l, márkát is tartalmazó keresőszöveg Auchannál gyakran túlzottan leszűkíti a natív találati listát.

## Javítás
- **Tesco:** teljesen változatlan működés és URL-képzés.
- **Auchan:** a felhasználó által korábban elfogadott dupla URL-kódolású `q[]` keresőformátum megmaradt. A keresőszöveg alapértelmezetten a kategóriát és a fontos kifejezéseket tartja meg (például „laktózmentes UHT tej”, „arabica szemes kávé”). Az eredeti kiszerelés és százalék a SHO keresőmezőjében látható, a bolti választáskor ellenőrizni kell. A képes jelölteknél az Auchan a termék nevét használja, nem az OFF márkát/kiszerelést külön is hozzáfűzve.
- **SPAR:** nincs ellenőrzött natív Wolt-termékkeresési deep link, ezért a fő gomb a tényleges terméknévből **kifejezetten Wolt SPAR-oldalakra szűrt, Google-indexelt találati keresést** indít. Ezt a UI „Webes találatok” néven jelöli, **nem** közvetlen kereskedői keresőnek. A külön „SPAR üzletek a Wolton” gomb a hivatalos, ellenőrzött Wolt SPAR-üzletlistát nyitja meg.
- A képes Product Match kártyákon most Tesco, Auchan és SPAR külön keresője érhető el; a Tesco eredeti, sikeres termékszövege megmaradt.
- A háromáruházas oldal, az előző HTML, CSS és JavaScript gyorsítótár-verziói frissültek, a Golden 12 boltos főképernyő elrendezése változatlan.

## Funkcionális határok
A SPAR **Google-indexelt** Wolt-termékoldal találatai nem élő SPAR-termékfeed. Az online találatban látott név/fotó/kiszerelés, bolti ár, aktuális készlet és szállíthatóság az adott Wolt SPAR-üzlet oldalán ellenőrizendő. Tesco és Auchan áruházi keresői sem szolgáltatnak automatikus hiteles árfeedet a SHO-nak. Nincs új fiók-adat-hozzáférés, kosárművelet, vásárlás vagy Supabase-adatmódosítás.

## Próbák
1. Keresés „laktózmentes UHT tej 1,5% 1 l” → Tesco saját kereső, Auchan széles laktózmentes UHT tej-lista, SPAR Wolt-oldalakra szűrt webes találatok.
2. Keresés „100% arabica szemes kávé 1 kg” → Auchan kulcsszavak „arabica szemes kávé”; SPAR webes találatok a szemes kávé SPAR/Wolt-oldalairól.
3. SPAR „SPAR üzletek a Wolton” → önálló Wolt üzletválasztó.
4. Képes termékjelölt → Auchan nem kap OFF-ból külön hozzáfűzött márkát és kiszerelést, Tesco változatlan.
5. Mobil visszalépés és Smart List-bejelentkezés változatlan; közös bevásárlólista csak olvasott. Készülékes UAT szükséges.

## Ellenőrzési források
- SPAR hivatalos Wolt-partnerség: https://www.spar.hu/wolt
- Valós Wolt SPAR-termékoldalak: https://wolt.com/hu/hun/budapest/venue/sparszupermarket-nyugatiter/items/laktozmentes-83
- Wolt hivatalos SPAR üzletválasztó: https://wolt.com/hu/hun/budapest/brand/spar
- Auchan keresési formátum: felhasználó által korábban kipróbált `auchan.hu/shop/search?q%5B%5D=` URL.
