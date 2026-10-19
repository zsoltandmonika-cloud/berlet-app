# HealthHub v697 · Ask Léna AI-válasz eredete: valódi modellazonosító

## Éles adatminőségi hiba (2026-10-19)

A Health Vault-ban 46 régebbi mentett Ask Léna-válasz található (Mónika 29, Zsolt 17), és **46/46 `model` mező üres**. A klienskód `live-v364-history.js` mentési útvonala eddig szándékosan `model:''` értéket rögzített; a `live-v331.js` sikeres stream `done` eseménye csak a látható válaszlécbe írta ki az AI-modell nevét, a privát történeti rekordba nem.

## Pontos, kizárólag jövőbeli javítás

- A `smooth-endpoint` vagy `smooth-endpoint-v395` **sikeresen befejezett** SSE `done` eseményének `model` mezőjét olvassuk ki. Nincs kliensoldali modellkitalálás vagy a szerver által nem igazolt címke.
- A modellazonosító csak rövid, alfanumerikus, `-._:` karaktereket tartalmazó, 3–60 karakteres címke lehet. Ismeretlen modell: üres mező / nem igazolt, nem egy hamis alapértelmezett modell.
- A meglévő `healthhub:ask-lena-complete` esemény `detail.model` mezőjét az előzőleg befejezett AI-válaszból állítjuk össze, kizárólag a helyes aktív profilnál.
- A profilhoz kötött, RLS-en keresztül szinkronizált privát `hh_ask_lena_history` az új modellt az új válaszokkal menti. Az orvosi állítások, eredeti PDF-ek, személyes napló, Health Vault jogosultság és klinikai kutatóvégpont nem módosul.
- A 46 korábbi rekord modelljét **nem következtetjük ki, nem javítjuk visszamenőleg**, mert a régi szerverválasz bizonyítéka már nincs jelen a rekordban.
- Ez **provenance/QA fejlesztés**, nem automatikus klinikai szakmai hitelesítés és nem AI-modellfrissítés. A v694 privát Drive-feltöltés továbbra is külön, blokkolt biztonsági feladat.

## Definition of Done

Szintetikus regressziós tesztek: befejezett SSE modell jelen, hiányzó modell ismeretlen, rossz modellcímke elutasítva, nem sikeres/rossz profilú kutatás nem menthető; meglévő v696 MKB-profilvédelem és eredeti PDF QA változatlan. Teljes GitHub CI után main, valós S24 Ultra Ask Léna kutatás és a jövőbeli privát előzményrekord `model` mezőjének tényleges ellenőrzése. A CI nem helyettesíti az utóbbit.
