# Samsung Health Data SDK: HealthHub közvetlen napi aktivitásadatok (v371)

**Státusz: ELŐKÉSZÍTETT, PRIVÁT SDK-PILOT VÁZÁVAL. MÉG NEM KAPCSOLÓDOTT.**
A v371 webes adatfogadó kódja és forrásszétválasztása kész. **A Samsung Health Data SDK Android-olvasója nincs beépítve az APK-ba**, nincs Samsung jóváhagyás, és a v371 önmagában nem oldja meg a hiányzó kalória/aktív idő/emeletszám importját. A meglévő Health Connect → Dropbox kapcsolat továbbra is működik.

## Fejlesztési állapot · 2026-11-17 (Samsung Direct privát tesztág)

**Kód-előkészítés elkészült, ÉLES ADATKAPCSOLAT MÉG NINCS.** A gyári Samsung Health Data SDK AAR nincs a nyilvános repóban és nincs Samsung-partnerregisztráció; a jelenlegi 0.15.20-szal kiadott, aláírt telefonos alkalmazás **nem tartalmaz közvetlen SDK-olvasót**.

- A `app/build.gradle.kts` kizárólag `-PhhSamsungDirectPilot=true` mellett teszi fordíthatóvá a külön `src/samsungDirectPilot/kotlin` forráskódot; a szokásos kiadások változatlanul SDK-mentesek.
- A `SamsungHealthDirectPilot.kt` privát tesztolvasó csak a tulajdonos által megnyomott tesztgomb után, külön Samsung Health `ACTIVITY_SUMMARY` READ engedéllyel olvassa a `TOTAL_ACTIVE_TIME` pontos `Duration` értékét. A 2026-11-18-i változat először a mai napot olvassa, majd hiányzó vagy érvénytelen eredmény esetén a tegnapi napot; az érték kizárólag a **tényleges mérési dátummal** menthető.
- Az SDK-n keresztül ténylegesen kiolvasott **mai vagy tegnapi aktív perc** külön `/HealthHub/profiles/<owner>-samsung-health.json` fájlba kerül; a `<owner>-health-connect.json` változatlan marad. Más profil adatát sem olvassa/feltölti. A Samsung fájl előző, befejezett napjait megtartja.
- Hiányzó adat/engedély/Dropbox-kapcsolat esetén a pilot nem állít elő és nem tölthet fel kitalált számot; a normál Health Connect dolgozik tovább.
- A tesztgomb **nem jelenik meg az általános Android-buildben**, és a pilot funkció még nem lett valódi Samsung SDK AAR-rel lefordítva, sem egyik telefonon kipróbálva.

### Privát Samsung SDK teszt · tényleges következő lépések (Windows)

1. Samsung Developer: [SDK letöltése](https://developer.samsung.com/health/data/process.html) → **Samsung Health Data SDK v1.1.0**. A letöltött ZIP-et őrizd meg a saját gépen. A Samsung binárist a nyilvános GitHub repóba vagy Actions-artifactba **ne töltsd fel**.
2. A projekt `healthhub/android-bridge` könyvtárában indíts PowerShellt, majd futtasd a helyi, biztonságos csomag-előkészítést:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\\scripts\\build-samsung-pilot-windows.ps1 -SamsungSdk "C:\\Users\\<FELHASZNÁLÓ>\\Downloads\\samsung-health-data-sdk-1.1.0.zip" -SkipBuild
   ```
   Ez csak a helyi, gitignore által védett `app/private-samsung-sdk/samsung-health-data-api.aar` fájlt helyezi el; még nem buildel APK-t. Az archívumban lévő AAR-t felismeri, de hibával leáll, ha hiányzik vagy kétértelmű.
3. Android Studio / JDK 17 / Android SDK 36 / Gradle 8.13 megléte után ugyanaz a parancs `-SkipBuild` nélkül építi a privát, elkülönített teszt APK-t. A Samsung SDK engedélykérési API-ját a hivatalos v1.1.0 dokumentációhoz igazítottuk, de **valódi AAR-rel történő fordítás még nem történt**.
4. A privát APK csomagneve `hu.zsoltmonika.healthhubbridge.samsungpilot`, ezért nem írja felül a már telepített, aláírt **HH One** alkalmazást és annak helyi adatbázisát. Figyelem: külön alkalmazásként **saját Dropbox-belépésre** is szüksége lehet, és Android deeplink ütközés lehetséges. A próba-APK nincs és nem kerül automatikusan OTA-ba.
5. Egy fejlesztői teszttelefonon a Samsung [fejlesztői módját](https://developer.samsung.com/health/data/guide/developer-mode.html) és **Data Read** funkcióját csak teszteléshez kapcsold be. A kísérleti alkalmazásban a telefon tulajdonosát választva, majd a **„Samsung Direct · aktív percek tesztolvasása”** gombbal lehet a saját Samsung `ACTIVITY_SUMMARY / TOTAL_ACTIVE_TIME` értékét lekérni. A külön Samsung jogosultságot a telefon tulajdonosa adja meg.
6. A jogosultság, dátum, export és a webes `v371` profilforrás-egyezés ellenőrzése után külön lehet dönteni az élesítésről. A Samsung [alkalmazásregisztrációja](https://developer.samsung.com/health/data/guide/app-verification.html) nélkül **nem helyezhető át a privát teszt működése a mindennapi, fejlesztői mód nélküli telefonokra**.

**Telefonos első mérföldkő (2026-11-18):** a felhasználó visszajelzése szerint a privát Pilot APK lefordult, települt, és a Samsung adatlekérdezés elindult; éjfél után „mára nincs hiteles aktív perc adat” üzenetet adott. Ez nem bizonyítja, hogy a Samsung SDK mért adatot visszaadott vagy Dropboxba feltöltött. A mai→tegnapi forráskódmódosítás ezután készült; **az új APK helyi újrafordítása és telefonos tesztje még hátravan**. Az éles OTA továbbra is SDK-mentes.

**Jelenlegi validáció:** a JavaScript forrás- és build-kontrakttesztek sikeresek; ez nem bizonyítja az AAR-es Kotlin fordítást, Samsung Health hozzáférést vagy telefonos eredményt. A normál Health Connect ütemezést és az éles APK-t nem módosítjuk.

### Elővigyázatosság
Nem cseréljük le a Samsung napi aktivitásidejét a Health Connect `EXERCISE_DURATION_TOTAL` értékére, mert ez két külön fogalom. Hiányzó Samsung adatot **„—”** jelöli, nem mért nulla. A Samsung-adatok beolvasási és felhőfrissítési ideje két eltérő mérőszám; az SDK-fájl nem írhatja át a Health Connect export idejét.

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
