# HealthHub Digital Wellbeing v434 · profilhelyes, valósadat-alapú előnézet

**Állapot (2026-10-13): FEJLESZTŐI DRAFT / NEM ÉLES.** A meglévő HealthHub main ág, a Sleep v427/v428/v433 munka és a működő Health Connect szinkron érintetlen marad. Nem készült és nem került telepítésre APK.

## Megvalósított technikai alap

1. `healthhub/live-v434-digital-wellbeing.js`: az eredeti HealthHubba betöltött, de **alapból teljesen inaktív** mobilbarát dashboard. Kizárólag `?hh_dw_preview=1` paraméterrel (vagy tudatos `window.HH_DIGITAL_WELLBEING_PREVIEW=true` beállítással) jelenik meg az előnézeti gomb.
2. Meglévő hitelesített `window.HH_DROPBOX_VAULT.downloadJson` API, kizárólag **olvasásra**, automatikus felhőírás, Supabase-tábla vagy új OAuth nélkül.
3. Az Android gyűjtőprogram forrásának alapja: `DigitalWellbeingReader.kt`, `AppOpsManager` engedélyellenőrzéssel és kizárólag **fizikai telefon tulajdonosára rögzített** profillal. **A kód még nincs bekötve sem UI-ba, sem WorkManagerbe, sem Dropbox-exportba.**
4. Új, opt-in Android `PACKAGE_USAGE_STATS` manifest-deklaráció a draft ágon; ez **önmagában nem ad engedélyt**, tényleges hozzáférést külön Android Beállítások oldalon kell a felhasználónak jóváhagynia.
5. A megjelenítésben nincsenek kitalált értékek és csak az exportban ténylegesen elérhető mezők jelenhetnek meg. A dátumok magyar időzónával jelennek meg, a mért adatok eredeti időbélyege UTC marad.

## Egyetlen kanonikus forrás

`/HealthHub/profiles/zsolt-digital-wellbeing.json` és `/HealthHub/profiles/monika-digital-wellbeing.json`. Soha nem szabad az egyik profilt a másik telefonjáról feltölteni, lekérni vagy összeolvasztani. Az export **nem** lehet publikusan elérhető GitHub-fájl, nem kerülhet HealthHub public JSON mappába.

### v1 séma, formátumpélda (nem valódi személyes adat)

```json
{
  "schema": "healthhub.digital-wellbeing/1",
  "profile": "zsolt",
  "source": "Android UsageStatsManager.INTERVAL_DAILY",
  "timezone": "Europe/Budapest",
  "exportedAt": "2026-10-13T10:30:00Z",
  "days": [
    {
      "date": "2026-10-13",
      "apps": [
        {
          "packageName": "com.openai.chatgpt",
          "foregroundMs": 1800000,
          "lastUsedAt": "2026-10-13T10:10:00Z"
        }
      ]
    }
  ]
}
```

A példában szereplő számok **műszaki példák**, a HealthHub UI ilyen JSON fájlt nem generál és **nem állítja**, hogy ilyen adat a telefonról már megérkezett.

**Mérési jelentések:**
- `foregroundMs`: Android **alkalmazás-előtéridő**, nem a Samsung Digital Wellbeing által jelentett `Screen time`. Több előtérben futó alkalmazás összegzése eltérhet a kijelző tényleges bekapcsolt idejétől.
- `screenOnMs`: külön, ténylegesen mért **kijelző aktív idő**, a v434 natív olvasó **nem** exportálja. Hiányában „Nincs mérés”.
- `lateNightMs`: a megfelelő helyi esti/időablakra külön mért eseményalapú használati idő, a v434 natív olvasó **nem** exportálja. Hiányában „Nincs mérés”.
- `com.openai.chatgpt`: **csak** a natív ChatGPT Android alkalmazás előtérideje. Chrome/Edge/Internet böngészőben történt ChatGPT-használat nem azonosítható ebből megbízhatóan.
- `exportedAt`: export ideje, nem a legfrissebb mérés időpontja. Képernyőidő-adatot nem értelmezünk alvásfázisként.

## Az adatfolyam következő, még nem implementált lépései

1. Connect Android UI: engedély tájékoztatása, Android **Usage Access** külön jóváhagyása, alapból kikapcsolt adatgyűjtés, rövid megőrzési idő, profil-tulajdonosi zár, explicit engedély a privát felhőexporthoz, visszavonás és adatok törlése.
2. Native gyűjtő és biztonságos export összekötése a meglévő Dropbox klienssel, a sikeres feltöltés és visszaolvasás külön ellenőrzése. Még a Health Connect sync hibájában sem szabad adatot írnia.
3. Az Android SDK / OEM viselkedés ellenőrzése az S24 Ultra készüléken. Pontos képernyő- és éjszakai idő csak esemény-időablakból, validált napváltási logikával.
4. Külön buildelt és aláírt **teszt APK**, nem automatikus OTA. Mónika és Zsolt készüléke külön owner-lock teszttel.
5. Csak hiteles, időbélyeges és megfelelő lefedettségű adatok után Sleep Intelligence időbeli korreláció. Ok-okozati állítás tilos.
6. A jóváhagyott Léna Hero grafika külön **statikus** réteg; minden KPI, gomb, ikon és grafikon külön **élő DOM/UI** komponens, ne legyenek beégetve kitalált számok a képbe.

## Kiadási kapuk / tesztforgatókönyvek

- [ ] Main ág és jelenlegi Sleep/Activity/Ask Léna működés azonos, opt-in nélkül semmi nem változik.
- [ ] Megnyitható `?hh_dw_preview=1` paraméterrel egy külön preview deploy-on, S24 Ultra Chrome/Edge álló kijelzőn.
- [ ] Rossz `schema`, rossz `profile`, hibás nap, érvénytelen vagy jövőbeli export dátum esetén nincs adatmegjelenítés.
- [ ] Hiányzó Dropbox / nem létező fájl: világos „Nincs mérés”, NEM nullának becsült 0 perc.
- [ ] Profilváltás alatt érkező régi hálózati válasz nem frissítheti az új profilt.
- [ ] Samsung Digital Wellbeing és alkalmazás-előtéridő fogalmilag nem keveredik.
- [ ] Engedély nélkül natív olvasó nem olvas; profilzár nélkül nem exportál.
- [ ] Android Usage Access visszavonás után sem UI, sem worker nem próbál új adatot küldeni.
- [ ] Sem GitHub, sem publikus storage, sem konzollog nem tartalmaz valódi alkalmazás-szokás adatot.
- [ ] Kizárólag külön felhasználói jóváhagyás és valós készülékteszt után szabad élesre kapcsolni.

## Visszaállítás

A teljes v434 preview az `?hh_dw_preview=1` paraméter elhagyásával eltűnik. A draft PR lezárása nem érinti a main ágat. A legfontosabb biztonsági döntés: **nem helyettesítjük a hiányzó adatokat mintaértékekkel**.
