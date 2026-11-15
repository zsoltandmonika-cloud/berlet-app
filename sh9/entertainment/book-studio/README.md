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


## V2 · OneDrive FIRST, közvetlen böngészős olvasás · 2026-11-15

**Elsődleges könyvtár:** a Microsoft-fiók `EBOOKS` nevű mappája és almappái.
Az app Graph `/me/drive/root/search(q='EBOOKS')` útvonalon megtalálja a mappát, majd csak EPUB/PDF fájlokat mutat. Több EBOOKS-mappa esetén választható a forrás.
Nem hardcode-olunk privát OneDrive elérési utat, fiókot, dokumentumlistát vagy jelszót a nyilvános GitHub kódba.

- Microsoft Graph **delegated Files.Read**, **User.Read** engedélyezés PKCE-vel; írás/törlés/megosztás nincs.
- A Microsoft OneDrive fájlja csak kattintáskor töltődik le a böngésző olvasójába, **nem kerül át a Supabase Storage-ba**.
- A Microsoft útmutató szerint Graph `@microsoft.graph.downloadUrl` használata kötelező SPA böngészős letöltésnél; a `/content` Graph CORS redirect problémás.
- A fájlok megjelenítése a meglévő EPUB.js/PDF.js olvasóval, könyvespolc képszerű címlapokkal (OneDrive fájlból borító metaadat automatikus kinyerése **nem kész**).
- Felhőben csak olvasási pozíció, könyvjelző, kedvenc, témamód és betűméret: `hh_book_studio_drive_progress_v2`, profilonként külön, a meglévő `hh_profile_access` RLS szabályokkal.
- Family Guard-belépés nélkül a OneDrive-könyvek olvashatók, de a progresszió szinkronja nem elérhető (ezt a felület jelzi).
- A korábbi kézi Supabase-feltöltés egy **külön opcionális** gyűjteményként érhető el, nem az alapértelmezett könyvforrás.
- Nem támogatott: DRM-védett könyvek, MOBI, offline könyvletöltés, OneDrive felhőbe történő írás.

### Egyszeri Microsoft-beállítás (felhasználói lépés szükséges)

A ChatGPT-hez kapcsolt Microsoft SharePoint/OneDrive token **nem használható** az SHO GitHub Pages alkalmazásban. A webapp saját, delegált Microsoft-belépést kér.

1. Microsoft Entra alkalmazás (vagy az SHO Naptárhoz használt, személyes Microsoft-fiókokat támogató SPA app) megnyitása.
2. Authentication → Platform **Single-page application** → új redirect URI:
   `https://zsoltandmonika-cloud.github.io/berlet-app/sh9/entertainment/book-studio/`
3. API permissions → Microsoft Graph → **Delegated → Files.Read** és **User.Read**. A `Files.Read` beleegyezés az adott OneDrive-fiók **fájljainak olvasására** jogosít, bár az SHO csak az EBOOKS mappát vizsgálja.
4. Book Studio → OneDrive → Microsoft csatlakozás. Ha van már SHO Naptár-konfiguráció a böngészőben, az App ID és e-mail automatikusan felajánlódik.
5. Egyszeri beleegyezés. A OneDrive-dokumentumok nem publikusak; nincs nyilvános megosztási link.

Böngészőben a rövid élettartamú Microsoft-hozzáférési token a sessionStorage-ban van, új munkamenetben ismételt belépés szükséges lehet. Nincs token / refresh token tartós felhő- vagy GitHub-tárolás. Natív WebView-hez külön MSAL natív bridge kell, ezért ezt a kör a rendszerböngészős SHO-ra készíti elő.

### V2 elfogadóteszt

- [ ] Valós Chrome/Samsung Internet Microsoft bejelentkezés és `Files.Read` beleegyezés.
- [ ] EBOOKS és EPUB almappák automatikusan megjelennek, eredeti fájl helyben marad.
- [ ] EPUB és PDF olvasás, folytatás, profilváltás és privát felhőkönyvjelző.
- [ ] Két profil és két külön eszköz; Family Guard kijelentkezés esetén olvasás megy, progresszió tiltott.
- [ ] Könyvlista olvasása közben semmilyen eredeti fájlt nem ír/töröl a rendszer.

QA forrás: `node --test sh9/entertainment/tests/book-studio-onedrive-v2.test.cjs`.


## Golden V3 · iBooks-szerű használat és OneDrive automatikus kapcsolat (2026-11-15)

