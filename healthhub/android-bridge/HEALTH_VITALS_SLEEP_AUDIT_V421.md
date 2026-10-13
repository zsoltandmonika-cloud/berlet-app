# HealthHub v421 – alvás és egészségügyi rekordok auditja

## Elvégzett forráskód-javítás
A `HealthConnectExporter.export(profile, days=30)` most már lapozva olvassa a `SleepSessionRecord`, `BloodPressureRecord`, `OxygenSaturationRecord` és `RestingHeartRateRecord` rekordokat, ahogy eddig a pulzusrekordoknál már megtörtént. Ez nem változtatja meg a HealthHub JSON mezőneveket, az adatokat vagy az engedélyeket; a hiányt okozó első-oldalas levágást javítja.

## Tényleges, meglévő Health Connect adatút
- Pulzus: `heartRate` mintavételek; nyugalmi pulzus: `restingHeartRate`.
- Vérnyomás: `bloodPressure` szisztolés/diasztolés mmHg.
- Véroxigén: `oxygenSaturation` százalék, tényleges mérési időpont.
- Alvás: `sleepSessions` kezdés/vég, opcionális fázisintervallumok, `sourcePackage`.
- Súly/testzsír, vércukor, VO₂ max, lépések és edzések is létező rekordcsatornák.
- Az adatok csak akkor jelennek meg, ha egy tényleges készülék/alkalmazás beírja őket a Health Connectbe és megfelelő jogosultság rendelkezésre áll.
- Samsung-specifikus Sleep Score, Energy Score, Stress, Samsung Health Monitor EKG/BP, HRV és bőrhőmérséklet **nem** igazolt a jelenlegi exportálóban.

## Következő, kötelező biztonsági és adatminőség-kapuk
1. **Profil:** a jelenlegi Connect `device_owner_profile` / feltöltési profilzár megtartása és ellenőrzése; a tesztalkalmazás spinnerje NEM valódi Samsung-fiókváltás.
2. **Időablak:** `end.minusSeconds(days*86400)` jelenleg gördülő idő; a 30 napos naptár és a „reggel véget ért éjszakai alvás” szemantikája külön, időzónával tesztelendő. DST/éjfél átnyúlás és szundik kezelése.
3. **Adatszemantika:** a `SleepSessionRecord.stages` hiánya nem jelent 0 mélyalvást; az alváspontszám nem azonos a fázisokkal.
4. **Pagináció:** a most javított négy adattípuson túl testsúly, vércukor, VO₂ max, edzés, táplálkozás és többi Health Connect lekérdezés még lehet első oldalra korlátozott. Ezeket külön folytatni kell, mielőtt teljességet ígérünk.
5. **Duplikáció:** Health Connect és Samsung SDK által adott egyező rekordokat nem szabad kétszer importálni. `sourcePackage`, Health Connect ID, forrás és időintervallum megőrzése.
6. **Valódi tesztek:** adatforrás és jogosultság státuszát telefonon kell igazolni; az egyes alvás/fiziológiai adatok száma és részletei összevetendők a Samsung Health kijelzővel.
7. **Pilot kontra éles:** a v420 pilot internet- és felhőfeltöltés nélkül marad; a v421 változás csak fejlesztési ágon szerepel. A megbízható éles OTA/háttérszinkron bevezetése külön ellenőrzési kapu.

## UI követelmény
A HealthHub Activity dátumválasztója és 30 napos naptára legyen az alvás és minden releváns fiziológiai idősor közös mintája. Legfrissebb 24 óra + kiválasztott nap, állítható profil, de a forrás és a tényleges telefon tulajdonosa legyen hiteles.

**Nincs új telepíthető APK és nincs éles release ezen audit hatására.**
