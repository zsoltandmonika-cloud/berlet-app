# SHO SMART TICKET FLOW · EPIC v1.0

**Epic ID:** SHO-TICKET-001  
**Prioritás:** P1 a Sport Central / Smart Valet integrációban  
**Modulok:** MecsRadar (Sport Central) + SHO Smart Valet (Wallet)  
**Státusz:** Megtervezve, nem élesített funkció  
**Tulajdonos:** SHO / Zsolt és Mónika  
**Elv:** A jegyvásárlás kizárólag az ellenőrzött hivatalos jegyértékesítő oldalán történik. A jegyet a felhasználó manuálisan importálja a Smart Valetbe.

## 1. Epic cél

> Sportrajongóként szeretném a MecsRadarban kiválasztott, személyesen látogatható esemény hivatalos jegyvásárlási oldalát egy kattintással megnyitni, a megvett belépőmet pedig PDF- vagy képfájlként biztonságosan a SHO Smart Valetbe feltölteni, hogy a belépéshez egy helyen, gyorsan és megbízhatóan megtaláljam.

**Üzleti érték:** Egy közös családi sportfigyelő és jegykezelő folyamat; kevesebb manuális keresés; eredeti jegy megőrzése; gyors helyszíni hozzáférés.

**Hatókör:**
- Versenynaptár → fizikai esemény → hitelesített hivatalos jegyvásárlási link.
- Vásárlás a szolgáltató oldalán; nincs fizetés vagy vásárlás a SHO-ban.
- PDF/JPG/PNG/WebP jegy manuális feltöltése; az eredeti fájl változatlanul megmarad.
- A jegy eseményhez kapcsolása, áttekinthető listázás, megnyitás, megosztás szabályozott módon.
- Nem a TV-naptár része: ismételt TV-adásokhoz nincs jegyvásárlási gomb.

**Kívül esik az MVP-n:** jegyvásárlási API, automatikus e-mail-postafiók olvasás, automatikus szolgáltatói jegyimport, dinamikus QR-kód hamisítása, bankkártya/okmánykezelés.

## 2. Termékfolyamat (user journey)

1. Felhasználó a MecsRadar **Versenynaptárában** megnyit egy eseményt.
2. Az eseménykártyán **🎟️ Hivatalos jegyvásárlás** akkor aktív, ha az eseményhez ellenőrzött jegyértékesítő URL tartozik.
3. A gomb új böngészőlapon megnyitja az eredeti szolgáltató oldalát. MecsRadar nem vesz át fizetési vagy bankkártyaadatokat.
4. A felhasználó megveszi és letölti a jegyet.
5. A MecsRadarban **Jegy feltöltése a Smart Valetbe** gombbal vagy a Wallet főoldaláról önállóan kiválasztja az eredeti fájlt.
6. A Smart Valet megjeleníti a feltöltés előnézetét és a rendelkezésre álló eseményadatokat. A felhasználó jóváhagyja vagy kézzel javítja a dátumot, időt, helyszínt, jegytulajdonost.
7. A sikeres mentés után a jegy a **Saját jegyeim** listában kereshető, megnyitható és később archiválható vagy törölhető.

### Kártyaállapotok

- **Hivatalos jegy elérhető:** Jegyvásárlás + Jegy feltöltése gomb.
- **Hivatalos jegyoldal nem ismert:** nincs vásárlási gomb; nem szabad URL-t kitalálni.
- **Már feltöltött jegy:** „🎟️ Jegyem megnyitása”.
- **Csak TV-műsor / ismétlés:** nincs vásárlási CTA.
- **Dinamikus QR-jegy:** az eredeti szolgáltatói link/app belépéshez is megőrzendő; a feltöltött statikus kép nem garantáltan elfogadható.

## 3. User Storyk és elfogadási feltételek

### US-01 · Hivatalos jegylink a MecsRadarban (P0)

**Mint** sporteseményre készülő felhasználó **szeretném** elérni a hivatalos jegyoldalt a meccskártyán, **hogy** biztonságos helyen vásárolhassak.

**AC:**
- [ ] A jegy CTA csak fizikai eseményhez és ellenőrzött URL esetén jelenik meg.
- [ ] Látható a jegyértékesítő neve; a céloldal megnyitása új lapon történik.
- [ ] Ellenőrzés hiányában nem látható aktív vásárlási CTA.
- [ ] A YouTube-os és TV-műsoros szűrés ettől nem változik.
- [ ] A meccskártyák v15/v16 kompakt ikonrendszere változatlan.

### US-02 · Egyszerű manuális jegyimport (P0)

**Mint** jegytulajdonos **szeretném** az eredeti PDF-et vagy képet feltölteni, **hogy** egy helyen őrizzem.

