# HealthHub Premium Glass — Golden Design & Léna Hero Character Playbook

**Verzió:** 1.0 · **Dátum:** 2026-10-14 · **Státusz:** jóváhagyott vizuális irányelvek, implementációs specifikáció; **nem éles dizájnmigráció**.

**2026-11-20 kiegészítés:** a **3/C. SHO Smart Shopping V5.8 Full Content Opal Glass** kifejezett, éles, felhasználó által vizuálisan jóváhagyott Golden Standard referencia; a dokumentum többi tervfejezete ettől még nem automatikusan éles.

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
- **Mónika pink golden rule (2026-10-14):** a Digital Health jóváhagyott Budapest-est / pink LED Hero színvilágához finoman simuljon. Sötét grafit-mélykék alap, nagyon kevés, az oldal élén megjelenő meleg pink fény. Finom rose peremek a csempéken, rose kiemelés a profilfotón, aktív és fókuszjelzéseken, a Daily Intelligence csempéken. **Nem pink háttér, nem telített pink kártyák.** Zsolt kék-cyan témája változatlan marad. A nézőpont és jóváhagyott Hero karakter megőrzése elsődleges; a színezés CSS-szintű, nem képszerkesztés. Implementációs referencia: [Premium Glass Home CSS](../premium-glass-home-v520.css), kizárólag `?hhpremium=1` opt-in módban, `data-hhpg-profile="m"` feltétellel.
- Ne legyenek egymásnak ellentmondó modulonkénti profilváltók, fontok, kártyaradiusok vagy navigációs jelölések.

### 3/A. Csendes prémium · a minőség ne legyen reklámfelirat

**„Az igazi prémium minőség nem hirdeti magát. Felismerhető.”** Ez a HealthHub és az SH9 kötelező vizuális szabálya, nem puszta stíluspreferencia. A Savile Row-i szabászat mintájára a jó arány, anyagszerűség, tipográfia, kifogástalan részletek és következetes működés mutatják meg az értéket.

- A **Golden Standard**, **Premium**, **Elite**, **Luxury**, **Gold** vagy más, kizárólag a dizájnt dicsérő címke **ne jelenjen meg a felhasználói fejlécben, Hero-n, csempén, navigáción, badge-en, díszfeliraton vagy láblécben**.
- A prémium hatást a visszafogott navy smoked glass, finom színperem, pontos igazítások, kiemelkedően jó jóváhagyott képek, megfelelő kontraszt és valóban működő funkciók teremtsék meg. **Nincs „nézd, milyen prémium vagyok” kiírás.**
- Minden képernyőn csak a felhasználónak hasznos tartalom maradjon: funkció neve, tényleges állapota, lényeges információ, szükséges adatforrás- és biztonsági közlés. A pusztán dekoratív fejlesztői / dizájnszabványos kiírás menjen a dokumentációba.
- Kivétel lehet egy **valódi, felhasználó szempontjából jelentéssel bíró** termék-/előfizetéscsomag hivatalos neve, valamint a fejlesztői dokumentáció és diagnosztika. A szabály nem indokolhat lényeges adatok elrejtését.
- **Elfogadási próba:** a képernyő jelzőszavak nélkül is azonnal prémium hatású, használható, hiteles és felismerhető? Ha nem, a megjelenésen kell dolgozni, nem reklámfeliratot ráírni.

Részletes normatív szabály: [GOLDEN-STANDARD-RULE.md](./GOLDEN-STANDARD-RULE.md).

### 3/B. Premium Diffused Edge Glow — jóváhagyott SHO / HH vizuális effekt (2026-11-20)

**Belső designrendszerbeli név:** **Premium Diffused Edge Glow**. Magyarul: finoman szórt, ködös peremfény. A felhasználó által 2026-11-20-án jóváhagyott vizuális etalon: **SHO Smart Shopping 3 × 2 kategóriacsempe-rács** (Élelmiszer, Elektronika, Divat, Drogéria, Otthon, Árfigyelés). Ez **belső stílusnév**, nem iparági szabvány vagy felhasználói UI-felirat.

