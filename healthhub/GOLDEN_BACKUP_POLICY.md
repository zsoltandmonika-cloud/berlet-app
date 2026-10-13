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


## Éjféli automatizmus és 5 mentés megtartása

- GitHub Actions: `HealthHub Level 3 Guard` / `healthhub-level3-guard.yml` futtatása naponta **budapesti éjfél után körülbelül 00:15-kor**, a téli/nyári időszámításnak megfelelően két UTC cron időpontból; a rossz helyi órában indított futás csak ellenőriz, nem ment. GitHub Actions időzített futása késhet, ezért ez nem garantált másodpercre pontos időpont.
- Ugyanaz az ellenőrző workflow fut, mint módosításkor, így a mentés csak tényleges **PASS** után történik. Sikeres manuális indítás is engedélyezett.
- A Golden Backup mindig a **main aktuális SHA-ját** rögzíti, nem egy fejlesztői vagy félkész PR-ágat.
- Változatlan kód esetén nincs duplikált tag; az éjféli sikeres ellenőrzést külön naplózzuk.
- A rotáció az utolsó **öt** `hh-golden-<12 hex>` típusú tagre vonatkozik. A régebbi forgó tagek csak az **új tag és tartós napló sikeres írása után** törlődnek.
- Egy külön `hh-golden-pinned-...` taggal kézzel rögzített kiemelt stabil verziót a rotáció **soha nem töröl**.
- Tartós version history: **`healthhub-backup-history` branch**, `version-history.ndjson` fájl. Ezt a rendszer az éles main módosítása nélkül frissíti.
- A mentés közvetlen elérési útja minden naplóbejegyzésben: `https://github.com/zsoltandmonika-cloud/berlet-app/tree/<tag>`.
- Az aktuális mentés ZIP letöltése: `https://github.com/zsoltandmonika-cloud/berlet-app/archive/refs/tags/<tag>.zip`.
- A HealthCheck PASS **nem** jelenti azt, hogy az adott verzió funkcionálisan tesztelt vagy bizonyítottan stabil; a pinelt Golden verziót csak telefonos validáció után célszerű kijelölni.

**Első élesítés előtt kötelező ellenőrizni a workflow tényleges futását és az archív napló létrejöttét. A PR állapota önmagában nem telepítés.**
