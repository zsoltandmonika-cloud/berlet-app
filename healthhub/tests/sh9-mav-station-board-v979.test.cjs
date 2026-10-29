'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const base=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav');
const core=require(path.join(base,'rail-gtfs-core-v1.js'));
const {boardDepartures}=require(path.join(base,'rail-station-board-v979.js'));
const boardScript=fs.readFileSync(path.join(base,'rail-station-board-v979.js'),'utf8');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const cards=fs.readFileSync(path.join(base,'rail-journeys-v2.js'),'utf8');
const privateJS=fs.readFileSync(path.join(base,'rail-private-gtfs-v2.js'),'utf8');
const css=fs.readFileSync(path.join(base,'rail-station-board-v979.css'),'utf8');
function fixture(){
 return {schema:'sh9-mav-gtfs-v1',timezone:'Europe/Budapest',
  source:'Official MÁV GTFS · private local',generatedAt:'2026-10-29T08:00:00Z',
  rightsConfirmed:false,localOnly:true,
  stops:[['keleti','Budapest-Keleti'],['miskolc','Miskolc-Tiszai'],['kaz','Kazincbarcika'],['szolnok','Szolnok']],
  services:{
   daily:{from:'20261001',to:'20261130',days:'1111111',exceptions:{}},
   friday:{from:'20261001',to:'20261130',days:'0000100',exceptions:{}},
   exception:{from:'20261001',to:'20261130',days:'1111111',exceptions:{'20261030':2}}
  },
  trips:[
   {id:'ic586',service:'daily',route:'IC 586 TOKAJ',headsign:'Miskolc',
    stops:[['keleti',975,975],['miskolc',1120,1120]]},
   {id:'sajo15406',service:'friday',route:'15406 SAJÓ',headsign:'Kazincbarcika',
    stops:[['keleti',1015,1015],['miskolc',1165,1165],['kaz',1170,1170]]},
   {id:'exception',service:'exception',route:'NEM JÁR',headsign:'Szolnok',
    stops:[['keleti',1050,1050],['szolnok',1120,1120]]},
   {id:'night',service:'daily',route:'ÉJSZAKAI',headsign:'Kazincbarcika',
    stops:[['keleti',1505,1505],['miskolc',1600,1600],['kaz',1610,1610]]}
  ]};
}
const start=(day,min)=>new Date(core.wallEpoch(day,min));
test('Private approved GTFS is consumed locally; public feed remains forbidden',()=>{
 const data=fixture();
 assert.ok(core.validate(data,{allowPrivate:true}));
 assert.equal(core.validate(data),null);
 assert.equal(boardDepartures({...data,localOnly:false},core,'Budapest-Keleti',start('2026-10-30',900)).status,'invalid');
});
test('Friday direct SAJÓ and daily IC are sorted by planned departure, no cancelled exception',()=>{
 const result=boardDepartures(fixture(),core,'Budapest-Keleti',start('2026-10-30',900));
 assert.equal(result.status,'ok');
 assert.deepEqual(result.rows.map(r=>r.service),['IC 586 TOKAJ','15406 SAJÓ','ÉJSZAKAI']);
 assert.equal(result.total,3);
 assert.ok(result.rows.every((row,i,a)=>!i||row.departure>=a[i-1].departure));
 assert.ok(result.rows.every(row=>row.platform===null&&row.delayMinutes===null&&row.live===false));
});
test('Non-Friday search does not produce Friday direct SAJÓ train',()=>{
 const result=boardDepartures(fixture(),core,'Budapest-Keleti',start('2026-10-29',900),{hours:8});
 assert.equal(result.status,'ok');
 assert.ok(!result.rows.some(r=>r.service==='15406 SAJÓ'));
});
test('GTFS 25:05 from previous service day correctly appears after midnight',()=>{
 const result=boardDepartures(fixture(),core,'Budapest-Keleti',start('2026-10-30',20),{hours:3});
 assert.deepEqual(result.rows.map(x=>x.service),['ÉJSZAKAI']);
});
test('Final terminus is not fabricated as a train departure',()=>{
 const result=boardDepartures(fixture(),core,'Kazincbarcika',start('2026-10-30',900));
 assert.equal(result.status,'ok');
 assert.equal(result.total,0);
});
test('Invalid station is explicitly rejected and result limit respected',()=>{
 const data=fixture();
 assert.equal(boardDepartures(data,core,'not an actual stop',start('2026-10-30',900)).status,'unknown-station');
 const result=boardDepartures(data,core,'Budapest-Keleti',start('2026-10-30',900),{limit:1});
 assert.equal(result.total,3);
 assert.equal(result.rows.length,1);
});
test('Golden entry points reuse private local dataset; provider links remain separate',()=>{
 assert.match(html,/rail-station-board-v979\.js\?v=979/);
 assert.match(html,/rail-station-board-v979\.css\?v=979/);
 assert.match(privateJS,/getDataset\(\)\{return data\}/);
 assert.match(cards,/SH9_MAV_STATION_BOARD_V979\.open\(from\.value\)/);
 assert.match(boardScript,/data-rail-action="board"/);
 assert.match(html,/rail-private-gtfs-v2\.js\?v=979/);
});
test('No background GPS, web requests, Supabase or invented real-time claims',()=>{
 assert.doesNotMatch(boardScript,/\bfetch\(|watchPosition\(|setInterval\(|supabase\.from\(/);
 assert.match(boardScript,/Nem élő indulás, késés vagy vágányinformáció/);
 assert.match(boardScript,/\bserviceActive\(/);
 assert.match(css,/min-height:67px/);
 assert.match(css,/height:46px/);
});
