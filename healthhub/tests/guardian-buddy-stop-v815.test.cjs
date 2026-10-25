'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../guardian');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const core=require(path.join(base,'guardian-buddy-stop-core-v815.js'));
const sample=JSON.parse(read('bkk-routes-v790.json'));
const now=Date.parse(sample.generatedAt)+1000;
const r=core.validateRoutes(sample,now);

test('BKK original 260,17,19 stop sequence validated, never invented',()=>{
 assert.ok(r);
 assert.equal(r['260'].variants.find(v=>v.headsign==='Harsánylejtő').stops.at(-1).name,'Citronella utca');
 assert.ok(r['17'].variants.some(v=>v.stops.length>30));
 assert.equal(core.validateRoutes({...sample,source:'other'},now),null);
 assert.equal(core.validateRoutes({...sample,generatedAt:'garbage'},now),null);
});

test('the target stop triggers exactly one preceding stop, not itself',()=>{
 const seq=r['260'].variants.find(v=>v.headsign==='Óbudai rendelőintézet');
 const goal=seq.stops.find(x=>x.name==='Laborc utca');
 assert.equal(core.leadStop(seq,goal.id).name,'Orbán Balázs út');
 assert.equal(core.leadStop(seq,seq.stops[0].id),null);
 assert.equal(core.leadStop(seq,'not-a-stop'),null);
});

test('browser GPS requires a recent precise fix, rejects cached GPS',()=>{
 const pos=(ts,accuracy=10)=>({timestamp:ts,coords:{latitude:47.55,longitude:19.01,accuracy}});
 assert.ok(core.currentFix(pos(100000),110000));
 assert.equal(core.currentFix(pos(100000),121000),null);
 assert.equal(core.currentFix(pos(100000,80),110000),null);
 assert.equal(core.currentFix(pos(1000000),110000),null);
 assert.equal(core.currentFix({timestamp:100000,coords:{latitude:999,longitude:19,accuracy:8}},110000),null);
});

test('strict approach: fresh crossing from OUTSIDE radius only, not already at stop',()=>{
 assert.equal(core.detection(180,80),true);
 assert.equal(core.detection(50,40),false);
 assert.equal(core.detection(null,40),false);
 assert.equal(core.detection(180,145),false);
 assert.equal(core.detection(190,220),false);
});

test('Mónika departure requires two sequential verified fixes moving along selected direction',()=>{
 const stopA={lat:47.55,lng:19.05};
 const stopB={lat:47.55,lng:19.054};
 const x=step=>({lat:47.55,lng:19.05+step*.004, timestamp:step*15000+500000});
 assert.equal(core.directionalApproach(x(.1),x(.86),stopA,stopB),true);
 assert.equal(core.directionalApproach(x(.86),x(.1),stopA,stopB),false);
 assert.equal(core.directionalApproach(x(.86),x(.95),stopA,stopB),false);
 assert.equal(core.directionalApproach(x(.1),x(.86),stopB,stopA),false);
 assert.equal(core.directionalApproach(x(.1),x(.86),stopA,stopA),false);
 assert.equal(core.directionalApproach(x(.1),{...x(.86),timestamp:200000},stopA,stopB),false);
});

test('BKK validator does not require absent server headsign, but rejects other route/stale',()=>{
 const b={id:'real-bus-id',routeId:'260',lat:47.55,lng:19.05,timestamp:new Date(1000000).toISOString()};
 assert.ok(core.liveBus(b,1020000));
 assert.equal(core.liveBus({...b,routeId:'17'},1020000),null);
 assert.equal(core.liveBus(b,1200000),null);
 assert.equal(core.liveBus({...b,lat:200},1020000),null);
});

test('Studio UX, privacy boundaries and shared existing verified data feeds',()=>{
 const html=read('index.html'),ui=read('guardian-buddy-stop-alert-v815.js');
 const guardian=read('guardian.js'),live=read('guardian-live-pilot-v793.js');
 for(const s of ['hhStopAlertStudioV815','hhStopRouteV815','hhStopDirectionV815','hhStopTargetV815',
 'hhStopModeV815','hhStopWatchV815','hhStopStartV815','hhStopStopV815','hhStopTestV815',
 'hhStopTextV815','hhStopLeaveTextV815','hhStopPopupV815']){
  assert.match(html,new RegExp('id="'+s+'"'));
 }
 assert.match(html,/Figyelem, a beállított célállomás következik!/);
 assert.match(html,/guardian-buddy-stop-core-v815\.js\?v=815/);
 assert.match(html,/guardian-buddy-stop-alert-v815\.js\?v=815/);
 assert.match(guardian,/HH_BUDDY_STOP_ALERT_V815\.onGpsFix\(pos\)/);
 assert.match(live,/hh-bkk-live-verified-v815/);
 assert.match(ui,/HH_GUARDIAN_LIVE_V785\?\.boundProfile/);
 assert.match(ui,/profile\(\)!=='monika'/);
 assert.match(ui,/directionalApproach/);
 assert.match(ui,/function stop\(message\)/);
 assert.match(ui,/d\.addEventListener\('visibilitychange'/);
 assert.match(ui,/w\.addEventListener\('pagehide'/);
 assert.match(ui,/hh-bkk-live-verified-v815/);
 assert.match(ui,/function store\(/);
 assert.doesNotMatch(ui,/watchPosition|navigator\.geolocation|localStorage\.setItem\([^)]*coord|fetch\([^)]*Supabase|serviceWorker\.showNotification/);
});
