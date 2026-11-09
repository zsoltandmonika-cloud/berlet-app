import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runParallelSearch,MAX_BUDGET_MS,normalizedCandidate} from
 "../../sh9/smart-travel/public-transport/smart-trip/v5/parallel/parallel-orchestrator.mjs";
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const candidate=(id,source,score=10)=>({
 id,source,provenance:"synthetic",travelMinutes:120,
 walkMeters:200,transfers:1,score
});
const adapter=(id,ms,items,seen)=>({id,search:async(_query,{signal})=>{
 seen.push(id);
 await wait(ms);
 if(signal.aborted)return {candidates:[]};
 return {candidates:items};
}});
test("launches all four adapters concurrently and ranks only normalized candidates",async()=>{
 const seen=[],events=[];
 const adapters=[
  adapter("google",20,[candidate("g","google",35)],seen),
  adapter("bkk",15,[candidate("b","bkk",25)],seen),
  adapter("mav",12,[candidate("m","mav",19)],seen),
  adapter("volan",17,[candidate("v","volan",6)],seen)
 ];
 const run=runParallelSearch({adapters,query:{test:true},budgetMs:500,
  sourceBudgetMs:200,finalize:async({best})=>({text:"DEMO "+best.id}),
  onProgress:e=>events.push(e)});
 await wait(5);
 assert.deepEqual(seen.sort(),["bkk","google","mav","volan"]);
 const out=await run;
 assert.equal(out.status,"complete");
 assert.equal(out.best.id,"v");
 assert.equal(out.best.source,"volan");
 assert.equal(out.finalized.text,"DEMO v");
 assert.equal(out.sources.length,4);
 assert.ok(out.elapsedMs<500);
 assert.equal(out.selection,"preliminary_not_independently_verified");
 assert.ok(events.some(e=>e.phase==="finalizing"));
});
test("one stalled provider cannot hold the remaining results hostage",async()=>{
 const seen=[];
 const adapters=[
  adapter("bkk",5,[candidate("b","bkk",9)],seen),
  {id:"mav",search:()=>new Promise(()=>{})},
  {id:"volan",search:()=>Promise.reject(Error("private failure"))}
 ];
 const out=await runParallelSearch({adapters,query:{},budgetMs:240,
  sourceBudgetMs:40,finalize:async()=>({text:"DEMO partial"})});
 assert.equal(out.status,"partial");
 assert.equal(out.best.id,"b");
 assert.equal(out.finalized.text,"DEMO partial");
 assert.equal(out.sources.find(x=>x.source==="mav").status,"timeout");
 assert.equal(out.sources.find(x=>x.source==="volan").status,"error");
 assert.ok(out.elapsedMs<240);
});
test("a slow finalizer is stopped by the shared hard deadline",async()=>{
 const out=await runParallelSearch({
  adapters:[adapter("bkk",2,[candidate("b","bkk")],[])],query:{},
  budgetMs:100,sourceBudgetMs:30,
  finalize:()=>new Promise(()=>{})
 });
 assert.equal(out.status,"deadline_exceeded");
 assert.equal(out.finalized,null);
 assert.ok(out.elapsedMs>=90&&out.elapsedMs<500);
});
test("an external cancellation terminates even a hanging adapter",async()=>{
 const ac=new AbortController();
 const running=runParallelSearch({adapters:[
  {id:"google",search:()=>new Promise(()=>{})}
 ],query:{},budgetMs:700,sourceBudgetMs:500,signal:ac.signal});
 await wait(15);ac.abort();
 const out=await running;
 assert.equal(out.status,"cancelled");
 assert.equal(out.best,null);
 assert.ok(out.elapsedMs<500);
});
test("malformed, spoofed, or unverifiable data cannot become a candidate",async()=>{
 assert.equal(normalizedCandidate(candidate("bad","google"),"mav"),null);
 assert.equal(normalizedCandidate({...candidate("x","google"),score:NaN},"google"),null);
 assert.equal(normalizedCandidate({...candidate("x","google"),provenance:"operator"},"google"),null);
 const out=await runParallelSearch({adapters:[
  adapter("google",1,[{...candidate("x","google"),transfers:-1}],[])
 ],query:{},budgetMs:150,sourceBudgetMs:35});
 assert.equal(out.status,"no_candidates");
 assert.equal(out.best,null);
 assert.equal(out.finalized,null);
});
test("budget is capped at 30s, no real API or AI calls are hidden in pilot",async()=>{
 assert.equal(MAX_BUDGET_MS,30000);
 await assert.rejects(runParallelSearch({adapters:[
  adapter("bkk",1,[],[])
 ],budgetMs:30001}),/invalid_budget_or_callbacks/);
 const dir="sh9/smart-travel/public-transport/smart-trip/v5/parallel/";
 const core=readFileSync(dir+"parallel-orchestrator.mjs","utf8");
 const client=readFileSync(dir+"client.mjs","utf8");
 const html=readFileSync(dir+"index.html","utf8");
 for(const content of [core,client,html]){
  assert.doesNotMatch(content,/HH_SMART_TRIP_GOOGLE_ROUTES_KEY|SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(content,/https:\/\/routes\.googleapis\.com|\/functions\/v1\//);
 }
 assert.doesNotMatch(client,/fetch\s*\(|localStorage|sessionStorage|\.insert\(|\.upsert\(/);
 assert.match(html,/KIZÁRÓLAG SZIMULÁCIÓ/);
 assert.match(html,/30 másodperc/);
});
