(function(){
'use strict';
const id="lena-mediterran-tonhalas-penne-500g-2026";
if(!Array.isArray(window.LENA_RECIPES))return;
const ingredients=[
"500 g száraz penne tészta",
"3 × 185 g Tesco tonhalkonzerv (kb. 390 g lecsepegtetett tonhal)",
"600 g passzírozott paradicsom (passata)",
"2 közepes vöröshagyma, finomra vágva",
"5–6 gerezd fokhagyma, aprítva",
"2 evőkanál olívaolaj (kb. 25–30 ml)",
"2 teáskanál szárított oregánó",
"1 teáskanál szárított bazsalikom vagy 1 marék friss bazsalikom",
"Chilipehely és frissen őrölt fekete bors, ízlés szerint",
"Kevés só (a tonhal, olívabogyó és kapribogyó sótartalmát figyelembe véve)",
"1 evőkanál frissen facsart citromlé",
"50 g reszelt parmezán a tálaláshoz",
"80 g magozott fekete olívabogyó, karikázva (opcionális)",
"1 evőkanál kapribogyó, leöblítve (opcionális)",
"1 teáskanál füstölt pirospaprika (opcionális)",
"20 g vaj a végén (opcionális, krémesebb szószhoz)"
];
const steps=[
"Nagy fazékban forralj bőséges, enyhén sós vizet. Közben készítsd elő a hagymát, fokhagymát, tonhalat és az opcionális olívabogyót.",
"Nagy serpenyőben melegítsd fel az olívaolajat. Dinszteld a vöröshagymát 4–5 percig, majd add hozzá a fokhagymát és a chilit, és kevergesd további 30 másodpercig.",
"Öntsd hozzá a 600 g passatát. Szórd bele az oregánót, bazsalikomot, fekete borsot és ha használod, a füstölt pirospaprikát. Kis-közepes lángon főzd 10–12 percig.",
"A pennét főzd a csomagoláson jelzettnél 1 perccel rövidebb ideig, hogy al dente maradjon. Leszűrés előtt tegyél félre 200 ml keményítős főzővizet.",
"Forgasd a szószba az olívabogyót és a kapribogyót, majd a lecsepegtetett tonhalat. Óvatosan keverd, hogy a hal nagyobb darabokban maradjon; csak 2–3 percig melegítsd.",
"Add a leszűrt pennét a szószhoz, önts hozzá először 100 ml főzővizet, és 1–2 percig forgasd össze. Szükség szerint adj még hozzá főzővizet, hogy szaftos legyen.",
"Vedd le a tűzről, keverd bele a citromlevet, opcionálisan a 20 g vajat. Kóstold meg és csak ezután sózd.",
"Tálald friss bazsalikommal és ízlés szerinti reszelt parmezánnal."
];
const notes=[
"Alapmennyiség: 500 g száraz penne · 5 bőséges adag · kb. 30–35 perc.",
"A három konzervből kb. 390 g lecsepegtetett tonhallal számolunk; mindig a tényleges címke szerinti lecsepegtetett tömeg az irányadó.",
"A tonhalat a végén add a mártáshoz: a hosszú főzéstől kiszáradhat és széteshet.",
"A 100–200 ml félretett tésztafőzővíz biztosítja a selymes, nem száraz állagot.",
"Az olívabogyó, kapribogyó, füstölt paprika és vaj opcionális ízfokozók, nem szükségesek az alaprecepthez.",
"Ételfotó: Alexandra Tran / Unsplash, illusztráció. A tényleges étel megjelenése eltérhet.",
"A tápérték csak a ténylegesen felhasznált márkák és mennyiségek alapján számolható pontosabban; az opcionális hozzávalókat külön kezeld."
];
const recipe={
 id,
 title:"Mediterrán, paradicsomos tonhalas penne",
 category:"Tészták",
 file:"https://images.unsplash.com/photo-1603220026645-e0fdf221b1e8?auto=format&fit=crop&w=1200&q=85",
 mime:"image/jpeg",
 originalName:"Mediterrán tonhalas penne · Alexandra Tran (Unsplash)",
 studioData:{
  title:"Mediterrán, paradicsomos tonhalas penne",
  category:"Tészták",
  servings:"5 fő",
  time:"35 perc",
  difficulty:"könnyű",
  ingredients,steps,notes
 }
};
if(!window.LENA_RECIPES.some(r=>r.id===id))window.LENA_RECIPES.push(recipe);
window.LENA_READABLE=window.LENA_READABLE||{};
window.LENA_READABLE[id]={status:"verified",source:"lena_recipe_studio_curated",ingredients,steps,notes};
})();
