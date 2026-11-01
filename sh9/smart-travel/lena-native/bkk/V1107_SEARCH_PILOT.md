# SH9 Léna BKK · v1107 keresési és My Trips pilot

**Státusz 2026-11-01:** elkészült a Smart Trip AI külön választható BKK-próbamódja. GitHub Actions **44/44 teszt sikeres**. Élő Samsung telefonos és valós családi Supabase-fiókkal végzett end-to-end teszt **még nem történt**, ezért az éles funkcionális tesztet nem nyilváníthatjuk késznek.

## Mobil teszt

[Nyisd meg a Smart Trip AI-t](https://zsoltandmonika-cloud.github.io/berlet-app/sh9/smart-travel/public-transport/smart-trip/?v=1107).

1. **Keresőmotor** → **🚌 Léna BKK · hiteles menetrend (próba)**. Az alapértelmezett **✨ Léna · ChatGPT** változatlan.
2. Mindkét helyhez írj legalább két betűt, majd **válassz a BKK hivatalos megállólistájából**. Cím, épület, lakcím és nem pontos megállónév itt nem használható. A megállókeresés nem küld külön Google/Photon kérést.
3. Dátum és időpont: a BKK által lefedett nap (az aktuális feed érvényességi idején belül); választhatsz indulás vagy érkezés alapján.
4. **Útvonal keresése** → legfeljebb öt, menetrendileg igazolt **közvetlen, egyjáratos** lehetőség járatszámmal, indulási/érkezési idővel és pontos megállókkal. „Nem élő” címke kötelező.
5. **💾 Mentés My Tripsbe** csak a kiválasztott találat saját gombjával. Supabase Auth user JWT + \`hh_profile_access\` + RLS jogosultság szükséges; ismételt mentés nem írja felül a csillagokat / jegyeket / követési adatokat. Siker után a privát My Trips oldal nyílik meg.
6. Mónika és Zsolt profilját külön ellenőrizd; egy hiányzó jogosultság vagy időközbeni profilváltás **nem írhat az archívumba**.

## Garantált korlátok

- A jelenlegi feed csak a 17, 19, 41 és 260-as járat hivatalos **statikus BKK GTFS** adatait tartalmazza.
- Egyetlen közvetlen járatot tervez, **nem** teljes ajtótól ajtóig multimodális útvonalat. Nincs gyaloglás- vagy átszállás-becslés, MÁV, Volán, BKK-FUTÁR real-time, követési azonosító, dinamikus terelés, jegyvásárlás.
- Az adatok forrása **BKK Zrt., CC BY 4.0**, és minden letöltéskor kötelező a friss manifest, SHA-256 és tényleges GTFS érvényesség. A menetrendi nap eltérését mindig ellenőrizni kell.
- Ha a feed lejárt, vagy a felhasználó nem pontos megállót ír be, nincs találat és nincs mentés. A szolgáltató indulási/érkezési idejét nem találgatjuk.
- Keresés max. 10 alkalom/oldalbetöltés; nincs háttérpolling, nincs fizetős API és OpenAI API-kulcs a böngészőben.
- **A mentés nem automatikusan minden keresés után történik**, hanem a felhasználó kifejezett jóváhagyása után, gombnyomásra.

## Forráskód, teszt

- UI: \`sh9/smart-travel/public-transport/smart-trip/smart-trip-ai-v1022.js\`
- Hitelesített BKK keresés, jogosultsághoz kötött mentés: \`sh9/smart-travel/public-transport/smart-trip/smart-trip-bkk-v1107.mjs\`
- BKK adat: \`sh9/smart-travel/lena-native/bkk/data/bkk-selected-routes-v1106.json\`
- SHA-256 manifest: \`sh9/smart-travel/lena-native/bkk/data/bkk-feed-manifest-v1106.json\`
- Regessziós tesztek: \`healthhub/tests/sh9-bkk-live-handover-v1107.test.mjs\` és v1105/v1106/ChatGPT-default/My Trips golden.
- [GitHub Actions v1107 sikeres 44/44 futás](https://github.com/zsoltandmonika-cloud/berlet-app/actions/runs/41327993714).

## Következő élesítési kapu

Egy valós bejelentkezett Samsung S24 Ultra készüléken ellenőrizni kell a menetrend megnyitását és a mentés kijelzését; majd másik készüléken a privát My Trips szinkront. Csak ezután jelölhető a felhasználói folyamat élesnek.

**Rollback:** az új mód választható; a korábbi ChatGPT alapértelmezett, My Trips v1100, a v1104 költségzár és a v1106 automatikus BKK-adatfrissítés változatlan.
