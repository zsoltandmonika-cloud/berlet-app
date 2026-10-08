# HealthHub v312.1 – Daily Health briefing

## Az első működő lépcső

A kezdőképernyőn a Daily Spark és Daily Headline után új **Daily Health · 07:15** sáv jelenik meg. Ez egy külön, mobilbarát reggeli egészségügyi összefoglaló Zsoltnak és Mónikának. Meglévő grafikákhoz és más modulok szerkezetéhez nem nyúl.

- **Nyilvános reggeli források:** Open-Meteo időjárás + UV + légnyomás; Open-Meteo Air Quality / CAMS (ahol rendelkezésre áll, pollen); legutolsó érvényes NNGYK heti jelentés.
- **Ütemezés:** GitHub Actions 05:15, 06:15 és biztonsági 07:15 UTC. A Python-generátor `Europe/Budapest` 07:15 előtt nem ír; aznapi adat ismételt ellenőrzéskor nem ír felül. A GitHub ütemezése késhet.
- **Futás:** a publikus `healthhub/data/daily-health-public.json` készül vagy frissül, benne kizárólag környezeti adatok és hivatalos források. Nem tartalmaz profilt, nevet, gyógyszert, kórtörténetet, mérést vagy tünetnaplót.
- **Kliens:** az alkalmazás a nyilvános pillanatképet friss, három órán belüli lokálisan letöltött környezeti megfigyeléssel felülírhatja. Régi NNGYK-adatot nem mutat aktuális kockázatként. Elérhetetlen adatforrást „nincs adat” címkével jelenít meg.
- **Személyre szólás:** a felhasználó kézzel, külön bekapcsolhatja a pollenhez kötött gyógyszer-*ellenőrzési emlékeztetőt* és a fejfájásnapló-emlékeztetőt. A megnevezett gyógyszer csak a böngésző helyi tárhelyén van, nem kerül a repo JSON-jaiba. A böngésző localStorage nem titkosított, és a beállítás nem szinkronizálódik más eszközökre.
- **Archívum:** legfeljebb 14 napi, rövid, **nem személyes** összesítési mutató a böngésző helyi tárhelyén.
- **AI:** a reggeli összefoglaló az első verzióban **szabályalapú, nem LLM-generált**. Az „Elemzés indítása Lénával” gomb explicit kattintásra a már létező Ask Léna kutatási felületet nyitja meg; az AI kapcsolat nem fut automatikusan a háttérben.

## Orvosi biztonság

A légnyomás/fejfájás kapcsolata nem diagnózis. A pollenfigyelmeztetés nem gyógyszerrendelés. A hőségre vonatkozó figyelmeztetések nem módosíthatják önállóan a folyadék-, gyógyszer- vagy terhelési tervet. A NNGYK heti surveillance nem azonos a helyi/napi egyéni fertőzéskockázattal. Adathiány nem minősíthető zöld/alacsony kockázatnak.

## Következő lépcső (v312.2)

1. Engedélyezett, hitelesített szerveroldali AI-végpont a titkos API-kulcsot a szerveren tartja. Sem klienskódban, sem nyilvános repóban nem lehet kulcs.
2. Explicit, granuláris hozzájárulás a Dropbox Vaultból kiválasztott személyes egészségügyi adatokhoz, kizárólag célhoz kötött és minimális továbbítás.
3. Modellgenerált reggeli személyes tanácsok ellenőrzött, dátummal ellátott forrásokból, kötelező óvatossági korlátokkal, különbségtétel a bizonyított, feltételezett és hiányzó összefüggések között.
4. Központi, titkosított személyes archívum és reggeli mobilos kézbesítés csak a felhasználó külön jóváhagyása után.
