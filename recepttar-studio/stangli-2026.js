(function(){
const id="lena-magos-teljes-kiorlesu-stangli-2026";
if(!Array.isArray(window.LENA_RECIPES))return;
const ingredients=[
"500 g Czelli Malom magos kenyérlisztkeverék",
"320–350 ml langyos víz (a csomagolás útmutatójához igazítva)",
"7 g instant élesztő, csak ha a keverék nem tartalmaz",
"1 evőkanál olívaolaj (opcionális)",
"Só, csak ha a keverék nem tartalmaz",
"2–3 evőkanál tökmag, napraforgómag és szezámmag a tetejére"
];
const steps=[
"Ellenőrizd a Czelli keverék hátoldalán, tartalmaz-e élesztőt és sót. A csomagolás szerinti vízmennyiséget vedd alapul.",
"Keverd össze a keveréket a szükséges élesztővel, a vízzel és opcionálisan az olívaolajjal. Dagaszd 8–10 percig, amíg puha, kissé tapadós lesz.",
"Letakarva, langyos helyen keleszd 45–60 percig, amíg láthatóan megemelkedik.",
"Oszd a tésztát 8 részre, formázz 18–20 cm-es stanglikat. Enyhén nedvesítsd meg a tetejüket, és szórd meg magokkal.",
"Sütőpapíron pihentesd még 25–30 percig. Közben melegítsd elő a sütőt 220 °C-ra, alsó-felső sütésre.",
"Az előmelegített sütő aljába tegyél egy hőálló edényt forró vízzel. Süsd a stanglikat 10 percig 220 °C-on, majd 10–15 percig 200 °C-on, aranybarnára.",
"Rácson hagyd kihűlni, hogy a héj ropogós maradjon."
];
const notes=[
"8 közepes stangli · összesen körülbelül 2 óra · sütés: 20–25 perc.",
"A Czelli termék 48% teljes kiőrlésű lisztet tartalmaz, nem 100%-os teljes kiőrlésű liszt.",
"A keverék összetétele döntő: ne adj hozzá automatikusan több élesztőt vagy sót.",
"Magvakkal dúsítva több rostot és telítetlen zsírt tartalmazhat, de a kalóriaérték is nő.",
"Kihűlés után lefagyasztható, sütőben újraropogósítható."
];
const recipe={id,title:"Magos, teljes kiőrlésű stangli",category:"Kenyerek, Pékárú",file:"recipes/Lena_Magos_Stangli_2026.svg",mime:"image/svg+xml",originalName:"Léna magos stangli receptkártya.svg",studioData:{title:"Magos, teljes kiőrlésű stangli",category:"Kenyerek, Pékárú",servings:"8 stangli",time:"kb. 2 óra",difficulty:"könnyű",ingredients,steps,notes}};
if(!window.LENA_RECIPES.some(r=>r.id===id))window.LENA_RECIPES.push(recipe);
window.LENA_READABLE=window.LENA_READABLE||{};
window.LENA_READABLE[id]={status:"verified",source:"lena_recipe_studio_curated",ingredients,steps,notes};
})();