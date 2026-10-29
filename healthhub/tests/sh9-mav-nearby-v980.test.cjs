'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav');
const core=require(path.join(base,'rail-gtfs-core-v1.js'));
const nearby=require(path.join(base,'rail-nearby-v980.js'));
const script=fs.readFileSync(path.join(base,'rail-nearby-v980.js'),'utf8');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const css=fs.readFileSync(path.join(base,'rail-nearby-v980.css'),'utf8');
function fixture(){
 return {schema:'sh9-mav-gtfs-v1',timezone:'Europe/Budapest',
  generatedAt:'2026-10-29T12:00:00Z',rightsConfirmed:false,localOnly:true,source:'MÁV GTFS privát',
  stops:[['keleti','Budapest-Keleti',47.500278,19.084167],
   ['nyugati','Budapest-Nyugati',47.510833,19.0575],
   ['misk','Miskolc-Tiszai',48.098719,20.810916]],
  services:{daily:{from:'20261001',to:'20261130',days:'1111111',exceptions:{}},
   friday:{from:'20261001',to:'20261130',days:'0000100',exceptions:{}},
   cancelled:{from:'20261001',to:'20261130',days:'1111111',exceptions:{'20261030':2}}},
  trips:[
   {id:'ic586',service:'daily',route:'IC 586 TOKAJ',headsign:'Miskolc',
    stops:[['keleti',975,975],['misk',1120,1120]]},
   {id:'sajo',service:'friday',route:'15406 SAJÓ',headsign:'Kazincbarcika',
    stops:[['keleti',1015,1015],['misk',1170,1170]]},
   {id:'cancel',service:'cancelled',route:'TEST CANCELLED',headsign:'Miskolc',
    stops:[['keleti',1030,1030],['misk',1150,1150]]},
   {id:'later',service:'daily',route:'V 543',headsign:'Miskolc',
    stops:[['keleti',1060,1060],['misk',1200,1200]]}
  ]};
}
const geo={lat:47.500278,lng:19.084167};
const when=(day,minute)=>core.wallEpoch(day,minute);
test('Private GTFS with verified coordinates remains accepted by existing engine',()=>{
 const feed=fixture();
 assert.ok(core.validate(feed,{allowPrivate:true}));
 assert.equal(core.validate(feed),null);
 assert.equal(nearby.nextTrains({...feed,localOnly:false},core,geo,when('2026-10-30',972)).status,'invalid');
});
test('Nearby station discovery uses actual coordinates and distance radius',()=>{
 assert.equal(nearby.meters(geo.lat,geo.lng,geo.lat,geo.lng),0);
 assert.deepEqual(nearby.nearbyStations(fixture(),geo,750).map(x=>x.name),['Budapest-Keleti']);
 assert.equal(nearby.nearbyStations(fixture(),geo,500).length,1);
 assert.equal(nearby.nearbyStations(fixture(),{lat:47.1,lng:18.4},500).length,0);
});
test('Friday SAJÓ and daily IC are chronological, exceptions never fabricated',()=>{
 const q=nearby.nextTrains(fixture(),core,geo,when('2026-10-30',972),{radius:750,limit:10});
 assert.equal(q.status,'ok');assert.deepEqual(q.rows.map(x=>x.service),[
  'IC 586 TOKAJ','15406 SAJÓ','V 543']);
 assert.ok(q.rows.every((row,i,list)=>!i||row.departure>=list[i-1].departure));
 assert.ok(q.rows.every(row=>row.live===false&&row.platform===null&&row.delayMinutes===null));
});
test('Non-Friday search never claims Friday-only direct SAJÓ',()=>{
 const q=nearby.nextTrains(fixture(),core,geo,when('2026-10-29',972),{radius:750});
 assert.equal(q.status,'ok');
 assert.ok(q.rows.every(x=>x.service!=='15406 SAJÓ'));
});
test('RAG thresholds are conservative and walking time is explicitly estimated',()=>{
 const now=when('2026-10-30',972);
 const example={walkMinutes:2};
 assert.equal(nearby.catchability({...example,departure:now+3*60000},now).state,'red');
 assert.equal(nearby.catchability({...example,departure:now+5*60000},now).state,'amber');
 assert.equal(nearby.catchability({...example,departure:now+9*60000},now).state,'green');
 assert.ok(nearby.estimateWalk(1300)>=26);
});
test('A short result list includes an actually catchable later train when imminent ones are red',()=>{
 const q=nearby.nextTrains(fixture(),core,geo,when('2026-10-30',972),{radius:750,limit:10});
 assert.equal(nearby.catchability(q.rows[0],when('2026-10-30',972)).state,'red');
 assert.ok(q.rows.some(x=>nearby.catchability(x,when('2026-10-30',972)).state==='green'));
});
test('No station near GPS fix produces an honest empty state',()=>{
 const result=nearby.nextTrains(fixture(),core,{lat:47.1,lng:18.4},
  when('2026-10-30',972),{radius:750});
 assert.equal(result.status,'no-nearby');assert.equal(result.rows.length,0);
});
test('Only explicit Quick Search clicks read GPS, and no background requests occur',()=>{
 assert.match(script,/button\.addEventListener\('click',search\)/);
 assert.match(script,/g\.getCurrentPosition\(/);
 assert.doesNotMatch(script,/watchPosition\(|setInterval\(|\bfetch\(|supabase\.from\(/);
 assert.match(script,/getDataset\?\.\(\)/);
 assert.match(script,/Előbb töltsd be a MÁV GTFS-adatfájlt/);
 assert.match(script,/Töltsd be a v980-as GPS-menetrend JSON-fájlját/);
});
test('MÁV page is wired with source and styles, v979 remains available',()=>{
 assert.match(html,/rail-nearby-v980\.js\?v=980-nearest-trains-on-demand/);
 assert.match(html,/rail-nearby-v980\.css\?v=980-geo-rag/);
 assert.match(html,/rail-station-board-v979\.js/);
 assert.match(html,/rail-private-gtfs-v2\.js/);
 assert.match(css,/min-height:48px/);
 assert.match(css,/data-reach="green"/);
 assert.match(css,/data-reach="amber"/);
 assert.match(css,/data-reach="red"/);
});
