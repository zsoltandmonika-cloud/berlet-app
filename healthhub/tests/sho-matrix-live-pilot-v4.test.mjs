import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createWorkerProvider} from "../../sh9/super-search/matrix-v4/matrix-worker-provider-v4.mjs";
import {DATASETS,createReadOnlyLocalFeedReader} from
 "../../sh9/super-search/matrix-v4/matrix-local-feed-reader-v4.mjs";
import {createLocalGTFSAdapter,createBkkAdapter} from
 "../../sh9/super-search/matrix-v4/matrix-existing-sources-v4.mjs";
import {parseRules} from "../../sh9/super-search/matrix-v4/matrix-search-engine-v4.mjs";

const rules=JSON.parse(readFileSync("sh9/super-search/matrix-v4/matrix-rules-v4.json","utf8"));
const request={from:"A",to:"B",date:"2026-11-27",time:"15:15",mode:"depart",profile:"m"};
const graph={originNode:"mav_from",destinationNode:"mav_to",nodes:[
 {id:"mav_from",name:"A",feedStops:{mav:"Budapest-Keleti"}},
 {id:"mav_to",name:"B",feedStops:{mav:"Kazincbarcika"}}
],searchPairs:{mav:[{fromNode:"mav_from",toNode:"mav_to",
 fromStop:"Budapest-Keleti",toStop:"Kazincbarcika"}]}};
test("Configured cold-start budget remains bounded by 30 second full-trip objective",()=>{
 assert.equal(rules.parallel.deadlineMs,12000);
 assert.ok(parseRules(rules));
});
test("GTFS worker provider actually posts one scoped request and terminates after response",async()=>{
 const seen=[];
 class FakeWorker{
  constructor(url,options){this.url=url;this.options=options;seen.push(this)}
  postMessage(message){
   assert.equal(message.provider,"mav");
   assert.equal(message.action,"search");
   queueMicrotask(()=>this.onmessage({data:{id:1,kind:"result",provider:"mav",
    result:{status:"ok",routes:[{legs:[]}]}}}));
  }
  terminate(){this.stopped=true}
 }
 const fn=createWorkerProvider("mav",{WorkerClass:FakeWorker});
 const result=await fn({request,graph});
 assert.equal(result.status,"ok");
 assert.equal(result.routes.length,1);
 assert.equal(seen.length,1);
 assert.equal(seen[0].options.type,"module");
 assert.ok(seen[0].stopped);
});
test("Abort cancels an in-flight worker and it terminates without leaking route",async()=>{
 let w;
 class FakeWorker{
  constructor(){w=this}
  postMessage(){}
  terminate(){this.stopped=true}
 }
 const abort=new AbortController();
 const fn=createWorkerProvider("volan",{WorkerClass:FakeWorker});
 const pending=fn({request,graph,signal:abort.signal});
 abort.abort();
 const result=await pending;
 assert.equal(result.status,"cancelled");
 assert.deepEqual(result.routes,[]);
 assert.equal(w.stopped,true);
});
test("Unsupported Worker feature fails closed without blocking",async()=>{
 const result=await createWorkerProvider("mav",{WorkerClass:null})({request,graph});
 assert.equal(result.status,"worker_not_supported");
});
test("Local private GTFS IndexedDB reader NEVER creates a missing database",async()=>{
 let opened=0;
 const reader=createReadOnlyLocalFeedReader({
  databases:async()=>[],
  open:()=>{opened++;throw Error("should not happen")}
 });
 assert.equal(await reader({provider:"mav"}),null);
 assert.equal(opened,0);
});
test("Local private GTFS reader opens only existing DB, only readonly transaction",async()=>{
 const dataset={source:"MÁV GTFS",schema:"sh9-mav-gtfs-v1"};
 const calls={open:[],store:[],reads:[],close:0};
 const fake={
  databases:async()=>[{name:DATASETS.mav.db,version:1}],
  open(name){
   calls.open.push(name);
   const req={};
   queueMicrotask(()=>{
    req.result={
     objectStoreNames:{contains:name=>name===DATASETS.mav.store},
     transaction(store,mode){
      calls.store.push([store,mode]);
      return {objectStore:s=>({
       get:key=>{
        calls.reads.push(key);
        const request={};
        queueMicrotask(()=>{
         request.result=dataset;
         request.onsuccess?.();
        });
        return request;
       }
      })};
     },
     close(){calls.close++}
    };
    req.onsuccess?.();
   });
   return req;
  }
 };
 const data=await createReadOnlyLocalFeedReader(fake)({provider:"mav"});
 assert.equal(data,dataset);
 assert.deepEqual(calls.open,[DATASETS.mav.db]);
 assert.deepEqual(calls.store,[[DATASETS.mav.store,"readonly"]]);
 assert.deepEqual(calls.reads,[DATASETS.mav.key]);
 assert.equal(calls.close,1);
});
test("MAV pair cannot claim unrelated station even if source returns a schedule",async()=>{
 const route={status:"ok",journeys:[{legs:[{
  service:"IC 508",from:"Budapest-Nyugati",to:"Kazincbarcika",
  departure:"2026-11-27T16:55:00+01:00",
  arrival:"2026-11-27T19:30:00+01:00"
 }]}]};
 const core={
  validate:()=>true,
  wallEpoch:()=>Date.parse("2026-11-27T15:15:00+01:00"),
  route:()=>route
 };
 const adapter=createLocalGTFSAdapter("mav",{core,
  readExistingLocalDataset:async()=>({source:"MÁV GTFS"})});
 const result=await adapter({request,graph});
 assert.equal(result.status,"not_covered");
 assert.deepEqual(result.routes,[]);
});
test("Declared BKK origin must match canonical feed stop and cannot be overwritten",async()=>{
 const input={...graph,searchPairs:{bkk:[{fromNode:"mav_from",toNode:"mav_to",
  fromStop:"Kolosy tér",toStop:"Margit híd, budai hídfő H"}]}};
 let invoked=0;
 const adapter=createBkkAdapter({
  whenResolver:()=>"2026-11-27T15:15:00+01:00",
  search:async()=>{invoked++;return {status:"ok",results:[]}}
 });
 const result=await adapter({request,graph:input});
 assert.equal(result.status,"no_verified_hubs");
 assert.equal(invoked,0);
});
test("Preview uses a separate path; existing Smart Trip and My Trips remain untouched",()=>{
 const html=readFileSync("sh9/super-search/matrix-v4/live-pilot.html","utf8");
 const glue=readFileSync("sh9/super-search/matrix-v4/matrix-live-pilot-v4.mjs","utf8");
 const worker=readFileSync("sh9/super-search/matrix-v4/matrix-local-worker-v4.mjs","utf8");
 const production=readFileSync("sh9/smart-travel/public-transport/smart-trip/index.html","utf8");
 assert.match(html,/Három kereső, egy stopper/);
 assert.match(html,/megállótól megállóig/);
 assert.match(glue,/createWorkerProvider\("mav"\)/);
 assert.match(glue,/createWorkerProvider\("volan"\)/);
 assert.match(glue,/createBkkAdapter/);
 assert.match(glue,/nincs automatikus felhőmentés/);
 assert.doesNotMatch(glue,/\.insert\(|\.upsert\(|\.update\(/);
 assert.doesNotMatch(worker,/\.put\(|\.add\(|fetch\(/);
 assert.doesNotMatch(production,/matrix-live-pilot-v4|matrix-local-worker-v4/);
});
