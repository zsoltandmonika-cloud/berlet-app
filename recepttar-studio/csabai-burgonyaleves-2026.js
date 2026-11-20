(function(){
'use strict';
const id="lena-csabai-kolbaszos-burgonyaleves-dupla-2026";
if(!Array.isArray(window.LENA_RECIPES))return;
const ingredients=[
  "1,2 kg burgonya, közepes kockákra vágva",
  "450 g vegetable soup mix (vegyes leveszöldség)",
  "300 g csabai lángolt kolbász, felkarikázva",
  "2 nagy fej vöröshagyma, finomra aprítva",
  "4 gerezd fokhagyma, összezúzva",
  "2 evőkanál libazsír",
  "4,5 liter víz indulásnak (szükség esetén még 0,5–0,9 liter)",
  "4 evőkanál tejföl",
  "2 evőkanál finomliszt",
  "4 babérlevél",
  "1–2 teáskanál szárított majoránna",
  "1 teáskanál édesnemes pirospaprika",
  "½ teáskanál füstölt pirospaprika (opcionális)",
  "½–1 teáskanál tört fekete bors, ízlés szerint",
  "4 csipet szárított petrezselyem",
  "8–10 csepp 20%-os ecet, majd kóstolás szerint",
  "Só óvatosan, inkább a főzés végén"
];
const steps=[
  "A burgonyát hámozd meg és kockázd fel. Aprítsd a hagymákat, karikázd a kolbászt. A 300 g kolbász kétharmadát tedd félre az alaphoz, a maradékot a befejezéshez.",
  "Nagy, legalább 7 literes fazékban olvaszd fel a libazsírt. Dinszteld a vöröshagymát 5–6 percig, add hozzá a fokhagymát, majd a kolbász kétharmadát, és pirítsd további 2–3 percig.",
  "Ha a zöldségmix friss, most add hozzá, és 2–3 percig párold. Ha fagyasztott, ne pirítsd: a főzés utolsó 15–20 percére tartogasd.",
  "Vedd le a fazekat a tűzről. Keverd hozzá az édes és az opcionális füstölt pirospaprikát, majd add hozzá a burgonyát, a babért, a majoránnát és a borsot.",
  "Öntsd fel 4,5 liter vízzel, forrald fel, majd közepes lángon, gyöngyözve főzd 25–30 percig. A fagyasztott zöldségmixet 15–20 perccel a vége előtt, a maradék kolbászkarikákat az utolsó 10–12 percben add hozzá.",
  "A tejfölt keverd csomómentesre a liszttel. Fokozatosan adj hozzá 2–3 merőkanál forró levest, majd folyamatos keverés mellett öntsd vissza. Forrald gyengén még 3–5 percig.",
  "Szórd bele a petrezselymet, és csak a végén, óvatosan sózd. Adj hozzá 8–10 csepp 20%-os ecetet, keverd el és kóstold meg.",
  "Ha túl sűrű, kevés forró vízzel hígítsd. Tálalás előtt 5 percig pihentesd; friss kenyérrel kínáld."
];
const notes=[
  "Dupla adag: kb. 12–14 tányér, a tényleges adagmérettől függően. 55–65 perc.",
  "Az eredeti recept duplázva 5,4 liter vizet ír; a tartalmasabb verzióhoz 4,5 literrel indulunk, és szükség szerint hígítunk.",
  "A csabai kolbász fűszerezett és sós, ezért a sóval és a külön pirospaprikával óvatosan bánj.",
  "A mustárt ebben a változatban kihagyjuk; a füstölt pirospaprika opcionális.",
  "Fagyasztott leveszöldséget nem szükséges előre kiolvasztani; a főzési időt a zöldségek méretéhez igazítsd.",
  "A 20%-os ecet tömény: csak pár cseppet tegyél bele, kóstolás után korrigálj.",
  "Tejfölből használható laktózmentes változat is."
];
const recipe={
 id,
 title:"Csabai lángolt kolbászos, tejfölös burgonyaleves",
 category:"Levesek",
 file:"recipes/Lena_Csabai_Kolbaszos_Burgonyaleves_2026.svg",
 mime:"image/svg+xml",
 originalName:"Léna csabai kolbászos burgonyaleves · receptkártya.svg",
 studioData:{
  title:"Csabai lángolt kolbászos, tejfölös burgonyaleves",
  category:"Levesek", servings:"12–14 fő", time:"55–65 perc", difficulty:"könnyű",
  ingredients,steps,notes
 }
};
if(!window.LENA_RECIPES.some(r=>r.id===id))window.LENA_RECIPES.push(recipe);
window.LENA_READABLE=window.LENA_READABLE||{};
window.LENA_READABLE[id]={status:"verified",source:"lena_recipe_studio_curated",ingredients,steps,notes};
})();