# HealthHub v692 · SHA-256 azonosítós eredeti PDF-olvasó

## Valós diagnózis, 2026-10-19
A v691 admin-ellenőrzés három készülékén ugyanaz a Dropbox-fiók és v690 PDF-olvasó működött:
- Mónika PC: 128 index, 4 helyi PDF, 124 hiány; 73 egyértelmű Drive-találat, 50 többértelmű, 1 párosítatlan.
- Mónika mobil: 128 index, 0 helyi PDF, 128 hiány; 73 egyértelmű, 50 többértelmű, 5 párosítatlan.
- Zsolt mobil: 33 index, 0 helyi PDF, 33 hiány; 23 egyértelmű, 10 többértelmű, 0 párosítatlan.
A Zsolt-mobilon PDF megnyitható a felhasználó megfigyelése szerint, így a mobil platform általános PDF-képtelenségére nincs bizonyíték. Az egyes kattintott PDF-ek forrásútvonala még külön igazolandó.

## v692 célzott, read-only javítás
A korábbi v690 szerveroldali archive_document olvasás az egyetlen pontosan címkézett eredeti PDF-nél változatlanul működik. Ha több Google Drive-fájl ugyanazzal a profile/documentId jelöléssel található, a régi útvonal jogosan visszautasítja a találgatást.

Ekkor kizárólag:
1. Ha a HealthHub helyi dokumentumindexében **érvényes 64 hexadecimális SHA-256** van, kérünk jogosultságellenőrzött, profilhoz kötött archive_inventory leltárt.
2. A kívánt profile + documentId + sha256 jelölést egyeztetjük, és csak ezzel egyező fájlazonosítót fogadunk el. Nem használunk fájlnevet, dátumot, feltöltési időt vagy méretet az azonosító kiválasztására.
3. Az eredeti, már létező archive_document szerver-végpont a javasolt fileId használatakor újból ellenőrzi az élő Drive-mappát, pontos profilt, dokumentumazonosítót és PDF bájtokat.
4. A böngésző ellenőrzi az eredeti fájl PDF-aláírását, méretkorlátját és a **tényleges letöltött bájtok SHA-256 egyezését**, mielőtt megnyitná.
5. Ha nincs helyi ellenőrzőösszeg vagy a leltárban hiányzik a megfelelő címke, nem nyitunk véletlenszerű fájlt, hanem külön hibát mutatunk. A profilváltás az eredményt érvényteleníti.

A szerverfüggvény kódjához nincs szükség változtatásra; a biztonsági vizsgálat már az előző kiadásban szerepelt. A megoldás nem javítja a SHA nélküli vagy a Drive-ból hiányzó eredetieket; ezek önálló forrásauditot igényelnek.

## Kizárások és biztonság
Semmilyen PDF, Drive-bejegyzés, Dropbox- vagy Supabase-fájl nem törlődik, nem íródik át, és nem kerül fel újra. Nem kerül Google hozzáférési token a kliensbe. Az azonos SHA-256 metaadatot hirdető eredetit sem tekintjük automatikusan jónak: a letöltött bájtok ellenőrzése továbbra is kötelező.

## Elfogadási küszöb
CODED → TESTED → DEPLOYED → LIVE VERIFIED → USER ACCEPTED.
Valós Mónika- és Zsolt-mobilon ellenőrizzünk egy-egy olyan dokumentumot, amely korábban többértelmű volt és a helyi rekordban már létezett SHA-256. A SHA nélküli / párosítatlan leleteknél az egyértelmű hibajelzés is helyes eredmény.
