# HHSP1 · Activity loading state Premium Glass fix
**Dátum:** 2026-10-18  
**Státusz:** merged main + Pages deployed / készülékes felhasználói acceptance még szükséges  
**Release PR:** https://github.com/zsoltandmonika-cloud/berlet-app/pull/344  
**Main merge SHA:** `335d82100b6860962cddb966ad2cd353a885786b`  
**Rollback branch:** `backup/hh-pre-activity-loading-20261018` (baseline `fc970ee13826c9a2776509a845391202d230b2b1`)

## Megállapítás
A natív Activity renderer `healthhub/live-v191.js` betöltőállapota `<div class="a191Load">Activity adatok betöltése…</div>` volt. A régi `.a191Load` CSS fehér hátteret, alacsony kontrasztú, 9px körüli betűt állított. Az Activity Premium Glass v533 csak szövegszínt adott, így a világos doboz és az új sötét tematika ütközött. A hiba mindkét profilban látható volt (felhasználói bejelentés).

## Élesített javítás
- `healthhub/live-v191.js`: új szöveg pontosan **Aktivitás adatok betöltése, egy pillanat...**; hozzáférhető `role="status"` és `aria-live="polite"`.
- `healthhub/activity-premium-glass-v533.css`: kizárólag az Activity `#hhActivityPage191 .a191Load` elemre célzott mélykék Premium Glass, jól olvasható fehér szöveg (13–15px), csöndes animáció, reduced-motion támogatás. Zsolt kék/cyan, Mónika halvány rózsaszín akcentus, a már létező profil CSS-változókból.
- `healthhub/activity-premium-glass-v533.js`, `healthhub/index.html`: új cache-busting query paraméterek, hogy a módosított JS és CSS betöltődjön a telefonon is.
- Két korábban elavult Home QA teszt-fixture tesztjeinek aktualizálása a már éles `v591`/Premium Home verzióhoz. A termelési Home modul nem módosult.
- **Nem módosult** Activity adatséma, Health Connect import, Dropbox sync, profilváltás, idővonal/grafikon vagy korábban rögzített mérés.

## QA és ellenőrzés
- 15/15 célzott statikus source/cache-key ellenőrzés rendben.
- 7/7 PR checks PASS: Level 3 Guard, Activity source, Home source-and-routes, RAG safety, source contract, verify, Android compile.
- GitHub Pages build, deploy és report-build-status PASS a main merge commiton.
- Repo `main` tartalmazza a friss szöveget és új CSS-t.
- **Még nyitott:** S24 Ultra mobilon Zsolt és Mónika profilon a tényleges Activity-betöltési állapot megfigyelése. A CI és Pages deploy nem bizonyít önmagában vizuális eszköztesztet.

## Manuális Acceptance
1. Zsolt Activity megnyitása friss betöltéssel: sötét üveges, olvasható kártya, kék hangsúly; helyes új szöveg.
2. Mónika profilváltás után Activity megnyitása: ugyanaz a szöveg, visszafogott pink hangsúly.
3. Betöltés után az eredeti mért Activity-adatok és grafikonok az előző működésnek megfelelően jelenjenek meg, adatvesztés nélkül.
4. Ha valamilyen okból régi megjelenés marad, cache/frissítés ellenőrzése.
5. Lassú hálózat és nagyított betűméret, reduced-motion esetén olvashatóság és olvasható státusz megmarad.

**HHSP1 megjegyzés:** ez egy célzott, élesített UI hotfix, nem a teljes HHSP1 audit lezárása.
