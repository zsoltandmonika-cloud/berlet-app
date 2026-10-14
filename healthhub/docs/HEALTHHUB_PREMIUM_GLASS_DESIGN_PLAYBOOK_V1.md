# HealthHub Premium Glass — Golden Design & Léna Hero Character Playbook

**Verzió:** 1.0 · **Dátum:** 2026-10-14 · **Státusz:** jóváhagyott vizuális irányelvek, implementációs specifikáció; **nem éles dizájnmigráció**.

## 1. Termékélmény és hiteles referencia

**„Looks expensive. Egységes, felhasználóbarát, esztétikus, valódi adatokkal.”**

- Vizuális golden reference: [Digital Health](../digital-health/index.html). A jelenlegi kártyák, tipográfia, mélykék fények, finom glass textúrák, grafikonok és egyérintéses profilválasztás hangulata az etalon.
- Kifejezetten **közös, moduloktól független design system**, nem egymástól független CSS-másolatok.
- Telefon első: Samsung Galaxy S24 Ultra, de keskenyebb és nagyobb kijelzőn is olvasható.
- Elegancia = egyszerűség, információs hierarchia, használható vezérlés. Nincs dekorációból eredő olvashatósági romlás.
- A Dark Premium Glass nem kötelezően fekete. Mélykék/grafit alap, finom teal/cyan/rózsaszín fények, kontrollált kontraszt.
- **A működő funkciók, igazolt egészségadatok, családi adatvédelmi szabályok és Dropbox/Health Connect/Ask Léna integrációk érintetlenek maradnak.**

## 2. Léna Hero Character System — kötelező, minden modulban

**One Léna, many roles. Léna minden fő modul Hero képén megjelenik; vizuálisan mindig ugyanaz a felismerhető karakter.**

Kötelezően állandó jellemzők:
1. Arc, arcarányok, felismerhető személyiség és felnőtt életkori megjelenés: **nem új karakter, nem hol tinédzser, hol más nő**.
2. Haj, alap arculati jegyek, jellegzetes tekintet és karakterkövetkezetesség.
3. Fotórealisztikus, igényes, egységes képminőség és színkezelés.
4. Léna arcának referenciafotója/karakterlapja a jóváhagyott korábbi képek alapján készüljön, és a képgenerálásoknál legyen rögzített vizuális támpont. **Új karakterlapot a felhasználónak jóvá kell hagynia, mielőtt képeket cserélünk.**

Modulhoz igazítható: ruházat, póz, fény, környezet, kellékek, munkaszituáció, háttér, hangulat. Az orvosi ruházat **nem kötelezően fehér**: lehet elegáns mélykék, teal, szürke vagy törtfehér scrub/medical uniform. Orvosi modulban továbbra is bizalomkeltő, professzionális megjelenés szükséges.

**Hero-koncepciók:**

| Modul | Léna szerepe | Ruházat és hangulat |
|---|---|---|
| Home | Figyelmes, központi személyes egészségasszisztens | Prémium medical/wellness megjelenés, visszafogott kék/pink glow |
| Ask Léna | Fókuszált, intelligens tanácsadó | Letisztult, high-tech medical business casual; jól olvasható AI-válaszfelület |
| Sleep | Nyugodt esti segítő | Lágy esti fény, kényelmes professzionális wellness megjelenés |
| Activity | Energikus mozgáskísérő | Sportos szett, már jóváhagyott budapesti futóhangulat megőrzése |
| Digital Health | Modern, játékos digitális egészségasszisztens | Jóváhagyott vizuális referencia, holografikus csempék, éjszakai Budapest |
| Timeline / Records / Leletek | Empatikus, professzionális egészségügyi asszisztens | Elegáns orvosi uniform, mélykék/grafit klinikai környezet |
| Nutrition / Receptár | Barátságos táplálkozási segítő | Modern, prémium konyhai/wellness megjelenés; ugyanaz a Léna |
| HealthRadar / környezeti adatok | Megbízható adatmagyarázó | Modern medical/weather-tech látvány, hideg-meleg fénypontok |

**Profilképek szabálya:** Zsolt és Mónika saját fotói kizárólag profilképként/profilváltásnál szükségesek. **Home Hero képen nem kell megjelenniük**. A Digital Health jelenleg jóváhagyott képe korábbi kompozíció; az új, egységes karakter- és profilkép-szabály alapján egy későbbi, felhasználó által jóváhagyott képcserével igazítható hozzá. Nem módosítjuk automatikusan a korábban jóváhagyott Hero képeket.

