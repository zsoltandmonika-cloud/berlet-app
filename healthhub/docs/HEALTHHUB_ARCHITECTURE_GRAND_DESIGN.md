# HealthHub · Architecture Grand Design
## Living Technical Blueprint · 2026-10-21 · 1.0

**Rendszer:** Léna Health Ecosystem / HealthHub · **Tulajdonosok:** Zsolt és Mónika  
**Kód:** https://github.com/zsoltandmonika-cloud/berlet-app  
**Alkalmazás:** https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/  
**Runbook:** [HealthHub Operations & Recovery](./HEALTHHUB_OPERATIONS_RECOVERY_RUNBOOK.md)  
**Project Control:** [Központi JSON](../project-control.json)  
**Történeti fejlesztési dokumentumok:** [Dokumentumtár](./README.md)

> **Publikus műszaki dokumentáció.** Tilos beletenni egyedi személyes egészségügyi értéket, betegleletet, OAuth access/refresh tokent, privát API-kulcsot, jelszót, teljes betegazonosítót vagy belső, személyes napló tartalmát. A GitHub Pages nyilvános tárhely, nem egészségügyi Vault.

## 1. North Star

**Gondoskodás + Adatismeret + Intelligencia.** Kétprofilos, bizonyítékra épülő családi egészségügyi központ mobilbarát prémium Glass UX-szel, Zsolt kék, Mónika diszkrét rózsaszín megjelenéssel és egységes profilváltással.

Cél: Health, Activity, Sleep, Nutrition/BS/AJ, Digital Wellbeing, gyógyszerek, tünetek, leletek, Medical Master, Timeline, Daily Health és Ask Léna egységes forrás-, személy- és időpontkezeléssel. A mért tényt, számítást, hipotézist és tanácsot elkülönítjük. A rendszer nem diagnosztizál és nem módosít önállóan gyógyszerelést.

**Dokumentációs fegyelem:** PLANNED → CODED → CI TESTED → MERGED → DEPLOYED → LIVE VERIFIED → USER ACCEPTED. Nem egyenértékű státuszok. Minden jelentős architekturális változáskor a Blueprint, Runbook, Project Control és változásnapló frissítendő.

## 2. Rendszertopológia

```text
Samsung Galaxy Watch / Samsung Health
    │
    └── Android Health Connect ─┐
Android Usage Access ──────────┤
                               ▼
                         HH One / Android Bridge
                               │
                        HealthHub Web UI + local IndexedDB
                          │                  │
            ┌─────────────┴───┐       Supabase privát
            │                 │       Edge / RLS / OpenAI API
       Dropbox forrás       Ask Léna
       App Folder Vault
            │
       v738 profil szerinti snapshot
            │
       v742 opt-in cél Dropbox OAuth + SHA-256
            │
       /HealthHub-ChatGPT-Analytics/
            │
       ChatGPT Dropbox connector → felhasználó által kért elemzés

GitHub repository + Actions ─→ GitHub Pages webkód és dokumentáció
```

**Trust boundaries:**
- Android Health Connect és Usage Access külön forrás és külön engedély. Képernyőidő nem Health Connect rekord.
- Helyi böngészős cache nem felhőmentés; a privát Dropbox Vault és Supabase nem automatikusan azonos.
- Forrás Dropbox: App Folder scope, nem ír a normál gyökérbe. ChatGPT cél Dropbox: **külön OAuth** és külön engedély, Full Dropbox scope-pal.
- A ChatGPT webes connector külön csatlakozás; a HealthHub célfájlba írása önmagában nem bizonyítja a ChatGPT általi olvasást.
- GitHub Pages, repository és CI logok kizárólag nem érzékeny technikai információt tartalmazhatnak.
- Supabase/Edge/OpenAI API útvonala és a ChatGPT személyes Dropbox-alapú elemzése külön rendszer.

## 3. Deployment és operációs kódtérkép

