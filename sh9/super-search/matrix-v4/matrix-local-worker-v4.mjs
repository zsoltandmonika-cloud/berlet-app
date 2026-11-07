/* SHO Matrix V4: dedicated worker for ONE local GTFS provider.
 * Loads the existing planner on a worker thread; no main-thread blocking.
 * Raw GTFS stays in this same-origin worker and never crosses postMessage.
 */
import {createLocalGTFSAdapter} from "./matrix-existing-sources-v4.mjs";
import {createReadOnlyLocalFeedReader} from "./matrix-local-feed-reader-v4.mjs";
const isWorker=typeof WorkerGlobalScope!=="undefined"&&globalThis instanceof WorkerGlobalScope;
if(!isWorker)throw Error("matrix_worker_only");
globalThis.window=globalThis; // needed only to attach existing UMD core
await import("../../smart-travel/public-transport/mav/rail-gtfs-core-v1.js");
delete globalThis.window;
const core=globalThis.SH9_MAV_GTFS_CORE_V1;
if(!core||typeof core.route!=="function"||typeof core.validate!=="function")
 throw Error("existing_gtfs_core_missing");
const reader=createReadOnlyLocalFeedReader(globalThis.indexedDB);
const handlers={
 mav:createLocalGTFSAdapter("mav",{core,readExistingLocalDataset:reader}),
 volan:createLocalGTFSAdapter("volan",{core,readExistingLocalDataset:reader})
};
let active=null;
globalThis.addEventListener("message",async e=>{
 const msg=e.data;
 if(!msg||msg.action!=="search"||msg.id!==1||
  !["mav","volan"].includes(msg.provider)||active)return;
 active=new AbortController();
 let result={status:"unavailable",routes:[]};
 try{
  result=await handlers[msg.provider]({
   request:msg.request,graph:msg.graph,signal:active.signal});
 }catch(_){result={status:"worker_failed",routes:[]}}
 if(active?.signal.aborted)return;
 // Only verified itinerary segments, never imported dataset or private GTFS.
 globalThis.postMessage({id:1,kind:"result",provider:msg.provider,result:{
  status:result.status,routes:Array.isArray(result.routes)?
   result.routes.slice(0,80):[]
 }});
});
