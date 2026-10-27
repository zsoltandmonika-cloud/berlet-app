# SH9 Connected Wearables · Epic v1
**2026-10-27 · Backlog, nincs kész natív paired-watch registry.**
HH One HealthConnectExporter jelenleg jellemzően Health Connect `metadata.dataOrigin.packageName` értéket ment `sourcePackage` mezőben. Ez **nem bizonyítja** a konkrét Galaxy Watch modellt vagy az óra aktuális kapcsolatát.
**WEAR-M1**: opt-in forrásmetaadat/model/manufacturer/type feltárás, csak amit az upstream Health Connect ténylegesen ad. Profil szerint izolált read-only metaadat, megbízható provenance, utolsó mért idő.
**WEAR-M2**: integrálás a meglévő Eszközregiszterbe, három független státusszal: azonosított mérésforrás / utoljára mért idő / ténylegesen online, ha külön Android-alapú hiteles kapcsolati bizonyíték hozzáférhető. Az utóbbit nem következtetjük a Health Connect mérésekből. Sem túlzott háttérpolling, sem felesleges akkufogyasztás; kéttelefonos acceptance.
