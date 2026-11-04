# SHO Notification Center v1 · bővíthető alap

## Elérhetőség
- Élesítés után: `/berlet-app/sh9/notification-center/`.
- A meglévő értesítési harang / alsó értesítési gomb nyitja meg.
- Nincs külön új launcher-csempe, a SHO 4×3 rács változatlan.
- Zsolt `hh-profile=z`, Mónika `hh-profile=m` (helyi profilválasztás).

## Állapot: UI + helyi adapter, nem élő üzenetküldő backend
- 7 előregisztrált modul és alkategóriák, felhasználónként állítható típusok / küszöbértékek / figyelmeztetési időpontok.
- A beállítások és **nem érzékeny** próbaértesítések böngésző-localStorage-ban vannak. Nincs két eszköz közötti szinkron, garantált kézbesítés, Android/Web Push, autentikált adatbázis vagy időzítési munkafolyamat.
- HealthHub/Alvás érzékeny eseményei csak *definíciók*: a helyi `publish()` szándékosan elutasítja őket.
- A telefon böngészőjében a saját kliensoldali események megjelennek, de a felület nem figyeli automatikusan a pulzust, alvást vagy sportműsort.
- A harang pirosan, 1,5 másodperces **lassú pulzussal** jelez az új, nem megnyitott értesítésre; az értesítési oldal megnyitása csak az animációt állítja meg. Az olvasatlanságot külön jelölés kezeli.

## Új modul integrációs szerződés
A `/berlet-app/sh9/notification-center/notification-core-v1.js` fájlt a Golden Standard alsó nav minden oldalra egyszer betölti. Az új modul **manifestjét regisztrálni kell**; az új elem ezután az oldalon automatikusan megjelenik és eszközönként megmarad. A modulnak az események tényleges előállítását és a jogosultságokat külön kell megvalósítania.

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
