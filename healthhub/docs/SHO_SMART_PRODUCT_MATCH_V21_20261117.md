# SHO Smart Product Match V2.1 · első működő termékkártya pilot

**Dátum:** 2026-11-17 · **Csatorna:** Shopping → Boltok és árucikkek → 3 boltos kereső

## Üzleti eredmény

- A korábban elkészült 3 boltos, közös Smart List-alapú kereső **új, képes termékjelölt résszel** bővül.
- Valódi terméknév, márka, vonalkód, kiszerelés és Open Food Facts katalógusfotó, ha az adatbázisban megtalálható; eltérő vagy hiányzó metaadat esetén transzparens figyelmeztetés.
- Két aktív, hivatalos keresési átadás minden kártyán: **Tesco összes találat**, **Auchan összes találat** (megőrzi a felhasználó által korábban ellenőrzött duplán kódolt Auchan paramétert).
- A pontos Open Food Facts-adatlap megnyitható a termék vonalkódjára. **Nem állítunk hivatalos Tesco/Auchan SKU-egyezést**, a terméket és a kosarat a felhasználó az áruházban választja.
- Képek/termékadatok **Open Food Facts** (ODbL, CC BY-SA), *nem az áruházi katalógusok*. Ha nincs valós fotó, neutrális ikon látható. A rendszer nem generál mesterséges termékfotót vagy árat.
- **Rendezés:** relevancia, név, egyező kiszerelés elsőként. Ár szerinti rendezés tiltva, amíg nincs hiteles áruházi adat.
- Kiszerelés és tejzsírszázalék külön ellenőrzése: 1 l és 500 ml, 1,5% és 2,8%, 1 kg és 250 g nem lehet automatikusan pontos egyezés.
- Korábbi Shopping főképernyő (12 Golden store, hero, Smart List és Kosár Match) és V2 kereső változatlan.

## Hiteles adatszolgáltatás

A meglévő, éles `sho-shopping-products-v1` Supabase Edge Function a forrás. Felhívás: HTTP GET `?q=<szó>` vagy `?barcode=<EAN>`, `apikey` = családi központ publikus kulcsa. Csak Open Food Facts-metaadatokat ad, nem merchant feedet.

Védelmek: maximálisan 12 eredmény, 11 másodperces frontend időkorlát, 10 perces `sessionStorage` termékadat-cache (nem ár-cache), helyi legfeljebb 3 új kérés/perc, forrásdomain-ellenőrzés a termékfotókhoz, megszakított korábbi kérés nem írhatja felül az új találatokat, alapértelmezett kártyák és kitalált termékek nincsenek.

## NEM megvalósult funkció

- Aktuális Tesco/Auchan/SPAR bolti ár, egységár, készlet, kosárba helyezési visszaigazolás vagy fizetés.
- Aktuális áruházi termékfotó és SKU-egyezés.
- Automatikus háromáruházas árösszehasonlítás vagy árrendezés.

**Későbbi kapu:** a kereskedőktől vagy engedélyezett partneradatforrásból származó, ellenőrzött ajánlat-feed. Csak azt követően nevezhető egy kártya „aktuális áruházi ajánlatnak”.

## Telefonos UAT

1. Nyisd meg a Shopping → **3 boltos kereső** oldalt.
2. Keresés: `laktózmentes UHT tej 1,5% 1 l`. Várható: Open Food Facts termékjelöltek fotóval, eltérő kiszerelések külön figyelmeztetéssel.
3. Próba: `100% arabica szemes kávé 1 kg`; minden kártyán Tesco/Auchan találatok a megfelelő névre.
4. Kattints a közös Smart List egyik tételére: a képes találat frissüljön; eredeti lista ne módosuljon.
5. Az áruházi oldalon ellenőrizd az aktuális árat és a kosárba helyezést. Térj vissza: SHO maradjon a kiválasztott terméken.

Készülékes Samsung Internet/Edge UAT és élő kereskedői árkapcsolat ellenőrzése szükséges.
