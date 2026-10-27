# SH9 Family Hub / Family Tasks v880 · 30 napos Family Logbook

**Cél:** egyszerű, mobil-first, Premium Glass, kétprofilos családi feladatkezelő hiteles, visszakereshető eseménynaplóval.
A Logbook **nem** önálló főmodul, hanem a Family Hub > Family Tasks nézete. Későbbi Family Chat ugyanebben a Family Hub modulban bővíthető, de a v880-ban nem része.

## A felhasználói történet
Mónika létrehozza: „Virágok meglocsolása”, felelős Zsolt, holnapra. Buddy értesíti Zsoltot. Zsolt Folyamatbanra, később Készre állítja. Egy hét múlva a „virág” keresés visszaadja a létrehozást, kiosztást, változtatásokat időbélyeggel és a szereplők profiljával.

## Felület, két érintésre hangolva
- Hero: diszkrét számozott Buddy/emlékeztető ikon; tap megnyitja a Family Tasks modult.
- Felső szűrősor: **Feladataim · Kiadott · Logbook (30 nap)**. Ugyanaz az SH9 Golden Glass arculat, Zsolt kék és Mónika pink tónus.
- Logbook: fordított időrend, ma/tegnap/korábbi napok, előzménykártya rövid mondatokkal. Példa: „Okt. 19. 17:42 · Mónika → Zsolt · Virágok meglocsolása · Kiosztva”.
- Keresés: feladatcím szövege, dátumtartomány (utolsó 30 nap), családtag, eseménytípus. Profilfotók a már jóváhagyott avatar assetből.
- Esemény részlete: korábbi/új assignee, korábbi/új RAG státusz, korábbi/új határidő, létrehozás és befejezés ideje. Az eseménynapló csak olvasható, nem szerkeszthető.
- A szerkeszthető FELADAT és az append-only TÖRTÉNET külön álljon: feladatátírás nem módosít korábbi naplóbejegyzést.
- Kategória görgethető; magyar prediktív typing a Samsung billentyűzeten és szerkeszthető hangdiktálás; feladat csak címmezővel létrehozható, tulajdonos alapból aktív profil.
- RAG: még nem kezdte / folyamatban / kész. Állapotváltás és egyéb események Buddy-értesítést hoznak a címzettnél, ha az alkalmazás fut. Lezárt telefonra push külön Android-integráció.
- 30 napos történet nézet **nem** jelenti a nyitott feladat automatikus törlését. A régebbi audit sorok fizikai retention-jéről külön adatvédelmi döntés szükséges.

## Tartós adatok és kis fogyasztás
- Tároló: `public.hh_family_tasks` + `public.hh_family_task_events`. Az eseménykártyák kizárólag változáskor keletkeznek, nem GPS-hez hasonló időzítve. Az esemény külön `title_snapshot`, `actor_user_id`, `actor_profile`, `recipient_profile`, `status_before/after`, `assignee_before/after`, `due_before/after`, `created_at` adatot tart.
- Mindig korlátozott olvasás: `created_at >= now() - interval '30 days'`, rendezés `created_at desc, id desc`, oldalanként pl. 30 sor, későbbi oldalak csak kérésre. Cache/per-tab dedup, nincs 3 s polling.
- Azonos családi fiókjogosultságok esetén egy kiválasztott profilnév nem erős bizonyíték arra, hogy fizikailag ki nyomta meg a gombot. Auditban a hitelesített `actor_user_id` a technikailag bizonyítható szereplő. Szóbeli beszélgetést a Logbook nem rekonstruál.
- A szöveges események várhatóan jóval kisebbek a képeknél, de tényleges Supabase egress/DB-size csak élő méréssel igazolható.
- Csak bejelentkezett jogosult háztartási felhasználóknak elérhető, RLS, nem publikus napló. A feladatok és a személyes egészségügyi adatok teljesen külön.
- Az események INSERT/UPDATE/DELETE jogosultsága böngészőből nincs; a trigger hozza létre. Mobilos elfogadási teszt két készülékkel.

## Acceptance
1. Mónika saját feladat, egy érintéssel Zsolthoz rendelhető, létrehozás és assignment megjelenik naplóban.
2. Zsolt átállítja: teendő → folyamatban → kész; pontos idő és előtte/utána látható. Újbóli módosítás sem írja felül a korábbi eseményt.
3. 7+ nap múlva a „virág” kulcsszóval előkereshető a teljes történet; 30 napon kívüli nem jelenik meg a normál nézetben.
4. Minden átadás/állapotváltozás egyetlen Realtime eseményt szolgáltat, nincs duplikált felugró értesítés tabváltáskor.
5. Anon kliens nem látja a feladatot/naplót; jogosultság változásakor újraellenőrzés; nincsenek titkos kulcsok a böngészőben.
6. SH9 3×3 főmodul és Golden Standard dock változatlan, külön kilencedik/tizedik főcsempét nem adunk hozzá.
