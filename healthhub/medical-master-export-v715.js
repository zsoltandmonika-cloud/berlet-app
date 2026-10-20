/* HealthHub v715 · Medical Master: latest verified JSON, safe automatic 6+1 refresh.
 * Purely client-side on the signed-in Dropbox vault. No patient data in GitHub,
 * localStorage, public endpoints or browser logs.
 * Does not modify the original six master sources or normal Ask Léna.
 */
(function(w,d){
 'use strict';
 const BOX_ID='hhMedicalMasterExport715';
 const MANIFEST='/HealthHub/master/manifest.json';
 const MASTER='/HealthHub/master/medical-master.json';
 const KEY='healthhub.medical-master/1';
 const AUTO_REASONS=new Set([
  'document-upload','document-meta','explanation-save','explanation-reset',
  'explanation-import','medication-reference','profile-vault-write'
 ]);
 let pending=null, timer=null, engine=null;
 const own=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const vault=()=>w.HH_DROPBOX_VAULT;
 function connected(){
  const v=vault();return !!(v&&typeof v.connected==='function'&&v.connected()&&
   typeof v.downloadJson==='function'&&typeof v.uploadJson==='function');
 }
 function uiText(message,failed){
  const e=d.getElementById(BOX_ID+'Status');
  if(e){e.textContent=message;e.style.color=failed?'#ffb5bd':'#b8e8fa';}
 }
 async function loadScript(path){
  return new Promise((resolve,reject)=>{
   const uri=new URL(path,d.baseURI).href;
   let tag=Array.from(d.scripts).find(s=>s.src===uri);
   if(!tag){tag=d.createElement('script');tag.src=uri;tag.async=true;d.head.appendChild(tag);}
   // Existing script can have completed before this listener is installed:
   // callers check the exported API before requesting each dependency.
   tag.addEventListener('load',resolve,{once:true});
   tag.addEventListener('error',()=>reject(Error('Medical Master modul betöltési hiba.')),{once:true});
  });
 }
 async function requireEngine(){
  if(w.HH_MEDICAL_MASTER_PRIVATE_V709?.prepare&&
     w.HH_MEDICAL_MASTER_PREVIEW_V708?.build)return w.HH_MEDICAL_MASTER_PRIVATE_V709;
  if(!engine)engine=(async()=>{
   if(!w.HH_MEDICAL_MASTER_PREVIEW_V708?.build)
    await loadScript('./medical-master-preview-v708.js?v=715');
   if(!w.HH_MEDICAL_MASTER_PRIVATE_V709?.prepare)
    await loadScript('./medical-master-private-v709.js?v=715');
   const api=w.HH_MEDICAL_MASTER_PRIVATE_V709;
   if(!api?.prepare||!api?.save||!api?.validate)throw Error('Medical Master generátor nem elérhető.');
   return api;
  })().catch(e=>{engine=null;throw e});
  return engine;
 }
 function safeExisting(api,master,manifest){
  if(!own(master)||master.schema!==KEY||master.sourceManifestVersion!==manifest.updatedAt)return false;
  try{api.validate(master);return true;}catch(_){return false;}
 }
 async function latest(){
  if(!connected())throw Error('Előbb csatlakoztasd a HealthHub privát Dropbox-tárhelyét.');
  const api=await requireEngine(),v=vault();
  const manifest=await v.downloadJson(MANIFEST);
  if(!own(manifest)||manifest.schema!=='healthhub.master.manifest/1'||!manifest.updatedAt)
   throw Error('A forrásmanifest hiányzik vagy hibás. Először szinkronizáld a HealthHubot.');
  let master=null;
  try{master=await v.downloadJson(MASTER);}catch(e){
   if(!(e&&(e.status===404||e.status===409)))throw e;
  }
  if(safeExisting(api,master,manifest))return master;
  const prepared=await api.prepare(); // reads all 6 source JSONs and rechecks manifest
  await api.save(prepared);             // downgrade / loss guards and full read-back
  const saved=await v.downloadJson(MASTER);
  const after=await v.downloadJson(MANIFEST);
  if(!own(after)||after.updatedAt!==prepared.sourceManifestVersion||
     !safeExisting(api,saved,after)||
     JSON.stringify(saved)!==JSON.stringify(prepared))
   throw Error('A Medical Master időközben változott. Az export megszakadt, próbáld újra.');
  return saved;
 }
 async function run(){
  if(pending)return pending;
  pending=latest().finally(()=>{pending=null});
  return pending;
 }
 function download(master){
  const bytes=JSON.stringify(master,null,2);
  const objectUrl=URL.createObjectURL(new Blob([bytes],{type:'application/json;charset=utf-8'}));
  const link=d.createElement('a'),ts=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  link.href=objectUrl;
  link.download='HealthHub_Medical_Master_'+ts+'.json';
  d.body.appendChild(link);link.click();link.remove();
  w.setTimeout(()=>URL.revokeObjectURL(objectUrl),10000);
 }
 async function onDownload(){
  const b=d.getElementById(BOX_ID+'Download');if(b)b.disabled=true;
  uiText('A hat forrás és a legfrissebb Master ellenőrzése…',false);
  try{
   const result=await run();
   download(result);
   uiText('✓ Letöltve: '+result.audit.sourceDocuments+' dokumentum · '+
    result.audit.sourceExplanations+' Léna-magyarázat. A forrásverzió ellenőrizve.',false);
  }catch(e){uiText('Nem tölthető le ellenőrzés nélkül: '+String(e.message||e),true);}
  finally{if(b)b.disabled=false;}
 }
 async function refresh(){
  uiText('Medical Master frissítése a privát Dropboxban…',false);
  try{
   const result=await run();
   uiText('✓ Naprakész Medical Master · '+result.audit.sourceDocuments+
     ' dokumentum, '+result.audit.sourceExplanations+' Léna-magyarázat.',false);
  }catch(e){uiText('Medical Master frissítés szükséges: '+String(e.message||e),true);}
 }
 function auto(event){
  const reason=event?.detail?.reason||'';
  if(!AUTO_REASONS.has(reason))return;
  w.clearTimeout(timer);
  timer=w.setTimeout(()=>{if(connected())refresh();},1500);
 }
 function mount(){
  if(w.healthSectionKind!=='records')return;
  const content=d.getElementById('healthSubContent');
  if(!content||content.querySelector('#'+BOX_ID))return;
  const section=d.createElement('section');section.id=BOX_ID;
  section.className='hrSectionCard';
  section.style.cssText='margin:10px 0 14px;background:linear-gradient(145deg,rgba(14,38,69,.93),rgba(15,55,84,.93));color:#e9f5ff;border:1px solid rgba(114,176,235,.45);border-radius:18px;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,.14)';
  const title=d.createElement('h3');title.textContent='🧠 Medical Master · teljes JSON';
  title.style.cssText='margin:0 0 7px;font-size:16px;color:#ecf6ff';section.appendChild(title);
  const note=d.createElement('p');
  note.textContent='Mindkét profil teljes, legfrissebb Medical Master tudásfájlja, a Léna-magyarázatokkal együtt. Kizárólag a privát Dropboxból készül.';
  note.style.cssText='margin:0 0 11px;line-height:1.45;font-size:12px;color:#c2d9ec';
  section.appendChild(note);
  const actions=d.createElement('div');actions.style.cssText='display:flex;gap:9px;flex-wrap:wrap';
  function button(id,label,click){
   const b=d.createElement('button');b.id=id;b.type='button';b.textContent=label;
   b.style.cssText='background:rgba(34,81,127,.85);color:#fff;border:1px solid #81b5df;border-radius:11px;padding:10px 12px;font:650 12px system-ui;cursor:pointer;max-width:100%;white-space:normal;text-align:left';
   b.addEventListener('click',click);actions.appendChild(b);
  }
  button(BOX_ID+'Download','⬇ Legfrissebb Medical Master letöltése',onDownload);
  button(BOX_ID+'Refresh','↻ Medical Master ellenőrzése',refresh);
  section.appendChild(actions);
  const status=d.createElement('p');status.id=BOX_ID+'Status';
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  status.textContent='Új lelet vagy Léna-magyarázat után automatikusan frissül. Letöltéskor ismét ellenőrizzük.';
  status.style.cssText='font-size:11px;color:#b8e8fa;margin:10px 0 0;line-height:1.5;overflow-wrap:anywhere';
  section.appendChild(status);
  content.prepend(section);
 }
 // Keep the card after asynchronous records re-renders, not in other pages.
 let scheduled=false;
 function scheduleMount(){
  if(scheduled)return;scheduled=true;
  w.requestAnimationFrame? w.requestAnimationFrame(()=>{scheduled=false;mount()}):
   w.setTimeout(()=>{scheduled=false;mount()},40);
 }
 d.addEventListener('DOMContentLoaded',scheduleMount);
 if(d.readyState!=='loading')scheduleMount();
 new MutationObserver(scheduleMount).observe(d.body||d.documentElement,{childList:true,subtree:true});
 w.addEventListener('healthhub:master-vault-synced',auto);
 w.HH_MEDICAL_MASTER_EXPORT_V715={latest,refresh,mount};
})(window,document);
