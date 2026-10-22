# HealthHub · Living Architecture & Development Documentation
**Utolsó karbantartás: 2026-10-22** · **Architecture Grand Design v1.0** · minden műszaki dokumentum nyilvános, betegadat és token nélkül.

## 🏛️ A rendszer jelenlegi műszaki kiindulópontja

- **[Architecture Grand Design · Living Blueprint](./HEALTHHUB_ARCHITECTURE_GRAND_DESIGN.md)**: kétprofilos topológia, Android → HealthHub → Dropbox App Folder → ChatGPT Analytics adatáram, Supabase/Ask Léna, jogosultságok, fájlsémák, E2E bizonyítékok és verziók.
- **[Operations & Recovery Runbook](./HEALTHHUB_OPERATIONS_RECOVERY_RUNBOOK.md)**: Project Control gomb eltűnés, Admin renderer, Dropbox 401/403/409, frissességi eltérések, profilizoláció, hibakeresési és rollback lépések.
- **[Adminban megnyitható prémium dokumentumnéző](../architecture-grand-design.html)**: Architecture / Runbook nézet, keresés, nyomtatás.
- **[Project Control · központi master](../project-control.json)**: naprakész epicek, mérföldkövek, státuszok és változásnapló; az Adminban végzett helyi override nem írja át automatikusan a GitHub mastert.
- **[Smart Arrival / Mókuska Notification Studio v1](./SMART_ARRIVAL_MOKUSKA_NOTIFICATION_STUDIO_V1.md)**: jóváhagyott érkezési/távozási értesítés-szerkesztő, öt hang, kézi TESZT-előnézet. v788-ban első beállító UI kódolva; geofencing / valódi Android push és háttérkövetés még nem él.
- **[ChatGPT Dropbox-first architektúra v731](./chatgpt-dropbox-architecture-v731.md)**: történeti kiindulási terv; a v741/v742 megvalósulásról a Grand Design aktuálisabb.
- **[v739 Dropbox külön engedélyezés előfeltételei](./chatgpt-dropbox-bridge-v739-preconditions.md)**: történeti hitelesítési/engedélyezési dokumentum.

### Hiteles állapot · 2026-10-21

A v742 egyszeri, **mindkét profilra LIVE VERIFIED** Dropbox ChatGPT Analytics fájlfeltöltést és connector-olvasást biztosított. A forrás JSON-ok ugyanabból a HealthHub Vaultból származnak, a célmappába külön engedéllyel kerülnek. Ez **nem** 24/7 szinkron. A régi v380-as buildszám a korábbi történeti snapshotokban szerepel; a ténylegesen betöltött modulokat az aktuális healthhub/index.html mutatja. A v743 provenance/státuszjavítás külön PR #388, az itt vizsgált állapotban még nincs élesítve.

---

## Történeti archívum

## Premium Glass Golden Design · 2026-10-14

- [HealthHub Premium Glass Design & Léna Hero Character Playbook v1](./HEALTHHUB_PREMIUM_GLASS_DESIGN_PLAYBOOK_V1.md): az egységes, prémium, mobilbarát Hero / csempe / font / téma szabályai, ugyanaz a Léna minden fő modulban, Home 3×4 (12 csempe: 9 modul + 3 önálló Daily briefing) és Receptár → Nutrition jóváhagyott terv, élesítés előtt ellenőrizendő.
- Ez a design-contract csak dokumentáció. **Nem élesíti** a vizuális átalakítást, receptköltöztetést vagy képcserét; a korábbi jóváhagyott képek és működő adatút változatlanok.

## Következő alkalommal innen indulj
1. [2026-10-11 napzáró átadás](./2026-10-11-end-of-day-handoff-v380.md): tények, v378–v380 hibajavítások, nyitott kockázatok és folytatás.
2. [Intelligence Roadmap & Quality Scorecard](./2026-10-11-intelligence-roadmap-and-quality-scorecard.md): IQ-S1 → IQ-S5, 20 kérdéses tesztcsomag, elfogadási feltételek.
3. [Élő projekttracker](../project-control.json): változásnapló, státusz, HH-IQ-001–008 feladatok.
4. [Ask Léna v331 történeti mérföldkő](./2026-10-09-ask-lena-v331-real-ai-milestone.md): a valós AI-stream kialakításának korabeli műszaki összefoglalója.
5. [Intelligence Context v328](./2026-10-09-intelligence-context-v328.md): forrásadapterek korábbi architektúrája.

## Future Innovation Portfolio · 2026-10-16

- [Ask Léna Voice + HH Language Switch / Guardian / Mental Wellness / Mood Booster / Guided Relaxation / Integrative Care Epic-vízió](./2026-10-16-future-epics-voice-guardian-wellness.md): 13 új stratégiai, **Idea / 0% / Future** tracker-feladat; magyar anyanyelvi, természetes Léna-hang az első nagy hosszú távú álom. **Nem implementáció, nem aktív sprint, nem éles health funkció.**

## Alapszabályok
- Működő v380 megtartása, csak mért minőségjavítás; új UI-funkció jelenleg nem prioritás.
- A régebbi v331/v328 dokumentumok verzióspecifikus deploy/QA állításai nem érvényesek változtatás nélkül a mostani kiadásra.
- **Privát személyes egészségügyi adat, API-kulcs vagy valódi AI-kérdés/válasz ide nem kerülhet.** Teszthez szintetikus/anonimizált adatok.
- Különválasztandó: CI pass, telepítés, telefonos elfogadás, klinikai adatminőség.

**Megjegyzés:** a docs-only módosítás új git commitot és Pages buildet indíthat, de nem jelent új alkalmazás-verziót; az éles app marad v380.

## Aktuális fejlesztési sorrend · 2026-10-13

A fenti v380-as napzáró történeti pillanatkép. A legújabb **jóváhagyott, moduláris FamilyHub-stratégia** és a konkrét következő feladat a [FamilyHub / Sleep Intelligence / Safety terv](./2026-10-13-modular-familyhub-safety-vision.md) dokumentumban, illetve a [Project Control](../project-control.json) HH-SLI és HH-EMERG feladataiban található.

**Aktív fejlesztési fókusz:** Sleep AI Intelligence 2.0 → adatgyűjtés és bizonyítéknyilvántartás → 7/30/90 trendek és személyes Sleep Advisory archívum → Ask Léna integráció. Ezután Safety/CPR-AED tervezési és validációs kör, amely **megelőzi** az új Food/Nutrition funkciókat. HealthRadar legacy cutover nyitott, mert további fontos kiegészítés várható. A v433 Golden Standard Sleep dizájn változatlan; ez csak tervezési frissítés, nem új éles funkció.
