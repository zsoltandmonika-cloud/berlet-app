'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const multi=require('../../sh9/smart-travel/public-transport/smart-trip/smart-trip-multimodal-v1073.js');
const view=require('../../sh9/smart-travel/public-transport/smart-trip/smart-trip-result-v1072.js');
const html=read('sh9/smart-travel/public-transport/smart-trip/index.html');
const ui=read('sh9/smart-travel/public-transport/smart-trip/smart-trip-ai-v1022.js');
const runtime=read('sh9/smart-travel/public-transport/smart-trip/smart-trip-multimodal-runtime-v1073.js');
const cfg=read('sh9/smart-travel/public-transport/smart-trip/smart-trip-multimodal-config-v1073.js');
const iso=(m=0)=>new Date(Date.now()+3600000+m*60000).toISOString();
const query=()=>({from:'Testvérhegy lakókert',to:'Bécsi Corner',mode:'depart',when:iso(),priority:'balanced'});
function route({service='260',agency='BKK Zrt.',type='BUS',depart=10,arrive=22}={}){
 return {travelMode:'TRANSIT',transitDetails:{
  stopDetails:{departureTime:iso(depart),arrivalTime:iso(arrive),
   departureStop:{name:'Vörösvári út'},arrivalStop:{name:'Kolosy tér'}},
  transitLine:{nameShort:service,agencies:[{name:agency}],vehicle:{type}},
  headsign:'Kolosy tér'
 }};
}
const walk=(s,m)=>({travelMode:'WALK',staticDuration:s+'s',distanceMeters:m});
const payload=(steps)=>({routes:[{legs:[{steps}]}]});
test('official Google transit request covers bus, metro, rail, tram and uses one time mode',()=>{
 const q=query(),r=multi.request(q,{origin:{lat:47.515,lng:19.028,name:q.from}});
 assert.equal(r.travelMode,'TRANSIT');
 assert.deepEqual(r.transitPreferences.allowedTravelModes,['BUS','SUBWAY','TRAIN','LIGHT_RAIL']);
 assert.equal(r.departureTime,q.when);assert.equal(r.arrivalTime,undefined);
 assert.equal(r.origin.location.latLng.latitude,47.515);
 assert.equal(r.destination.address,q.to);
 assert.equal(r.computeAlternativeRoutes,true);
 const arrive=multi.request({...q,mode:'arrive',priority:'transfers'});
 assert.ok(arrive.arrivalTime);assert.equal(arrive.departureTime,undefined);
 assert.equal(arrive.transitPreferences.routingPreference,'FEWER_TRANSFERS');
 assert.equal(multi.request({...q,from:q.to}),null);
 assert.equal(multi.request({...q,when:'tomorrow'}),null);
});
test('free Google Maps URL is only a verified official transit handoff, no unsupported date',()=>{
 const q=query();
 const u=new URL(multi.mapsUrl(q,{destination:{name:q.to,lat:47.5201,lng:19.0375}}));
 assert.equal(u.origin,'https://www.google.com');
 assert.equal(u.pathname,'/maps/dir/');
 assert.equal(u.searchParams.get('travelmode'),'transit');
 assert.equal(u.searchParams.get('destination'),'47.5201,19.0375');
 assert.equal(u.searchParams.get('origin'),q.from);
 assert.equal(u.searchParams.has('departure_time'),false);
 assert.equal(u.searchParams.has('arrival_time'),false);
 const other=multi.mapsUrl({...q,to:'Pályaudvar'},{destination:{name:'Régi hely',lat:1,lng:1}});
 assert.equal(new URL(other).searchParams.get('destination'),'Pályaudvar');
});
test('real walking distance/duration combined with actual BKK schedule creates full door-to-door route',()=>{
 const steps=[walk(240,260),route(),walk(300,320)];
 const result=multi.normalizeRoutes(payload(steps),query());
 assert.equal(result.length,1);
 const j=result[0];
 assert.equal(j.segments.length,3);
 assert.equal(j.doorToDoor,true);
 assert.equal(j.segments[0].kind,'walk');
 assert.equal(j.segments[0].distanceMeters,260);
 assert.equal(Date.parse(j.segments[0].arrival),Date.parse(iso(10)));
 assert.equal(Date.parse(j.segments[0].departure),Date.parse(iso(6)));
 assert.equal(Date.parse(j.segments[2].departure),Date.parse(iso(22)));
 const prepared=multi.verifiedPackage(payload(steps),query(),view);
 assert.ok(prepared);assert.equal(prepared.items[0].doorToDoor,true);
 assert.equal(prepared.items[0].walkingMeters,580);
 assert.equal(prepared.items[0].walkingMinutes,9);
 assert.equal(prepared.items[0].segments[1].brand,'bus');
 assert.equal(prepared.source.name,'Google Maps · tömegközlekedési útvonal');
 assert.equal(prepared.items[0].stars,5);
});
test('multiple approach walks are sequential, with no overlap or fake wait',()=>{
 const steps=[walk(180,200),walk(120,130),route(),walk(180,200)];
 const result=multi.normalizeRoutes(payload(steps),query())[0];
 assert.ok(result);
 assert.equal(Date.parse(result.segments[0].departure),Date.parse(iso(5)));
 assert.equal(Date.parse(result.segments[0].arrival),Date.parse(iso(8)));
 assert.equal(Date.parse(result.segments[1].departure),Date.parse(iso(8)));
 assert.equal(Date.parse(result.segments[1].arrival),Date.parse(iso(10)));
});
test('real multimodal BKK + Volan + MAV sequences preserve operators and transfers',()=>{
 const steps=[
  walk(120,150),
  route({agency:'BKK',service:'17',type:'TRAM',depart:10,arrive:25}),
  walk(180,180),
  route({agency:'Volánbusz',service:'1010',type:'BUS',depart:30,arrive:55}),
  walk(60,70),
  route({agency:'MÁV-START',service:'IC 504',type:'TRAIN',depart:57,arrive:90}),
  walk(240,350)
 ];
 const res=multi.normalizeRoutes(payload(steps),query());
 assert.equal(res.length,1);
 const prepared=multi.verifiedPackage(payload(steps),query(),view);
 assert.ok(prepared);
 const j=prepared.items[0];
 assert.equal(j.transfers,2);
 assert.equal(j.segments.filter(x=>x.kind==='ride').map(x=>x.brand).join('/'),'tram/volan/mav');
 assert.equal(j.walkingMeters,750);
 assert.ok(j.stars<=4);
});
test('invalid, missing or contradictory upstream steps never show a real result',()=>{
 const invalid=[
  [walk(240,NaN),route(),walk(300,300)],
  [{travelMode:'WALK',distanceMeters:200},route(),walk(300,300)],
  [walk(240,200),{...route(),transitDetails:{stopDetails:{departureTime:'broken'}}},walk(300,300)],
  [walk(240,200),route({depart:10,arrive:20}),route({depart:19,arrive:30}),walk(180,200)],
  [walk(240,200)],
  [{travelMode:'DRIVE'},route()],
 ];
 for(const steps of invalid){
  assert.equal(multi.normalizeRoutes(payload(steps),query()).length,0,JSON.stringify(steps));
 }
 assert.equal(multi.verifiedPackage({routes:[]},query(),view),null);
 assert.equal(multi.normalizeRoutes({routes:[{legs:[{steps:[route()]},{steps:[route()]}]}]},query()).length,0);
});
test('gated runtime is default-off, never leaks keys or calls paid Google endpoint automatically',()=>{
 assert.match(cfg,/enabled:false/);
 assert.match(cfg,/billingApproved:false/);
 assert.match(cfg,/termsApproved:false/);
 assert.match(runtime,/getSession/);
 assert.match(runtime,/Bearer /);
 assert.match(runtime,/hh-guardian-family-auth-v785/);
 assert.match(runtime,/credentials:'omit'/);
 assert.match(runtime,/maxRequestsPerSession/);
 assert.match(runtime,/redirect:'error'/);
 assert.doesNotMatch(runtime,/routes\.googleapis\.com|X-Goog-Api-Key/);
 assert.doesNotMatch(cfg,/sk-[_\w]+|AIza[\w-]+/);
 assert.match(html,/smart-trip-multimodal-v1073\.js/);
 assert.match(html,/smart-trip-multimodal-runtime-v1073\.js/);
 assert.match(html,/id="st22ExternalTrip"/);
 assert.match(html,/id="st22ExternalNote"/);
 assert.match(ui,/multiGateway\.search\(/);
 assert.match(ui,/multiModel\?\.mapsUrl\?\.\(snapshot\(\),local\)/);
 assert.match(ui,/w\.location\.assign\(url\)/);
});
