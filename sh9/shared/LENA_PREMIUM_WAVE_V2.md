# Léna Premium Wave V2 · SHO Golden Standard

**Benchmark:** a felhasználó által jóváhagyott **HealthHub Sleep v1173**, 2026-11-19. A hullám **byte-azonosan** a Sleep v1173 `hhSleepTop:after` SVG-forrásából származik, a kártyák a v1173 mély, fénylő üvegperemeinek mintáját követik.

## Kiadási kör: 8 SHO főfelület + 3 fontos aloldal + 2 egészség/biztonsági adapter

| Felület | Hol alkalmazódik | Mit nem módosít |
|---|---|---|
| SHO kezdőlap | `sh9/index.html` | eredeti hero, 12 csempe, elrendezés, 5 navgomb, OTA |
| Smart Travel | `sh9/smart-travel/index.html` | helyek, órák, utazási linkek |
| Smart Shopping | `sh9/shopping/index.html` | termékfotók, listák, kosárgombok és árak |
| Sport Central | `sh9/sport/index.html` | beágyazott MecsRadar tartalma és navigáció |
| Smart Valet | `sh9/wallet/index.html` | privát iratok, PIN, jegy/kártya nézet |
| Entertainment | `sh9/entertainment/index.html` | képanyag, mozi/kulturális tartalom és carousel |
| Family Tasks | `sh9/family-hub/index.html` | feladatállapotok, hangbevitel, bejelentkezés |
| Nutrition | `healthhub/nutrition/index.html` | valós étel-, víz- és makróadatok; scanner |
| Notification Center | `sh9/notification-center/index.html` | értesítések, hangjelzések, kapcsolók |
| My Trips | `sh9/smart-travel/my-trips/index.html` | mentett utak, privát jegyek, dokumentumolvasó |
| Book Studio | `sh9/entertainment/book-studio/index.html` | eredeti könyvespolc és borítók, EPUB/PDF olvasó |
| Aktivitás | `healthhub/skins/activity-lena-benchmark-v2.css` | HC/Samsung adatok, meglévő V1 fallback |
| Family Guard | `healthhub/guardian/guardian-lena-benchmark-v1184.css` | **jóváhagyott v1182 státuszpanel**, GPS, térkép |

A már elkészült **Sleep v1173** az etalon és érintetlen marad.

## Működés és rollback

A tizenegy SHO belépési oldal mind saját maga iratkozik fel az opt-in témára:
```html
<body data-lp-v2="on" data-lp-module="launcher">
```
A `sh9/shared/lena-premium-wave-v2.css` csak a feliratkozott útvonalakat és az adott modul dokumentált DOM osztályait célozza. Nincs globális CSS átírás vagy változás a korábbi navigációs/üzleti logikában.

A `sh9/shared/lena-premium-wave-v2.js` kizárólag a **vizuális profilpalettát** választja a már meglévő profilállapot alapján, `data-lpv-owner="m"|"z"`. Nem ír tárolót és nem kér le adatot.

Visszaállítás modulonként: a két V2 asset-link és a `data-lp-v2` attribútum eltávolítása a kiválasztott belépési oldalból. Az Aktivitásnál a V2 CSS lusta betöltése törölhető a már meglévő `activity-premium-glass-v533.js` fájlból; a V1 továbbra is működik. Family Guardnál a v1184 utolsó stíluslink törlésével visszaáll a v1183, a jóváhagyott státuszpanel érintetlen.

## Kötelező ellenőrzések

```bash
node --test sh9/tests/lena-premium-wave-v2.test.cjs healthhub/skins/tests/activity-lena-premium.test.cjs healthhub/tests/guardian-lena-premium-lower-v1183.test.cjs
```

A célzott tesztek ellenőrzik az eredeti 12 SHO csempét, az SVG-hullámazonosságot, a két profil színeit, a stílusok szigorú felülethez kötését és a 4+5 Aktivitás-mérőcsempe változatlan adatforrásait.

**A CSS-tesztek nem helyettesítik a valódi telefonos vizuális ellenőrzést.** Kiadás után Mónika és Zsolt S24 Ultra készülékén ellenőrizni kell a szövegek olvashatóságát, a hit targeteket, az állapotjelzések színeit, és a scroll/keyboard működését, különösen a Shopping/Nutrition hosszú listáinál és a Wallet iratkártyáinál.

**Korlát:** ez a közös **SHO főmodulok és három fontos aloldal V2 vizuális rolloutja**, nem írja át automatikusan az összes aloldalt vagy beágyazott harmadik fél alkalmazást. Más aloldalakhoz külön, azonos elvre épülő vizuális adapter szükséges.
