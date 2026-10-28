const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav');
const core=require(path.join(base,'rail-gtfs-core-v1.js'));
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const config=fs.readFileSync(path.join(base,'rail-gtfs-config-v1.js'),'utf8');
const bridge=fs.readFileSync(path.join(base,'rail-gtfs-bridge-v1.js'),'utf8');
function feed(){
 return {schema:'sh9-mav-gtfs-v1',timezone:'Europe/Budapest',
 generatedAt:'2026-10-28T10:00:00Z',rightsConfirmed:true,source:'Synthetic TEST feed, never ship',
 stops:[['A','Budapest-Keleti'],['H','Miskolc-Tiszai'],['B','Kazincbarcika vasútállomás'],['N','Budapest-Nyugati']],
 services:{
  wd:{from:'20261001',to:'20261130',days:'1111100',exceptions:{'20261030':2}},
  holiday:{from:'20261001',to:'20261130',days:'0000000',exceptions:{'20261031':1}}
 },
 trips:[
  {id:'direct',service:'wd',route:'IC 5506',headsign:'Kazincbarcika',stops:[['A',1015,1015],['H',1095,1096],['B',1165,1165]]},
  {id:'transfer-1',service:'wd',route:'IR 302',headsign:'Miskolc',stops:[['A',1040,1040],['H',1120,1120]]},
  {id:'transfer-2',service:'wd',route:'S 410',headsign:'Kazincbarcika',stops:[['H',1130,1130],['B',1175,1175]]},
  {id:'overnight',service:'wd',route:'E 909',headsign:'Kazincbarcika',stops:[['A',1505,1505],['B',1590,1590]]},
  {id:'holiday-only',service:'holiday',route:'H 111',headsign:'Kazincbarcika',stops:[['A',800,800],['B',850,850]]}
 ]};
}
function q(when,mode='depart'){return {from:'Budapest-Keleti pályaudvar',to:'Kazincbarcika',when,mode}}
test('snapshot import schema accepts only licensed, bounded, safe, normalized source',()=>{
 const good=feed();
 assert.ok(core.validate(good));
 assert.equal(core.validate({...good,rightsConfirmed:false}),null);
 assert.equal(core.validate({...good,timezone:'Europe/London'}),null);
 assert.equal(core.validate({...good,stops:[]}),null);
 assert.equal(core.validate({...good,trips:[{...good.trips[0],stops:[['A',10,5],['B',15,16]]}]}),null);
 assert.deepEqual(core.stationIds(core.validate(good),'Budapest-Keleti pályaudvar'),['A']);
 assert.deepEqual(core.stationIds(core.validate(good),'Kazincbarcika'),['B']);
});
test('calendar weekdays, removal, added holiday and midnight GTFS 25-hour service',()=>{
 const wd=feed().services.wd,holiday=feed().services.holiday;
 assert.equal(core.serviceActive(wd,'2026-10-28'),true);
 assert.equal(core.serviceActive(wd,'2026-10-30'),false);
 assert.equal(core.serviceActive(wd,'2026-10-31'),false);
 assert.equal(core.serviceActive(holiday,'2026-10-31'),true);
 assert.equal(core.serviceActive(holiday,'2026-10-28'),false);
 assert.equal(new Date(core.wallEpoch('2026-10-28',1505)).toISOString(),'2026-10-29T00:05:00.000Z');
 assert.equal(new Date(core.wallEpoch('2026-10-28',1590)).toISOString(),'2026-10-29T01:30:00.000Z');
 assert.equal(new Date(core.wallEpoch('2026-10-25',210)).toISOString(),'2026-10-25T02:30:00.000Z');
});
test('departure-now/depart/arrive searches find real direct and transfer itineraries',()=>{
 const f=feed();
 const go=core.route(f,q('2026-10-28T14:50:00Z','depart'),{limit:3});
 assert.equal(go.status,'ok');
 assert.equal(go.journeys.length,3);
 assert.equal(go.journeys[0].legs[0].tripId,'direct');
 assert.equal(go.journeys[0].durationMinutes,150);
 assert.ok(go.journeys.some(x=>x.transfers===1));
 assert.ok(go.journeys.every(x=>x.platform===null&&x.delayMinutes===null&&!x.live));
 const arrive=core.route(f,q('2026-10-28T18:40:00Z','arrive'),{limit:3});
 assert.equal(arrive.status,'ok');
 assert.ok(arrive.journeys.length>=2);
 assert.equal(arrive.journeys[0].arrival,'2026-10-28T18:35:00.000Z');
 const tomorrow=core.route(f,q('2026-10-28T22:50:00Z','depart'),{limit:3});
 assert.equal(tomorrow.journeys[0].legs[0].tripId,'overnight');
 assert.equal(tomorrow.journeys[0].arrival,'2026-10-29T01:30:00.000Z');
});
test('GTFS filters services and rejects absent stations without forging matches',()=>{
 const f=feed();
 assert.equal(core.route(f,q('2026-10-30T14:50:00Z')).journeys.length,0);
 const missing=core.route(f,{...q('2026-10-28T14:50:00Z'),from:'Szeged'});
 assert.equal(missing.status,'station-not-in-feed');
 const holiday=core.route(f,q('2026-10-31T11:15:00Z'));
 assert.equal(holiday.journeys[0].legs[0].tripId,'holiday-only');
});
test('GTFS UI integration is opt-in, same-origin, on-demand, bounded, and leaves Golden shell alone',()=>{
 assert.match(config,/enabled:false/);
 assert.match(config,/url:'\.\/data\/rail-schedule\.json'/);
 assert.match(config,/maxBytes:8\*1024\*1024/);
 assert.match(bridge,/if\(!cfg\?\.enabled\|\|!engine\|\|!ui\?\.showTimetable\)return/);
 assert.match(bridge,/const request=fetch\(cfg.url/);
 assert.match(bridge,/const buffer=await response.arrayBuffer\(\)/);
 assert.match(bridge,/if\(buffer.byteLength>cfg.maxBytes\)/);
 assert.doesNotMatch(bridge,/\bsetInterval\(|navigator\.geolocation|supabase\.co|credentials:'include'/);
 for(const file of ['rail-gtfs-config-v1.js','rail-gtfs-core-v1.js','rail-gtfs-bridge-v1.js'])assert.match(html,new RegExp(file.replaceAll('.','\\.')));
 assert.match(html,/rail-golden-glass-v3/);
 assert.match(html,/mav-hero-approved\.webp/);
 assert.match(html,/bottom:9px;left:6px;width:45px/);
 assert.match(html,/id="signal" class="sound"/);
 assert.match(fs.readFileSync(path.join(base,'rail-journeys-v2.js'),'utf8'),/showTimetable/);
});
