# SHO Smart Taxi · pixel-perfect design v1 · 2026-11-19

A megjelenés a felhasználó által jóváhagyott **1193 × 1319 px** képet használja változtatás nélkül, külön átlátszó hitbox gombokkal. A kép nincs újragenerálva vagy CSS-sel módosítva. A taxi/ modul az SH9 Smart Travel Taxi csempéjéből érhető el.

- A négy rendelésgomb Androidon a telepített alkalmazást próbálja megnyitni (Főtaxi, Bolt, City Taxi), illetve az Uber webes foglalását nyitja meg. Nem rendel taxit automatikusan.
- A díjszabás a Főtaxi 2026. augusztus 1-jétől közzétett budapesti adatai alapján: alapdíj 1300 Ft, 520 Ft/km, 130 Ft/perc, reptéri alapdíj 2100 Ft.
- A kalkulátor **kézzel megadott** km- és lassúhaladási idő alapján **becslést** ad. Nem valós idejű forgalmi vagy útvonal API, nem helyettesíti a taxamétert. A kezdőérték (8 km, 5 perc) csak példa.
- Valós Samsung böngészőn appátadás és a képes overlay érintési teszt még szükséges. Ha egy Android böngésző nem kezeli az Intent URL-t, az alkalmazás hivatalos Play Áruház oldala a fallback.

### Hivatalos források
- https://fotaxi.hu/hirek/tarifaemeles/
- https://fotaxi.hu/gyik/
- https://play.google.com/store/apps/details?id=com.nerddevelopments.taxidriver.orderapp
- https://play.google.com/store/apps/details?id=ee.mtakso.client
- https://play.google.com/store/apps/details?id=com.qualysoft.cityTaxi
- https://m.uber.com/
