const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const fields=require('../guardian/guardian-smart-hub-fields-v806.js');
const net=require('../guardian/guardian-smart-hub-network-v806.js');
const router=require('../guardian/guardian-smart-hub-router-v804.js');
const read=p=>fs.readFileSync(path.join(__dirname,'../guardian',p),'utf8');
const p=(name,lat,lng)=>({name,lat,lng,subtitle:'Budapest'});
const s=(id,name,lat,lng)=>[id,name,lat,lng];
const line=(id,stops,mode='bus')=>({id,mode,headsign:stops.at(-1)[1],direction:'0',stops});

test('v806 search is always two visible fields, swaps coordinates, validates one-tap places',()=>{
 const a=p('Bécsi Corner',47.52722,19.03805),b=p('Infopark',47.47,19.059);
 assert.deepEqual(fields.swapState({origin:a,destination:b}),{origin:b,destination:a});
 assert.deepEqual(fields.swapState({origin:a,destination:null}),{origin:null,destination:a});
 assert.equal(fields.queryText('  Bécsi Corner  '),'Bécsi Corner');
 assert.equal(fields.queryText('a'),null);
 assert.equal(fields.searchUrl('Bécsi Corner').includes('lang=hu'),false);
 assert.equal(fields.validPlace(a),true);
 assert.equal(fields.validPlace({...a,lat:NaN}),false);
 assert.equal(fields.validPlace({...a,lng:500}),false);
 const r=router.setJourney(a,b);
 assert.equal(r,true);
 assert.deepEqual(router.selection,{start:a,target:b});
 router.setJourney(null,b);
 assert.deepEqual(router.selection,{start:null,target:b});
 router.setJourney(b,a);
 assert.deepEqual(router.selection,{start:b,target:a});
});

test('v806 profile favorites use ten fixed slots and only verified coordinates',()=>{
 const slots=fields.blankSlots();
 assert.equal(slots.length,10);
 assert.equal(slots[0].label,'Otthon');
 assert.equal(slots[1].label,'Munkahely');
 assert.equal(slots[2].label,'Orvos');
 assert.equal(fields.slotLabel('  Saját rendelő  ',2),'Saját rendelő');
 assert.equal(fields.profileId({getItem(){return 'm'}}),'m');
 assert.equal(fields.profileId({getItem(){return 'z'}}),'z');
 const source=[{label:'Családi otthon',place:p('Cím',47.55,19.05)},
  {label:'Hibás',place:{name:'Nincs',lat:999,lng:19}}];
 const normalized=fields.normalizedSlots(source);
 assert.equal(normalized.length,10);
 assert.equal(normalized[0].label,'Családi otthon');
 assert.equal(normalized[0].place.name,'Cím');
 assert.equal(normalized[1].place,null);
});

test('v806 Photon suggestion selection uses source coordinates and no invented GPS',()=>{
 const raw={type:'FeatureCollection',features:[
  {type:'Feature',geometry:{type:'Point',coordinates:[19.0380536,47.5272224]},
   properties:{name:'Bécsi Corner',street:'Bécsi út',city:'Budapest',countrycode:'HU',osm_id:3370619,osm_type:'R'}},
  {geometry:{type:'Point',coordinates:[19.0380536,47.5272224]},
   properties:{name:'Bécsi Corner',street:'Bécsi út',city:'Budapest',osm_id:3370619,osm_type:'R'}}
 ]};
 const a=fields.normalizeResults(raw);
 assert.equal(a.length,1);
 assert.equal(a[0].name,'Bécsi Corner');
 assert.equal(a[0].lat,47.5272224);
 assert.match(a[0].subtitle,/Bécsi út/);
 const code=read('guardian-smart-hub-fields-v806.js');
 assert.match(code,/button.addEventListener\('click',\(\)=>selectPlace\(item,active\)\)/);
 assert.match(code,/syncRoutes\(\)/);
 assert.doesNotMatch(code,/geolocation\.getCurrentPosition|lang.*'hu'/);
});

