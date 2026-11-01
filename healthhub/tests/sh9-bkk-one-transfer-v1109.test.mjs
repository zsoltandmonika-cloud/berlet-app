import test from "node:test";
import assert from "node:assert/strict";
import {findConnections,toConnectionPack}
 from "../../sh9/smart-travel/lena-native/bkk/bkk-one-transfer-v1109.mjs";
import {wallEpoch}
 from "../../sh9/smart-travel/lena-native/bkk/bkk-gtfs-core-v1105.mjs";
import {normalize}
 from "../../supabase/functions/hh-lena-handover-preview/trip-pack-core.mjs";

const DATE="2026-11-02",AT=Date.parse("2026-11-02T12:00:00Z");
const now=(hh,mm)=>new Date(wallEpoch(DATE,hh*60+mm)).toISOString();
const q=(when=now(17,53),mode="depart")=>({
 date:DATE,when,mode,from:"Citronella utca",to:"Kelenföld vasútállomás M"
});
const dataset=()=>({
 schema:"sh9.bkk.gtfs/1",source:"BKK Zrt., CC BY 4.0",
 sourceUrl:"https://bkk.hu/gtfs/budapest_gtfs.zip",license:"CC-BY-4.0",
 generatedAt:"2026-11-01T12:00:00Z",coverage:"stop-to-stop",live:false,
 feedStart:"2026-10-30",feedEnd:"2026-12-01",routes:["260","19"],
 stops:{
  busStart:["Citronella utca",47.6000,19.0300],
  busMid:["Bécsi út / Vörösvári út",47.5478,19.0289],
  tramMid:["Bécsi út / Vörösvári út",47.5477,19.0294],
  tramEnd:["Kelenföld vasútállomás M",47.4643,19.0225]
 },
 services:{day:{start:"2026-10-30",end:"2026-12-01",
  days:[1,1,1,1,1,1,1],exceptions:{}}},
 trips:[
  ["260","day","Óbudai rendelőintézet",[
   ["busStart",18*3600,18*3600],["busMid",18*3600+12*60,18*3600+12*60]],"bus"],
  ["19","day","Kelenföld vasútállomás M",[
   ["tramMid",18*3600+22*60,18*3600+22*60],
   ["tramEnd",18*3600+58*60,18*3600+58*60]],"tram"]
 ]
});
test("260 bus → 19 tram gives actual two-leg SH9 TripPack",()=>{
 const data=dataset(),found=findConnections(data,q(),AT);
 assert.equal(found.length,1);
 const path=found[0];
 assert.deepEqual(path.legs.map(x=>x.line),["260","19"]);
 assert.equal(path.transfers,1);
 assert.equal(path.transfer.from,"Bécsi út / Vörösvári út");
 assert.equal(path.transfer.footpathVerified,false);
 assert.ok(path.transfer.airMeters>0&&path.transfer.airMeters<250);
 assert.equal(path.transfer.waitMinutes,10);
 const pack=normalize(toConnectionPack(q(),path));
 assert.equal(pack.segments.length,2);
 assert.deepEqual(pack.segments.map(s=>s.mode),["bus","tram"]);
 assert.equal(pack.departure,"18:00");
 assert.equal(pack.arrival,"18:58");
 assert.equal(pack.segments[0].to,pack.segments[1].from);
 assert.match(pack.summary,/légvonalban/);
 assert.match(pack.summary,/nincs ellenőrizve/);
});
test("No fictional footpath between different stop names",()=>{
 const data=dataset();data.stops.tramMid[0]="Nem ugyanaz a megálló";
 assert.deepEqual(findConnections(data,q(),AT),[]);
});
test("Reject transfer physically distant even when name matches",()=>{
 const data=dataset();data.stops.tramMid=[data.stops.tramMid[0],47.5600,19.0600];
 assert.deepEqual(findConnections(data,q(),AT),[]);
});
test("Reject short or missed transfer buffers",()=>{
 for(const minute of [13,15,16]){
  const data=dataset();
  const s=18*3600+minute*60;
  data.trips[1][3][0][1]=s;data.trips[1][3][0][2]=s;
  assert.deepEqual(findConnections(data,q(),AT),[],"minute "+minute);
 }
});
test("Arrive-by finds the connection but not later trips",()=>{
 const result=findConnections(dataset(),q(now(18,58),"arrive"),AT);
 assert.equal(result.length,1);
 const none=findConnections(dataset(),q(now(18,50),"arrive"),AT);
 assert.equal(none.length,0);
});
test("GTFS holiday cancellation prevents invented connections",()=>{
 const data=dataset();data.services.day.exceptions[DATE]=false;
 assert.deepEqual(findConnections(data,q(),AT),[]);
});
test("One-line direct trip remains usable",()=>{
 const data=dataset();
 const direct={...q(),from:"Bécsi út / Vörösvári út"};
 const found=findConnections(data,direct,AT);
 assert.ok(found.some(x=>x.transfers===0));
 const pack=normalize(toConnectionPack(direct,found.find(x=>x.transfers===0)));
 assert.equal(pack.segments.length,1);
});
test("No connection outside allowed search horizon",()=>{
 assert.deepEqual(findConnections(dataset(),q(now(7,30)),AT),[]);
});