**AC:**
- [ ] Smart Valet: „+ Jegy feltöltése” (PDF, PNG, JPG/JPEG, WebP).
- [ ] Sikeres mentéshez szükséges: a fájl, valamint a jegy neve/típusa.
- [ ] A feltöltés hiba-, méret-, formátum- és megszakításkezeléssel rendelkezik.
- [ ] Feltöltés előtt előnézet, a mentés végén egyértelmű siker-visszajelzés.
- [ ] Az eredeti fájlt a rendszer nem vágja, nem tömöríti a QR-kód rovására, nem írja felül.

### US-03 · Eseményhez kötés és előtöltés (P0)

**Mint** felhasználó **szeretném**, hogy a MecsRadarból indított feltöltés tudja a kiválasztott eseményt, **hogy** ne kelljen újra begépelnem.

**AC:**
- [ ] A navigáció átad egy **stabil eventId**-t (nem a teljes jegyet, nem személyes adatot).
- [ ] Az esemény neve, dátuma, időpontja és helyszíne előtöltődik.
- [ ] Minden mező módosítható a mentés előtt.
- [ ] A Smart Valet önálló indításakor az esemény kézzel is választható.
- [ ] Hiányzó vagy ismeretlen eventId nem akadályozza a kézi feltöltést.

### US-04 · Biztonságos, személyhez kötött jegytár (P0)

**Mint** jegytulajdonos **szeretném**, hogy a belépőm csak az általam jogosított személyek számára legyen hozzáférhető.

**AC:**
- [ ] Eredeti fájlok **nem nyilvános** Supabase Storage bucketben.
- [ ] Supabase Auth + RLS és/vagy ellenőrzött aláírt, rövid lejáratú megnyitási URL.
- [ ] Profil- és jegytulajdonos-jogosultság alapértelmezésben privát. A családi megosztás tudatos felhasználói művelet.
- [ ] Érzékeny QR-/vonalkód, jegyazonosító és személyes adatok nem kerülnek nyilvános URL-be, analitikai eseménybe vagy naplóba.
- [ ] Más felhasználó jogosulatlanul nem töltheti le vagy törölheti a jegyet.
- [ ] Fájl törlésekor a tárolt eredeti példány is törlődik (megerősítéssel).

### US-05 · Megnyitás és helyszíni használat (P0)

**Mint** belépni készülő néző **szeretném** két érintéssel megnyitni a jegyemet, **hogy** ne kelljen a bejáratnál keresgélnem.

**AC:**
- [ ] Smart Valet „Saját jegyeim”: közelgő események előre sorolva.
- [ ] PDF eredeti nézetben, képek megfelelő nagyítási lehetőséggel.
- [ ] Jegy kitűzhető a gyorsindítóra; dátum, helyszín, jegytulajdonos látható.
- [ ] Offline hozzáférés csak akkor jelölhető „elérhetőnek”, ha a fájl valóban biztonságosan és teljesen le van mentve az eszközre.
- [ ] Dinamikus QR esetén figyelmeztetés + hivatalos megnyitási lehetőség.

### US-06 · Jegykártya állapotkezelés (P1)

**Mint** felhasználó **szeretném** látni a jegyem státuszát, **hogy** elkerüljem a duplikációt.

**AC:**
- [ ] Állapotok: előkészítés, feltöltve, lejárt/archív, törölt.
- [ ] Azonos fájl ismételt feltöltésekor duplikátumjelzés (hash alapú).
- [ ] Jegy törölhető, archívum megtekinthető; nem vész el automatikusan a rendezvény végén.
- [ ] A jegy lejárata nem jelent automatikus belépés-érvényességi ellenőrzést.

### US-07 · Opcionális adatfelismerés / AI Scan (P1)

**Mint** felhasználó **szeretném** automatikusan felismerni a jegyről a dátumot, eseményt és helyszínt, **hogy** gyorsabban menthessem.

**AC:**
- [ ] Csak jóváhagyás után kerülnek be a felismerhető mezők.
- [ ] OCR-hiba és nem olvasható kép esetén teljesen működik a kézi bevitel.
- [ ] QR-/vonalkód nem újragenerálódik vagy módosul.
- [ ] Az adatfeldolgozásnál az érzékeny mezőket nem továbbítjuk indokolatlanul harmadik félhez.

### US-08 · Hivatalos jegyforrások és visszajelzés (P1)

**Mint** felhasználó **szeretném** látni, van-e valódi jegylink, **hogy** ne kattintsak bizonytalan oldalra.

**AC:**
- [ ] Forrásrekord: eventId, provider, verifiedUrl, verifiedAt, status.
- [ ] Csak allowlistelt, ellenőrzött szolgáltatói domainek támogathatók automatikus CTA-ra.
- [ ] 404, megszűnt vagy nem ellenőrzött URL nem válik automatikusan elérhető jegyoldallá.
- [ ] A link hibája nem blokkolja a MecsRadar versenynaptárát.

