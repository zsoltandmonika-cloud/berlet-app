# HealthHub Sleep v428 · három elsődleges alvásnézet

## Felhasználói sorrend, mobilon legfelül

1. **Utolsó alvás:** a legutóbb befejezett Health Connect alvásrekord, nappali szunyókálás is lehet.
2. **Éjjeli alvás:** a legutóbbi, éjszakai időponthoz illeszkedő 90+ perces mért alvás. Az éjszakai besorolás az időbélyeg alapján történik (budapesti 21:00–09:00 ablak többsége), nem a Samsung szabadalmazott sleep score vagy hivatalos „main sleep” jelölése.
3. **Elmúlt 24 óra:** gördülő, az aktuális perctől visszaszámított 24 óra, minden mért alvásszakasz uniójával. Átfedő Health Connect rekordokat nem számol kétszer, a 24 órás ablak határán levágja őket. Ha nincs szakaszadat, nem tekinti a teljes ágyban töltött időt alvásnak.

A három mobilkártya után egy teljes szélességű, négy fázissávos **24 órás idővonal** következik, a meglévő részletes „Alvási tényezők” előtt. A fejléc a legutóbbi *alvásról* tájékoztat, nem feltétlenül az éjjeli alvásról.

## Harmincnapos naptár

A különálló előnézeti naptár kártyái letisztultak, a legfrissebb napok görgetés nélkül előtérbe kerülnek. A napváltás a betöltött rekordokkal lokálisan történik, **nem indít új Dropbox-letöltést**. Az ugyanazon napon végződő alvások egymás alatt, külön grafikonokkal jelennek meg. A napok a **Europe/Budapest** ébredési dátumhoz kötődnek.

## Biztonság és kiadás

- Célzott webes HTML/CSS/JS módosítás, Android APK és Health Connect engedélyek változatlanok.
- A v428 kizárólag `?hh_sleep_v428_preview=1` query paraméterrel aktív. A stabil Sleep képernyő alapértelmezetten változatlan.
- Az éles oldal Sleep lapjának alján egy visszafogott, **összecsukott „🧪 Sleep · fejlesztői előnézet”** hivatkozás nyitja a v428-at, illetve visszavezet a stabil változathoz. A link az adatokat nem módosítja.
- Az új nézet kizárólag a meglévő Sleep adatút által a kiválasztott profillal ellenőrzött rekordokat olvassa. Nincs új backend, Dropbox-írás, egészségügyi adatfeltöltés vagy automatikus szinkron.
- A kódbeli adatok tájékoztató jellegű mérési eredmények, nem diagnózisok. Hiányos Health Connect szakaszadat esetén az összeg lehet hiányos, **nem becsüljük fel a teljes időszakra**.
- Kiépített Golden Backup/napló és kizárólag kézi rollback. Az S24 Ultra telefonos valós tesztje továbbra is szükséges.

## Offline regressziós ellenőrzés

`node healthhub/tests/sleep-v428.test.js`: legutóbbi nappali alvás, éjjeli fő alvás megőrzése, nappali alvás hozzáadása az elmúlt 24 órához, átfedések duplázásmentessége, határlevágás, hiányzó fázisadat, profil elkülönítés és default-off flag.


## v430 · dinamikusan nagyított 24 órás grafikon

- A „Elmúlt 24 óra” **mért alvásideje változatlanul a gördülő 24 óra** rekordjaiból számolódik, a mérési időszakok uniójával.
- **Csak a grafikon** időtartományát nagyítjuk a ténylegesen szereplő alvásrekordok kezdete és vége köré, minimális időtartam és kis szegély biztosításával.
- A grafikonon megjelenő időbélyegek **a rekordok valódi kezdetéhez és végéhez** kötődnek, és a nagyított tengelyen időarányosan helyezkednek el. Sűrű eseményeknél a közeli feliratokat ritkítjuk a mobil olvashatóságért.
- A nagyított időtartományt külön kiírjuk, így **nem keverhető össze a teljes 24 órás skálával**. Ha nincs rekord vagy a mért időszak majdnem kitölti a napot, a teljes 24 órás idővonal marad.
- Az alvások közötti hézagokat nem tömörítjük külön: **az időbeli távolságok tényleges aránya megmarad**, hogy a grafikon ne legyen megtévesztő.
- A széles nézet reszponzív százalékos pozicionálást használ; a Sleep oldal normál verziója változatlan, a v430 ugyanazon `?hh_sleep_v428_preview=1` előnézetkapcsolóval érhető el.
- Offline regressziós tesztek: két alvás (éjjeli+nappali), 24 órás összeg megőrzése, valódi időcímkék, egyetlen rövid szieszta, üres adatok.


