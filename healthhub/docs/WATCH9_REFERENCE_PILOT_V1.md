# HealthHub / SH9 Wearables · Watch9 FIRST · 2026-11-03

## Rögzített döntés
- Referencia: **Mónika Galaxy Watch9 40 mm LTE/eSIM + Galaxy S24 Ultra**.
- Kompatibilitási teszt: **Zsolt Galaxy Watch5 Pro LTE/eSIM + Galaxy S24 Ultra**.
- A Watch9 új funkciói nem korlátozhatók a Watch5 Pro szenzorképességeire.
- A párosítás, az elérhetőség, a történeti adat és a valós szenzormérés külön fogalom.
- Csak az izolált pilotágban fejlesztünk; az EDDIG A LEGJOBB backup és a main változatlan.

## Ami már elkészült a külön pilotágon
1. A HH One natív beállításaiban külön kézi, helyi, read-only tesztgomb: párosított Bluetooth-névlista és hat HC kategória (pulzus, SpO₂, nyugalmi pulzus, alvás, edzés, VO₂ max).
2. Egészségadatnál egyéni időbélyeg, forráscsomag, frissességi jelzés; jogosultság vagy mérés hiányában nincs kitalált adat.
3. Külön Watch9-prioritású képességlista és Watch5 Pro fallback.
4. Nincs új GPS, Dropbox/Supabase-írás, háttér-polling, OTA, vagy folyamatos órás szenzorhasználat.

## Tervezett képességek és kapuk
| Funkció | Watch9 | Watch5 Pro | Adatút |
| --- | --- | --- | --- |
| Pulzus, SpO₂, RHR legutóbbi érték | Prioritás | Tesztelhető | Health Connect / Samsung Health |
| Alvás, aktivitás, edzés | Prioritás | Tesztelhető | Health Connect |
| Óra-akkumulátor, töltés, utolsó hiteles jel | Prioritás | Tesztelhető | Wear OS app + Data Layer |
| Wi-Fi/LTE működés Bluetooth nélkül | Későbbi próba | Későbbi próba | Valós Data Layer mérés |
| Pulzus/IBI szenzorstream | Prioritás | Feltételes | Órás Health Services vagy Samsung Sensor SDK |
| Bőrhőmérséklet (nem testmaghő) | Prioritás | Feltételes | Samsung Sensor SDK |
| **EDA** | **Watch9 extra** | Nem | Samsung Sensor SDK, Watch8+ |
| **MF-BIA** | **Watch9 extra** | Nem | Samsung Sensor SDK, Watch8+, on-demand |
| SpO₂, EKG, BIA on-demand | Tesztelendő | Feltételes | Samsung Sensor SDK, engedélyek |
| Energy Score, apnoé / ritmusértesítések | Tervezett, csak ha hozzáférhető | Forrásfüggő | Samsung Health Data SDK, jogi/regionális kapuk |

## Kötelező release gate-ek
1. Helyi HC/BT adatlekérés tesztje Watch9 + Watch5 Pro telefonon; modellek nem állíthatók biztosra pusztán Bluetooth név alapján.
2. Samsung Health Sensor Service capability lekérdezés és külön szenzorengedély; csak támogatott tracker indulhat.
3. Wear OS app + Android fogadó azonos csomagnévvel és aláírással, opt-in; nem kerül közvetlenül éles appba.
4. Watch9-specifikus EDA és MF-BIA csak valós Watch9 próbával; Watch5 Pro esetén NEM TÁMOGATOTT.
5. Battery/kapcsolat esetében a szenzorjelentés timestamp + profil + TTL, elveszett jel esetén UNKNOWN/STALE.
6. Akkumulátor-fogyasztás és LTE fallback ellenőrzése két valós telefonon.
7. Signed release/OTA csak külön jóváhagyással, regressziós tesztek után.

## Biztonság, korlátok
- A Data Layer telefon ↔ óra adatút Google szervereken át is közlekedhet, titkosítva; külön hozzájárulás kell.
- Pulzus és bőrhőmérséklet lehet periodikus stream, de folyamatos SpO₂/EKG tilos: csak explicit on-demand.
- Wellness jelzések nem diagnosztikai riasztások; nem váltják ki a meglévő szívgyógyászati ellátást.
- Health Connect sourcePackage mezője nem bizonyítja, hogy a mérés konkrét Watch9-ről származik.
- Nem gyűjtünk MAC-címet, helyet vagy szenzorfolyamot hozzájárulás nélkül.
- Nincs felhőbe feltöltés, nincs éles adatírás a jelenlegi pilotban.

## Hivatalos források
- https://www.samsung.com/hu/watches/galaxy-watch/galaxy-watch9-40mm-graphite-lte-sm-l345fzkaeue/
- https://developer.samsung.com/health/sensor/guide/data-specifications.html
- https://developer.samsung.com/health/data/overview.html
- https://developer.android.com/training/wearables/data/overview
