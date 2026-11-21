import test from "node:test";
import assert from "node:assert/strict";
import {prefilter,category,selectCandidates,candidateEnvelope,createTimingTrace,SCHEMA}
 from "../../sh9/smart-travel/smart-trip/hybrid-fast-core-v1117.mjs";

const DATE="2026-11-09";
const Q={from:"Budapest",to:"Kazincbarcika",travelDate:DATE};
const MAV={
 status:"ok",source:"MÁV GTFS · helyi",generatedAt:"2026-11-07T10:00:00Z",
 journeys:[
  {legs:[{service:"Sajó Expressz",tripId:"sajo-1",from:"Budapest",to:"Kazincbarcika",
   departure:"2026-11-09T15:55:00Z",arrival:"2026-11-09T19:00:00Z"}]},
  {legs:[{service:"IC 110",tripId:"ic-1",from:"Budapest",to:"Kazincbarcika",
   departure:"2026-11-09T16:15:00Z",arrival:"2026-11-09T19:05:00Z"}]}
 ]};
const VOL=[
 {depart:Date.parse("2026-11-09T15:05:00Z"),
  arrive:Date.parse("2026-11-09T18:50:00Z"),
  route:{number:"1054"},
  trip:{stops:[["a",0,0],["b",1,1]]},start:0,end:1}
];
const STOPS=new Map([["a",{name:"Budapest"}],["b",{name:"Kazincbarcika"}]]);
const SOURCES={mav:MAV,volan:VOL,volanStops:STOPS};
const clone=v=>JSON.parse(JSON.stringify(v));
test("prefilter returns only timetable-based candidates, with source evidence",()=>{
 const result=prefilter({query:Q,providerResults:SOURCES,maxJsonBytes:8000});
 assert.equal(result.status,"ready");
 assert.equal(result.schema,SCHEMA);
 assert.equal(result.sourceCount.mav,2);
 assert.equal(result.sourceCount.volan,1);
 assert.deepEqual(result.candidates.map(category),["direct_volan","sajo_express","other_express"]);
 const payload=JSON.parse(result.json);
 assert.equal(payload.schema,SCHEMA);
 assert.equal(payload.travelDate,DATE);
 assert.equal(payload.options[0].legs[0][1],"1054");
 assert.equal(payload.options[1].legs[0][1],"Sajó Expressz");
 assert.equal(payload.options.every(x=>x.confidence==="timetable_not_live"),true);
 assert.equal(JSON.stringify(payload).includes("access_token"),false);
});
test("existing timetable provider result objects remain unchanged",()=>{
 const mavBefore=clone(MAV),volBefore=clone(VOL);
 prefilter({query:Q,providerResults:SOURCES});
 assert.deepEqual(MAV,mavBefore);
 assert.deepEqual(VOL,volBefore);
});
test("unverified and missing provider data triggers legacy fallback",()=>{
 const result=prefilter({query:Q,providerResults:{}});
 assert.equal(result.status,"fallback_required");
 assert.equal(result.reason,"no_comparable_verified_routes");
 assert.equal(result.candidates.length,0);
});
test("different travel day is NOT silently compared or relabeled",()=>{
 const result=prefilter({query:{...Q,travelDate:"2026-11-10"},providerResults:SOURCES});
 assert.equal(result.status,"fallback_required");
 assert.ok(result.excluded>=1);
});
test("malformed itinerary query fails safely without provider work",()=>{
 assert.equal(prefilter({query:{...Q,travelDate:"2026-11-35"},providerResults:SOURCES}).status,"invalid_query");
 assert.equal(prefilter({query:{...Q,to:"Budapest"},providerResults:SOURCES}).status,"invalid_query");
});
test("candidate compacting drops complete alternatives, never chops route data",()=>{
 const generous=prefilter({query:Q,providerResults:SOURCES,maxJsonBytes:10000});
 const smallest=candidateEnvelope(Q,[generous.candidates[0]],{maxBytes:10000});
 const limit=Buffer.byteLength(smallest,"utf8")+10;
 const reduced=prefilter({query:Q,providerResults:SOURCES,maxJsonBytes:limit});
 assert.equal(reduced.status,"ready");
 assert.equal(reduced.candidates.length,1);
 assert.equal(JSON.parse(reduced.json).options[0].legs[0][1],"1054");
 assert.equal(prefilter({query:Q,providerResults:SOURCES,maxJsonBytes:15}).status,"fallback_required");
});
test("preselector cannot overwhelm GPT with dozens of generic journeys",()=>{
 const many=Array.from({length:25},(_,i)=>({
  legs:[{service:"IC "+(100+i),tripId:"extra-"+i,from:"Budapest",to:"Kazincbarcika",
   departure:new Date(Date.parse("2026-11-09T13:00:00Z")+i*6e4).toISOString(),
   arrival:new Date(Date.parse("2026-11-09T17:00:00Z")+i*6e4).toISOString()}]
 }));
 const result=prefilter({query:Q,providerResults:{mav:{...MAV,journeys:many}},
  maxCandidates:5,maxJsonBytes:10000});
 assert.equal(result.status,"ready");
 assert.equal(result.candidates.length,5);
 assert.equal(JSON.parse(result.json).options.length,5);
});
test("verified routing candidates preserve diversity for GPT-6 judgment",()=>{
 const items=[
  {provider:"mav",legs:[{line:"IC 150"}],transfers:0},
  {provider:"mav",legs:[{line:"Sajó Expressz"}],transfers:0},
  {provider:"volan",legs:[{line:"1054"}],transfers:0},
  {provider:"bkk",legs:[{line:"260"}],transfers:0}
 ];
 assert.deepEqual(selectCandidates(items,3).map(category),
  ["direct_volan","sajo_express","other_express"]);
});
test("timer records stage durations only, never route contents",()=>{
 let t=0;const trace=createTimingTrace(()=>t);
 t=4;assert.equal(trace.mark("gtfs"),true);
 t=15;assert.equal(trace.mark("gpt6"),true);
 t=23;trace.mark("validate");
 t=26;trace.mark("save");
 t=29;trace.mark("my_trips");
 const s=trace.summary();
 assert.equal(s.completed,true);
 assert.equal(s.totalMs,29);
 assert.deepEqual(s.stages.map(x=>x.elapsedMs),[4,11,8,3,3]);
 assert.equal(JSON.stringify(s).includes("Kazincbarcika"),false);
 assert.equal(trace.mark("upload_medical_records"),false);
});
