# MÁV Smart Rail – exact Golden Reference (S24 Ultra)
**Jóváhagyás:** a felhasználó a 2026-10-28-i beszélgetésben kifejezetten az eredeti MÁV Smart Rail prototípus *pontos* megvalósítását kérte; a telefonról küldött referencia a kijelzőn a felhasználó szerint pontosan illeszkedik. Ez a kötött átadási cél, nem hangulati minta.

## Referenciaképernyő
- Referencia: felhasználó által megadott, teljes képernyős képminta, eredeti **869 × 1810** pixel (képarány 0.48011); SHA-256: `9819b9c94cc099dcc437ccbbf5321350be4cfa73bbf232b42ce4e4474883d98d`.
- S24 Ultra tényleges CSS viewport/safe area és a telefonos referencia viszonya böngészőből ellenőrizendő. **Fizikai pixelszámot nem szabad CSS px-nek venni.**
- A referencia *képernyőkép*, **nem** importálható teljes interaktív háttérnek. Minden gomb, profilváltó, mező és kártya saját, működő DOM-elem legyen.
- Telefon státuszsor, óra, akkumulátor, hálózati ikonok és gesture pill *OS tulajdon*. Nem kerülhetnek be a hero-képbe, CSS-ből duplázott képernyő-keretbe sem.
- Hero kizárólag a jóváhagyott családi fotó, a korábbi feltöltés változatlan és olvasható; a tipográfiai cím és subtitle élő text layer.
- Zsolt kék / Mónika pink profil, könnyen érinthető kapcsoló valódi profil állapotváltással; téma nem csúszik el.
- A FLIRT-szignál alapértelmezett BE, felhasználói KI megjegyezve, áttetsző, diszkrét kapcsoló a hero **jobb alsó szélén**; Android autoplay tiltásnál első felhasználói interakció fallback.
- Nem fiktív élő járatinformáció vagy vágány: ellenőrzött provider híján a „Következő járatok” ugyanezen struktúrájú, világosan jelölt bemutató/üres állapotot vagy hiteles MÁVPlusz átadást mutat.

## Fentről lefelé elfogadási zónák (csak referencia-aránymérés)
A felhasználó által elfogadott képernyőn látható blokkok hozzávetőleges aránya a 1810px magas referencia alapján:
1. Hero fotó + overlay és profil: y≈0–655, ~36%.
2. Öt kis glassy gyorsgomb: y≈655–773, ~6.5%.
3. Útvonaltervező: y≈794–1105, ~17%.
4. Következő járatok panel: y≈1118–1467, ~19%.
5. Hat utility csempe: y≈1480–1604, ~7%.
6. Alul a hatfunkciós taskbar: y≈1627–1810, ~10%.

Az arányok **nem renderelt CSS pixelkövetelmények**: a telefontól és böngésző chrome-tól függő valódi méretek és az érinthetőség dönt; a cél a screenshot közeli elrendezés.

## Release Gate / nem engedünk regressziót
- A jelenlegi élő v1-et addig nem írjuk felül, amíg a v2 valódi S24 Ultra képernyőképen nem közelíti meggyőzően a fenti referenciát.
- BKK / Volán gombok, profilállapot, kedvencek, már működő navigáció nem sérülhetnek.
- CI green önmagában **TESTED**, nem **LIVE VERIFIED** és nem **USER ACCEPTED**. Pixel-fidelity csak vizuális screenshot összevetéssel fogadható el.
- Nem ígérhető 100% hiteles menetrend vagy foglalás olyan hivatalos API hiányában, ami erre nincs meg.
- MÁV prototípus az exact design source of truth. Önkényes egyszerűsítés, alternatív elrendezés vagy általános UI-sablon: **nem elfogadott**.
