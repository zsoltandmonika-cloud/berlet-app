import test from "node:test";
import assert from "node:assert/strict";
import {mav,volan,bkk,combine,rating,toTripPack}
 from "../../sh9/smart-travel/smart-trip/provider-results-merge-v1110.mjs";
import {normalize}
 from "../../supabase/functions/hh-lena-handover-preview/trip-pack-core.mjs";
const D="2026-11-02",start="2026-11-02T16:00:00.000Z",end="2026-11-02T17:10:00.000Z";
const MAV={status:"ok",source:"MÁV GTFS · helyi",generatedAt:"2026-11-01T10:00:00Z",
 journeys:[{legs:[{tripId:"real1",service:"IC 110",from:"A",to:"B",
  departure:start,arrival:end}],departure:start,arrival:end,transfers:0}]};
const VOLS=[{depart:Date.parse(start),arrive:Date.parse("2026-11-02T17:00:00Z"),
 trip:{number:"1050",stops:[["s1",1,1],["s2",2,2]]},route:{number:"1050"},start:0,end:1}];
const STOPMAP=new Map([["s1",{name:"A"}],["s2",{name:"B"}]]);
const PLAN={walk:180,legs:[{line:{id:"260",mode:"bus"},enter:{name:"A",id:"a"},
 exit:{name:"C",id:"c"}},{line:{id:"1",mode:"tram"},enter:{name:"C",id:"c2"},
 exit:{name:"B",id:"b"}}],timing:{matchedLegs:[
 {lineId:"260",boardStopId:"a",alightStopId:"c",tripId:"gtfs1"},
 {lineId:"1",boardStopId:"c2",alightStopId:"b",tripId:"gtfs2"}
 ],legTimes:[
  {departure:start,arrival:"2026-11-02T16:25:00.000Z"},
  {departure:"2026-11-02T16:35:00.000Z",arrival:end}
 ]}};
const BKKTIME=()=>({departure:Date.parse(start),arrival:Date.parse(end),
 waitMinutes:7,walkMinutes:null});
test("MÁV existing timetable cards normalize without re-routing",()=>{
 const out=mav(MAV,{from:"A",to:"B"});
 assert.equal(out.length,1);assert.equal(out[0].provider,"mav");
 assert.deepEqual(out[0].legs.map(x=>x.line),["IC 110"]);
});
test("Volán existing Golden Cards normalize unchanged vehicle number",()=>{
 const out=volan(VOLS,{from:"A",to:"B",stopById:STOPMAP});
 assert.equal(out.length,1);assert.equal(out[0].provider,"volan");
 assert.equal(out[0].legs[0].mode,"bus");
 assert.equal(out[0].legs[0].line,"1050");
});
test("Existing BKK selected plans carry exact GTFS leg clocks, not guessed walking",()=>{
 const out=bkk([PLAN],{from:"A",to:"B",timingValidator:BKKTIME});
 assert.equal(out.length,1);
 assert.deepEqual(out[0].legs.map(x=>x.line),["260","1"]);
 assert.equal(out[0].walkVerified,false);
 assert.equal(out[0].waitMinutes,7);
 assert.ok(rating(out[0]).stars<5);
});
test("BKK static flow without per-leg GTFS times is excluded, not manufactured",()=>{
 const old={...PLAN,timing:{...PLAN.timing,legTimes:undefined}};
 assert.deepEqual(bkk([old],{from:"A",to:"B",timingValidator:BKKTIME}),[]);
 assert.deepEqual(bkk([PLAN],{from:"A",to:"B"}),[]);
});
test("Three separate provider results sorted with explicit uncertainty",()=>{
 const all=combine({bkk:bkk([PLAN],{from:"A",to:"B",timingValidator:BKKTIME}),
  mav:mav(MAV,{from:"A",to:"B"}),
  volan:volan(VOLS,{from:"A",to:"B",stopById:STOPMAP})},
  {from:"A",to:"B",travelDate:D});
 assert.equal(all.status,"ok");assert.equal(all.options.length,3);
 assert.deepEqual(new Set(all.options.map(x=>x.provider)),new Set(["bkk","mav","volan"]));
 assert.ok(all.options.every(x=>x.evaluation.stars<=4));
 const pack=normalize(toTripPack(all.options.find(x=>x.provider==="bkk"),D));
 assert.deepEqual(pack.segments.map(x=>x.line),["260","1"]);
 assert.match(pack.summary,/gyaloglás/);
});
test("Different endpoints and travel day may not be mixed into a false through route",()=>{
 const res=combine({mav:mav(MAV,{from:"Budapest",to:"B"}),volan:volan(VOLS,{
  from:"A",to:"B",stopById:STOPMAP})},{from:"A",to:"B",travelDate:D});
 assert.equal(res.options.length,1);
 assert.equal(res.excluded.length,1);
 const other=combine({mav:mav(MAV,{from:"A",to:"B"})},
 {from:"A",to:"B",travelDate:"2026-11-03"});
 assert.equal(other.options.length,0);
});
test("Unverified, reversed or mismatched GTFS connection excluded",()=>{
 const time="2026-11-02T16:10:00.000Z";
 const invalid={...PLAN,timing:{...PLAN.timing,legTimes:[
  PLAN.timing.legTimes[0],
  {departure:time,arrival:end}
 ]}};
 assert.equal(bkk([invalid],{from:"A",to:"B",timingValidator:BKKTIME}).length,0);
 const notReal={status:"ok",source:"Unknown API",journeys:MAV.journeys};
 assert.deepEqual(mav(notReal,{from:"A",to:"B"}),[]);
});
test("TripPack from a verified existing provider output remains schema-valid",()=>{
 const option=volan(VOLS,{from:"A",to:"B",stopById:STOPMAP})[0];
 const pack=normalize(toTripPack(option,D));
 assert.equal(pack.segments[0].line,"1050");
 assert.equal(pack.departure,"17:00");
 assert.equal(pack.arrival,"18:00");
});