test('v806 loads source-backed directed BKK graph and finds at least one connection',()=>{
 const raw={schemaVersion:1,source:'BKK Zrt., CC BY 4.0',generatedAt:new Date().toISOString(),routes:[
  line('260',[s('A','Start',47.5,19.0),s('X','Transfer',47.53,19.02)]),
  line('17',[s('X','Transfer',47.53,19.02),s('B','End',47.56,19.04)],'tram'),
  line('99',[s('N','Elsewhere',47.70,19.20),s('P','Far',47.71,19.21)])
 ]};
 const list=net.validate(raw,3);
 assert.equal(list.length,3);
 assert.equal(net.validate({...raw,source:'Fake'},3),null);
 assert.equal(net.validate({...raw,generatedAt:'2020-01-01'},3),null);
 const from=p('Start',47.5,19),to=p('End',47.56,19.04);
 const plans=net.plan(list,from,to);
 assert.ok(plans.length>0,'expected one true stop-graph connection');
 assert.deepEqual(plans[0].legs.map(x=>x.line.id),['260','17']);
 assert.equal(plans[0].transfer,1);
 assert.equal(plans[0].approach,0);
 assert.equal(plans[0].finish,0);
 assert.deepEqual(net.plan(list,to,from),[]);
});

test('v806 UI provides paired inputs, one-tap swap, favorites and guarded waiting status',()=>{
 const html=read('index.html'),css=read('guardian-smart-hub-v806.css'),
  js=read('guardian-smart-hub-fields-v806.js');
 for(const id of ['hhSmartHubFromV806','hhSmartHubToV806','hhSmartHubSwapV806',
  'hhSmartHubPlanV806','hhSmartHubFavoritesV806','hhSmartHubFavoriteRowsV806',
  'hhSmartHubPriorityWaitingV806'])
  assert.ok(html.includes(id),'Missing '+id);
 assert.ok(html.includes('guardian-smart-hub-fields-v806.js?v=825-script-parser-repair'));
 assert.ok(html.includes('guardian-smart-hub-network-v806.js?v=806-network-a'));
 assert.ok(html.includes('guardian-smart-hub-router-v804.js?v=806-network-a'));
 assert.match(js,/router\.setJourney\(state\.origin,state\.destination\)/);
 assert.match(js,/hh-smart-arrival-favorite-places-v806-/);
 assert.match(html,/Kevesebb várakozás · később/);
 assert.match(css,/hh-smart-hub-swap-v806/);
 assert.ok(html.includes('hhBkkCatalogV801'));
 assert.ok(html.includes('hhSmartHubGuideV805'));
});

test('v840 skips Telebusz 960 in ALL route recommendations, even if stale GTFS JSON still includes it',()=>{
 const raw={schemaVersion:1,source:'BKK Zrt., CC BY 4.0',generatedAt:new Date().toISOString(),routes:[
  line('960',[s('S','Otthon',47.50,19.00),s('T','Munkahely',47.53,19.03)]),
  line('260',[s('S','Otthon',47.50,19.00),s('X','Köztes',47.515,19.015),s('T','Munkahely',47.53,19.03)]),
  line('17',[s('Q','Tér',47.53,19.03),s('R','Vég',47.54,19.04)],'tram'),
  line('960A',[s('K','Alt',47.57,19.06),s('L','Alt vég',47.58,19.07)])
 ]};
 assert.equal(net.routeAllowed({id:'960'}),false);
 assert.equal(net.routeAllowed({id:' 960 '}),false);
 assert.equal(net.routeAllowed({id:'960A'}),true,'only the specifically disallowed 960 is affected');
 const valid=net.validate(raw,3);
 assert.ok(valid,'other BKK lines must remain available');
 assert.deepEqual(valid.map(x=>x.id),['260','17','960A']);
 const from=p('Otthon',47.50,19.00),to=p('Munkahely',47.53,19.03);
 const results=net.plan(valid,from,to);
 assert.ok(results.length>0,'a valid daytime alternate must remain');
 assert.equal(results[0].legs[0].line.id,'260');
 assert.equal(results.some(r=>r.legs.some(leg=>leg.line.id==='960')),false);
 // Even callers bypassing validation must not be able to route via 960.
 const direct=raw.routes.map(r=>({id:r.id,mode:r.mode,headsign:r.headsign,
  stops:r.stops.map(x=>({id:x[0],name:x[1],lat:x[2],lng:x[3]}))}));
 const graph=net.createGraph(direct);
 assert.ok(graph);
 assert.equal(graph.nodes.some(n=>n.line.id==='960'),false);
 assert.equal(net.plan(direct,from,to).some(r=>r.legs.some(l=>l.line.id==='960')),false);
 for(const preference of ['transfers','walking']){
  for(const [a,b] of [[from,to],[to,from]]){
   const options=net.plan(direct,a,b,preference);
   assert.ok(options.every(x=>x.legs.every(l=>l.line.id!=='960')));
  }
 }
 const routerSrc=read('guardian-smart-hub-router-v804.js');
 const html=read('index.html');
 assert.match(routerSrc,/\['960','917','917A'\]\.includes\(String\(leg\.line\.id\)\.trim\(\)\)/);
 assert.match(html,/guardian-smart-hub-network-v806\.js\?v=806-network-a&no960=840/);
 assert.match(html,/guardian-smart-hub-router-v804\.js\?v=806-network-a&no960=840/);
});

