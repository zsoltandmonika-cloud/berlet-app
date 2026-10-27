# SH9 Universal AI Intelligence Core · Golden Standard v1.0
**2026-10-27 · jóváhagyott architektúra, BACKLOG, még nem telepített központi szolgáltatás.**

## Alapelv
**Az AI Intelligence a közös alapréteg**, amelyre minden SH9 és jövőbeli alkalmazás épül, a legkisebb Pong játéktól a HealthHub kritikus egészségügyi moduljáig. Guardian Intelligence = reliability, QA és biztonság erre épülve; nem egy mindent bekebelező, külön új launcher modul.

## Négy kötelező Core-képesség
1. **Usage & Reporting**: szolgáltatónként Supabase requests/egress/Realtime, GitHub Actions/percek, Dropbox, AI token/API és költség, mobil GPS/akku amennyiben megbízható forrásból elérhető. Mért baseline, before/after, trend, quota, forecast, RAG, költség-riasztás, audit, adatfrissesség és UNKNOWN állapot.
2. **Self-Health**: takarékos event-driven/schedule alapú app health és valós böngészős/Android smoke, különösen inline JS/HTML parser + tényleges HealthHub generált oldal.
3. **Self-Healing**: jogosultságkorlátozott, előzetesen engedélyezett, visszafordítható recovery; AI kódpatch csak izolált PR és független QA után, külön user-release approval.
4. **Self-Improvement**: önállóan felfedezett opportunity → feasibility, benefit, risk, implementáció/üzemeltetés költsége, confidence, rollback, human döntés és utólag igazolt megtakarítás.

## Nemzetközi AI Squad
Léna = AI Orchestrator; DeepSeek = opcionális technikai második vélemény; harmadik Innovation Scout szerep = modell később kiválasztva. Egy közös router mind a 9 modulhoz, feladatalapú on-demand modellválasztással és külön költséglimittel. Research-only nyilvános GitHub/Hugging Face/fórum források; külső AI **semmilyen privát rendszerekhez nem fér hozzá**. Csak általános, szintetikus és anonimizált problémák, untrusted output + független verifikáció.

## Három terhelési profil
- **LITE**: Pong/játék/prototípus; alacsony overhead, indítás/syntax/error smoke, alap usage + QA.
- **STANDARD**: Shopping, Travel, Family Tasks, Home; E2E, latency, usage/benefit, visual QA.
- **CRITICAL**: egészségügyi adatok, autentikáció, Supabase/RLS, GPS és Android/OTA; izoláció, fokozott biztonsági kapuk, kétprofilos kéttelefonos UAT.

## Canonical Proposal Contract
proposalId, version, source/timestamp, baseline, beforeAfterMetric, problem, options, feasibility, expectedBenefit(best/base/worst), implementationCost, runningCost, risks, mitigations, confidence, acceptanceTests, rollback, owner, reviewer, **decision (MEHET/ÁTDOLGOZÁS/HALASZTÁS/ELVETÉS)**, releaseApproval, verificationStatus. Hiányzó adat UNKNOWN.

**Életciklus:** OBSERVE → INVESTIGATE → EVIDENCE → FEASIBILITY/BENEFIT/RISK → HUMAN MEHET → SANDBOX PATCH → INDEPENDENT QA → **SEPARATE RELEASE APPROVAL** → CANARY → BEFORE/AFTER → CLOSE.

**Mérföldkövek:** AIC-M1 Usage/Reporting schema; M2 app smoke/health; M3 sandbox remedy PR; M4 proposal+benefit+risk döntési workflow; M5 AI Squad/Scout pilot; M6 újrahasználható Lite/Standard/Critical projektprofilok. Ne induljon folyamatosan és korlátlan költséggel.
