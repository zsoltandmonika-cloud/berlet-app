# HealthHub v691 · PC/telefon PDF-konfiguráció összehasonlítás

## Miért
A felhasználói megfigyelés: ugyanaz a Mónika-profilú eredeti lelet PC-n megnyitható, telefonon nem. Ilyenkor a központi Dropbox/Drive jogosultság hibáját **nem szabad előre kész tényként kijelenteni**. A helyi IndexedDB, a betöltött PDF-néző verziója, a Health Vault jogosultsága és a készüléken érvényes Dropbox OAuth-kapcsolat eltérhet.

## Felhasználói ellenőrzés
HealthHub → Admin → Kapcsolatok & Sync Center alatti **PDF · Készülékdiagnosztika v691**.
Két eszközön, azonos aktív Mónika-profillal:
1. Nyomd meg az **Ellenőrzés indítása** gombot.
2. Nézd meg / másold ki az eredményeket.
3. Hasonlítsd össze a PC és telefon eredményét azonos profilra.

## Mit vizsgál
- Build címke, PDF-néző betöltött asset cache kulcsa, aktív \`window.openHrDocument\` függvény v690 képessége.
- Aktív profil Health Vault hitelesítése és szerveroldali profiljogosultság.
- Dropbox bejelentkezésből származó, **helyben SHA-256-tal pszeudonimizált** fiókellenőrző kód, nincs nyers ID, e-mail, token.
- Mindkét Dropbox-profilfájl létezése (csak \`files/get_metadata\`; a PDF és a profilfájl tartalma nem kerül letöltésre).
- Aktív profil IndexedDB dokumentumrekordjainak és blob-kulcsainak darabszáma, **eredeti fájlbájtok kiolvasása nélkül**.
- Aktív profil szerveroldali Google Drive \`archive_inventory\` és az egyértelmű \`documentId\` címkék egyezése a helyben hiányzó PDF-ekkel.

## Mit NEM csinál
Nem vált Dropbox-fiókot; nem kér új OAuth-engedélyt; nem töröl cache-t, nem futtat sync-et és nem változtat adatot. Nem tesz egészségügyi iratot, nevet, fájlnevet vagy fióktitkot a jelentésbe. A vizsgálat az Admin gomb explicit megnyomására indul, nem háttérfolyamat.

## Értelmezés
- **Régi betöltött PDF-néző / v690 képesség NEM:** készülékes asset/frissítés vagy függvényfelülírás.
- **Helyi PDF darabszám eltér és Drive ID-egyezés nulla:** dokumentum-azonosító / Léna Archive címkézés inkompatibilitás.
- **A két eszköz fiókellenőrző kódja különbözik:** valóban eltérő Dropbox-fiók csatlakozik. Ez önmagában nem bizonyítja a PDF-hibát, mert a PDF fájlokat külön szerveroldali Drive-archívum is szolgáltatja.
- **Vault profiljogosultság NEM:** a szerveroldali eredeti leletolvasó helyesen tilt.
- **Azonos build, Vault engedély és ID-kapcsolat, de PDF még nem nyílik:** a konkrét PDF megnyitási útvonalát instrumentálni kell csak technikai hibakódokkal.

## Elfogadás
CODED → szintetikus TESTED → main/DEPLOYED → telefon + PC LIVE VERIFIED → USER ACCEPTED.
A diagnosztikai panel önmagában **nem javítja** a PDF-hibát. A javítást csak az összehasonlítás eredménye után célozzuk. 
