# HH-LENA-IDENTITY-001 / HH-DH-001 · Léna Digital Human és egységes karakter

**Dátum:** 2026-10-18  
**Státusz:** rögzített termékkövetelmény / jövőbeli fejlesztés; nem implementált funkció  
**Kapcsolódó cél:** HH-AUDIT-001 → HHSP1 → Voice & History → egyesített Live Video + Speech  
**Alap:** [HealthHub Premium Glass Design Playbook](./HEALTHHUB_PREMIUM_GLASS_DESIGN_PLAYBOOK_V1.md), „One Léna, many roles”.

## 1. Kötelező karakterazonosság: HH-LENA-IDENTITY-001

Léna minden HealthHub-modulban **ugyanaz a felismerhető felnőtt női AI-asszisztens**. Változhat ruházat, szerepkör, háttér, világítás, testhelyzet és arckifejezés. **Nem** változhat az arc felismerhető identitása, alap arcaránya, korjellegének folytonossága vagy a jóváhagyott karakter alapvonása.

Az új képek, animációk vagy videók előállításakor a korábban jóváhagyott, kanonikus portrét/karakterlapot kell használni referenciaként, nem szabad promptból új Lénát kitalálni. A jóváhagyott képek cseréje külön felhasználói elfogadáshoz kötött. A karakter ne állítsa magáról, hogy valódi orvos; egészségügyi AI-asszisztensként legyen azonosítható.

**HHSP1 auditfeladat:** valamennyi Léna Hero-, popup- és modulmegjelenés assetleltára és vizuális eltéréslistája; mobil/desktop, Zsolt/Mónika profilon ellenőrizve. Canonical portrait + reference sheet jóváhagyása; meglevő elfogadott képek automatikus cseréje nélkül.

## 2. Egyetlen, integrált Live Video + Speech élmény: HH-DH-001

A jövőbeli **Léna Digital Human** nem külön videólejátszó és nem egy attól független hangos chatbot. A használat során **egyetlen kétirányú, valós idejű, megszakítható audiovizuális beszélgetés**:

- Az ajakmozgás és a beszéd szinkronizált, érzékelhető késés nélkül.
- Szemkontaktus, pislogás, arckifejezés, fejfordítás és gesztusok természetesen követik a beszélgetést; nem okoznak életkor-/arcváltozást.
- Ugyanaz az Ask Léna / HH AI Intelligence és jogosultságellenőrzött, forráshű adatréteg szolgálja a szöveges és a hangos/videós felületet.
- Egységes magyar hangkarakter, következetes kiejtés, beszédtempó és személyiség, a korábban jóváhagyott karakterhez illő megjelenéssel.
- A technikai video-renderelés, audió, realtime stream és az AI modell lehet külön belső szolgáltatás, de a felhasználónak integrált élmény.
- S24 Ultra mobilos használat, kamera- és mikrofonengedélyek, gyenge hálózat, reconnect, energiatakarékosság, megszakítás és fallback esetek támogatása.
- AI-avatar státusz egyértelmű jelzése; kifejezett hozzájárulás az egészségügyi adatok élő beszélgetésbeli felhasználásához; privát felvételek automatikus és indokolatlan tárolása tilos.
- Ha a videó/animáció nem megbízható, visszaesés a **kanonikus statikus Léna-képre + működő hang/szöveg** nézetre. Nincs véletlenszerű csere másik arcra.

## 3. Elfogadási tesztek / release gate

| ID | Követelmény | Átmenő kritérium |
|---|---|---|
| LENA-ID-01 | Léna minden modulban ugyanaz | Jóváhagyott referencia alapján azonos személynek látszik; eltérés hibalistán |
| LENA-ID-02 | Életkori megjelenés állandó | Nincs tinédzseres fiatalodás vagy korváltás jelenet/animáció/profilváltás közben |
| LENA-AV-01 | Beszéd és ajak szinkronja | Észlelhető drift, tartós késés, ismétlődő szájmozgás nélküli válasz; mért latency és eszközteszt |
| LENA-AV-02 | Természetes dialógus | Megszakítható, jól visszakapcsolható, nem vált más hangra/arcra |
| LENA-AV-03 | Egységes Intelligence | Profil, forrás, dátum és jogosultság helyes; a videó nem talál ki mérést |
| LENA-AV-04 | Reszponzív megjelenés | S24 Ultra, keskeny mobil és desktop: arc nem torzul vagy nem vágódik rosszul |
| LENA-AV-05 | Hibakezelés | Kamera/mikrofon/hálózat hiba után kanonikus arccal, működő szöveges fallback |
| LENA-AV-06 | Privacy | Nincs rejtett felvételmentés; kétprofilos izoláció, hozzájárulás, törlési lehetőség |

**Megjegyzés:** a „100% konzisztencia” a definíció szerint ellenőrzött karakterazonossági elfogadási követelmény, nem garantált generatív matematikai azonosság. A tényleges technológiát és határidőt később, a HHSP1 audit és külön Proof of Concept után választjuk.

## 4. Ütemezés

1. HH-AUDIT-001: jelenlegi Léna asset-inventár, eltéréslista, jóváhagyott referenciák.
2. HHSP1: biztonságos, célzott egységesítés az elfogadott arculathoz, regressziós ellenőrzéssel; semmi indokolatlan képcsere.
3. Ask Léna Voice & History: egységes hang- és kontextusszolgáltatás, önmagában is használható hang/szöveg fallback.
4. **HH-DH-001**: videó és beszéd **egyben**, közös Léna Identity Lock alapján, külön felhasználói jóváhagyással.

A dokumentum az audit munkágán van; nem élesít videó- vagy beszédfunkciót, nem módosít privát adatokat, és nem írja át a meglévő egészségügyi modulokat.
