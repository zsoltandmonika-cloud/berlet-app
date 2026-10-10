# Samsung Health Data SDK: HealthHub közvetlen napi aktivitásadatok (v371)

**Státusz: ELŐKÉSZÍTETT, MÉG NEM KAPCSOLÓDOTT.**
A v371 webes adatfogadó kódja és forrásszétválasztása kész. **A Samsung Health Data SDK Android-olvasója nincs beépítve az APK-ba**, nincs Samsung jóváhagyás, és a v371 önmagában nem oldja meg a hiányzó kalória/aktív idő/emeletszám importját. A meglévő Health Connect → Dropbox kapcsolat továbbra is működik.

## Miért kell közvetlen SDK?
Mónika: Health Connect 6129 lépés, 32 perc és aktív kcal nélkül; Samsung Health ugyanazon időszakban 6129 lépést, kb. 69 percet, 232 kcal-t és 1 emeletet mutatott. A Health Connect nem feltétlen adja át a Samsung napi Activity Tracker összesített adatait. A Samsung Health Data SDK `ActivitySummaryType` a **TOTAL_ACTIVE_TIME**, **TOTAL_ACTIVE_CALORIES_BURNED**, **TOTAL_DISTANCE** és **TOTAL_CALORIES_BURNED** aggregátumokat támogatja. `FloorsClimbedType.TOTAL` külön kérdezhető le. A magasságszint-emelkedés külön, nem garantált adat; a Samsung Data SDK támogatott listája nem jelöl önálló elevation gained típust.

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
        "activeCaloriesKcal": 232,
        "activeMinutes": 69,
        "distanceMeters": 4400,
        "floorsClimbed": 1
      }
    ]
  }
}
```

A fenti számok a két screenshot alapján **illusztratív példa**, nem élő export. A v371 nem hozza létre a fájlt és **nem szimulál valós mérést**. Üres vagy hiányzó mező maradjon kihagyva (`null`/0 csak akkor, ha a Samsung SDK ténylegesen ezt adta), és a származási információhoz meg kell őrizni az SDK olvasási időpontját.

## Samsung hivatalos források
- https://developer.samsung.com/health/data/process.html
- https://developer.samsung.com/health/data/guide/app-verification.html
- https://developer.samsung.com/health/data/api-reference/-shd/com.samsung.android.sdk.health.data.request/-data-type/-activity-summary-type/index.html
- https://developer.samsung.com/health/data/api-reference/-shd/com.samsung.android.sdk.health.data.request/-data-type/-floors-climbed-type/index.html
- https://developer.samsung.com/health/data/guide/hello-sdk/aggregate-data.html
- https://developer.samsung.com/health/data/guide/hello-sdk/permission-request.html

## Elfogadási tesztek a következő APK-fejlesztési fázishoz
- Mónika direkt Samsung / Health Connect / becslés adatok külön-külön forrással megjelennek a két profilban, egymás adatait soha nem keverik össze.
- 69 perc és 232 kcal kizárólag valódi, Samsung SDK-ból származó rekord hatására jelenhet meg, nem manuális kép alapján.
- Ha a Samsung SDK-tól nem érkezik adat, a 32 perc világosan Health Connect-ként, a saját kcal pedig becslésként jelenik meg.
- A Samsung SDK hibája nem szakíthatja meg a rutin Dropbox / Health Connect automatikus szinkronját.
- Android valós készüléken tesztelés szükséges; a webes normalizáló mockkal tesztelhető.
