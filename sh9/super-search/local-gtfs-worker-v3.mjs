/* SHO Super Search v3 · isolated module Worker for authorized GTFS search.
 * Crosses ONLY the same-origin browser worker boundary. Neither a network
 * request nor an AI/browser automation endpoint. Never runs on page load.
 */
import {createLocalRailShadow} from "./travel-local-gtfs-shadow-v2.mjs";
const isWorker=typeof WorkerGlobalScope!=="undefined"&&globalThis instanceof WorkerGlobalScope;
if(!isWorker)throw Error("worker_only");
/* The existing v1120 core is UMD, written for window/Node. The temporary
 * window alias exists ONLY inside this worker, and is removed immediately.
 * No new copies or changes to the core algorithm.
 */
globalThis.window=globalThis;
await import("../smart-travel/smart-trip/rail-gtfs-core-fast-v1120.js");
delete globalThis.window;
const engine=globalThis.SH9_MAV_GTFS_FAST_V1120;
if(!engine?.prepare||!engine?.route)throw Error("rail_core_unavailable");
const shadow=createLocalRailShadow({indexedDBApi:globalThis.indexedDB,core:engine});
globalThis.addEventListener("message",async event=>{
 const msg=event?.data;
 if(!msg||msg.action!=="search"||!Number.isSafeInteger(msg.id)||
  msg.id<1||typeof msg.query!=="object")return;
 try{
  const providerResults=await shadow.getExistingResults(msg.query);
  /* Existing GTFS planner emits only verified, max-30 trip summaries.
   * Raw stops/trips, credentials, household locations are never posted.
   */
  globalThis.postMessage({id:msg.id,kind:"result",
   providerResults:providerResults||null,metrics:shadow.metrics()});
 }catch(_){
  globalThis.postMessage({id:msg.id,kind:"error",
   providerResults:null,metrics:{status:"worker_failed"}});
 }
});
