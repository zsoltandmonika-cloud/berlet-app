# SHO Book Studio · V1

## Hol található
- SHO → Szórakozás → **Book Studio** külön, teljes szélességű promókártya.
- A mozi / színház / koncertek / Home Media jóváhagyott négycsempés elrendezése változatlan.

## Elkészült
- Reszponzív Golden Standard könyvespolc, borítók (EPUB-ból, illetve a PDF első oldalából, ha kinyerhetők), vizuális borító-fallback.
- DRM-mentes EPUB/PDF feltöltés (max. 25 MiB), formátumellenőrzés, saját könyvek törlése.
- EPUB.js lapozható olvasó és PDF.js renderelés, sötét / világos / szépia mód, betűméret.
- Olvasási pozíció, könyvjelzők, kedvencek, cím/szerző keresés, folytatás kártya.
- Zsolt/Mónika profilváltás a meglévő `hh-profile` és Family Guard hozzáférési modell szerint.
- Supabase privát `hh-book-studio` Storage, `hh_book_studio_books` metadata + profile-scoped RLS.
- A korábbi SHO funkciók meglévő HTML/CSS/JS viselkedéséhez nem nyúlunk.

## Biztonsági modell
- Felhasználó csak a `hh_profile_access` által engedélyezett profil adataihoz és Storage-mappájához fér hozzá.
- Sem könyvekhez, sem borítókhoz nem készül publikus URL; a kliens az auth munkamenettel tölti le.
- Nincs service-role kulcs, anonim feltöltés, külső könyvfeltöltés, automatikus AI feldolgozás.
- Kizárólag saját / jogosan kezelt, DRM-mentes könyvek támogatottak.

## Fejlesztői ellenőrzés
1. SHO Szórakozás: jóváhagyott 2×2 fő kategóriák nem változnak, az új Book Studio-kártya kattintható.
2. A Family Guard bejelentkezés nélkül a könyvtár nem olvasható, a feltöltés tiltott.
3. Zsolt profil: EPUB + PDF feltöltés; borító; cím/szerző metaadat; lapozás; témaváltás; betűméret; kedvencek; könyvjelző.
4. Ugyanaz a profil másik eszközön: könyv és utolsó pozíció megjelenik.
5. Mónika profil: a Zsolt-könyv nem szerepel; saját feltöltés és külön pozíció.
6. Törlés: a táblából és a privát Storage-ból is eltűnik; a másik profil érintetlen marad.
7. Samsung S24 Ultra / Samsung Internet + Chrome desktop; kis kijelző és fekvő mód.
8. Nagy EPUB / PDF: lapozás után mentés, majd újranyitás; tiltott fájl, lejárt login és megszakított feltöltés kezelése.

## Ismert korlátok
- Nincs DRM, felolvasás / TTS vagy offline tárolás.
- A könyvön belüli teljes szöveges keresés még hiányzik. A könyvtári cím/szerző keresés működik.
- A borítók automatikus kinyerése a fájl tartalmától függ; hiányzó borítónál igényes helyettesítő grafika jelenik meg.
- A felületből a felhő és a jogosultság ellenőrizhető, de valódi mobilos végponttól végpontig QA még szükséges.
- V2: Léna AI Reading Buddy (magyarázat, fordítás, összefoglaló), explicit felhasználói aktiválással.

## Bevezetés
A HealthHub-Core projektben az additív `sho_book_studio_v1` és `sho_book_studio_created_by_index` migrációkat alkalmaztuk, a tároló privát; meglévő táblákhoz, szabályokhoz nem nyúltunk.
