/* Offline orchestration demonstrator. No network / no AI / no saves.
 * The invented fixture only illustrates parallel timing, never live transit.
 */
import {runParallelSearch,MAX_BUDGET_MS} from "./parallel-orchestrator.mjs";
const $=id=>document.getElementById(id);
const times={google:850,bkk:480,mav:620,volan:1080};
const demo={
 google:{id:"google-demo",travelMinutes:196,walkMeters:430,transfers:2,score:48},
 bkk:{id:"bkk-demo",travelMinutes:205,walkMeters:350,transfers:2,score:60},
 mav:{id:"mav-demo",travelMinutes:183,walkMeters:280,transfers:1,score:22},
 volan:{id:"volan-demo",travelMinutes:201,walkMeters:160,transfers:1,score:15}
};
const card=(id)=>$("state-"+id);
let running=false;
function source(id){
 return {id,search:(_query,{signal})=>new Promise(resolve=>{
  if(signal.aborted){resolve({candidates:[]});return}
  const stop=()=>{
   clearTimeout(timer);signal.removeEventListener("abort",stop);
   resolve({candidates:[]});
  };
  const timer=setTimeout(()=>{
   signal.removeEventListener("abort",stop);
   resolve({candidates:[{...demo[id],source:id,provenance:"synthetic"}]});
  },times[id]);
  signal.addEventListener("abort",stop,{once:true});
 })};
}
function renderProgress(e){
 if(e.phase==="source")card(e.source).textContent=e.status+
  " · "+e.count+" jelölt · "+e.elapsedMs+" ms";
 if(e.phase==="finalizing")$("phase").textContent="Értékelés és válasz összeállítása";
 if(e.phase==="finished")$("phase").textContent="Befejezve · "+e.status;
}
$("start").addEventListener("click",async()=>{
 if(running)return;
 running=true;$("start").disabled=true;$("result").textContent="";
 $("phase").textContent="Párhuzamos keresés";
 for(const id of Object.keys(times))card(id).textContent="keresés...";
 const begin=performance.now();
 const ticker=setInterval(()=>{
  $("timer").textContent=((performance.now()-begin)/1000).toFixed(2).replace(".",",")+" mp";
 },35);
 try{
  const out=await runParallelSearch({
   adapters:Object.keys(times).map(source),query:{kind:"offline-fixture"},
   budgetMs:MAX_BUDGET_MS,sourceBudgetMs:18_000,
   onProgress:renderProgress,
   finalize:async({best},{signal})=>{
    await new Promise(resolve=>setTimeout(resolve,250));
    if(signal.aborted)return null;
    return {message:"DEMO: a szimulált útvonalak közül a legkedvezőbb jelölt: "+
     best.source.toUpperCase()+". Ez NEM valós menetrendi ajánlás."};
   }
  });
  $("timer").textContent=(out.elapsedMs/1000).toFixed(2).replace(".",",")+" mp";
  $("result").textContent=(out.finalized?.message||
   "Nincs megbízható jelölt vagy lejárt a határidő.")+
   " Teljes folyamat: "+out.elapsedMs+" ms / "+out.budgetMs+
   " ms. Jelölt státusza: "+out.selection+".";
 }catch{
  $("result").textContent="A szimuláció nem futott le; valódi járatkeresés nem történt.";
 }finally{
  clearInterval(ticker);running=false;$("start").disabled=false;
 }
});
