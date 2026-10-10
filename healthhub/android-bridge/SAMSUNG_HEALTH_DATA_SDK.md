# Samsung Health Data SDK: HealthHub közvetlen napi aktivitásadatok (v371)


## v374: Samsung Direct automatikus béta adatút (ELŐKÉSZÍTVE, MÉG NEM TELEFONON TESZTELVE)

A korábbi SDK-függőséghibát követően **2026. október 10-én mindkét Galaxy készüléken a v372-es natív olvasás sikerült** (Zsolt 414,09 aktív kcal / 69,14 perc / 2 emelet, Mónika 311,61 kcal / 71,28 perc / 1 emelet). A 30 napos profil-specifikus JSON export a v373 webes kézi import után a HealthHubban is helyesen megjelent. A v374 erre az igazolt adatútra épít, de a háttérben futó SDK-olvasás és a Dropbox OAuth még NINCS bizonyítva.

### BETA app v0.13.0: v374 feladatok

- Külön Samsung Beta appban explicit **Dropbox PKCE engedélyező gomb**; a meglévő Dropbox HTTPS redirectet a webes v374 hhbeta_ state esetén relézi vissza a healthhubsamsungbeta://dropbox intenttel. A PKCE state, verifier és a telefon tulajdonosa ellenőrzendő a natív tokenváltás előtt.
- Külön „Samsung adatok feltöltése MOST” tesztgomb; kizárólag /HealthHub/profiles/<owner>-samsung-health.json felülírása, ha a helyi export szigorúan újabb és a régi remote sémája/profilja ismert. Letöltéssel ellenőrzi az eredményt.
- **Automatikus frissítés KI alaphelyzetben.** A felhasználó külön kapcsolhatja BE, ha már Samsung SDK olvasása sikeres és a BETA saját Dropbox tokenje megvan. WorkManager **kb. 4 óránként**, hálózat mellett, Android energiatakarékossági késleltetéssel.
- A háttérkód csak korábban megadott Samsung SDK-engedéllyel olvas, **soha nem mutat engedélykérőt**, soha nem módosítja a Health Connect archívumot vagy az éles Connect munkáit. Sikertelenség naplózódik; nincs „becsült Samsung mért adat”.
- Tulajdonos-váltásnál a BETA ütemezés kikapcsolódik, a BETA saját Dropbox-hitelesítése törlődik. Másik profilra nem tölt fel.
- Külön béta app versionCode 19 / versionName 0.13.0-beta; normál Health Connect app marad versionCode 18 / v0.12.0.

### Tesztelés előfeltétele

1. A webes v374 callbacknek ki kell kerülnie a HealthHubra (a meglévő, felhasználó által már használt v373-as kézi import nem változik).
2. A korábbi Windows BUILD KIT újrafuttatható, mert az v372 nevű **fejlesztői** branchet klónozza, ahol ez a v374 kód is van. Kijavított v374-es kit verziózott kimenetet kap.
3. Samsung Beta helyszíni build + telepítés: a tényleges 0.13.0-beta app azonos csomagazonosítón, **azonos signing key** mellett frissüljön. Ha Android aláírási hibát ad, nem szabad automatikusan törölni az adatokat; külön meg kell beszélni.
4. Először Zsolt telefonján: Samsung olvasás → Beta Dropbox OAuth → kézi feltöltés → HealthHub Activity ellenőrzés → egyértelmű BE gomb. A háttérszinkron első tényleges WorkManager futását készüléknaplóval/Dropbox időbélyeggel ellenőrizni kell; **Samsung SDK háttérhozzáférési tiltása lehetséges**.
5. Sikeres teszt után ugyanez Mónikán. **Nem minősül késznek**, amíg a telefonspecifikus háttérfutást és a 2 profil izolációját nem bizonyítottuk.
6. A natív v374 a *DRAFT* #114 PR-ben marad a tesztig. A Samsung hivatalos partnerengedélyezése és stabil aláírása külön követelmény a hosszú távú használathoz.

---

## v372 Android telefonos teszt: a valódi összeomlás oka és javítása

