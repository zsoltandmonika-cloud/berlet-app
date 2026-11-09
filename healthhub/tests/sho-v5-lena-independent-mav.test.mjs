import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {evaluateIndependentMav} from "../../sh9/smart-travel/public-transport/smart-trip/v5/universal/lena-independent-mav-v1.mjs";
const NOW=Date.parse("2026-11-09T15:00:00.000Z");
const SOURCE="MÁV private timetable GTFS";
const feed={schema:"sh9-mav-gtfs-v1",source:SOURCE,
 rightsConfirmed:false,localOnly:true,generatedAt:"2026-11-09T11:00:00.000Z"};
const request={from:"Budapest-Keleti",to:"Kazincbarcika",date:"2026-11-27",
 time:"15:00",when:"2026-11-27T14:00:00Z",mode:"depart",
 profile:"m",priority:"balanced"};
function leg(service,from,to,d,a){
 return {tripId:service+"-unique",service,from,to,departure:d,arrival:a};
}
const direct=()=>({
 legs:[leg("Sajó Expressz","Budapest-Keleti","Kazincbarcika",
  "2026-11-27T15:55:00.000Z","2026-11-27T18:25:00.000Z")],
 departure:"2026-11-27T15:55:00.000Z",arrival:"2026-11-27T18:25:00.000Z",
 transfers:0,durationMinutes:150,live:false
});
const via=()=>({
 legs:[
  leg("IC 508","Budapest-Keleti","Miskolc",
   "2026-11-27T14:10:00.000Z","2026-11-27T16:10:00.000Z"),
  leg("SZ 3765","Miskolc","Kazincbarcika",
   "2026-11-27T16:17:00.000Z","2026-11-27T17:04:00.000Z")
 ],departure:"2026-11-27T14:10:00.000Z",arrival:"2026-11-27T17:04:00.000Z",
 transfers:1,durationMinutes:174,live:false
});
const result=(...journeys)=>({status:"ok",source:SOURCE,
 generatedAt:feed.generatedAt,journeys});
test("local MÁV A-plan selects a safe direct service and preserves user-visible uncertainty",()=>{
 const chosen=direct();
 const out=evaluateIndependentMav(result(via(),chosen),feed,request,{now:NOW});
 assert.equal(out.status,"ok");
 assert.equal(out.aPlan.item,chosen);
 assert.equal(out.aPlan.transfers,0);
 assert.equal(out.modelUsed,false);
 assert.equal(out.googleContentUsed,false);
 assert.match(out.warnings.join(" "),/nem élő|nem teljes/i);
});
test("a 7-minute unverified rail transfer is not labeled safe",()=>{
 const out=evaluateIndependentMav(result(via()),feed,request,{now:NOW});
 assert.equal(out.status,"ok");
 assert.equal(out.provisional,true);
 assert.equal(out.aPlan.connectionRisk,true);
 assert.match(out.warnings.join(" "),/rövidebb/);
});
test("MÁV evaluator rejects untrusted data, old feed and non-private sources",()=>{
 assert.equal(evaluateIndependentMav(result(direct()),
  {...feed,source:"Google Maps"},request,{now:NOW}).status,"unverified_feed");
 assert.equal(evaluateIndependentMav(result(direct()),
  {...feed,rightsConfirmed:true},request,{now:NOW}).status,"unverified_feed");
 assert.equal(evaluateIndependentMav(result(direct()),
  {...feed,generatedAt:"2026-01-01T00:00:00Z"},request,{now:NOW}).status,"unverified_feed");
 assert.equal(evaluateIndependentMav(
  {...result(direct()),source:"Fake MÁV"},feed,request,{now:NOW}).status,"unverified_result");
 assert.equal(evaluateIndependentMav(result({...direct(),live:true}),
  feed,request,{now:NOW}).status,"no_independent_route");
});
test("the V5 UI reads local MÁV only, no Google-to-model or auto-save",()=>{
 const path="sh9/smart-travel/public-transport/smart-trip/v5/universal/smart-trip-v5-api-ui.mjs";
 const ui=readFileSync(path,"utf8");
 const chunk=ui.slice(ui.indexOf("async function runIndependentLena()"),ui.indexOf("function open(payload)"));
 assert.match(chunk,/loadRailData/);
 assert.match(chunk,/rail\.validate/);
 assert.match(chunk,/rail\.route/);
 assert.match(chunk,/localOnly===true/);
 assert.match(chunk,/evaluateIndependentMav/);
 assert.doesNotMatch(chunk,/renderRoutes\s*\(|\.routes\b|fetch\s*\(|api\.openai\.com/);
});