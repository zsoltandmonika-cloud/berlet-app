# HealthHub v695 · 4 meglévő PDF visszacsatolása a mobilon, Léna magyarázatával

## Miért szükséges?
Valós felhasználói teszt: Mónika régi leletei mobilon megnyílnak; csak a 2026.10.16-i négy dokumentum (Entresto, Forxiga, Inspra, echokardiográfia) hibás. A PC-n négy eredeti PDF van helyben, a mobilon nincs. A sima újraimport korábban azonos SHA-256 esetén duplikátumként kihagyta az eredeti fájlbájtokat; így a mobil PDF-néző továbbra is üres maradt.

## Kézzel indítható, egészségügyi adatokat védő helyreállítás
- A felhasználó az eredeti, változatlan négy PDF-et és egy SHA-256-tal társított `healthhub-explanations.json` fájlt tartalmazó ZIP-et kap.
- A ZIP deklarált `importMode` mezője `restore-existing-originals`; minden más ismeretlen értéket az import elutasít.
- **Csak az aktív Mónika-profilon, pontosan négy PDF és négy magyarázat esetén** engedélyezett a visszacsatolás.
- A fájlok bájtjainak SHA-256 lenyomata egy meglévő, azonos profilú dokumentumindex-record hash-értékével és a manifesttel egyezik. A fájl neve is a manifestben rögzített.
- Ha van helyi eredeti, annak bájtjait soha nem írjuk felül; ha hiányzik, a PDF-tárolóba `add` művelettel kerül a meglévő dokumentum azonosítóján.
- Ha a magyarázat már kézzel megadott vagy meglévő importált, nem írjuk felül. Új Léna-magyarázat csak hiányzó esetén kerül a korábbi lelethez.
- Ha valamelyik PDF-hez nincs pontos hash-egyezés, a dokumentumot nem illesztjük rossz rekordhoz és **nem hozunk létre új leletet**. Az eredményjelentés megszámolja a visszacsatolt, már meglevő és azonosítatlan dokumentumokat.
- A művelet **csak helyi telefonos** eredeti-visszacsatolás. A Google Drive és Dropbox archívum nincs módosítva. Az általános `hhSyncFullMigrationDashboard` felhőszinkron ilyenkor nem indul.

## Importálás és elfogadás
1. A felhasználó a ZIP-et saját telefonjára letölti; nem szükséges manuálisan kicsomagolni.
2. HealthHub v695 betöltés ellenőrzése, Mónika-profil kiválasztása.
3. Leletek → Új lelet feltöltése → egyetlen ZIP kiválasztása → az importáló a helyreállítási módot jelzi.
4. `Eredetik biztonságos visszacsatolása` → visszajelzés `Eredeti PDF visszacsatolva: 4` és `Léna-magyarázat: 4` (utóbbi kevesebb lehet, ha volt már).
5. Ugyanazon négy lelet mobil megnyitása; minden PDF és Léna-magyarázat ellenőrzése.

## Korlát
Ha az adott mobilos dokumentumindexben nincs érvényes vagy egyező SHA-256, a ZIP *szándékosan* nem telepít új leletet; külön, dokumentált azonosítás kell. Nem állítható LIVE VERIFIED addig, amíg mind a négy valóban nem nyílik meg a készüléken. A v694 privát szerveroldali feltöltési funkció korábban blokkolva volt, nem került telepítésre; ez a v695 megoldás ettől függetlenül, kizárólag helyben működik.

## Magyarázatok
A négy magyarázat az eredeti dokumentumokhoz fűződik, különösen:
- Entresto 24/26: a javaslat szerinti 2×24/26 mg nem azonos automatikusan a ténylegesen szedett adaggal; orvossal tisztázandó.
- Forxiga 10: javaslat szerinti 1×10 mg, szívelégtelenségben is használatos.
- Inspra 25: javaslat szerinti 1×25 mg; kálium- és vesefunkció-kontroll fontos, különösen Entresto mellett.
- Szívultrahang: 2026.10.16., EF 55%, közepes fokú mitralis és tricuspidalis regurgitatio, jó bal/jobb kamrafunkció, nincs pericardialis folyadék.