**2026-10-10, S24 Ultra logcat, 20:28:56:** a Samsung Health a béta csomagazonosítóját sikeresen igazolta (`PrivilegedHealthService: …samsungbeta is verified`), tehát a korábbi 2003-as policy-blokk már nem volt aktív. A `ActivitySummary` SDK-aggregálás utáni Binder válasz visszaolvasásakor az alkalmazás megállt:

```
java.lang.NoClassDefFoundError: Failed resolution of: Lkotlinx/parcelize/Parceler;
Caused by: java.lang.ClassNotFoundException: Didn't find class "kotlinx.parcelize.Parceler"
```

**Gyökérok:** az előkészített AAR nem hozza automatikusan a Samsung SDK által használt `kotlin-parcelize-runtime` függőséget. A Samsung-függvények lefordultak, de az `Parcelable` Binder válaszban a hiányzó osztály miatt futásidőben dőltek el. **Javítás:** kizárólag a `withSamsungSdk` béta ágba `implementation("org.jetbrains.kotlin:kotlin-parcelize-runtime:2.0.21")`, megegyezve a projekt Kotlin verziójával. Nem kell új SDK, új Samsung-engedély vagy a produktív Connect átalakítása.

**Ellenőrzés:** a javítás forráskódba bekerült. A friss APK újrafordítása és valódi készülékes teszt MÉG hátravan. Az eredeti BUILD KIT újrafuttatáskor törli a helyi béta-clone-t és frissen tölti le ezt a fejlesztői ágat. A régi APK nem javul meg magától; szükséges az új build és a HH Samsung Beta frissítése. Éles HealthHub Connect változatlan.

---

## Samsung Health Data SDK v1.1.0 ZIP validálása · 2026-10-10

A gyártó eredeti `samsung-health-data-sdk-1.1.0.zip` csomagja megérkezett **magán a beszélgetésen keresztül**. A csomagot nem másoltuk a GitHubba. A belső `1.1.0/libs/samsung-health-data-api-1.1.0.aar` valódi Java API-osztályait közvetlenül, `javap`-pal ellenőriztük. A natív olvasóban két fordítási akadályt találtunk és javítottunk:

- A `AggregatedData<T>.value` **nullable**; az aggregátum-számításokat `dataList.mapNotNull { it.value }` mintára állítottuk. Valódi AAR + Kotlin 1.9 fordítási próbában az API-használat sikeresen fordult egyszerű Android osztályhelyettesítőkkel. Ez még nem teljes Android-alkalmazás build.
- Az AAR `AndroidManifest.xml` **minSdkVersion 29** értéket követel, ezért a Samsung SDK-val buildelt variáns minimum SDK 29-es. A normál Health Connect app minimum SDK 26-os marad.

**Telepítési biztonság:** a Samsung SDK-val buildelt alkalmazás külön béta csomagazonosítót kap, `hu.zsoltmonika.healthhubbridge.samsungbeta`. Az eredeti, működő HealthHub Connect nem íródik felül. A béta Dropbox OAuth deep-link átirányítását végig kell még tesztelni, mielőtt tényleges használatba adnánk.

**Még nem történt meg:** teljes Gradle/Android SDK build, APK-aláírás, Samsung telefonos engedélykérés, Samsung Developer hozzáférési ellenőrzés és Dropbox béta OAuth végpont-teszt. A nyilvános PR-t **DRAFT** állapotban kell hagyni. Az eredeti `0.12.0` APK az éles változat. A következő ellenőrzési fázishoz teljes, SDK-val felszerelt Android buildkörnyezet kell.

---

