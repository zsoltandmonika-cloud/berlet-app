# MÁV Smart Rail – B terv MÁV GTFS válasz nélkül (2026-10-28)

## Mi működik azonnal, új szerződés nélkül?

- A legutóbbi, jóváhagyott **Premium Golden Glass** kinézet, eredeti hero és a három különböző vonatfotó változatlan.
- A Google Térkép díjmentesen megnyitható dokumentált Maps URL-lel, előre kitöltött indulási/célállomással (az időpont- és érkezési módot a Google Maps URL nem támogatja dokumentáltan).
- Az állomások új **natív, offline kiegészítő listája** segít a gépelésben.
- Profilhoz kötött kedvenc útvonalak most már valódi, egyérintéses gombok; kattintásra visszaírják az indulás/érkezés mezőit.
- MÁVPlusz, Vonatinfó és a MÁV által dokumentált mikorindul.hu állomási táblák változatlanul elérhetők.
- A korábban elkészült GTFS menetrendi és átszállási számoló felhasználható, ha **bármely valóban jogszerűen rendelkezésre álló, releváns GTFS** megérkezik, nem kizárólag MÁV formátumra hardcode-olt.

## Google Routes API B terv: kód elkészült, éles hívás NINCS

- A `rail-google-routes-v1.js` a Google által dokumentált `computeRoutes` válaszból készít `showTimetable`-kompatibilis járatkártyákat (vonal, időpont, átszállás, részletek). `arrivalTime` és `departureTime` helyesen, egymást kizárva kerül a Google API-kérésbe.
- A `rail-google-bridge-v1.js` kizárólag **valódi koppintásra**, legfeljebb hat kérés munkamenetenként, minimum 30 másodperc közöttük, és kizárólag HTTPS Supabase Edge proxyval működhet. Nem fut periodikus lekérdezés és nem gyűjt helyadatot.
- A `rail-google-config-v1.js` alapértelmezetten `enabled:false`, `endpoint:''`. Ezért **nincs Google-billing, nincs API-kulcs-szivárgás, nincs egyetlen hívás sem**.
- A Google válaszából készülő kártyák **nem MÁV élő késés/vágány/GPS** információk. Kötelező a jól látható Google Maps attribúció, és az EGT/Google-szerződés ellenőrzése.
- A Google Routes API szerveroldali proxy még **nem** fut. Nem szabad bekapcsolni a `config.enabled`-et addig, amíg nincs megfelelő Google Maps Platform projekt, számlázás jóváhagyás, a havi kvóták és a jogosultságvizsgálat beállítása, az Edge proxy deploy-ja, működési teszt és adatforgalmi audit. Az ügyfél böngészőjébe Google kulcs soha nem kerülhet.
- Google hivatalos dokumentáció: https://developers.google.com/maps/documentation/routes/transit-route, https://developers.google.com/maps/billing-and-pricing/pricing; EGT: https://cloud.google.com/maps-platform/terms

## Konkrét további bekötési sorrend

1. Google Maps Platform Routes API – **külön engedélyezett**, minimális költségplafonnal.
2. Server-side proxy request- és jogosultságellenőrzéssel, Google Cloud kemény API kvótával. Hálózati hívás csak koppintás után.
3. A Google Routes API által visszaadott adatokat saját három kártyán megjeleníteni, látható Google Maps forrással, a szerződési feltételekkel összhangban.
4. A MÁV GTFS később elsődleges lehet menetrendhez; Google B terv külön kapcsolóval használható. Valós idejű késés/vágány továbbra is külön forrás.
5. S24 Ultra Golden Standard, profilváltás, nav és teljes költség/forgalom-szabályozás ellenőrzés után éles aktiválás.

**Tilos:** nem publikus MÁVPlusz belső API-k scrappelése, jogtalan GTFS-tükör letöltése, fizetős Google-kulcs nyilvános GitHubba mentése, „Élő” jelzés menetrendi adatra, vagy végtelen háttérlekérdezés.
