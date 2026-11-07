/* Matrix V4: explicit user-click, dedicated local GTFS Workers.
 * Real execution is concurrent with BKK network and the other GTFS worker.
 * Each worker self-destructs when complete, aborted or errored.
 * No raw timetable data leaves its originating worker / same browser origin.
 */
const WORKERS=new Set(["mav","volan"]);
function createWorkerProvider(provider,{
 WorkerClass=globalThis.Worker,
 workerUrl=new URL("./matrix-local-worker-v4.mjs",import.meta.url)
}={}){
 if(!WORKERS.has(provider))throw Error("invalid_gtfs_provider");
 return function search({request,graph,signal}={}){
  if(signal?.aborted)return Promise.resolve({status:"cancelled",routes:[]});
  if(typeof WorkerClass!=="function")return Promise.resolve({
   status:"worker_not_supported",routes:[]});
  return new Promise(resolve=>{
   let done=false,worker;
   const finish=result=>{
    if(done)return;
    done=true;
    signal?.removeEventListener("abort",abort);
    try{worker?.terminate()}catch(_){}
    resolve({
     status:typeof result?.status==="string"?result.status:"unavailable",
     routes:Array.isArray(result?.routes)?result.routes.slice(0,80):[]
    });
   };
   const abort=()=>finish({status:"cancelled",routes:[]});
   try{
    worker=new WorkerClass(workerUrl,{type:"module",name:"matrix-"+provider});
    worker.onmessage=e=>{
     if(e?.data?.id!==1||e.data.provider!==provider||
      e.data.kind!=="result")return;
     finish(e.data.result);
    };
    worker.onerror=()=>finish({status:"worker_error",routes:[]});
    worker.onmessageerror=()=>finish({status:"worker_invalid_message",routes:[]});
    signal?.addEventListener("abort",abort,{once:true});
    if(signal?.aborted){abort();return}
    worker.postMessage({id:1,action:"search",provider,request,graph});
   }catch(_){finish({status:"worker_unavailable",routes:[]})}
  });
 };
}
export {createWorkerProvider};
