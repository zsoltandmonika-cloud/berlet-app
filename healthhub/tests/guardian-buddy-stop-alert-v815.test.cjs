'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.resolve(__dirname,'../guardian');
const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
const C=require('../guardian/guardian-buddy-stop-core-v815.js');

test('v815 Buddy editor sits within the existing Studio with manual start/stop and test',()=>{
 const html=read('index.html');
 assert.ok(html.indexOf('id="hhArrivalStudio"')<html.indexOf('id="hhStopAlertStudioV815"'));
 assert.ok(html.indexOf('id="hhStopAlertStudioV815"')<html.indexOf('id="guardianFamilyPanel"'));
 for(const id of ['hhStopModeV815','hhStopRouteV815','hhStopDirectionV815','hhStopTargetV815','hhStopWatchV815',
  'hhStopTextV815','hhStopLeaveTextV815','hhStopStartV815','hhStopStopV815','hhStopTestV815',
  'hhStopPopupV815','hhStopStatusV815','hhStopSaveV815']) assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/guardian-buddy-stop-core-v815\.js\?v=815/);
 assert.match(html,/guardian-buddy-stop-alert-v815\.js\?v=815/);
 assert.match(html,/guardian-buddy-stop-alert-v815\.css\?v=815/);
 assert.match(html,/Figyelem, a beállított célállomás következik!/);
 assert.match(html,/Mónika, ideje elindulni a Citronella utcai megállóhoz!/);
 assert.match(html,/csak a látható, aktív Edge-oldalon/i);
});
test('official BKK 260 Citronella and 17/19 stop order are source validated',()=>{
 const full=JSON.parse(read('bkk-routes-v790.json'));
 const now=Date.parse(full.generatedAt)+60_000;
 const r=C.validateRoutes(full,now);
 assert.ok(r);
 for(const line of ['17','19','260']) assert.ok(r[line].variants.length>=2);
 const bus=r['260'].variants.find(v=>v.headsign==='Harsánylejtő');
 assert.ok(bus);
 const end=bus.stops.findIndex(s=>s.name==='Citronella utca');
 assert.ok(end>1);
 const preceding=C.leadStop(bus,bus.stops[end].id);
 assert.equal(preceding.id,bus.stops[end-1].id);
 assert.ok(C.distance(bus.stops[end],preceding)>0);
 const lead17=C.leadStop(r['17'].variants[0],r['17'].variants[0].stops[5].id);
 assert.equal(lead17.id,r['17'].variants[0].stops[4].id);
 assert.equal(C.leadStop(r['17'].variants[0],r['17'].variants[0].stops[0].id),null);
 assert.equal(C.validateRoutes({...full,source:'untrusted'},now),null);
 assert.equal(C.validateRoutes(full,now+15*86400000),null);
});
test('GPS trigger rejects stale or inaccurate fixes and requires actual approach',()=>{
 const now=Date.UTC(2026,9,25,9,0,0);
 const valid={timestamp:now-1000,coords:{latitude:47.55,longitude:19.04,accuracy:12}};
 assert.ok(C.currentFix(valid,now));
 assert.equal(C.currentFix({...valid,timestamp:now-21000},now),null);
 assert.equal(C.currentFix({...valid,coords:{...valid.coords,accuracy:120}},now),null);
 assert.equal(C.detection(null,40),false);
 assert.equal(C.detection(180,190),false);
 assert.equal(C.detection(180,85),true);
 assert.equal(C.detection(125,70),false);
 assert.equal(C.detection(180,103),false);
});
test('live 260 signal requires the intended headsign, identity and fresh verified position',()=>{
 const now=Date.UTC(2026,9,25,9,0,0);
 const source={routeId:'260',id:'live-example-id',headsign:'Harsánylejtő',
  timestamp:new Date(now-2000).toISOString(),lat:47.55,lng:19.04};
 assert.ok(C.liveBus(source,'Harsánylejtő',now));
 assert.equal(C.liveBus({...source,routeId:'19'},'Harsánylejtő',now),null);
 assert.equal(C.liveBus({...source,headsign:'Óbudai rendelőintézet'},'Harsánylejtő',now),null);
 assert.equal(C.liveBus({...source,id:''},'Harsánylejtő',now),null);
 assert.equal(C.liveBus({...source,timestamp:new Date(now-91000).toISOString()},'Harsánylejtő',now),null);
});
test('live snapshots only enter Buddy from verified BKK event, never static map geometry',()=>{
 const pilot=read('guardian-live-pilot-v793.js');
 const guardian=read('guardian.js');
 const alerts=read('guardian-buddy-stop-alert-v815.js');
 const core=read('guardian-buddy-stop-core-v815.js');
 assert.match(pilot,/hh-bkk-live-verified-v815/);
 assert.match(pilot,/validator\.validate\(data\)/);
 assert.match(guardian,/HH_BUDDY_STOP_ALERT_V815\?\.onGpsFix/);
 assert.match(alerts,/w\.addEventListener\('hh-bkk-live-verified-v815',onVehicles\)/);
 assert.match(alerts,/d\.addEventListener\('visibilitychange'/);
 assert.match(alerts,/w\.addEventListener\('pagehide',\(\)=>stop\(\)\)/);
 assert.match(alerts,/get\('hhStopModeV815'\)/);
 assert.match(alerts,/const KEY='hh-buddy-stop-alert-v815'/);
 assert.match(alerts,/const LEAVE='Mónika, ideje elindulni a Citronella utcai megállóhoz!'/);
 assert.match(alerts,/get\('hhTransitProfileV791'\)/);
 assert.match(alerts,/function announce\(/);
 assert.match(alerts,/function onGps\(/);
 assert.match(alerts,/function onVehicles\(/);
 assert.doesNotMatch(alerts,/navigator\.geolocation|fetch\(|ACCESS_BACKGROUND_LOCATION|Notification\.requestPermission/);
 assert.doesNotMatch(core,/supabase|fetch\(|watchPosition|sendBeacon/);
});
