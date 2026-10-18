# HHSP1 v595 · Buddy mute gomb eltávolítása + hallható kattintás görgetéskor

Dátum: 2026-10-18  
PR: https://github.com/zsoltandmonika-cloud/berlet-app/pull/348  
Élesítés: `beb27541596a72bea4b1e8700f226111b2fb8da5` (`main`).
Visszaállítás: `backup/hh-pre-scroll-sound-v595-20261018` @ `839c450cef0ba9e56680f64ab14dff6802bbdaa6`.

## Felhasználói kérés
Buddy mellett a hang némítására szolgáló gombot el kell távolítani mindkét modulból, és a vízszintes görgetés közben is hallatszódjon diszkrét, mechanikus kattogás.

## Implementáció
- A megszokott Premium Glass és jóváhagyott Nutrition Buddy megjelenése maradt.
- A mute gomb és a CSS teljesen eltávolítva; a korábban elmentett `off` beállítás a láthatatlan kapcsoló hiányában nem befolyásolja a hangot.
- A Leletek és Gyógyszerek `.hhRsmTrack` kártyái és `.hhRsmChips` gyorsszűrői esetén `scroll` eseményből legközelebb álló pozíciót mérünk, és **csak az indexváltáskor** adunk rövid kattintást.
- A WebAudio a valós pointer/touch/wheel/keyboard gesztusban aktiválódik, a görgetés csak annak időablakában ad hangot. 90 ms minimum kattintásköz biztosítja, hogy ne váljon géppuskaropogássá.
- Tap/click választáskor megmaradt a click + tada dallam, OMSZ-nél továbbra sincs külön Buddy-animáció.
- Friss build azonosító: `v595-scroll-tick-clean-buddy`; meglévő S24 Ultra-könyvjelzőhöz nem kell új link.
- Nincs klinikai adatmódosítás, gyógyszeradat-migráció, Dropbox-művelet, vagy más modulból visszavett funkció.

## Ellenőrzés
- PR 8/8 ellenőrzés zöld, köztük Android debug compile, Level 3 Guard, v592 scroll-select, v593 private medication, új v595 WebAudio szimulációs QA.
- Post-merge GitHub Pages **build + deploy SUCCESS**, source and core verify SUCCESS.
- Manuális teszt szükséges: S24 Ultra Chrome, mindkét profil, gyorsszűrősáv és kártyagörgetés, telefon médiahangerő bekapcsolva. A valódi telefon hangszóróját a CI nem tudja ellenőrizni.
- Fallback: `?hhscrollselect=0` vagy `?hhpremium=0`.

## Korlát
A rövid, pozícióváltás-alapú görgetési kattintások valós hangerejét a telefon médiahangerője és böngészője szabályozza; fejlesztői teszt nem egyenértékű valódi hangszórós acceptance-teszttel.
