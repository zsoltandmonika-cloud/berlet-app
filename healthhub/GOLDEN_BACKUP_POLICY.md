# HealthHub Golden Backup · ellenőrzés után automatikus mentés

## Funkció
Az éles `main` ágon lefutó `HealthHub Level 3 Guard` HealthCheck **sikeres** lefutását követően az adott, ellenőrzött Git-commitot egy annotált `hh-golden-<SHA12>` taggel rögzíti.

A tag maga egy visszaállítható, változatlan **forráskód-verzió**. A tag annotációja tartalmazza:
- UTC időpont
- HealthHub buildazonosító
- teljes Git commitazonosító
- ellenőrzés neve és PASS állapota
- ellenőrzés GitHub Actions URL-je
- manuális rollback-szabály

Ugyanezekből egy összefoglaló naplóbejegyzés készül a workflow GitHub Actions **Summary** részében. A tartós, visszakereshető verziónapló a Git taglista és az annotációk: `git tag -l 'hh-golden-*'` és `git show hh-golden-<SHA12>`. A workflow futásnaplói GitHub-retenció szerint törlődhetnek; az annotált Git tag tartós.

## Biztonsági feltételek
- PR-ellenőrzésre **nem** készül Golden Backup.
- Hibás HealthCheck után **nem** készül Golden Backup.
- Ha `main` időközben tovább lépett, nem mentünk elavult commitot automatikusan.
- Ugyanazt a commitot nem duplikáljuk: determinisztikus tagnév.
- A HealthCheck nem indít **automatikus rollbacket**: a korábbi `Automatic rollback on failed main validation` lépést célzottan eltávolítottuk.
- A workflow meghagyja a régi, módosítás előtti `auto-backup/` biztonsági ágat is. Az **nem** minősül Golden Backupnak.
- Csak Git-forráskód kerül mentésre; **nem** Dropbox, Supabase, Health Connect vagy egészségügyi dokumentumok.
- A HealthCheck jelenleg szintaktikai és struktúraellenőrzés. Egy PASS **nem bizonyítja**, hogy a mobilos felület, az éles Pages-deploy vagy két automatikus szinkron működik.

## Manuális rollback – javasolt eljárás
1. A felhasználó kiválasztja a Golden Backup taget, és jóváhagyja a rollbacket.
2. Ellenőrizzük, hogy a backup buildhez tartozó adatstruktúra kompatibilis-e a jelenlegi adattal.
3. Külön GitHub PR-ben állítjuk vissza a célverzió forrását; főágat nem force-pusholunk.
4. GitHub Pages újrapublikálás után mobilon ellenőrizzük a buildazonosítót, cache-t, profilokat és fő modulokat.
5. Dokumentáljuk a rollback okát, célverzióját és eredményét.

## Élesítés feltétele
Jelen PR csak a backup mechanizmus **tervezett változtatása**, nem élesített funkció. A PR ellenőrzése, áttekintése és a `main` merge-je szükséges. Az első automatikus mentés csak egy ezt követő, HealthHub fájlokat érintő `main` push és sikeres HealthCheck után jön létre. Ha azonnali jelenlegi Golden Backup kell, azt külön, kézzel jóváhagyott művelettel lehet elkészíteni.