## 4. Kapcsolódás a Sportfigyelőhöz

A **TV-naptár**: magyar sportcsatornák adásai, élő adás és ismétlés külön jelölve. A **Versenynaptár**: személyesen látogatható események, helyszín, hivatalos jegyértékesítés.

A sportfigyelés külön szerkeszthető rendszer: **sportág → versenytípus → csapat/válogatott**. Prediktív bevitel csak kanonikus klub-/csapatazonosító kiválasztása után ment; a félregépelt név nem válik külön csapattá. A jegy-kapcsolat ugyanerre a stabil eseményazonosítóra épül.

## 5. Technikai javaslat

- **MecsRadar**: `ticketing: { verifiedUrl, provider, verifiedAt }` opcionális, forrásellenőrzött mező; a kártyán csak akkor aktív CTA.
- **SHO**: a `/berlet-app/sh9/wallet/` teljes képernyős **vizuális Smart Valet előnézet** már létezik. A későbbi `?eventId=<opaque-id>` eseményátadás **még nincs bekötve**, és a route most nem importál valódi jegyet.
- **Smart Valet**: privát Supabase Storage + jogosultságkezeléssel védett jegymetaadat-tábla (jegyazonosító, tulajdonos, eventId, storage path, fájltípus, dátum, archiváltság).
- **Tárhely:** soha ne GitHub Pages, Cloudflare Pages public mappa vagy nyilvános URL.
- **Preview:** az új teljes képernyős Smart Valet vizuális koncepció kizárólag mintajegyeket mutat, működő kereséssel, kategóriaszűrővel, profilfüggő kitűzéssel és nagyítással. Az eredeti Bérlet app külön gombbal elérhető. Ezt nem szabad valós jegyimportként, működő Secure Vaultként vagy érvényes QR-kódként kommunikálni.
- **Kockázat:** a jegytárolás nem bizonyítja a jegy érvényességét; dinamikus jegyekhez a hivatalos szolgáltatói app is kellhet.

## 6. Megvalósítási sorrend (javasolt)

1. **MVP:** privát Wallet jegytároló, kézi import, megnyitás, törlés, profiljogok.
2. **Integráció:** MecsRadar ellenőrzött vásárlási CTA, eventId átadás, feltöltés előtöltéssel.
3. **UX:** kitűzés, emlékeztető, duplikátumfigyelés, offline-állapot, archiválás.
4. **Később:** AI/OCR segédfunkció és szolgáltatói integrációk, ahol jogszerűen és technikailag támogatottak.

**MVP Definition of Done:** Samsung S24 Ultra mobilon egy érvényes, személyes jegy a MecsRadarból indított folyamatban manuálisan feltölthető, újranyitás után megjeleníthető, jogosulatlan felhasználó nem fér hozzá, és a bejáratnál az eredeti jegy nagyítható. A régi SHO/MecsRadar funkciók nem romlanak.

**Jelenlegi valós állapot (2026-11-03):** Epic-specifikáció. Nincs kész, éles Smart Valet jegyimport; nem állítjuk, hogy a jegyvásárlás vagy automatikus QR-felismerés működik.


## 7. Vizuális Smart Valet előnézet (2026-11-04)

- **Új, önálló fullscreen route:** `/berlet-app/sh9/wallet/`. A SHO StartPage és a régi SHO Preview Wallet gombja ide navigál, míg a négygombos közös Glass Dock meglévő `?sho=wallet` útvonala kompatibilitási hídként megmarad.
- **Vizuális Golden Standard:** original SHO dark premium glass, két profilszín (Zsolt #79bfff, Mónika #f9a6d3), közös négyzónás felső dock, ötgombos alsó navigáció, nagy Wallet Hero, kiemelt mintakártya, 5 kategória, kereső, később elérhető feltöltés, Bérlet app/Sport Central navigáció.
- **Működő demóinterakciók:** mintakártyák keresése/szűrése, helyi profilfüggő kitűzés, mintajegy részletnézete, HU/EN lokalizáció. Csak az egyetlen kitűzött **mintaazonosító** marad a böngészőben.
- **Felhasználóvédelem:** a mintajegyek nem érvényesek, nincs valódi QR, nincs aktív PDF-, okmány- vagy bankkártyafeltöltés, nincsenek titkos adatok az alkalmazás statikus csomagjában, és nincs háttérfelhő-írás.
- **Fázis 2:** privát Supabase Storage, szigorú RLS, eredeti fájl megőrzés, megbízható mobil megnyitás. A Sport Central eventId-integráció csak azután jöhet.
