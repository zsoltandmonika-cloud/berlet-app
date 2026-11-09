/* SHO Smart Trip V5 · isolated reusable parallel coordinator.
 * No provider/network calls, API keys, AI forwarding or My Trips writes here.
 * Adapters must normalize AND validate source data before returning candidates.
 * A selected candidate is always PRELIMINARY until independent verification.
 */
export const MAX_BUDGET_MS=30_000;
const SOURCES=new Set(["google","bkk","mav","volan"]);
const clock=()=>globalThis.performance?.now?.()??Date.now();
const clampNumber=n=>Number.isFinite(n)&&n>=0;
const notify=(fn,event)=>{try{fn(event)}catch{/* UI callbacks must not stop a search */}};

// Source and metric validation is centralized, with no trust escalation:
// a Google result can never be presented as independently operator-verified.
export function normalizedCandidate(c,source){
 if(!c||typeof c!=="object"||Array.isArray(c)||
  c.source!==source||typeof c.id!=="string"||!c.id.trim()||c.id.length>120||
  !["synthetic","google","operator"].includes(c.provenance)||
  ((source==="google"&&c.provenance==="operator")||
   (source!=="google"&&c.provenance==="google"))||
  !Number.isFinite(c.travelMinutes)||c.travelMinutes<=0||c.travelMinutes>1440||
  !clampNumber(c.walkMeters)||c.walkMeters>20000||
  !Number.isInteger(c.transfers)||c.transfers<0||c.transfers>12||
  !Number.isFinite(c.score)||c.score<0||c.score>1e7)return null;
 return Object.freeze({id:c.id,source,provenance:c.provenance,
  travelMinutes:c.travelMinutes,walkMeters:c.walkMeters,
  transfers:c.transfers,score:c.score});
}
const sourceSummary=(id,status,elapsedMs,candidates=[])=>({
 source:id,status,elapsedMs:Math.max(0,Math.round(elapsedMs)),candidates
});

export async function runParallelSearch({
 adapters,query,budgetMs=MAX_BUDGET_MS,sourceBudgetMs=18_000,
 finalize=async()=>null,onProgress=()=>{},signal
}={}){
 if(!Array.isArray(adapters)||adapters.length<1||adapters.length>4||
  adapters.some(a=>!a||!SOURCES.has(a.id)||typeof a.search!=="function")||
  new Set(adapters.map(a=>a.id)).size!==adapters.length)
  throw Error("invalid_adapters");
 if(!Number.isFinite(budgetMs)||budgetMs<50||budgetMs>MAX_BUDGET_MS||
  !Number.isFinite(sourceBudgetMs)||sourceBudgetMs<1||
  typeof finalize!=="function"||typeof onProgress!=="function")
  throw Error("invalid_budget_or_callbacks");
 const start=clock(),master=new AbortController();
 const finished=[],reserveMs=Math.min(4_000,Math.max(10,Math.floor(budgetMs*0.15)));
 const sourceLimit=Math.min(sourceBudgetMs,Math.max(1,budgetMs-reserveMs));
 let expired=false,externalAbort=false,deadlineWake,deadlineTimer;
 const deadline=new Promise(resolve=>{deadlineWake=resolve});
 const stop=()=>{if(!master.signal.aborted)master.abort()};
 const onExternal=()=>{
  externalAbort=true;stop();deadlineWake({kind:"cancelled"});
 };
 if(signal?.aborted)onExternal();
 else signal?.addEventListener("abort",onExternal,{once:true});
 deadlineTimer=setTimeout(()=>{
  expired=true;stop();deadlineWake({kind:"deadline"});
 },budgetMs);
 const elapsed=()=>Math.max(0,Math.round(clock()-start));
 notify(onProgress,{phase:"started",elapsedMs:0,sources:adapters.map(a=>a.id)});
 async function one(adapter){
  const born=clock(),controller=new AbortController();
  let timer,abortResolve;
  const cancellation=new Promise(resolve=>{abortResolve=resolve});
  const onCancel=()=>{controller.abort();abortResolve({kind:"cancelled"})};
  if(master.signal.aborted)onCancel();
  else master.signal.addEventListener("abort",onCancel,{once:true});
  const timeout=new Promise(resolve=>{
   timer=setTimeout(()=>{controller.abort();resolve({kind:"timeout"})},sourceLimit);
  });
  const work=Promise.resolve().then(()=>{
   if(controller.signal.aborted)return {kind:"cancelled"};
   return adapter.search(query,{signal:controller.signal,timeoutMs:sourceLimit});
  }).then(v=>v?.kind==="cancelled"?v:{kind:"value",value:v},
   ()=>({kind:"error"}));
  const first=await Promise.race([work,timeout,cancellation]);
  clearTimeout(timer);
  master.signal.removeEventListener("abort",onCancel);
  if(first.kind!=="value")controller.abort();
  let candidates=[];
  if(first.kind==="value"&&Array.isArray(first.value?.candidates)){
   candidates=first.value.candidates.slice(0,12).map(c=>
    normalizedCandidate(c,adapter.id)).filter(Boolean);
  }
  const status=first.kind==="value"?(candidates.length?"ok":"empty"):
   first.kind==="error"?"error":first.kind;
  const result=sourceSummary(adapter.id,status,clock()-born,candidates);
  finished.push(result);
  notify(onProgress,{phase:"source",source:adapter.id,status,
   count:candidates.length,elapsedMs:elapsed()});
  return result;
 }
 try{
  if(externalAbort)return {status:"cancelled",elapsedMs:elapsed(),
   budgetMs:budgetMs,sources:[],best:null,finalized:null};
  const all=Promise.all(adapters.map(one));
  await Promise.race([all,deadline]);
  const results=adapters.map(a=>finished.find(x=>x.source===a.id)||
   sourceSummary(a.id,expired?"timeout":"cancelled",elapsed()));
  const candidates=results.flatMap(r=>r.candidates);
  candidates.sort((a,b)=>a.score-b.score||a.travelMinutes-b.travelMinutes||
   a.id.localeCompare(b.id));
  const best=candidates[0]||null;
  let finalized=null,finalizeFailed=false;
  if(best&&!expired&&!externalAbort){
   notify(onProgress,{phase:"finalizing",elapsedMs:elapsed(),count:candidates.length});
   const finalWork=Promise.resolve().then(()=>finalize({
    best,candidates,results,remainingMs:Math.max(0,budgetMs-elapsed())
   },{signal:master.signal})).then(v=>({kind:"ok",value:v}),
    ()=>({kind:"error"}));
   const outcome=await Promise.race([finalWork,deadline]);
   if(outcome?.kind==="ok"&&!expired&&!externalAbort)finalized=outcome.value??null;
   else if(outcome?.kind==="error")finalizeFailed=true;
  }
  const status=externalAbort?"cancelled":expired?"deadline_exceeded":
   !best?"no_candidates":finalizeFailed?"finalize_failed":
   results.some(r=>r.status!=="ok")?"partial":"complete";
  const answer={status,elapsedMs:elapsed(),budgetMs,
   sources:results,best,selection:"preliminary_not_independently_verified",
   finalized:expired||externalAbort?null:finalized};
  notify(onProgress,{phase:"finished",status,elapsedMs:answer.elapsedMs,
   hasCandidate:!!best});
  return answer;
 }finally{
  clearTimeout(deadlineTimer);
  signal?.removeEventListener("abort",onExternal);
  stop();
 }
}