**Képkompozíció / gyártás:**
- Reszponzív, lehetőleg 16:9 master hero, mobilos fontos-szereplő biztonságos kivágási zónával, szükség esetén külön mobil crop.
- A szöveg, CTA és mérőadat a **valódi DOM-ban** maradjon, ne legyen képbe égetve.
- Valós egészségügyi értéket **csak hiteles forrásból** írunk ki, nem kép-generátorral rajzoltatunk ki; dekoratív hologramon hamis mérési számok nem jelenhetnek meg valós adatként.
- Képméret és LCP-optimalizálás; WebP/AVIF, kontrollált fájlméret, tartalék háttér, olvasható alt szöveg.
- A vizuális referenciákként már jóváhagyott régi képeket meg kell őrizni; minden csere jóváhagyott verziózott assetként, visszaállíthatóan történjen.

## 3. Egységes UI-rendszer

**Design tokenek** (kiinduló referencia a 2026-10-14-i Digital Health CSS-ből; véglegesítés a közös CSS implementációval):
- Háttér `#0b1425`, felületek `#15223a`, elsődleges szöveg `#f5f7ff`, másodlagos `#a8bbd6`.
- Kék `#60a5fa`; cyan `#45d5cc`; lila `#b8a5fa`; pink `#f8a9cf`.
- Kártyák: 14–20 px körüli egységes lekerekítés, áttetsző rétegek, finom border, visszafogott blur és glow, jól elkülönülő címek és számok.
- Betű: Inter, ha elérhető; `Segoe UI` / Roboto / rendszerfallback. Kis címkéknek is jó kontraszt és olvashatóság.
- Grafikonok: állandó jelmagyarázat, egységek, mért vs hiányzó különbsége, semleges „nincs adat”; színen kívüli jelentésjelölés.
- Zsolt: mélykék/cyan; Mónika: pink/rose, a közös prémium sötét alap és a szövegkontraszt megtartásával.
- Ne legyenek egymásnak ellentmondó modulonkénti profilváltók, fontok, kártyaradiusok vagy navigációs jelölések.

## 4. Home információs architektúra — jóváhagyott 3 × 4, tizenkét csempés célkép

**Felhasználó által jóváhagyott navigációs sorrend (2026-10-14):** a Home ne széttöredezett linkgyűjtemény, hanem egységes, 3 oszlopos × 4 soros, **12 Premium Glass navigációs csempéből** álló, kompakt belépőoldal legyen.

| Sor | 1. oszlop | 2. oszlop | 3. oszlop |
|---|---|---|---|
| 1. Egészség és dokumentumok | 🩺 **Egészség** | 📋 **Leletek** | 💊 **Gyógyszerek** |
| 2. Aktivitás és digitális jóllét | 🌙 **Alvás** | 🏃 **Aktivitás** | 📱 **Digital Health** |
| 3. Intelligencia és életmód | 🥗 **Nutrition** | 🧠 **Ask Léna** | 🗓️ **Idővonal** |
| 4. Daily Intelligence | ✨ **Daily Spark** | 📰 **Daily Headline** | ❤️ **Daily Health** |

**Elhelyezési szabály:** az Egészség, Leletek, Gyógyszerek szándékosan **egyetlen sorban**, az Ask Léna a 3. sor **középső csempéjén**. A három eltérő Daily Briefing **három önálló, jól elkülöníthető Fancy / Premium Glass csempét** kap az utolsó sorban. A címek az adott rendszerben ténylegesen használt briefingnevekhez igazítandók, ha a megnevezés eltér. A „Daily Health” alatt a családi napi személyes egészségügyi jelentés értendő; nem helyettesítendő statikus, publikus híradattal.

**Léna Receptár → Nutrition:**
- Léna Receptárnak ne legyen külön Home-navigációs csempéje. A funkció a Nutrition modulban kapjon dedikált, egyértelmű belépési pontot.
- Teljes receptek, mentések, keresés, meglevő jogosultságok és korábbi hivatkozások elérhetőségét meg kell őrizni, szükség esetén régi deeplinkeket átirányítani.

