# HHSP1 v593 · Buddy + premium hangok + privát gyógyszerfelvétel

**Dátum:** 2026-10-18  
**Release:** [PR #346](https://github.com/zsoltandmonika-cloud/berlet-app/pull/346)  
**Éles main SHA:** `a5f2c39194f8470288347c34c6f76b681d3845f0`  
**Biztonsági kódmentés:** `backup/hh-pre-buddy-private-med-v593-20261018` @ `a09a5ecb8d748f70a131f268b32dc35c79bcb487`  
**Státusz:** main összevonva, GitHub Pages deploy PASS; készülékes és valós Dropbox E2E visszaigazolás még nyitott.

## Megvalósítás

1. **Buddy:** a Nutrition jóváhagyott `./nutrition/nutri-chipmunk-3d-v594.webp` képe mind a Leletek, mind a Gyógyszerek v592 opt-in scrollselect felületén; kis nagyító illetve gyógyszeres jel; reszponzív kék/rózsaszín Glass.
2. **Hang:** kizárólag felhasználói click esetén WebAudio kattintás + rövid emelkedő tada; görgetés némán; kézzel némítható (`hh-premium-select-sound-v593` helyi hangpreferencia); reduced-motion esetén nincs celebráló mozgás. OMSZ szűréskor nincs külön Buddy-reakció.
3. **Új gyógyszer-felviteli szerkesztő** a Gyógyszerek alap és preview képernyőjén. Profilkódra kötött; a `meta.private-reference` meglévő IndexedDB objektumát bővíti, többi gyógyszerbejegyzést változatlanul megőrzi. Duplikáció esetén külön megerősítést kér. Közben módosított profil esetén a mentést blokkolja.
4. **Publikus kódban kizárólag termék-sablon:** Rozuva-Teva 10 mg / napi egy tabletta gyorskitöltés lehetősége mindkét profilban, a kód nem köti a személyhez. Mónikához csak a Mónika-profil alatt végzett tényleges, jóváhagyott telefonos mentéskor rendelődik hozzá.
5. **Privát felhő:** a meglévő `hhMasterStructuredSync304(true)` hívás a jelenlegi Dropbox `/HealthHub/master/medications.json` útvonalra; csak tényleges kapcsolódás esetén nevezhető visszaigazolt felhőszinkronnak. Offline esetben helyi mentés, ezt pontosan jelzi az UI.
6. **A v592 integráció:** a privát rekord a normál gyógyszerlistán és a görgethető kártyanézetben is megjelenik; privát részlet és eredeti Léna „Mire való?” útvonal támogatott. Nincs új szerveres adattábla vagy publikált egészségügyi rekord.

## QA

- PR: 8/8 passing checks, köztük Level 3 Guard, Activity/Records source-contract, v592 scroll-select, új `companion-private-med` synthetic DOM + IndexedDB és Dropbox API-útvonal regresszió, Android debug build.
- `main` utáni GitHub Pages `build`, `deploy`, `guard`, `scroll-select`, `companion-private-med`, `verify`, `source-and-routes` checks mind sikeresek.
- Nincs tényleges személyes gyógyszerbejegyzés a GitHub repo forrásában, tesztekben vagy auditdokumentumban. Nincs a készülékhez vagy a felhasználó privát Dropboxjához távoli, igazolt személyes hozzáférésünk.

## Következő manuális acceptance

- Új felület: `https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/index.html?hhscrollselect=1`
- Leletek és Gyógyszerek Buddy elhelyezés, egységes 3D karakter; hangkapcsoló, click/tada, OMSZ extra reakció nélkül.
- Mónika profil > Gyógyszerek > `＋ Gyógyszer hozzáadása` > `Gyorskitöltés: Rozuva-Teva · 10 mg · napi 1 tabletta` > adatellenőrzés > `Mentés · Mónika`. A tényleges személyhez kötött rekord csak ekkor jön létre.
- Visszaolvasás oldalfrissítés után, Zsolt profiljától elkülönítve. Dropbox kapcsolattal a visszaigazolt központi felhőszinkron ellenőrzése; másik készülékes E2E még külön tesztelendő.
- Fontos: felhasználó által rögzített gyógyszerlista nem helyettesít orvosi gyógyszerelési rendelést vagy bevételi ellenőrzést.

**HHSP1 teljes audit:** továbbra sem lezárt; ez egy célzott, sikeresen élesített UI + privát adatbevitel csomag.
