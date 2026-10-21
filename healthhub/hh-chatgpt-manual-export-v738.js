/* HealthHub v738: user-initiated, local-only ChatGPT analysis export.
   The existing private Dropbox vault is READ-ONLY here. Nothing is uploaded.
   The ChatGPT Dropbox connector cannot read this App Folder automatically. */
(function(w,d){
 'use strict';
 const VERSION='738';
 const PROFILES=['zsolt','monika'];
 const LIMIT=4*1024*1024;
 const DAY=86400000;
 let busy=false;
 const now=()=>new Date().toISOString();
 const path=(p,name)=>'/HealthHub/profiles/'+p+'-'+name+'.json';
 function verify(doc,p,label){
  if(!doc||typeof doc!=='object'||Array.isArray(doc))
   throw Error(label+': érvénytelen JSON-adat.');
  const embedded=doc.profile||doc.profile_key||doc.profileKey;
  if(embedded&&String(embedded).toLowerCase()!==p)
   throw Error(label+': másik profilhoz tartozó adat, az export leállt.');
  return doc;
 }
 // Interval records overlap the requested period; daily aggregate rows contain
 // whole-calendar-day totals, not precise rolling 24-hour measurements.
 function recordWindow(row,cutoff,end){
  if(!row||typeof row!=='object')return 'undated';
  const start=row.startTime||row.time||row.timestamp||row.recordedAt||
   row.observedAt||row.date||row.endTime;
  const finish=row.endTime||row.time||row.timestamp||row.recordedAt||
   row.observedAt||row.date||row.startTime;
  if(typeof start!=='string'||typeof finish!=='string')return 'undated';
  const a=Date.parse(start),b=Date.parse(finish);
  if(!Number.isFinite(a)||!Number.isFinite(b))return 'undated';
  const dayOnly=/^\d{4}-\d{2}-\d{2}$/.test(finish);
  const endAt=b+(dayOnly?DAY:0);
  return endAt>=cutoff&&a<=end+5*60000?'included':'outside';
 }
 function healthWindow(data,p,fromMs,toMs){
  verify(data,p,'Health Connect');
  if(!data.records||typeof data.records!=='object'||Array.isArray(data.records))
   throw Error('A Health Connect records mezője hiányzik.');
  const records={},coverage={};
  for(const [key,items] of Object.entries(data.records)){
   if(!Array.isArray(items))continue;
   const selected=[];let undated=0;
   for(const item of items){
    const state=recordWindow(item,fromMs,toMs);
    if(state==='included')selected.push(item);
    if(state==='undated')undated++;
   }
   records[key]=selected;
   coverage[key]={available:items.length,inWindow:selected.length,
    undatedExcluded:undated};
  }
  return {schemaVersion:data.schemaVersion||null,profile:p,
   sourceExportedAt:data.exportedAt||null,sourceDiagnostics:data.syncDiagnostics||null,
   sourceCounts:data.counts||null,records,coverage,
   interpretation:'Timed records overlap the last 24 hours. Dated daily aggregates may cover whole calendar days.'};
 }
 async function build(p,clock){
  if(!PROFILES.includes(p))throw Error('Érvénytelen profil.');
  const vault=w.HH_DROPBOX_VAULT;
  if(!vault||!vault.connected?.()||typeof vault.downloadJson!=='function')
   throw Error('A HealthHub saját Dropbox Vaultja nincs csatlakoztatva.');
  const start=clock-24*60*60*1000;
  const specs=[
   ['healthConnect',path(p,'health-connect'),true],
   ['digitalWellbeing',path(p,'digital-wellbeing'),true],
   ['nutrition',path(p,'nutrition'),false],
   ['samsungHealth',path(p,'samsung-health'),false],
   ['lenaHealthContext','/HealthHub/sync/'+p+'-lena-health-context.json',false],
   ['dailyHealth','/HealthHub/analytics/healthhub-daily-health-'+p+'.json',false]
  ];
  const data={},sources=[],warnings=[];
  for(const [key,sourcePath,required] of specs){
   try{
    const raw=verify(await vault.downloadJson(sourcePath),p,key);
    data[key]=key==='healthConnect'?healthWindow(raw,p,start,clock):raw;
    sources.push({kind:key,path:sourcePath,status:'read',sourceReportedAt:
     raw.exportedAt||raw.generatedAt||raw.updatedAt||null,profileVerified:!!(
      raw.profile||raw.profile_key||raw.profileKey)});
   }catch(e){
    if(required)throw Error(key+': kötelező forrás nem olvasható. '+String(e.message||e));
    sources.push({kind:key,path:sourcePath,status:'unavailable'});
    warnings.push(key+': nem elérhető, nincs a csomagban.');
   }
  }
  return {schema:'healthhub.chatgpt.manual-24h-digital/1',
   exportedAt:new Date(clock).toISOString(),profile:p,sourceOfTruth:'HealthHub private Dropbox App Folder',
   window:{start:new Date(start).toISOString(),end:new Date(clock).toISOString(),
    healthConnect:'rolling-24h-with-overlapping-sessions',
    digitalWellbeing:'original source file; verify its internal 30-day coverage',
    dailyAggregates:'calendar-day rows may extend beyond the exact 24h interval'},
   isAutomaticSync:false,chatgptReadVerified:false,
   excludedCollections:['historical medical PDFs','oversized profile vault','unexported on-device records'],
   warnings,sources,data};
 }
 function save(bundle){
  const serialized=JSON.stringify(bundle);
  const bytes=new TextEncoder().encode(serialized).byteLength;
  if(bytes>LIMIT)throw Error('A csomag '+Math.ceil(bytes/1024/1024)+
   ' MB, meghaladja a 4 MB-os elemzési korlátot. Nem készült hiányos export.');
  const blob=new Blob([serialized],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=d.createElement('a');
  a.href=url;a.download='healthhub-chatgpt-'+bundle.profile+'-24h-digital-'+
   bundle.exportedAt.slice(0,10)+'.json';
  d.body.appendChild(a);a.click();a.remove();
  w.setTimeout(()=>URL.revokeObjectURL(url),60000);
  return {name:a.download,bytes};
 }
 async function act(card){
  if(busy)return;
  const select=card.querySelector('[data-hh-export-profile]');
  const status=card.querySelector('[data-hh-export-status]');
  const btn=card.querySelector('[data-hh-export-button]');
  const p=select?.value;
  if(!PROFILES.includes(p))return;
  busy=true;btn.disabled=true;select.disabled=true;
  status.textContent='Privát fájlok olvasása, 24 órás kivonat készítése…';
  try{
   const bundle=await build(p,Date.now());
   const out=save(bundle);
   const n=Object.values(bundle.data.healthConnect.coverage)
    .reduce((sum,x)=>sum+x.inWindow,0);
   status.textContent='✓ Helyi export: '+out.name+' ('+
    Math.round(out.bytes/1024)+' KB). Health Connect: '+n+
    ' időablakba eső rekord; Digital Wellbeing mellékelve.'+
    (bundle.warnings.length?' Hiányzó opcionális források: '+bundle.warnings.join(' '):'')+
    ' A fájlt külön kell feltölteni ChatGPT-be vagy a ChatGPT-nek látható Dropboxba.';
  }catch(e){status.textContent='⚠ '+String(e.message||e);}
  finally{busy=false;btn.disabled=false;select.disabled=false;}
 }
 function mount(){
  const card=d.getElementById('hhAnalytics732');
  if(!card||card.querySelector('[data-hh-export-box]'))return;
  const block=d.createElement('div');
  block.dataset.hhExportBox=VERSION;
  block.style.cssText='margin:10px 0;padding:10px;border:1px solid #789cbe77;border-radius:12px;background:#0c274181';
  block.innerHTML='<div style="font-weight:750;font-size:12px;margin-bottom:5px">'+
   '📦 24 óra + Digital Health · helyi elemzési export</div>'+
   '<p style="font-size:11px">Health Connect (24 óra), Digital Wellbeing (eredeti 30 napos fájl),'+
   ' Nutrition, Samsung Health, Léna Health Context és Daily Health, ahol elérhető.'+
   ' Csak a saját gépedre ment, nem tölt fel külső szolgáltatásba.</p>'+
   '<label style="font-size:11px">Profil: <select data-hh-export-profile style="background:#133651;color:#fff;padding:7px;border-radius:8px">'+
   '<option value="zsolt">Zsolt</option><option value="monika">Mónika</option></select></label> '+
   '<button type="button" data-hh-export-button>📥 Elemzési JSON letöltése</button>'+
   '<p data-hh-export-status role="status" aria-live="polite" style="font-size:11px"></p>';
  const details=card.querySelector('.hhA732Details');
  if(details)details.insertAdjacentElement('beforebegin',block);
  else card.appendChild(block);
  block.querySelector('[data-hh-export-button]').addEventListener('click',()=>void act(card));
 }
 w.HH_CHATGPT_MANUAL_EXPORT_V738={version:VERSION,build,healthWindow,recordWindow};
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 w.setInterval(()=>{if(!d.hidden)mount()},3000);
})(window,document);
