# HealthHub → FamilyHub · moduláris termékvízió és Safety/CPR előkészítés
**Döntés:** 2026-10-13 · **Státusz:** jóváhagyott stratégiai backlog, **nem implementáció** · **Felelős:** Zsolt + Léna

## Döntött sorrend (legutóbbi felhasználói pontosítás az irányadó)
**Következő aktív fejlesztés: HealthHub Personal Intelligence → Sleep Advisory 2.0 → hosszú távú adatgyűjtés + elemzés.** A Sleep v433 Golden Standard dizájn befagyasztva. A Safety/CPR-AED stratégiai prioritásként a Food & Nutrition **elé** kerül, de nem előzi meg a most induló Sleep Intelligence sprintet. A HealthRadar legacy lezárása/archiválása **függőben marad**: a felhasználó még fontos kiegészítést tervez.

| Sorrend | Modul/csomag | Státusz |
| --- | --- | --- |
| 1 | **HealthHub Intelligence: névre szóló Sleep Advisory 2.0** | következő aktív fejlesztés |
| 1a | Sleep adatgyűjtés: forrásazonosító, mérési és importidő, profilonkénti napló, hiányok, deduplikáció, hosszú távú idősor | az intelligencia előfeltétele |
| 1b | Sleep Analytics: 7/30/90 nap, fő éjjeli vs szieszta, tényleges alvásfázis és releváns, óvatos összefüggések | mérési lefedettség és bizonytalanság figyelembevételével |
| 1c | Személyes AI tanács és archívum + Ask Léna közös forrásrendszere | csak jogosult adatokkal és felhasználói engedéllyel |
| 2 | **Safety & Emergency: 112/911, CPR/AED, ICE** | magas prioritású tervezés és szakértői validáció, Food elé |
| 3 | Family Network / később Home / Life | moduláris platformépítés, többfelhasználós jogosultsági modell után |
| 4 | Food & Nutrition / Receptár új funkciók | a Safety mögé sorolva; meglévő szolgáltatások megőrzendők |
| kapu | HealthRadar legacy cutover | **NEM zárható le** a bejelentett további kiegészítés, parity- és biztonsági tesztek előtt |

## Moduláris fejlesztési koncepció
- **Nem monolit**: Health, Sleep, Activity, Personal Intelligence, Safety, Family, Home/Life, Food/Nutrition külön fejleszthető és visszaállítható modulok verziózott API- és adatsémákkal.
- **Közös platformréteg**: külön felhasználói identitás, profilonkénti és családonkénti hozzáférés, beleegyezés, forrásnapló, állapot- és változásnapló, biztonsági mentés.
- **Közös Léna Intelligence**: az Ask Léna és moduláris tanácsadók ugyanabból a bizonyítékokkal és forrásidőpontokkal jelölt, jogosult adattárból dolgozzanak; az AI-vélemény nem eredeti mérés.
- **Személyes adatvagyon**: eredeti mérések változatlan megőrzése, sémaverziók, származási és mérési időpont, dokumentált megőrzési szabályok, user-vezérelt törlés/export, soha nem publikus GitHub egészségügyi adatok.
- **Nem automatikus AI-adatküldés**: új személyes egészségügyi adatátadási mód csak kifejezett beleegyezés és szerveroldali jogosultságvizsgálat után.
- A jelenlegi kétprofilos HealthHub + Connect nem válik automatikusan többcsaládos termékké; előtte autentikáció, tenancia, RLS, klinikai és GDPR ellenőrzés.
- **Kiadási kapu**: PR + Guard + Golden Backup + mobilos elfogadás + regresszió + esetleges szakmai ellenőrzés; a jelenlegi v433 Sleep UI nem változik.

