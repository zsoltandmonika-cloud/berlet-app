# Smart Lunch v1179 – egyszeri Microsoft Outlook Bridge aktiválás

**Státusz:** backend, privát tárolás és 2 óránkénti Supabase Cron telepítve.
**Nem aktív a postafiók olvasása**, amíg a Microsoft-alkalmazás és az egyszeri engedélyezés nincs meg.

## 1. Microsoft Entra App Registration
- Nyisd meg: https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
- Meglévő, személyes Outlook-fiókot támogató saját alkalmazás használható, vagy új `HealthHub Interfood Smart Lunch` alkalmazás regisztrálható.
- Supported account types: **Personal Microsoft accounts** (vagy organizational + personal).
- Authentication > Add platform > **Web**. Redirect URI pontosan:
  `https://vhsrupphzcjkdrusonzh.supabase.co/functions/v1/hh-interfood-outlook-bridge-v1179`
- API permissions > Microsoft Graph > Delegated: **Mail.Read**, **User.Read**; bejelentkezéskor `offline_access`.
  **Mail.Read a postafiók teljes olvasására jogosít**, bár a HealthHub kódja kizárólag az Inbox / Interfood Rendelések almappát dolgozza fel.
- Certificates & secrets > New client secret. A **Value** mezőt csak közvetlenül a Supabase Secret-be másold, soha ne ebbe a GitHub repóba, ChatGPT-beszélgetésbe vagy böngésző localStorage-ba.

## 2. Supabase Edge Function Secrets
Projekt: `HealthHub-Core` (`vhsrupphzcjkdrusonzh`).
Dashboard: https://supabase.com/dashboard/project/vhsrupphzcjkdrusonzh/settings/functions

Négy **szerveroldali** kulcs:
- `HH_IF_MS_CLIENT_ID` = Microsoft Application (client) ID
- `HH_IF_MS_CLIENT_SECRET` = Microsoft client secret **Value** (nem a secret ID)
- `HH_IF_MS_EXPECTED_ACCOUNT` = a HealthHub shared Outlook-postafiókjának címe
- `HH_IF_AES_KEY_B64` = 32 kriptográfiailag véletlen byte Base64 formában (kulcs kizárólag szerveroldalon)

Windows PowerShellben új AES kulcs létrehozása:
```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```
Az értéket közvetlenül a Supabase Secrets mezőbe kell beilleszteni.

**A Supabase Service Role key, AES kulcs vagy Microsoft secret soha nem kerül az alkalmazás frontendjébe.**

## 3. Egyszeri Microsoft-engedélyezés
1. Nyisd meg: https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/nutrition/
2. Válaszd Mónika profilt. A Health Vaultba történő bejelentkezés szükséges a személyes megrendelések olvasásához.
3. Az Interfood csempe alatti `Outlook összekötése` gombot választva jelentkezz be a **shared Outlook** postafiókba, majd engedélyezd a Mail.Read hozzáférést.
4. A szerver ellenőrzi a postafiók azonosságát és az **Inbox / Interfood Rendelések** pontos almappát. A frissítő token AES-GCM titkosítással kerül a privát Supabase táblába.
5. A HealthHub az eredeti e-mailből kizárólag dátumot, ételkódot, nevet, darabszámot és adagonkénti tápértéket dolgoz fel. A hivatalos Interfood kép csak pontos, név+nap+kód+négy makró egyezés esetén kapcsolódik.

## Működés
- Supabase Cron: `hh-interfood-outlook-bridge-v1179`, **kétóránként**.
- A napi kártya a Bevitel oldalon, az **Interfood Premium** alatt jelenik meg, amikor a szerver által igazolt rendelés beérkezik Mónika profiljába.
- A napi naplózás csak Mónika `Igen!` érintésekor történik; az 1–5 csillag teljesen opcionális.
- A Dropbox Nutrition napló marad a kártyák és fogyasztási döntések eredeti felhő-adatforrása. A Supabase csak az Outlook-ból visszaigazolt étel-pillanatképeket tárolja.
- Az e-mail teljes tartalma, szállítási cím, telefonszám, vevőazonosító **nem kerül** a szerver tábláiba vagy GitHubba.

## Biztonságos hibakezelés
- Microsoft jogosultság hiányában vagy rossz postafiókkal: nincs aktiválás.
- Hiányzó vagy nem egyértelmű `Interfood Rendelések` almappa: nincs aktiválás.
- Ételadat- vagy képpárosítási bizonytalanságnál: nincs kitalált tápérték vagy idegen fotó.
- A meglévő kártyák változatlanok maradnak, amíg a kapcsolat nincs aktiválva.
