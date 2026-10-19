# HealthHub v693 · Bizonyított eredeti PDF-feloldás eltérő dokumentumazonosítók esetén

## Esemény és hatókör
2026-10-19: Mónika PC-n a leletek egy része megnyílik, mobilon a kérdéses leletre a PDF-néző a következő hibát adja: nincs az indexbeli dokumentumazonosítóhoz egyértelműen hozzárendelt Drive-PDF. A v691 audit mindkét eszközön azonos Dropbox- és Health Vault-fiókot, jogosultságot és v690 PDF-nézőt igazolt, de az eredeti fájlok helyi elérhetősége eltér. Mónika mobilon 128 leletindex, 0 helyi blobkulcs, 73 egyértelmű, 50 többértelmű, 5 címke szerint párosíthatatlan eredeti. Zsolt mobilon 33 leletindex, 0 helyi blobkulcs, 23 egyértelmű és 10 többértelmű eredeti. A számok **nem** igazolják, hogy bármely két PDF tartalma duplikátum.

## Célzott korrekció
A v692 csak az azonos documentId címkével rendelkező Drive-bejegyzések közül tudott SHA-256 alapján választani. Ez nem fedte le a konkrét 'drive_document_not_indexed' hibát, ahol az aktuális indexazonosítóhoz egyetlen Drive-címke sem tartozik.

A v693-ban a meglévő, profiljogosultságot és privát Drive-mappát ellenőrző archive_document olvasó sikertelensége után:
1. Csak akkor kérünk profilhoz kötött, szerveroldali archive_inventory leltárt, ha a helyi leletindexben **64 hexadecimális karakter hosszú SHA-256** van.
2. Először az azonos patient profile/documentId/SHA-256 eredetit keressük. Ha nincs, **ugyanazon profil privát mappájában**, eltérő korábbi dokumentumazonosítóval megjelölt, de azonos SHA-256 metaadatú eredetit választhatunk.
3. Eltérő dokumentumazonosítónál a szerveroldali archive_pdf művelet újból ellenőrzi a hitelesített felhasználót, a jogosult beteget, az eredeti mappa leszármazási helyét, fájlprofilját, MIME-ját, méretét és PDF-aláírását.
4. A böngésző **újra SHA-256-ot számol a teljes letöltött bájtfolyamból**, és csak pontos egyezéskor jeleníti meg a PDF-et. A felhasználó nem adhat meg tetszőleges Drive-fájlazonosítót.
5. Ha az indexből hiányzik a SHA-256 vagy a privát Drive-leltárban nincs megfelelő SHA-256 címke, megmarad a zárt hibaállapot. Nincs név/dátum/méret alapján való automatikus hozzárendelés.

## Adatbiztonság és üzemeltetés
Nincs tokenmegosztás, archívum törlés, fájl- vagy metadata-felülírás, adatbázis-migráció, reimport. A belső id-hiba nem jelent adatvesztést. Az Adminban a készülékdiagnosztika ezentúl a hiányzó helyi PDF-ek közül csak aggregáltan mutatja a SHA nélküli rekordok és az eltérő Drive-ID mellett SHA-val azonosítható esetek számát. Nem jelenít meg fájlnevet vagy SHA-t.

## Valós elfogadás
A GitHub zöld CI nem helyettesíti a mobilt. A javítás csak akkor LIVE VERIFIED/USER ACCEPTED, ha Mónika eredetileg sikertelen PDF-je sikeresen megnyílik, oldallapozás/nagyítás működik, valamint legalább egy Zsolt-lelet is megnyílik. Ha nincs SHA bizonyíték az adott irathoz, a hibát dokumentáljuk és a felhasználó explicit beleegyezésével végezhető külön forrás-helyreállítás szükséges.
