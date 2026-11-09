# HH ONE / SHO · Nagytakarítási készenléti terv (v1)

**Állapot: ELŐKÉSZÍTVE, NEM FUTTATHATÓ AUTOMATIKUS TÖRLÉS.**

## 1. Cél
A Family Guard helyreállítása és a két natív telefon hitelesítése után a korábbi
Dropbox-fiókok, Android-azonosítók, webes sessionök és elavult hibajelzések
biztonságos, visszavonható rendezése. **NEM** GPS-nyomvonal-, egészségügyi
adat-, gyógyszer-, token-, készülék- vagy jogosultságtörlés.

A központi eszközazonosítás (Supabase) és a régi parancssor (Dropbox)
**külön rétegek**. A készülék központi hitelesítése nem bizonyítja, hogy
egy adott Dropbox-fiók látja is a saját telefonjának parancsait/adatait.
Nem egyesítünk fiókokat, nem cserélünk Dropbox-tokent távolról, nem
nyúlunk Android-engedélyekhez.

## 2. Kötelező GO / NO-GO feltételek

| Feltétel | Követelmény | Ha hiányzik |
|---|---|---|
| Zsolt natív telefon | Egyedi, hitelesített Supabase-ID + ≤20 perc heartbeat | STOP |
| Mónika natív telefon | Egyedi, hitelesített Supabase-ID + ≤20 perc heartbeat | STOP |
| Mindkét GPS | Valós, hozzájárulással megosztott, ≤5 perces natív minta, ≤100 m mérési bizonytalanság, tényleges telefon/hely ellenőrzésével | STOP |
| Family Guard | Tényleges megjelenítési útvonal és ≤10 perces friss adat, **nem** cache/otthoni cím | STOP |
| Dropbox | Mindkét profilnál sikeres, visszaolvasott adatszinkron ≤60 perc | STOP |
| Health Connect | Mindkét profilnál igazolt valódi siker ≤24 óra | STOP |
| Mentés | Mindkét Dropbox-fiókból külön, dokumentált teljes érintett kör mentése, legfeljebb 72 óra, sikeres visszaolvasási próbával | STOP |
| Hozzájárulás | Konkrét változásokra külön tulajdonosi jóváhagyás | NINCS ÍRÁS |

A **NO-GO** állapot nem hiba; biztonsági védelem.

> Fontos technikai hiány: a jelenlegi `family-device-central-v1.js` szerveres
> jóváhagyási folyamata Zsolt-pilotként indult, és a webes jóváhagyás Zsoltra
> van korlátozva. Mónika párosítását nem szabad késznek jelenteni, amíg a
> szerveres és natív jogosultsági folyamat valóban támogatja, és a hitelesített
> sor ellenőrizve nincs.

## 3. Előkészített műveleti sorrend

1. **Read-only inventory:** Supabase `hh_family_devices_v1` hitelesített
   státusz; Dropbox `/HealthHub/orchestrator/device-registry-v401.json`
   és `devices/`, `status/`, `commands/`; natív
   `/HealthHub/guardian/native-live/{zsolt,monika}.json`; Health Connect és
   Family Guard visszajelzések. Az ellenőrzési snapshot **nem tartalmazhat
   koordinátákat, tokeneket, orvosi adatokat vagy párosítási titkokat**.
2. **Backup:** mindkét Dropbox-fiók érintett fájljainak teljes mentése
   külön, időbélyeges célra; visszaolvasással igazolt épség; Supabase
   érintett sémák/jogosultságok változtatása nélkül.
3. **Dry-run:** futtatás a lentebb leírt `housekeeping-gate-v1.cjs` eszközzel;
   eredmény: `BLOCKED` vagy `READY_FOR_MANUAL_REVIEW`.
4. **Kézi döntési lista:** védett, élő ID-k KEEP; elavult webes
   sessionök REVIEW; nem kijelölt Android-ID-k REVIEW;
   eltérő Dropbox-kijelölések REVIEW. Minden eltéréshez forrás és
   visszaállítási terv.
5. **Csak jóváhagyás után:** a meglévő `device-registry-v401.js`
   védett, tranzakciós archiválási műveletével *kizárólag* az azonosított,
   nem aktív, régi metaadatok archiválása. A fájlok, parancsok,
   eszköztokenek, profilok és health adatok változatlanul maradnak.
6. **Külön döntés:** régi parancs-/státusz-/naplófájlok esetleges
   áthelyezése csak második explicit jóváhagyással és mentés után.
   Permanens törlés nélkül. Ebben a kiadásban NINCS ilyen kód.
7. **Visszamérés:** a két készülék GPS és Health Connect adatfrissessége,
   Family Guard térképe, Dropbox olvasás és írás, OTA, Remote Admin
   hozzájárulások, HH ONE pirula, értesítések és mobil UX ellenőrzése.