## HealthHub Sleep Intelligence 2.0 · rövid acceptance
1. Zsolt/Mónika profilok külön adatkészlet; újraimport, szieszta és fő éjszaka nem duplázódhat; nulla mérés nem számíthat mért nullának.
2. 7/30/90 napos trend csak elegendő tényleges időbeli lefedettséggel; minőségi küszöb és forrás/időbélyeg feltüntetése.
3. Az alvás és súly, stressz, fejfájás, aktivitás, pulzus/SpO₂ lehetséges kapcsolatai csak akkor jelenjenek meg, ha az adott profilban a kapcsolódó mérések vagy önkéntesen rögzített tünetek rendelkezésre állnak. Korreláció ≠ bizonyított ok.
4. A névre szóló tanács a releváns, ellenőrzött kórtörténetet/gyógyszert csak felhasználói engedéllyel, klinikai óvatossággal használja. Nem diagnosztizál, nem ír fel/állít át gyógyszert; Mónika esetén külön kardiológiai óvatosság.
5. **Append-only, privát elemzésarchívum**: profile, createdAt, model/prompt version, input snapshot/forrás-hivatkozás, állítások és bizonytalanság, értékelés, státusz; ismételt futás nem írja felül a korábbit.
6. Ask Léna lekérdezheti az elemzésarchívumot, de korábbi AI-elemzést nem tekint bizonyított egészségügyi ténynek; forrás-visszakövethetőség.
7. Teszt: szintetikus 2 profil, 0/kevés adat, 24 órás szieszta+éjjel, 7/30/90 lefedettség, engedély visszavonás, tényleges kéttelefonos acceptance.

## Safety & Emergency · első tervezési kör (Sleep után, Nutrition előtt)
**Cél:** nagy, stresszhelyzetben érthető **112/911** segélyhívó elérés, ellenőrzött és offline is használható CPR/AED útmutató, felhasználó által jóváhagyott ICE-kártya, önkéntes oktató mód.
- Magyarországon/EU-ban 112, USA/Kanada 911; helyi telefonszám nem következtethető ki bizonyossággal a profil országa alapján; ország/úti helyzet tudatos kezelése.
- Eszméletlen és nem normálisan lélegző felnőtt esetén sürgős segélyhívás, diszpécser által irányított mellkaskompresszió, AED-készülék hangutasításainak elsőbbsége. A végső útmutatót szakmai protokoll szerint kell jóváhagyni.
- A generatív AI **nem adhat improvizált, valós idejű újraélesztési utasításokat**, nem helyettesítheti a segélyhívást, és nem diagnosztizálhat szívmegállást egyedül órás adatokból.
- Offline-first, akadálymentes, nagy kontraszt, látható segélyhívó, vészhelyzeti használhatósági teszt, személyes adatok kiadása csak kifejezett hozzájárulás / külön engedélyezett emergency access esetén.
- Jogszabályi, adatvédelmi és orvostechnikai megfelelőség külön kapu a szélesebb terjesztés előtt.

## FamilyHub hosszú távú platform
**HealthHub → Family Network → Home/Life → külső családok zárt pilotja → esetleges általános közösségi termék.** A migráció adatvédelmi, betegbiztonsági, jogosultsági és fenntartható üzemeltetési követelményeken múlik, nem csupán a UI kialakításán.

**Megjegyzés:** Ez a dokumentum az elfogadott prioritásokat és moduláris architektúrát rögzíti, **nem állítja, hogy az új Safety vagy Sleep AI 2.0 funkció már éles lenne.**
## HealthRadar · állandó, élő modul (2026-10-13 pontosítás)
**A HealthRadar a HealthHub állandóan működő és folyamatosan bővülő egészségügyi modulja.** Nem cél a HealthRadar modul lezárása, funkcióinak befagyasztása vagy megszüntetése. Új egészségügyi funkciók, új almodulok és személyes AI Intelligence képességek rendszeresen csatlakozhatnak hozzá a közös moduláris architektúrában.

A `HH-HR-008` **kizárólag a történeti, különálló HealthRadar webhely** lehetséges egyszeri, read-only archiválására vonatkozik. Ez csak a teljes adatmigráció/feature parity és a felhasználó külön jóváhagyása után merülhet fel; **nem** jelenti a HealthHubon belüli HealthRadar élettartamának végét.

Új állandó termékfeladat: `HH-HR-011` (Continuous HealthRadar Evolution). A közeljövő aktív fejlesztése változatlanul `HH-SLI-001` Sleep Evidence Vault / Sleep Intelligence 2.0. Az Emergency CPR/AED a Nutrition elé sorolt stratégiai modul marad.
