const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const bkk=path.join(root,'sh9/smart-travel/public-transport/bkk');
const concept=fs.readFileSync(path.join(bkk,'grand-concept/index.html'),'utf8');
const wire=fs.readFileSync(path.join(bkk,'grand-concept/bkk-grand-wiring-v1.js'),'utf8');
const bridge=fs.readFileSync(path.join(root,'healthhub/guardian/guardian-bkk-grand-handoff-v1.js'),'utf8');
const publicTransport=fs.readFileSync(path.join(root,'sh9/smart-travel/public-transport/index.html'),'utf8');
const guardian=fs.readFileSync(path.join(root,'healthhub/guardian/index.html'),'utf8');
const legacy=fs.readFileSync(path.join(bkk,'index.html'),'utf8');

test('Launcher opens wired BKK V3; legacy BKK remains preserved and accessible',()=>{
 assert.match(publicTransport,/data-service="bkk" href="\.\/bkk\/grand-concept\/"/);
 assert.match(concept,/href="\.\.\/" title="Korábbi BKK Smart Control felület"/);
 assert.match(concept,/class="back" aria-label="Vissza a Public Transport kezdőoldalra"/);
 for(const id of ['favoriteRoutes','routeSearch','bkkPdfOverlay'])assert.ok(legacy.includes('id="'+id+'"'));
 assert.match(concept,/bkk-grand-wiring-v1\.js/);
 assert.match(concept,/bkk-grand-wiring-v1\.css/);
});
test('All BKK Grand buttons route through existing services; no fake live data or extra polling',()=>{
 for(const action of ['Menetrend','Kedvencek','Élő járművek','Jegyek','Megállói indulások','Utazás mentése','Utazásaim','Forgalmi információk'])assert.ok(wire.includes("'"+action+"'"));
 for(const link of ['#allLines','#favorites','?sh9Transit=1','https://bkk.hu/jegyek-es-berletek/','https://bkk.hu/bkk-info/'])assert.ok(wire.includes(link));
 assert.match(wire,/sh9-bkk-grand-journeys-v1-/);
 assert.match(wire,/sessionStorage\.setItem\(HANDOFF/);
 assert.doesNotMatch(wire,/fetch\(|XMLHttpRequest|setInterval\(|supabase\.|geolocation\.|watchPosition\(/);
 assert.doesNotMatch(concept,/14:15|18:05|230 km|960/);
 assert.doesNotThrow(()=>new vm.Script(wire));
});
test('Planner handoff is an explicit, one-shot same-origin prefill with no auto route start',()=>{
 assert.match(guardian,/guardian-bkk-grand-handoff-v1\.js\?v=1/);
 assert.match(bridge,/window\.location\.hash!=='#hhSmartHubDestinationV802'/);
 assert.match(bridge,/sessionStorage\.removeItem\(KEY\)/);
 assert.match(bridge,/Date\.now\(\)-d\.created>600000/);
 assert.match(bridge,/hhSmartHubFromV806/);
 assert.match(bridge,/hhSmartHubToV806/);
 assert.match(bridge,/hhPlannerDateV939/);
 assert.match(bridge,/Válaszd ki a megállót vagy címet/);
 assert.doesNotMatch(bridge,/fetch\(|XMLHttpRequest|setInterval\(|supabase|geolocation|watchPosition\(/);
 assert.doesNotThrow(()=>new vm.Script(bridge));
});
test('Saved BKK journeys remain profile-specific and local, with clear UI controls',()=>{
 assert.match(concept,/id="bkkGrandTrips"/);
 assert.match(concept,/id="bkkGrandTripList"/);
 assert.match(concept,/id="bkkGrandTripsClose"/);
 assert.match(wire,/STORE\+profile\(\)/);
 assert.match(wire,/MAX_SAVED=40/);
 assert.match(wire,/localStorage\.setItem/);
 assert.match(wire,/Nem lehet azonos|nem lehet azonos/);
 assert.doesNotMatch(wire,/fetch\(|Supabase/);
});