**Vizuális tulajdonságok és szerkezet:**
- Sötét, visszafogott smoked-glass / deep-plum háttér; finom felső és oldalsó, halvány rózsaszín–lila–jegeskék derengés.
- Szélek mentén lágy, fokozatosan elhalványuló **diffuse edge glow** és még finomabb **inner edge highlight**; soha ne legyen éles neoncsík vagy erős színes keret.
- HD/3D grafika és felirat végig olvasható; az effekt nem takarhat lényeges tartalmat és nem ronthatja a kontrasztot.
- Azonos vizuális súly, sarokrádiusz és szélerősség az egymás melletti csempéken; nem következhet a képek eltérő sötét pereméből látszólag inkonzisztens gap.
- A fény egy **dekoratív, külön CSS-rétegként is alkalmazható**, pl. `::before`/`::after`, `background: linear-gradient(...)`, `box-shadow` (akár `inset`) és óvatos blur használatával, mindig `pointer-events:none` beállítással. A díszítő réteg ne fogja el a valódi gombokra eső érintést, a fókuszjelzés maradjon látható.
- A képen már beégetett peremfény és a CSS-implementáció **nem feltétlenül külön réteg**: új csempénél preferált a CSS-es, ismételten használható megoldás, a meglévő képanyagból való „kétszeres” glow nélkül.
- Témafüggő, **visszafogott** árnyalat: Mónika rose/pink; Zsolt ice-blue/cyan. Ne jelentse automatikusan egy már jóváhagyott csempe/hero lecserélését.
- Árnyék, opacity és blur értékek új komponensenként képi QA-val hangolhatók; nincs automatikus, globális CSS aktiválás.

#### 3/B.1. Rögzített, valódi Shopping-etalon paraméterek (2026-11-20)

A felhasználó kifejezetten a **jelenleg ténylegesen jóváhagyott** 6 kategóriacsempét választotta etalonnak. Ezek paraméterei és határai:

| Jellemző | Az éles Shopping V4.4-ben ellenőrzött érték |
|---|---|
| Képi fényudvar | A hat jóváhagyott `sh9/shopping/assets/golden-v4/categories/*.svg` grafikába **bele van égetve**; nincs külön numerikus CSS blur/spread paramétere |
| Belső CSS keret | `inset 0 0 0 1px rgba(228,193,244,.25)` a `#categoryGrid.categories > .cat::before` rétegen |
| Külön CSS blur a képi glow-hoz | **Nincs** (`none`); a ködösség jelentős részét az SVG-be ágyazott grafika adja |
| Kártya lekerekítése | `13px` |
| Kártya körüli sötét térárnyék | `0 2px 6px rgba(6,3,20,.28)` |
| Eredeti képek optikai szélszabályozása | `transform:scaleX(1.08)` a V4.3-as képszél-korrekcióhoz |
| Kategóriarács | 3 oszlop × 2 sor, `4px` vízszintes és függőleges rés |

**Fontos:** a korábban demonstrált `14px blur / 28% opacity / 3px spread` **csak ötlet**, nem ezeknek az éles csempéknek a mért vagy konfigurált értéke. Az elfogadott referenciát az **SVG assetek + az éles CSS együttes látványa** határozza meg.

#### 3/B.2. SHO Smart Shopping V4.5 – 4 felső felület CSS-adaptációja

**Célzott négy elem:** a hero alatti 4 gombos **Quick Bar mint egyetlen felület**, a **keresősáv**, a **Smart List** kártya és a **Kosár Match** kártya. A dekoratív réteg a korábbi erős vékony keret helyett jelenik meg. A hiteles kategóriaetalon 1px-es, 25%-os inner-highlight értékét használja, a képekbe égetett ködöt **új, önálló CSS-soft-halo** utánozza:

- `--sho-pdeg-edge-rgb:228,193,244` és `--sho-pdeg-inner-opacity:.25` **az etalon belső élkiemelése**
- `--sho-pdeg-halo-blur:11px`, `--sho-pdeg-halo-opacity:.13`, `--sho-pdeg-halo-spread:0px` **új V4.5 induló CSS-fényudvar**, *nem* a képekről kiolvasott paraméterek
- `--sho-pdeg-edge-radius:15px` a felső felületek már meglévő lekerekítéséhez igazodik
- `pointer-events:none` és abszolút pozicionált dekoráció; a navigációs gombok, kereső, adatfolyamok és geometria változatlanok

**Implementáció:** `sh9/shopping/shopping-golden-v4-polish.css` (V4.5 szakasz). A layer csak opt-in a Shopping négy felső felületén; a közös dokk rácsába nem hoz létre új gyermeket. Valódi mobilos képernyőkép után tekinthető vizuálisan véglegesnek. A szabvány leírása önmagában nem kényszeríti rá az effektet más SHO/HealthHub modulokra.

