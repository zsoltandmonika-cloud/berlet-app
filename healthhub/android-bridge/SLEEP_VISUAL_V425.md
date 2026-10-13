# HealthHub v425 – grafikus Sleep pilot

## Megvalósított, izolált UI
- A meglévő `hcpilot` buildben, **külön alkalmazásazonosítóval**, a Health Connectből már validált alvásrekordok vizualizálása.
- A napi vízszintesen görgethető, 30 napos napválasztó az Activity szemléletét követi; **nem** a produkciós webes Activity-komponens közvetlen újrafelhasználása.
- Kiválasztott ébredési nap: minden külön rekordhoz saját időszak és tényleges alvás/ébrenlét.
- Színes fázisidővonal valós kezdési/végidő szerint: ébrenlét, könnyű, mély, REM.
- Időzóna: a telefon helyi rendszer-időzónája. Éjfélen átnyúló alvást az ébredési dátumhoz rendeljük.
- Ismeretlen vagy hiányzó fázist nem rajzolunk ismertként; a külön rekordokat nem adjuk össze.
- A 24 órás mód helyi gyorsvizsgálat, nem azonos a teljes 24 órára átfedő alvásszakaszok átfogó lekérdezésével.
- A pulzus, vérnyomás, véroxigén és nyugalmi pulzus diagnosztikai számai megmaradnak a szöveges blokkban.
- **Nincs internet, Dropbox, háttérszinkron, profilváltás, adatfeltöltés vagy éles telepítés.**

## Tudatosan hátramaradt
- Végleges production Sleep oldal integrációja a webes HealthHub Activity dátumválasztójával és teljes stílusrendszerével.
- Alvásrekord-duplikációs szabályok, forrásazonosítás, szundítás-besorolás és profilhoz kötött tartós szinkron.
- Samsung Health Sleep Score, Energy Score, SpO₂ alvás alatti kapcsolt idősor, mozgásadat – nincs bizonyítva, így nincs megjelenítve.
- Grafikus hozzáférhetőség, részletes feliratok, naptári hónapváltás és használhatósági teszt.

## Helyi tesztelési sorrend
1. `git fetch origin healthhub/sleep-visual-calendar-v425`, majd biztonságos váltás `git switch -c ... FETCH_HEAD`.
2. `& 'C:\Gradle\gradle-8.14.6\bin\gradle.bat' :app:assembleHcpilot --no-daemon --console=plain`.
3. `powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\tools\verify-hc-pilot.ps1'` két `PASS`, SHA-256 és a `.hcpilot` alkalmazásazonosító ellenőrzése.
4. Csak utána telepítsd a korábbi **HealthHub Health TEST** frissítéseként; az éles Connectet, Samsung Betát és Samsung Thin TEST-et tartsd meg.
5. Engedélyek után 30 napos helyi olvasás. Próbáld ki 2026-10-13 és 2026-10-12 kiválasztását; ellenőrizd a Samsung Health 03:26–06:00 154 perces október 13-i időszakát. A képernyőképen jelenjenek meg a színes fázisok, ne csússzon a fejléc az állapotsávba.

**Státusz:** forráskód a GitHub PR-ban, a Windows-fordítás és telefonos működés még nincs igazolva.
