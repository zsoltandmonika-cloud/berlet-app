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
 assert.ok(html.includes('guardian-smart-hub-fields-v806.js?v=806-fields-b'));
 assert.ok(html.includes('guardian-smart-hub-network-v806.js?v=806-network-a'));
 assert.ok(html.includes('guardian-smart-hub-router-v804.js?v=806-network-a'));
 assert.match(js,/router\.setJourney\(state\.origin,state\.destination\)/);
 assert.match(js,/hh-smart-arrival-favorite-places-v806-/);
 assert.match(html,/Kevesebb várakozás · később/);
 assert.match(css,/hh-smart-hub-swap-v806/);
 assert.ok(html.includes('hhBkkCatalogV801'));
 assert.ok(html.includes('hhSmartHubGuideV805'));
});
