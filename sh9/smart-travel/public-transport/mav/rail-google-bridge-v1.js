/* MÁV B-plan · Google Routes transport bridge.
 * No paid request until backend credential, Google quota, billing authorization and
 * compliance checks are explicitly configured. ZERO background polling.
 */
(function(){
'use strict';
if(typeof window==='undefined'||typeof document==='undefined')return;
const cfg=window.SH9_MAV_GOOGLE_ROUTES_CONFIG;
const google=window.SH9_MAV_GOOGLE_ROUTES_V1;
const ui=window.SH9_MAV_JOURNEYS_INSTANCE;
if(cfg?.enabled!==true||!google||!ui?.showTimetable)return;
let endpoint;
try{endpoint=new URL(cfg.endpoint)}catch(_){return}
if(endpoint.protocol!=='https:'||!/^[a-z0-9-]+\.supabase\.co$/.test(endpoint.hostname)||
 endpoint.pathname!=='/functions/v1/hh-mav-google-routes-v1'||
 endpoint.search||endpoint.hash)return;
const max=Math.min(6,Math.max(1,Number(cfg.maxRequestsPerSession)||1));
const cooldown=Math.max(30,Number(cfg.cooldownSeconds)||30)*1000;
const search=document.getElementById('find'),refresh=document.getElementById('refresh');
if(!search||!refresh)return;
const fallback=search.onclick;
let count=0,lastRequest=0,busy=false;
function status(message){
 const label=document.querySelector('#depart .rail-source-status');
 if(label)label.textContent=message;
}
async function perform(){
 const query=ui.currentQuery(),body=google.request(query);
 if(!body){status('Két különböző állomás és érvényes időpont szükséges.');return}
 if(busy)return;
 if(count>=max){status('Google útvonalkeresési keret elérve. Használd a díjmentes Google Térkép gombot.');if(fallback)fallback();return}
 if(Date.now()-lastRequest<cooldown){status('A fizetős Google-keresés ritkított.');return}
 count++;lastRequest=Date.now();busy=true;
 status('Google tömegközlekedési útvonal keresése…');
 try{
  const ctrl=new AbortController();
  const request=fetch(endpoint.href,{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({from:query.from,to:query.to,mode:query.mode,when:query.when}),
   credentials:'omit',cache:'no-store',signal:ctrl.signal
  });
  const reply=await request;
  if(!reply.ok)throw new Error('Google routing gateway unavailable');
  const length=Number(reply.headers.get('content-length')||0);
  if(length>400000)throw new Error('Response size limit');
  const bytes=await reply.arrayBuffer();
  if(bytes.byteLength>400000)throw new Error('Response size limit');
  const raw=JSON.parse(new TextDecoder().decode(bytes));
  const result=google.normalizeResponse(raw,query);
  if(!result||!result.journeys.length)throw new Error('No train journeys');
  ui.showTimetable(result,query);
 }catch(_){
  status('A Google-alapú útvonal most nem érhető el. Megnyitható az ingyenes útvonaltervező.');
  if(fallback)fallback();
 }finally{busy=false}
}
search.onclick=()=>{void perform()};
refresh.onclick=()=>{void perform()};
})();
