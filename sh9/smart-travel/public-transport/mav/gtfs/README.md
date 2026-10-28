# SH9 · MÁV Smart Rail · Phase 2C · GTFS adatmotor

**Állapot (2026-10-28): CODED / TESTING, éles MÁV GTFS feed még NINCS.** A felhasználó elküldte a MÁV GTFS-hozzáférés iránti kérelmet. A jóváhagyás, az adatállomány és a nyilvános újrafelhasználási engedély még nem igazolt.

## Mi készült el?

- `rail-gtfs-core-v1.js`: időzónahelyes (Europe/Budapest) menetrendi útvonaltervezés, hétköznapi/kivételes naptár, GTFS 24 órán túli idő, közvetlen és legfeljebb egy átszállás, Indulás most / Indulás ekkor / Érkezés ekkor.
- `rail-journeys-v2.js`: pontosan három fotós, forrásalapú vasúti kártya; bővíthető útvonalszakaszok. **Menetrendi adat NEM valós idejű késés, vágány vagy GPS.**
- `rail-gtfs-config-v1.js`: alapértelmezetten `enabled:false`. NINCS hiányzó állományra irányuló háttérfetch.
- `rail-gtfs-bridge-v1.js`: egyetlen felhasználói kereséskor, csak engedélyezett állapotban tölti le a legfeljebb 8 MB-os, helyi JSON-kivonatot. A jelenlegi valódi Google Maps / MÁVPlusz útvonaltervezés automatikus tartalékként megmarad.
- `gtfs/build_gtfs_snapshot.py`: kizárólag helyi ZIP-olvasó, nincs hálózat, nincs felhőszinkron, nincs automatikus közzététel. Kiemelt állomásokból szűri az érintett járatokat, teljes közbenső megállókkal, átszállási lehetőségekkel.

## Amikor a MÁV válaszol

1. Ellenőrizni a hozzáférési és publikálási feltételeket. **Az adat publikálása a nyilvános GitHub Pages-en külön engedélyhez kötött lehet.** A `--rights-confirmed` csak a kezelő nyilatkozata; nem helyettesíti az engedélyt.
2. Biztonságos helyi gépen: `python3 sh9/smart-travel/public-transport/mav/gtfs/build_gtfs_snapshot.py --zip /private/authorized-mav.zip --focus "Budapest-Keleti" --focus "Kazincbarcika" --rights-confirmed --output /private/rail-schedule.json`
3. Az outputot manuálisan átnézni, ellenőrizni a járatszámokat, állomásneveket, forrásidőt és a szolgáltatási dátumokat.
4. Ha a jogosultság engedi a nyilvános terjesztést, elhelyezni `mav/data/rail-schedule.json` alatt (méret ≤ 8 MB), majd `enabled:true` a `rail-gtfs-config-v1.js`-ben. Amennyiben **nem** engedi: jogosultság-ellenőrzött kiszolgáló kell, vagy hivatalos külső kereső marad; nyilvános GitHub adatfájl nem.
5. GitHub CI és **valódi S24 Ultra** viselkedési / arány / profil / navigáció / késés-nem-élő ellenőrzés, majd külön elfogadás.

## Teljesítmény és határok

- Legfeljebb 25 000 szűrt trip, 9 000 stop, 8 MB-os JSON; **csak explicit kereséskor** tölt.
- Egy átszállás tervezhető; gyalogos csatlakozás másik állomásra, díjszámítás és ülőhelyjegy még nem.
- A 24 órán túli GTFS időpont és nyári/téli időszámítás napjai kezelés alatt; kettős, őszi 02:xx szolgáltatási idők forrásfüggő szakmai ellenőrzést igényelnek.
- GTFS ZIP import helyi eszközzel, standard Python 3, nincs harmadik fél csomagja.
- Menetrendi terv változhat; **sem késés, sem vágány, sem élő vonatpozíció nincs feltételezve**.
- Hibás/hiányzó/nem engedélyezett feednél nem generálunk mesterséges vonatokat; eredeti Golden Glass + hivatalos tervező fallback.

## Golden Standard tiltások

**NEM módosítható** a jóváhagyott hero-fotó, bal alsó 45×45 profilváltó, saját ötös taskbar, FLIRT-szignál és a jelenlegi üvegréteg pusztán az adatbekötés miatt. Egyes hibákra nem csinálunk visszafelé regressziót.
