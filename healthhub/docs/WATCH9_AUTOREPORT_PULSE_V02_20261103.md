# SH9 Watch9 Wear Bridge · v0.2 izolált pilot (2026-11-03)

**Referenciaeszköz:** Mónika Watch9 40 mm LTE; **fallback:** Zsolt Watch5 Pro.
**Kizárólag két önálló tesztapp:** nem helyettesíti, nem frissíti az éles HH One / Family Guard / SHO alkalmazást.

## V0.2 újdonságok
- **Időszakos óraakku-jelentés (külön engedély):** 30 / 60 / 120 perc. Alapállapot: KIKAPCSOLVA.
- Az Android WorkManager időzítése **nem pontos**; a rendszer energiatakarékossága késleltetheti a következő futást.
- Automatikus jelentés alapértelmezésben **csak közeli telefonra** történik. Távoli hálózati/LTE-adatút kizárólag külön megerősítéssel kapcsolható be.
- Ha az óra töltöttsége 20% alatti és nem töltődik, a háttérjelentés kimarad.
- Az óra **csak akku, töltés, modell és időbélyeg** értékeket küld; pulzust soha nem továbbít automatikusan.
- A telefon időbélyeg szerint elutasítja a régi vagy visszajátszott jelentést, az egy családtaghoz kötött eszközazonosítást megtartja.
- Az órán külön gomb: **kézi, legfeljebb 25 másodperces pulzusszenzor-mérés** Android SensorManager segítségével. Külön érzékelőengedéllyel, csak az óra kijelzőjén.
- A pulzusmérés a gomb elhagyásakor vagy 25 mp után leáll, nem kerül át telefonra / felhőbe és nem minősül orvosi felügyeletnek.

## Első valódi próba (Watch9)
1. A két új APK-t **azonos GitHub Actions buildből** telepítsd; ugyanaz a csomagnév és az aláírásuk.
2. Ha v0.1 pilot APK-t már telepítettél egy korábbi CI-buildből, eltérő GitHub debug kulcs miatt előbb **csak a két PILOT appot** töröld; a HH One-t tilos eltávolítani.
3. A telefonon nyisd meg a **SH9 Watch Bridge PILOT** alkalmazást; engedélyezd Mónika profilját.
4. A Watch9-en nyisd meg az órás PILOT appot; nyomd meg az **ÁLLAPOT KÜLDÉSE** gombot. A telefonon kérd a státusz frissítését.
5. Ha az ACK igazolja a sikeres fogadást, kapcsolj be **60 percenkénti automatikus akkumulátor-jelentést**. Ez a javasolt, energiatakarékos pilotbeállítás.
6. Az LTE-tartalékot egyelőre hagyd **kikapcsolva**. A telefon környéki adatút ellenőrzése után külön mérjük az LTE-útvonalat.
7. A pulzust az órán a **❤️ Kézi pulzusmérés** gombbal ellenőrizd. A helyi engedélykérést egyszer jóvá kell hagyni.
8. A telefonos appban a státusz **Kézi** vagy **Automatikus** típussal, érkezési idővel és adatfrissességgel szerepel. Nem állítja, hogy az óra élőben csatlakoztatva van.
9. Kikapcsolás: az órán **Automatikus küldés KIKAPCSOLÁSA**; telefonon **Fogadás leállítása és tesztadatok törlése**.

## Releasementes védelmek
- A pulzus nem indul magától; **sem BODY_SENSORS_BACKGROUND, sem background health permission** nincs.
- Nincs GPS, egészségadat-upload, Dropbox/Supabase-írás, telefonon rejtett monitorozás, jogosultság-átruházás.
- WorkManager egyetlen egyedi ütemezést kezel; a stop gomb visszavonja.
- Valós kapcsolati státuszt csak hiteles időbélyeges jelentésből és TTL-lel értelmezünk; párosításból nem.
- Ha az órán hiányzik az Android TYPE_HEART_RATE szenzor vagy a forrás nem ad érvényes adatot: **nincs mérés**, nem kitalált érték.
- A Watch9 további EDA/MF-BIA lehetőségeit továbbra is célként kezeljük, de Samsung SDK és valódi órateszt nélkül nem állítjuk működőnek.
- **Az OTA workflow és a main ág nem érintett.** A debug APK-kat nem ajánljuk éles telepítésre.

## Validációs kapuk
- [ ] A két pilot APK azonos buildben lefordult, a SHA-256 aláírás ellenőrzése sikerült.
- [ ] Watch9 valós eszközön: manuális akku + visszaigazolás működik.
- [ ] 60 perces automatikus módban legalább 2 tényleges jelentés megérkezik, érkezési idővel.
- [ ] 20% alatt és töltés nélkül nincs háttérküldés.
- [ ] LTE-fallback ki- és bekapcsolása csak kifejezett, külön megerősítéssel.
- [ ] Pulzusszenzor jogosultság elutasítása biztonságos, nincs mérés; elfogadása után legfeljebb 25 mp-ig aktív.
- [ ] A Watch5 Pro ugyanazon alapfunkciókat támogatja, Watch9-extrák hiánya nem blokkol.
- [ ] Üzemidő- és háttérfolyamat-mérés, éles HH One regresszió nélkül.

## Források
- https://developer.android.com/reference/androidx/work/PeriodicWorkRequest
- https://developer.android.com/health-and-fitness/health-services/permissions
- https://source.android.com/docs/core/interaction/sensors/sensor-types
- https://developer.android.com/training/wearables/data/client-types