8. **Rollback:** a `v401` UI-ban az archiválás visszavonása, vagy az
   előző, visszaolvasott Dropbox-mentés visszaállítása. Rosszabbodó
   szinkronnál további műveletek leállítása.

## 3/B. Teljes SHO nagytakarítás: felülvizsgálati területek

A fentiek az **eszközazonosság biztonsági kapui**. Ha ezek zöldek,
az alábbi rendszerterületek is külön felülvizsgálandók; a készenléti
kapu **nem** tekinthető bizonyítéknak arra, hogy minden modul hibátlan.

| Réteg | Vizsgálat | Első körben megengedett művelet |
|---|---|---|
| Family Guard | Élő/utolsó ismert jel, helyforrás és időbélyeg, profilváltás | Téves címkék és cache-eredet feltárása, QA |
| HH ONE / RAG | Hamis hibakódok, jogosultságok, OTA-állapot, natív/webes ID-eltérés | Csak forrásjavítás és regressziós teszt |
| Dropbox | Párhuzamos fiókok, régi és új registry, árva `devices/status/commands` rekordok | Fiókonkénti mentés, olvasott leltár, kézi archív jelölés |
| Supabase | Családi profil-szétválasztás, RLS, régi adathivatkozások | Csak read-only audit és jogosultsági ellenőrzés |
| SHO web | Elavult modul-/JS-importok, duplikált observer/polling, többszörös render | Importtérkép és célzott automatizált teszt |
| Android / OTA | APK-k, buildkód, aláírás, rollouthoz tartozó profilok | Verziókonzisztencia-ellenőrzés, nincs távoli telepítés |
| Cache / UX | Beragadt régi helyadat, helyi session, tárolt ikon/pirula-állapot | Célzott cache-verziócsere; nincs általános adattörlés |
| GitHub / CI | Régi preview ágak, sikertelen tesztek, kihasználatlan workflow-k | Bizonyítékalapú lista; branch és release marad |
| Értesítések | Dupla/stale állapotüzenetek, kattintási célok | Megjelenítési logika javítása; nincs riasztás elnémítva |

Az egyes területek csak **kockázat, függőség, megtakarítás és rollback**
szerint priorizált, elkülönített kis PR-okban változhatnak. A gyors
HH ONE és SHO felületet nem bontjuk meg egyetlen nagy, tesztelhetetlen
átírással. A készülékazonosítókon túl minden változás külön jóváhagyás.

## 4. Futtatható készenléti teszt

A GitHub Actions `HH ONE · Post-validation Housekeeping Readiness`
workflow kézzel is indítható; **csak statikus teszteket** futtat,
nem kér hozzáférési tokent, nem futtat távoli parancsot, és nem módosít
adatbázist. A későbbi, valós ellenőrzést a jogosult kezelő az
**aktuális, helyben generált, kitakart** snapshotból futtatja:

```bash
node healthhub/housekeeping/housekeeping-gate-v1.cjs /private/housekeeping-redacted.json
```

Elvárt minimalizált bemeneti kulcsok:
`capturedAt`, `centralDevices` (profil, ID, verified_at, last_seen_at,
state), `gps` (profilonként source, validated, accuracy_m, updated_at),
`sync` (profilonként familyGuard/dropbox/healthConnect validated +
lastSuccessfulAt), `backup` (confirmedAt, restoreTested, accounts),
`legacyAccounts` (fiók megnevezése, activePhones, archived, devices).

**Ne tölts fel ilyen élő snapshotot GitHubra.** A script csak olvassa az
operátor által biztosított lokális fájlt, a teljes ID-kat rövidítve
mutatja, és nincs írómódja. A `READY_FOR_MANUAL_REVIEW` SEM
automatikus takarítási engedély.

## 5. Stop szabályok
- Mónika nem hitelesített, vagy otthoni cím látszik valós helyzetként:
  **STOP**, előbb a helyadat forrásának javítása.
- Bármelyik Dropbox-fiók hiányzik: **STOP**, nincs fiókok közötti
  vak metaadat-mozgatás.
- Az ID egy aktív regiszterhez vagy központi hitelesítéshez tartozik:
  **VÉDVE**, nincs archiválás.
- Nincs friss biztonsági mentés és visszaolvasási próba: **STOP**.
- Az alkalmazásban aktív egészségügyi vagy GPS-funkció romlik:
  **azonnali rollback**.

**Indító mondat az előfeltételek teljesülése után:**
„Léna, indítsd a HH ONE housekeeping dry-run vizsgálatát, mutasd a
védett és archiválható tételeket, de még ne módosíts semmit.”
