# Léna Premium Skin Pack V1

**Státusz:** újrafelhasználható, izolált dizájncsomag.  
**Vizuális etalon:** HealthHub Sleep v1173, 2026-11-18, a felhasználó által jóváhagyott Golden Standard.

A cél, hogy a Sleep oldal prémium minőségét más HealthHub / SHO modulok is átvehessék **másolgatás, adatszinkron-módosítás és vizuális regresszió nélkül**.

## Fájlok

| Fájl | Szerepe |
|---|---|
| `lena-premium-v1.css` | önálló, névterezett CSS tokenek és komponensek |
| `preview.html` | izolált mobil komponensgaléria, Mónika/Zsolt színváltóval |
| `tests/lena-premium-skin.test.cjs` | névtér, stabilitás, elkülönítés és demóteszt |

**Élő Sleep:** a már működő `healthhub/sleep-premium-v1172.css?v=1173-lena-demo-fidelity` marad a helyén. A Skin Pack **nem** váltja le, és nincs automatikusan bekötve a többi modulba. Ez szándékos, nem hiba.

## Integráció egy kiválasztott modulba

A kiválasztott modul HTML fejlécében egyszer:

```html
<link rel="stylesheet" href="/berlet-app/healthhub/skins/lena-premium-v1.css?v=1">
```

A **saját modulod** konténerére helyezd a névteret és a profilt:

```html
<section data-hh-skin="lena-premium" data-hh-profile="monika">
  <div class="lp-shell lp-stack">
    <header class="lp-hero">
      <span class="lp-eyebrow">HealthHub · Modul</span>
      <h1 class="lp-title">Prémium áttekintés</h1>
      <p class="lp-subtitle">Valódi adatok, a modul saját adatforrásából.</p>
    </header>
    <div class="lp-grid">
      <article class="lp-stat">
        <span class="lp-stat__label">Mért mutató</span>
        <strong class="lp-stat__value">—</strong>
        <span class="lp-badge lp-badge--muted">Nincs adat</span>
        <span class="lp-stat__note">Csak igazolt forrásból származó érték jelenjen meg.</span>
      </article>
    </div>
  </div>
</section>
```

Profilváltásnál csak a gyökér `data-hh-profile` attribútuma változik:

- `monika`: prémium rózsaszín akcentus
- `zsolt`: prémium jégkék akcentus

A CSS automatikusan színez; a valódi adatokat, profilazonosítást és a navigációt **az alkalmazás meglévő rendszere** biztosítja. Ha más konténerre is felveszed a `data-hh-skin` attribútumot, csak az a rész kapja a skint.

## Dizájnelemek

| Osztály | Mire való |
|---|---|
| `lp-shell`, `lp-stack`, `lp-row` | prémium keret, függőleges és vízszintes elrendezés |
| `lp-hero`, `lp-title`, `lp-eyebrow`, `lp-subtitle` | fejlécek és fényhullám |
| `lp-panel`, `lp-card`, `lp-card--feature` | üvegfelület és kiemelt kártya |
| `lp-grid`, `lp-grid--three`, `lp-grid--four` | két-, három-, illetve négyszéles rács |
| `lp-stat`, `lp-stat--highlight` | mérőszámcsempe |
| `lp-stat__label`, `lp-stat__value`, `lp-stat__unit`, `lp-stat__note` | jól olvasható adat és magyarázat |
| `lp-badge` (+ `--accent`, `--success`, `--warning`, `--muted`) | adat- vagy állapotjelzés |
| `lp-banner`, `lp-banner__icon`, `lp-banner__text` | alsó állapotjelző glass card |
| `lp-button`, `lp-button--ghost`, `lp-nav` | érintésbarát vezérlők és navigáció |

**Vizuális tokenek:** `--lp-accent`, `--lp-accent-strong`, `--lp-ice`, `--lp-ink`, `--lp-copy`, `--lp-surface`, `--lp-border`, `--lp-shadow`, `--lp-radius-card`, `--lp-gap`.

## Golden Standard átvételi feltételek

1. **Opt-in only:** más modulok alapértelmezett felülete nem változik.
2. **Adatszigetelés:** a skin nem kezel adatot, feltöltést, cache-t, HC-jogosultságot, Samsung-exportot vagy navigációt.
3. **Mobil:** S24 Ultra körüli 360–420 CSS-px szélességen teljes szélességű, olvasható felület; 375 px alatt 4-es csempesor 2-esre vált.
4. **Profil:** Mónika rózsaszín, Zsolt kék; a profiladatok nem keveredhetnek.
5. **Hozzáférhetőség:** legalább 44 px elsődleges gombok, látható fókusz, `prefers-reduced-motion` támogatás.
6. **Valós mérések:** nincs kitöltött vagy szimulált egészségérték az éles modulban. A `preview.html` kizárólag mintaértékeket használ.
7. **Kontrollált rollout:** először egy új modul kísérleti nézetén vizuális ellenőrzés, majd fokozatos bevezetés; előtte nincs globális CSS-injektálás.

## Vizuális ellenőrzés

A demófájl a kódtárban: `healthhub/skins/preview.html`. A profilt a két felső gombbal lehet váltani, az adatértékek csak minták.

A Sleep demó hűségét továbbra is az **élő v1173** CSS és a jóváhagyott kép határozza meg. A skin packból egy másik modul felülete nem válik varázsütésre pixelazonossá, mert a modulok DOM-szerkezete és tartalma eltér. A cél az azonos vizuális nyelv és komponensszintű design quality.
