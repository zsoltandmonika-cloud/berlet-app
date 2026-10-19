# HealthHub Medical Intelligence · Research Data Preservation Rule (v700)

**Tulajdonosi korrekció, 2026-10-19:** Az Ask Léna fejlesztési célja nem néhány orvosi idézetből működő válaszgenerátor, hanem az eredeti, teljes egészségügyi adatokból kutató személyes intelligencia.

## Kötelező adatrétegek, mindegyik megőrzendő
1. **Eredeti forrás:** az összes eredeti magán PDF (külön a korábban tulajdonosi döntéssel kizárt Watch EKG-k is megmaradnak eredetiben), eredeti tartalom, fájlazonosság és forrás SHA-256.
2. **Teljes oldalszöveg:** privát `hh_kb_documents` + `hh_kb_pages`, minden kinyert oldalszöveg UTF-8 adata, ellenőrzött szöveg SHA-256. Nem írható felül rövid összefoglalóval.
3. **Strukturált klinikai megfigyelések:** `hh_mkb_facts`, `hh_mkb_evidence`, idézet, eseménydátum, oldalszám, forráskapcsolat, review státusz. Hasznos, visszakereshető és bővíthető, de önmagában NEM a teljes orvosi tudás.
4. **Értelmezések és történeti kapcsolatok:** dátumozott, a forrásból bizonyítható megállapítások; bizonytalanság, orvosi felülvizsgálati státusz és korábbi értelmezések megkülönböztetése.

**Prohibitions:** Az eredeti PDF-ek, oldalszövegek és idézetek között tilos adatvesztéses helyettesítést végrehajtani. Az idézetréteg átmeneti 4/6 vagy 12/12 értéke, valamint az AI-kérésben szereplő 5 kivonat korlátja NEM jelenthet teljes leletkutatási korlátot.

## Kutatás vs AI-átviteli keret
- **Keresési tér:** a profilhoz tartozó összes teljes, ellenőrzött indexelt PDF-oldal, nem csak a címek vagy a strukturált idézetek. Felhasználó saját célú kutatáshoz hozzáférhet az összes, saját profilján engedélyezett forráshoz.
- **Releváns forráskiválasztás:** típus, eredeti leleten olvasható dátum, kérdés, fontos mérési eredmények és időbeli alakulás. Ne keverjük össze a feltöltési dátumot a vizsgálat időpontjával.
- **Válaszkészítés:** több forrás összevetése és a ténylegesen elolvasott eredmények bemutatása, oldalszámmal; az AI-hívás aktuális kontextusméretének kezelése nem jogosít adatok törlésére vagy a teljes korpusz helyett kis összefoglaló kizárólagos használatára.
- **Az idézetek szerepe:** állítások nyomon követése, nem a kutatható adatok kapuja vagy felső határa.
- **Hiba:** AI-hívás hibájánál leletcím-listából vagy 38/0 helyi index-számból soha ne állítsuk, hogy az eredeti leletek tényleges tartalma kiértékelésre került.
- **Minimum védelem:** azonos betegprofil, felhőhozzáférés, titkosság, byte/szövegintegritás; a felesleges ismétlődő UI-engedélyezések kivehetők, nem az adatbiztonsági határok.

## Kiinduló állapot, ellenőrzött tények
- Mónika: **164** technikailag feldolgozott PDF, **269** tárolt ellenőrzött oldal. A v699 listában **163** külön kanonikus fájl látszik, mert egy azonos tartalmú eredeti duplikátumként kapcsolt. A 164 PDF nem sérült, nem lett törölve.
- Zsolt: **43** technikailag feldolgozott PDF, **68** ellenőrzött oldal.
- Az MKB idézetaudit `4/6` vagy `12/12` számai nem fedettségi százalékok. Idézetellenőrzés ≠ orvosi diagnózis-ellenőrzés.
- A v700 fejlesztői ág jelenlegi kontextusrangsorolása még maximum 5 idézetet tud egy hívásba adni. Ez **nem felel meg egyedül** a teljes kutatási cél elérésének; csak tényleges, kontrollált többforrásos tartalomkutatás után jelölhető USER ACCEPTED-nek.

## Kiadási kapu
- Regressziós teszt: minden jogosult oldal része a kereshető jelöltkorpusznak; egyik sem tűnik el strukturált idézet hiányában.
- Kérdésteszt: „Foglald össze a legutóbbi leleteimet” különböző PDF-ekből olvassa ki a leletértékeket, nem pusztán címlistát.
- Eltérő dokumentumok és egymást követő eredmények összevetése az oldalszintű idézetekkel, tényleges forrásokkal.
- A profilváltás és a visszavont jogosultság továbbra is megállítja a hozzáférést; eredeti dokumentumra vagy adathordozóra nincs írás.
- Élő S24 Ultra teszt, valódi működés, nem pusztán zöld GitHub CI.
