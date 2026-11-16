# Léna Recept Studio: Local-First képkártya-pilot V1 (2026-11-16)

## Mit gyorsítunk?

A Recept Studio már rendelkezett saját, helyi IndexedDB-recepttárral és Puter-alapú felhőszinkronnal. Ez a változtatás NEM migrálja vagy felülírja ezt, hanem az első megjelenítést előrehozza, és az egyszer már letöltött **Puter receptkártyaképeket** újrafelhasználja.

- A saját helyi receptkártyák betöltése és első képernyőre rajzolása a felhőlekérdezések előtt történik.
- A Puterbe bejelentkezett felhasználó azonosítójához kötött IndexedDB `lena-recept-studio-asset-cache-v1` a már letöltött receptkártyafájlokat tárolja.
- Helyben meglevő képfájlt nem kérünk le még egyszer a Putertől, ha a `updatedAt` változatlan. Új vagy módosult kártyát az eredeti Puter-forrásból olvasunk.
- A felhőkatalógust sikeres ellenőrzés után 15 percig frissnek tekintjük; a kézi Felhőfrissítés / explicit felhő-szinkron kikerüli ezt a várakozást. A megnyitási és fókusz-szinkron a korábbi 30 mp helyett legalább 15 percet vár.
- A felhőkártyák helyi képeit a Puter-fiók szerint választjuk szét; kijelentkezés/fiókváltás nem nyitja meg az előző fiók képeit.
- 250 MiB a **kidobható felhőkép-cache** puha korlátja. Csak ebből lehet automatikusan régi másolatot törölni; a saját/szerkesztett receptek és a függőben lévő módosítások soha nem törlődnek.
- A Local Storage Monitor új **Recept Studio** kártyán jelzi: lokális saját receptek képblobmérete, Puter képkártyacache, darabszám és a tárolt utolsó sikeres katalógusellenőrzés.
- Nincs Supabase-szinkron, nincs plusz háttér-polling, nincs generatív AI-hívás a cache miatt.

## Korlátok, kockázatok

- A helyi IndexedDB másolat **nem biztonsági mentés**. Böngészőadatok törlésével, tárhelyszűke miatti evikcióval elveszhet.
- Az offline képnézegetés a helyi fájlokra és a már cache-ben lévő Puter képkártyákra vonatkozik; **nem garantáljuk, hogy a teljes alkalmazás újranyitható repülő módban** (nincs új Service Worker ebben a változatban).
- A Puter-fiókazonosítás meglévő bejelentkezést igényel. Ha nincs igazolt fiók, a lokális saját receptek továbbra is elérhetők, de felhőből származó privát kártyák nem jelennek meg.
- A 15 perces ellenőrzési intervallum és a 250 MiB cache-cél hipotézis; tényleges hálózati adatforgalmat/első festést a Samsung S24 Ultra készüléken kell összehasonlítani.
- A Local Storage Monitor a **jelenlegi böngésző** adatait olvassa. Samsung Internet / Chrome / HH One WebView egymástól eltérő készlet lehet.

## Ellenőrzés

```sh
node --test recepttar-studio/tests/local-first-asset-v1.test.cjs
node --test healthhub/tests/recepttar-studio-puter-local-first-v1159.test.cjs
node --test sh9/local-storage/local-storage-monitor-v1.test.cjs
node --test healthhub/tests/nutrition-cookbook-bridge-v1154.test.cjs
```

**Manuális Samsung teszt:** ugyanabból a böngészőből előbb nyisd meg a Studio recepteket, majd újratöltés / offline visszatérés / 15 perces frissítés; ellenőrizd, hogy a frissített kártyák változnak, a nem változó képek nem töltődnek újra, a saját mentett receptek és a HealthHub 320g naplókapcsolat működnek. A felületi éles teszt még szükséges.
