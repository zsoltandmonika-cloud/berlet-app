# HealthHub v698 · I-10 Ask Léna Evidence Intelligence (2026-10-19)

## Mi a változás?
Az Ask Léna I-09 modulja korábban a technikailag igazolt MKB idővonalcsoportokból időrend alapján maximum öt idézetet készített elő. Az I-10 ezt a lépést **kérdésfüggő, reprodukálható, csak olvasásos relevanciarendezésre** cseréli; nem végez diagnózist és nem épít új orvosi tudásrekordot.

Fájlok:
- `mkb-evidence-i10-v698.js`: tiszta, mellékhatásmentes kérdés- és idézetrangsoroló, diakritikus magyar szavak normalizálása, óvatos téma-szókincs.
- `ask-lena-mkb-v676.js`: csak korábban hitelesített eredeti forrásoldalak idézeteit adja a rendezőnek; maximum 5 pontos idézet + forrás/dátum/oldal előnézet az Ask Léna felületen; az egyetlen engedély **a kérdés pontos aktuális szövegéhez is kötött**.
- `live-v331.js`: a kutatás megindításakor az aktuális kérdés átadása az engedélyt egyszer felhasználó modulnak. Kérdésváltoztatásnál az engedély érvénytelen.
- `mkb-ai-context-v677.js`: egyazon napon, ugyanazon cím/type/unit mellett, eltérő forrásból származó különböző számértékekre semleges méréseltérés-jelzés az AI felé, nem automatikus feloldás.

## Bizonyíték, értelmezés és felelősség
- A 207/207 kötelező PDF és a 12/12 ellenőrizhető forrásidézet **technikai integritása** korábbi v696 audit szerint rendben. 11 régi Samsung Watch EKG korábban tulajdonosi döntéssel kizárt.
- A 7 MKB-tény és 12 bizonyíték szakmai review-státusza **nem emelkedik**. Szövegegyezés nem bizonyít klinikai igazságot, időszerűséget vagy ok-okozatot.
- A témarokonítás nem a betegségek közötti orvosi összefüggéseket modellezi; csak az engedélyezett források relevanciájának előzetes rendezése.
- Azonos napi két mért értéknek **lehet legitim eltérése**, ezért a jelzés nem hiba- és nem diagnózis-bélyeg, külön klinikai értékelést igényelhet.
- A felhasználó a rövid forrásrészletet, oldalszámot, dátumot és címet a hozzájárulás előtt látja. A készüléken futó program nem továbbít automatikusan semmit, és nem tárol extra orvosi állapotot.
- Legfeljebb 5 engedélyezett idézetet továbbít a már létező privát Ask Léna-kapcsolaton, változatlan adatprofil- és méretkorlátokkal.
- Ha a kérdés a forrás-előnézet után változik, ugyanazt az engedélyt nem használhatja az AI-kéréshez.

## Tételes QA és release
A szintetikus tesztek ellenőrzik a régebbi, de releváns forrás előresorolását; a magyar ékezeteket; azonos napi, külön forrásban eltérő értékek óvatos jelzését; külön dátum/egység és ugyanazon forrás nem hamis riasztását; `rejected` sor kizárását; a plafont és az egyszeri hozzájárulást. Nem használunk valós betegadatokat tesztfixture-ben.

**Kiadási kapu:** CODED → GitHub TESTED → main DEPLOYED → eredeti Samsung böngészőben LIVE VERIFIED → USER ACCEPTED. CI önmagában nem bizonyít orvosi válaszminőséget.

## Következő sprint
V699: ellenőrzött források tényleges AI-válaszbeli helyes használatának mérhető, anonim aggregált kiértékelése: klinikai bizonytalanság, idézetek relevanciája, releváns mérési idők, gyógyszerrendelés és tényleges szedés szétválasztása. Szakmai validálás nélkül semmit sem jelölünk `verified` állapotúra.
