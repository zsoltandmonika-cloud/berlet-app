/* HealthHub Dropbox migration v1 (P0). Browser-only, explicit consent.
 * Separate OAuth, no GitHub or Supabase transfer of private records.
 * Supports only small typed JSON snapshots. Clinical Vaults are NOT blindly merged.
 */
(function(w){
'use strict';
const PREFIX='hhmigration_', PK='hh-migrate-pkce-v1', DB='hh-migrate-auth-v1';
const KEY='target', APP='dv5a4o8h09wwgtn', SRCAPP='t68rmhh5f1l8d85';
const CALLBACK='https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/chatgpt-dropbox-callback-v739.html';
const ROOT='/Apps/HealthHub Cloud Vault/HealthHub';
const SCOPE='account_info.read files.metadata.read files.content.read files.content.write';
const FILES=['monika-health-connect.json','zsolt-health-connect.json','monika-digital-wellbeing.json','zsolt-digital-wellbeing.json','monika-nutrition.json','zsolt-nutrition.json'];
const state={plan:null,identity:null,sourceId:null};
function fail(s){throw Error(s)}
function random(){const b=new Uint8Array(32);w.crypto.getRandomValues(b);return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('')}
function b64url(a){let s='';for(const b of a)s+=String.fromCharCode(b);return w.btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function hash(bytes){return b64url(new Uint8Array(await w.crypto.subtle.digest('SHA-256',bytes)))}
function enc(s){return new TextEncoder().encode(s)}
function db(){return new Promise((ok,no)=>{const r=w.indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('sessions'))r.result.createObjectStore('sessions')};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function stored(){const d=await db();try{return await new Promise((ok,no)=>{const r=d.transaction('sessions','readonly').objectStore('sessions').get(KEY);r.onsuccess=()=>ok(r.result||null);r.onerror=()=>no(r.error)})}finally{d.close()}}
async function save(v){const d=await db();try{await new Promise((ok,no)=>{const t=d.transaction('sessions','readwrite');t.objectStore('sessions').put(v,KEY);t.oncomplete=()=>ok();t.onerror=()=>no(t.error)})}finally{d.close()}}
async function remove(){const d=await db();try{await new Promise((ok,no)=>{const t=d.transaction('sessions','readwrite');t.objectStore('sessions').delete(KEY);t.oncomplete=()=>ok();t.onerror=()=>no(t.error)})}finally{d.close()}state.plan=null}
async function authorize(){
 const verifier=random()+random(), nonce=PREFIX+random();
 w.sessionStorage.setItem(PK,JSON.stringify({verifier,nonce,at:Date.now()}));
 const url=new URL('https://www.dropbox.com/oauth2/authorize');
 const pairs={client_id:APP,response_type:'code',redirect_uri:CALLBACK,code_challenge:await hash(enc(verifier)),
  code_challenge_method:'S256',token_access_type:'offline',scope:SCOPE,state:nonce,force_reapprove:'true'};
 for(const [k,v] of Object.entries(pairs))url.searchParams.set(k,v);
 w.location.assign(url.toString());
}
async function exchangeCallback(url){
 const u=new URL(url),raw=w.sessionStorage.getItem(PK);
 try{w.history.replaceState({},'',CALLBACK)}catch(_){}
 w.sessionStorage.removeItem(PK);
 if(!raw||u.searchParams.get('error'))fail('Sikertelen migrációs engedélyezés.');
 const p=JSON.parse(raw);if(p.nonce!==u.searchParams.get('state')||Date.now()-p.at>600000)fail('Lejárt vagy eltérő OAuth állapot');
 const code=u.searchParams.get('code');if(!code)fail('OAuth kód hiányzik');
 const form=new URLSearchParams({code,grant_type:'authorization_code',redirect_uri:CALLBACK,code_verifier:p.verifier,client_id:APP});
 const r=await w.fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
 if(!r.ok)fail('OAuth token-csere: HTTP '+r.status);
 const v=await r.json();const scopes=String(v.scope||'').split(' ');
 if(!v.refresh_token||!v.account_id||!SCOPE.split(' ').every(x=>scopes.includes(x)))fail('Hiányzó Dropbox jogosultság');
 await save({refresh:v.refresh_token,access:v.access_token,accountId:v.account_id,expires:Date.now()+(Number(v.expires_in)||14400)*1000-60000});
 return {suffix:v.account_id.slice(-8)};
}
async function access(which){
 if(which==='source'){
  let src;try{src=JSON.parse(w.localStorage.getItem('hh-dropbox-token-v2')||'null')}catch(_){}
  if(!src||!src.refresh_token||!src.account_id)fail('Forrás webes HealthHub Dropbox OAuth hiányzik. Előbb csatlakozz Gmaillel a HealthHubban.');
  state.sourceId=src.account_id;
  if(src.access_token && Date.now()+60000<Number(src.expires_at))return src.access_token;
  const form=new URLSearchParams({refresh_token:src.refresh_token,grant_type:'refresh_token',client_id:SRCAPP});
  const r=await w.fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
  if(!r.ok)fail('Forrás tokenfrissítés HTTP '+r.status);
  const v=await r.json();src.access_token=v.access_token;src.expires_at=Date.now()+(Number(v.expires_in)||14400)*1000-60000;
  w.localStorage.setItem('hh-dropbox-token-v2',JSON.stringify(src));
  return src.access_token;
 }
 let t=await stored();if(!t||!t.refresh)fail('Az Outlook cél Dropbox még nincs engedélyezve.');
 if(t.access&&Date.now()+60000<Number(t.expires))return t.access;
 const form=new URLSearchParams({refresh_token:t.refresh,grant_type:'refresh_token',client_id:APP});
 const r=await w.fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
 if(!r.ok)fail('Outlook tokenfrissítés HTTP '+r.status);
 const v=await r.json();t.access=v.access_token;t.expires=Date.now()+(Number(v.expires_in)||14400)*1000-60000;await save(t);return t.access;
}
async function api(which,endpoint,body){
 const token=await access(which);
 const r=await w.fetch('https://api.dropboxapi.com/2/'+endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body||{})});
 const text=await r.text();let v={};try{v=JSON.parse(text)}catch(_){}
 if(!r.ok){const e=Error('Dropbox '+endpoint+' HTTP '+r.status);e.status=r.status;throw e}
 return v;
}
async function download(which,path){
 const token=await access(which);
 const r=await w.fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{Authorization:'Bearer '+token,'Dropbox-API-Arg':JSON.stringify({path})},cache:'no-store'});
 if(r.status===409){const e=Error('Fájl hiányzik');e.status=409;throw e}
 if(!r.ok)fail('Dropbox fájlolvasás: HTTP '+r.status);
 return await r.json();
}
function clean(v){if(Array.isArray(v))return v.map(clean);if(v&&typeof v==='object'){const x={};for(const k of Object.keys(v).sort())x[k]=clean(v[k]);return x}return v}
function stable(v){return JSON.stringify(clean(v))}
function profileValid(doc,p){if(!doc||!['zsolt','monika'].includes(p)||(doc.profile||doc.profileKey||doc.profile_key)!==p)fail('Profilütközés: '+p)}
function mergeItems(left,right,kind,aTime,bTime,issues,category){
 if(!Array.isArray(left)||!Array.isArray(right))fail('Hibás rekordtömb: '+category);
 const key=(v)=>{if(!v||typeof v!=='object')fail('Hibás rekord');
  const raw=kind==='date'?v.date:kind==='hour'?v.hourStartMs:kind==='app'?String(v.hourStartMs)+'|'+String(v.packageName):v.id;
  if(raw==null||raw===''||raw==='undefined')fail('Nincs rekordazonosító: '+category);
  return String(raw)
 };
 const m=new Map();
 for(const v of left){const k=key(v);if(m.has(k)&&stable(m.get(k))!==stable(v))fail('Célállományon belüli ellentmondó duplikátum: '+category);m.set(k,v)}
 for(const v of right){const k=key(v);if(m.has(k)&&stable(m.get(k))!==stable(v)){issues.push({category,key:k,selection:aTime>bTime?'outlook':'gmail'});if(bTime>=aTime)m.set(k,v)}else if(!m.has(k))m.set(k,v)}
 return Array.from(m.values())
}
function mergeDoc(dst,src,name){
 const p=name.split('-')[0];profileValid(dst,p);profileValid(src,p);
 const issues=[];let r=JSON.parse(JSON.stringify(dst)),counts={};
 if(name.endsWith('-health-connect.json')){
  if(!dst.records||!src.records)fail('Health Connect records hiányzik');
  const at=Date.parse(dst.exportedAt||0)||0,bt=Date.parse(src.exportedAt||0)||0;
  for(const k of new Set([...Object.keys(dst.records),...Object.keys(src.records)])){
   const a=dst.records[k]||[],b=src.records[k]||[];
   const m=mergeItems(a,b,k.startsWith('daily')?'date':'id',at,bt,issues,k);
   r.records[k]=k.startsWith('daily')?m.sort((x,y)=>x.date.localeCompare(y.date)):m;
   counts[k]={outlook:a.length,gmail:b.length,unique:m.length}
  }
  r.exportedAt=new Date(Math.max(at,bt)).toISOString();
  r.rangeStart=[dst.rangeStart,src.rangeStart].filter(Boolean).sort()[0]||dst.rangeStart;
  r.rangeEnd=[dst.rangeEnd,src.rangeEnd].filter(Boolean).sort().at(-1)||dst.rangeEnd;
  r.counts={...(at>=bt?dst.counts:src.counts)};
  const fields={bloodPressure:'bloodPressure',weight:'weight',bodyFat:'bodyFat',bloodGlucose:'bloodGlucose',oxygenSaturation:'oxygenSaturation',heartRate:'heartRateRecords',restingHeartRate:'restingHeartRate',vo2Max:'vo2Max',exerciseSessions:'exerciseSessions',sleepSessions:'sleepSessions',dailySteps:'stepDays',dailyActivity:'activityDays',dailyNutrition:'nutritionDays'};
  for(const [k,v] of Object.entries(fields))if(Array.isArray(r.records[k]))r.counts[v]=r.records[k].length;
  r.counts.sourceRecordCount=Object.entries(r.records).filter(([k,v])=>!k.startsWith('daily')&&Array.isArray(v)).reduce((a,[k,v])=>a+v.length,0);
  r.counts.hasSourceData=r.counts.sourceRecordCount>0;
  r.syncDiagnostics=at>=bt?dst.syncDiagnostics:src.syncDiagnostics;
 }else if(name.endsWith('-digital-wellbeing.json')){
  const at=Number(dst.collectedAtMs)||0,bt=Number(src.collectedAtMs)||0;
  r.hours=mergeItems(dst.hours||[],src.hours||[],'hour',at,bt,issues,'hours').sort((x,y)=>x.hourStartMs-y.hourStartMs);
  counts.hours={outlook:(dst.hours||[]).length,gmail:(src.hours||[]).length,unique:r.hours.length};
  // Fail closed: never expand application-level disclosure unless both sources permit it.
  if(dst.appDetailShared&&src.appDetailShared)r.appHours=mergeItems(dst.appHours||[],src.appHours||[],'app',at,bt,issues,'appHours');
  r.collectedAtMs=Math.max(at,bt);
 }else if(name.endsWith('-nutrition.json')){
  // An empty stale source must never replace a populated destination or its settings.
  const sourceLists=['entries','body','catalog','units','quickRecipes','quickRecipeOrder','presets'];
  const emptySource=sourceLists.every(k=>Array.isArray(src[k])?src[k].length===0:
    (!src[k]||typeof src[k]==='object'&&Object.keys(src[k]).length===0));
  if(emptySource)return {doc:dst,issues,counts:{emptySourcePreservedOutlook:true}};
  const at=Date.parse(dst.updatedAt||0)||0,bt=Date.parse(src.updatedAt||0)||0;
  for(const k of ['entries','quickRecipes']){r[k]=mergeItems(dst[k]||[],src[k]||[],'id',at,bt,issues,k);counts[k]={outlook:(dst[k]||[]).length,gmail:(src[k]||[]).length,unique:r[k].length}}
  for(const k of ['body','catalog','units','quickRecipeOrder','presets','goal'])
   if(src[k]&&stable(src[k])!==stable(dst[k])&&(!(Array.isArray(src[k]))||src[k].length))fail('Nutrition nem rekordlistás eltérés, kézi felülvizsgálat: '+k);
 }else fail('Nem engedélyezett fájltípus');
 return {doc:r,issues,counts};
}
async function identity(){
 const src=await access('source');
 const dest=await stored();if(!dest)fail('Cél Dropbox hitelesítés hiányzik');
 if(dest.accountId===state.sourceId)fail('A két Dropbox OAuth ugyanahhoz a fiókhoz tartozik. Nem szabad migrálni.');
 const info=await api('target','users/get_current_account',{});
 if(String(info.email||'').toLowerCase()!=='zsolt.monika@outlook.com')fail('Nem az Outlook.com családi Dropbox a cél. A művelet leállt.');
 const md=await api('target','files/get_metadata',{path:ROOT});
 if(md['.tag']!=='folder')fail('Outlook Cloud Vault gyökér hiányzik');
 state.identity={email:info.email,suffix:dest.accountId.slice(-8),sourceSuffix:state.sourceId.slice(-8)};
 return state.identity;
}
async function preview(){
 const id=await identity(),out=[],blocked=[];
 for(const name of FILES){
  const path='/HealthHub/profiles/'+name,target=ROOT+'/profiles/'+name;
  let src,dst,meta;
  try{src=await download('source',path)}catch(e){if(e.status===409){out.push({name,status:'source_missing'});continue}throw e}
  try{meta=await api('target','files/get_metadata',{path:target});dst=await download('target',target)}
  catch(e){blocked.push({name,reason:'A célfájl hiányzik vagy nem olvasható'});continue}
  try{
   const {doc,issues,counts}=mergeDoc(dst,src,name);
   out.push({name,status:stable(doc)===stable(dst)?'unchanged':'candidate',rev:meta.rev,target,doc,issues,counts});
  }catch(e){blocked.push({name,reason:String(e.message||e)})}
 }
 state.plan={accountId:(await stored()).accountId,sourceId:state.sourceId,files:out,blocked,at:Date.now()};
 return {identity:id,files:out.map(({name,status,issues,counts})=>({name,status,conflicts:issues?.length||0,counts})),blocked};
}
async function commit(confirmed){
 if(confirmed!==true||!state.plan||Date.now()-state.plan.at>5*60000)fail('Hiányzó vagy lejárt, jóváhagyott előnézet');
 await identity();
 const p=state.plan;if(p.sourceId!==state.sourceId||p.accountId!==(await stored()).accountId)fail('Az OAuth fiók időközben megváltozott');
 if(p.blocked.length)fail('Felülvizsgálandó fájlok vannak. Biztonsági okból nincs részleges írás.');
 let results=[];
 for(const item of p.files){
  if(item.status!=='candidate')continue;
  const before=await api('target','files/get_metadata',{path:item.target});
  if(before.rev!==item.rev)fail('A célfájl megváltozott az előnézet óta: '+item.name);
  const bytes=enc(JSON.stringify(item.doc,null,2)+'\n');
  if(bytes.length>145*1024*1024)fail('A fájl meghaladja a biztonságos méretkorlátot');
  const token=await access('target');
  const r=await w.fetch('https://content.dropboxapi.com/2/files/upload',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/octet-stream',
   'Dropbox-API-Arg':JSON.stringify({path:item.target,mode:{'.tag':'update',update:item.rev},autorename:false,mute:true})},body:bytes});
  if(!r.ok)fail('Dropbox célírás meghiúsult: '+item.name+' HTTP '+r.status+'; korábbi fájlverziók megtartva');
  const check=await download('target',item.target);
  if(await hash(enc(JSON.stringify(check,null,2)+'\n'))!==await hash(bytes))fail('Visszaolvasási hash eltérés: '+item.name);
  results.push({name:item.name,unique:item.counts,conflicts:item.issues.length,verified:true});
 }
 state.plan=null;
 return {results,targetSuffix:state.identity.suffix,warning:'A natív telefonok OAuth kapcsolata külön állítandó át. A régi fájlokat még ne töröld.'};
}
w.HH_DROPBOX_MIGRATION_V1=Object.freeze({authorize,exchangeCallback,preview,commit,stored,remove,compareCandidate:mergeDoc});
})(window);
