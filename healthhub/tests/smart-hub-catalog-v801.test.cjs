const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const catalog=require('../guardian/guardian-bkk-catalog-v801.js');
const read=p=>fs.readFileSync(path.join(__dirname,'../guardian',p),'utf8');
function fixture(){
 return {schemaVersion:1,source:'BKK Zrt., CC BY 4.0',
  generatedAt:new Date().toISOString(),
  feedType:'GTFS static route catalog (NOT real-time)',
  routes:[
   {id:'260',mode:'bus',name:'Óbuda',gtfsRouteIds:['2600'],directions:['Testvérhegy']},
   {id:'17',mode:'tram',name:'Villamos',gtfsRouteIds:['3170'],directions:['Bécsi út']},
   {id:'19',mode:'tram',name:'Villamos',gtfsRouteIds:['3190'],directions:['Kelenföld']},
   {id:'H5',mode:'hev',name:'Szentendre',gtfsRouteIds:['H5'],directions:['Batthyány tér']},
   {id:'70',mode:'trolley',name:'Trolibusz',gtfsRouteIds:['70'],directions:['Kossuth tér']}
 ]};
}
test('v801 accepts only official fresh BKK source and all supported modes',()=>{
 const doc=catalog.validate(fixture());
 assert.equal(doc.routes.length,5);
 assert.equal(catalog.validate({...fixture(),source:'unverified'}),null);
 assert.equal(catalog.validate({...fixture(),generatedAt:'2020-01-01T00:00:00Z'}),null);
 assert.equal(catalog.validate({...fixture(),routes:[]}),null);
 assert.equal(catalog.validate({...fixture(),routes:fixture().routes.filter(r=>r.id!=='260')}),null);
});
test('v801 finds routes by number and accent-insensitive headsign',()=>{
 const lines=catalog.validate(fixture()).routes;
 assert.deepEqual(catalog.search(lines,'H5').map(x=>x.id),['H5']);
 assert.deepEqual(catalog.search(lines,'obuda').map(x=>x.id),['260']);
 assert.deepEqual(catalog.search(lines,'becsi').map(x=>x.id),['17']);
 assert.deepEqual(catalog.search(lines,'', 'trolley').map(x=>x.id),['70']);
 assert.deepEqual(catalog.search(lines,'','hev').map(x=>x.id),['H5']);
});
test('v801 is on canonical Guardian page, keeps visible map baseline and per-profile choices',()=>{
 const html=read('index.html'),js=read('guardian-transit-v791.js');
 const ui=read('guardian-bkk-catalog-v801.js'),css=read('guardian-bkk-catalog-v801.css');
 assert.match(html,/hhBkkCatalogV801/);
 assert.match(html,/hhBkkCatalogSearchV801/);
 assert.match(html,/guardian-bkk-catalog-v801\.js\?v=814-watchlist/);
 assert.match(html,/guardian-bkk-catalog-v801\.css\?v=801-catalog-a/);
 assert.match(js,/hh-guardian-transit-selected-profiles-v801/);
 assert.match(js,/toggleLine\(id,enabled\)/);
 assert.match(ui,/hh-bkk-route-favorites-v801/);
 assert.match(ui,/Kedvenc · térképes bővítés később/);
 assert.match(css,/min-height:44px/);
 assert.match(html,/id="hhTransitRoute260"/);
 assert.match(html,/guardian-transit-v791\.js\?v=816-watchlist-live/);
 assert.doesNotMatch(html,/hh-transit-sheet-grip|hhTransitDetails/);
});

test('v801.1 distinguishes bus 19 from tram 19 in favorites and map integration',()=>{
 assert.equal(catalog.keyOf({mode:'bus',id:'19'}),'bus:19');
 assert.equal(catalog.keyOf({mode:'tram',id:'19'}),'tram:19');
 assert.notEqual(catalog.keyOf({mode:'bus',id:'19'}),catalog.keyOf({mode:'tram',id:'19'}));
 const src=read('guardian-bkk-catalog-v801.js');
 assert.match(src,/FEATURED=new Set\(\['bus:260','tram:17','tram:19'\]\)/);
 assert.match(src,/updateCore\(key,enabled\)/);
 assert.match(src,/toggleFavorite\(route.id,route.mode\)/);
 const original=read('guardian-transit-v791.js');
 assert.match(original,/toggleLine\(id,enabled\)/);
});
