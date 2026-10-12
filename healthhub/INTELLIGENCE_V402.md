# HealthHub v402: Ask Léna Intelligence I-05 / I-06 / I-07

## Rendeltetés
A v402 a már létező I-02 mérési naplóra, I-03 idősoros adatminőségi modulra, I-04 eredeti leletre támaszkodó forráskezelésre és v395 kétmenetes klinikai bizonyítékauditra épül. **Nem** állítja, hogy minden AI-állítás klinikailag hitelesítve lett.

A három új, különálló böngészőmodul az Ask Léna `live-v331.js` már engedélyezett, profilhoz kötött folyamatába kapcsolódik. A meglévő dokumentumok, mérések és felhőbeli tárolók **nem módosulnak**.

### I-05: Clinical Quality Gate
- Ellenőrzi a kéréssémát, a hozzájárulást és a pontos profilazonosságot.
- A jövőbe mutató megfigyelési időbélyegű mérési rekordokat kivonja a továbbításra készített **másolatból**; az eredeti rekordot változatlanul hagyja.
- Eltávolítja az engedély nélküli, oldalhivatkozás nélküli és duplikált eredeti PDF-részleteket a továbbítandó kérésből.
- A klinikai mélyelemzés válaszának végén v395 típusú, befejezett szerveroldali auditot követel meg. Ha hiányzik, a rendszer nem jelenti késznek a választ.
- A rutin/gyors AI-válasznál őszintén `preflight_only` minősítést ad: ez **nem** a generált orvosi állítások független hitelesítése. Az eredeti PDF-ek feldolgozása sem igazol minden klinikai állítást.

### I-06: Narrative Intelligence
- A válasz elejére a lényeg kerül, történelmi klinikai kérdésnél időrendi történetvezetés, utána élettani magyarázat.
- A személyes dokumentált tényt és az általános élettani mechanizmust külön kezeli; nem támogat kitalált orvosnevet, időtartamot, gyógyszerdózist vagy ok-okozati bizonyosságot.
- A meglévő v393 kérdéshez illeszkedő instrukcióját kiegészíti, de a szerver 2400 karakteres kérdéskorlátját betartja.
- Az eredeti felhasználói kérdés a képernyőn és a mentett előzményben továbbra is változatlan marad.

### I-07: Contextual Reasoning
- Az I-02 mérési napló `measured` és **pontosan időbélyeges** rekordjait használja.
- Egy vérnyomáspárhoz legfeljebb 2 órán belüli pulzusmérést kapcsolhat, mindegyik mérés értékével, forrásával és időpontjával; **együttes előfordulás nem jelent diagnózist vagy ok-okozati kapcsolatot**.
- Eltérő források esetén nem választja ki találomra a számára tetsző értéket.
- Eredeti PDF-ek keltezését bemutathatja mint dokumentumidőrendet; **nem** változtatja klinikai események igazolt időrendjévé.
- Legfeljebb három rövid, forrásjelölt összefüggést ad az engedélyezett AI-kéréshez; a meglévő forrásokat nem írja át, és nem fut külön AI-hívást.

## Beillesztési sorrend a v331 pipeline-ban
1. Hozzájárulás + authentikáció + profilazonosság.
2. I-02/03 adatminőség, I-04 dokumentumok és klinikai metaadat.
3. I-07 korlátozott, időbélyeges kontextuskapcsolás.
4. V393 kutatási terv + I-06 magyar narratív instrukció.
5. Opcionálisan külön jóváhagyott fotó.
6. I-05 végső kliensoldali forrás-előellenőrzés.
7. Válaszgenerálás a meglévő Supabase szerverúton; csak klinikai részletes mód esetén a v395 ellenőrzött kivonatú úton.
8. A `done` eseménynél I-05 befejezettségi / v395 audit státusz, ezután jelenik meg a kész válasz státusza.

## Tesztelés
`node healthhub/tests/intelligence-v402.test.cjs`

A 13 szintetikus, személyes adatot nem tartalmazó teszt futtatható különálló módon. A validált esetek között szerepel a beleegyezés, profilkeveredés, jövőbeli időbélyeg, PDF-engedély, deduplikáció, audit megkövetelése, természetes kronológia, max. kérdéshossz és az indokolatlan időbeli összefüggések kizárása. A teszteket JS-szimulációval futtattuk; valós telefonos, Supabase-válaszfolyamos és orvosi forrásdokumentumos end-to-end próba **még nem történt**.

## Következő elfogadási próba
- Rutin kérdés egészségügyi mérésről: pontos forrás/időbélyeg és nem túlígért audit.
- Személyes történeti kérdés: pontos időrend csak megengedett PDF-kivonat és igazolt tények alapján; általános magyarázat szigorúan megkülönböztetve.
- Különböző forrásból eltérő mérések: nincs automatikus diagnózis vagy látszólag biztos tendencia.
- Gyors profilváltás: a régi felhasználó adata nem kerül át az új profil kérésébe vagy válaszába.
- V395 szerveraudit hiánya: az AI-válasz nem kaphat megtévesztő "kész, ellenőrzött" jelzést.

A munkacsomagok együtt fejleszthetők, de mindhárom a közös forrás- és adatminőségi alapokra támaszkodik. A Golden Stars-t később külön, jóváhagyott minőségi kiértékelésre lehet kapcsolni; a csillag nem a modell súlyainak módosítása.