## v372 fejlesztői állapot: natív olvasó előkészítve (draft PR)
- Elkészült a `src/samsungSdk/java/.../SamsungSdkDailyReader.kt` natív Samsung napi aggregáló forrás: aktív kalória, aktív idő, távolság, megmászott emeletek.
- A Samsung SDK saját, *külön* engedélykérő képernyője szükséges. A felhasználói gomb csak SDK-val ténylegesen buildelt APK-ban jelenik meg.
- Az SDK-ból szerzett adat önálló `<profile>-samsung-health.json` fájlba kerül Dropboxban; soha nem írja felül a Health Connect archívumot.
- A normal `app/libs/samsung-health-data-api.aar` nélkül épülő verzió továbbra is `src/samsungStub/java/` helyettesítő osztályt használ, amely soha nem állítja, hogy Samsung-napi adatot szerzett.
- A gyártó v1.1.0-s **AAR fájlja még nincs itt**, ezért az SDK-s Android-fordítás és valós Samsung-telefonos ellenőrzés NEM történt meg. A v372-t szándékosan nem élesítjük, amíg nincs ellenőrzött SDK-fordítás.
- A jelenlegi Android app **0.12.0**, amelyet nem szükséges lecserélni és nem szabad eltávolítani.
- A Samsung hivatalos szabályai szerint a fejlesztői teszt *partnerjóváhagyás előtt is lehetséges*, de kizárólag Samsung Health fejlesztői tesztmóddal. Ez **nem** azonos a publikus/általános terjesztéssel; annak SHA-256 tanúsítvány/regisztráció szükséges.
- A Samsung SDK 1.1.0 minimum Samsung Health 6.30.2-t, Android 10-et és Java 17-et igényel.

### A következő valódi blokkoldó lépés
A Samsung hivatalos `Samsung Health Data SDK v1.1.0` ZIP-jét a fejlesztői oldalon le kell tölteni, és ellenőrzött helyi projektben kinyerni belőle a `samsung-health-data-api.aar` állományt. Ne publikáld GitHubon; a gyártói SDK-t kizárólag a fordításhoz kell átadni biztonságos csatornán. Ezután teljes natív Android build, kézi teszt és aláírás/telepíthetőség ellenőrzés szükséges.

**Forrás:** https://developer.samsung.com/health/data/process.html
**Teszt mód:** https://developer.samsung.com/health/data/guide/developer-mode.html

---


**Státusz: ELŐKÉSZÍTETT, MÉG NEM KAPCSOLÓDOTT.**
A v371 webes adatfogadó kódja és forrásszétválasztása kész. **A Samsung Health Data SDK Android-olvasója nincs beépítve az APK-ba**, nincs Samsung jóváhagyás, és a v371 önmagában nem oldja meg a hiányzó kalória/aktív idő/emeletszám importját. A meglévő Health Connect → Dropbox kapcsolat továbbra is működik.

## Miért kell közvetlen SDK?
A Health Connect nem feltétlen adja át a Samsung napi Activity Tracker összesített adatait; lehet, hogy az aktív idő, a kalória és az emeletek különböznek vagy hiányoznak a Samsung apphoz képest. A Samsung Health Data SDK `ActivitySummaryType` a **TOTAL_ACTIVE_TIME**, **TOTAL_ACTIVE_CALORIES_BURNED**, **TOTAL_DISTANCE** és **TOTAL_CALORIES_BURNED** aggregátumokat támogatja. `FloorsClimbedType.TOTAL` külön kérdezhető le. A magasságszint-emelkedés külön, nem garantált adat; a Samsung Data SDK támogatott listája nem jelöl önálló elevation gained típust.

## Dokumentált előfeltételek
- Samsung Health Data SDK 1.1.0 letöltése a hivatalos Samsung Developer oldalról, az AAR helyben/projekt titkos tárolójában. **Ne töltsük fel a gyártói AAR-t nyilvános GitHub repóba.**
- A meglévő app csomagneve: `hu.zsoltmonika.healthhubbridge`; Samsung Health >= 6.30.2; Android >= 10, Java >= 17.
- Hozzáférés: `HealthDataService.getStore(context)`; olvasási engedélyek felhasználói hozzájárulással: `DataTypes.ACTIVITY_SUMMARY`, `DataTypes.FLOORS_CLIMBED`, opcionálisan `DataTypes.STEPS`. Külön, visszavonható beállításban, ne vonjuk össze a Health Connect-engedélyekkel.
- Fejlesztői tesztelés a Samsung által biztosított külön fejlesztői mód mellett lehetséges. **Általános terjesztéshez Samsung partner jóváhagyás, állandó alkalmazás-aláíró kulcs és SHA-256 regisztráció kell.**
- Jelenleg a GitHub Actions debug APK-aláírását a CI hozza létre, nem garantált ugyanaz a SHA-256 minden buildnél. A végleges aláírási/partner státusz nélkül az SDK az alkalmazást elutasíthatja. Ne módosítsuk úgy az appot, hogy emiatt a megszokott szinkron megszűnjön.