**Implementációs szerződés:** legyen újrahasználható dizájntoken / komponensosztály, de **opt-in, modulonként tesztelt vizuális réteg**. Kizárólag látványt módosíthat, nem az adatokat, routingot, érintési célokat, scrollpozíciókat vagy az eredeti képeket. S24 Ultra Samsung Internet és Edge screenshot-összehasonlítás kötelező. A jelen dokumentációs rögzítés **nem rollout**.


### 3/C. Full Content Opal Glass — SHO Smart Shopping V5.8 · GOLDEN STANDARD (2026-11-20)

**Felhasználói státusz: JÓVÁHAGYVA.** A V5.8-at a felhasználó valós képernyőn megtekintette, „szuper lett”, „ez kész” visszajelzéssel elfogadta, majd a kész megjelenést képernyőképpel megerősítette. Ez **éles Shopping-modul etalon**, nem puszta koncepció. A korábbi V4.5–V5.7 köztes kísérleti értékek nem írják felül ezt a végleges profilt.

**Belső név:** **Full Content Opal Glass / Unified Glass Sheet**, magyarul egységes, finoman opálos üvegalátét. *Csak belső stílusnév, UI-ban ne jelenjen meg reklámcímkeként.*

#### 3/C.1. Elrendezés és határok (kötelező kompozíció)

- **Felső határ:** közvetlenül a jóváhagyott **Shopping hero kép alatt**; a hero nem része az üveglapnak.
- **Egyetlen összefüggő, halványan gyöngyház-opálos háttérréteg:** a 4 gombos **Quick Bar**, keresősáv, **Smart List**, **Kosár Match**, **6 kategóriakép (3 × 2)**, majd **Webshopok** fejléc és **12 webshop (4 × 3)** *mögött* fut.
- A webshopok: Tesco, Auchan, ALDI, Kifli, dm, Rossmann, eMAG, Alza, Allegro, Temu, SHEIN és **Shoperia**. A hat kategória: Élelmiszer, Elektronika, Divat, Drogéria, Otthon és Árfigyelés.
- **Alsó határ:** a legalsó webshoplogók sorát követően diszkréten kilógó üveglap. **V5.7-hez képest pontosan +10 CSS px festett túlnyúlás**: a `::before` alsó `inset` értéke `7px` helyett `-3px`. **Nem** 10 px új layout-height, margin vagy padding, nem tolja le a következő tartalmat.
- A külön **„Boltok és árucikkek”** tartalomblokk, a további katalógus és a **bottom navigation** az üveglapon kívül marad. A hero, a csempék, az ikonok, a már jóváhagyott geometria, távolságok, sorrend, touch targetek, képek és funkciók érintetlenek.
- A vizuális lap **nem fedhet le működő kontrollt**. A közös üveg dekoráció, az egyedi kategóriaképek beégetett glow-ja és a Quick Bar/Search/Smart List/Kosár Match saját belső fénye ettől **függetlenül megmarad**.

#### 3/C.2. V5.8 végleges effektparaméterek, éles CSS alapján