- Eredeti OneDrive-fájl **csak első megnyitáskor** töltődik le. Utána az azonos Microsoft-fiókhoz, OneDrive-fájlazonosítóhoz és ETag / módosítási verzióhoz kötött helyi IndexedDB-gyorsítótár szolgálja ki a megnyitást. Maximum ~230 MB össz-cache / 80 MB könyv, LRU-közeli időalapú takarítással. A fájlok eredetije nem másolódik a Supabase-be és nem módosul.
- Bejelentkezési munkamenet: `offline_access`, az engedélyezett Microsoft SPA eredeti 24 órás korlátját figyelembe vevő automatikus refresh (23 óra után nem használható). A refresh token izolált böngészős IndexedDB-ben **nem kinyerhető WebCrypto AES-GCM kulccsal titkosítva** tárolódik, a hozzáférési token sessionStorage-ban. Ezt nem szabad szerveroldali, évekre megújuló automatikus hozzáférésnek nevezni. Előzetes sikeres Microsoft-belépés után a böngésző megkísérel egy legfeljebb 4 óránkénti first-party top-level `prompt=none` SSO-újrabelépést. Microsoft új engedélyt kérhet; manuális gomb marad. A fiók változásakor a hitelesítés törlődik, a kijelentkezés automatikus újrabelépést tilt.
- Valódi EPUB borító a fájl OPF manifest `cover-image` referenciájából és PDF első oldalának bélyegképe. A miniatűr csak felhasználói könyvmegnyitáskor vagy külön `Eredeti borítók` gomb után készül, sosem teljes OneDrive tömeges háttérletöltésként. A miniatűrök is az adott eszközön cache-elődnek.
- `Gyorsítótár törlése` az **aktuális Microsoft-fiókhoz tartozó** eszközön tárolt eBook fájlokat és képeket törli a OneDrive módosítása nélkül.
- Olvasó: olvasható 920 px max. laptest, valódi paginált EPUB, PDF léptetés, érintéses horizontális swipe, széli koppintás, billentyűzet, vizuális finom lapfordító effekt, fejezetlista, `Folytatom`, EPUB CFI / PDF oldalszám, helypozíciós csúszka (EPUB locations generálása után), Fókusz mód, téma/karakter méret.
- HD vizuál: 2 Unsplash fénykép alkotja a sötét üveges Book Studio könyvtármontázst. A két külső dekoratív háttérfotó **nem kerül a GitHub repo binary fájljai közé**, betöltés hiányában színátmenetes fallback. Source photography: Unsplash photo IDs `1647793294248-4a3187b0d6a6`, `1623771702313-39dc4f71d275` (Unsplash license). A valódi könyvborítók helyi könyvfájlból származnak.

### V3 QA és felhasználói validáció

- Statikus/regressziós tesztek: `node --test sh9/entertainment/tests/book-studio-*.test.cjs`.
- **Elvárt manuális próba**: frissen bejelentkezve 1 EPUB első megnyitás (OneDrive hálózati letöltés), bezár/újranyit (cache, nem kér második letöltést), könyvborító megjelenik; egy PDF ugyanez. Böngésző újraindítása után Microsoft SSO (esetleg consent) és helyi cache. Laptop/telefon külön helyi cache, felhőprofilok olvasási helye külön tárolódik.
- Ha kijelentkezés után a böngésző IndexedDB-jében személyes könyvfájlok maradnak, külön `Gyorsítótár törlése` használata szükséges, ez biztonsági és tárhelyhasználati tradeoff. Natív WebView Microsoft Auth integráció továbbra is külön feladat.
- Az EPUB-szöveges keresés és a Léna AI Buddy még nem kész.

## Golden V4 · 2026-11-15 · Cím, borító, duplikátum, S24 Ultra layout

- Automatikus eredeti borítók **BE** alapbeállítással, felhasználó egy kattintással kikapcsolhatja. A feldolgozás soros, legfeljebb 95 MB automatikus fájlforgalom / indítás, 20 MB / könyv; `saveData` és 2G kapcsolat esetén automatikusan szünetel. Az eszközön korábban gyorsítótárazott borítók azonnal megjelennek. **Nem biztos**, hogy minden EPUB-ban van felismerhető borítókép; ilyen fájlnál marad a grafikus címlap.
- Cím/szerző automatikus normalizálás magyar ékezetekkel és tipikus release-tag eltávolítással, plusz **✎** címszerkesztő a OneDrive-kártyákon. Az egyedi megjelenítési módosítás az adott böngésző `localStorage`-ában, Microsoft-fiók/drive/file-ID alatt tárolódik. Az eredeti OneDrive-fájlnév változatlan.
- **Nem destruktív deduplikáció**: ugyanazon normalizált cím és ismert szerző alatt egy reprezentáns könyvet mutatunk, a többi alapból el van rejtve. A kapcsolóval az összes példány visszahozható. A valós OneDrive-fájlok automatikus törlését **kifejezetten nem implementáljuk**: csak `Files.Read` jogosultság van, és könyvazonosságot nem igazol pusztán a fájlnév.
- A OneDrive admin csatlakozási panel a **könyvtári oldal legvégére** került, felül kompakt kapcsolatjelzés és link marad.
- Olvasó: erősebb sötét-világos kontraszt, egységesebb bekezdés- és fejezetstílus, visszafogottabb oldalfordító effekt, alapból halk, kikapcsolható mesterséges papírlap hang. A hang a böngésző hangengedélyezésétől függ, csendes mód által blokkolható.
- Entertainment: nagy, telefon-szélességű (S24 Ultra) Book Studio fotóalapú hero; alatta **külön horizontális, lapozható vizuális könyvespolc**. A polc csak az aktuális böngésző helyesen bejelentkezett Microsoft-fiókjának korábban betöltött, lokális IndexedDB borítóit és könyvcímeit használja. Első látogatáskor generált címlapok szerepelnek, Graph-kérést nem indít az Entertainment.
- Könyvborító kattintása a külön Book Studio olvasóba vezet és sikeres bejelentkezés után az adott könyvet próbálja megnyitni. A négy eredeti Entertainment fő kategória és meglévő kedvencek változatlanok.

**QA:** `node --test sh9/entertainment/tests/book-studio-*.test.cjs` célzott regressziós ellenőrzés. A külön `SH9 · Edge Installable PWA QA` régebbi pipeline nem kapcsolódó legacy hibája nem bizonyít Book Studio-regressziót. Élő Samsung Internet/Chrome, 2 profil és az eredeti EPUB/PDF olvashatóság tesztje szükséges.
