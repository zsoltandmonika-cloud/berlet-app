/* SHO Super Search v3 · nonblocking GTFS Worker bridge.
 * Worker starts ONLY after an explicit search. If slow/error/aborted, fail
 * closed to existing ChatGPT handoff; never freeze the main browser thread.
 * No network, credential, health, GPS or Supabase access.
 */
const MAX_MS=6500;
const cleanTime=n=>Number.isFinite(n)&&n>=0?Math.round(n*1000)/1000:null;
const dateOk=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s);
const timeOk=s=>typeof s==="string"&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s);
function createWorkerRailShadow({
 WorkerClass=globalThis.Worker,workerUrl=new URL("./local-gtfs-worker-v3.mjs",import.meta.url),
 setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id),
 budgetMs=MAX_MS
}={}){
 let worker=null,seq=0,disposed=false,latest=Object.freeze({status:"not_run"});
 const outstanding=new Map();
 function metrics(){return Object.freeze({...latest})}
 function finish(id,value,detail){
  const pending=outstanding.get(id);
  if(!pending)return;
  outstanding.delete(id);
  clearTimer(pending.timer);
  if(pending.signal)pending.signal.removeEventListener("abort",pending.abort);
  if(detail)latest=Object.freeze(detail);
  pending.resolve(value);
 }
 function stop(status){
  const old=worker;worker=null;
  try{old?.terminate()}catch(_){}
  for(const id of [...outstanding.keys()])finish(id,null,{status});
 }
 function onMessage(event){
  const msg=event?.data;
  if(!Number.isSafeInteger(msg?.id)||!outstanding.has(msg.id))return;
  const m=msg.metrics&&typeof msg.metrics==="object"?msg.metrics:{};
  const detail={
   status:typeof m.status==="string"&&m.status.length<=40?m.status:"unavailable",
   readMs:cleanTime(m.readMs),prepareMs:cleanTime(m.prepareMs),
   routeMs:cleanTime(m.routeMs),routeCount:Number.isInteger(m.routeCount)&&
    m.routeCount>=0&&m.routeCount<=30?m.routeCount:0,
   generatedAt:typeof m.generatedAt==="string"&&m.generatedAt.length<=35?
    m.generatedAt:null,workerThread:true,modelCalled:false,cloudSaved:false
  };
  const provider=msg.kind==="result"&&msg.providerResults&&
   typeof msg.providerResults==="object"?msg.providerResults:null;
  const safeResult=provider?.mav?.status==="ok"&&Array.isArray(provider.mav.journeys)&&
   provider.mav.journeys.length>0&&provider.mav.journeys.length<=30?
   {mav:provider.mav}:null;
  finish(msg.id,safeResult,detail);
 }
 function start(){
  if(worker)return worker;
  if(typeof WorkerClass!=="function")return null;
  try{
   worker=new WorkerClass(workerUrl,{type:"module"});
   worker.onmessage=onMessage;
   worker.onerror=()=>stop("worker_unavailable");
   worker.onmessageerror=()=>stop("worker_invalid_message");
   return worker;
  }catch(_){worker=null;return null}
 }
 function getExistingResults({from,to,travelDate,time,mode="depart",signal}={}){
  if(disposed||signal?.aborted||typeof from!=="string"||typeof to!=="string"||
   !from.trim()||!to.trim()||from.length>120||to.length>120||
   !dateOk(travelDate)||!timeOk(time)||!["now","depart","arrive"].includes(mode))
   return Promise.resolve(null);
  const live=start();
  if(!live){latest=Object.freeze({status:"worker_unavailable"});return Promise.resolve(null)}
  const id=++seq,ms=Math.min(MAX_MS,Math.max(100,Math.floor(budgetMs)));
  return new Promise(resolve=>{
   const abort=()=>stop("cancelled");
   const timer=setTimer(()=>stop("timeout"),ms);
   outstanding.set(id,{resolve,timer,signal,abort});
   if(signal)signal.addEventListener("abort",abort,{once:true});
   if(signal?.aborted){abort();return}
   try{live.postMessage({id,action:"search",query:{from,to,travelDate,time,mode}})}
   catch(_){stop("worker_post_failed")}
  });
 }
 function reset(){stop("reset");latest=Object.freeze({status:"not_run"})}
 function dispose(){disposed=true;stop("disposed")}
 return Object.freeze({getExistingResults,metrics,reset,dispose});
}
export {MAX_MS,createWorkerRailShadow};