test('v840 Kolosy tér → Bécsi út / Vörösvári út recognizes 17, 19 and 41 tram alternatives to bus 260',()=>{
 // Exact matching BKK GTFS stop IDs/ordering; all 3 trams share the same
 // northbound stops. Route 917 exists ONLY as an overnight bus, not tram 17.
 const shared=[
  s('F00135','Kolosy tér',47.527983,19.037660),
  s('A1','Katinyi mártírok parkja',47.5312,19.0351),
  s('A2','Selmeci utca',47.5351,19.0320),
  s('A3','Szent Margit Kórház',47.539,19.0313),
  s('A4','Váradi utca',47.5435,19.0299),
  s('082200','Bécsi út / Vörösvári út',47.546762,19.029194),
  s('F00568','Bécsi út / Vörösvári út',47.548489,19.028994)
 ];
 const home=s('HOME','Otthon / 260',47.571,19.010);
 const raw={schemaVersion:1,source:'BKK Zrt., CC BY 4.0',
  generatedAt:new Date().toISOString(),routes:[
   line('17',shared,'tram'),line('19',shared,'tram'),line('41',shared,'tram'),
   line('260',[shared.at(-1),home],'bus'),
   line('917',[shared[0],shared.at(-1)],'bus'),
   line('917A',[shared[0],shared.at(-1)],'bus'),
   line('960',[shared.at(-1),home],'bus')
  ]};
 const verified=net.validate(raw,4);
 assert.ok(verified,'verified directed BKK patterns must load');
 assert.deepEqual(verified.map(x=>x.id),['17','19','41','260']);
 assert.equal(net.routeAllowed({id:'917',mode:'tram'}),false);
 assert.equal(net.routeAllowed({id:'917A',mode:'bus'}),false);
 assert.equal(net.routeAllowed({id:'960',mode:'bus'}),false);
 const from=p('Kolosy tér',47.527983,19.037660);
 const to=p('Otthon',47.571,19.010);
 for(const pref of ['transfers','walking']){
  const routes=net.plan(verified,from,to,pref);
  assert.equal(routes.length,3,'show 3 real tram options, no fake night lines');
  assert.deepEqual(routes.map(x=>x.legs.map(l=>l.line.id)),[
   ['17','260'],['19','260'],['41','260']
  ]);
  assert.ok(routes.every(x=>x.transfer===1));
  assert.ok(routes.every(x=>x.legs[0].line.mode==='tram'&&x.legs[1].line.mode==='bus'));
 }
 const testVariant=net.equivalentTramLegs({
  line:verified[0],enter:verified[0].stops[0],
  exit:verified[0].stops.at(-1),stopCount:6
 },verified);
 assert.deepEqual(testVariant.map(v=>v.line.id),['17','19','41']);
 // Names alone don't certify interchange routes: a stop-ID mismatch must NOT
 // create an invented line alternative, nor substitute a bus such as 917.
 const fake={...verified[1],stops:verified[1].stops.map(v=>({...v}))};
 fake.stops[2].id='DIFFERENT_PLATFORM';
 assert.deepEqual(net.equivalentTramLegs({
  line:verified[0],enter:verified[0].stops[0],
  exit:verified[0].stops.at(-1),stopCount:6
 },[verified[0],fake]),[{line:verified[0],enter:verified[0].stops[0],
   exit:verified[0].stops.at(-1),stopCount:6}]);
});
