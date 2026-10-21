# HealthHub Family Guard · Golden Glass 3D Map · v762
**2026-10-21 · staging PR #405 · nem éles / nem kész 24×7 követés**

## Véglegesített UX-irány
- A 12-es főoldali Golden Glass grid **kilencedik csempéje** Family Guard lesz az egykori Idővonal helyén, változatlan Home Hero, működő profilváltó és másik 11 csempe mellett.
- Az eredeti, élő **Idővonal** tartalom nem másolódik, nem vész el, az Egészség quick grid és meglévő taskbar továbbra is megnyitja.
- Family Guard külön, gondoskodó Léna + Buddy + esti Budapest + családi 3D térképes Hero, a felhasználó által elfogadott screenshot kompozíció szerint. **Az elfogadott új raster Hero nincs még repo assetként feltöltve**. A v762 UI jelenleg a jól ismert korábbi két Home fotót használja átmeneti fallbackként. Nem szabad úgy jelölni, hogy a végleges Hero be van építve.
- A Hero monitorján **csak Zsolt és Mónika saját eredeti portréi** szerepelhetnek. Az adatok forrása a byte-azonos `golden-standard-avatars-v529.js`. Tilos kitalált személyek / nevek (pl. Anna), hamis családtagok, irreális GPS-pin.
- Buddy a vizuális mókus-asszisztens. Corky külön családi eszköz-kártyát kaphat. A tablet helyét jelenti, nem a kutya tényleges tartózkodási helyét. Life360 nem automatikus adatforrás.

## Implementálva a PR-ben (kód, nem készülékes bizonyíték)
- `healthhub/guardian/` elkülönített HTML/CSS/JS, profilfüggő arculattal.
- OpenFreeMap Dark + MapLibre vector tiles + valódi OSM épületmagasságokból `fill-extrusion`; döntött forgatható 3D, flat kapcsoló, fedvény nélkül kattintható térkép.
- `guardian-golden-v762.css`: a térkép kerete, kamera/follow, térképi paletta, víz, utcák, 3D épületek Mónika rózsaszín / Zsolt kék témája.
- Az alapállapot **Budapest belváros felfedező nézete**, nem saját tartózkodási hely. A személyes fotós GPS-jelölő csak sikeres GPS mérésből jön létre. Családi lapoknál a távoli tag `nincs még megosztás` állapota jelenik meg.
- GPS start/stop opt-in, helyben memóriában tartott nyomvonal, utolsó jel / GPS pontosság, hibák, háttérbe kerüléskor leállítás. Nincs szerveres GPS feltöltés, nincsenek hardcode-olt családi helyek.
- MapLibre / OpenFreeMap stílusok: https://openfreemap.org/quick_start/ és https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/.

## Nem kész, kiadási tiltások
1. **Kritikus: 24×7 háttérkövetés.** A HH One Android manifestben egyelőre nincsenek location/foreground-service permissionök, háttérben futó GPS-adatgyűjtő és családi felhőszinkron. A nyitott weboldalas GPS önmagában nem teljesíti a felhasználó által elfogadott Family Guard célt.
2. Két telefonhoz hitelesen kötött `ownerDeviceId`, felhasználói engedély, background access, tartós foreground service, offline/retry, Supabase per-owner jogosultságok, legutóbbi ismert pozíció, revoke/törlés, pontosság és recency. Az Android rendszer helyszolgáltatásának bekapcsolása nem helyettesíti az alkalmazás külön engedélyezését.
3. Corky tabletes saját adatforrás és élő helymegosztás még nincs bekötve. Life360 integráció nincs.
4. A kiválasztott új Léna+Buddy Hero high-quality képi asset beküldése, eredeti Zsolt/Mónika monitorfotók összeállítása, 420px széles S24 Ultra mobile QA.
5. Valódi két Samsungon GPS, WebGL/tile loading, zoom 3D épület, tematika, profilváltás, engedély megtagadás, Doze, 4G/5G, repülő mód, képernyőzár, futási idő és akku validáció.
6. Route Intelligence / BKK élő járat, 260-as csatlakozás optimalizálás, Activity, SOS/112, Mental Health, Daily Spark+Headline későbbi EPIC.

