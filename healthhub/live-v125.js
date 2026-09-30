(function(){
"use strict";
/* HealthHub v1.25 Full HealthRadar migration importer
   Supports the full .tar backup created by the old HealthRadar exporter.
   Structured data stays in localStorage; original document blobs stay in IndexedDB.
   No personal health data is written to the public repository. */

const VAULT_KEY="hh-health-vault-v1";
const DB_NAME="hh-health-docs-v1";
const STORE="docs";

function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function pkey(){return localStorage.getItem("hh-profile")==="m"?"monika":"zsolt"}
function readVault(){try{return JSON.parse(localStorage.getItem(VAULT_KEY)||"null")}catch(_){return null}}
function emptyProfile(name){return {displayName:name,records:[],medications:[],measurements:[],devices:[],appointments:[],referenceDocuments:[]}}
function emptyVault(){return {schemaVersion:"1.25-local",createdAt:new Date().toISOString(),profiles:{zsolt:emptyProfile("Zsolt"),monika:emptyProfile("Mónika")}}}

function uniqMerge(a,b){
  const out=[],seen=new Set();
  for(const x of [...(a||[]),...(b||[])]){
    const k=String(x?.id||JSON.stringify(x));
    if(seen.has(k))continue;
    seen.add(k);out.push(x);
  }
  return out;
}
function mergeProfile(base,inc){
  const out={...(base||{}),...(inc||{})};
  for(const k of ["records","medications","measurements","devices","appointments","referenceDocuments"]){
    out[k]=uniqMerge(base?.[k],inc?.[k]);
  }
  return out;
}
function mergeVault(base,inc){
  const b=base?.profiles?base:emptyVault();
  return {
    ...b,
    ...inc,
    schemaVersion:inc?.schemaVersion||b.schemaVersion||"1.25-local",
    profiles:{
      zsolt:mergeProfile(b.profiles?.zsolt,inc?.profiles?.zsolt),
      monika:mergeProfile(b.profiles?.monika,inc?.profiles?.monika)
    }
  };
}

function dbOpen(){
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB_NAME,1);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:"key"})};
    r.onsuccess=()=>resolve(r.result);
    r.onerror=()=>reject(r.error);
  });
}
async function dbPutMany(items){
  if(!items.length)return;
  const db=await dbOpen();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite"),s=tx.objectStore(STORE);
    for(const item of items)s.put(item);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
  db.close();
}
async function dbGet(key){
  const db=await dbOpen();
  const result=await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readonly"),r=tx.objectStore(STORE).get(key);
    r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);
  });
  db.close();return result;
}
window.hhOpenLocalDocument=async function(key){
  try{
    const x=await dbGet(key);
    if(!x?.blob){window.toast?.("A dokumentumfájl nincs a helyi archívumban");return}
    const url=URL.createObjectURL(x.blob);
    const w=window.open(url,"_blank","noopener");
    if(!w)window.toast?.("A böngésző letiltotta az új ablakot");
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(_){window.toast?.("A dokumentum nem nyitható meg")}
};

function textFrom(bytes){return new TextDecoder("utf-8").decode(bytes).replace(/\0+$/,"")}
function octal(bytes){
  const s=textFrom(bytes).trim().replace(/\0/g,"");
  return parseInt(s||"0",8)||0;
}
async function parseTar(file){
  const bytes=new Uint8Array(await file.arrayBuffer()),entries=new Map();
  let pos=0;
  while(pos+512<=bytes.length){
    const h=bytes.subarray(pos,pos+512);
    if(h.every(v=>v===0))break;
    const name=textFrom(h.subarray(0,100)).trim();
    const size=octal(h.subarray(124,136));
    if(!name)break;
    const start=pos+512,end=start+size;
    if(end>bytes.length)throw new Error("A TAR fájl csonka vagy sérült.");
    entries.set(name,bytes.slice(start,end));
    pos=start+Math.ceil(size/512)*512;
  }
  return entries;
}
function jsonEntry(entries,name){
  const b=entries.get(name);
  if(!b)throw new Error("Hiányzik a TAR-ból: "+name);
  return JSON.parse(textFrom(b));
}
function categoryHu(x){
  return ({cardiology:"Kardiológia",laboratory:"Labor",ent:"Fül-orr-gégészet",urology:"Urológia",orthopedics:"Ortopédia",vaccination:"Oltás",occupational:"Foglalkozás-egészségügy",general:"Általános"})[x]||x||"Lelet";
}
function profKey(x){return String(x||"").toLowerCase().includes("mon")?"monika":"zsolt"}

async function importTar(file){
  window.toast?.("HealthRadar TAR feldolgozása…");
  const entries=await parseTar(file);
  const docs=jsonEntry(entries,"data/documents.json");
  const profiles=jsonEntry(entries,"data/health-profiles.json");
  const appts=jsonEntry(entries,"data/appointments.json");
  const meas=jsonEntry(entries,"data/measurements.json");
  let manifest={};try{manifest=jsonEntry(entries,"manifest.json")}catch(_){}

  const inc=emptyVault();
  inc.schemaVersion="full-tar-1";
  inc.createdAt=new Date().toISOString();
  inc.migration={type:"full_tar",sourceFile:file.name,manifest};

  for(const hp of (profiles.profiles||[])){
    const k=profKey(hp.profile),p=inc.profiles[k];
    p.displayName=hp.fullName||(k==="monika"?"Mónika":"Zsolt");
    p.profileData={...hp};
  }

  const blobs=[];
  for(const d of (docs.documents||[])){
    const k=profKey(d.profile);
    const tarPath=[...entries.keys()].find(n=>n.startsWith("documents/")&&n.includes("_"+d.id+"_"));
    const localDocKey=tarPath?"doc:"+d.id:null;
    inc.profiles[k].records.push({
      id:"tar-doc-"+d.id,
      date:d.documentDate||String(d.uploadedAt||"").slice(0,10)||null,
      title:d.originalName||"Egészségügyi dokumentum",
      category:categoryHu(d.category),
      summary:"Eredeti HealthRadar dokumentum"+(d.sourceType==="summary"?" · összefoglaló":""),
      source:{type:"full_tar",documentId:d.id,originalName:d.originalName,localDocKey,contentType:d.contentType,sizeBytes:d.sizeBytes}
    });
    if(tarPath){
      const bytes=entries.get(tarPath);
      blobs.push({key:localDocKey,name:d.originalName||tarPath.split("/").pop(),type:d.contentType||"application/octet-stream",blob:new Blob([bytes],{type:d.contentType||"application/octet-stream"})});
    }
  }

  for(const a of (appts.appointments||[])){
    const k=profKey(a.profile);
    inc.profiles[k].appointments.push({
      id:"tar-appt-"+a.id,date:a.appointmentDate||String(a.startAt||a.date||"").slice(0,10),
      title:a.title||"Orvosi időpont",status:"planned",startTime:a.startTime||"",endTime:a.endTime||"",location:a.location||"",notes:a.notes||"",source:{type:"full_tar"}
    });
  }

  for(const m of (meas.measurements||[])){
    const k=profKey(m.profile),date=String(m.measuredAt||m.date||"").slice(0,10),base="tar-meas-"+(m.id||Math.random().toString(36).slice(2));
    const add=(suffix,type,label,value,unit)=>{if(value!==null&&value!==undefined&&value!=="")inc.profiles[k].measurements.push({id:base+"-"+suffix,date,type,label,value,unit,source:{type:"full_tar"}})};
    if(m.systolic!=null&&m.diastolic!=null)add("bp","blood_pressure","Vérnyomás",m.systolic+"/"+m.diastolic,"mmHg");
    add("pulse","pulse","Pulzus",m.pulse,"/perc");
    add("weight","weight","Testsúly",m.weightKg,"kg");
    add("glucose","glucose","Vércukor",m.bloodGlucose,"mmol/L");
    add("spo2","oxygen","Véroxigén",m.oxygenSaturation,"%");
  }

  await dbPutMany(blobs);
  const merged=mergeVault(readVault(),inc);
  localStorage.setItem(VAULT_KEY,JSON.stringify(merged));
  return {docs:(docs.documents||[]).length,files:blobs.length,measurements:(meas.measurements||[]).length,appointments:(appts.appointments||[]).length,failed:manifest.filesFailed||0};
}

async function importJson(file){
  const data=JSON.parse(await file.text());
  if(!data?.profiles?.zsolt||!data?.profiles?.monika)throw new Error("A JSON nem HealthRadar migrációs adatcsomag.");
  const merged=mergeVault(readVault(),data);
  localStorage.setItem(VAULT_KEY,JSON.stringify(merged));
  return {json:true};
}

async function importHealthFile(ev){
  const file=ev.target.files?.[0];ev.target.value="";
  if(!file)return;
  try{
    let result;
    if(file.name.toLowerCase().endsWith(".tar"))result=await importTar(file);
    else if(file.name.toLowerCase().endsWith(".json"))result=await importJson(file);
    else throw new Error("JSON vagy TAR HealthRadar-adatcsomagot válassz.");
    window.hhSyncHealthDashboard?.();
    window.hhSyncHealthHome?.();
    window.hhBindHealthHero?.();
    window.renderHealthSection?.();
    if(result.json)window.toast?.("HealthRadar JSON importálva");
    else window.toast?.(`TAR import kész: ${result.docs} lelet, ${result.files} fájl`);
  }catch(e){
    console.error("HealthRadar import failed",e);
    window.toast?.("Import hiba: "+(e?.message||"ismeretlen hiba"));
  }
}
window.hhImportHealthFile=importHealthFile;

const input=document.getElementById("healthVaultFile");
if(input){
  input.accept=".json,.tar,application/json,application/x-tar";
  input.onchange=importHealthFile;
}

const previousDetail=window.openHrDetail;
window.openHrDetail=function(kind,id){
  if(kind!=="record")return previousDetail?.apply(this,arguments);
  const p=readVault()?.profiles?.[pkey()],x=(p?.records||[]).find(r=>r.id===id);
  if(!x)return previousDetail?.apply(this,arguments);
  const local=x.source?.localDocKey;
  const btn=local?`<button class="vaultBtn primary" style="margin-top:10px" onclick="hhOpenLocalDocument('${esc(local)}')">Eredeti dokumentum megnyitása</button>`:"";
  const body=`<h2>${esc(x.title)}</h2><div class="hrDetailMeta">${esc(x.displayDate||x.date||"")} · ${esc(x.category||"")}</div><h4>Léna rövid összefoglalója</h4><p>${esc(x.summary||"Nincs összefoglaló.")}</p>${btn}`;
  const c=document.getElementById("hrDetailContent"),o=document.getElementById("hrDetailOverlay");
  if(c)c.innerHTML=body;if(o)o.classList.add("on");
};

window.HH_LIVE_BUILD="v1.25";
})();