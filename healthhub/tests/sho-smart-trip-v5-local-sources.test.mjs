import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runParallelSearch} from "../../sh9/smart-travel/public-transport/smart-trip/v5/parallel/parallel-orchestrator.mjs";
import {createReadOnlyAdapters,makeScopedQuery} from
 "../../sh9/smart-travel/public-transport/smart-trip/v5/parallel/local-source-bridge.mjs";
const rules=JSON.parse(readFileSync("sh9/super-search/matrix-v4/matrix-rules-v4.json","utf8"));
const query={date:"2026-11-27",time:"15:15",profile:"m",priority:"balanced",
 pairs:{
  bkk:{from:"Kolosy tér",to:"Margit híd, budai hídfő H"},
  mav:{from:"Budapest-Keleti",to:"Kazincbarcika"},
  volan:{from:"Budapest, Stadion",to:"Kazincbarcika, autóbusz-állomás"}
 }};
const hh=(t)=>"2026-11-27T"+t+":00+01:00";
const core={wallEpoch:(_d,_m)=>Date.parse(hh("15:15"))};
const bkk=async()=>({
 status:"ok",source:"BKK Zrt., CC BY 4.0",coverage:"stop-to-stop",live:false,
 results:[{legs:[{
  mode:"tram",line:"17",from:"Kolosy tér",to:"Margit híd, budai hídfő H",
  departure:hh("15:20"),arrival:hh("15:36")
 }]}]
});
const fakeWorkerFactory=(provider)=>async ({request,graph,signal})=>{
 if(signal?.aborted)return {status:"cancelled",routes:[]};
 const from=graph.nodes[0],to=graph.nodes[1];
 return {status:"ok",routes:[{legs:[{
  provider,mode:provider==="mav"?"train":"bus",line:provider==="mav"?"Sajó Expressz":"1054",
  fromNode:from.id,toNode:to.id,
  departure:hh("16:55"),arrival:hh("19:40"),
  verified:true,timetableVerified:true,
  source:provider==="mav"?"MÁV GTFS (helyi)":"Volán GTFS (helyi)",
  sourceUrl:provider==="mav"?"https://mavplusz.hu/":"https://www.mavcsoport.hu/"
 }]}]};
};
test("scoped graph never invents shared hubs or door-to-door walking",()=>{
 const b=makeScopedQuery(query,"bkk");
 const m=makeScopedQuery(query,"mav");
 assert.ok(b&&m);
 assert.notEqual(b.graph.originNode,m.graph.originNode);
 assert.equal(b.graph.nodes.length,2);
 assert.equal(Object.keys(b.graph.searchPairs).join(""),"bkk");
 assert.equal(makeScopedQuery({...query,pairs:{...query.pairs,mav:{from:"X",to:"X"}}},"mav"),null);
});
test("real V4 read-only adapters integrate with V5 30s coordinator",async()=>{
 const audit={},seen=[];
 const adapters=createReadOnlyAdapters({
  rules,bkkSearch:async (...args)=>{seen.push("bkk");return bkk(...args)},
  wallCore:core,workerFactory:p=>async (...args)=>{seen.push(p);
   return fakeWorkerFactory(p)(...args)},primary:"mav",audit
 });
 const result=await runParallelSearch({adapters,query,budgetMs:1_500,
  sourceBudgetMs:800,finalize:async({best})=>({source:best.source})});
 assert.deepEqual([...seen].sort(),["bkk","mav","volan"]);
 assert.equal(result.best?.source,"mav");
 assert.equal(result.best?.provenance,"operator");
 assert.equal(result.finalized.source,"mav");
 assert.equal(audit.bkk.status,"timetable_route_found");
 assert.equal(audit.volan.status,"timetable_route_found");
 assert.equal(audit.mav.status,"timetable_route_found");
 assert.equal(audit.mav.tripPack.schema,"sh9.trip-pack/1");
 assert.equal(audit.mav.tripPack.from,"Budapest-Keleti");
 assert.equal(audit.mav.tripPack.to,"Kazincbarcika");
 // Independent stop pairs are never spliced or arbitrarily cross-ranked.
 assert.equal(result.sources.find(x=>x.source==="bkk").candidates.length,0);
 assert.equal(result.sources.find(x=>x.source==="volan").candidates.length,0);
});
test("when primary has no verified local GTFS, no other source is promoted to A plan",async()=>{
 const audit={};
 const factory=p=>async (...args)=>p==="mav"?
  {status:"local_feed_unavailable",routes:[]}:
  fakeWorkerFactory(p)(...args);
 const adapters=createReadOnlyAdapters({
  rules,bkkSearch:bkk,wallCore:core,workerFactory:factory,primary:"mav",audit
 });
 const result=await runParallelSearch({adapters,query,budgetMs:1000,sourceBudgetMs:400});
 assert.equal(result.best,null);
 assert.equal(result.status,"no_candidates");
 assert.equal(audit.mav.tripPack,null);
 assert.equal(audit.bkk.status,"timetable_route_found");
 assert.equal(audit.volan.status,"timetable_route_found");
});
test("malformed route and unsafe chronology cannot be marked timetable verified",async()=>{
 const audit={};
 const adapters=createReadOnlyAdapters({rules,bkkSearch:async()=>({
  status:"ok",source:"BKK Zrt., CC BY 4.0",live:false,coverage:"stop-to-stop",
  results:[{legs:[{mode:"tram",line:"17",from:query.pairs.bkk.from,
   to:query.pairs.bkk.to,departure:hh("17:00"),arrival:hh("16:00")}]}]
 }),wallCore:core,workerFactory:fakeWorkerFactory,primary:"bkk",audit});
 const r=await runParallelSearch({adapters,query,budgetMs:1000,sourceBudgetMs:400});
 assert.equal(r.best,null);
 assert.equal(audit.bkk.tripPack,null);
});
test("pilot exposes no Google/GPT calls, no privacy exports, no My Trips writes",()=>{
 const p="sh9/smart-travel/public-transport/smart-trip/v5/parallel/";
 const src=readFileSync(p+"local-source-bridge.mjs","utf8");
 const client=readFileSync(p+"local-test-client.mjs","utf8");
 const html=readFileSync(p+"local-test.html","utf8");
 assert.match(src,/createMatrixSearch/);
 assert.match(src,/createWorkerProvider/);
 assert.match(src,/createBkkAdapter/);
 assert.doesNotMatch(client,/fetch\s*\(\s*["']https:\/\/|supabase\.co|routes\.googleapis/);
 for(const x of [src,client,html]){
  assert.doesNotMatch(x,/SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|HH_SMART_TRIP_GOOGLE_ROUTES_KEY/);
  assert.doesNotMatch(x,/\.insert\s*\(|\.upsert\s*\(|\.setItem\s*\(/);
 }
 assert.match(html,/30 mp közös keret/);
 assert.match(html,/NEM teljes, ajtótól ajtóig útvonal/);
});
