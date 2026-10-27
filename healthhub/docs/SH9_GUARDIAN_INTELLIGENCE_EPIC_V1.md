# SH9 Guardian Intelligence (GI) · Quality Guardian

**Epic:** SH9-GI | **Állapot:** Approved concept / Backlog | **Dátum:** 2026-10-27  
**Scope:** SH9 (9 modul), HealthHub, Family Tasks, Family Guard, HH One APK, Admin Center.  
**Project Control master:** [healthhub/project-control.json](../project-control.json)

> „Olyan autó, amelyben a szerelőmester is ott ül: szükség esetén kiszáll, kívülről is tesztel, jelentést ad, majd visszaül csendes fedélzeti üzembe.”

**GI = Guardian Intelligence**, nem AGI (általános mesterséges intelligencia). A rendszer AI-segített minőségbiztosítás, mérhető guardrailekkel és emberi jóváhagyással.

## 1. Fő termékcél

Az SH9 beépített Quality Guardian-je ugyanazt a **specifikáció-/acceptance-ledgert** használja a fejlesztői QA-hoz és a takarékos fedélzeti megfigyeléshez. Ismeri a jóváhagyott Golden Standard UI-szabályokat, a profilokat (Zsolt: kék, Mónika: pink), az S24 Ultra mobile-first méreteket, a működési elvárásokat és a korábbi regressziókat. Minden teszt futási köréhez objektív, visszakereshető bizonyítékot kapcsol.

**Nem tizedik launcher csempe:** Admin Center → Quality Guardian. A jelenlegi SH9 3×3 felosztás marad.

## 2. Három működési fázis

### ONBOARD · fedélzeti diagnosztika
- Eseményvezérelt, alapból alacsony erőforrásigényű app-health mérések: modulbetöltés, UI-kivételek, fontos szinkron-hibák, túl sok újrapróbálkozás, OTA és háttérfolyamat-státusz.
- Meglévő Admin Usage Dashboard, Supabase és GitHub Actions riport **összesített** adatait felhasználja, ha van megfelelő read-only hozzáférés. Nincs új redundáns tracking rendszer.
- Profiladatok elkülönítve, személyes/egészségügyi adatot, GPS-útvonalat, tokent nem küld nyilvános GitHub-logba.
- **Nincs állandó mikrofon, folyamatos AI-ébresztés, 24/7 böngésző, másodpercenkénti Supabase-lekérdezés vagy folyamatos GPS.** A beszélgetésekből követelmény csak jóváhagyott összefoglaló vagy issue alapján kerülhet be.
- Idempotens, kis kockázatú helyreállító lépés automatizálható korlátozott próbálkozásszámmal; éles adat-, kód-, RLS-, OTA- vagy jogosultság-változtatás csak emberi jóváhagyással.

### EXTERNAL QA · külön indítható tesztműhely
- Indítás jóváhagyott milestone, manuális "Run QA" vagy célzott GitHub CI esemény után. Külön, rövid életű tesztfutás és elkülönített tesztadatok.
- **Funkcionális QA:** Playwright browser/E2E, Android natív Maestro/emulátor, valódi S24 Ultra fizikai smoke-test csak hitelesített eszközzel.
- **Pixel Inspector:** ugyanazon viewport, fonts, safe area, device pixel ratio mellett referencia-screenshot diff és toleranciák; prémium üveg, hero, 3×3 launcher, egységes taskbar, profil-gombok és pink/kék témák.
- **Cross-profile:** kiadott/teendő/folyamatban/kész, elrejtés, Sticky Note, láttamozás, értesítési duplikáció, háttérbe helyezés és visszatérés.
- **Resilience:** hálózatvesztés, 401/403, reconnect, duplikált események, késleltetés, jogosulatlan profil-hozzáférés, visszaállítás.
- **Terhelés:** szintetikus adatokkal, csak saját tesztkörnyezetben, szabályozott QPS/konkurencia/adatvolumen/CI perc limittel. Költség-vészleállító és azonnali abort.
- A tesztrunnernek nincs produkciós admin/service_role kulcsa, nincs joga a fő adatbázist terhelni vagy spontán éles deployt végrehajtani.

### RETURN HOME · jelentés, javítás, újratesztelés
- Machine-readable + emberi QA riport: PASS/FAIL/SKIP/UNKNOWN, reprodukciós lépések, screenshot/trace, commit + build, kritikus/major/minor, érintett acceptance ID, before/after metrika.
- A lényeges regressziókat automatikusan követhető hibajegyre javasolja, de a javítás és deploy jóváhagyásköteles.
- Javítás → regressziós újratesztelés → elfogadási kapu → engedélyezett release.
- QA futás vége: ideiglenes környezetek és erőforrások leállnak; ONBOARD visszaáll csendes működésre.

