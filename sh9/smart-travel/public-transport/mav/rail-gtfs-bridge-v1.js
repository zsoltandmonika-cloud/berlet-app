/* SH9 MÁV Phase 2C · opt-in local schedule adapter.
 * Does not fetch unless the user triggers Search and licensed data is enabled.
 * The preexisting Google Maps/MÁVPlusz fallback works unchanged without data.
 */
(function(){
 'use strict';
 if(typeof document==='undefined')return;
 const cfg=window.SH9_MAV_GTFS_CONFIG;
 const engine=window.SH9_MAV_GTFS_CORE_V1;
 const ui=window.SH9_MAV_JOURNEYS_INSTANCE;
 if(!cfg?.enabled||!engine||!ui?.showTimetable)return;
 if(cfg.url!=='./data/rail-schedule.json'||cfg.maxBytes>8*1024*1024)return;
 const search=document.getElementById('find'),refresh=document.getElementById('refresh');
 if(!search||!refresh)return;
 const fallbackSearch=search.onclick,fallbackRefresh=refresh.onclick;
 let snapshot=null,loading=null;
 function report(message){
  const label=document.querySelector('#depart .rail-source-status');
  if(label)label.textContent=message;
 }
 async function load(){
  if(snapshot)return snapshot;
  if(loading)return loading;
  loading=(async()=>{
   const controller=new AbortController();
   // Abort is per click only; no continuous network requests.
   const request=fetch(cfg.url,{cache:'force-cache',signal:controller.signal,credentials:'omit'});
   const response=await request;
   if(!response.ok||response.type==='opaque')throw new Error('GTFS status '+response.status);
   const length=Number(response.headers.get('content-length')||0);
   if(length>cfg.maxBytes)throw new Error('GTFS exceeds size limit');
   const buffer=await response.arrayBuffer();
   if(buffer.byteLength>cfg.maxBytes)throw new Error('GTFS exceeds size limit');
   const raw=JSON.parse(new TextDecoder().decode(buffer));
   if(!engine.validate(raw))throw new Error('GTFS failed schema validation');
   snapshot=raw;return snapshot;
  })().finally(()=>loading=null);
  return loading;
 }
 async function searchSchedule(fallback){
  const q=ui.currentQuery();
  if(!q){report('Válassz két eltérő állomást és megfelelő dátumot.');return}
  report('Engedélyezett MÁV GTFS-menetrend feldolgozása…');
  try{
   const data=await load();
   const result=engine.route(data,q,{limit:3,maxTransfers:1});
   const ok=ui.showTimetable(result,q);
   if(!ok&&result.status==='invalid-feed'&&typeof fallback==='function')fallback();
  }catch(_){
   report('Helyi GTFS-adat nem érhető el; hivatalos útvonaltervező következik.');
   if(typeof fallback==='function')fallback();
  }
 }
 search.onclick=()=>{void searchSchedule(fallbackSearch)};
 refresh.onclick=()=>{void searchSchedule(fallbackRefresh)};
})();
