# HealthHub · Galaxy Watch jövőbiztos adatmodell (Watch4 / Watch5 Pro / Watch9 / későbbi modellek)

**Státusz:** adatfogadási szerződés és fejlesztési terv, **nem működő új adatgyűjtő**. A Samsung Health SDK v1.1.0 jelenlegi Android olvasója aktivitást, lépéseket, emeletet és edzést gyűjt; a Health Connect-exportáló a felsorolt egészségügyi alaprekordok egy részét már támogatja.

## Kötelező architekturális alapelv

A HealthHub ne a Galaxy Watch konkrét generációjára épüljön. Egy új óra és egy később megjelenő API csak új adaptert/capability listát igényeljen, ne adatbázis- és UI-újratervezést.

- **Device Registry:** per-profil nyilvántartott eszközök, modelljelzés, típus, adatforrás, API-képességek, utolsó valóban sikeres olvasás (nem találgatott akkumulátoradat).
- **Observation Envelope:** közös, verziózott rekord a `schemas/device-health-observation-v1.schema.json` fájlban. Mindig tartalmazza a tulajdonos profilt, forrásalkalmazást, eredeti eszközt ahol ismert, időbélyeget, mérésfajtát, hozzáférhetőségi állapotot. Nem tartalmaz valódi felhasználói egészségadatot.
- **Health Connect Adapter:** alaprekordok (pulzus, nyugalmi pulzus, SpO₂, vérnyomás, alvás, súly, testzsír, vércukor, lépések, edzések stb.), de egy engedély még nem jelent tényleges forrásadatot.
- **Samsung SDK Adapter:** csak a hivatalos gyártói SDK-val igazolt és engedélyezett adattípusokat olvassa. Samsung-specifikus pontszámokat (stressz, Energy Score, Sleep Score), bőrhőmérsékletet, HRV-t, légzési mutatókat és Galaxy Watch speciális adatokat kizárólag tényleges SDK-támogatás után kapcsolunk be.
- **Elérhetőségi állapotok:** `measured`, `missing`, `permission_denied`, `source_unavailable`, `unsupported`, `query_failed`. Hiányzó adatból nem lehet mért nulla; számított mezőn forrás és számítási módszer kötelező.
- **Forrás-eredet és deduplikáció:** Health Connect és Samsung SDK ugyanazt a mérést két eltérő csatornán is átadhatja. Először eredeti rekordazonosító és forrás, majd időintervallum/egység/érték-egyezés; összevonás csak igazolt szemantikai megfelelés esetén. Ne duplázzunk lépést vagy alvást.
- **Profilhozzárendelés:** egy telefonhoz kötött Zsolt/Mónika tulajdonosprofillal rendelkező készülék csak saját adatait töltheti fel. A pilot profil dropdown önmagában nem vált Samsung-fiókot.
- **Biztonság:** egészségügyi és eszközeredet-adatok csak engedéllyel; nyers diagnosztikai adatoknak ne legyen automatikus naplózása, és nyilvános GitHubba sem kerülhetnek.

## Fenntartandó mérési helyek

1. **Mozgás:** lépések, aktivitás, energiaköltség, távolság, edzésidő, tempó, szintemelkedés, emeletek.
2. **Keringés:** pulzus, nyugalmi pulzus, HRV, vérnyomás (csak engedélyezett és továbbadott érték, mért forrásjelöléssel).
3. **Légzés és SpO₂:** véroxigén, alvás alatti mérések, légzési mutatók (csak ha elérhetők).
4. **Alvás:** utolsó 24 óra, 30 napos naptár ugyanazzal a dátumválasztóval, mint Activity, kezdés/vég, fő alvás és szundi, fázisok, alváspontszám (ha az API elérhetővé teszi).
5. **Wellness:** stressz, energiapontszám, alvási tanácsadás *külön* gyártói kategória, nem szimulálunk Samsung-skálákat.
6. **Testösszetétel:** súly, testzsír, vázizomtömeg, opcionális hőmérsékleti adatok.
7. **Életmód:** vízbevitel, táplálkozás, energiabevitel a megfelelő forrásból.
8. **Eszközdiagnosztika:** utolsó sync és valódi elérhető képességek; óraakku/Bluetooth állapot csak ha támogatott adatforrás rendelkezésre áll.

## Minden modul UI-elve

- A meglévő HealthHub Activity **naptár/dátumszűrő és profilváltó** legyen a közös minta.
- Mobilos teljes szélesség, történeti 30 napos választó, aktuális nap/24 órás gyorsnézet, idővonal, mérési forrás.
- Üres mérésnél **„nincs adat”**; támogatás nélkül **„nem elérhető az órából / API-ból”**.
- Orvosi értékekre (vérnyomás, SpO₂, pulzus) a forrás, időpont, mértékegység, mérés módja látszódjon. Ne adjunk diagnózist pontszámokból.

## Megvalósítási kapuk

A) Forrás/adat-hozzáférés mátrix Watch4/Watch5 Pro/Watch9 modellekre, Samsung Health, Health Connect, Samsung Health Monitor és hivatalos Samsung SDK szerint. Ellenőrizni kell a konkrét ország/régió, modell és szoftververzió támogatását.

B) Konkrét adatforrásonként olvasási teszt, jogosultságok és telefonon látott Samsung Health-értékekkel való összevetés.

C) Verziózott adapterréteg megírása és kétforrású deduplikáció tesztje, a mostani JSON-ok visszamenőleges olvashatóságával.

D) Eszközregiszter, képességjelzés, adatforrás-választás és telefononkénti profilbiztonság.

E) Központi Dropbox/cloud és háttérszinkron csak külön kipróbált, naplózható, hibabiztos és jóváhagyott pipeline után.

**Nem ígért funkció:** egyes Samsung-zárt pontszámok, stressz, EKG, vérnyomás vagy egészségügyi trendek olvasása akkor sem biztos, ha az adott óra vagy Samsung Health felület mutatja őket. Helyet készítünk nekik; az adatgyűjtést csak bizonyított API esetén engedélyezzük.
