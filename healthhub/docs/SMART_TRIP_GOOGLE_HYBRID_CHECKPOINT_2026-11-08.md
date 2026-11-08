# Smart Trip AI · Google-Based Hybrid Engine — checkpoint (2026-11-08)

## Állapot
- Külön V5 Google Routes pilot: három valódi tömegközlekedési lekérdezés sikeresen lefutott, teljes tesztoldali válaszidő **1,60 mp**. A teljes Google-alapú hibrid motor **még nem kész**, az éles Smart Trip UX-be még nincs integrálva.
- Tesztoldal: `sh9/smart-travel/public-transport/smart-trip/v5/real-test/index.html`.
- Supabase: `hh-smart-trip-real-pilot-v1` aktív v4 (2026-11-08); a külön eredeti `hh-smart-trip-routes-v1` továbbra is **hard-OFF**.
- Működő BKK, MÁV, Volán keresők változatlanul hagyandók; nincs Google-adat → AI továbbítás. A Google-találatokból képzett Léna A-jelölt csak **előzetes**, független menetrendi validálás nélkül.
- Korábbi 503/RPC, beragadt gomb és 429 extra kvótafoglalás hibák kijavítva. PR #800, #802. Elutasított pilot újrapróba nem foglal újabb kvótát.
- A Google Routes kereső A-jelöltjének rangsorolása kezeli a gyaloglás után fennmaradó átszállási tartalékot, az érvénytelen menetrendi időket és az utolsó gyaloglást. PR #801.

## Usage Report (kész)
- A meglévő `healthhub/usage-control/index.html` Usage Control Center kapott egy Google Routes / Smart Trip AI havi keretfigyelő panelt.
- `healthhub/usage-control/google-routes-usage-v881.js`; jogosultság-ellenőrzött, kizárólag olvasó `hh-smart-trip-usage-v881` Supabase Edge Function v1 ACTIVE.
- Kézzel frissíthető napi/havi Supabase kvótafoglalás, használat vs belső keret, %, hátralévő, progress bar és CSV export. PR #803 merged, három célzott CI sikeres.
- 2026-11-08 referencia: **4/200 havi foglalás**, ebből 3 tényleges Google-kérés és 1 korábbi, hibás többletfoglalás. Belső napi korlát 20, havi 200; külön V5 pilot napi egyszeri tesztre korlátozott.
- A **Supabase kvótafoglalás nem azonos a Google számlázott kéréssel**. A Google Billing SKU és valódi USD-költség NEM MÉRT; Essentials/Pro számítás csak forgatókönyv. A Google 5 USD-s billing figyelmeztetés **nem hard cap**.
- Google Cloud SKU, számlázás és tényleges API-kvótakorlát ellenőrzése előtt **nem emelendő** a belső költségkorlát. A prioritás a pénzügyi meglepetések elkerülése.

## Amikor folytatjuk
1. Google Cloud Billing tényleges Routes SKU és költség ellenőrzése; valódi kvótakorlát.
2. Smart Trip elsődleges keresőhöz jogszerű integrálási terv, a meglévő BKK/MÁV/Volán keresők érintetlenül hagyásával.
3. Alternatívák menetrendi verifikációja és egy, ténylegesen használható Léna A terv, kevés várakozással, gyaloglással és biztonságos csatlakozással.
4. Csak a felhasználó kifejezett jóváhagyására lehet fizetős Google API-próbát indítani.

**2026-11-08: a felhasználó most más modul hibajavítására / UX-javítására vált; Smart Trip munka parkolva, nem indítunk további keresést.**
