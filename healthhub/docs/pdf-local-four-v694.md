# HealthHub v694 · Pontosan négy helyi eredeti PDF célzott helyreállítása

## Élő felhasználói bizonyíték
2026-10-19: a felhasználó jelezte, hogy Mónika régi leletei telefonon megnyílnak, **csak az utoljára feltöltött négy PDF nem**. A v691-es PC audit szerint éppen 4 Mónika-profilhoz tartozó eredeti PDF-bájt található a PC helyi IndexedDB-jében, a telefonon viszont 0. Ez erős, de még nem véglegesen bizonyított összefüggés.

## Végrehajtás csak a PC-n, explicit opt-in
A v694 Admin-panelen a felhasználó előbb az **Négy helyi PDF ellenőrzése** gombot nyomja meg. A panel kizárólag akkor engedi a helyreállítást, ha ugyanazon Mónika-profil alatt **pontosan négy** helyi eredeti található, mind PDF, legfeljebb 8 MiB, a helyi leletindexben érvényes SHA-256 szerepel, és a lokális fájl bájtjaiból újraszámolt SHA-256 egyezik.
A szerveroldali Drive-leltárból a profilazonosítót, dokumentum-SHA-256-ot ellenőrzi, és a már egyező eredetiket kihagyja.

A **Hiányzó eredetiek archiválása** gomb csak az ellenőrzés után aktiválható. Újabb explicit megerősítést kér, és csak a kijelölt, PC-n fizikailag jelen lévő eredeti PDF-eket továbbítja a külön szerveroldali `hh-drive-repair-v694` funkciónak.

## Szerveroldali védelem
- Az eredeti `hh-drive-oauth-v682` kizárólag olvasó gateway változatlan.
- A külön `hh-drive-repair-v694` csak a Health Vault-ban hitelesített, profilhoz jogosult felhasználó kérésére fogad feltöltést.
- Google-fiók, Google mappa-leszármazás és a fájl teljes SHA-256 egyezés kötelező.
- Egyező SHA-256-tal már ott lévő eredetit nem tölti fel újra.
- Új fájlt kizárólag Google Drive **create** művelettel hoz létre a jóváhagyott betegmappában, pontos dokumentumazonosítóval. Soha nincs overwrite, PATCH, DELETE vagy fájllista szerinti találgatás.
- A felhasználói böngésző a feltöltés után ugyanazon eredetit a változatlan, jogosultságellenőrzött v682 read-only gatewayen visszaolvassa és bájtszintű SHA-256-ot számol.
- Sérült, hiányzó SHA-jú vagy túl nagy eredetinél a helyreállítás leáll; nincs automatikus újrapróbálkozás.
- Profilváltás közben megszakítja az új fájlok küldését.

## Elfogadás
CODED → szintetikus TESTED → külön szerverfunkció DEPLOYED → GitHub main → PC-n négy SHA-ellenőrzött eredeti → felhasználói explicit feltöltési jóváhagyás → mobilon a négy eredeti ellenőrzött megnyitása → LIVE VERIFIED / USER ACCEPTED.

A zöld CI nem bizonyítja a PC négy fájljának sikeres feltöltését és mobilos megnyitását. Valós privát PDF-fájlokat nem teszünk CI-be, naplóba vagy nyilvános GitHubba.