## 3. Acceptance ledger / Definition of Done

Minden user story minimális mezői: ID, modul, funkcionális elvárás, képernyőkép/baseline, profil/role, precondition, happy/negative test, expected result, értékhatár/tolerancia, tesztelt build, evidence URI, owner, review state.

### Példák
- **GI-AC-01 UI:** profil Zsolt→Mónika: a témaszín minden felületen kék→pink; a profilváltó a Golden Standard pozícióban; screenshot diff a jóváhagyott tolerancián belül. A pixelkülönbség ténylegesen mérhető, nem AI által kitalált.
- **GI-AC-02 Task sync:** egy kiadott feladat 2 engedélyezett profilon a helyes küldővel, felelőssel és státusszal megjelenik; "Kész" felhőn tartós; visszatérés után friss.
- **GI-AC-03 Sticky:** az adott esemény egyetlen hangot és egyetlen popupot vált ki; × a címzett profilra megmaradó ack; másik profil nem tűnik el tévesen; Android lockscreen korlátozásokat külön mérjük.
- **GI-AC-04 Resource:** idle állapotban nincs plusz állandó adatlekérdezés/FGS; tesztfutás előtti-utáni Supabase request/egress/Realtime, GitHub Actions perc, Android akkumulátor Delta dokumentált baseline-hoz mérve. Teljesítményhatárok pilotkor konkrétan jóváhagyandók, nem találunk ki százalékot.
- **GI-AC-05 Security:** szintetikus tesztadatok, profilizoláció és RLS negatív tesztek; semmi érzékeny adat nyilvános CI-ban.
- **GI-AC-06 Release:** kritikus/major hiba = BLOCK; nem futott teszt = UNKNOWN, nem PASS; csak elfogadott, visszaállítható változat release-elhető.

## 4. Implementációs munkacsomagok (Project Control: HH-GI-001…006)

1. **GI Foundation**: követelmény/teszteset-ledger, jóváhagyási workflow, Golden Standard referencia-gyűjtemény, GitHub Issue/PR linkelés.
2. **ONBOARD Telemetry**: read-only diagnosztika és Admin widget meglévő usage adatokból; event dedup, költségkeret.
3. **EXTERNAL QA Engine**: Playwright screenshot/E2E + Android tesztek, izolált fixture-ek, szigorú stressz-limit.
4. **Resource Guardian**: Supabase/GitHub/Android használati baseline, költség-/akku-guardrail, circuit breaker, before/after.
5. **AI QA Triage & Return Home**: validált hibalista, trace/evidence, prioritás, biztonságos patch-ajánlás, újratesztelés, lezárás.
6. **Release Gate & two-phone Pilot**: S24 Ultra kétprofilos acceptance, no critical regressions, rollback/OTA verification, dokumentált UAT.

## 5. Biztonsági és tervezési döntések

- A Guardian **nem általános célú, korlátlan autonóm szereplő**, hanem minimumjogú, ellenőrizhető agent + determinisztikus tesztek kombinációja.
- Környezetkülönválasztás: `production=observe-only`, `staging=controlled stress`. Külön service auth, synthetic data, max requests/budget/time, emergency stop.
- Nincs automatikus felvételkészítés/voice listening; követelmények csak hozzájárulással mentett jegyzetekből.
- A teszt eredménye nem „100% garantált működés”: a **meghatározott acceptance kritériumok 100%-os teljesítése** mérhető.
- CI nem futhat végtelen ciklusban; módosításonként releváns rövid smoke suite, mérföldkőnél kiterjedt QA.
- Nincs éles futtatás, DB migráció, harmadik feles hozzáférés vagy OTA/telepítés pusztán e terv elfogadásától.

## 6. Milestone Exit Criteria

| Milestone | Elvárt bizonyíték | Kiadási kapu |
|---|---|---|
| GI-M1 Ledger | verziózott acceptance lista + képernyő-baseline | szerkesztői jóváhagyás |
| GI-M2 Onboard Pilot | erőforrás before/after, nulla új felesleges polling | energy/egress guardrail |
| GI-M3 External QA | reprodukálható automatizált E2E / screenshot / negative tests | kritikus tesztek zöldek |
| GI-M4 Return Home | bizonyítékos hibajegy, javítás/újrateszt kapcsolat | regresszió nem marad nyitva |
| GI-M5 Release Gate | kéttelefonos S24 Ultra UAT, rollback-protokoll | emberi Go/No-Go |

**Első megvalósítási mérföldkő:** GI-M1 Ledger és referencia-screenshot baseline, nem egy minden modulra kiterjedő önálló AI-indítás.
