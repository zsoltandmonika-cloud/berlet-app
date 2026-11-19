'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const bridge=fs.readFileSync(path.join(root,'taxi-family-favorites-bridge-v1.js'),'utf8');
const fare=fs.readFileSync(path.join(root,'taxi-route-v8-fare-map.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const places=[
 {displayName:'Otthon',name:'Budapest, Kocsis Sándor út 6/a',subtitle:'Testvérhegy',lat:47.588,lng:19.037},
 {displayName:'Mónika munkahelye',name:'Budapest, Bécsi út 123',subtitle:'Bécsi Corner',lat:47.539,lng:19.03},
 {displayName:'Otthon másolat',name:'Budapest, Kocsis Sándor út 6/a',lat:47.588,lng:19.037},
 {displayName:'Hiányos',name:'Budapest, rossz koordináta',lat:NaN,lng:19.02}
];
function start(items=places){
 const w={HH_TRAVEL_FAVORITES_V972:{favoritePlaces:()=>items,sync:()=>Promise.resolve(true)}};
 vm.runInNewContext(bridge,{window:w,Math,Number,Array,Object,String,Promise});
 return w.SHO_TAXI_FAVORITES_V1;
}
test('Saved Family Guard / Smart Trip favorites are directly usable as coordinate-verified Taxi locations',()=>{
 const api=start();const found=api.find('',40);
 assert.equal(found.length,2,'Coordinates are deduplicated and invalid favorites are excluded');
 assert.equal(found[0].displayName,'Otthon');
 assert.equal(found[0].label,'Budapest, Kocsis Sándor út 6/a');
 assert.deepEqual(JSON.parse(JSON.stringify(found[0].location)),{lat:47.588,lng:19.037});
 assert.equal(found[0].favorite,true);
 assert.equal(found[1].displayName,'Mónika munkahelye');
 assert.equal(api.find('MONIKA')[0].displayName,'Mónika munkahelye');
 assert.equal(api.find('becsi')[0].displayName,'Mónika munkahelye');
 assert.equal(api.find('testverhegy')[0].displayName,'Otthon');
 assert.equal(api.find('nem létező').length,0);
 assert.equal(api.find('',1).length,1);
 assert.doesNotThrow(()=>new vm.Script(bridge));
});
test('Shared family source is optional: no cache mutation or made-up addresses when disconnected',async()=>{
 assert.equal(start([]).find('').length,0);
 assert.equal(start(null).find('').length,0);
 const w={};vm.runInNewContext(bridge,{window:w,Math,Number,Array,Object,String,Promise});
 assert.equal(w.SHO_TAXI_FAVORITES_V1.find('Otthon').length,0);
 assert.equal(await w.SHO_TAXI_FAVORITES_V1.sync(),false);
 assert.doesNotMatch(bridge,/localStorage|setSlots|\.upsert\(|\.insert\(|geolocation|getCurrentPosition|setInterval/);
});
test('Taxi has native predictive address lookup AND immediate favorites suggestions for both fields',()=>{
 assert.match(html,/guardian-family-favorites-v972\.js\?v=20261119-taxi-shared-favorites-v1/);
 assert.match(html,/taxi-family-favorites-bridge-v1\.js\?v=20261119-taxi-shared-favorites-v1/);
 assert.ok(html.indexOf('guardian-family-favorites-v972.js')<html.indexOf('taxi-family-favorites-bridge-v1.js'));
 assert.ok(html.indexOf('taxi-family-favorites-bridge-v1.js')<html.indexOf('taxi-route-v8-fare-map.js'));
 assert.match(fare,/id="txFromFav" type="button" aria-controls="txFromSug"/);
 assert.match(fare,/\.tx-sugs\{margin:3px 0 0;padding:0;list-style:none;background:#17152b;border-radius:11px;overflow-x:hidden;overflow-y:auto/);
 assert.match(fare,/id="txToFav" type="button" aria-controls="txToSug"/);
 assert.equal((fare.match(/<span class="tx-favorite-star" aria-hidden="true">★<\/span> Kedvencek<\/button>/g)||[]).length,2,'Both favorite icons remain pink vector text rather than yellow emoji');
 assert.match(fare,/#taxiRouteV2 \.tx-favorite\{[\s\S]*?color:#f4b6ea;border-radius:9px/);
 assert.match(fare,/#taxiRouteV2 \.tx-favorite-star\{color:#f4b6ea/);
 assert.doesNotMatch(fare,/>⭐ Kedvencek<\/button>/);
 assert.match(fare,/render\(favoriteMatches\('',40\),'Kedvenceim',40\)/);
 assert.match(fare,/if\(q\.length<3\)\{[\s\S]*?const local=favoriteMatches\(q,7\)/);
 assert.match(fare,/render\(mergedSuggestions\(q,ans\.suggestions\|\|\[\]\),ans\.source,7\)/);
 assert.match(fare,/if\(instant\.length\)render\(favoriteMatches\(q,7\),'Kedvenceim',7\)/);
 assert.match(fare,/\[\.\.\.favorites,\.\.\.\(Array\.isArray\(online\)\?online:\[\]\)\]/);
 assert.match(fare,/input\.value=s\.label;data\[name\]=\{label:s\.label/);
 assert.match(fare,/const x=await request\(\{action:'estimate',from,to\}\)/);
 assert.match(fare,/window\.SHO_TAXI_RESULT_MAP_V1\?\.tadaa\?\.\(\)/);
 assert.match(fare,/window\.SHO_TAXI_RESULT_MAP_V1\?\.show\?\./);
 assert.match(html,/data-action="uber">Uber rendelés ↗/);
 assert.doesNotThrow(()=>new vm.Script(fare));
});
