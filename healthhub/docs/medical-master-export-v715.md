# HealthHub v715 · Medical Master JSON a Leletek oldalon

## Mi készült el?
A normál HealthHub Leletek (healthSectionKind=records) oldalán egy új, Premium Glass stílusú Medical Master panel:
- Legfrissebb Medical Master letöltése: csak a privát Dropboxból olvasott és ellenőrzött JSON tölthető le. Mindkét profil dokumentumindexe és Léna-magyarázatai szerepelnek benne.
- Medical Master ellenőrzése: a hat kanonikus forrással egyeztet, szükség esetén frissíti a privát /HealthHub/master/medical-master.json hetedik fájlt.
- Automatikus 6+1 frissítés: kizárólag sikeres v304 healthhub:master-vault-synced esemény után, lelet, magyarázat, gyógyszerreferencia vagy profiladat módosításakor.

## Adatút és sértetlenség
1. A v304 a jelenlegi privát HealthHub Dropbox-hozzáféréssel a hat forrást frissíti, a manifestet utolsóként írja.
2. A v715 a v708 olvasó és v709 integritásellenőrző modult használja. Eredeti hat forrást nem módosít.
3. A v709 forrásazonosító, kétprofilos darabszám, magyarázatkapcsolat, egységes időbélyeg, manifest-versenyhelyzet, adatvesztés és visszaolvasás vizsgálata kötelező.
4. Letöltéskor összevetjük a mentett Master sourceManifestVersion mezőjét az aktuális manifesttel. Régi vagy sérült fájlnál újraépítés, majd Dropbox-visszaolvasás. Hibánál nincs letöltés és nincs hamis „kész” jelzés.
5. A letöltés dátum- és időbélyeges: HealthHub_Medical_Master_YYYY-MM-DDTHH-MM-SS.json.

## Biztonság és határok
- A modul nem küld orvosi adatot a GitHubba, Supabase-be vagy az OpenAI API-ba; a meglévő HealthHub Dropbox Vaultot használja. A kliensben a fájl csak átmenetileg memóriában van és kizárólag felhasználói kattintásra töltődik le.
- A fájl mindkét betegprofilt tartalmazza, ezért védett készüléken és mappában tárolandó.
- ChatGPT-projekt automatikus fájlfeltöltés/felülírás nincs a v715-ben. A ChatGPT Google Drive-projektforrás nem biztosít automatikus szinkronizációt. Egy későbbi Drive-tükör külön jogosultság- és adatvédelmi tesztet igényel.
- A Medical Master korábbi Léna-magyarázatokat tartalmaz, nem az eredeti PDF-ek teljes szövegét, és nem klinikai szaklektorálás.

## Elfogadási próba
1. PC és Samsung S24 Ultra: HealthHub → Leletek → panel és két gomb látható, egyetlen példányban.
2. Privát Dropbox csatlakoztatva: a Legfrissebb Medical Master letöltése gomb JSON fájlt ad. Profilok, darabszámok, magyarázatkapcsolatok ellenőrzése.
3. Új próba-lelet + Léna-magyarázat: forrásszinkron után automatikus 7. Master frissítés, letöltés új fájlként.
4. Dropbox nélkül, hiányzó forrással, eltérő időbélyeggel, vagy több adatot tartalmazó régi Master helyére csökkenő forrással nincs téves export.
5. Meglévő Ask Léna, PDF néző, gyógyszerek, profilváltás regressziómentességét tényleges mobilteszttel kell ellenőrizni.

## QA és státusz
- node --check healthhub/medical-master-export-v715.js
- node healthhub/tests/medical-master-preview-v708.test.cjs
- node healthhub/tests/medical-master-private-v709.test.cjs
- node healthhub/tests/medical-master-export-v715.test.cjs
- .github/workflows/healthhub-medical-master-v715.yml

KÓD + SZINTETIKUS QA ≠ LIVE DEPLOYED ≠ S24 TESTED ≠ USER ACCEPTED.
