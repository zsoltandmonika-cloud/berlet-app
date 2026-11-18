# HH One · OTA-döntés · 2026-11-18

## Végleges felhasználói döntés: SAJÁT SHO OTA MARAD
A Google Play Console / Internal Testing alapú terjesztésre vonatkozó korábbi V2 javaslat **TÁRGYTALAN**. Ne indítsunk Play Console regisztrációt, signing-migrációt, külön Play publish pipeline-t vagy új kísérleti telepítőt a jelenlegi felhasználói igényre hivatkozva.

**Elvárt, már alkalmazott működés:**
1. Az SH9/SHO OTA pirula jelzi a központilag kiadott új verziót (villogó / figyelmeztető állapot).
2. Zsolt vagy Mónika rákattint a pirulára.
3. A meglévő signed OTA ellenőrzi az új verziót, csomagnevet, aláírást és SHA-256-ot; szükség esetén előre letöltött APK-t használ.
4. Android rendszertelepítő jóváhagyását a tulajdonos megadja, az alkalmazás frissül helyben, az adatai megmaradnak.

Mónika telefonján ez a pirulás, jóváhagyásos frissítési út már **a felhasználó szerint működött**. Ez az elfogadott UX standard; nincs követelmény valódi silent/zero-touch installra. A Google Playhez hasonló kényelem alatt itt **egyérintéses indítást és Android-jóváhagyást** értünk, nem rendszerjogosultság nélküli csendes telepítést.

**Fejlesztési és kiadási szabályok:**
- Meglévő `OtaUpdateManager.kt`, `OneTapOtaActivity`, SHO OTA pirula, `healthhub/data/bridge-ota.json` és aláírt GitHub release mechanizmus marad.
- Zsolt canary először, Mónika csak ellenőrzött kiadásnál; a két telefon külön verzión maradhat.
- A Samsung SDK-t tartalmazó 0.15.22/build49 privát signed APK **nem** válik automatikusan OTA-kiadássá. A későbbi Samsung-integrált kiadáshoz változatlan, helyes csomagazonosító és aláírás, Samsung partnerengedély, készülékes szinkronvalidálás, valamint a jelenlegi OTA kiadási guardok teljesülése szükséges.
- Nincs APK-uninstall/reset, Health Connect vagy Dropbox visszaállítási procedúra, új kiadási csatorna, Play-fiók vagy extra felhasználói adminisztráció a döntés miatt.
- A központból mi kezeljük a *signed release és a rollout* folyamatát; ez nem azonos az Android telepítés csendes távoli végrehajtásával.

**Állapot:** UX és terjesztési csatorna ELFOGADVA. Nincs szükség új OTA infrastruktúra fejlesztésére pusztán a Play-szerű élmény miatt; a Samsung-integrált OTA kiadási kapui külön maradnak.
