/* HealthHub v748 · Project Hours -> verified private ChatGPT Dropbox.
 * Browser-local Project Control remains the source of truth.
 * Explicit one-time user opt-in; active HealthHub tab only.
 * No health records, secrets, or personal project hours in public GitHub.
 */
(function(w,d){
'use strict';
const VERSION='748';
const DEST='/HealthHub-ChatGPT-Analytics/project-hours.json';
const SCHEMA='healthhub.project-hours/1';
const CONSENT='hh-project-hours-cloud-optin-v748';
const META='hh-project-hours-cloud-status-v748';
const MAX_BYTES=2*1024*1024;
let busy=false,pendingTimer=null;
const read=k=>{try{return JSON.parse(w.localStorage.getItem(k)||'null')}catch(_){return null}};
const local=()=>w.HH_PROJECT_HOURS_V747;
const target=()=>w.HH_CHATGPT_TARGET_AUTH_V739;
const guard=()=>w.HH_CHATGPT_PROFILE_SYNC_V742;
const iso=()=>new Date().toISOString();
const opted=()=>w.localStorage.getItem(CONSENT)==='1';
function snapshot(nowMs=Date.now()){
 const data=local()?.get?.();
 if(!data||typeof data!=='object')throw Error('A helyi HH Project Hours időnapló nem érhető el.');
 const baseline=data.baselineMinutes===null?null:Number(data.baselineMinutes);
 if(baseline!==null&&(!Number.isFinite(baseline)||baseline<0||baseline>6000000))
  throw Error('Érvénytelen korábbi projektórák.');
 const entries=Array.isArray(data.entries)?data.entries.map(x=>({
  minutes:Number(x.minutes),at:String(x.at||''),kind:x.kind==='timer'?'timer':'manual'
 })):[];
 if(entries.some(x=>!Number.isFinite(x.minutes)||x.minutes<=0||x.minutes>100000||
  !Number.isFinite(Date.parse(x.at))))
  throw Error('Érvénytelen időnapló-bejegyzés.');
 const runningSince=data.runningSince||null;
 if(runningSince!==null&&!Number.isFinite(Date.parse(runningSince)))
  throw Error('Érvénytelen aktív munkamenet.');
 if(baseline===null&&!entries.length&&!runningSince)
  throw Error('Előbb rögzíts egy kezdőóraszámot vagy munkamenetet.');
 const recordedMinutes=(baseline||0)+entries.reduce((n,x)=>n+x.minutes,0);
 const liveMinutes=runningSince?Math.max(0,(nowMs-Date.parse(runningSince))/60000):0;
 const snapshotMinutes=recordedMinutes+liveMinutes;
 return {
  schema:SCHEMA,project:'HealthHub',origin:'Project Control',
  generatedAt:new Date(nowMs).toISOString(),
  baseline:{minutes:baseline,source:'user-entered estimated historical project time'},
  entries,
  activeTimer:{runningSince},
  totals:{
   recordedMinutes:Number(recordedMinutes.toFixed(2)),
   snapshotMinutes:Number(snapshotMinutes.toFixed(2)),
   snapshotHours:Number((snapshotMinutes/60).toFixed(2))
  },
  caveat:'A kezdeti projektidő becslés. Az aktív időmérő időtartama az utolsó szinkron pillanatáig számított érték.'
 };
}
function status(txt){
 for(const el of d.querySelectorAll('[data-hh-project-hours-cloud-status]'))el.textContent=txt;
}
function currentStatus(){
 const s=read(META);
 if(s?.verifiedAt){
  return '✓ Dropboxba feltöltve és SHA-256 alapján visszaolvasva: '+
    new Date(s.verifiedAt).toLocaleString('hu-HU')+
    (opted()?' · Automatikus szinkron bekapcsolva':' · Automatikus szinkron kikapcsolva');
 }
 return opted()?'Dropbox-szinkronra vár (a HealthHubnak nyitva kell lennie).':
  'A projektórák még csak ezen a készüléken vannak. Dropbox-szinkron nincs engedélyezve.';
}
async function sha256(bytes){
 const digest=await w.crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
async function download(token){
 const res=await w.fetch('https://content.dropboxapi.com/2/files/download',{
  method:'POST',headers:{Authorization:'Bearer '+token,'Dropbox-API-Arg':JSON.stringify({path:DEST})}
 });
 if(res.status===409)return null;
 if(!res.ok)throw Error('Dropbox letöltési hiba (HTTP '+res.status+').');
 const bytes=new Uint8Array(await res.arrayBuffer());
 if(bytes.byteLength>MAX_BYTES)throw Error('A Dropbox időnapló túl nagy. Felülírás letiltva.');
 return {bytes,hash:await sha256(bytes)};
}
async function sync(enable=false){
 if(busy)throw Error('Már folyamatban van projektidő-szinkron.');
 if(!enable&&!opted())return {skipped:true,reason:'no-consent'};
 if(!guard()?.requireTarget||!target()?.accessToken)throw Error('A külön ChatGPT Dropbox kapcsolat hiányzik.');
 busy=true;status('Projektórák ellenőrzése és privát feltöltése…');
 try{
  // Prove the exact destination folder identity before every transfer.
  await guard().requireTarget();
  const data=snapshot(),bytes=new TextEncoder().encode(JSON.stringify(data));
  if(bytes.byteLength>MAX_BYTES)throw Error('Túl nagy időnapló. Nincs részleges feltöltés.');
  const localHash=await sha256(bytes),token=await target().accessToken();
  const previous=read(META),remote=await download(token);
  // Do not overwrite a file owned by another device or changed since our last sync.
  if(remote&&remote.hash!==localHash&&remote.hash!==previous?.sha256)
   throw Error('A Dropboxban másik időnapló van, vagy másik eszköz módosította. Automatikus felülírás letiltva.');
  if(!remote||remote.hash!==localHash){
   const res=await w.fetch('https://content.dropboxapi.com/2/files/upload',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/octet-stream',
     'Dropbox-API-Arg':JSON.stringify({path:DEST,mode:'overwrite',autorename:false,mute:true})},
    body:bytes
   });
   if(!res.ok)throw Error('Dropbox feltöltési hiba (HTTP '+res.status+').');
   const m=await res.json();
   if(String(m.path_lower||'').toLowerCase()!==DEST.toLowerCase()||
       Number(m.size)!==bytes.byteLength)
    throw Error('Dropbox fájlméret vagy útvonal eltérés.');
  }
  const verified=await download(token);
  if(!verified||verified.hash!==localHash)throw Error('Dropbox visszaolvasás SHA-256 eltérés.');
  const metadata={verifiedAt:iso(),sha256:localHash,path:DEST,totalHours:data.totals.snapshotHours};
  w.localStorage.setItem(META,JSON.stringify(metadata));
  if(enable)w.localStorage.setItem(CONSENT,'1');
  status(currentStatus());
  return {verified:true,metadata,data};
 }catch(e){status('⚠ '+String(e.message||e));throw e}
 finally{busy=false}
}
function onLocalChange(){
 if(!opted())return;
 if(pendingTimer!==null)w.clearTimeout(pendingTimer);
 pendingTimer=w.setTimeout(()=>{
  pendingTimer=null;
  if(!d.hidden)void sync().catch(()=>{});
 },1200);
}
function periodic(){
 if(d.hidden||!opted()||busy)return;
 const st=read(META);
 const isActive=!!local()?.get?.()?.runningSince;
 const elapsed=Date.now()-Date.parse(st?.verifiedAt||'');
 if(isActive&&(!Number.isFinite(elapsed)||elapsed>=5*60000))
  void sync().catch(()=>{});
 else if(!st?.verifiedAt)void sync().catch(()=>{});
}
function stop(){
 w.localStorage.removeItem(CONSENT);
 status(currentStatus());
}
function mount(){
 const panel=d.getElementById('hhPcHoursDropbox748');
 if(!panel||panel.dataset.hhCloud748==='1')return;
 panel.dataset.hhCloud748='1';
 const h=d.createElement('strong');h.textContent='☁️ Project Hours · privát Dropbox';
 const p=d.createElement('p');p.textContent='Csak az időnaplót tölti a privát ChatGPT-célmappába, nem egészségadatokat. Más eszközön történt változást nem ír felül.';
 const action=d.createElement('button');action.className='hhPcBtn primary';action.type='button';
 action.textContent='☁️ Dropbox-szinkron ellenőrzése és bekapcsolása';
 const off=d.createElement('button');off.className='hhPcBtn';off.type='button';
 off.textContent='⏹ Automatikus szinkron kikapcsolása';
 const s=d.createElement('p');s.className='hhPcHoursState';s.setAttribute('data-hh-project-hours-cloud-status','');
 s.setAttribute('role','status');s.setAttribute('aria-live','polite');s.textContent=currentStatus();
 action.addEventListener('click',()=>{
  action.disabled=true;
  void sync(true).catch(()=>{}).finally(()=>{action.disabled=false;off.disabled=false});
 });
 off.addEventListener('click',stop);
 panel.append(h,p,action,off,s);
}
w.HH_PROJECT_HOURS_DROPBOX_V748={version:VERSION,DEST,snapshot,sync,mount,onLocalChange,periodic,stop,readStatus:()=>read(META),opted};
w.addEventListener('focus',()=>{mount();periodic()});
d.addEventListener('visibilitychange',()=>{if(!d.hidden){mount();periodic()}});
w.setInterval(()=>{mount();periodic()},60*1000);
w.setTimeout(mount,800);
})(window,document);
