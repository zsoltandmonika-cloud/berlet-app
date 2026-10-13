# HealthHub: 24h + 30 napos alvásadatok, dátumválasztó (terv)

Állapot: termékigény / terv; **nem implementált** a v420 pilotban. A Samsung SDK v1.1.0 olvasónk jelenleg aktivitást, lépéseket, emeleteket és edzésrekordokat olvas, alvást még nem.

## UI Golden Standard: meglévő HealthHub Activity modul
- Az alvás dátumválasztója, 30 napos visszatekintése, előző/következő nap vezérlése, mobilos elrendezése és profilváltása **ugyanazt a működési és vizuális mintát** kövesse, mint a már kész HealthHub Activity nézet. Ne hozzunk létre második, eltérő naptármegoldást.
- Lehetőség szerint az Activity meglévő, tesztelt naptár-/dátumszűrő komponensét használjuk újra, ne csak lemásoljuk a kinézetét.
- Az „Utolsó 24 óra” legyen gyorsnézet, a kiválasztott naptári nap pedig az adott reggelen véget ért alvásé, az éjfélen átnyúló mérési időszak pontos kezelésével.

## Funkcionális terv
- Alvás nézeten „Utolsó 24 óra” és „Nap kiválasztása” mód.
- Visszamenőleg legalább 30 napig naptárból kiválasztható nap, csak ha a forrásnál ténylegesen rendelkezésre áll.
- Naptári dátumhoz az adott reggelen véget ért fő alvás tartozzon. 24 órás ablakban az összes átfedő alvás, napszundi külön jelölve.
- Alvás kezdete/vége, összes alvásidő, ébrenlét és mérhető alvásfázisok idősávval (awake/light/deep/REM). Fázisokat csak valós forrásadatból; hiányzó adat „nincs adat”, nem nulla vagy becslés.
- Időzóna, éjfélen átnyúló alvás, egymásba lógó rekordok, többszörös források és óraadjustálás (nyári időszámítás) kezelése. A kijelzett dátum és az adatlekérdezés határai eltérhetnek.
- S24 Ultra teljes szélességű, görgethető, dátumválasztós nézet. 1 kattintásos profilváltás kizárólag helyesen kötött, készüléktulajdonoshoz tartozó forrásból; a pilot profilválasztó jelenleg csak címke és NEM Samsung-fiókváltás.
- Forrás, nap, mérési idő és pontos adateredet megjelenítése. Az alvás összesítések nem duplázódhatnak Health Connect + Samsung Health adatforrás esetén.

## Megvalósítás előtti kötelező audit
1. Meglévő HealthHub alvásmodul és Health Connect SleepSession támogatás, jogosultságok és aktuális 30 napos hozzáférés ellenőrzése.
2. Samsung Health Data SDK v1.1.0 alvás-adattípus támogatása és SDK-hozzáférési feltételek ellenőrzése. Ha nincs megfelelő támogatás, Health Connect útvonal előnyben.
3. Valódi telefonos olvasási teszt és egyeztetés a Samsung Health kijelzőn látott adatokkal (időpontok és fázisok).
4. Adattisztítás, deduplikáció és fő alvás/szundi besorolás tesztje.
5. Csak a sikeres tesztek után háttérszinkron és központi HealthHub integráció; a jelenlegi v420 pilot marad internet/feltöltés nélküli.

## Elfogadási feltételek
- 24 órás és 30 napos naptár kiválasztás tényleges adatokkal.
- Külön megkülönböztethető „nincs adat”, „nincs jogosultság”, „még nem szinkronizált” állapot.
- Két profil adatai nem keverednek; Samsung-fiókváltást UI címkével nem szimulálunk.
- S24 Ultra mobil UI, stabil görgetés és áttekinthető fázisdiagram.