## Teljes adatút terve
1. Samsung SDK-hoz való hozzáférés, engedélyek és napi aggregátumok az Android HealthHub Connectben, **csak engedélyezett saját telefonon**.
2. Az SDK eredményét elkülönített fájlba exportáljuk az adott felhasználó Dropbox vaultjába; meglévő `<profile>-health-connect.json` soha nem íródik felül.
3. Fájlonként: `/HealthHub/profiles/zsolt-samsung-health.json` és `/HealthHub/profiles/monika-samsung-health.json`.
4. Webes v371 forráskezelő már olvassa az opcionális fájlt, validálja a sémát, a profilazonosságot, a dátumot és az értékeket. Samsung SDK energia, aktív idő, emelet **csak tényleges adat esetén** kerülhet a KPI-okra; az eredeti Health Connect számok a diagnosztikában megmaradnak.
5. A távolság alapértelmezett HealthHub lépés/magasság becslése marad; a Samsung SDK távolsága összehasonlításra szolgál.
6. Hiányzó SDK, elutasított engedély vagy Samsung oldali hiba esetén a HealthHub a Health Connect és a becslés jelenlegi működésére esik vissza.

### HealthHub Samsung napi exportv1-séma (csak valóban kiolvasott adat)
```json
{
  "schemaVersion": "healthhub.samsung.daily/1",
  "profile": "monika",
  "exportedAt": "2026-10-10T15:05:00Z",
  "records": {
    "dailySummary": [
      {
        "date": "2026-10-10",
        "activeCaloriesKcal": 180,
        "activeMinutes": 45,
        "distanceMeters": 3500,
        "floorsClimbed": 2
      }
    ]
  }
}
```

A fenti számok **kitalált tesztadatok**, nem személyes egészségügyi értékek és nem élő export. A v371 nem hozza létre a fájlt és **nem szimulál valós mérést**. Üres vagy hiányzó mező maradjon kihagyva (`null`/0 csak akkor, ha a Samsung SDK ténylegesen ezt adta), és a származási információhoz meg kell őrizni az SDK olvasási időpontját.

## Samsung hivatalos források
- https://developer.samsung.com/health/data/process.html
- https://developer.samsung.com/health/data/guide/app-verification.html
- https://developer.samsung.com/health/data/api-reference/-shd/com.samsung.android.sdk.health.data.request/-data-type/-activity-summary-type/index.html
- https://developer.samsung.com/health/data/api-reference/-shd/com.samsung.android.sdk.health.data.request/-data-type/-floors-climbed-type/index.html
- https://developer.samsung.com/health/data/guide/hello-sdk/aggregate-data.html
- https://developer.samsung.com/health/data/guide/hello-sdk/permission-request.html

## Elfogadási tesztek a következő APK-fejlesztési fázishoz
- Mónika direkt Samsung / Health Connect / becslés adatok külön-külön forrással megjelennek a két profilban, egymás adatait soha nem keverik össze.
- Samsung napi kalória és idő kizárólag valódi, Samsung SDK-ból származó rekord hatására jelenhet meg, nem manuális kép alapján.
- Ha a Samsung SDK-tól nem érkezik adat, a részleges percérték világosan Health Connect-ként, a saját kcal pedig becslésként jelenik meg.
- A Samsung SDK hibája nem szakíthatja meg a rutin Dropbox / Health Connect automatikus szinkronját.
- Android valós készüléken tesztelés szükséges; a webes normalizáló mockkal tesztelhető.
