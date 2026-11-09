/* SHO V5: REAL existing BKK/GTFS source lanes, read-only pilot.
 * Not Google, not an LLM, not a multioperator door-to-door planner.
 */
import {runParallelSearch,MAX_BUDGET_MS} from "./parallel-orchestrator.mjs";
import {createReadOnlyAdapters,PROVIDERS} from "./local-source-bridge.mjs";
import {search as bkkSearch} from "../../smart-trip-bkk-v1107.mjs";
const $=id=>document.getElementById(id);
const names={bkk:"BKK",mav:"MÁV",volan:"Volán"};
const RULES=new URL("../../../../../super-search/matrix-v4/matrix-rules-v4.json",import.meta.url);
let active=null;
function query(){
 const pairs=Object.fromEntries(PROVIDERS.map(id=>[id,{
  from:$(id+"-from").value.trim(),to:$(id+"-to").value.trim()
 }]));
 return {date:$("day").value,time:$("time").value,profile:$("profile").value,
  priority:$("priority").value,pairs};
}
function add(tag,content,into,cls){
 const e=document.createElement(tag);e.textContent=String(content??"");
 if(cls)e.className=cls;into.append(e);return e;
}
function showAudit(result,audit,selected){
 const holder=$("source-results");holder.replaceChildren();
 for(const id of PROVIDERS){
  const report=audit[id],state=result.sources.find(s=>s.source===id);
  const section=add("article","",holder,"route");
  add("strong",names[id]+" · "+(report?.status||state?.status||"nincs válasz"),section);
  add("p",report?.providerStatus?
   "Forrásállapot: "+report.providerStatus+" · keresés: "+state.elapsedMs+" ms":
   "Nincs igazolt, teljes megállópár-útvonal. A helyi GTFS hiányozhat.",section);
  const p=report?.tripPack;
  if(!p)continue;
  add("p",p.from+" → "+p.to+" · "+p.departure+"–"+p.arrival+
   " · "+report.selection?.transfers+" átszállás",section);
  for(const leg of p.segments.slice(0,8))
   add("div",leg.line+" · "+leg.departure+" "+leg.from+" → "+
    leg.arrival+" "+leg.to,section,"segment");
  if(id!==selected)add("small","Különálló megállópár: a kiválasztott útvonalhoz nem kapcsolható automatikusan.",section);
 }
 const chosen=audit[selected];
 const resultBox=$("selected");resultBox.replaceChildren();
 if(chosen?.tripPack){
  add("strong","✅ Ellenőrzött menetrendi szakasz · "+names[selected],resultBox);
  add("p",chosen.tripPack.title+" | "+chosen.tripPack.departure+
   "–"+chosen.tripPack.arrival,resultBox);
  add("p","Ez valódi, rendelkezésre álló menetrendi adat, de NEM ajtótól ajtóig A terv. Nincs élő késés vagy igazolt gyalogos összekötés.",resultBox);
 }else add("p","A kiválasztott megállópárra nem érkezett igazolt, teljes útvonal. Nincs kitalált A terv.",resultBox);
}
async function run(){
 if(active)return;
 const clock=performance.now(),abort=new AbortController();
 active=abort;$("run").disabled=true;$("cancel").disabled=false;
 $("results").hidden=true;$("status").textContent="Olvasási célú menetrendi keresés indítása...";
 PROVIDERS.forEach(id=>{$("state-"+id).textContent="Várakozás..."});
 const hard=setTimeout(()=>abort.abort(),29_800);
 const ticker=setInterval(()=>{
  $("stopwatch").textContent=((performance.now()-clock)/1000).toFixed(2).replace(".",",")+" mp";
 },40);
 const selected=$("primary").value,audit={};
 try{
  const req=query();
  const response=await fetch(RULES,{signal:abort.signal,cache:"no-store",
   credentials:"same-origin",redirect:"error"});
  if(!response.ok)throw Error("A meglévő Matrix V4 menetrendi szabályok nem elérhetők.");
  const raw=await response.text();
  if(raw.length>10_000)throw Error("Hibás méretű szabálykészlet.");
  const rules=JSON.parse(raw);
  if(abort.signal.aborted)throw Error("Lejárt a teljes 30 mp-es időkeret.");
  const remaining=Math.floor(MAX_BUDGET_MS-(performance.now()-clock)-200);
  if(remaining<150)throw Error("Lejárt a teljes 30 mp-es időkeret.");
  const adapters=createReadOnlyAdapters({
   rules,bkkSearch,wallCore:globalThis.SH9_MAV_GTFS_CORE_V1,primary:selected,audit
  });
  const result=await runParallelSearch({
   adapters,query:req,signal:abort.signal,
   budgetMs:remaining,sourceBudgetMs:12_000,
   onProgress:e=>{
    if(e.phase==="source"){
     const record=audit[e.source];
     $("state-"+e.source).textContent=record?.status||e.status;
    }
   },
   finalize:async()=>({status:"read_only_verified_stop_pair_no_ai"})
  });
  $("stopwatch").textContent=((performance.now()-clock)/1000).toFixed(2).replace(".",",")+" mp";
  if(abort.signal.aborted||result.status==="cancelled"){
   $("status").textContent="⚠️ A keresés megszakadt vagy lejárt a teljes 30 mp. Nem történt mentés.";
  }else{
   showAudit(result,audit,selected);
   $("results").hidden=false;
   $("status").textContent=(result.best?"✅ Menetrendi szakasz érkezett. ":"⚠️ Nincs ellenőrzött találat a kiválasztott megállópárhoz. ")+
    "Teljes keresés: "+((performance.now()-clock)/1000).toFixed(2).replace(".",",")+
    " mp · valós szolgáltatói élő adatok és Google nem szerepelnek.";
  }
 }catch(e){
  $("status").textContent="⚠️ "+(abort.signal.aborted?
   "A keresés megszakítva vagy elérte a 30 másodperces határt.":
   (e?.message||"A források nem érhetők el."));
 }finally{
  clearInterval(ticker);clearTimeout(hard);active=null;
  $("run").disabled=false;$("cancel").disabled=true;
  $("stopwatch").textContent=((performance.now()-clock)/1000).toFixed(2).replace(".",",")+" mp";
 }
}
$("run").addEventListener("click",()=>{void run()});
$("cancel").addEventListener("click",()=>active?.abort());
