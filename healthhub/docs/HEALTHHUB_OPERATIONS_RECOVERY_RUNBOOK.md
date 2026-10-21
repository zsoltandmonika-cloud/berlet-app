# HealthHub · Operations & Recovery Runbook
## Diagnosztika, helyreállítás, kiadásellenőrzés · 2026-10-21 · 1.0

**Architektúra:** [Grand Design](./HEALTHHUB_ARCHITECTURE_GRAND_DESIGN.md)  
**Központi projektterv:** [Project Control](../project-control.json)  
**Éles app:** https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/

## Operátori alapszabályok

1. Először csak olvasás: éles commit, modul, profil, adatforrás, forrásidő, célidő és böngészőeszköz.
2. Ne kerüljön betegadat, gyógyszerlista, access/refresh token, Dropbox App secret a nyilvános GitHubba vagy CI logba.
3. Helyi mock/szintetikus teszt nem helyettesíti az éles profil- és Dropbox-szintű tesztet.
4. A hiányzó adat nem nulla; a feltöltés ideje nem a mérés ideje.
5. Hibajavításnál a kanonikus HealthHub App Folder Vault érintetlen; előbb visszaállítható GitHub PR és külön ellenőrzés.

## 1. Gyors hibafeltárási sorrend

- **Felület / verzió:** vizsgáld meg az éles `healthhub/index.html` script-hivatkozásait, a commitot, a böngésző cache-t, és a GitHub Actions eredményét.
- **Admin:** az overlay `haOv` és `haBody` elemeket használja; a dinamikus újrarajzolás a beszúrt kártyát eltüntetheti.
- **Forrás Dropbox:** `HH_DROPBOX_VAULT`, App Folder metadata-lista, profile JSON fájlok és módosítási idő.
- **Cél Dropbox:** folder ID, külön OAuth státusz, jogosult fájlok. A célmappa: `/HealthHub-ChatGPT-Analytics/`.
- **Teljesség:** v738 `sources[]` / `warnings[]`, Health Connect rekordok és Digital Wellbeing tényleges megfigyelési időpontok.
- **ChatGPT:** célzott Dropbox connector file read, nem pusztán webes UI „sync OK”.

## 2. Project Control nem található az Adminban

**Tünet:** a Project Control kártya / gomb eltűnt. **Kód:** `healthhub/live-v142.js`; **master fájl:** `healthhub/project-control.json`. A v142 `hhPcAdminCard` elemet szúrja a `haBody`-ba, és `window.hhPcOpen()` nyitja a projektet. Admin-rerender eltávolíthatja a kártyát; egy később újraregisztrált `haOpen` hívás nem feltétlenül indítja újra a korábbi wrapperét.

**Javítás:** stabilan újramountolt Project Control belépő az Adminban, DOM-csere után újrainjektálás; fallback a master GitHub fájlra. Ne törölj helyi projekt-override-okat; az Admin szerkesztése böngészős localStorage-override lehet, nem automatikus GitHub merge.

## 3. Grand Design nem látszik

**Ellenőrizd:** `index.html` tartalmazza-e a Blueprint admin scriptet, a GitHub Pages frissítette-e a fájlokat, az Admin overlay nyitva van-e. Közvetlen helyreállító URL: `healthhub/architecture-grand-design.html`, illetve a `healthhub/docs/HEALTHHUB_ARCHITECTURE_GRAND_DESIGN.md`. A közvetlen HTML-oldal ugyanarról a GitHub Pages originről tölti a műszaki Markdown dokumentumot.

**Javítás:** pontos cache-busting scriptverzió, dokumentum HTTP státusz, Admin gomb újramount. Helyi egészségügyi cache tömeges törlése nem javítás.

## 4. Forrás Dropbox hibás / régi

**Első teszt:** a v732 **Forrásleltár**; az App Folder virtuális `/HealthHub` fájllistája, és a kötelező `health-connect` + `digital-wellbeing` fájlok. A forrás Vault OAuth nem azonos a cél Dropbox OAuth-jával.

**Ha nincs új adat:** natív HH One/Android Bridge ütemezés, Health Connect/Usage Access engedély, Samsung import, készülék hálózat, adatgyűjtési időpont. A v742 új feltöltése nem generál új mérést.

