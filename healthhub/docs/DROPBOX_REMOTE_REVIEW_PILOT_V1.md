# HH One / HealthHub: Dropbox-kapcsolat ellenőrzése távoli kérésre

## Pilot, nem éles fiókváltás

- Tervezett Android-verzió: **0.15.20 / build 47**. Kód elkészítése nem telepítés.
- **Első próba: Zsolt**, csak sikeres teszt után lehet a Mónika-készülékre kérni.
- A központi Admin csak a v401 eszközregiszterben jóváhagyott, tulajdonoshoz kötött, `dropbox_account_review` képességet jelentő Android telefonra küldhet parancsot.
- Egyidejűleg csak egy telefon választható; az Admin ellenőrzi a buildet, a célsuffix nyolc karakteres formátumát, és küldés előtt kézi megerősítést kér.
- A parancs lejárata maximum 60 perc (az Admin 40 percet küld). A telefon Remote Admin opt-in nélkül visszautasítja.
- A háttérfolyamat **csak értesítést küld**. Nem indít Dropbox-belépést, nem cserél tokent, nem ír privát Vaultot, nem változtat GPS- vagy eszközprofilt.
- Az értesítés megnyitásakor a natív HH One csak az egyszer használható, privát helyben tárolt és le nem járt kérést fogadja el.
- Ha már a célfiók van beállítva, a telefon a `Dropbox-kapcsolat rendben` üzenetet adja, bejelentkezés nélkül.
- Egyébként a magyar útmutatóból a felhasználó **Folytatom** gombja indítja a natív, PKCE-vel védett Dropbox OAuth folyamatot. A `Most nem` nem változtat semmit.
- A tényleges fiókazonosító utolsó 8 karakterének egyezése a token cseréje előtt kötelező; a korábbi token megmarad sikertelen vagy eltérő belépés esetén.
- A technikai célfiókvég **nem azonos automatikusan** a nyolcjegyű családi párosítókóddal. Az Outlook-cél fiókvégét külön, hitelesített natív/webes kapcsolatból kell ellenőrizni. Nem hardcode-olunk account ID-t vagy e-mail-címet a nyilvános GitHubban.

## Teszt menete

1. CI: Kotlin build és az összes regressziós teszt sikeres.
2. Külön release-jóváhagyás után, az eredeti aláírási kulccsal elkészült OTA telepítése **Zsolt** telefonjára, az Android saját telepítési jóváhagyásával. Nem szabad eltávolítani az alkalmazást.
3. Zsolt telefonja a Dropbox Orchestratorban jelentse: `buildCode >= 47`, `dropbox_account_review` capability, `remoteAdminAllowed = true`.
4. A HealthHub webes Admin az **ugyanazon Dropbox-fiókon** (ahol a telefon aktuálisan a parancsokat figyeli) válassza ki: `Dropbox ellenőrzés`, majd **Zsolt**. Az operátor adja meg a **hitelesített Outlook-cél fiókvégét**, és külön erősítse meg a küldést.
5. A status kezdetben `pending`, a készülék visszaigazolása után `partial/queued` is lehet. Ez csak a notification kiküldését jelzi, nem fiókváltást.
6. Zsolt megnyitja az értesítést: a megfelelő fiók esetén `Dropbox-kapcsolat rendben` üzenetet lát. Elutasítás/lejárat után sem történik változás.
7. Csak sikeres Zsolt-próba után lehet **Mónikán** megismételni. Előbb frissített, aláírt kliens telepítése és helyi Android jóváhagyása kell; az Adminból a **jelenlegi Gmail parancssorba** kell küldeni, amíg ő még oda csatlakozik. Mónika a telefonján választhatja a közös Outlook Dropboxot.
8. Váltás után két egymást követő, valóban visszaolvasott friss adatérkezés, megfelelő profil és GPS ellenőrzése szükséges. Csak ezután jöhet régi fiók lekapcsolás, külön jóváhagyással.

## Nem része ennek a változtatásnak

Távoli képernyőátvétel, csendes APK-telepítés, automatikus Dropbox-fiókcsere, háttérben végrehajtott OAuth, jelszó vagy refresh token átvitele, régifiók törlése, privát klinikai rekordok GitHubba mentése, natív telefonszintű felügyelet.

**Állapot:** csak feature branch / draft PR. Éles parancsot, APK-t és fiókváltást külön jóváhagyás és sikeres teszt nélkül nem szabad elindítani.
