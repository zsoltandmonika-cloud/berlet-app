import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runShadow,openExisting,localTimestamp,DB_SOURCES} from
 "../../sh9/smart-travel/smart-trip/hybrid-shadow-probe-v1118.mjs";

const valid={
 schema:"sh9-mav-gtfs-v1",timezone:"Europe/Budapest",
 stops:[["a","Budapest"],["b","Kazincbarcika"]],
 trips:[{id:"sajo",service:"weekday",route:"Sajó Expressz",stops:[["a",0,0],["b",1,1]]}],
 services:{weekday:{from:"20261101",to:"20261130",days:"1111111"}},
 source:"MÁV GTFS · helyi",generatedAt:"2026-11-06T10:00:00Z",
 rightsConfirmed:false,localOnly:true
};
function fakeDb(dataByName){
 return {
  databases:async()=>Object.keys(dataByName).map(name=>({name})),
  open(name){
   const req={};
   queueMicrotask(()=>{
    const db={
     objectStoreNames:{contains:n=>dataByName[name].store===n},
     transaction(n,mode){
      assert.equal(mode,"readonly");
      return {objectStore(){
       return {get(key){const op={};queueMicrotask(()=>{
        op.result=key===dataByName[name].key?dataByName[name].data:null;
        op.onsuccess?.();
       });return op}};
      }};
     },
     close(){}
    };
    req.result=db;req.onsuccess?.();
   });
   return req
  }
 }
}
function fakeCore(){
 return {
  wallEpoch:()=>Date.parse("2026-11-09T14:15:00Z"),
  validate(data){return data.schema==="sh9-mav-gtfs-v1"?data:null},
  route(data,q,opt){
   assert.equal(opt.localOnly,true);
   assert.equal(opt.maxTransfers,1);
   assert.equal(q.mode,"depart");
   return {
    status:"ok",source:data.source,generatedAt:data.generatedAt,
    journeys:[{legs:[{tripId:"sajo",service:"Sajó Expressz",
     from:"Budapest",to:"Kazincbarcika",
     departure:"2026-11-09T15:55:00Z",arrival:"2026-11-09T19:00:00Z"}]}]
   }
  }
 };
}
const Q={from:"Budapest",to:"Kazincbarcika",date:"2026-11-09",time:"15:15"};
test("shadow probe opens only existing IndexedDB names",async()=>{
 const db=fakeDb({});
 assert.equal((await openExisting("sh9-mav-private-gtfs-v2","datasets","household",{indexedDBApi:db})).status,"not_loaded");
 assert.equal((await openExisting("unknown","datasets","household",{indexedDBApi:{open(){throw Error("must not open")}}})).status,"cannot_verify_existing_database");
});
test("local MÁV timing uses real provided feed and does not export source routes",async()=>{
 let clock=0;const db=fakeDb({"sh9-mav-private-gtfs-v2":{store:"datasets",key:"household",data:valid}});
 const result=await runShadow({query:Q,core:fakeCore(),db,clock:()=>++clock});
 assert.equal(result.status,"partial_local_results");
 assert.equal(result.providerCoverage.mav,true);
 assert.equal(result.providerCoverage.volan,false);
 assert.equal(result.comparison.prefilterCandidates,1);
 assert.equal(result.providers[0].status,"ok");
 assert.equal(result.providers[1].status,"not_loaded");
 assert.equal(result.deviceLocalOnly,true);
 assert.equal(result.comparison.endToEndMs,null);
 assert.equal(JSON.stringify(result).includes("Sajó Expressz"),false);
 assert.equal(JSON.stringify(result).includes('"legs"'),false);
});
test("unrecognized feed refuses valid route count",async()=>{
 const db=fakeDb({"sh9-mav-private-gtfs-v2":{store:"datasets",key:"household",data:{...valid,localOnly:false}}});
 const result=await runShadow({query:Q,core:fakeCore(),db});
 assert.equal(result.providers[0].status,"invalid_or_not_private_feed");
 assert.equal(result.comparison.prefilterCandidates,0);
 assert.equal(result.status,"fallback_required");
});
test("Volán feed is timed but never mislabeled as MÁV",async()=>{
 const volan={...valid,source:"Volán GTFS (helyi)"};
 const db=fakeDb({"sh9-volan-private-gtfs-v994":{store:"data",key:"pilot",data:volan}});
 const result=await runShadow({query:Q,core:fakeCore(),db});
 assert.equal(result.providers[1].status,"ok");
 assert.equal(result.providerCoverage.volan,true);
 assert.equal(result.comparison.prefilterCandidates,0);
 assert.equal(result.coverage.includes("volan_timed_without_adapter"),true);
});
test("invalid search rejects before opening any database",async()=>{
 const db={databases(){throw Error("should not inspect")}};
 await assert.rejects(runShadow({query:{...Q,time:"33:99"},db,core:fakeCore()}),/invalid_query/);
});
test("time conversion honors the existing GTFS timezone converter",()=>{
 assert.equal(localTimestamp(fakeCore(),"2026-11-09","15:15"),"2026-11-09T14:15:00.000Z");
});
test("standalone shadow HTML never loads a production search submission script",()=>{
 const path="sh9/smart-travel/smart-trip/hybrid-shadow-v1118.html";
 const src=readFileSync(path,"utf8");
 assert.match(src,/hybrid-shadow-probe-v1118/);
 assert.doesNotMatch(src,/smart-trip-ai-v1022\.js/);
 assert.doesNotMatch(src,/smart-trip-chatgpt-handoff-v1076\.js/);
 assert.doesNotMatch(src,/supabase(?:-js)?(?:\.min)?\.js/i);
 assert.doesNotMatch(src,/fetch\(/i);
});
test("reader uses correct private household dataset locations",()=>{
 assert.deepEqual(DB_SOURCES.map(s=>[s.name,s.store,s.key]),[
  ["sh9-mav-private-gtfs-v2","datasets","household"],
  ["sh9-volan-private-gtfs-v994","data","pilot"]
 ]);
});