## Teszt és kiadás
- `node --test healthhub/tests/guardian-v761.test.cjs`.
- `node healthhub/tests/premium-glass-home-v520.test.cjs` plusz Home v522/v525 regression workflow.
- A PR nem számít automatikusan telepített és felhasználó által elfogadott funkciónak: CODED → CI TESTED → MERGED → DEPLOYED → REAL DEVICE VERIFIED → USER ACCEPTED.

## 2026-10-21 · v763 Native GPS kiegészítés (STAGED, NOT DEPLOYED)

**Elkészült forráskód (CI nem készülékes validáció):**
- A meglévő `healthhub/android-bridge` / `hu.zsoltmonika.healthhubbridge` Android-kódja kapott egy `GuardianSettingsActivity` beállítóképernyőt, önálló futtatható `GuardianLocationService` háttér-GPS-t és `GuardianLocationVault` Android Keystore AES/GCM kódolt utolsó mérést.
- A gyűjtő csak külön gomb és tájékozott felhasználói engedély után indul, csak tulajdonoshoz kötött, az Android állandó értesítésében van STOP; tulajdonos feloldásakor is megszűnik és töröl.
- `GuardianBootReceiver` próbálhat indítani **csak korábbi opt-in + külön ACCESS_BACKGROUND_LOCATION ("Mindig") engedély** mellett, soha nem magától engedélyez.
- A precíz / hozzávetőleges engedélyek külön kérhetők; nincs titkos, silent location capture.
- A HH One Android buildCode/version/signature `0.14.6 (#26)` érintetlen. Nem készült telepíthető, titkos kulccsal aláírt új release.
- Célzott teszt: `healthhub/tests/guardian-native-v763.test.cjs`; natív `gradle :app:assembleDebug :app:testDebugUnitTest` CI.

**Nincs még megvalósítva:**
- Telefon és web Family Guard közötti autorizált, titkosított online szinkron, hiteles családi partnerpozíció, Live Zsolt/Mónika/Corky megosztás, kliensoldali helyadat retention / felhő törlés.
- Samsung S24 Ultra valódi GPS / lock-screen / reboot / Doze mérés és megbízhatósági SLA.
- Felhasználó által elfogadott egyedi Lénás Hero asset végső beépítése.
- **Soha ne állítsuk, hogy "24/7 kész", "két telefon élőben látható", vagy "éles" ezen fázis alapján.**

## v764 · Map és profilváltó stabilizálás (2026-10-21)

- A Family Guard 3D épületforrása a MapLibre/OpenFreeMap meglévő `building` vektoradatforrását használja újra, ha a stílusban megtalálható, és csak hiányzó forrás esetén tölt plusz TileJSON-t.
- Üres, illetve egyetlen pontot tartalmazó böngészős GPS nyomvonalból nem készül érvénytelen `LineString` GeoJSON; a térkép csak legalább 2 valós GPS-fix után rajzol útvonalat.
- Az önálló Guardian oldal jobb felső sarkában lévő, már jóváhagyott fényképes profilgomb egykattintásos kapcsoló lett. A váltás leállítja az aktív böngészős GPS-t, törli az előző tulajdonos lokális nyomvonalát és a térképi jelölőt, és csak az `hh-profile` választást menti.
- A gomb hangja/vibrációja a HH One egységes Golden Standard 900 Hz / 40 ms / 9 ms profil-tap beállításához igazodik és tiszteletben tartja a hangtiltást.
- Elkészült egy különálló, nem éles, GPS-mentes HTML design preview (ChatGPT conversation artifact). Az eredeti jóváhagyott **Léna + Buddy kép byte-azonos** benne. A monitoron látható fiktív profilok képernyőjét kiegészítő UI-réteg takarja, rajta a HealthHub v529 eredeti Zsolt/Mónika portréival. A portrék a nyilvános HH Golden avatar JS-ről érkeznek; internet nélkül Z/M betűs fallback. Ezt még nem szabad a tényleges GitHub Pages Hero telepítésének nevezni.
- A 3 célzott CI workflow újra zöld. Ezt a mobilos/saját telefonos vizuális átvétel még követi.

**A PR továbbra sem merge-elt vagy telepített release, Android OTA nem publikálható pusztán a CI alapján.**
