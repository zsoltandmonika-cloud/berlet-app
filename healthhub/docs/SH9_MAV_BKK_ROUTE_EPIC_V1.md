# SH9 Tömegközlekedés · önálló oldal · BKK / MÁV / Volán
**Elfogadott koncepció 2026-10-27 · 2026-10-28 kiemelt fejlesztési prioritás**  
**Állapot: tervezés/backlog; nem éles új oldal.**

## Szerkezet, sorrend és Golden Standard
Önálló, könnyen elérhető **Tömegközlekedés** page az SH9 Smart Travel rendszerében, három dedikált, egységes **BKK / MÁV / Volán** modullal. S24 Ultra mobile-first, a már elfogadott Premium Dark Glass, profilfüggő Zsolt kék/Mónika pink és az egységes taskbar/továbbnavigálás. A meglévő Smart Travel és BKK komponensek újrahasznosítandók; nem változik a 3×3 főlauncher.

### BKK · közel 100% (felhasználó által jelentett státusz)
- A **meglévő BKK útvonaltervezés közel kész**; nem szükséges újraírás.
- A hárommodulos oldalba beillesztés, állapotmegőrzés, visszanavigálás, minimális UI-regresszió, S24 Ultra smoke.
- Releváns BKK prioritások: 260-as busz, 17/19 villamos; busz kék, villamos sárga, HÉV zöld.
- „Közel 100%” **felhasználói előrehaladási becslés**, nem CI/UAT alapján késznek deklarált technikai állapot.

### MÁV · 2026-10-28 aktív prioritás
- Hiteles és szabályosan hozzáférhető állomás-/járat- és menetrendi forrás + szerződéses / API feasibility.
- Indulás/cél, nap, idő, átszállás, járatszám; realtime késés/peron/vágány/jegyár csak ha valós hiteles adat.
- Valós timetable vs live státusz felcímkézése; eredmények, időzóna és frissesség; tesztesetek, low usage.

### Volán · 2026-10-28 aktív prioritás
- **MÁV-val egy napon elkezdendő**, különálló Volán buszos útvonaltervező, nem a MÁV pilot elkészülte után.
- Járatok, megállók, időpontok, csatlakozások, busz-közlekedési sajátosságok; hiteles aktuális források és adat-licenc feasibility, frissesség.
- Önálló modul, UI és adatréteg, közös útvonaladat-normalizáló felé előkészítve.

### Integrált intermodal routing (következő milestone)
A BKK + MÁV + Volán közös, ténylegesen átszállható útvonaltervezés **a három almodul hiteles menetrendi pilotja után**, külön mérföldkő; gyalogos/átszállási pufferek, eltérő késések, időzóna, fares ha megbízható, API-budget és QA. A 2026-10-28-i cél a **különálló oldal és két hiányzó szolgáltató munkájának indítása**, nem az aznapi kész integráció ígérete.

## Accepted backlog / exit criteria
- `HH-TRANSIT-001`: standalone page, 3 modul, BKK meglévő útvonal megtartva.
- `HH-RAIL-001`: MÁV pilot; 2026-10-28 priority.
- `HH-VOLAN-001`: Volán pilot; 2026-10-28 priority.
- `HH-RAIL-002`: integrált BKK+MÁV+Volán útvonalak, a hiteles külön pilotok után.

**Technikai és biztonsági szempont:** az AI Intelligence Core / Guardian golden QA érvényes; menetrendi adatok nem keverendők valós idejű adatokkal. Semmi felesleges háttérpolling, nem lesz működőnek állítva az implementálatlan provider.
