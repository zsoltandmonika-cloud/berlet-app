import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createWorkerRailShadow,MAX_MS}
 from "../../sh9/super-search/travel-worker-bridge-v3.mjs";

const query={from:"Budapest-Keleti",to:"Kazincbarcika",
 travelDate:"2026-11-09",time:"16:00",mode:"depart"};
function simulatedWorker(reply=null){
 const created=[];
 class FakeWorker{
  constructor(url,options){
   this.url=String(url);this.options=options;this.sent=[];this.terminated=false;
   created.push(this);
  }
  postMessage(msg){
   this.sent.push(msg);
   if(reply)queueMicrotask(()=>this.onmessage?.({data:reply(msg)}));
  }
  terminate(){this.terminated=true}
 }
 return {FakeWorker,created};
}
const valid=msg=>({id:msg.id,kind:"result",
 providerResults:{mav:{status:"ok",source:"MÁV GTFS (helyi)",
  generatedAt:"2026-11-06T10:00:00Z",
  journeys:[{legs:[{service:"Sajó Expressz",tripId:"sajo",
   from:"Budapest-Keleti",to:"Kazincbarcika",
   departure:"2026-11-09T15:55:00Z",arrival:"2026-11-09T19:00:00Z"}]}]}},
 metrics:{status:"ok",readMs:3.14159,prepareMs:4.56789,
  routeMs:6.78999,routeCount:1,generatedAt:"2026-11-06T10:00:00Z",
  password:"PRIVATE_NOT_ALLOWED"}});
test("Worker is instantiated only after an explicit search, on a local module URL",async()=>{
 const {FakeWorker,created}=simulatedWorker(valid);
 const probe=createWorkerRailShadow({WorkerClass:FakeWorker});
 assert.equal(created.length,0);
 assert.equal(probe.metrics().status,"not_run");
 const result=await probe.getExistingResults(query);
 assert.equal(created.length,1);
 assert.match(created[0].url,/local-gtfs-worker-v3\.mjs/);
 assert.deepEqual(created[0].options,{type:"module"});
 assert.equal(created[0].sent.length,1);
 assert.deepEqual(created[0].sent[0].query,query);
 assert.equal(result.mav.status,"ok");
 assert.equal(result.mav.journeys.length,1);
 assert.equal(probe.metrics().workerThread,true);
 assert.equal(probe.metrics().readMs,3.142);
 assert.equal(JSON.stringify(probe.metrics()).includes("PRIVATE_NOT_ALLOWED"),false);
 assert.equal(JSON.stringify(probe.metrics()).includes("Budapest-Keleti"),false);
 probe.dispose();
 assert.equal(created[0].terminated,true);
});
test("existing worker is reused for repeated search, not reloaded on every call",async()=>{
 const {FakeWorker,created}=simulatedWorker(valid);
 const probe=createWorkerRailShadow({WorkerClass:FakeWorker});
 await probe.getExistingResults(query);
 await probe.getExistingResults({...query,time:"16:20"});
 assert.equal(created.length,1);
 assert.equal(created[0].sent.length,2);
 probe.dispose();
});
test("a hard deadline terminates blocking work and produces safe null fallback",async()=>{
 let deadline,clears=0;
 const {FakeWorker,created}=simulatedWorker();
 const probe=createWorkerRailShadow({WorkerClass:FakeWorker,
  setTimer:fn=>{deadline=fn;return 777},clearTimer:()=>{clears++}});
 const pending=probe.getExistingResults(query);
 assert.equal(created.length,1);
 deadline();
 assert.equal(await pending,null);
 assert.equal(created[0].terminated,true);
 assert.equal(probe.metrics().status,"timeout");
 assert.ok(clears>0);
});
test("abort terminates worker before results can reach finished response",async()=>{
 const {FakeWorker,created}=simulatedWorker();
 const probe=createWorkerRailShadow({WorkerClass:FakeWorker});
 const ac=new AbortController();
 const pending=probe.getExistingResults({...query,signal:ac.signal});
 ac.abort();
 assert.equal(await pending,null);
 assert.equal(created[0].terminated,true);
 assert.equal(probe.metrics().status,"cancelled");
});
test("worker unavailable gracefully fails without main-thread fallback",async()=>{
 const probe=createWorkerRailShadow({WorkerClass:null});
 assert.equal(await probe.getExistingResults(query),null);
 assert.equal(probe.metrics().status,"worker_unavailable");
});
test("invalid and pre-aborted requests never start worker",async()=>{
 const {FakeWorker,created}=simulatedWorker(valid);
 const probe=createWorkerRailShadow({WorkerClass:FakeWorker});
 assert.equal(await probe.getExistingResults({...query,travelDate:"INVALID"}),null);
 assert.equal(await probe.getExistingResults({...query,time:"99:99"}),null);
 assert.equal(await probe.getExistingResults({...query,from:""}),null);
 const ac=new AbortController();ac.abort();
 assert.equal(await probe.getExistingResults({...query,signal:ac.signal}),null);
 assert.equal(created.length,0);
});
test("malformed or oversized worker output does not bypass verified route checks",async()=>{
 const {FakeWorker}=simulatedWorker(msg=>({id:msg.id,kind:"result",
  providerResults:{mav:{status:"ok",journeys:Array.from({length:50},()=>({legs:[]}))}},
  metrics:{status:"ok",routeCount:50}}));
 const probe=createWorkerRailShadow({WorkerClass:FakeWorker});
 assert.equal(await probe.getExistingResults(query),null);
 assert.equal(probe.metrics().routeCount,0);
});
test("late messages after timeout are ignored and never change result status",async()=>{
 const {FakeWorker,created}=simulatedWorker();
 let fire;
 const probe=createWorkerRailShadow({WorkerClass:FakeWorker,
  setTimer:fn=>{fire=fn;return 1},clearTimer:()=>{}});
 const pending=probe.getExistingResults(query);
 const sent=created[0].sent[0];
 fire();
 assert.equal(await pending,null);
 created[0].onmessage({data:valid(sent)});
 assert.equal(probe.metrics().status,"timeout");
});
test("worker module never calls external services or accesses private cross-module data",()=>{
 const script=readFileSync("sh9/super-search/local-gtfs-worker-v3.mjs","utf8");
 const bridge=readFileSync("sh9/super-search/travel-worker-bridge-v3.mjs","utf8");
 assert.match(script,/createLocalRailShadow/);
 assert.match(script,/globalThis\.window=globalThis/);
 assert.match(script,/\.postMessage\(/);
 assert.match(bridge,/new WorkerClass\(workerUrl,\{type:"module"\}\)/);
 assert.equal(MAX_MS,6500);
 for(const source of [script,bridge]){
  assert.doesNotMatch(source,/\bfetch\s*\(|https?:\/\//i);
  assert.doesNotMatch(source,/supabase\.co|hh_my_trip_packs|hh_kb_documents|wallet-private/i);
 }
});
