# HealthHub v403 – Ask Léna Storytelling Recovery

## Miért kellett javítani?
A 2026-10-12-én exportált Ask Léna PDF Mónika 2024. június 17-i történetéről kb. két rövid szövegrészt tartalmazott, és kényszerített külön második oldalon forrás-/technikai jelentést. A kutatás 12 PDF-et próbált, 0 eredeti oldalt kapott, és az audit 8 bekezdésből 6-ot elvetett. A v402 I-06 természetes stílusutasítás önmagában nem tudta pótolni a forráskivonatok hiányát.

## A v403 kétlépcsős forrásmodellje
1. **Elsődleges forrás:** `original_pdf_extract`, a tényleges, hozzájárulással kiolvasott PDF-oldal. `D1:pN` azonosító, `kind=documented` bekezdés.
2. **Másodlagos forrás:** `json_summary`, az előzőleg elmentett HealthHub/AI leletmagyarázat. `S1` azonosító, `kind=reported` bekezdés. A szöveget csak szó szerinti részlettel alátámasztott állításként használjuk, és **nem állítjuk eredeti orvosi ténynek**.

A v395/v403 Supabase endpoint az engedélyezett klinikai kutatás során:
- az eredeti oldalakat az eddigi módon ellenőrzi;
- a korábbi JSON-magyarázatokat külön ellenőrzi (idézet, forrás-ID, számadat, időtartam, orvosnév);
- a megtartott másodlagos állításokat történetként, megfelelő eredetmegjelöléssel engedi felhasználni;
- az eredeti és másodlagos hivatkozásokat összekeverő vagy alá nem támasztott bekezdéseket kizárja;
- ha van legalább öt forráshoz kötött tényjelölt, de túl rövid az első narratíva, **legfeljebb egy újraszerkesztést** próbál, azonos ellenőrzési szabályokkal;
- az `evidenceAudit` külön közli az `original verifiedFacts`, `summaryFacts`, `summaryParagraphs` és narratívahossz adatokat;
- a kliens I-05 nem tekinti a `secondary-only` történetet eredeti PDF-facts igazolásának.

## Story-first PDF
A `live-v392-share-print.js` megőrzi az érdemi, fejezetekre bontott narratívát és a **szövegen belüli** forrásmegjelöléseket; nem illeszt be automatikusan egy technikai ellenőrzési jelentéssel teli, kényszerített külön PDF-oldalt. Az ellenőrzési napló továbbra is rendelkezésre áll a HealthHub élő felületén.

## Eredeti PDF-ek helyreállítása még szükséges
A v403 **nem javítja automatikusan** a `local_document_missing`, `google_drive_reconnect_required`, `drive_archive_file_missing`, `no_searchable_pdf_text` jellegű hibákat. Ezeket az adott böngésző profilhoz rendelt Drive/IndexedDB állapotában célzottan meg kell vizsgálni. A v403 megakadályozza, hogy az ilyen hozzáférési hiba önmagában nullára csökkentse a korábbi, idézhető leletmagyarázatokból írható történet minőségét.

## Kódtesztek és elfogadás
`node supabase/functions/smooth-endpoint-v395/storytelling-v403.test.mjs` – 18 szintetikus eset:
- PDF-eredeti és JSON-összefoglaló rétegek elkülönítése,
- idézetekhez kötött állítás,
- kitalált számok és orvosnevek elutasítása,
- alátámasztott másodlagos történet megtartása 0 PDF mellett,
- téves `kind=documented` elutasítása `S` forrással,
- eredeti `D` idézet és hivatkozás szabályos kezelése,
- hibás inline citation kiszűrése,
- nincs profilkeveredés vagy duplikált summary index,
- azonos nap magyar és numerikus dátumformátumban elfogadható, eltérő vagy lehetetlen dátum nem.

### Emberi Golden Standard elfogadási teszt
Az éles 2024.06.17-i referenciakérdést **ugyanazon profilban**, azonos adatforrásokból futtatni, majd az exportált PDF-et ellenőrizni:
1. valós történet a fő tartalom, nem debugnapló;
2. a rendelkezésre álló források által engedett mélységben részletes kronológia;
3. az eredeti PDF és a korábbi JSON-magyarázat következetesen megkülönböztetve;
4. a nem bizonyított perc, sokkszám, orvosnév és beavatkozás nem jelenik meg tényként;
5. a szöveg nem hirdeti klinikai bizonyosságként a másodlagos összefoglalókat;
6. a felhasználói tesztig **nem** tekintjük a Storytelling-eredményt elfogadottnak.

Szerver deploy: a GitHub Pages `main` frissítése **nem** telepíti a Supabase `smooth-endpoint-v395` Edge Function-t. Ehhez külön `deploy_edge_function` szükséges az eddigi `verify_jwt=false` beállítással (az endpoint továbbra is maga ellenőrzi a JWT-t és a profiljogosultságot).

### További regresszió: I-05
Az eredeti `healthhub/tests/intelligence-v402.test.cjs` tesztcsomag 14 szintetikus esettel frissült. A klinikai audit csak valóban eredeti PDF-tény esetén kaphat `verified_excerpt_audit` jelzést; nulla eredeti tény és idézett JSON-adat esetén `secondary_reported`.