| Funkció | Modul / belépési pont | Első hibakeresési ellenőrzés |
|---|---|---|
| Fő webapp, modulok és cache | `healthhub/index.html` | script include-ok, verzió, Live HTML |
| Project Control Admin | `healthhub/live-v142.js`, `healthhub/project-control.json` | `window.hhPcOpen()` és Admin DOM |
| Admin fejlesztési governance | `healthhub/hh-development-charter-admin-v658.js` | `haOv`, `haBody` overlay |
| Forrás Dropbox OAuth | `healthhub/live-v161.js` | `window.HH_DROPBOX_VAULT` |
| Forrásleltár és fájlfrissesség | `healthhub/hh-chatgpt-dropbox-analytics-v732.js` | App Folder lista, jogosultság |
| 24h Health Connect + Digital Wellbeing JSON | `healthhub/hh-chatgpt-manual-export-v738.js` | `build(profile,clock)` |
| Cél Dropbox PKCE | `healthhub/hh-chatgpt-target-auth-v739.js` | OAuth callback és IndexedDB |
| Cél Dropbox valódi mappaolvasás | `healthhub/hh-chatgpt-target-onboard-v739.js` | v740 célmappa azonosító |
| Írás + visszaolvasási próba | `healthhub/hh-chatgpt-target-probe-v741.js` | csak nem orvosi tesztfájl |
| Kétprofilos adatfeltöltés | `healthhub/hh-chatgpt-profile-sync-v742.js` | cél ID + SHA-256 és időbélyeg |
| Medical Master export | `healthhub/medical-master-export-v715.js` | manifest, külön 6+1 privát modell |
| MKB / Ask Léna | `healthhub/mkb-full-index-v699.js`, `ask-lena-mkb-v676.js`, `mkb-ai-context-v677.js` | engedélyezett leletidézetek |
| Timeline és BS/AJ | `healthhub/timeline-truth-v725.js`, `hh-observation-rag-v728.js` | adatforrás, dátum és besorolás |
| Android Bridge / HH One | `healthhub/android-bridge/` és kapcsolódó kiadási fájlok | aktuális APK, aláírás, Health Connect/Usage Access |
| RLS és személyes napi AI | Supabase HealthHub-Core, privát táblák/Edge Functions | auth, RLS, forrásfedettség |
| CI/regresszió | `.github/workflows/` és `healthhub/tests/` | PR-hez tartozó aktuális workflow |

**Fontos:** a korábbi `liveBuild: v380` a Project Control történeti gyűjtőváltozata. A HealthHub külön komponensei saját v### verziót kapnak. A jelenlegi telepített modullistát az aktuális `index.html` bizonyítja, nem egy régi roadmap.

## 4. Kanonikus fájlútvonalak

### 4.1 Forrás HealthHub Dropbox, App Folder

```text
/HealthHub/
  master/
    manifest.json, profiles.json, documents.json, explanations.json,
    medications.json, appointments.json, symptoms.json, medical-master.json
  profiles/
    zsolt-health-connect.json, zsolt-digital-wellbeing.json,
    zsolt-nutrition.json, zsolt-samsung-health.json, zsolt-vault.json
    monika-health-connect.json, monika-digital-wellbeing.json,
    monika-nutrition.json, monika-samsung-health.json, monika-vault.json
  sync/
    zsolt-lena-health-context.json, monika-lena-health-context.json
  analytics/
    healthhub-chatgpt-source-index.json,
    healthhub-daily-health-zsolt.json, healthhub-daily-health-monika.json
```

Ezek **elvárt technikai útvonalak**, nem garanciák minden fájl frissességére vagy a teljes eszközadat-lefedettségre. A v732 forrásleltárhoz vissza kell térni hiba esetén.

### 4.2 ChatGPT cél Dropbox

```text
/HealthHub-ChatGPT-Analytics/
  healthhub-connection-test-v741.json   # ártalmatlan kapcsolatpróba
  zsolt/latest.json
  monika/latest.json
```

Az ellenőrzött célmappa Dropbox folder ID-je: `id:n7qchVNGAogAAAAAAAAABQ` (nem hitelesítő titok). A folder ID egyezése erősebb bizonyíték, mint az eltérő formátumú OAuth account ID végződések összevetése.

### 4.3 A v738/v742 JSON szerződés

