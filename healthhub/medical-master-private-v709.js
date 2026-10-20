/* HealthHub v709 · Seventh Medical Master, user-triggered private Dropbox save.
 * On ?hhMasterPilot=v1 only. No normal HealthHub/Ask Lena changes.
 * Six structured JSON sources remain READ ONLY. No OpenAI upload in this phase.
 */
(function(root){
 'use strict';
 const ID='hhMedicalMasterPilotV709';
 const TARGET='/HealthHub/master/medical-master.json';
 const SCHEMA='healthhub.medical-master/1';
 const SOURCE='/HealthHub/master/manifest.json';
 const names=['manifest','documents','explanations','medications','profiles','appointments'];
 const buildPreview=root.HH_MEDICAL_MASTER_PREVIEW_V708;
 if(!buildPreview||typeof buildPreview.build!=='function')return;
 let ready=null,working=false,sourceStamp=null,sourceJson=null;
 const vault=()=>root.HH_DROPBOX_VAULT;
 const own=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const identical=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function safeV(){
  const v=vault();
  if(!v||!v.connected||!v.connected()||
     typeof v.downloadJson!=='function'||typeof v.uploadJson!=='function')
   throw Error('A privát Dropbox HealthHub kapcsolat nem aktív.');
  return v;
 }
 function validate(master){
  if(!own(master)||master.schema!==SCHEMA||!own(master.patients)||!own(master.audit)||
     !own(master.patients.monika)||!own(master.patients.zsolt)||
     !own(master.sourceUpdatedAt)||!master.sourceManifestVersion)
   throw Error('Hiányos vagy ismeretlen Master séma.');
  const a=master.audit;
  if(!(a.sourceDocuments>0)||a.sourceExplanations<1||
     a.unmatchedExplanations!==0||a.unmatchedAppointments!==0||
     a.sourceDocuments!==a.monika.documents+a.zsolt.documents||
     a.sourceExplanations!==a.monika.lenaExplanations+a.zsolt.lenaExplanations)
   throw Error('Forrás-összerendelési hiba: a Master mentését letiltottuk.');
  for(const p of ['monika','zsolt']){
   const x=master.patients[p];
   if(x.profile!==p||x.documents.length!==a[p].documents||
      x.lenaExplanations.length!==a[p].lenaExplanations||
      x.documents.some(d=>d.profile!==p)||
      x.lenaExplanations.some(d=>d.profile!==p))
    throw Error('Profilkeveredés vagy eltérő darabszám: '+p);
   const ids=new Set(x.documents.map(d=>String(d.id)));
   if(x.lenaExplanations.some(e=>!ids.has(String(e.documentId))))
    throw Error('Magyarázat dokumentumkapcsolat nélkül: '+p);
  }
  // The existing v304 producer writes all 5 data files with the exact same updatedAt,
  // followed by a last-write manifest. Different timestamps indicate racing sync.
  const stamps=names.filter(n=>n!=='manifest').map(n=>master.sourceUpdatedAt[n]);
  if(stamps.some(s=>!s||s!==stamps[0]))throw Error('A hat forrás frissítés közben eltért. Próbáld újra.');
 }
 function fromPreview(preview){
  if(preview?.schema!=='healthhub.medical-master.preview/1')
   throw Error('A Medical Master előnézet verziója nem megfelelő.');
  const master={
   schema:SCHEMA,
   createdAt:preview.createdAt,
   status:'PRIVATE_DROPBOX_MASTER_NOT_YET_CONNECTED_TO_ASK_LENA',
   source:'HealthHub private Dropbox /HealthHub/master',
   sourceFiles:preview.sourceFiles,
   sourceUpdatedAt:preview.sourceUpdatedAt,
   sourceManifestVersion:preview.originalManifestVersion,
   audit:{...preview.audit,limits:[
    'A korábbi Léna-magyarázat nem azonos az eredeti PDF teljes szövegével.',
    'A korábbi magyarázatok szakmai pontossága nem ellenőrzött automatikusan.',
    'Ask Léna OpenAI-kutatás és automatikus leletfrissítés még NINCS bekötve.'
   ]},
   patients:preview.patients,
   exceptions:preview.exceptions,
   privacy:'Private Dropbox only. User-triggered save; no GitHub patient records; no OpenAI transfer.'
  };
  validate(master);return master;
 }
 async function sourceRead(){
  const v=safeV(),paths=buildPreview.sourcePaths,all={};
  for(const n of names){
   status('Privát Dropbox beolvasása: '+n+'…');
   const data=await v.downloadJson(paths[n]);
   if(!own(data))throw Error('Hiányzó vagy sérült forrás: '+n);
   all[n]=data;
  }
  // v304 writes the manifest LAST. Ensure it didn't change while reading sources.
  const m=await v.downloadJson(SOURCE);
  if(!own(m)||!identical(m,all.manifest))
   throw Error('A manifest közben frissült. A próba biztonsági okból megszakadt.');
  return all;
 }
 async function prepare(){
  const source=await sourceRead();
  const candidate=fromPreview(buildPreview.build(source));
  const m=await safeV().downloadJson(SOURCE);
  if(!own(m)||!identical(m,source.manifest))
   throw Error('A források időközben változtak. Frissítsd az előnézetet.');
  return candidate;
 }
 async function ensureBeforeSave(next){
  const v=safeV();
  const m=await v.downloadJson(SOURCE);
  if(!own(m)||m.updatedAt!==next.sourceManifestVersion)
   throw Error('A források a próba óta frissültek. Beolvasás szükséges.');
  let old=null;
  try{old=await v.downloadJson(TARGET)}catch(e){
   if(!(e&&(e.status===409||e.status===404)))throw e;
  }
  if(old){
   if(old.schema!==SCHEMA||!own(old.audit)||!own(old.sourceUpdatedAt))
    throw Error('Már létezik idegen formátumú hetedik fájl. Nem írjuk felül.');
   if(Date.parse(old.sourceManifestVersion||0)>Date.parse(next.sourceManifestVersion))
    throw Error('A Dropbox Master frissebb. Régebbi adatot nem írunk rá.');
   if(old.audit.sourceDocuments>next.audit.sourceDocuments||
      old.audit.sourceExplanations>next.audit.sourceExplanations)
    throw Error('A korábbi Masterben több adat van. Adatvesztés elkerülésére nincs felülírás.');
  }
 }
 async function save(master){
  validate(master);
  await ensureBeforeSave(master);
  const v=safeV();
  status('A hetedik fájl biztonságos Dropbox-mentése…');
  await v.uploadJson(TARGET,master);
  status('Visszaolvasás és teljes tartalomellenőrzés…');
  const actual=await v.downloadJson(TARGET);
  if(!actual||!identical(actual,master))
   throw Error('A mentés visszaellenőrzése nem egyezik! Az állapot bizonytalan, ellenőrizd a Dropboxot.');
  return {path:TARGET,audit:master.audit,verified:true};
 }
 const el=(tag,txt)=>{
  const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;return e;
 };
 function status(message,error=false){
  const x=document.getElementById(ID+'Status');
  if(x){x.textContent=message;x.style.color=error?'#ffb1b4':'#afdfff';}
 }
 function button(label,func){
  const b=el('button',label);b.type='button';
  b.style.cssText='border:1px solid #608ac2;border-radius:12px;padding:12px 14px;background:#213e68;color:white;font-weight:650;cursor:pointer;font-family:inherit;';
  b.addEventListener('click',func);return b;
 }
 async function guarded(fn){
  if(working)return;working=true;
  const acts=document.querySelectorAll('#'+ID+' button');acts.forEach(x=>x.disabled=true);
  try{await fn();}
  catch(e){status('HIBA · '+String(e.message||e)+' · A források változatlanok.',true);}
  finally{working=false;acts.forEach(x=>x.disabled=false);}
 }
 function download(){
  if(!ready)return;
  const body=JSON.stringify(ready,null,2),url=URL.createObjectURL(new Blob([body],{type:'application/json;charset=utf-8'}));
  const a=el('a');a.download='HealthHub_Medical_Master_'+new Date().toISOString().slice(0,10)+'.json';
  a.href=url;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
 }
 function mount(){
  if(document.getElementById(ID)||!document.body)return;
  const cover=el('div');cover.id=ID;
  cover.style.cssText='position:fixed;inset:0;z-index:2147483000;background:rgba(2,10,26,.93);display:flex;align-items:center;justify-content:center;padding:14px;font-family:system-ui,sans-serif;color:#e8f4ff;';
  const card=el('section');card.style.cssText='width:min(100%,950px);max-height:93vh;overflow:auto;background:#101e37;border:1px solid #5074a0;border-radius:22px;padding:22px;box-sizing:border-box;box-shadow:0 25px 80px #030817';
  const h=el('h2','🧠 HealthHub · 7. Medical Master · v709');
  h.style.cssText='font-size:21px;margin:0 0 12px';card.append(h);
  const p=el('p','Privát Dropbox-próba: a hat meglévő JSON-t csak olvassuk, majd a hetedik Medical Mastert külön mentjük. Nincs Ask Léna/OpenAI adatátadás. A mentés után a TELJES JSON-t visszaolvassuk és ellenőrizzük.');
  p.style.cssText='font-size:13px;line-height:1.6;color:#bbd2e8';card.append(p);
  const actions=el('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:9px;margin:14px 0';
  const saveButton=button('2. Hetedik Master mentése a Dropboxba',()=>guarded(async()=>{
   if(!ready)throw Error('Előbb olvasd be a hat forrást.');
   if(!root.confirm('A teljes, mindkét profilra kiterjedő Medical Mastert elmented a saját privát Dropboxodba? A hat eredeti fájlhoz nem nyúlunk.'))return;
   const report=await save(ready);
   status('✅ Mentve és visszaellenőrizve: '+report.path+' · '+
    report.audit.monika.documents+' Mónika-dokumentum, '+
    report.audit.zsolt.documents+' Zsolt-dokumentum, '+
    report.audit.sourceExplanations+' magyarázat.');
  }));
  actions.append(button('1. Hat forrás ellenőrzése',()=>guarded(async()=>{
   ready=null;sourceStamp=null;sourceJson=null;
   const result=await prepare();ready=result;sourceStamp=result.sourceManifestVersion;sourceJson=JSON.stringify(result,null,2);
   status('✅ Előkészítve: '+result.audit.sourceDocuments+' dokumentum, '+
    result.audit.sourceExplanations+' Léna-magyarázat, összerendelési hiba: '+
    result.audit.unmatchedExplanations+'. A Dropbox-mentés még NEM történt meg.');
   const view=document.getElementById(ID+'Json');
   view.textContent=sourceJson.length>48000?sourceJson.slice(0,48000)+'\n\n… (Az előnézet rövidítve, letöltés teljes.)':sourceJson;
  })));
  actions.append(saveButton);
  actions.append(button('3. Teljes JSON letöltése',()=>{if(ready)download();else status('Előbb olvasd be a hat forrást.',true);}));
  actions.append(button('Bezárás',()=>cover.remove()));
  card.append(actions);
  const s=el('div','A hat eredeti JSON továbbra is változatlan.');s.id=ID+'Status';
  s.style.cssText='font-size:12px;color:#afdfff;line-height:1.5;margin:8px 0';card.append(s);
  const out=el('pre','Az első gombbal töltheted be a JSON előnézetét.');
  out.id=ID+'Json';out.style.cssText='max-height:45vh;overflow:auto;border:1px solid #3b587b;border-radius:12px;background:#071427;padding:12px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;line-height:1.48;color:#c4dff6';
  card.append(out);cover.append(card);document.body.append(cover);
 }
 // Public pure helpers for synthetic QA; never publish or cache private data.
 root.HH_MEDICAL_MASTER_PRIVATE_V709={fromPreview,validate,sourceRead,prepare,save,target:TARGET};
 if(new URLSearchParams(root.location.search).get('hhMasterPilot')==='v1')setTimeout(mount,1700);
})(window);
