const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const bkk=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/bkk');
const source=fs.readFileSync(path.join(bkk,'index.html'),'utf8'),concept=fs.readFileSync(path.join(bkk,'grand-concept/index.html'),'utf8');
test('BKK Grand Concept is standalone and preserves live BKK flows',()=>{
 for(const x of ['id="favoriteRoutes"','id="routeSearch"','id="bkkPdfOverlay"','hh-bkk-route-favorites-v801','guardian/?sh9Transit=1'])assert.ok(source.includes(x));
 assert.match(concept,/<title>SH9 · BKK Grand Control Concept V3<\/title>/);
 assert.match(concept,/src="\.\.\/bkk-hero-approved\.webp"/);
 assert.match(concept,/href="\.\.\/" class="back"/);
 assert.doesNotMatch(concept,/fetch\(|XMLHttpRequest|supabase\.co|setInterval\(|geolocation\./);
});
test('BKK concept repeats MÁV/Volán five-button structure and three mode planner',()=>{
 assert.equal((concept.match(/<button[^>]*data-concept=/g)||[]).length>=5,true);
 for(const s of ['Útvonal','Menetrend','Kedvencek','Élő járművek','Jegyek ↗'])assert.ok(concept.includes(s));
 assert.equal((concept.match(/data-mode="(?:now|depart|arrive)"/g)||[]).length,3);
 for(const id of ['profile','from','to','date','time','swap','find'])assert.match(concept,new RegExp('id="'+id+'"'));
 assert.match(concept,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(concept,/background:var\(--panel\)/);
 assert.match(concept,/href="\.\.\/\.\.\/\.\.\/\.\.\/"[^>]*>/);
});
test('Preview actions are visibly staged and script parses',()=>{
 assert.match(concept,/dizájn-előnézet, a bekötés a következő fázisban/);
 assert.match(concept,/még nem élő adatok/);
 const inline=concept.match(/<script>\s*(\(function\(\)\{'use strict';[\s\S]*?\}\)\(\);)\s*<\/script>/)?.[1];
 assert.ok(inline,'inline concept script');
 assert.doesNotThrow(()=>new vm.Script(inline));
});
