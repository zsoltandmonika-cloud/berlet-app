# HealthHub · Smart Arrival / Mókuska Notification Studio
## Living feature specification · v1.1 (Buddy Edition v789) · 2026-10-22

**Állapot:** APPROVED PRODUCT SPEC · v788 LOCAL-ONLY EDITOR CODED, DEVICE TEST PENDING. A valódi geofencing, push és háttér-GPS továbbra is PLANNED, nem éles. Kizárólag technikai és általános termékdokumentáció: nincs benne privát koordináta, token vagy személyes napló.

### Cél
A Family Guard által már kezelt, kifejezetten megosztott Landmarkokhoz később megadhatók eseményszabályok: *megérkezett*, *elhagyta*. A HH One natív, önként engedélyezett Android helyszolgáltatása megerősített esemény esetén, címzett/érintett profil szerinti engedélyekkel küldhet értesítést. A felhasználók külön-külön és visszavonhatóan döntik el, hogy saját mozgásukból mely események oszthatók meg a családtaggal.

### Elfogadott, elsődleges design-döntés
- **Alapértelmezett hang:** **Játékos Buddy-hangeffekt** 🐿️. Rövid, barátságos, nem riasztó, eredeti/jogszerűen használható hangsáv.
- **Választható hangok:** Játékos Buddy (default) / rövid „Ta-daaa!” / lágy csilingelés / diszkrét jelzés / néma. Legalább négy választás maradjon elérhető.
- **Buddy animáció:** az eredeti, már meglévő HealthHub Buddy mókus/chipmunk asszisztens (közös Nutrition és további modulok karakterazonossága), prémium, szerethető, rövid felugró karakter a HealthHub stílusában, önálló ki-/bekapcsolóval; tiszteletben tartja a csökkentett animáció rendszerszintű kérését.
- **Értesítésszerkesztő:** cím és szöveg szabadon szerkeszthető; eseményenként és címzettenként külön sablon, előnézet, visszaállítás az alapértékre.
- **Biztonságos helyettesítő változók:** `{person}`, `{place}`, `{event}`, `{time}` (a felhasználó eszközén feloldva; ártalmatlanítás és szöveghossz-korlát).
- **Személyes választások:** hang, animáció, hang nélküli időszak, be/ki, eseménytípus, érintett személy és Landmark; később esetleges hangerő/rezgés, amit az Android értesítési csatornák és az eszköz beállításai korlátozhatnak.
- **Próbaértesítés:** kizárólag kézzel indított előnézet, egyértelmű `TESZT` jelöléssel, nem hamis élő érkezés.
- **UI:** a Guardianba illeszkedő premium dark-glass / Zsolt-kék / Mónika-rózsaszín színvilág, ugyanaz a Mókuska-karakter, amely az adott képernyőn következetesen szerepel; nem módosítja a meglévő Hero-t, 3D térképet, Landmarkokat vagy taskbart.

### Technikai elfogadási feltételek
1. A natív HH One háttér-helymeghatározás engedélyei (Android foreground-service location, pontos és szükség esetén háttér-hozzáférés) *a telefon tulajdonosának kifejezett, visszavonható döntései*. Egyetlen webes gomb sem kapcsolhatja be csendben a háttérkövetést.
2. Csak hiteles és friss helyadatokból, megfontolt pontossági küszöbbel, kijelölt zónával és többperces *dwell/hysteresis* megerősítéssel számolunk megérkezést. Pontatlan vagy elavult GPS esetén **nincs érkezésértesítés**.
3. Anti-spam és deduplikáció: egy eseményhez egy értesítés, újraküldés csak tényleges távozás és későbbi visszaérkezés után; beállítható csendes időszak helyi időzónában.
4. A személyes értesítési beállítások jogosultságvédett tárhelyen, profilonként és eszközönként külön kezelve tárolódnak; a mentés visszaolvasható. Közös, jogosult admin beállítás nem írhatja felül a másik telefon saját opt-in jóváhagyását.
5. Értesítések fogadása Androidon a felhasználó által engedélyezett értesítési csatornákon át. Hang, rezgés, DND és háttér-folytonosság eszközfüggő lehet; a csendes mód kifejezetten tiszteletben tartandó.
6. Első készülékes bizonyíték: érkezés + távozás, képernyő zárolva, GPS pontossági szélsőségek, offline / visszacsatlakozás, engedély visszavonása, duplikáció és push kézbesítés ellenőrzése **külön** mindkét családtag telefonján.
7. Nincs automatikus 112-hívás, egészségügyi diagnózis vagy garantált 24/7 követés ígérete.

### Felületi sablonötletek (példák, nem éles értesítések)
- **Otthon / Érkezés:** `Ta-daaa! {person} hazaért! 🏡` · `Mókuska jelenti: {person} biztonságosan megérkezett.`
- **Munkahely / Érkezés:** `{person} megérkezett a munkahelyére 💼`
- **Otthon / Távozás:** `{person} elindult otthonról 🚶`

### Függőségek és sorrend
Family Guard közös Landmark Sync (meglévő), majd HH One natív, hozzájárulásos háttér-GPS + hitelesített geofence eseménymotor + push értesítések + Smart Arrival Studio. Az élesítés külön CI → készülékes LIVE VERIFIED → USER ACCEPTED kapukhoz kötött.

### Első implementáció: v788 Studio
A Family Guard alatt a **Smart Arrival Studio** kinyitható panelben helyben lehet szerkeszteni és elmenteni a személy/hely/esemény sablonokat, kiválasztani az öt hangot, majd a **TESZT** gombbal eredeti, Web Audio API-val szintetizált hangot és egyértelműen jelölt Mókuska-pop-upot kipróbálni. A már mentett helyek és a Family Live szolgáltatás változatlanok. A beállítások egyelőre **készülék-/böngészőhelyiek**, nem családilag szinkronizáltak. Az éjszakai némítás a későbbi automatikus értesítési motor konfigurációja; az explicit kézi hangpróbát nem akadályozza.

### Project Control
`HH-GUARD-006` · Smart Arrival / Mókuska Notification Studio · PLANNED / 0%.

### v789 jóváhagyott finomítás · egységes Buddy + hangerő
- **Egyetlen standard karakter:** **Buddy**, a HealthHub más moduljaiban már használt, eredeti 3D mókusasszisztens. A Smart Arrival előnézet/pop-up ugyanazt a `healthhub/nutrition/nutri-chipmunk-3d-v594.webp` assetet használja, amelyet a Buddy companion modul már használ. Nem generálunk új, eltérő mókuskaraktert.
- **Hangerő:** külön, profilonkénti eseménysablonhoz mentett **0–100%** csúszka, alapérték **75%**. 0% = teljes némítás. A teszt Web Audio hangja a v788-nál hangosabb, maximálisan korlátozott gainnel; a készülék rendszerhangerőjét nem módosítja.
- **Kompatibilitás:** megmarad a meglévő `hh-guardian-smart-arrival-studio-v788` localStorage kulcs és az összes korábbi mentett szöveg, hang, jelölő. A volume mezővel nem rendelkező korábbi sablonok 75%-ot kapnak.
- **Scope:** a hangerő csak a kézi hangpróbán érvényesül. Android natív push-hangerőre továbbra is platformszabályok vonatkoznak. Valódi helyesemény / érkezésértesítés továbbra sem él.