**Daily briefing csempék megjelenése és adatforrása:**
- Finoman megkülönböztetett grafikai identitás, HD/3D ikonok, prémium színárnyalatok a közös rendszerbe illesztve; profilfüggő téma.
- Opcionális, **valós** utolsó briefing dátum / friss jelzés; csak adott profilra jogosult, már létrejött jelentést szabad jelezni. Nincs demonstrációs briefingcím vagy kitalált időbélyeg.
- A csempék az eredeti, valóban működő briefingeket/archívumokat nyissák, ne duplikált új megvalósítást; ne induljon AI-generálás automatikusan pusztán oldallátogatás miatt.
- A 3 Daily funkció meglévő generálási ütemezésének, mentésének, archívumának, privát láthatóságának változatlannak kell maradnia.

**Reszponzív cél és megfelelőség:**
- 3 oszlop, 4 sor az S24 Ultra elsődleges célképe. Kisebb kijelzőn / nagyított fontnál adaptív rács, olvasható címkék.
- Az elegáns kompakt csempék érintési célja legalább 44 × 44 CSS px, lehetőleg 48 × 48 dp Android méret; jól elkülönülő aktív/fókuszállapot, nem szoruló feliratok.
- Kevesebb görgetés igen, elveszett modul vagy használhatatlanul apró csempe nem. Az előző 3×4 javaslatot **felülírja** a jóváhagyott 3×4.
- Modul- és Home menüleltár, régi deeplinkek, jogosultságok és három Daily briefing forrásának ellenőrzése kötelező az implementáció előtt. Így nem marad rejtett funkció vagy felhasználói adatvesztés.
- Ideális szerkezet: egyetlen Léna Home Hero, profilváltásnál Zsolt/Mónika személyes portréja, fontos hiteles gyorsadatok, 12 esztétikus üvegcsempe.

**Státusz:** a felhasználó jóváhagyta a 12-es csempeszámot és a 4×3 tartalmi sorrendet. Ez **tervezési elfogadás**, nem éles migráció; implementáció és valós telefonos QA külön feladat.

## 5. Hozzáférhetőség és S24 Ultra minőségi kapuk

1. Profilváltás **egy érintés**, a témának és az adatoknak azonos, megfelelő profilra kell váltania. Mónika adatainak véletlen Zsolt-nézetben való megjelenítése blokkoló hiba.
2. Kártya és szöveg megőrzi a kontrasztot üvegháttéren; cél WCAG AA, normál szöveg legalább 4,5:1.
3. Kényelmes érintési méret, látható fókusz, nem csak színnel jelzett kiválasztás.
4. Egymásba nem csúszó címek, ikonok, adatértékek, egységek. 320–430 CSS-px és nagyított font ellenőrzés.
5. Reduced motion: a dekoráció csökkenthető, lényeges navigáció animáció nélkül is működik.
6. A Hero nem fedheti el az adatot és nem okozhat jelentős olvasási vagy betöltési késedelmet.
7. Kötelező vizuális screenshot-kontroll Zsolt/Mónika profilra, Home, Ask Léna, Sleep, Activity, Timeline, Nutrition, Records, Digital Health.
8. Klinikai tényeket dekoratív design soha nem módosíthat; hiányzó adatot nem lehet hamis nullának ábrázolni.

## 6. Prioritások és megvalósítási elv

1. **Design tokenek + közös komponensek + Léna karakter-referencia**: izolált, opt-in CSS, nincs globális áttörés.
2. **Home + Ask Léna + közös navigáció**: az első valódi WOW-kapu. Home 3×4 és Receptár áthelyezése csak jóváhagyott navigációs inventár után.
3. **Sleep + Activity + Digital Health**: közös grafikai nyelv, a meglévő jóváhagyott Hero anyagok adaptálása, nem lecserélése reflexből.
4. **Timeline + leletek + gyógyszerek + Nutrition + további modulok**.
5. **Admin és edge-case QA**: üres adat, hosszú magyar szavak, profilváltás, időzónák, alacsony memória, lassú hálózat.

**Release gate:** CI siker ≠ éles képi bizonyíték ≠ valós S24 Ultra elfogadás. Minden fázis verziózva és visszaállíthatóan kerülhet élesbe. Privát egészségügyi adatok, képek és profilok nem kerülnek publikus példafájlba vagy tesztekbe.

## 7. Változáskövetés

Ez a dokumentum csak **a tervezési szerződés**. Sem Home 3×4 rács, sem receptmigráció, sem Hero képcsere, sem közös skin nem lett automatikusan élesítve ezzel a dokumentummal. Ezek külön implementációs és tesztelési feladatok.
