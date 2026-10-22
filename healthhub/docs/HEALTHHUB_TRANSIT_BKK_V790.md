# HealthHub Transit v790 · BKK járatok a Family Guard 3D térképén

**Állapot:** CODED → CI TESTED / MOBILE QA pending. A hivatalos GTFS-pillanatkép a külön, napi GitHub Action folyamatból érkezik. Amíg nem publikált adatállományt, a felület ezt egyértelműen jelzi, és **nem rajzol fiktív járatvonalat**.

## Első három járat
- **260-as busz** (alapértelmezetten kijelölve)
- **17-es villamos**
- **19-es villamos**

Mindegyik külön kipipálható. A `Mutasd` gomb az adott vonal BKK-adatokból generált teljes menetrendi útvonalára közelít. Megállóink a hivatalos GTFS `stops.txt`, `stop_times.txt`, `trips.txt`, `shapes.txt`, `routes.txt` állományokból származnak.

## Adatforrás és licenc
**Adatok forrása: BKK Zrt., CC BY 4.0.**
- https://opendata.bkk.hu/data-sources
- https://go.bkk.hu/api/static/v1/public-gtfs/budapest_gtfs.zip
- Alternatív BKK GTFS: https://bkk.hu/gtfs/budapest_gtfs.zip
- Licenc: https://creativecommons.org/licenses/by/4.0/

Nincs BudapestGO-fiók vagy BudapestGO-kedvencszinkron, nincs privát API-kulcs, nincs valós idejű járműkövetés ebben a kiadásban.

## Architektúra
- Generátor: `healthhub/guardian/build-bkk-routes-v790.py`, Python stdlib, ZIP és CSV validáció, hiányos feed esetén fail-closed.
- Pipeline: `.github/workflows/healthhub-transit-bkk-v790.yml`, napi hivatalos GTFS-letöltés és ellenőrzött `bkk-routes-v790.json` generálás a GitHub Pages forrásba. Az adatfájl GitHub Actions által létrehozott commitja esetén Pages frissítését külön ellenőrizni kell; ha GITHUB_TOKEN esemény nem vált ki deployt, a publikációs mechanizmus korrekciója szükséges.
- Kliens: `guardian-transit-v790.js` és CSS, kizárólag forrásból származó vonalak és megállók, MapLibre színes, átlátható nyomvonal, saját választás per-browser localStorage, `hh-guardian-transit-selected-v790`.
- A Guardian meglévő `map` objektumát használjuk, új térképmotor nélkül. Hero / Buddy / tálca / GPS / Landmark nem változik.
- Frissesség: az időbélyeg megjelenik; 7 napnál régebbi adatnál figyelmeztetés. A GTFS nem garantál menetrendváltozás nélküli útvonalat; rendszeres újragenerálás szükséges.
- Térképes címkereső, Supabase-alapú közös járatkijelölés, élő járműpozíciók és útvonaltervezés **külön későbbi fejlesztések**.

## Ellenőrzési kapuk
1. JS syntax + DOM/MapLibre fake map teszt (járatok, pipálás, megállók, hibás data, nincs live).
2. Python szintetikus GTFS ZIP teszt (szűrés, shape/stop lánc, hiány esetén hibával leáll).
3. GitHub Action hivatalos adatlehívásának sikeres futása, JSON létezése a `main` ágon.
4. Élő GitHub Pages JSON-fájl elérhetősége és valós 260/17/19 adatainak helyszíni, telefonos ellenőrzése.
5. User Accepted csak tényleges kéttelefonos után.

**Fontos:** a forrás ellenőrizhetősége fontosabb, mint hogy az UI fiktív vonalakkal teljesnek tűnjön.
