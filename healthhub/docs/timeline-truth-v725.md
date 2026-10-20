# HealthHub Idővonal v725 · Valódi forrásadatok

## Probléma
A klasszikus Idővonalban hardcode-olt demó értékek voltak: ebédkalória, alvás, pulzus, vérnyomás, lépésszám és találkozó. A korábbi profilváltási függvény eltérő demóértékekkel töltötte az egyes profilokat, nem a kanonikus Nutrition naplóval.

## Megoldás
A healthhub/timeline-truth-v725.js megtartja a fő Hero-képet és a navigációt, de az Idővonal tartalmi részét csak igazolható eseményekből építi újra. Az eredeti rekordokat és működő modulokat nem módosítja.

Források:
- Nutrition: /HealthHub/profiles/{profile}-nutrition.json, séma healthhub.nutrition/1, kötelező betegprofil-azonosság. Profilra korlátozott helyi cache: hh-nutrition-PREVIEW-v592-{profile}. Egyedi id, dátum, időpont, étkezési kategória és rögzített kcal; a tápérték lehet becsült.
- Tünetnapló: /HealthHub/master/symptoms.json és hh-symptom-journal-v1, valós eventAt mező és nem törölt esemény.
- Leletek: /HealthHub/master/documents.json, saját profil és tényleges documentDate. A feltöltés idejét nem tekintjük klinikai eseménynek.
- Activity: hhActivity191Cache.daily, csak ha a betöltött Activity-profil egyezik. A napi lépésszámhoz nem társítunk kitalált órát.
- Hiányzó alvás, pulzus, SpO2, vérnyomás: nem jelenik meg demóérték, amíg nincs hiteles, időbélyegzett forrás.

Működés: Ma / 7 nap / 30 nap / választható nap; források szerinti szűrés, összesítés, explicit forrásminőség. A helyi és Dropbox adatok id szerint összevonva, újabb updatedAt előnyben, törlések figyelembevételével. A profilváltás közben zajló hálózati kérések korábbi eredményét nem engedjük átemelni a másik személy Idővonalára.

## Biztonság
A v725 a Dropboxot csak olvassa; nem végez törlést, felülírást, adatfeltöltést. Nincs betegadat GitHubban, szintetikus fixtures-only QA van. A hiányzó nap nem egyenlő 0 kcal-lal; a hiányzó mérés nem egyenlő normális értékkel.

## Teszt
1. Nutrition: tényleges ebéd időpont, név és becsült kcal mentése.
2. HealthHub → Idővonal → Ma → Táplálkozás: azonos dátum, idő és kcal.
3. Profilváltás: másik beteg étkezése nem látható.
4. 7/30 nap és dátumválasztás, id-deduplikáció, törlés, hiányzó forrás.
5. Egyéb modulok regressziómentessége, PC és S24 Ultra.

QA: node --check healthhub/timeline-truth-v725.js
QA: node healthhub/tests/timeline-truth-v725.test.cjs
CI: .github/workflows/healthhub-timeline-v725.yml

Státusz: beépített GitHub v725, szintetikus ellenőrzés; éles Dropbox és mobiltelefonos átvételi próba hátravan.
