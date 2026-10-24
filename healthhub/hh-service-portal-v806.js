/* HH Service Portal v806 · owner-approved, non-clinical diagnostics to private ChatGPT Dropbox.
 * Never uploads tokens, credentials, health records, coordinates, names, free-text errors or stacks.
 * No background upload. Every report requires an explicit user click + confirmation.
 */
(function(w,d){
'use strict';
const ID='hhServicePortal806',ROOT='/HealthHub-ChatGPT-Analytics';
const ROOT_ID='id:n7qchVNGAogAAAAAAAAABQ';
const FILE=ROOT+'/hh-service-last.json';
let busy=false;
const get=id=>d.getElementById(id);
const validTime=s=>{const v=Date.parse(s||'');return Number.isFinite(v)?new Date(v).toISOString():null};
const owner=()=>{try{return w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return 'unknown'}};
function errClass(s){
 const t=String(s||'').toLowerCase();
 if(/429|too_many|rate.limit|limit|quota/.test(t))return 'rate_limit';
 if(/oauth|refresh.token|access.token|authentication/.test(t))return 'auth';
 if(/dropbox|vault|cloud/.test(t))return 'dropbox';
 if(/geoloc|gps|location|hely/.test(t))return 'geolocation';
 if(/denied|permission|engedély/.test(t))return 'permission';
 if(/network|fetch|http|offline|cors/.test(t))return 'network';
 if(/render|layout|scroll|dom/.test(t))return 'render';
 return 'other';
}
function errorSummary(){
 let all=[];
 try{if(typeof w.hhErrorLogRead==='function')all=w.hhErrorLogRead()}catch(_){}
 if(!Array.isArray(all))return {total:0,types:[],recent:[]};
 const cutoff=Date.now()-24*3600000;
 const recent=all.filter(x=>Date.parse(x&&x.at||0)>=cutoff).slice(0,24);
 const counts={};
 for(const x of recent){const type=errClass(String(x&&x.message||'')+' '+String(x&&x.source||''));counts[type]=(counts[type]||0)+1}
 // No raw messages, free text, addresses, URLs, tokens, stack traces or user agents.
 return {total:recent.length,types:Object.keys(counts).sort().map(type=>({type,count:counts[type]})),
  recent:recent.slice(0,8).map(x=>({at:validTime(x.at),level:x.level==='warn'?'warn':'error',type:errClass(x.message)}))};
}
function gpsSummary(){
 try{
  const v=JSON.parse(w.localStorage.getItem('hh-service-guardian-gps-v806')||'null');
  if(!v||!['starting','fix','error','stopped','paused','unsupported'].includes(v.state))return {state:'not_observed'};
  return {state:v.state,at:validTime(v.at),errorCode:[1,2,3].includes(v.errorCode)?v.errorCode:null};
 }catch(_){return {state:'not_observed'}}
}
function cloudConnected(){
 try{const v=w.HH_DROPBOX_VAULT;return !!(v&&v.connected&&v.connected())}catch(_){return false}
}
function registrySummary(){
 const api=w.hhDeviceRegistry401;
 const reg=api&&typeof api.registry==='function'?api.registry():null;
 if(!reg||reg.schema!=='healthhub.device_registry/1'||!reg.activePhones)return {readable:false};
 return {readable:true,selected:{
  zsolt:typeof reg.activePhones.zsolt==='string'&&reg.activePhones.zsolt.length>0,
  monika:typeof reg.activePhones.monika==='string'&&reg.activePhones.monika.length>0
 },updatedAt:validTime(reg.updatedAt)};
}
async function deviceSummary(){
 if(!cloudConnected()||typeof w.hhOrchestratorDevices305!=='function')return {readable:false};
 try{
  const ds=await w.hhOrchestratorDevices305(),out={};
  for(const p of ['zsolt','monika']){
   const a=(Array.isArray(ds)?ds:[]).filter(x=>x&&x.deviceType==='android'&&x.activeProfile===p);
   const last=a.sort((x,y)=>Date.parse(y.lastSeenAt||0)-Date.parse(x.lastSeenAt||0))[0];
   out[p]={reportCount:a.length,lastHeartbeatAt:validTime(last&&last.lastSeenAt),
      lastBuildCode:Number.isInteger(last&&last.buildCode)?last.buildCode:null,
      lastCommandState:['pending','running','done','partial','failed','expired','rejected'].includes(last&&last.status&&last.status.state)?last.status.state:'unknown'};
  }
  return {readable:true,profiles:out};
 }catch(e){return {readable:false,errorType:errClass(e&&e.message||e)}}
}
function domSnapshot(){
 const admin=w.healthSectionKind==='more';
 return {adminVisible:admin,adminQuickPresent:!!get('hhAdminQuickV748'),
  registryPanelPresent:!!get('hhDeviceRegistry401'),orchestratorPanelPresent:!!get('hhSyncOrchestrator305'),
  cloudCardPresent:!!get('hhUnifiedCloudVaultCard'),versionPanelPresent:!!get('sh9VersionCenterV1'),
  counters:{cloudCardPaints:Number(w.__hhServiceUiCountersV806&&w.__hhServiceUiCountersV806.cloudPaints)||0,
     orchestratorCardPaints:Number(w.__hhServiceUiCountersV806&&w.__hhServiceUiCountersV806.orchPaints)||0}};
}
async function snapshot(){
 let locationPermission='unavailable';
 try{if(w.navigator.permissions){const x=await w.navigator.permissions.query({name:'geolocation'});locationPermission=['granted','prompt','denied'].includes(x.state)?x.state:'unknown'}}catch(_){}
 return {schema:'healthhub.service.diagnostics/1',capturedAt:new Date().toISOString(),issuedBy:'explicit_user_action',
  source:'HealthHub browser client',profile:owner(),
  environment:{online:w.navigator.onLine===true,secureContext:w.isSecureContext===true,
    mobile:/Android|iPhone/i.test(w.navigator.userAgent||''),geolocationPermission:locationPermission},
  cloud:{healthhubVaultLocalConnection:cloudConnected(),targetConnectionCheckedOnUpload:true},
  registry:registrySummary(),devices:await deviceSummary(),ui:domSnapshot(),
  guardianGps:gpsSummary(),errors24h:errorSummary()};
}
async function upload(report){
 const A=w.HH_CHATGPT_TARGET_AUTH_V739,V=w.HH_CHATGPT_TARGET_ONBOARD_V739;
 if(!A||!V)throw Error('A privát ChatGPT Dropbox-kapcsolat modulja hiányzik.');
 const folder=await V.verifyTargetFolder();
 if(folder.id!==ROOT_ID||String(folder.path).toLowerCase()!==ROOT.toLowerCase())throw Error('Eltérő cél Dropbox. A megosztás letiltva.');
 const payload=JSON.stringify(report,null,2)+'\n';
 const token=await A.accessToken();
 const req=await w.fetch('https://content.dropboxapi.com/2/files/upload',{method:'POST',
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/octet-stream',
   'Dropbox-API-Arg':JSON.stringify({path:FILE,mode:'overwrite',autorename:false,mute:true})},body:payload});
 if(!req.ok)throw Error('Dropbox feltöltés sikertelen (HTTP '+req.status+')');
 const data=await req.json();
 if(String(data.path_lower||'').toLowerCase()!==FILE.toLowerCase())throw Error('Nem a várt célfájl frissült.');
 const check=await w.fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',
  headers:{Authorization:'Bearer '+token,'Dropbox-API-Arg':JSON.stringify({path:FILE})}});
 if(!check.ok)throw Error('Dropbox visszaolvasás sikertelen (HTTP '+check.status+')');
 if(await check.text()!==payload)throw Error('A visszaolvasott diagnosztika eltér. Megosztás nem igazolt.');
 return FILE;
}
function open(){
 if(!get(ID))mount();
 const panel=get(ID);if(panel)panel.hidden=false;
}
function close(){const panel=get(ID);if(panel)panel.hidden=true}
function mount(){
 if(get(ID)||!d.body)return;
 const panel=d.createElement('section');panel.id=ID;panel.hidden=true;
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 panel.setAttribute('aria-label','HH Service Portal');
 panel.style.cssText='position:fixed;inset:0;z-index:2147483000;background:rgba(3,12,30,.95);color:#edf7ff;padding:calc(18px + env(safe-area-inset-top)) 16px;overflow:auto;font:15px/1.55 system-ui';
 const content=d.createElement('div');content.style.cssText='max-width:700px;margin:auto;background:#142d47;border:1px solid #8bc1e3;border-radius:18px;padding:17px';
 const h=d.createElement('h2');h.textContent='🛠️ HH One · Léna Service Portal';h.style.margin='0 0 10px';
 const intro=d.createElement('p');intro.textContent='Egyszeri, jóváhagyott műszaki állapotjelentés. Nem tartalmaz egészségügyi méréseket, GPS-koordinátákat, jelszavakat, tokeneket, személyes hibaüzeneteket vagy részletes naplókat.';
 const details=d.createElement('p');details.textContent='Ellenőrzés: Dropbox-kapcsolat, kijelölt telefonok, utolsó eszközjelentés, Admin-újrarajzolások, GPS-engedély és hibakategóriák. Az elküldött jelentés a privát HealthHub-ChatGPT-Analytics mappában marad.';
 const status=d.createElement('p');status.id=ID+'Status';status.setAttribute('role','status');status.textContent='Nincs elküldött diagnosztika.';
 const buttons=d.createElement('div');buttons.style.cssText='display:flex;flex-wrap:wrap;gap:10px';
 function make(label,handler){const b=d.createElement('button');b.type='button';b.textContent=label;b.style.cssText='background:#245c7f;color:#fff;border:1px solid #8bc1e3;border-radius:12px;padding:13px 14px;min-height:48px;font-weight:750';b.addEventListener('click',handler);buttons.append(b);return b}
 const share=make('🔐 Egyszeri diagnosztika megosztása',async()=>{
  if(busy)return;
  if(!w.confirm('Engedélyezed egy kizárólag műszaki adatokat tartalmazó jelentés egyszeri feltöltését a privát ChatGPT Dropbox mappába? Nem indul folyamatos megfigyelés.'))return;
  busy=true;share.disabled=true;status.textContent='Műszaki állapot összeállítása és ellenőrzött privát feltöltés…';
  try{const doc=await snapshot();const file=await upload(doc);
   status.textContent='✓ Feltöltve és visszaolvasva: '+file+'. Most már ellenőrizhető a ChatGPT Dropbox-kapcsolaton keresztül.'}
  catch(e){status.textContent='⚠ A megosztás nem igazolt: '+String(e.message||e).slice(0,180)+'. A meglévő beállításokat nem módosítottuk.'}
  finally{busy=false;share.disabled=false}
 });
 make('✕ Bezárás',close);
 content.append(h,intro,details,buttons,status);panel.append(content);d.body.append(panel);
}
w.HH_SERVICE_PORTAL_V806=Object.freeze({open,close,snapshot});
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})(window,document);
