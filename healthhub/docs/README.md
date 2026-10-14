# HealthHub | fejlesztői dokumentumtár
**Aktuális állapot:** 2026-10-11, éles build: **v380**. A korábbi mérföldkő-dokumentumok történeti pillanatképek; nem helyettesítik az aktuális állapotot.

## Premium Glass Golden Design · 2026-10-14

- [HealthHub Premium Glass Design & Léna Hero Character Playbook v1](./HEALTHHUB_PREMIUM_GLASS_DESIGN_PLAYBOOK_V1.md): az egységes, prémium, mobilbarát Hero / csempe / font / téma szabályai, ugyanaz a Léna minden fő modulban, Home 3×4 (12 csempe: 9 modul + 3 önálló Daily briefing) és Receptár → Nutrition jóváhagyott terv, élesítés előtt ellenőrizendő.
- Ez a design-contract csak dokumentáció. **Nem élesíti** a vizuális átalakítást, receptköltöztetést vagy képcserét; a korábbi jóváhagyott képek és működő adatút változatlanok.

## Következő alkalommal innen indulj
1. [2026-10-11 napzáró átadás](./2026-10-11-end-of-day-handoff-v380.md): tények, v378–v380 hibajavítások, nyitott kockázatok és folytatás.
2. [Intelligence Roadmap & Quality Scorecard](./2026-10-11-intelligence-roadmap-and-quality-scorecard.md): IQ-S1 → IQ-S5, 20 kérdéses tesztcsomag, elfogadási feltételek.
3. [Élő projekttracker](../project-control.json): változásnapló, státusz, HH-IQ-001–008 feladatok.
4. [Ask Léna v331 történeti mérföldkő](./2026-10-09-ask-lena-v331-real-ai-milestone.md): a valós AI-stream kialakításának korabeli műszaki összefoglalója.
5. [Intelligence Context v328](./2026-10-09-intelligence-context-v328.md): forrásadapterek korábbi architektúrája.

## Alapszabályok
- Működő v380 megtartása, csak mért minőségjavítás; új UI-funkció jelenleg nem prioritás.
- A régebbi v331/v328 dokumentumok verzióspecifikus deploy/QA állításai nem érvényesek változtatás nélkül a mostani kiadásra.
- **Privát személyes egészségügyi adat, API-kulcs vagy valódi AI-kérdés/válasz ide nem kerülhet.** Teszthez szintetikus/anonimizált adatok.
- Különválasztandó: CI pass, telepítés, telefonos elfogadás, klinikai adatminőség.

**Megjegyzés:** a docs-only módosítás új git commitot és Pages buildet indíthat, de nem jelent új alkalmazás-verziót; az éles app marad v380.

## Aktuális fejlesztési sorrend · 2026-10-13

A fenti v380-as napzáró történeti pillanatkép. A legújabb **jóváhagyott, moduláris FamilyHub-stratégia** és a konkrét következő feladat a [FamilyHub / Sleep Intelligence / Safety terv](./2026-10-13-modular-familyhub-safety-vision.md) dokumentumban, illetve a [Project Control](../project-control.json) HH-SLI és HH-EMERG feladataiban található.

**Aktív fejlesztési fókusz:** Sleep AI Intelligence 2.0 → adatgyűjtés és bizonyítéknyilvántartás → 7/30/90 trendek és személyes Sleep Advisory archívum → Ask Léna integráció. Ezután Safety/CPR-AED tervezési és validációs kör, amely **megelőzi** az új Food/Nutrition funkciókat. HealthRadar legacy cutover nyitott, mert további fontos kiegészítés várható. A v433 Golden Standard Sleep dizájn változatlan; ez csak tervezési frissítés, nem új éles funkció.