- `schema: healthhub.chatgpt.manual-24h-digital/1`, `profile: zsolt|monika`, `exportedAt` és `window`.
- `data.healthConnect.records`: időablakba eső események. Naptári napi aggregátum nem azonos egy gördülő pontos 24h értékkel.
- `data.digitalWellbeing`: `retentionDays` csak megőrzési cél, a tényleges napok számát `hours[].hourStartMs` alapján kell mérni.
- `data.nutrition`, `samsungHealth`, `lenaHealthContext`, `dailyHealth` opcionális források; `sources[]` és `warnings[]` alapján ellenőrzendők.
- v742 olvasó/író külön modul, az eredeti v738 `isAutomaticSync:false` és `chatgptReadVerified:false` felső szintű mezői félreérthetők; ezek az **eredeti kézi exportot** írják le, nem a későbbi átvitelt. A v743 provenance-pontosítás [PR #388](https://github.com/zsoltandmonika-cloud/berlet-app/pull/388) korábbi vizsgálatkor **CI TESTED, de nem DEPLOYED**.
- A v742 böngésző-helyi kulcsai: `hh-chatgpt-snapshot-optin-v742` és `hh-chatgpt-snapshot-status-v742`; nem globális, felhőoldali sync ledger.

## 5. Pontos adatfolyam és frissítési mechanizmus

1. Egészség- és képernyőidő-adatok a készüléken keletkeznek; külön gyűjtő és jogosultság viszi őket a HealthHub privát forrásaihoz.
2. A v738 az aktuális profilból **kötelező** Health Connect és Digital Wellbeing, továbbá elérhető opcionális JSON-források alapján snapshotot épít.
3. A v739 cél OAuth a forrás Vaulttól független. PKCE, offline refresh; a tokenek a böngészőben, nem GitHubon.
4. A v740 ellenőrzi, hogy a célmappa ID-je a várttal azonos.
5. A v742 a kiválasztott profil `latest.json` fájlját feltölti, visszaolvassa, SHA-256-ot összehasonlít, csak ezután rögzít `verifiedAt` állapotot.
6. A ChatGPT csak az adott felhasználói kérésnél, a Dropbox connectoron keresztül olvassa a fájlt. Ez az olvasás **külön** bizonyíték.
7. A v742 a profil engedélyezése után 6 órás küszöbbel, 15 percenként és fókusz eseményeknél próbálkozik, **csak nyitott/látható HealthHubban**. Nincs igazolt 24/7 háttérszinkron.
8. A `latest.json` felülíródik. Historikus változatok megőrzése és korábbi jó verzió visszaállítása külön backlog.

## 6. Adatminőség és időmodell

| Idő/állapot | Jelentése | Nem jelenti |
|---|---|---|
| mérési `startTime/endTime/date` | mérési/megfigyelési idő | sync ideje |
| `collectedAtMs` | Digital Wellbeing collector ideje | 30 teljes megfigyelt nap |
| `exportedAt` | JSON snapshot ideje | minden esemény mai |
| Dropbox `server_modified` | célfájl szerveroldali módosítása | új mérés történt |
| `verifiedAt` | feltöltés + SHA-256 visszaolvasás ideje | ChatGPT már elolvasta |
| ChatGPT connector file read | tényleges megnyitás | minden üzenetnél automatikus háttérolvasás |

Hiányzó adat != mért nulla; naptári aggregátum != gördülő 24h; Samsung és Health Connect duplikátum összeadása tilos. Az óra SpO₂/alvásstádiumai becslések; korreláció nem bizonyított okság. Minden megjelenített idő Europe/Budapest, DST-t is figyelembe véve.

## 7. Biztonsági invariánsok

- Profilok elkülönítése minden olvasási és írási műveletben.
- Nincs betegadat GitHub commitban, Issues-ben, publikus Pages-dokumentumban vagy CI-logban.
- A cél Full Dropbox OAuth széles hozzáférés, ezért minimális jogosultsági hardening és XSS/browser-origin audit nyitott feladat.
- Source/Target Dropbox tokenek és adatok nem cserélhetők fel; nem adunk ki tokent képernyőképen.
- Az adminban az automatikus ismétlés leállítása nem törli a korábban elküldött másolatokat. Dropbox Connected Apps visszavonás ettől külön.
- Medical Master eredetik, orvosi PDF/ECG kép és teljes kórtörténet **nincs** automatikusan benne a v738/v742 kivonatban.
- Biztonsági és klinikai döntésekhez eredeti orvosi forrás, nem ChatGPT-generált összefoglaló kell.

## 8. Evidence Ledger · 2026-10-21

| Mérföldkő | Státusz | Technikai bizonyíték |
|---|---|---|
| v732 HealthHub App Folder leltár | működő | Dropbox metadata + forráslista |
| v738 kétprofilos export | LIVE VERIFIED | mindkét JSON szerkezeti ellenőrzés |
| v739/v740 cél Dropbox és folder ID | LIVE VERIFIED | azonos tényleges mappa |
| v741 ártalmatlan írási próba | LIVE VERIFIED | fel-/visszaolvasás, ChatGPT connector read |
| v742 Zsolt és Mónika `latest.json` | LIVE VERIFIED (egy alkalom) | két fájl ChatGPT-kapcsolaton át olvasható |
| Digital Wellbeing 30 nap | 30 napos megtartás, **nem** 30 napos mérés | a 2026-10-21-es mintában mindkét profilnál 10 megfigyelt nap |
| ismételt 6 órás, automatikus futás | NEM IGAZOLT | következő esedékes valós futás megfigyelendő |
| valódi, app-zárás utáni 24/7 háttér | PLANNED | nincs ellenőrzött szerveroldali scheduler |
| v743 utolsó sync / provenance | CI TESTED; PR #388 nyitott az auditkor | nem tekinthető éles funkciónak |

## 9. DevOps, QA és helyreállítás

Fejlesztési kör: igény → kód/kontraktus audit → külön branch → szintetikus unit/regresszió → PR → GitHub CI és Level 3 Guard → merge → Pages és aktuális script URL ellenőrzés → privát élő próba (két profil) → elfogadás → blueprint/project changelog.

Elsődleges QA: `healthhub/tests/`, `.github/workflows/healthhub-chatgpt-*.yml`, medical/Timeline saját tesztek. GitHub CI nem bizonyít működő Android-engedélyt és nem bizonyít friss, orvosi adatot.

Rollback: előző stabil commit visszaállítása, csak az érintett script include revertje; az eredeti Dropbox Vault változatlan. Nem törlünk/átnevezünk orvosi forrásokat hibakeresési kísérletként.

**Operációs hibajegy minimális adatai:** eszköz/böngésző, modul, aktív profil, utc+budapesti idő, commit/script verzió, HTTP hibakód, forrás- és célidőbélyeg, szükség esetén kitakart képernyőkép. Secretet és privát orvosi JSON-t nem kérünk a GitHub issue-ban.

A részletes reprodukciós és recovery forgatókönyvek a [Runbookban](./HEALTHHUB_OPERATIONS_RECOVERY_RUNBOOK.md) találhatók.

## 10. Fenntarthatóság és nyitott fő backlog

1. Stabil Admin-útvonal a Project Control és Architecture Grand Design megnyitására, dinamikus DOM-cserénél is.
2. Éles 6 órás ismétlődő szinkron több egymást követő ciklusának igazolása.
3. A v743 típusú frissesség-/provenance kijelzés véglegesítése.
4. Health Context vs. nyers Health Connect konzisztenciaaudit; Nutrition/BS/AJ és Digital Wellbeing valós lefedettség.
5. Valódi 24/7 privát, hitelesített background exporter külön security-review után.
6. Medical Master és PDF eredetik hash-alapú, külön jóváhagyott hozzáférési modellje.
7. Kód és Project Control történeti státuszainak rendszeres összevetése; ne maradjon régi „aktuális” v380 címke.
8. Dokumentáció-verzió ellenőrzése release-gate részeként.

### Változásnapló

- 2026-10-21 · Blueprint 1.0 · Első egységes, verziózott topológia, adatfolyam, modulindex, evidenciatérkép, DevOps/QA és recovery hivatkozások. Minden új jelentős PR hozzáadja a saját változását.


## 11. Egységes Admin információs architektúra · v745

**Felhasználói döntés:** a fő taskbar korábbi egyetlen „Továbbiak” célpontja **Admin**. Az általa megnyitott teljes oldal az Admin; nincs többé külön, redundáns „Admin Data Hub → Megnyitás” gomb.

- **Rendszerterv és projektirányítás:** Grand Design, Recovery Runbook, Project Control.
- **Cloud Vault és ChatGPT Analytics:** eredeti forrás Dropbox, mappaellenőrzés, profilozott AI-kivonat, szinkron.
- **Adatkezelés és diagnosztika:** a meglévő `haOv` / `haBody` Admin DOM-panel ugyanazon az oldalon látható, eredeti gombokkal és kiegészítőkkel. A `hh-unified-admin-v745.js` csak láthatóan beágyazza és életciklusosan visszahelyezi a panelt, nem másolja a betegek adatait és nem hajt végre importot automatikusan.
- **Biztonság / helyreállítás:** régi privát karton és recovery eszközök.
- **Egyéb eszközök:** ismeretlen/jövőbeli kártyák továbbra is láthatók külön csoportban.

**Kizárólag felületi takarítás:** a régi `hhAdminMenuCard` „Megnyitás” belépő, a `hhDropboxVaultCard`/`hhCloudVaultCard` duplikált felületi kártyák és a művelet nélküli adapter-állapotinformációs kártya elrejtve. Az eredeti Admin-kód, funkciók, privát fájlok, localStorage, Dropbox Vault és snapshotok nem törlődnek.

**Mechanizmus:** a régi overlay DOM a `healthSubContent` alatt jelenik meg, miközben Admin aktív, így a korábbi `haBody`-hoz kapcsolódó diagnosztikai és governance kiegészítők sem tűnnek el. Az Admin oldal elhagyásakor a meglévő overlay visszakerül a document body alá, és ismét rejtett fallback. A fő `renderHealthSection` hívás körül konzervatív leválasztás/újrabeágyazás van. A v745 CI-mock teszteli az idempotens újramountot; az éles mobil és desktop acceptance külön szükséges.

**Release státusz:** PR #389 része, CODED és CI TESTED, a felhasználói élő elfogadás még hátravan.
