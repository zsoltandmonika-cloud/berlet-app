const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const bkk=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/bkk');
const source=fs.readFileSync(path.join(bkk,'index.html'),'utf8'),concept=fs.readFileSync(path.join(bkk,'grand-concept/index.html'),'utf8');
test('BKK Grand Concept is standalone and preserves live BKK flows',()=>{
 for(const x of ['id="favoriteRoutes"','id="routeSearch"','id="bkkPdfOverlay"','hh-bkk-route-favorites-v801','guardian/?sh9Transit=1'])assert.ok(source.includes(x));
 assert.match(concept,/<title>SH9 · BKK Grand Control V3<\/title>/);
 assert.match(concept,/src="\.\/assets\/bkk-hero-final-approved-v2\.webp\?v=2"/);
 assert.match(concept,/href="\.\.\/\.\.\/" class="back"/);
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
test('BKK Grand V3 buttons are wired, local script parses and unverified departures stay absent',()=>{
 assert.match(concept,/bkk-grand-wiring-v1\.js/);
 assert.doesNotMatch(concept,/BKK · kapcsolt szolgáltatások|Golden Glass · MÁV és Volán dizájnstandard/);
 assert.doesNotMatch(concept,/dizájn-előnézet, a bekötés a következő fázisban/);
 const inline=concept.match(/<script>\s*(\(function\(\)\{'use strict';[\s\S]*?\}\)\(\);)\s*<\/script>/)?.[1];
 assert.ok(inline,'inline concept script');
 assert.doesNotThrow(()=>new vm.Script(inline));
});


test('Exact carbon-copy shell: MÁV dimensions and glass tokens are reused unchanged',()=>{
 const mav=fs.readFileSync(path.resolve(bkk,'../mav/index.html'),'utf8');
 const parity=fs.readFileSync(path.join(bkk,'grand-concept/golden-carbon-parity-v1.css'),'utf8');
 for(const token of ['.hero{height:clamp(289px,76.2vw,346px)',
                      '.quick{margin:0 3px 9px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr))',
                      '.planner{margin:0 5px 9px;padding:8px 7px 9px',
                      '.phead{display:grid;grid-template-columns:42% 58%',
                      '.routebox{display:grid;grid-template-columns:58.9% 1fr',
                      '.datetime{min-width:0;height:62px',
                      '.bottom{grid-template-columns:repeat(5,minmax(0,1fr));height:calc(60px']){
  assert.ok(mav.includes(token),'MÁV canonical style: '+token);
  assert.ok(parity.includes(token),'BKK carbon-copy style: '+token);
 }
 for(const id of ['id="app"','id="planner"','id="depart"','id="profile"'])
  assert.match(concept,new RegExp(id));
 for(const cls of ['class="hero-img"','class="stationfields"','class="route-rail"','class="rail-journey-quick"'])
  assert.ok(concept.includes(cls));
 assert.match(concept,/href="\.\/golden-carbon-parity-v1\.css"/);
});
test('Volán 53px service-card sizing retained for BKK concept',()=>{
 const volan=fs.readFileSync(path.resolve(bkk,'../volan/index.html'),'utf8');
 const parity=fs.readFileSync(path.join(bkk,'grand-concept/golden-carbon-parity-v1.css'),'utf8');
 assert.match(volan,/\.volan-bus-card\{height:53px;display:grid;grid-template-columns:80px minmax\(0,1fr\) 20px/);
 assert.match(parity,/\.service\{height:53px;display:grid;grid-template-columns:80px minmax\(0,1fr\) 20px/);
 assert.equal((concept.match(/class="service"/g)||[]).length,3);
});

test('Golden Shell keeps all five top actions, six utility controls, three services and five taskbar links',()=>{
 const quick=concept.match(/<section class="quick"[\s\S]*?<\/section>/)?.[0];
 const utils=concept.match(/<div class="utils"[\s\S]*?<\/div>/)?.[0];
 const nav=concept.match(/<nav class="bottom"[\s\S]*?<\/nav>/)?.[0];
 assert.ok(quick&&utils&&nav);
 assert.equal((quick.match(/<button /g)||[]).length,5);
 assert.equal((utils.match(/<button /g)||[]).length,6);
 assert.equal((nav.match(/<a /g)||[]).length,5);
 assert.equal((concept.match(/class="service"/g)||[]).length,3);
 assert.match(concept,/class="hero-img"/);
 assert.doesNotMatch(concept,/class="hero-badge"/);
 assert.match(concept,/class="back"[^>]+><svg/);
});
