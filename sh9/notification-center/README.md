# SHO Notification Center v1 · bővíthető alap

## Elérhetőség
- Élesítés után: `/berlet-app/sh9/notification-center/`.
- Első ütemben a SHO főoldalának harangja nyitja meg. Más modulok jelenlegi értesítési felületei megmaradnak.
- Nincs külön új launcher-csempe, a SHO 4×3 rács változatlan.
- Zsolt `hh-profile=z`, Mónika `hh-profile=m` (helyi profilválasztás).

## Állapot: UI + helyi adapter, nem élő üzenetküldő backend
- 7 előregisztrált modul és alkategóriák, felhasználónként állítható típusok / küszöbértékek / figyelmeztetési időpontok.
- A beállítások és **nem érzékeny** próbaértesítések böngésző-localStorage-ban vannak. Nincs két eszköz közötti szinkron, garantált kézbesítés, Android/Web Push, autentikált adatbázis vagy időzítési munkafolyamat.
- HealthHub/Alvás érzékeny eseményei csak *definíciók*: a helyi `publish()` szándékosan elutasítja őket.
- A telefon böngészőjében a saját kliensoldali események megjelennek, de a felület nem figyeli automatikusan a pulzust, alvást vagy sportműsort.
- A harang pirosan, 1,5 másodperces **lassú pulzussal** jelez az új, nem megnyitott értesítésre; az értesítési oldal megnyitása csak az animációt állítja meg. Az olvasatlanságot külön jelölés kezeli.

## Új modul integrációs szerződés
A `/berlet-app/sh9/notification-center/notification-core-v1.js` fájlt a SHO főoldal, a SHO előnézet és a Notification Center használja. Más modulok csatlakoztatása későbbi fejlesztési ütem. Az új modul **manifestjét regisztrálni kell**; az új elem ezután az oldalon automatikusan megjelenik és eszközönként megmarad. A modulnak az események tényleges előállítását és a jogosultságokat külön kell megvalósítania.

```js
const hub = window.SHO_NOTIFICATION_CORE_V1;
hub.registerModule({
  id: 'garden',
  name: { hu: 'Kert', en: 'Garden' },
  icon: 'leaf',
  events: [{
    key: 'watering',
    group: { hu: 'Növényápolás', en: 'Plant care' },
    name: { hu: 'Locsolási emlékeztető', en: 'Water reminder' },
    settings: [{key:'leadMinutes',kind:'select',options:[15,30,60],default:30,unit:'perc'}]
  }]
});
const event = hub.publish({
  profile: 'z', type: 'garden.watering',
  title: 'Locsolási emlékeztető',
  message: 'A növények ellenőrzése esedékes.',
  dedupeKey: 'garden:watering:2026-11-04',
  targetUrl: '/berlet-app/sh9/'
});
```

### Adatformátum
- A `type` az `<module-id>.<event-key>` azonosító.
- `profile`: `z` / `m` vagy `zsolt` / `monika`.
- `registerModule` helyi regisztráció és megjelenítés. A modul belső adatforrásának hitelesítése a modul felelőssége.
- `publish` a v1-ben legfeljebb 80 nem érzékeny elemet tárol profilonként; olvasott/megnyitott állapot független.
- `targetUrl` kizárólag azonos eredetű, `/berlet-app/` alatti webhelyet enged.
- `registerModule` nem írhatja felül a beépített modulokat.
- A profilválasztás nem felhasználó-hitelesítés. Ezen kliensoldali adapterrel **nem szabad egészségügyi vagy bizalmas részleteket tárolni**.

## Következő fázis éles adatokhoz
Hitelesített Supabase-adatmodell, profiljogosultságok / RLS, szabálymotor, idempotens események és kézbesítési napló, ütemezés, Web Push opt-in, Android- és óraoldali kézbesítés. Az egészségügyi értesítésekhez biztonságos, megfelelő frissességű és engedélyezett mérési forrás szükséges.

## v2: halk értesítési hang + értesítések törlése
- `Beállítások → Értesítési harangszó`: ON/OFF profilfüggően, helyben mentve; külön `Hang tesztelése` gomb.
- A halk, két tónusú harangszó kizárólag frissen fogadott, nem érzékeny és az aktív profilhoz tartozó értesítésnél szólhat, ha a SHO nyitva van, a böngésző már kapott felhasználói érintést, és a hang nincs kikapcsolva.
- Oldalbetöltés, olvasás, beállításváltoztatás, korábbi elemek visszatöltése, másik profil értesítése vagy gyors duplikált eseménysorozat nem indít új hangot. Mobil böngészők audio-szabályai a lejátszást korlátozhatják.
- A vizuális piros harang és a számláló hang nélkül is működik.
- `Legutóbbi értesítések`: kártyánkénti kuka, `Olvasottak törlése`, `Összes törlése` megerősítéssel. Minden művelet csak az aktív profil böngészőhelyi értesítéseire vonatkozik.
- Ez **nem** Android/Web Push háttérértesítés: ahhoz még hitelesített háttérküldés, Service Worker és értesítési engedély szükséges.

## Golden Standard v4 · értesítés → modul → konkrét esemény
- A Notification Centerben **minden ismert modulhoz tartozó értesítési kártyára** kattintva a megfelelő SHO-modul nyílik meg. Az olvasottá jelölés továbbra is megtörténik. A kuka ikon külön kattintható és **nem navigál**.
- Ha az esemény adatküldője megadja a pontos, biztonságos `targetUrl` címet, az kap elsőbbséget. Csak **azonos webhelyen belüli, az értesítés típusához tartozó modulútvonalak** elfogadhatók. Ismeretlen, külső vagy más modulra mutató link helyett a saját modul főoldala nyílik.
- `tasks.new`, `tasks.due`, `tasks.completed` esetén az opcionális, érvényes UUID `taskId` automatikusan a már támogatott `/berlet-app/sh9/family-hub/?task=<uuid>` címre mutat, a megfelelő feladatot emelve ki.
- Modul fallbackek: HealthHub → `/healthhub/`; Sleep → `/healthhub/?sho=sleep`; SportCentral → `/sh9/sport/`; Smart Trip → `/sh9/smart-travel/`; Feladatok → `/sh9/family-hub/`; Smart Valet → `/sh9/?sho=wallet`; Family Guard → `/healthhub/guardian/` (mindegyik a `/berlet-app` prefixszel).
- A SportCentral a MecsRadar alkalmazást jelenleg iframe-ben használja. A konkrét mérkőzés megnyitásához **külön, a MecsRadarban ténylegesen támogatott deep link szükséges**; ezt a kód nem találja ki. Célhivatkozás nélkül a SportCentral modul nyílik meg.
- Az Android Push v3 általános tesztüzenete továbbra is a Notification Centerbe vezet. Az önálló modulok által ténylegesen létrehozott értesítéseket még külön csatlakoztatni kell; a v4 kizárólag a kattintási navigációt egységesíti.
- Régi, `targetUrl` nélküli értesítések is megnyithatók, nincsen adatmigráció, nincs módosítás a Supabase táblákon vagy a már működő Android Push szerveren.

Példa a meglévő publikációs API használatára (a `taskId` az adatforrásból származó valós UUID):
```js
window.SHO_NOTIFICATION_CORE_V1.publish({
  profile: 'z', type: 'tasks.new',
  title: 'Új családi feladat',
  taskId: task.id,
  dedupeKey: 'task-'+task.id
});
```
