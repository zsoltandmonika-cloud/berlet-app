const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav');
const adapter=require(path.join(base,'rail-google-routes-v1.js'));
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const bridge=fs.readFileSync(path.join(base,'rail-google-bridge-v1.js'),'utf8');
const config=fs.readFileSync(path.join(base,'rail-google-config-v1.js'),'utf8');
const journey=fs.readFileSync(path.join(base,'rail-journeys-v2.js'),'utf8');
const q={from:'Budapest-Keleti',to:'Kazincbarcika',mode:'arrive',when:'2026-10-30T17:55:00.000Z'};
const routes={routes:[{legs:[{steps:[
 {travelMode:'WALK',staticDuration:'180s'},
 {travelMode:'TRANSIT',transitDetails:{stopDetails:{departureStop:{name:'Budapest-Keleti'},arrivalStop:{name:'Miskolc-Tiszai'},departureTime:'2026-10-30T14:55:00Z',arrivalTime:'2026-10-30T16:45:00Z'},headsign:'Miskolc',transitLine:{name:'InterCity',nameShort:'IC 5506',vehicle:{type:'LONG_DISTANCE_TRAIN'},agencies:[{name:'MÁV'}]}}},
 {travelMode:'TRANSIT',transitDetails:{stopDetails:{departureStop:{name:'Miskolc-Tiszai'},arrivalStop:{name:'Kazincbarcika'},departureTime:'2026-10-30T16:55:00Z',arrivalTime:'2026-10-30T17:45:00Z'},headsign:'Kazincbarcika',transitLine:{name:'Regional train',nameShort:'IR 123',vehicle:{type:'COMMUTER_TRAIN'},agencies:[{name:'MÁV'}]}}}
]}]}]};
test('B Plan Google Routes uses real arrival and departure API fields, NEVER both',()=>{
 let req=adapter.request(q);
 assert.equal(req.travelMode,'TRANSIT');
 assert.equal(req.arrivalTime,q.when);
 assert.equal(req.departureTime,undefined);
 assert.deepEqual(req.transitPreferences.allowedTravelModes,['RAIL','TRAIN']);
 req=adapter.request({...q,mode:'depart'});
 assert.equal(req.departureTime,q.when);
 assert.equal(req.arrivalTime,undefined);
 assert.equal(adapter.request({...q,from:'Keleti',to:'Keleti'}),null);
 assert.equal(adapter.request({...q,when:'invalid'}),null);
});
test('Google transit steps become honest train journey legs, no invented delays or platforms',()=>{
 const out=adapter.normalizeResponse(routes,q,new Date('2026-10-28T14:00:00Z'));
 assert.equal(out.status,'ok');
 assert.equal(out.source,'Google Routes API · Google Maps');
 assert.equal(out.attribution,'© Google Maps');
 assert.equal(out.journeys.length,1);
 assert.equal(out.journeys[0].legs.length,2);
 assert.equal(out.journeys[0].legs[0].service,'IC 5506');
 assert.equal(out.journeys[0].legs[1].to,'Kazincbarcika');
 assert.equal(out.journeys[0].durationMinutes,170);
 assert.equal(out.journeys[0].transfers,1);
 assert.equal(out.journeys[0].live,false);
 assert.equal(out.journeys[0].platform,null);
 assert.equal(out.journeys[0].delayMinutes,null);
 const busOnly={routes:[{legs:[{steps:[{...routes.routes[0].legs[0].steps[1],transitDetails:{...routes.routes[0].legs[0].steps[1].transitDetails,transitLine:{vehicle:{type:'BUS'}}}}]}]}]};
 assert.equal(adapter.normalizeResponse(busOnly,q).journeys.length,0);
});
test('Google B Plan requires backend key and explicit approval; no speculative spend',()=>{
 assert.match(config,/enabled:false/);
 assert.match(config,/endpoint:''/);
 assert.match(config,/maxRequestsPerSession:6/);
 assert.match(bridge,/cfg\?\.enabled!==true/);
 assert.match(bridge,/supabase\\\.co/);
 assert.match(bridge,/count>=max/);
 assert.match(bridge,/cooldown/);
 assert.match(bridge,/credentials:'omit'/);
 assert.doesNotMatch(html,/AIza[0-9A-Za-z_-]{30,}/);
 assert.doesNotMatch(config,/AIza[0-9A-Za-z_-]{30,}/);
 assert.doesNotMatch(bridge,/\bsetInterval\(|navigator\.geolocation|supabase\.from/);
 assert.match(html,/rail-google-bridge-v1\.js/);
 assert.match(journey,/© Google Maps/);
});
test('B Plan gives immediate user benefits independent of GTFS grant',()=>{
 assert.match(html,/id="rail-popular-stations"/);
 for(const station of ['Budapest-Keleti','Miskolc-Tiszai','Kazincbarcika'])
   assert.match(html,new RegExp('<option value="'+station+'"'));
 assert.match(fs.readFileSync(path.join(base,'rail-personal-v607.js'),'utf8'),/rail-favorite-choice/);
 assert.match(html,/Kedvenc útvonal betöltve/);
 assert.match(html,/localStorage\.setItem\('hh-profile',profile\)/);
 assert.match(html,/bottom:9px;left:6px;width:45px/);
 assert.match(html,/rail-golden-glass-v3/);
 assert.match(html,/id="signal" class="sound"/);
});