## 5. Cél Dropbox vagy ChatGPT nem látja a fájlt

- v739 cél OAuth és v740 célmappa metadata próba; ellenőrizd a folder ID-t: `id:n7qchVNGAogAAAAAAAAABQ`.
- v741 `healthhub-connection-test-v741.json` nem orvosi próba feltöltése / visszaolvasása.
- v742 `zsolt/latest.json` és `monika/latest.json` külön kötelező profilteszt, SHA-256 readback.
- A ChatGPT külön file fetch-csel bizonyítja az olvashatóságot. A HealthHub státusz önmagában nem jelent connector olvasást.
- HTTP 401/403: hiányzó/lejárt cél OAuth; 409: útvonal/scope; más folder ID: **felírás tiltva**, előbb fiókazonosság rendezése.

## 6. „Változatlan” / frissességi félreértés

A v742 legalább 6 órás küszöbbel, nyitott HealthHubban és periodikus/fókusz eseményre fut; egy 6 órán belüli skip **nem** bizonyít változatlan Health Connect értéket. El kell különíteni:
- nyers mérés időpontja;
- Android collector ideje;
- `exportedAt` (JSON snapshot);
- Dropbox `server_modified`;
- v742 `verifiedAt` (feltöltés + readback);
- ChatGPT tényleges lekérési ideje.

Ha `retentionDays=30` de csak 10 megfigyelt Digital Wellbeing nap van, csak 10 napra vonatkozó következtetést szabad tenni.

## 7. Ask Léna és ChatGPT Analytics ellentmondás

Ask Léna saját Health Context/Supabase/Edge kontextusból dolgozhat; a ChatGPT külön Dropbox-snapshotból. Vizsgáld: `sync/{profile}-lena-health-context.json` keletkezési ideje és lefedettsége vs. `profiles/{profile}-health-connect.json` rekordjai. Az orvosi tényt nem írhatja felül egy régi AI-szöveg. Mónika és Zsolt rekordjait soha nem szabad egyesíteni személyazonosító nélkül.

## 8. Biztonsági incidens

**Gyanú:** illetéktelen fiók, rossz profil, váratlan fájl, OAuth hibakód.
- Az automatikus v742 ismétlés kikapcsolása és az érintett Dropbox Connected Apps engedély visszavonása **külön** műveletek.
- Végezz read-only auditot: jogosult fiók, cél ID, commit, fájlnév és Dropbox metadata.
- Ne másolj OAuth tokent vagy orvosi tartalmat hibajegybe.
- A `latest.json` felülíródik; verziótörténet nélküli automatikus visszaállítást **nem** szabad feltételezni.

## 9. Kiadási és dokumentumkarbantartási kapu

| Ellenőrzés | Követelmény |
|---|---|
| Kód | változtatás dedikált ágon, pontos diff és visszaállítási terv |
| CI | syntax + szintetikus regresszió + Level 3 Guard |
| Admin | Project Control és Architecture mindkettő elérhető újrarajzolás után |
| Profil | Zsolt és Mónika elkülönített és mindkettőnél külön hibajelzés |
| Dropbox | forrás read, cél upload/readback, végül ChatGPT connector read |
| Adatminőség | forrásidő, mért idő, hiány és Digital Wellbeing tényleges napok |
| Dokumentáció | Architecture, Runbook, Project Control és docs index frissítve |
| Elfogadás | valós Chrome/S24 / szükség szerint Edge használói próba |

**Definition of Done:** nem csak CI zöld. A státuszokat külön rögzítsd: CODED / CI TESTED / MERGED / DEPLOYED / LIVE VERIFIED / USER ACCEPTED.

## 10. Hiba esetén összegyűjtendő információ

Modul + aktív profil + eszköz/böngésző + Europe/Budapest és UTC idő + aktuális commit + forrás és cél időbélyegek + HTTP hibakód + kitakart képernyőkép. Ez elég a technikai reprodukáláshoz; kórtörténet és access token nem szükséges.

**Változásnapló:** 2026-10-21 · Runbook v1.0 · Azonosítók, hibafák, recovery, no-secret/ no-clinical-log elvek, release acceptance.
