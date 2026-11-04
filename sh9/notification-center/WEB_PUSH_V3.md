# SHO Web Push v3 · Android PWA Pilot

## Első kör – csak felhasználói jóváhagyás után
- A Notification Center **Beállítások** lapján egy új Android háttérértesítés kártya.
- `Támogatás ellenőrzése`: böngésző / Family Guard bejelentkezés / push kiszolgáló ellenőrzése, **engedély kérés nélkül**.
- `Bekapcsolás`: Android böngészőértesítési engedélykérés kizárólag gombnyomásból; PWA Service Worker és VAPID-előfizetés.
- `Próba küldése`: a szerver maximum öt, ugyanazon bejelentkezett felhasználóhoz és kiválasztott profilhoz regisztrált aktív eszközre küld semleges SHO-tesztüzenetet. 60 másodperces tesztkorlát.
- `Kikapcsolás`: kizárólag az aktív profilhoz rendelt eszközregisztráció törlése. A másik profil készülékét nem szabad érinteni.
- `sh9/sw.js`: a **meglévő**, azonos scope-ú PWA Worker új `push` és `notificationclick` eseményekkel. Nincs második Worker, külön Android APK vagy külső push SDK.
- A zárolt képernyőre csak fix, általános tesztszöveg kerül. **Sem feladattartalom, sem gyógyszer, sem pulzus, sem helyadat** nem jelenik meg.
- A push üzenetre kattintva a Notification Center nyílik meg. A push szerver és a SW nem kap automatikusan betegadatot.

## Biztonság
- Kizárólag meglévő, valódi Supabase Auth felhasználó és az `hh_profile_access` táblában engedélyezett profil.
- Az eszköz push endpointja titkos capability-URL; a Postgres mindkét új tábláján RLS és `revoke ... public, anon, authenticated`. A VAPID privát kulcs csak Edge-szerveroldalon, service role útján elérhető.
- A szerver kizárólag ellenőrzött https push szolgáltató-doméneket fogad el (SSRF védelem). Nem fogad egyedi értesítési szöveget a böngészőtől.
- Első pilotban a VAPID private key zárt, RLS-sel elválasztott adatbázistáblában van. Nagyobb, éles környezet előtt Supabase Vault/secret kezelésre érdemes átállítani és auditálni.
- A meglévő `hh_family_task_events`, HealthHub és Family Guard táblákat **nem módosítja**.
- A Supabase Edge Function `sho-webpush-v3` a már meglévő HealthHub-Core projektben `verify_jwt=true` módban működik.
- A GitHub Pages oldalon **nincs privát VAPID kulcs vagy service role**.

## Első valódi, bezárt alkalmazásos teszt
1. Galaxy S24 Ultrán a SHO Notification Center → Beállítások → Android háttérértesítések; Family Guard bejelentkezés szükséges.
2. Bekapcsolás, engedély megadása, regisztráció ellenőrzése.
3. Külön, azonos jogosultsággal bejelentkezett böngészőn regisztrálni egy második végpontot.
4. Telefonon SHO bezárása; második eszközön az azonos profil alatt `Próba küldése`.
5. Androidon a rendszerértesítés megérkezik, és megnyomva a Notification Center nyílik meg.
6. Kikapcsolás után nem érkezhet több teszt. Zsolt/Mónika függetlenek.

## Nincs még kész
- Valódi Feladatok/SportCentral események automatikus háttérküldése, ütemezés, értesítési előzmények szinkronja.
- HealthHub orvosi és szenzoralapú push: külön jogosultsági, biztonsági és frissességi ellenőrzés után.
- Android rendszerhang az eszköz webhelycsatornáján állítható, az alkalmazásban lévő halk két hangos ding ettől független.
- Edge Android/PWA támogatás a tényleges telepítési mód és energiatakarékosság függvénye, ezért fizikai telefonos teszt kötelező.

## Üzembe helyezés
A migráció az `supabase/migrations/20261104083000_sho_web_push_v3_pilot.sql` fájlban,
a backend kód `supabase/functions/sho-webpush-v3/index.ts` alatt található.
Előbb az izolált migrációt, utána a `verify_jwt=true` Edge Functiont kell telepíteni.
Kipróbált Service Worker funkció nélkül a felület nem jelent sikeres regisztrációt.