| Paraméter | Jóváhagyott érték / jelentés |
|---|---|
| Modul selector | `body[data-lp-v2="on"][data-lp-module="shopping"]` |
| Egyetlen közös lap | `#shoppingUnifiedGlassSheetV54` és dekorációként `#shoppingUnifiedGlassSheetV54::before` |
| Wrapper technikai alap | `display:flow-root; position:relative; isolation:isolate; padding:0; margin:0; border:0; background:transparent; overflow:visible;` |
| Közös lap pozíciója | `position:absolute; inset:0 6px -3px !important; z-index:-1;` |
| Lekerekítés | `border-radius:20px` |
| Általános áttetszőség | **60–65%**, az alábbi színrétegek alfaértékei alapján; nem a teljes elem globális `opacity` értéke |
| Meleg bal oldali árnyalat, 0% | `rgba(113,71,143,.40)` = 40% színfedettség / 60% áttetszőség |
| Középső árnyalat, 49% | `rgba(67,49,108,.35)` = 35% színfedettség / 65% áttetszőség |
| Kékes jobb oldali árnyalat, 100% | `rgba(53,75,128,.38)` = 38% színfedettség / 62% áttetszőség |
| Alapszínátmenet | `linear-gradient(133deg, rgba(113,71,143,.40) 0%, rgba(67,49,108,.35) 49%, rgba(53,75,128,.38) 100%)` |
| Felső, finom meleg opálfény | `radial-gradient(ellipse 125% 75% at 28% 0%, rgba(250,223,255,.09) 0%, transparent 69%)` |
| Alsó, finom hideg opálfény | `radial-gradient(ellipse 110% 52% at 90% 100%, rgba(185,194,255,.065) 0%, transparent 78%)` |
| Háttérelmosás + enyhe szaturáció | `-webkit-backdrop-filter:blur(11px) saturate(1.07)` és `backdrop-filter:blur(11px) saturate(1.07)` |
| Lágy üvegperem | `1px solid rgba(226,201,251,.17)` (17% színfedettség) |
| Belső felső finom fény | `inset 0 1px 0 rgba(255,232,252,.19)` |
| Belső alsó finom fény | `inset 0 -1px 0 rgba(145,130,210,.12)` |
| Semleges külső mélység | `0 4px 13px rgba(4,2,14,.13)` (nem erős, színes külső glow) |
| Eseménykezelés | `pointer-events:none`: nem blokkolhatja a gombokat, webshop-linkeket vagy billentyűzetes fókuszt |
| V5.8 változás V5.7-hez képest | Színfokozatok `.35/.30/.33` → **`.40/.35/.38`**; alsó inset `7px` → **`-3px`**; **blur 11 px változatlan**, perem 17% változatlan |

**Rétegzés sorrendje:** 1. felső opál `radial-gradient`; 2. alsó opál `radial-gradient`; 3. `133deg` színgrádiens. A gradientek a **dekorációs alátétre** vonatkoznak, nem a teljes lap vagy a gyermekeinek `opacity`-ére. Emiatt a tartalom élessége és kattinthatósága megmarad.

#### 3/C.3. Forráshelyek, kiadási és változtatási szerződés

- Éles elrendezés / wrapper: `sh9/shopping/index.html` → `<div id="shoppingUnifiedGlassSheetV54"> ... </div>`; zárás **a teljes `gs-ref-store-overview` webshopblokk után**, de **a `#shoStoreConnect` előtt**.
- Éles effekt: `sh9/shopping/shopping-golden-v4-polish.css`; a **V5.8** rule a V5.4–V5.7 örökölt effektértékeket célzottan felülírja. A végleges vizuális eredmény a CSS cascade *együttes* eredménye, nem egy korábbi kísérleti szabály.
- Éles stílusbetöltés cache-verziója: `shopping-golden-v4-polish.css?v=20261120-v58-bottom-overhang`.
- Jóváhagyott kiadás: [SHO Shopping V5.8 / PR #1028](https://github.com/zsoltandmonika-cloud/berlet-app/pull/1028); kiadási commit: `5e07788c058df4e7f0061be68f169f1ec6402d1d`.
- Visszaállítási referencia: `backup/shopping-pre-v58-bottom-overhang-20261120` (V5.7 állapot).
- V5.8 dokumentált kiadási ellenőrzése: **23/23 célzott ellenőrzés sikeres**; a Shopping, Sound Studio, Léna Premium Wave pipeline sikeres. Az általános Edge Installable PWA ellenőrzés ettől független, korábban fennálló hibája **nem** vált a Golden Standard részeként elfogadott állapottá.

**Változtatási szabály:** ezt a V5.8-as vizuális etalont **ne módosítsuk külön felhasználói kérés és új mobilos képi jóváhagyás nélkül**. Új modulban a komponens másolása nem automatikus: explicit opt-in, a hero/kategória/webshop határok újradefiniálása, interakciós és responsive QA szükséges. A mért paraméterek nem írják felül a korábban elfogadott 6 kategória SVG-be égetett belső peremfényét vagy a négy felső vezérlő külön glass-rétegét.

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

**2026-11-20 – Shopping V5.8 Golden Standard jóváhagyva:** a 3/C pontban pontosan rögzítve a teljes hero alatti közös opálos üveglap, +10 px alsó festett túlnyúlás, 60–65% áttetszőség, 11 px blur, 17% perem, opálfények, komponenshatárok és a visszaállítási referencia. **Ez a Shopping-design már éles és jóváhagyott**, nem terv.
