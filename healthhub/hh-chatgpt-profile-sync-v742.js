/* HealthHub v743 · Consent-gated private analytics snapshots + provenance-aware status.
 * Source: existing HealthHub App Folder (read-only). Destination: separately
 * authorized Dropbox account, preverified exact folder ID.
 * Never publishes clinical data to GitHub, a public URL or browser logs.
 * Runs ONLY in an open, visible HealthHub; not a background service.
 */
(function(w,d){
'use strict';
const ROOT='/HealthHub-ChatGPT-Analytics';
const ROOT_ID='id:n7qchVNGAogAAAAAAAAABQ';
const PROFILES=['zsolt','monika'];
const CONSENT='hh-chatgpt-snapshot-optin-v742',STATE='hh-chatgpt-snapshot-status-v742';
const EVERY=6*3600*1000,MAX_BYTES=8*1024*1024;
let busy=false;
const A=()=>w.HH_CHATGPT_TARGET_AUTH_V739;
const V=()=>w.HH_CHATGPT_TARGET_ONBOARD_V739;
const B=()=>w.HH_CHATGPT_MANUAL_EXPORT_V738;
const readJSON=k=>{try{return JSON.parse(w.localStorage.getItem(k)||'null')}catch(_){return null}};
const optin=()=>{const a=readJSON(CONSENT);return Array.isArray(a)?a.filter(x=>PROFILES.includes(x)):[]};
const last=()=>readJSON(STATE)||{};
const store=s=>w.localStorage.setItem(STATE,JSON.stringify(s));
const stamp=()=>new Date().toISOString();
const day=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const verifyProfile=(bundle,p)=>{
 if(bundle?.profile!==p)throw Error('Nem megfelelő profil: '+p);
 if(!bundle.data?.healthConnect?.records||!bundle.data?.digitalWellbeing)
  throw Error('A két kötelező forrás nem áll rendelkezésre: '+p);
 for(const entry of Object.values(bundle.data)){
  if(!entry||typeof entry!=='object')continue;
  const key=entry.profile||entry.profileKey||entry.profile_key;
  if(key&&key!==p)throw Error('Profilütközés az elemzési csomagban: '+p);
 }
 return bundle;
};
function age(iso,at){
 const ms=Date.parse(iso||'');return Number.isFinite(ms)?Math.round((at-ms)/3600000*10)/10:null;
}
function digitalCoverage(bundle){
 const dw=bundle.data?.digitalWellbeing||{};
 const hours=Array.isArray(dw.hours)?dw.hours:[];
 const unique=new Set();
 for(const x of hours){
  const t=Number(x?.hourStartMs);
  if(Number.isFinite(t)&&t>0)unique.add(new Intl.DateTimeFormat('sv-SE',{
   timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t)));
 }
 return {expectedRetentionDays:Number(dw.retentionDays)||null,
  observedDays:unique.size,hourRecords:hours.length,
  coverageVerified:unique.size>=30};
}
function reportSources(bundle,at){
 const out=[];
 for(const s of bundle.sources||[]){
  if(s.status!=='read'){out.push({kind:s.kind,status:'missing'});continue}
  let sourceTime=s.sourceReportedAt;
  if(s.kind==='digitalWellbeing'){
   const n=bundle.data?.digitalWellbeing?.collectedAtMs;
   if(Number.isFinite(Number(n))&&Number(n)>0)sourceTime=new Date(Number(n)).toISOString();
  }
  const hours=age(sourceTime,at);
  const coverage=s.kind==='digitalWellbeing'?digitalCoverage(bundle):null;
  const status=hours===null?'unknown_freshness':
   hours< -0.25?'future_timestamp':hours>24?'stale':
   (coverage&&coverage.observedDays===0)?'missing_observations':'present';
  out.push({kind:s.kind,status,sourceReportedAt:sourceTime||null,ageHours:hours,
   ...(coverage?{coverage}: {})});
 }
 return out;
}
async function jsonApi(route,payload){
 const token=await A().accessToken();
 const r=await w.fetch('https://api.dropboxapi.com/2/'+route,{
  method:'POST',
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify(payload)
 });
 if(!r.ok){const e=Error('Dropbox '+route+' HTTP '+r.status);e.status=r.status;throw e}
 return r.json();
}
async function metadata(path){
 try{return await jsonApi('files/get_metadata',{path,include_deleted:false})}
 catch(e){if(e.status===409)return null;throw e}
}
async function ensureFolder(path){
 const known=await metadata(path);
 if(known){if(known['.tag']!=='folder')throw Error('A cél útvonal nem mappa.');return}
 try{await jsonApi('files/create_folder_v2',{path,autorename:false})}
 catch(e){if(e.status!==409)throw e}
 if((await metadata(path))?.['.tag']!=='folder')throw Error('A célmappa nem ellenőrizhető.');
}
async function requireTarget(){
 if(!A()||!V())throw Error('A cél Dropbox kapcsolat modulja hiányzik.');
 const f=await V().verifyTargetFolder();
 if(f.id!==ROOT_ID||f.path.toLowerCase()!==ROOT.toLowerCase())
  throw Error('Eltérő Dropbox-fiók vagy célmappa. Másolás letiltva.');
 return f;
}
async function hash(bytes){
 const digest=await w.crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
async function transfer(path,bundle){
 const encoded=new TextEncoder().encode(JSON.stringify(bundle));
 if(encoded.byteLength>MAX_BYTES)throw Error('Túl nagy JSON-csomag, nem készül hiányos másolat.');
 const expected=await hash(encoded),token=await A().accessToken();
 const options={path,mode:'overwrite',autorename:false,mute:true};
 const res=await w.fetch('https://content.dropboxapi.com/2/files/upload',{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/octet-stream',
   'Dropbox-API-Arg':JSON.stringify(options)},body:encoded
 });
 if(!res.ok)throw Error('Cél Dropbox feltöltési hiba: HTTP '+res.status);
 const meta=await res.json();
 if(String(meta.path_lower||'').toLowerCase()!==path.toLowerCase()||Number(meta.size)!==encoded.byteLength)
  throw Error('Célfájl metaadat-egyezés sikertelen.');
 const read=await w.fetch('https://content.dropboxapi.com/2/files/download',{
  method:'POST',headers:{Authorization:'Bearer '+token,
   'Dropbox-API-Arg':JSON.stringify({path})}
 });
 if(!read.ok)throw Error('Visszaolvasási hiba: HTTP '+read.status);
 if(await hash(await read.arrayBuffer())!==expected)
  throw Error('Visszaolvasott tartalom nem egyezik (SHA-256).');
 return {path,bytes:encoded.byteLength,sha256:expected};
}
function huTime(value){
 const n=Date.parse(value||'');
 if(!Number.isFinite(n))return 'nincs ellenőrzött időpont';
 return new Intl.DateTimeFormat('hu-HU',{timeZone:'Europe/Budapest',
  year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',
  second:'2-digit',hour12:false}).format(new Date(n));
}
function renderSyncDetails(){
 const area=d.querySelector('[data-hh-sync-details]');
 if(!area)return;
 area.replaceChildren();
 const state=last(),enabled=optin();
 for(const [p,name] of [['zsolt','Zsolt'],['monika','Mónika']]){
  const entry=state[p];
  const line=d.createElement('p');
  line.style.cssText='margin:6px 0;padding:6px 8px;border-radius:9px;background:#173b59;color:#ecf7ff;white-space:normal;';
  const strong=d.createElement('strong');strong.textContent=name+': ';
  line.append(strong);
  const label=!entry?.verifiedAt?'még nincs helyben rögzített, visszaellenőrzött szinkron':
    'Utolsó Dropbox-írás és SHA-256 visszaolvasás: '+huTime(entry.verifiedAt)+
    ' · '+Math.round((Number(entry.bytes)||0)/1024)+' KB';
  line.append(d.createTextNode(label));
  if(entry?.verifiedAt){
   const next=new Date(Date.parse(entry.verifiedAt)+EVERY).toISOString();
   line.append(d.createTextNode(' · Következő 6 órás próbálkozás leghamarabb: '+huTime(next)));
   const dw=entry.sources?.find(s=>s.kind==='digitalWellbeing');
   if(dw?.coverage)line.append(d.createTextNode(
    ' · Digital Wellbeing: '+dw.coverage.observedDays+' megfigyelt nap'+
    (dw.coverage.expectedRetentionDays?' / '+dw.coverage.expectedRetentionDays+' napos megtartás':'')
   ));
   const issues=entry.sources?.filter(s=>s.status!=='present')||[];
   if(issues.length)line.append(d.createTextNode(' · Forrásfigyelmeztetés: '+
    issues.map(s=>s.kind+': '+s.status).join(', ')));
  }
  line.append(d.createTextNode(enabled.includes(p)?
   ' · Automatikus ismétlés: engedélyezve (csak nyitott HealthHubban)':
   ' · Automatikus ismétlés: nincs engedélyezve'));
  area.append(line);
 }
}
function note(message){
 for(const node of d.querySelectorAll('[data-hh-v742-status]'))node.textContent=message;
 renderSyncDetails();
}
async function run(profiles,force=false){
 if(busy)throw Error('A szinkronizáció már folyamatban van.');
 if(!Array.isArray(profiles)||!profiles.length||profiles.some(p=>!PROFILES.includes(p))||
    new Set(profiles).size!==profiles.length)throw Error('Érvénytelen profilválasztás.');
 busy=true;
 const results=[],errors=[];
 try{
  await requireTarget();
  const state=last(),now=Date.now();
  for(const p of profiles){
   const prior=state[p];
   if(!force&&prior?.verifiedAt&&now-Date.parse(prior.verifiedAt)<EVERY)continue;
   try{
    note('Privát források ellenőrzése és feltöltése: '+p+'…');
    if(!B()?.build)throw Error('A v738-as export hiányzik.');
    const bundle=verifyProfile(await B().build(p,Date.now()),p);
    const freshness=reportSources(bundle,Date.now());
    const dir=ROOT+'/'+p;
    await ensureFolder(dir);
    // v738 legacy flags describe its original local export, not this later
    // Dropbox transfer. Do not expose those two flags as current sync status.
    // ChatGPT connector verification can only be performed in ChatGPT.
    const delivered={...bundle,delivery:{
      schema:'healthhub.chatgpt.dropbox-delivery/1',
      initiatedBy:force?'manual_user_action':'visible_healthhub_interval',
      sourceSnapshotGeneratedAt:bundle.exportedAt,
      targetPath:dir+'/latest.json',targetFolderId:ROOT_ID,
      targetFolderCheckedBeforeUpload:true,
      targetReadback:'see HealthHub local SHA-256 verified sync status',
      chatgptConnectorRead:'not asserted by exporter; verify independently in ChatGPT',
      backgroundWhenClosed:false,
      legacyV738ExportFlags:{isAutomaticSync:bundle.isAutomaticSync,
       chatgptReadVerified:bundle.chatgptReadVerified}
    }};
    delete delivered.isAutomaticSync;
    delete delivered.chatgptReadVerified;
    const latest=await transfer(dir+'/latest.json',delivered);
    // Save only metadata locally. Clinical values are never logged or stored here.
    const result={profile:p,verifiedAt:stamp(),destination:latest.path,
      bytes:latest.bytes,sha256:latest.sha256,sources:freshness,
      warnings:bundle.warnings||[],isBackgroundSync:false,
      initiatedBy:force?'manual_user_action':'visible_healthhub_interval',
      chatgptConnectorRead:'not checked by HealthHub',targetReadbackVerified:true};
    state[p]=result;store(state);results.push(result);
   }catch(e){errors.push({profile:p,error:String(e.message||e)})}
  }
  const skipped=profiles.filter(p=>!results.some(x=>x.profile===p)&&!errors.some(x=>x.profile===p));
  note('Dropbox ellenőrzött szinkron: '+results.map(x=>x.profile).join(', ')+
    (skipped.length?' · Még nem esedékes (6 órán belüli ellenőrzött feltöltés): '+skipped.join(', '):'')+
    (errors.length?' · Hiba: '+errors.map(x=>x.profile+': '+x.error).join('; '):'')+
    '. Fájlfrissesség és részletes források külön ellenőrizendők.');
  return {results,errors,skipped};
 }finally{busy=false}
}
async function auto(){
 if(busy||d.hidden)return;
 const selected=optin();if(!selected.length)return;
 try{await run(selected,false)}
 catch(e){note('Automatikus frissítési próbálkozás sikertelen: '+String(e.message||e))}
}
function mount(){
 const panel=d.getElementById('hhTargetAuth739');
 if(!panel||d.getElementById('hhSyncV742'))return;
 const root=d.createElement('section');root.id='hhSyncV742';
 root.style.cssText='border:1px solid #709bc0;border-radius:13px;padding:12px;margin:12px 0;background:#102a44;color:#eaf6ff';
 const h=d.createElement('h4');h.textContent='☁️ ChatGPT Analytics · profil-szinkron v743';
 const info=d.createElement('p');info.textContent='A kiválasztott profil 24 órás Health Connect adatai, az eredeti Digital Wellbeing fájl, Nutrition, Samsung Health, Léna Context és Daily Health kerülhet át a privát ChatGPT Dropboxba. A fájlfrissesség nem azonos a feltöltés időpontjával. Az archív PDF-ek és a teljes Medical Master nincsenek benne.';
 const choices=d.createElement('div');
 for(const [p,name] of [['zsolt','Zsolt'],['monika','Mónika']]){
  const label=d.createElement('label');label.style.cssText='display:inline-flex;gap:7px;align-items:center;margin:5px 12px 5px 0';
  const c=d.createElement('input');c.type='checkbox';c.value=p;c.checked=optin().includes(p);
  label.append(c,d.createTextNode(name));choices.append(label);
 }
 const button=d.createElement('button');button.type='button';
 button.textContent='🔐 Kiválasztott profilok szinkronizálása + automatikus ismétlés';
 const stop=d.createElement('button');stop.type='button';stop.textContent='⏹ Automatikus ismétlés kikapcsolása';
 for(const b of [button,stop])b.style.cssText='background:#225779;border:1px solid #9bc7e8;color:#fff;border-radius:9px;padding:9px;margin:5px';
 const explanation=d.createElement('p');explanation.textContent='Engedélyezés után 6 óránként próbálkozik, HA a HealthHub böngészőben meg van nyitva. Zárt alkalmazás esetén nincs önálló napi háttérszinkron. Az eredeti v738-as isAutomaticSync és chatgptReadVerified jelzők kizárólag az eredeti kézi exportot írták le, nem a v743 Dropbox-átvitelt. A céloldali SHA-256 ellenőrzés itt történik; a ChatGPT tényleges olvasása külön ellenőrzendő.';
 const status=d.createElement('p');status.setAttribute('data-hh-v742-status','');status.setAttribute('role','status');
 status.textContent='Még nincs új v742 szinkronizáció.';
 button.addEventListener('click',()=>{
  const selected=Array.from(choices.querySelectorAll('input:checked')).map(x=>x.value);
  if(!selected.length){note('Válassz legalább egy profilt.');return}
  button.disabled=true;
  void run(selected,true).then(out=>{
   if(!out.errors.length&&out.results.length===selected.length){
    w.localStorage.setItem(CONSENT,JSON.stringify(selected));
    const issues=out.results.flatMap(item=>item.sources.filter(x=>x.status!=='present')
      .map(x=>item.profile+': '+x.kind+' ('+x.status+')'));
    const days=out.results.map(item=>{
     const dig=item.sources.find(x=>x.kind==='digitalWellbeing')?.coverage;
     return item.profile+': '+(dig?.observedDays??'?')+' megfigyelt Digital Wellbeing-nap';
    });
    note('✓ A kiválasztott profilok feltöltése és SHA-256 visszaolvasása sikeres. '+
      days.join('; ')+(issues.length?' · Forrásfigyelmeztetések: '+issues.join('; '):'')+
      '. Nyitott HealthHub esetén 6 óránként újrapróbáljuk.');
   }else note('Részleges vagy hibás átvitel. Az automatikus ismétlés engedélyezése nem változott.');
  }).catch(e=>note('⚠ '+String(e.message||e))).finally(()=>{button.disabled=false});
 });
 stop.addEventListener('click',()=>{w.localStorage.removeItem(CONSENT);
  note('Automatikus ismétlés kikapcsolva. A korábban feltöltött fájlok megmaradnak.');});
 const verified=last();
 const times=PROFILES.filter(p=>verified[p]?.verifiedAt).map(p=>p+': '+verified[p].verifiedAt);
 if(times.length)status.textContent='Utolsó igazolt szinkron: '+times.join(' · ');
 const details=d.createElement('div');
 details.setAttribute('data-hh-sync-details','');
 details.setAttribute('aria-label','Profilonkénti utolsó Dropbox-szinkron');
 root.append(h,info,choices,button,stop,explanation,status,details);panel.append(root);
 renderSyncDetails();
}
w.HH_CHATGPT_PROFILE_SYNC_V742={version:'743',run,auto,mount,verifyProfile,reportSources,digitalCoverage,optin,last,requireTarget,renderSyncDetails,huTime};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
w.setInterval(()=>{if(!d.hidden){mount();void auto()}},15*60000);
w.addEventListener('focus',()=>{mount();void auto()});
d.addEventListener('visibilitychange',()=>{if(!d.hidden){mount();void auto()}});
w.setTimeout(()=>{mount();void auto()},5000);
})(window,document);