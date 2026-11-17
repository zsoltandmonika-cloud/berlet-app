# SHO · Kosár Match V2.0 · Tesco + Auchan-first
**Dátum:** 2026-11-17

## Cél és a ténylegesen megvalósított rész
A működő, 12 boltos Golden Shopping képernyő egyetlen teljes szélességű „⚡ Kosár match” CTA-jából induló képernyő most alapértelmezetten a **Tesco + Auchan** párosra koncentrál.

1. A hiteles, családi Supabase `hh_shopping_list_v1` aktív (`done=false`) elemeit olvassa, meglévő családi jogosultságellenőrzéssel. A már megvett tételek nem kerülnek be, offline IndexedDB-másolat esetén sem.
2. Minden tételnél alapból megnyitva jelenik meg a két hivatalos bolti kereső: **Tesco** és **Auchan**, további lenyitó kattintás nélkül. A Tesco működő URL-je változatlan; az Auchan a már validált, kiszerelésre kevésbé szűkítő keresőadaptert kapja.
3. **Összes bolt** kapcsolóval elérhető marad az összes engedélyezett áruház és minden korábbi mentett terméklink. Nem töröl áruházbeállítást, nem módosít Smart List-adatot.
4. A tételhez mentett exact SKU-hivatkozás továbbra is külön **„Mentett”** gombon érhető el. A mentett hivatkozás nem jelent újonnan hitelesített termékegyezést.
5. Három számláló: termék, kiválasztott aktív bolt és előkészített bolti keresés. A bolti találatszám nem ismert, amíg nincs valódi, friss, konkrét bolttól származó adatszolgáltató; a gomb csak **„🔎 Keresés”** feliratú.
6. Termékfotó, mennyiség, áruházi ikonok, hangulat és 44 px listakép megmarad; első körben 24 termék betöltve, továbbiak paginálhatók.

## Tények az árkapcsolatról
A meglévő SHO termékadatforrás az Open Food Facts; az **nem ad Tesco/Auchan élő ajánlati árakat és készletadatokat**. A jelenleg használt áruházi keresőlinkek és felhasználó által mentett termékoldalak sem számítanak hiteles árfeednek.

A 2026-11-17-i piaci ellenőrzésben talált, még nem engedélyezett/tesztelt **harmadik fél** szolgáltatásokat külön kell értékelni, mielőtt használatba vesszük:
- ReefAPI: Tesco Hungary termék- és áradat API-ként hirdetett kereskedelmi szolgáltatás. https://reefapi.com/tesco-api
- GetRealPrice: Auchan HU adatgyűjtés/ár-összehasonlítás. https://getrealprice.com/auchan-hu-adatgyujtes

**Nem állítjuk**, hogy ezek jelenleg csatlakoztatva vannak, szabadon felhasználhatók, hitelesek vagy ingyenesek. Jogi megfelelőség, adatfrissesség, ÁFA/Clubcard, kiszerelés, szállítás és az esetleges költségek ellenőrzése még hátravan. Vásárlást és kosárba helyezést kizárólag az áruház saját felületén lehet végrehajtani.

## QA / Átvétel
- Kosár Match megnyitása után alapból Tesco + Auchan; mindkettő keresés közvetlenül látható egy-egy aktív listatétel alatt.
- Megvásárolt tételek kizárása (online és offline).
- „Összes bolt” váltás a felhasználó 12 boltos könyvtárára; „Tesco + Auchan” visszakapcsolása.
- Mentett konkrét link nem tűnik el.
- Nincs fiktív bolti ár, találatszám, kosárazás, automatikus termékválasztás, háttérben indított drága hívás.
- Samsung Internet mobil teszt és bolti céloldalak tényleges felhasználói ellenőrzése külön szükséges.

Rollback: `backup/shopping-before-basket-match-v20-20261117`.