## v431 · két teljes grafikon Léna véleménye előtt

Kiválasztott mobil megjelenési sorrend:

1. Utolsó alvás, fő éjjeli alvás, elmúlt 24 óra összesített kártyák és az automatikusan nagyított 24 órás áttekintő sáv.
2. A fő éjjeli alvás részletes kártyái (alvásindex, tényleges alvás, REM, mély, könnyű, ébrenlét, biometria).
3. **Két egyedi, feliratozott, lapos alvásfázis-idővonal:** először **Fő (éjjeli) alvás**, aztán **Utolsó alvás**. Pontos kezdő/végpont és különválasztott teljes időszak versus tényleges alvás.
4. **Léna · A teljes pihenésedről:** az előző kettőn kívül a **gördülő 24 órás összesítést is** számításba vevő, az aktuális profilra korlátozott rövid szöveg. Nem orvosi diagnózis, és nem számol kétszer, amikor ugyanaz az alvás a fő és az utolsó.
5. Alvásidő trendek.
6. **30 napos alvásnaptár**, közvetlenül az **Alvássegítő** elé áthelyezve. A kiválasztott nap rekordjai lenyithatók, hogy az aktuális napi grafikonokat ne duplázzuk feleslegesen; más nap választásakor a részletek megnyílnak.
7. Elalvássegítő, beállítások.

A normál Sleep nézet változatlan. Az átrendezés és Léna átfogóbb szövege kizárólag az explicit opt-in `?hh_sleep_v428_preview=1` előnézetben aktív.

**Kritikus határ:** az 54/100 körüli HealthRadar alvásindex továbbra is saját, tájékoztató, éjjeli alvásra vonatkozó mutató. A 24 órás délutáni szieszta hozzáadása nem módosítja automatikusan az éjjeli pontszámot, és a vélemény sem talál ki új összetett klinikai pontszámot.


## v432 · Golden Standard alvástényező-csempék finomhangolása

- Az alvásindex fő kártyájából eltűnik a feleslegesen hosszú „Saját, becsült pihenésindex · nem Samsung-pontszám” felirat. A számítás módszertana és a nem orvosilag validált jelleg **megmarad** a lenyitható „Hogyan számoljuk az alvásindexet?” magyarázatban.
- A részletes alvási tényezők sorrendje a preview módban: Tényleges alvás, Mély alvás, REM, Ébrenlét, **Éjszakai pulzus**, **Könnyű alvás**, majd opcionálisan Éjszakai véroxigén.
- A pulzus és a könnyű alvás így egymás melletti, azonos méretű csempék, a könnyű alvás nem foglal el teljes sort. Ha nincs ténylegesen éjszakai pulzusmérés, a pulzus helyén **„— · Nincs mérés”** jelenik meg, kitalált szám soha.
- Az éjszakai pulzus és SpO₂ adatok gyűjtésének időablakát az előnézetben azzal a **legutóbbi fő éjjeli alvással** hangoltuk össze, amelyet a v431 kijelző az éjjeli alvásként elemez. Így egy délutáni szieszta nem tolhatja át az éjszakai biometria ablakát délutánra.
- Azonos **hat alapcsempe** mindkét profilnál: Tényleges alvás, Mély alvás, REM, Ébrenlét, Éjszakai pulzus, Könnyű alvás. A pulzus értékét csak ténylegesen mért éjszakai adatokból vesszük. Az SpO₂ **külön, diszkrét információs sávban mindig megjelenik** mindkét profilnál: mérés esetén valódi értékkel és a mért percek számával, hiányában „— · Nincs éjjeli mérés” jelzéssel. Egyetlen mért percet nem mutatunk egész éjjeli átlagként.
- A módosítás **csak az explicit v428/v432 preview bekapcsolása mellett** él. A normál Sleep oldal elrendezése és szövege változatlan. Android APK, felhős adatstruktúra, Dropbox szinkron és Health Connect engedélyek nem változnak.
- Regresszió: `node healthhub/tests/sleep-v432-factors.test.js`.
