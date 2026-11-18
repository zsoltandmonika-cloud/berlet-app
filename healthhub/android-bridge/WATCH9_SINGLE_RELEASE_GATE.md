# Watch 9 · Egyetlen összevont OTA · 2026-11-18

## Felhasználói döntés (kötelező release-kapu)
Zsolt telefonja a fejlesztői/canary tesztkészülék; Mónika telefonját nem kérjük el egymást követő kísérleti APK-telepítésekhez. Egyetlen, minden **elkészült és igazolt** Watch 9-funkciót tartalmazó, meglévő **SHO pirulás OTA** frissítés megy Mónikának. A telefonon a normál Android telepítő/engedély jóváhagyások megmaradnak. Mónika telefonját **ne** tegyük függővé a kiadás előtti napi fejlesztői próbáktól.

A már aláírt és Zsoltnál telepített `0.15.22` / `versionCode 49` nem módosítható ugyanazon verziószámon. Az összevont **következő** kiadás új, növekvő `versionCode > 49` értéket kap, csak akkor, ha minden kapu kész; ne foglaljunk le új verziószámot publikált release-ként idő előtt.

## Az összevont csomag tartalma
| Terület | Implementáció a 0.15.22 fejlesztői kódban | Kiadási követelmény |
|---|---|---|
| Profil/telefon tulajdonosi izoláció | kötés `device_owner_profile` alapján, elkülönített `/HealthHub/profiles/{owner}-samsung-health.json` | Mónika nem olvashatja Zsolt telefonjának méréseit, fordítva sem; létező adatok megmaradnak |
| Samsung Direct alap | valós aktív percek, napi aktív kalória, távolság | kézi és két órás háttérszinkron valódi Dropbox-visszaolvasással |
| Samsung Direct kiegészítés | órás lépések + edzésesemények, külön permission | elutasítás nem blokkolja a többi mérést, nincs kitalált nulla |
| Egységes Health Connect | lépések, távolság, aktív/összkalória, edzésidő, edzés, HR, RHR, SpO2, VO2max | a Samsung Health által Health Connectbe ténylegesen írt adatokból olvasunk |
| Alvás | Health Connect `sleepSessions` és `stages` | profil és dátum helyes; részleges/missing adat hiányzó marad; nem állítunk nem elérhető Samsung sleep score-t |
| Watch 9 opcionális szenzorok | `HeartRateVariabilityRmssdRecord`, `RespiratoryRateRecord`, `SkinTemperatureRecord` + jogosultságkérő | helyes ms, breaths/min és skin-temperature **delta**, baseline nélküli hőmérséklet nem abszolút °C |
| Terep | emeletek, szintemelkedés Health Connectből, opcionális engedély | ha nincs hiteles rekord, üres mező, nem számolt becslés |
| Energiapont / gyártói összpontszám | **nincs igazolt Samsung/Health Connect API-olvasó** | csak akkor kerülhet funkcióként a csomagba, ha hivatalos API és valós olvasás bizonyított; addig üres/nem elérhető, nem kiadási blocker |
| Szinkron | Samsung Direct alapértelmezett 1h, választható 1/2/3h; meglévő HC változatlan | saját telefonon állítható, hibás forrás nem törölhet előzményt |
| Felület | Activity csempék és source-provenance | mindkét profil azonos készlet, jelenjen meg `nem elérhető` / hiányzó forrás, ne klónozzon értékeket |
| Kiadás | GitHub signing + SHA-256 + saját SH9/SHO OTA pirula | valódi **Samsung SDK-t tartalmazó**, azonos csomagnév/aláírás, `versionCode` monoton, staged rollout |

## Folyamat: ne legyen ismételt Mónika-készülékes telepítés
1. Fejlesztés + CI + teljes Samsung-integrációs előzetes ellenőrzés Zsoltnál.
2. Egyetlen összevont, aláírt GitHub release csak az összes, elérhető funkció áttekintése után.
3. Csak Zsolt OTA piruláján canary; két unattended Samsung olvasás és Dropbox readback, régi adatok sértetlensége, Watch 9-ekhez nem rendelt értékek nem követelmény.
4. Samsung partner alkalmazás/certificate jogosultság ellenőrzése a saját release-disztribúciós módhoz; ne tételezzük fel az SDK terjeszthetőségét csupán a fejlesztői mód miatt.
5. Rollout csak `monika` célra a **saját meglévő OTA pirulával**. A telefonon egyetlen frissítési alkalom, külön Samsung és HC adat-hozzáférési jóváhagyás szükséges lehet.
6. Telepítés után owner isolation, meglévő Activity-adatok, 1h ütemezés, tényleges Watch 9 mérések ellenőrzése. A ténylegesen nem elérhető mérési csempék üresen maradnak.

## NO-GO
- Nem lehet meglévő 0.15.22 APK-t utólag módosítani.
- Nem pusholunk SDK nélküli normál 0.15.20 APK-t Samsung-integrált telefonra.
- Nem kapcsolunk ki Android telepítési jóváhagyást; nincs silent install.
- Nem csinálunk köztes 0.15.23/0.15.24 kísérleti Monika-telepítéseket.
- Nem nevezzük teljesnek a Watch 9 API-lefedettségét dokumentált source + real-device validáció nélkül.
- Nem módosítunk `main/healthhub/data/bridge-ota.json` vagy public release csatornát amíg a Samsung és a teljes CI kapu nyitott.

**Állapot:** single-release policy aktív a fejlesztési ágon; a consolidated Samsung OTA **nincs kiadva**, új APK még nincs telepítve Mónika telefonjára e döntés alapján.
