# SHO Local Storage Monitor V1 · 2026-11-16

## Feladat
Az SHO Admin felületén legyen **egy koppintással megnyitható, valóban mérő, csak olvasható** telefonos tárhelydashboard. A cél az SHO Local-First V22 Book Studio pilot validációja és a többi modul későbbi mérésének előkészítése.

## Elérés
SHO → Admin → **📱 Local Storage Monitor · Telefonos tárhely** → `/sh9/local-storage/`.

## Mért értékek
- `navigator.storage.estimate()` – az aktuális böngésző **teljes webhely-eredetének** becsült foglalása és kvótája. Nem az összes SHO-modul biztosan pontos, kizárólagos mérete; nincs szerveroldali adatforgalmi mérés.
- Book Studio helyi import: csak a `sh9-book-studio-device-library-v22` IndexedDB `books` rekordjai `size_bytes` és `cover.size` **metaadatai** alapján.
- Book Studio OneDrive könyv- és borítócache: csak a `sh9-book-studio-covers-books-v3` → `items` rekordok `bytes` metaadatai alapján.
- Egy ismert utolsó helyi módosítás (`updated_at`), valamint egy offline OneDrive-katalógus helyi mentési időpont (`synced`): egyik sem garantálja a felhő vagy az eredeti könyvforrás aktuális frissességét.
- Recept, Shopping, Smart Trip, MediaRadar és HealthHub: modulszintű bájtmérés **még nincs bekötve**. Pontos hamis méret nem kerül kijelzésre.

## Tárhelykeret
- Tervezési cél: **2 GB**.
- Figyelmeztetési küszöb: **4 GB**.
- Egyik sem böngészőkvóta, lefoglalás vagy érvényesített korlát.
- A monitor kizárólag jelzi a használatot; nem töröl cache-t, IndexedDB-t vagy eredeti fájlokat. Automatikus takarítás nem része a V1-nek.

## Adatvédelem és működés
- A kód nem hív `fetch()`-et, Supabase-t, Microsoft Graphot vagy analytics endpointot; a statikus oldal egyszeri betöltése jelent minimális hálózati forgalmat.
- Nincs folyamatos időzítő/polling, csak első megnyitáskor és **↻ Helyi mérés frissítése** koppintáskor mér.
- Könyvtartalom, dokumentumcímek, tokenek, személyes egészségügyi rekordok nem kerülnek megjelenítésre, kiolvasásra vagy továbbításra. A meglévő Browser IndexedDB API-n keresztül csak a megnevezett Book Studio táblák számításához szükséges rekord-metaadatokat olvassuk.
- A natív HH One WebView és a Samsung Internet külön tárhelyet használhat. A mérés csak az éppen megnyitott böngésző számára releváns.
- Ha `indexedDB.databases()` nem támogatott, a monitor **nem hoz létre új adatbázist**, hanem a modulszintű mérés támogatásának hiányát jelzi.

## Elfogadó teszt
1. Android Samsung Internetben, ugyanabból a böngészőből: Book Studio import → Admin → Local Storage Monitor → a helyi import könyvméretének és darabszámának ellenőrzése.
2. Mérés újranyitás és repülő üzemmód mellett: meglévő Book Studio metadata és böngészőstorage becslése megjelenik, ahol támogatott.
3. Mónika / Zsolt logikai profil: a teljes, **böngészőprofilonként összesített** könyvszám jelenik meg (nem személyenként elkülönített mérés).
4. Átlépés másik böngészőre: eltérő foglalás jogos, nem adatvesztés.
5. „Helyi mérés frissítése” nem töröl könyvet, nem küld felhőszinkront; a Book Studio állapota változatlan.
6. Mobilon 360px szélességen nincs vízszintes görgetés.

## QA
`node --test sh9/local-storage/local-storage-monitor-v1.test.cjs`

**Kiértékelés:** a statikus/regressziós teszt előzetesen sikeres (6/6). Valódi S24 Ultra Samsung Internet és HH One WebView felületi teszt még hátravan.
