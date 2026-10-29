'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav');
const core=require(path.join(base,'rail-gtfs-core-v1.js'));
const page=fs.readFileSync(path.join(base,'index.html'),'utf8');
const importer=fs.readFileSync(path.join(base,'rail-private-gtfs-v2.js'),'utf8');
const view=fs.readFileSync(path.join(base,'rail-journeys-v2.js'),'utf8');
const css=fs.readFileSync(path.join(base,'rail-smart-route-v981.css'),'utf8');
function feed(){
 return {schema:'sh9-mav-gtfs-v1',timezone:'Europe/Budapest',
 source:'MÁV GTFS local',generatedAt:'2026-10-29T08:00:00Z',
 rightsConfirmed:false,localOnly:true,
 stops:[['K','Budapest-Keleti'],['M','Miskolc-Tiszai'],['C','Kazincbarcika']],
 services:{
  friday:{from:'20261001',to:'20261130',days:'0000100',exceptions:{}},
  daily:{from:'20261001',to:'20261130',days:'1111111',exceptions:{}}
 },
 trips:[
  {id:'sajo',service:'friday',route:'15406 SAJÓ',headsign:'Kazincbarcika',
   stops:[['K',1015,1015],['M',1140,1140],['C',1168,1168]]},
  {id:'tokaj',service:'daily',route:'IC 586 TOKAJ',headsign:'Miskolc',
   stops:[['K',1045,1045],['M',1167,1167]]},
  {id:'late',service:'daily',route:'VESz 5428',headsign:'Kazincbarcika',
   stops:[['M',1230,1230],['C',1270,1270]]}
 ]};
}
const q={from:'Budapest-Keleti',to:'Kazincbarcika',
 when:'2026-10-30T15:50:00.000Z',mode:'depart'};
test('Authorized private feed stays local and cannot be treated as public',()=>{
 assert.equal(core.route(feed(),q,{ranking:'recommended'}).status,'invalid-feed');
 assert.equal(core.route(feed(),q,{ranking:'recommended',localOnly:true}).status,'ok');
});
test('Friday direct SAJÓ beats same-departure slower transfer, but TOKAJ remains',()=>{
 const source=feed();
 const before=core.route(source,q,{localOnly:true,limit:10});
 assert.equal(before.journeys.length,3);
 const result=core.route(source,q,{localOnly:true,ranking:'recommended',limit:60});
 assert.equal(result.status,'ok');
 assert.equal(result.dominatedRemoved,1);
 assert.equal(result.totalJourneys,2);
 assert.equal(result.journeys.length,2);
 const [first,second]=result.journeys;
 assert.equal(first.legs[0].service,'15406 SAJÓ');
 assert.equal(first.transfers,0);
 assert.equal(first.arrival,'2026-10-30T18:28:00.000Z');
 assert.equal(second.legs[0].service,'IC 586 TOKAJ');
 assert.equal(second.transfers,1);
});
test('Friday-only SAJÓ excluded on Thursday',()=>{
 const thursday=core.route(feed(),{...q,when:'2026-10-29T15:50:00.000Z'},{
  localOnly:true,ranking:'recommended',limit:60});
 assert.equal(thursday.status,'ok');
 assert.equal(thursday.journeys.some(j=>j.legs.some(l=>l.service==='15406 SAJÓ')),false);
});
test('Same departure alternatives with earlier arrival but more changes can coexist',()=>{
 const time='2026-10-30T16:00:00Z';
 const j=(id,arrival,transfers)=>({departure:time,arrival,transfers,
  durationMinutes:Math.round((Date.parse(arrival)-Date.parse(time))/60000),
  legs:[{tripId:id,service:id}]});
 const fastChanging=j('A','2026-10-30T18:20:00Z',1);
 const slowerDirect=j('B','2026-10-30T18:50:00Z',0);
 const dominated=j('C','2026-10-30T19:40:00Z',1);
 const r=core.rankJourneys([dominated,slowerDirect,fastChanging],q);
 assert.equal(r.journeys.length,2);
 assert.equal(r.journeys.includes(fastChanging),true);
 assert.equal(r.journeys.includes(slowerDirect),true);
 assert.equal(r.journeys.includes(dominated),false);
});
test('All five UI sort options operate purely in browser without refetch',()=>{
 const result=core.route(feed(),q,{localOnly:true,ranking:'recommended',limit:60});
 const modes=['recommended','earliest','arrival','duration','transfers'];
 for(const ranking of modes){
  const s=core.rankJourneys(result.journeys,q,{ranking}).journeys;
  assert.equal(s.length,result.journeys.length);
 }
 assert.match(view,/rail-route-controls-v981/);
 assert.match(view,/rail-route-more-v981/);
 assert.match(view,/rail-route-sort-v981/);
 assert.match(view,/Összes útvonal/);
 assert.match(view,/rankJourneys\(all,q,\{ranking:sort\.value\}\)/);
});
test('v981 frontend enabled without changing v979/v980 or Dropbox sync scopes',()=>{
 assert.match(page,/rail-smart-route-v981\.css\?v=981/);
 assert.match(page,/rail-gtfs-core-v1\.js\?v=981/);
 assert.match(page,/rail-journeys-v2\.js\?v=981/);
 assert.match(page,/rail-private-gtfs-v2\.js\?v=981/);
 assert.match(page,/rail-station-board-v979\.js/);
 assert.match(page,/rail-nearby-v980\.js/);
 assert.match(importer,/ranking:'recommended'/);
 assert.match(importer,/limit:60/);
});
test('No extra fetch/GPS/polling and Golden Standard 46/48px tap controls',()=>{
 assert.doesNotMatch(css,/url\(/);
 assert.doesNotMatch(view,/setInterval\(|watchPosition\(/);
 assert.match(css,/min-height:46px/);
 assert.match(css,/min-height:48px/);
});
