# SHO / SH9 / HealthHub – Global Unified Glass Dock v934

**Érvényes Golden Standard:** 2026-11-02-től a korábbi különálló három vezérlőpirulát minden aktív belépési és moduloldalon egyetlen négyzónás SHO Glass Dock váltja fel.

## Jóváhagyott megjelenés

- Dark navy: `rgba(8,42,80,.60)` = **40% transparency**.
- Dock: **50 CSS px magas**, oldalmargó **2 px**, alsó margó **1 px**, **14 px** lekerekítés.
- Backdrop blur: **10 px**, finom sötét árnyék és világoskék keret.
- Négy elválasztott zóna balról jobbra: **profilváltó / Feladatok / Wallet / 🇭🇺🇨🇦 nyelv**.
- Profiljelző ikonok: Zsolt `#79BFFF`; Mónika `#F9A6D3`; háttér profilfüggetlen.
- Minden zóna egy nagy érintési terület; ikon és alatta rövid felirat; egyetlen közös üvegsáv, **nem négy új pirula**.
- Hero-val rendelkező oldalakon a Hero alsó széléhez illeszkedik. A Hero nélküli önálló appoknál a felső safe-area-hoz rögzített, ugyanolyan formájú dock.
- A shared `sh9/shared/sh9-golden-controls-v1.js` és `.css` a jövőbeli aloldalakon is **kötelező**. Cache-verzió: `v=934-unified-glass-dock`.

## Funkcionális integráció és védelmek

- **Profil:** a meglévő natív profilkezelő `.click()` delegálásával, vagy az eredeti közös profilpreferenciával (`hh-profile`); Family Tasks és HealthHub jogosultságkezelőit megkerülni tilos.
- **Feladatok:** meglévő `/berlet-app/sh9/family-hub/` útvonal.
- **Wallet:** a meglévő SHO Wallet-nézet, `/berlet-app/sh9/?sho=wallet` mélylinkkel; a Wallet jelenleg demó, valódi bérletkezelés külön elérhető.
- **Nyelv:** a meglévő `sh9-language-v1` állapot és `SH9_I18N_V1` események.
- **HealthHub dinamikus oldalak:** a dock a jelenleg látható Hero-hoz igazodik; felülírt render után újra létrejöhet, de egyszerre legfeljebb egy aktív.
- **Tiltott regressziók:** GPS/Family Guard map, OTA, Outlook, hitelesítés, AI Scan, Quick Add, MÁV/BKK/Volán funkciók, 12 SHO csempe, alsó ötös Golden Standard taskbar. Ezeket dizájnfrissítés nem módosíthatja.

## Bevezetési lefedettség

**22 nyilvántartott aktív belépési oldal:** egy saját SHO StartPage + 21 közös komponenses felület. A közös komponens megtalálható a HealthHub, Family Guard, Nutrition, Digital Health, Usage Control, Recepttár, Recepttár Studio, Family Tasks, Smart Travel, My Trips és BKK/MÁV/Volán/Smart Trip AI ágain is. A HealthHub egy HTML-en belüli moduljai az aktív Hero-ra kerülő közös vezérlőt használják.

Az `sh9/sho-preview/` előnézet saját már jóváhagyott, egyező külsejű dockja megmarad. A **történeti releases/snapshot/archív mentések** nem cserélendők, mert ezek visszaállításra vagy diagnosztikára szolgálnak, nem aktív felhasználói képernyők.

**Ellenőrzési feltétel:** az automatikus forráskód- és DOM-integrációs vizsgálat nem helyettesíti a Galaxy S24 Ultra készüléken végzett vizuális és funkcionális E2E tesztet. Ellenőrizni kell Zsolt és Mónika profilban is a gombokat, a modulváltást, a sűrű navigációs oldalakat, térképet és modalokat.

*A korábbi `GOLDEN_STANDARD_TRIPLE_CONTROL_ROLLOUT.md` v918/v924 leírása történeti dokumentum; a v934 jelen dokumentum lép a külön pirulák vizuális szabályai helyére.*
