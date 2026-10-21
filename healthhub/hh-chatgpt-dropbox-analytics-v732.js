/* HealthHub v732 · Dropbox-first ChatGPT Analytics source audit.
   Private, metadata-only catalog in Dropbox. Never writes clinical data to GitHub.
   A green "covered" check means the SOURCE FILE EXISTS, not that ChatGPT is connected.
   Requires separate user-authorized ChatGPT Dropbox connector access to the App Folder.
 */
(function(w,d){
'use strict';
const VERSION='732', ROOT='/HealthHub', OUT='/HealthHub/analytics/healthhub-chatgpt-source-index.json';
const LOCAL='hh-chatgpt-dropbox-audit-v732'; // private health values never stored here
const OPTIN='hh-chatgpt-dropbox-audit-daily-optin-v732'; // set only after verified first publish
let lastAutoAttempt=0;
const MAX=10000, DAY=86400000;
let busy=null,last=null,lastIssue='',mountTimer=0;
const now=()=>new Date().toISOString();
const pnames=['zsolt','monika'];
const rel=p=>p.toLowerCase().replace(/^\/healthhub\//,'');
const allowed=p=>{
 if(typeof p!=='string'||!/^\/HealthHub\//i.test(p))return false;
 const path=rel(p);
 if(/(^|[\/._-])(password|secret|token|credentials|oauth|session|apikey|access-key|private-key)([\/._-]|$)/i.test(path))return false;
 return /^(master\/|profiles\/|documents\/|explanations\/|measurements\/|appointments\/|daily\/|shared\/nutrition-|sync\/(?:zsolt|monika)-lena-health-context\.json$|analytics\/healthhub-daily-health-(?:zsolt|monika)\.json$)/i.test(path);
};
const expected=[
 ['Master · orvosi dokumentumindex','master/documents.json','shared','clinical-index'],
 ['Master · magyarázatok','master/explanations.json','shared','clinical'],
 ['Master · gyógyszerek','master/medications.json','shared','clinical'],
 ['Master · profilok','master/profiles.json','shared','clinical'],
 ['Master · időpontok','master/appointments.json','shared','clinical'],
 ['Master · forrásmanifest','master/manifest.json','shared','metadata'],
 ['Medical Master · 6+1','master/medical-master.json','shared','clinical'],
 ['Tünetnapló','master/symptoms.json','shared','clinical'],
 ...pnames.flatMap(p=>[
  ['Profil + mérések','profiles/'+p+'-vault.json',p,'clinical'],
  ['Health Connect, aktivitás, alvás','profiles/'+p+'-health-connect.json',p,'clinical'],
  ['Nutrition + BS/AJ','profiles/'+p+'-nutrition.json',p,'clinical'],
  ['Digital Wellbeing · 30 nap','profiles/'+p+'-digital-wellbeing.json',p,'observational'],
  ['Léna Health Context','sync/'+p+'-lena-health-context.json',p,'summary'],
  ['Privát Daily Health AI-jelentések','analytics/healthhub-daily-health-'+p+'.json',p,'clinical']
 ])
];
const notInDropbox=[
 {key:'supabase-private-daily-health',name:'Privát Daily Health és Supabase AI-jelentések',reason:'A privát Supabase nem a Dropbox. A kézi, bejelentkezéshez kötött Daily Health export külön gombbal indítható, és forrásonként visszaellenőrzött.'},
 {key:'device-unsynced',name:'Csak telefonon lévő vagy még nem feltöltött adatok',reason:'A Dropbox-leltár nem igazolja, hogy minden eszköz minden eseménye már felment.'},
 {key:'chatgpt-connector',name:'ChatGPT Dropbox alkalmazásmappa elérése',reason:'Külön ChatGPT Plugin csatlakoztatás és valós fájlolvasási próba szükséges.'}
];
function localDay(){
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Budapest',
 year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
function autoAllowed(){
 try{return w.localStorage.getItem(OPTIN)==='1'}catch(_){return false;}
}
function recentSuccess(){
 try{
  const st=JSON.parse(w.localStorage.getItem(LOCAL)||'null');
  return st&&st.published===true&&String(st.generatedAt||'').length>0?st:null;
 }catch(_){return null;}
}
function auto(){
 if(busy||!autoAllowed()||d.hidden)return;
 const st=recentSuccess();
 if(!st||new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Budapest',
   year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(st.generatedAt))===localDay())return;
 if(Date.now()-lastAutoAttempt<3600000)return;
 try{api()}catch(_){return}
 lastAutoAttempt=Date.now();
 void run({publish:true,prepare:false}).catch(()=>{});
}
function api(){
 const v=w.HH_DROPBOX_VAULT;
 if(!v||!v.connected||!v.connected()||!v.accessToken||
 !v.uploadJson||!v.downloadJson)throw Error('Csatlakoztasd a HealthHub Dropbox Vaultot.');
 return v;
}
async function req(endpoint,arg){
 const token=await api().accessToken();
 const res=await fetch('https://api.dropboxapi.com/2/'+endpoint,{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(arg)
 });
 if(!res.ok){
  const e=Error('Dropbox fájllista: HTTP '+res.status);e.code=res.status;
  throw e;
 }
 return res.json();
}
async function inventory(){
 let page;
 try{page=await req('files/list_folder',{path:ROOT,recursive:true,include_deleted:false,limit:250});}
 catch(e){if(e.code===409)throw Error('A Dropbox /HealthHub mappa még nem elérhető.');throw e;}
 const files=[],visited=new Set();
 for(let round=0;;round++){
  if(round>250)throw Error('A forrásfájlok felsorolása túllépte a biztonsági határt.');
  for(const e of page.entries||[]){
   if(e['.tag']!=='file')continue;
   const path=e.path_display||e.path_lower;
   if(!allowed(path))continue;
   const k=rel(path);
   if(visited.has(k))continue;visited.add(k);
   files.push({path,relativePath:k,profile:/(?:^|\/)(zsolt|monika)-/i.exec(k)?.[1]?.toLowerCase()||'shared',
    bytes:Number(e.size)||0,dropboxModifiedAt:e.server_modified||null,
    revision:e.rev||null,contentHash:e.content_hash||null});
   if(files.length>MAX)throw Error('Túl sok egészségügyi fájl a teljes auditáláshoz.');
  }
  if(!page.has_more)break;
  if(!page.cursor)throw Error('Dropbox lista-folytatás hiányzik.');
  page=await req('files/list_folder/continue',{cursor:page.cursor});
 }
 return files.sort((a,b)=>a.relativePath.localeCompare(b.relativePath,'hu'));
}
function summarize(files){
 const lookup=new Map(files.map(f=>[f.relativePath.toLowerCase(),f]));
 const sources=expected.map(([label,path,profile,kind])=>{
  const f=lookup.get(path.toLowerCase());
  return {name:label,path:ROOT+'/'+path,profile,kind,status:f?'present':'missing',
    bytes:f?f.bytes:null,dropboxModifiedAt:f?f.dropboxModifiedAt:null,
    revision:f?f.revision:null};
 });
 const count=sources.filter(s=>s.status==='present').length;
 const archive=files.filter(f=>f.relativePath.startsWith('documents/')||f.relativePath.startsWith('profiles/')&&/\.(?:png|jpe?g|pdf)$/i.test(f.relativePath));
 const clinicalFiles=files.filter(f=>/^(master|profiles|documents|explanations|measurements|appointments|daily|shared|sync)\//.test(f.relativePath));
 const dates=files.map(f=>Date.parse(f.dropboxModifiedAt||'')).filter(Number.isFinite);
 return {sources,presentCount:count,expectedCount:sources.length,missingCount:sources.length-count,
   fileCount:files.length,archiveCount:archive.length,clinicalFileCount:clinicalFiles.length,
   newestFileChange:dates.length?new Date(Math.max(...dates)).toISOString():null};
}
function document(files,report){
 return {
  schema:'healthhub.chatgpt.dropbox-source-index/1',generatedAt:now(),system:'HealthHub',
  sourceOfTruth:'Dropbox App Folder',readOnlyCatalog:true,
  warning:'This file inventories private Dropbox source paths. It contains NO medical measurements, and DOES NOT prove ChatGPT connector access or full device ingestion.',
  chatgptUsage:'Use this source index to locate canonical private files through the separately connected Dropbox app. Verify profile, timestamps, original evidence and actual content; never infer missing medical facts.',
  scope:'all documented HealthHub healthcare source collections; excludes credentials and device control',
  ...report,
  inventory:files.map(f=>({path:f.path,profile:f.profile,bytes:f.bytes,
     lastModified:f.dropboxModifiedAt,revision:f.revision,contentHash:f.contentHash})),
  unverifiedExternalSources:notInDropbox,
  connectorReadVerified:false,connectorVerification:'not-yet-tested-in-ChatGPT'
 };
}
async function folder(){
 const token=await api().accessToken();
 const res=await fetch('https://api.dropboxapi.com/2/files/create_folder_v2',{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({path:'/HealthHub/analytics',autorename:false})});
 if(res.ok)return;
 if(res.status===409)return;
 throw Error('Analytics mappa létrehozása nem sikerült: HTTP '+res.status);
}
async function exportPrivateDailyHealth(){
 api(); // First verify destination is private Dropbox.
 const sup=w.HH_DAILY_HEALTH_SYNC_V319;
 const ss=sup&&typeof sup.getStatus==='function'?sup.getStatus():null;
 if(!ss||!ss.authenticated||typeof sup.request!=='function')
  throw Error('A privát Daily Health átviteléhez jelentkezz be a Központi Health Vaultba.');
 const allowedProfiles=Array.isArray(ss.authorizedProfiles)?ss.authorizedProfiles:[];
 const report={exported:[],blocked:[],failed:[],counts:{}};
 await folder();
 for(const p of pnames){
  if(!allowedProfiles.includes(p)){report.blocked.push(p);continue;}
  try{
   const rows=[];
   for(let offset=0;offset<=1900;offset+=100){
    const path='/rest/v1/hh_daily_health_ai_reports?select=profile_key,report_date,generated_at,report,status'+
     '&profile_key=eq.'+p+'&status=eq.ready&order=report_date.desc&limit=100&offset='+offset;
    const data=await sup.request(path);
    if(!Array.isArray(data))throw Error('A privát Supabase nem adott érvényes jelentéslistát.');
    if(data.some(x=>!x||x.profile_key!==p||x.status!=='ready'||
      typeof x.report_date!=='string'||!x.report||typeof x.report!=='object'))
      throw Error('Profilazonosító vagy jelentésforma eltér, az átvitel leállt.');
    rows.push(...data);
    if(data.length<100)break;
    if(offset===1900)throw Error('A privát Daily Health archívum meghaladja a 2000-es átviteli limitet.');
   }
   if(!rows.length){report.blocked.push(p+' · nincs kész privát jelentés');continue;}
   const dest=ROOT+'/analytics/healthhub-daily-health-'+p+'.json';
   const payload={schema:'healthhub.analytics.private-daily-health/1',profile:p,
    source:'Supabase private RLS reports',exportedAt:now(),count:rows.length,
    dateRange:{newest:rows[0].report_date,oldest:rows[rows.length-1].report_date},
    reports:rows};
   await api().uploadJson(dest,payload);
   const got=await api().downloadJson(dest);
   if(!got||got.schema!==payload.schema||got.profile!==p||got.count!==rows.length||
     got.exportedAt!==payload.exportedAt||!Array.isArray(got.reports)||
     got.reports.length!==rows.length)
     throw Error('A privát Daily Health fájl Dropbox-visszaolvasása nem egyezik.');
   report.exported.push(p);report.counts[p]=rows.length;
  }catch(e){report.failed.push({profile:p,reason:String(e.message||e).slice(0,150)});}
 }
 return report;
}
function checkReadback(sent,actual){
 if(!actual||actual.schema!==sent.schema||actual.generatedAt!==sent.generatedAt)throw Error('Analytics index visszaolvasása eltér.');
 if(actual.expectedCount!==sent.expectedCount||actual.fileCount!==sent.fileCount||
    actual.sources?.length!==sent.sources.length||actual.inventory?.length!==sent.inventory.length)
   throw Error('Analytics index visszaolvasása hiányos.');
 return true;
}
async function run({publish=false,prepare=false}={}){
 if(busy)return busy;
 busy=(async()=>{
  lastIssue='';draw('Dropbox források ellenőrzése…',true);
  try{
   api();
   const warnings=[];
   if(prepare){
    // These are existing writers; failures are captured and never represented as success.
    if(typeof w.hhMasterStructuredSync304==='function'){
     try{const ok=await w.hhMasterStructuredSync304(true);if(ok===false)warnings.push('A strukturált Master szinkron nem futott le.');}
     catch(_){warnings.push('A strukturált Master szinkron sikertelen.');}
    }
    if(w.HH_MEDICAL_MASTER_EXPORT_V715&&typeof w.HH_MEDICAL_MASTER_EXPORT_V715.latest==='function'){
     try{await w.HH_MEDICAL_MASTER_EXPORT_V715.latest();}
     catch(_){warnings.push('A Medical Master frissítése nem igazolt.');}
    }
   }
   const files=await inventory();
   const report=summarize(files);
   const earlier=last?.snapshot||await previousIndex();
   const comparison=compareFiles(files,earlier,report.sources);
   const index=document(files,report);
   index.changeSummary=comparison.counts;
   index.comparedTo=comparison.comparedTo;
   let stored=false;
   if(publish){
    await folder();
    await api().uploadJson(OUT,index);
    const returned=await api().downloadJson(OUT);
    stored=checkReadback(index,returned);
    try{w.localStorage.setItem(OPTIN,'1')}catch(_){}
   }
   last={...report,generatedAt:index.generatedAt,published:stored,warnings,
    path:OUT,connectorReadVerified:false,comparison,snapshot:index};
   // Only metadata of the audit status; never store raw clinical observations.
   try{w.localStorage.setItem(LOCAL,JSON.stringify({
      generatedAt:last.generatedAt,published:stored,expectedCount:report.expectedCount,
      presentCount:report.presentCount,missingCount:report.missingCount,warnings
   }))}catch(_){}
   draw((stored?'✓ Privát Dropbox-index feltöltve és visszaellenőrizve.':
    '✓ Dropbox-források ellenőrizve (csak olvasás).')+
    ' · '+report.presentCount+'/'+report.expectedCount+' ismert fájl · '+report.fileCount+' állomány.',false);
   return last;
  }catch(e){lastIssue=String(e.message||e);draw('⚠ '+lastIssue,false);throw e;}
  finally{busy=null;draw(null,false);}
 })();
 return busy;
}
function style(){
 if(d.getElementById('hhAnalytics732Style'))return;
 const s=d.createElement('style');s.id='hhAnalytics732Style';s.textContent=
 '#hhAnalytics732{margin:12px 0;padding:15px;border-radius:17px;'+
 'background:linear-gradient(130deg,rgba(13,35,60,.96),rgba(23,49,75,.95));'+
 'border:1px solid #7397c077;color:#e9f6ff;font:12px/1.5 system-ui}'+
 '#hhAnalytics732 *{box-sizing:border-box}#hhAnalytics732 h4{font-size:14px;margin:0 0 5px}'+
 '#hhAnalytics732 p{font-size:11px;color:#b5d1e4;margin:5px 0 9px}'+
 '#hhAnalytics732 button{border:1px solid #73b3d5;background:#21587e;border-radius:10px;'+
 'color:white;padding:10px 12px;min-height:42px;font:750 11px system-ui;margin:3px}'+
 '#hhAnalytics732 button:disabled{opacity:.5}'+
 '#hhAnalytics732 .hhA732Status{font-size:11px;color:#bdddee;margin:8px 0}'+
 '#hhAnalytics732 .hhA732Grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}'+
 '#hhAnalytics732 .hhA732Tile{border:1px solid #7397c044;border-radius:10px;'+
 'background:#0b21375e;padding:8px;font:11px/1.45 system-ui}'+
 '#hhAnalytics732 .hhA732Tile b{display:block;font-size:13px;margin-bottom:2px}'+
 '#hhAnalytics732 .hhA732Warn{color:#f0c995}'+
 '#hhAnalytics732 .hhA732Details{border:1px solid #709bc65e;border-radius:12px;margin:12px 0 9px;padding:9px}'+
 '#hhAnalytics732 .hhA732Details summary{font-weight:750;cursor:pointer;font-size:11px;line-height:1.5}'+
 '#hhAnalytics732 .hhA732DetailsNote{color:#a6c2d7;font-size:10px;line-height:1.55;margin-top:8px}'+
 '#hhAnalytics732 .hhA732Details select{color:#eaf5ff;background:#17324e;border:1px solid #779ab9;border-radius:9px;padding:7px 9px;min-height:38px;max-width:100%;font:11px system-ui;margin-top:10px}'+
 '#hhAnalytics732 .hhA732FileList{max-height:340px;overflow:auto;overscroll-behavior:contain;margin-top:8px}'+
 '#hhAnalytics732 .hhA732FileRow{padding:9px 5px;border-top:1px solid #ffffff1b}'+
 '#hhAnalytics732 .hhA732FileHead{display:flex;gap:8px;align-items:center;justify-content:space-between}'+
 '#hhAnalytics732 .hhA732FileHead strong{font-size:11px;overflow-wrap:anywhere}'+
 '#hhAnalytics732 .hhA732FileBadge{font-size:9px;white-space:nowrap;color:#bcd1e2}'+
 '#hhAnalytics732 .hhA732File-new{color:#87ebc0}#hhAnalytics732 .hhA732File-changed{color:#ffda92}'+
 '#hhAnalytics732 .hhA732File-missing{color:#ff999d}'+
 '#hhAnalytics732 .hhA732FileSub{font-size:10px;color:#aac8df;margin-top:3px}'+
 '#hhAnalytics732 .hhA732FilePath{font-size:9px;color:#8baeca;overflow-wrap:anywhere;margin-top:2px}'+
 '#hhAnalytics732 .hhA732Empty{font-size:11px;color:#b3cee2;padding:9px}'+
 '@media(max-width:410px){#hhAnalytics732 .hhA732Grid{grid-template-columns:1fr}}';
 d.head.append(s);
}
function compareFiles(files,previous,sources){
 const hasPrior=!!(previous&&previous.schema==='healthhub.chatgpt.dropbox-source-index/1'&&
  Array.isArray(previous.inventory)&&previous.inventory.length<=MAX);
 const prior=new Map((hasPrior?previous.inventory:[]).filter(x=>x&&typeof x.path==='string')
  .map(x=>[x.path.toLowerCase(),x]));
 const sourceMap=new Map(expected.map(([name,path,profile])=>[(ROOT+'/'+path).toLowerCase(),{name,profile}]));
 const rows=files.map(f=>{
  const old=prior.get(f.path.toLowerCase());
  // Revision identifies a Dropbox file version; modifiedAt/hash/size are fallbacks.
  const wasChanged=old&&(old.revision&&f.revision?
   old.revision!==f.revision :
   old.contentHash&&f.contentHash?old.contentHash!==f.contentHash:
   String(old.lastModified||'')!==String(f.dropboxModifiedAt||'')||
   Number(old.bytes)!==Number(f.bytes));
  const source=sourceMap.get(f.path.toLowerCase());
  return {path:f.path,name:source?.name||f.relativePath,profile:source?.profile||f.profile,
   known:!!source,delta:!hasPrior?'baseline':!old?'new':wasChanged?'changed':'unchanged',
   modifiedAt:f.dropboxModifiedAt||null,revision:f.revision||null,bytes:f.bytes};
 });
 for(const x of sources.filter(x=>x.status==='missing')){
  rows.push({path:x.path,name:x.name,profile:x.profile,known:true,delta:'missing',
   modifiedAt:null,revision:null,bytes:null});
 }
 const order={new:0,changed:1,missing:2,baseline:3,unchanged:4};
 rows.sort((a,b)=>order[a.delta]-order[b.delta]||a.profile.localeCompare(b.profile)||
  a.name.localeCompare(b.name,'hu'));
 return {rows,comparedTo:hasPrior?previous.generatedAt||null:null,firstAudit:!hasPrior,
  counts:{new:rows.filter(x=>x.delta==='new').length,changed:rows.filter(x=>x.delta==='changed').length,
   missing:rows.filter(x=>x.delta==='missing').length,unchanged:rows.filter(x=>x.delta==='unchanged').length,
   baseline:rows.filter(x=>x.delta==='baseline').length}};
}
async function previousIndex(){
 try{
  const data=await api().downloadJson(OUT);
  return data&&data.schema==='healthhub.chatgpt.dropbox-source-index/1'&&
   Array.isArray(data.inventory)&&data.inventory.length<=MAX?data:null;
 }catch(e){
  if(e&&(e.status===409||e.status===404))return null;
  throw Error('A korábbi privát Analytics-index nem olvasható; nincs megbízható összehasonlítás.');
 }
}
function syncTime(value){
 const time=Date.parse(value||'');
 return Number.isFinite(time)?new Date(time).toLocaleString('hu-HU'):'Időpont nélkül';
}
function renderDetails(){
 const box=d.getElementById('hhAnalytics732');
 if(!box)return;
 const details=box.querySelector('.hhA732Details');
 if(!details)return;
 const title=details.querySelector('summary'),list=details.querySelector('.hhA732FileList'),
  note=details.querySelector('.hhA732DetailsNote');
 if(!last||!last.comparison){
  if(title)title.textContent='▸ Fájlonkénti frissítések · ellenőrzésre vár';
  if(note)note.textContent='Indítsd a Forrásleltárt; a részletek csak valódi Dropbox-adatok alapján jelennek meg.';
  if(list)list.replaceChildren();
  return;
 }
 const cmp=last.comparison,c=cmp.counts;
 const heading=cmp.firstAudit?'Első állapotfelvétel · nincs korábbi összehasonlítás':
  'Új: '+c.new+' · módosult: '+c.changed+' · változatlan: '+c.unchanged;
 if(title)title.textContent='▸ Fájlonkénti frissítések · '+heading;
 if(note)note.textContent=(cmp.firstAudit?
  'Első leltár: ez a viszonyítási alap, nem bizonyított új feltöltések listája.':
  'Összehasonlítás: '+syncTime(cmp.comparedTo)+' óta.')+
  ' A fájlverzió-változás nem bizonyít új orvosi eseményt. Dropbox szerver-időpontok.';
 if(!list)return;
 const selected=details.querySelector('select[data-file-mode]');
 const mode=selected?.value||'changes';
 let rows=cmp.rows;
 if(mode==='changes')rows=rows.filter(x=>['new','changed','missing'].includes(x.delta));
 if(mode==='expected')rows=rows.filter(x=>x.known);
 list.replaceChildren();
 if(!rows.length){
  const empty=d.createElement('div');empty.className='hhA732Empty';
  empty.textContent=cmp.firstAudit?'Még nincs korábbi leltár, amellyel összehasonlíthatnánk. Válaszd az „Elvárt források” nézetet.':
   'Nincs új, módosult vagy hiányzó fájl a legutóbbi összehasonlításhoz képest.';
  list.append(empty);return;
 }
 const visible=rows.slice(0,300);
 const labels={new:'Új fájl',changed:'Fájlverzió módosult',unchanged:'Változatlan',
  missing:'Hiányzik',baseline:'Első leltár'};
 for(const x of visible){
  const row=d.createElement('div');row.className='hhA732FileRow';
  const head=d.createElement('div');head.className='hhA732FileHead';
  const name=d.createElement('strong');name.textContent=x.name;
  const state=d.createElement('span');state.className='hhA732FileBadge hhA732File-'+x.delta;
  state.textContent=labels[x.delta]||'Ismeretlen';
  head.append(name,state);
  const sub=d.createElement('div');sub.className='hhA732FileSub';
  const who=x.profile==='zsolt'?'Zsolt':x.profile==='monika'?'Mónika':'Közös';
  sub.textContent=who+' · '+(x.modifiedAt?'Dropbox: '+syncTime(x.modifiedAt):'Nincs fájl')+
   (x.bytes==null?'':' · '+x.bytes.toLocaleString('hu-HU')+' bájt');
  const path=d.createElement('div');path.className='hhA732FilePath';path.textContent=x.path;
  row.append(head,sub,path);list.append(row);
 }
 if(rows.length>visible.length){
  const more=d.createElement('p');more.textContent='Első '+visible.length+' fájl megjelenítve a(z) '+rows.length+' közül.';
  list.append(more);
 }
}
function auditStatus(result,issue,stored){
 if(issue)return '⚠ '+String(issue);
 if(result){
  const n=result.presentCount+'/'+result.expectedCount;
  const date=String(result.generatedAt||'');
  const time=date&&Number.isFinite(Date.parse(date))?
    ' · Ellenőrizve: '+new Date(date).toLocaleString('hu-HU'):'';
  const label=result.published?
    '✓ Privát ChatGPT-index feltöltve és visszaolvasva':
    '✓ Dropbox-forrásleltár ellenőrizve';
  const missing=result.missingCount?
    ' · Hiányzó fájlok: '+result.missingCount:
    ' · Minden elvárt fájl létezik';
  const warnings=Array.isArray(result.warnings)&&result.warnings.length?
    ' · Figyelem: '+result.warnings.length+' előzetes sync-figyelmeztetés':'';
  return label+' · '+n+' várt fájl'+missing+
   ' · Ez nem tartalmi frissesség- vagy ChatGPT hozzáférésellenőrzés'+warnings+time;
 }
 if(stored&&stored.generatedAt){
  return 'Korábbi helyi leltár: '+stored.presentCount+'/'+stored.expectedCount+
    ' · '+new Date(stored.generatedAt).toLocaleString('hu-HU')+
    ' · A jelenlegi Dropbox-állapotot még újra kell ellenőrizni.';
 }
 return 'Még nem futott le Dropbox-forrásellenőrzés. Először indítsd a Forrásleltárt.';
}
function draw(message,loading){
 const box=d.getElementById('hhAnalytics732');
 if(!box)return;
 const button=box.querySelector('button[data-act=publish]');
 if(button)button.disabled=!!busy||!!loading;
 const daily=box.querySelector('button[data-act=daily]');if(daily)daily.disabled=!!busy||!!loading;
 const dry=box.querySelector('button[data-act=audit]');
 if(dry)dry.disabled=!!busy||!!loading;
 const status=box.querySelector('.hhA732Status');
 if(status)status.textContent=message||auditStatus(last,lastIssue,(()=>{try{return JSON.parse(w.localStorage.getItem(LOCAL)||'null')}catch(_){return null}})());
 renderDetails();
 if(!last)return;
 const matrix=box.querySelector('.hhA732Grid');if(!matrix)return;
 const sections=[
  ['Központi Master',last.sources.filter(x=>x.profile==='shared'&&x.path.includes('/master/'))],
  ['Zsolt',last.sources.filter(x=>x.profile==='zsolt')],
  ['Mónika',last.sources.filter(x=>x.profile==='monika')],
  ['Tünetnapló · a Master része',last.sources.filter(x=>x.path.endsWith('/symptoms.json'))]
 ];
 matrix.replaceChildren();
 for(const [label,rows] of sections){
  const tile=d.createElement('div');tile.className='hhA732Tile';
  const b=d.createElement('b');b.textContent=label+' · '+rows.filter(x=>x.status==='present').length+'/'+rows.length;
  tile.append(b);
  const missing=rows.filter(x=>x.status==='missing').map(x=>x.name);
  const labelNode=d.createElement('span');labelNode.textContent=missing.length?'Hiányzik: '+missing.join(', '):'Az elvárt fájlok léteznek.';
  if(missing.length)labelNode.className='hhA732Warn';
  tile.append(labelNode);matrix.append(tile);
 }
}
function mount(){
 if(w.healthSectionKind!=='more')return;
 const host=d.getElementById('hhUnifiedCloudVaultCard');
 if(!host||d.getElementById('hhAnalytics732'))return;
 style();
 const card=d.createElement('section');card.id='hhAnalytics732';
 card.innerHTML='<h4>📚 ChatGPT Analytics · Dropbox forrásellenőrzés</h4>'+
  '<p>A meglévő egészségügyi fájlok tényleges ellenőrzése. Nem készít publikus másolatot és nem állítja, hogy a ChatGPT már csatlakozott.</p>'+
  '<button data-act="audit" type="button">🔎 Forrásleltár (csak olvasás)</button>'+
  '<button data-act="publish" type="button">☁️ Privát ChatGPT-index frissítése</button>'+ 
  '<button data-act="daily" type="button">🔒 Privát Daily Health → Dropbox</button>'+
  '<div class="hhA732Status" role="status" aria-live="polite">A Dropbox-ellenőrzés állapota betöltés alatt…</div>'+
  '<div class="hhA732Grid"></div>'+
  '<details class="hhA732Details"><summary>▸ Fájlonkénti frissítések · ellenőrzésre vár</summary>'+
  '<label style="display:block;font-size:10px;color:#adcae1;margin-top:8px">Mely fájlokat mutassam?'+
  '<select data-file-mode><option value="changes">Új / módosult / hiányzó</option>'+
  '<option value="expected">Elvárt 20 forrás</option>'+
  '<option value="all">Összes Dropbox-fájl</option></select></label>'+
  '<div class="hhA732DetailsNote"></div><div class="hhA732FileList"></div></details>'+
  '<p>A fájlszám nem jelenti a tartalom naprakészségét vagy a ChatGPT hozzáférését. A ChatGPT Dropbox-kapcsolata külön engedélyezendő; a helyben maradt adatok nem feltétlenül kerültek a felhőbe.</p>';
 host.insertAdjacentElement('afterend',card);
 card.addEventListener('change',e=>{
  if(e.target.closest('select[data-file-mode]'))renderDetails();
 });
 card.addEventListener('click',e=>{
  const btn=e.target.closest('button[data-act]');
  if(!btn)return;
  if(btn.dataset.act==='audit')void run({publish:false}).catch(()=>{});
  if(btn.dataset.act==='publish')void run({publish:true,prepare:true}).catch(()=>{});
  if(btn.dataset.act==='daily'){
   btn.disabled=true;
   const stat=card.querySelector('.hhA732Status');
   if(stat)stat.textContent='Privát Supabase-jelentések átvitele és visszaellenőrzése…';
   void exportPrivateDailyHealth().then(result=>{
    const msg='Privát Daily Health: '+result.exported.length+' profil átvéve · '+
     result.blocked.length+' hiányzó jogosultság / adat · '+result.failed.length+' hiba. '+
     'A teljes Dropbox-index frissítését külön indítsd.';
    if(stat)stat.textContent=msg;
   }).catch(e=>{if(stat)stat.textContent='⚠ '+String(e.message||e)})
    .finally(()=>{btn.disabled=false});
  }
 });
 draw(null,false);
}
function init(){
 w.HH_DROPBOX_CHATGPT_ANALYTICS_V732={version:VERSION,run,inventory,expected,exportPrivateDailyHealth,model:{allowed,summarize,document,checkReadback,auditStatus,compareFiles}};
 mount();
 // The More/Admin page recreates this card; mount only when visible.
 w.setInterval(()=>{if(!d.hidden)mount()},4500);
 w.addEventListener('focus',()=>{mount();auto();});
 d.addEventListener('visibilitychange',()=>{if(!d.hidden){mount();auto();}});
 w.setTimeout(auto,5000);
 w.setInterval(auto,15*60000);
 w.addEventListener('healthhub:master-vault-synced',()=>{if(last)draw('A Master frissült. Indíts új forrásellenőrzést.',false);});
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
