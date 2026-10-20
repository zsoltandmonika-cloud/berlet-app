/* HealthHub Medical Master v708: strictly read-only private Dropbox preview.
 * Loads the 6 existing /HealthHub/master JSONs in user's browser, generates
 * ONE joined JSON locally. No cloud writes, no OpenAI calls, no repo patient data.
 * Activated only with ?hhMasterPreview=v1.
 */
(function(root){
 'use strict';
 const PREVIEW='healthhub.medical-master.preview/1';
 const SOURCES={
  manifest:'/HealthHub/master/manifest.json',
  documents:'/HealthHub/master/documents.json',
  explanations:'/HealthHub/master/explanations.json',
  medications:'/HealthHub/master/medications.json',
  profiles:'/HealthHub/master/profiles.json',
  appointments:'/HealthHub/master/appointments.json'
 };
 const SCHEMAS={
  manifest:'healthhub.master.manifest/1',
  documents:'healthhub.master.documents/1',
  explanations:'healthhub.master.explanations/1',
  medications:'healthhub.master.medications/1',
  profiles:'healthhub.master.profiles/1',
  appointments:'healthhub.master.appointments/1'
 };
 const PROFILES=['monika','zsolt'];
 const clone=x=>JSON.parse(JSON.stringify(x));
 const filled=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const arr=(pkg,key)=>Array.isArray(pkg?.[key])?pkg[key]:[];
 function checkedSources(data){
  for(const key of Object.keys(SOURCES)){
   const pkg=data[key];
   if(!filled(pkg)||pkg.schema!==SCHEMAS[key])
    throw Error('A '+key+' JSON hiányzik vagy ismeretlen verziójú. A Master nem készül el.');
  }
  for(const key of ['documents','explanations','profiles','appointments']){
   if(!Array.isArray(data[key][key]))
    throw Error('A '+key+' állomány nem tartalmaz érvényes '+key+' listát.');
  }
  const docs=data.documents.documents,exps=data.explanations.explanations;
  if(!docs.length)throw Error('Nincsenek dokumentumok a központi állományban. Hiányos Mastert nem készítünk.');
  for(const row of docs){if(!row||!row.id||!PROFILES.includes(row.profile))throw Error('Dokumentum hiányzó azonosítóval vagy profillal.');}
  for(const row of exps){if(!row||!row.id)throw Error('Léna-magyarázat hiányzó dokumentum-azonosítóval.');}
 }
 function redactProfile(x){
  // No contact/auth data should be exported to the AI-facing preview.
  const blocked=/^(?:address|homeAddress|postalAddress|street|phone|mobile|email|taj|tajNumber|socialSecurityNumber|motherName|password|secret|accessToken|refreshToken|oauth|apiKey|taxNumber|passport|identityNumber)$/i;
  function clean(v,depth){
   if(depth>15)return null;
   if(Array.isArray(v))return v.map(i=>clean(i,depth+1));
   if(!filled(v))return v;
   const out={};
   for(const [key,value] of Object.entries(v)){
    if(blocked.test(key))continue;
    out[key]=clean(value,depth+1);
   }
   return out;
  }
  return x?clean(x,0):null;
 }
 function build(source){
  checkedSources(source);
  const docs=arr(source.documents,'documents'),exps=arr(source.explanations,'explanations');
  const appts=arr(source.appointments,'appointments'),profileRows=arr(source.profiles,'profiles');
  const profiles={};
  for(const p of PROFILES){
   profiles[p]={
    profile:p,
    medicalProfile:profileRows.filter(x=>x&&x.profile===p).map(redactProfile),
    documents:[],
    lenaExplanations:[],
    medications:[],
    appointments:[]
   };
  }
  const byId=new Map();
  for(const d of docs){
   if(byId.has(String(d.id)))throw Error('Ismétlődő dokumentumazonosító: '+String(d.id));
   byId.set(String(d.id),d);
   // Preserve medical indexing, not local/cloud filesystem or credential details.
   profiles[d.profile].documents.push({
    id:d.id,profile:d.profile,
    originalName:d.originalName||null,
    documentDate:d.documentDate||null,
    category:d.category||null,
    sourceType:d.sourceType||null,
    sha256:d.sha256||null,
    uploadedAt:d.uploadedAt||null,
    explanationPresent:false
   });
  }
  const unmatched=[];
  const seenExplanations=new Set();
  for(const e of exps){
   if(seenExplanations.has(String(e.id)))throw Error('Duplikált Léna-magyarázat rekord: '+e.id);
   seenExplanations.add(String(e.id));
   const original=byId.get(String(e.id));
   if(!original){
    unmatched.push({id:e.id,profile:e.profile||null,reason:'original-document-not-in-source',record:clone(e)});
    continue;
   }
   if(e.profile&&e.profile!==original.profile)
    throw Error('A Léna-magyarázat és az eredeti dokumentum profilja eltér: '+e.id);
   const entry={
    documentId:e.id,
    profile:original.profile,
    originalName:original.originalName||null,
    documentDate:original.documentDate||null,
    category:original.category||null,
    sourceSha256:original.sha256||null,
    sourceTier:'existing_lena_explanation_NOT_original_pdf',
    selectedVersion:e.manual?'manual':e.imported?'imported':'empty',
    manual:e.manual?clone(e.manual):null,
    imported:e.imported?clone(e.imported):null,
    importedSource:e.importedSource||null,
    updatedAt:e.updatedAt||null
   };
   profiles[original.profile].lenaExplanations.push(entry);
   const item=profiles[original.profile].documents.find(x=>x.id===e.id);
   item.explanationPresent=Boolean(e.manual||e.imported);
  }
  const med=source.medications.privateReference;
  if(med&&filled(med.profiles)){
   for(const p of PROFILES){
    const ref=med.profiles[p];
    profiles[p].medications=ref?clone(ref.medications||[]):[];
   }
  }
  const unmatchedAppointments=[];
  for(const a of appts){
   if(a&&PROFILES.includes(a.profile)){profiles[a.profile].appointments.push(clone(a));}
   else unmatchedAppointments.push(clone(a));
  }
  for(const p of PROFILES){
   profiles[p].documents.sort((a,b)=>String(a.documentDate||'').localeCompare(String(b.documentDate||''))||String(a.originalName||'').localeCompare(String(b.originalName||'')));
   profiles[p].lenaExplanations.sort((a,b)=>String(a.documentDate||'').localeCompare(String(b.documentDate||''))||String(a.originalName||'').localeCompare(String(b.originalName||'')));
  }
  const count=p=>({documents:profiles[p].documents.length,
   lenaExplanations:profiles[p].lenaExplanations.length,
   withoutExplanation:profiles[p].documents.filter(d=>!d.explanationPresent).length,
   appointments:profiles[p].appointments.length,
   medications:Array.isArray(profiles[p].medications)?profiles[p].medications.length:0});
  const report={
   monika:count('monika'),zsolt:count('zsolt'),
   sourceDocuments:docs.length,sourceExplanations:exps.length,
   unmatchedExplanations:unmatched.length,
   unmatchedAppointments:unmatchedAppointments.length,
   limits:[
    'A Léna-magyarázatok nem azonosak az eredeti PDF-ek teljes szövegével.',
    'A meglévő magyarázatok szakmai pontossága ezzel a lépéssel még nem ellenőrzött.',
    'Ez csak olvasási próba; Dropbox-feltöltés, ChatGPT-szinkron és automatikus frissítés nincs.'
   ]
  };
  return {
   schema:PREVIEW,
   createdAt:new Date().toISOString(),
   status:'LOCAL_PREVIEW_READ_ONLY_NOT_AI_UPLOADED',
   source:'HealthHub private Dropbox /HealthHub/master (6 existing JSON files)',
   sourceFiles:Object.assign({},SOURCES),
   sourceUpdatedAt:Object.fromEntries(Object.entries(SOURCES).map(([k])=>[k,source[k].updatedAt||null])),
   originalManifestVersion:source.manifest.updatedAt||null,
   audit:report,
   patients:profiles,
   exceptions:{unmatchedExplanations:unmatched,unmatchedAppointments:unmatchedAppointments},
   privacy:'Created in the signed-in user browser only. Not uploaded to GitHub, OpenAI or any new database.'
  };
 }
 async function readDropbox(){
  const v=root.HH_DROPBOX_VAULT;
  if(!v||!v.connected||!v.connected()||typeof v.downloadJson!=='function')
   throw Error('A Dropbox HealthHub kapcsolat nincs bejelentkezve. Csatlakozz a Dropboxhoz a HealthHubban.');
  const out={};
  // Sequential reads make individual source failures explicit.
  for(const [key,path] of Object.entries(SOURCES)){
   status('Olvasás a Dropboxból: '+key+'…');
   const data=await v.downloadJson(path);
   if(!data)throw Error('Nem található a központi '+key+' fájl: '+path);
   out[key]=data;
  }
  return out;
 }
 let master=null,json=null,working=false;
 const ID='hhMasterPreviewV708';
 function element(tag,cls,text){
  const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;
 }
 function status(s,isError){
  const t=document.getElementById(ID+'Status');
  if(t){t.textContent=s;t.style.color=isError?'#fd9095':'#a5d8f5';}
 }
 function mount(){
  if(document.getElementById(ID)||!document.body)return;
  const rootBox=element('div');rootBox.id=ID;
  rootBox.style.cssText='position:fixed;inset:0;background:rgba(4,11,26,.9);z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font-family:system-ui,Segoe UI,sans-serif;color:#e8f3ff';
  const box=element('section');
  box.style.cssText='width:min(100%,1020px);max-height:94vh;overflow:auto;border:1px solid #5476a0;border-radius:22px;background:#101e38;box-shadow:0 24px 90px rgba(0,0,0,.5);padding:clamp(14px,3vw,24px);box-sizing:border-box';
  const h=element('h2',null,'🧠 HealthHub · 7. Medical Master JSON');
  h.style.cssText='margin:0 0 10px;color:#d5eaff;font-size:20px';
  box.append(h);
  const p=element('p',null,'Csak olvasható előnézet: a meglévő hat Dropbox JSON-ból állítja össze a közös tudásfájlt. Semmit nem ír vissza a felhőbe és nem küld egészségügyi adatot a ChatGPT-nek.');
  p.style.cssText='font-size:13px;line-height:1.55;color:#b2c8df;margin:0 0 12px';box.append(p);
  const controls=element('div');
  controls.style.cssText='display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px';
  function btn(label,click){
   const b=element('button',null,label);b.type='button';b.style.cssText='border:1px solid #7296c7;border-radius:12px;background:#203c66;color:white;padding:11px 14px;font-size:13px;cursor:pointer;font-weight:650';
   b.onclick=click;controls.append(b);return b;
  }
  const run=btn('1. Hat fájl beolvasása',async()=>{
   if(working)return;
   working=true;run.disabled=true;master=null;json=null;
   try{
    const d=await readDropbox();
    master=build(d);
    json=JSON.stringify(master,null,2);
    const a=master.audit;
    status('Elkészült a helyi előnézet. Mónika: '+a.monika.documents+' dokumentum, '+
       a.monika.lenaExplanations+' Léna-magyarázat. Zsolt: '+a.zsolt.documents+
       ' dokumentum, '+a.zsolt.lenaExplanations+' Léna-magyarázat. Eltérő kapcsolatok: '+a.unmatchedExplanations+'.');
    const pre=document.getElementById(ID+'Text');if(pre)pre.textContent=json.length>55000?
      json.slice(0,55000)+'\n\n… Az előnézet itt rövidül. A letöltés a TELJES JSON-t tartalmazza.':json;
    download.disabled=false;
   }catch(e){status('HIBA: '+(e&&e.message||e)+' · A Master nem készült el.',true);}
   finally{working=false;run.disabled=false;}
  });
  const download=btn('2. Teljes Master JSON letöltése',()=>{
   if(!json)return;
   const blob=new Blob([json],{type:'application/json;charset=utf-8'});
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;a.download='HealthHub_Medical_Master_PREVIEW_'+new Date().toISOString().slice(0,10)+'.json';
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  });download.disabled=true;
  btn('Bezárás',()=>{rootBox.remove();});
  box.append(controls);
  const stat=element('div');stat.id=ID+'Status';stat.textContent='Készen áll a helyi, csak olvasó próbára.';
  stat.style.cssText='font-size:12px;margin:10px 0;color:#a5d8f5;line-height:1.5';box.append(stat);
  const pre=element('pre');pre.id=ID+'Text';pre.textContent='A JSON előnézete az 1. gomb megnyomása után jelenik meg.';
  pre.style.cssText='background:#081426;border:1px solid #314d70;border-radius:12px;padding:15px;max-height:46vh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;color:#d1e5f5;font-size:11px;line-height:1.5;user-select:text';
  box.append(pre);rootBox.append(box);document.body.append(rootBox);
  rootBox.addEventListener('click',e=>{if(e.target===rootBox)rootBox.remove();});
 }
 // Export pure logic for private synthetic tests. Never bind it to a normal HH page.
 root.HH_MEDICAL_MASTER_PREVIEW_V708={build,sourcePaths:clone(SOURCES)};
 if(root.location&&new URLSearchParams(root.location.search).get('hhMasterPreview')==='v1')
  setTimeout(mount,1600);
})(window);
