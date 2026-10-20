/* HealthHub v732 · Dropbox-first ChatGPT Analytics source audit.
   Private, metadata-only catalog in Dropbox. Never writes clinical data to GitHub.
   A green "covered" check means the SOURCE FILE EXISTS, not that ChatGPT is connected.
   Requires separate user-authorized ChatGPT Dropbox connector access to the App Folder.
 */
(function(w,d){
'use strict';
const VERSION='732', ROOT='/HealthHub', OUT='/HealthHub/analytics/healthhub-chatgpt-source-index.json';
const LOCAL='hh-chatgpt-dropbox-audit-v732'; // private health values never stored here
const MAX=10000, DAY=86400000;
let busy=null,last=null,lastIssue='',mountTimer=0;
const now=()=>new Date().toISOString();
const pnames=['zsolt','monika'];
const rel=p=>p.toLowerCase().replace(/^\/healthhub\//,'');
const allowed=p=>{
 if(typeof p!=='string'||!/^\/HealthHub\//i.test(p))return false;
 const path=rel(p);
 if(/(^|[\/._-])(password|secret|token|credentials|oauth|session|apikey|access-key|private-key)([\/._-]|$)/i.test(path))return false;
 return /^(master\/|profiles\/|documents\/|explanations\/|measurements\/|appointments\/|daily\/|shared\/nutrition-|sync\/(?:zsolt|monika)-lena-health-context\.json$)/i.test(path);
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
  ['Léna Health Context','sync/'+p+'-lena-health-context.json',p,'summary']
 ])
];
const notInDropbox=[
 {key:'supabase-private-daily-health',name:'Privát Daily Health és Supabase AI-jelentések',reason:'Az eredeti forrás a privát Supabase. Külön hitelesített export és visszaolvasás kell.'},
 {key:'device-unsynced',name:'Csak telefonon lévő vagy még nem feltöltött adatok',reason:'A Dropbox-leltár nem igazolja, hogy minden eszköz minden eseménye már felment.'},
 {key:'chatgpt-connector',name:'ChatGPT Dropbox alkalmazásmappa elérése',reason:'Külön ChatGPT Plugin csatlakoztatás és valós fájlolvasási próba szükséges.'}
];
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
   const index=document(files,report);
   let stored=false;
   if(publish){
    await folder();
    await api().uploadJson(OUT,index);
    const returned=await api().downloadJson(OUT);
    stored=checkReadback(index,returned);
   }
   last={...report,generatedAt:index.generatedAt,published:stored,warnings,
    path:OUT,connectorReadVerified:false};
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
 '@media(max-width:410px){#hhAnalytics732 .hhA732Grid{grid-template-columns:1fr}}';
 d.head.append(s);
}
function draw(message,loading){
 const box=d.getElementById('hhAnalytics732');
 if(!box)return;
 const button=box.querySelector('button[data-act=publish]');
 if(button)button.disabled=!!busy||!!loading;
 const dry=box.querySelector('button[data-act=audit]');
 if(dry)dry.disabled=!!busy||!!loading;
 const status=box.querySelector('.hhA732Status');
 if(status&&message)status.textContent=message;
 if(!last)return;
 const matrix=box.querySelector('.hhA732Grid');if(!matrix)return;
 const sections=[
  ['Központi Master',last.sources.filter(x=>x.profile==='shared'&&x.path.includes('/master/'))],
  ['Zsolt',last.sources.filter(x=>x.profile==='zsolt')],
  ['Mónika',last.sources.filter(x=>x.profile==='monika')],
  ['Tünetnapló',last.sources.filter(x=>x.path.endsWith('/symptoms.json'))]
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
  '<div class="hhA732Status" role="status" aria-live="polite">Még nincs ellenőrzött Dropbox-leltár.</div>'+
  '<div class="hhA732Grid"></div>'+
  '<p>A tényleges Google helyett Dropbox lesz az adatforrás. A ChatGPT Dropbox plugin külön csatlakoztatást igényel. A privát Supabase és eszközön maradt adatok nem automatikusan részei a felhőnek.</p>';
 host.insertAdjacentElement('afterend',card);
 card.addEventListener('click',e=>{
  const btn=e.target.closest('button[data-act]');
  if(!btn)return;
  if(btn.dataset.act==='audit')void run({publish:false}).catch(()=>{});
  if(btn.dataset.act==='publish')void run({publish:true,prepare:true}).catch(()=>{});
 });
 draw(null,false);
}
function init(){
 w.HH_DROPBOX_CHATGPT_ANALYTICS_V732={version:VERSION,run,inventory,expected,model:{allowed,summarize,document,checkReadback}};
 mount();
 // The More/Admin page recreates this card; mount only when visible.
 w.setInterval(()=>{if(!d.hidden)mount()},4500);
 w.addEventListener('focus',mount);
 w.addEventListener('healthhub:master-vault-synced',()=>{if(last)draw('A Master frissült. Indíts új forrásellenőrzést.',false);});
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
