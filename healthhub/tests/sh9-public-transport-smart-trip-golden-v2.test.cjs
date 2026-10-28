const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../../sh9/smart-travel/public-transport');
const page=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'public-transport-smart-trip-golden-v2.css'),'utf8');
const js=fs.readFileSync(path.join(root,'public-transport-smart-trip-v1.js'),'utf8');
const guardian=fs.readFileSync(path.resolve(root,'../../../healthhub/guardian/guardian-bkk-grand-handoff-v1.js'),'utf8');

test('Public Transport has four real Golden Glass entries and approved family artwork',()=>{
 assert.deepEqual([...page.matchAll(/data-service="([^"]+)"/g)].map(x=>x[1]),['bkk','mav','volan']);
 assert.equal((page.match(/class="transport-choice /g)||[]).length,4);
 assert.match(page,/src="\.\/public-transport-grand-hero-v2\.avif\?v=2"/);
 assert.match(page,/id="smartTripOpen"/);
 assert.match(page,/aria-expanded="false"/);
 assert.match(page,/id="smartTripPanel"/);
 assert.doesNotMatch(page,/<a class="poster-hit /);
});

test('Smart Trip reproduces MÁV/Volán planner geometry and controls',()=>{
 for(const id of ['smartTripFrom','smartTripDestination','smartTripDate','smartTripTime','smartTripSwap','smartTripSearch','smartTripSave','smartTripJourneys','smartTripSchedule','smartTripForm']){
  assert.ok(page.includes('id="'+id+'"'),id+' must exist');
 }
 assert.equal((page.match(/data-trip-mode="(?:now|depart|arrive)"/g)||[]).length,3);
 assert.match(css,/grid-template-columns:42% 58%/);
 assert.match(css,/grid-template-columns:58\.9% minmax\(0,1fr\)/);
 assert.match(css,/height:62px/);
 assert.match(css,/grid-template-columns:2\.25fr 1fr/);
 assert.match(css,/grid-template-columns:1fr 1fr/);
 assert.match(page,/Indulás most/);
 assert.match(page,/Indulás ekkor/);
 assert.match(page,/Érkezés ekkor/);
 assert.match(page,/Utazás mentése/);
 assert.match(page,/Utazásaim/);
});

test('Smart Trip supports optional origin, local per-profile saves and no keyboard on open',()=>{
 assert.match(page,/id="smartTripFrom"[^>]+placeholder="Indulási hely/);
 assert.match(page,/id="smartTripDestination"[^>]+required/);
 assert.match(js,/storePrefix\+profile\(\)/);
 assert.match(js,/localStorage\.setItem/);
 assert.match(js,/saved\.hidden=true/);
 assert.match(js,/const a=from\.value;from\.value=to\.value;to\.value=a/);
 assert.match(js,/no \.focus\(\) on input/);
 assert.match(js,/setMode\('now'\)/);
 assert.match(js,/setMode\('depart'\)/);
 assert.doesNotThrow(()=>new vm.Script(js));
});

test('Only a user search sends one bounded local handoff to existing Guardian planner',()=>{
 assert.match(js,/source:'sh9-public-transport-smart-trip-v1'/);
 assert.match(js,/sessionStorage\.setItem\(handoffKey/);
 assert.match(js,/location\.assign\('\.\.\/\.\.\/\.\.\/healthhub\/guardian\/#hhSmartHubDestinationV802'\)/);
 assert.match(guardian,/sh9-public-transport-smart-trip-v1/);
 assert.match(guardian,/sessionStorage\.removeItem\(KEY\)/);
 assert.match(guardian,/Date\.now\(\)-d\.created>600000/);
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|setInterval\(|navigator\.geolocation|supabase\.|watchPosition/);
 assert.doesNotThrow(()=>new vm.Script(guardian));
});

test('No invented cross-provider AI routes or schedules',()=>{
 assert.match(page,/A MÁV és Volán adatkapcsolatok után/);
 assert.match(page,/automatikus BKK \+ MÁV \+ Volán összehasonlítás még nem él/);
 assert.doesNotMatch(page,/14:15|18:05|3 óra 50 perc|230 km/);
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|supabase\.|geolocation|setInterval/);
});
