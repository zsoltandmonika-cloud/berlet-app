(function(){
'use strict';

/* HealthRadar full migration adapter.
   Functional-only patch: it does not add or change HealthHub CSS/layout. */
const DB_NAME='healthhub-healthradar-v2';
const DB_VERSION=1;
const META_KEY='full-migration';
const legacyRender=window.renderHealthSection;
const legacyImport=window.importHealthVault;
const legacyDetail=window.openHrDetail;
const legacyExport=window.exportHealthVault;

const MEDICATIONS={
  monika:[
    {id:'med-monika-inspra',name:'Inspra',dose:'12,5 mg · naponta 1×',status:'aktuális'},
    {id:'med-monika-entresto',name:'Entresto',dose:'24/26 mg · ½ tabletta reggel és este',status:'aktuális'},
    {id:'med-monika-concor',name:'Concor',dose:'2,5 mg · naponta 2×',status:'aktuális'},
    {id:'med-monika-noacid',name:'Noacid',dose:'40 mg · este 1×',status:'aktuális'},
    {id:'med-monika-forxiga',name:'Forxiga',dose:'10 mg · naponta 1×',status:'aktuális'},
    {id:'med-monika-aerius',name:'Aerius',dose:'szezonálisan · allergiaszezonban',status:'aktuális'}
  ],
  zsolt:[
    {id:'med-zsolt-tolura',name:'Tolura',dose:'40 mg · naponta 1×',status:'aktuális'}
  ]
};
const DEVICES={
  monika:[{id:'device-monika-crtd',name:'Medtronic Amplia MRI Quad CRT-D',type:'DTMB2QQ · MR-kondicionális',implantedAt:'2024-07-15',status:'beültetett'}],
  zsolt:[]
};

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function profileKey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function toastMsg(s){try{window.toast?.(s)}catch(_){}}
function fmtDate(s){if(!s)return '';const d=new Date(s);if(Number.isNaN(d.getTime()))return String(s);return new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'2-digit',day:'2-digit',hour:s.includes('T')?'2-digit':undefined,minute:s.includes('T')?'2-digit':undefined}).format(d)}
function hrow(icon,title,sub,tag='',click=''){return `<div class="hrRow${click?' clickable':''}"${click?` onclick="${click}"`:''}><div class="hrIco">${icon}</div><div><b>${esc(title)}</b><small>${esc(sub||'')}</small></div>${tag?`<span class="hrTag">${esc(tag)}</span>`:''}</div>`}

function openDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('meta')) db.createObjectStore('meta',{keyPath:'key'});
      if(!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles',{keyPath:'profile'});
      if(!db.objectStoreNames.contains('documents')){const s=db.createObjectStore('documents',{keyPath:'id'});s.createIndex('profile','profile',{unique:false});}
      if(!db.objectStoreNames.contains('documentBlobs')) db.createObjectStore('documentBlobs',{keyPath:'id'});
      if(!db.objectStoreNames.contains('measurements')){const s=db.createObjectStore('measurements',{keyPath:'id'});s.createIndex('profile','profile',{unique:false});}
      if(!db.objectStoreNames.contains('appointments')){const s=db.createObjectStore('appointments',{keyPath:'id'});s.createIndex('profile','profile',{unique:false});}
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
function reqP(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function getOne(store,key){const db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).get(key))}finally{db.close()}}
async function getAll(store){const db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).getAll())}finally{db.close()}}
async function getByProfile(store,p){const db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).index('profile').getAll(p))}finally{db.close()}}
async function migrationMeta(){try{return await getOne('meta',META_KEY)}catch(_){return null}}

function tarString(bytes,off,len){let end=off;while(end<off+len&&bytes[end]!==0)end++;return new TextDecoder().decode(bytes.subarray(off,end)).trim()}
function tarOct(bytes,off,len){const s=tarString(bytes,off,len).replace(/\0/g,'').trim();return parseInt(s||'0',8)||0}
function parseTar(buf){
  const bytes=new Uint8Array(buf),out=[];let off=0;
  while(off+512<=bytes.length){
    let zero=true;for(let i=off;i<off+512;i++){if(bytes[i]!==0){zero=false;break}}if(zero)break;
    const name=tarString(bytes,off,100),size=tarOct(bytes,off+124,12),type=String.fromCharCode(bytes[off+156]||48);
    const start=off+512,end=start+size;
    if(end>bytes.length)throw new Error('A TAR fájl csonka vagy sérült.');
    if(name&&type!=='5')out.push({name,size,bytes:bytes.slice(start,end)});
    off=start+Math.ceil(size/512)*512;
  }
  return out;
}
function parseJsonEntry(entries,name){const e=entries.find(x=>x.name===name);if(!e)throw new Error(`Hiányzó fájl: ${name}`);return JSON.parse(new TextDecoder().decode(e.bytes))}

async function saveFullMigration(entries,sourceFileName){
  const documents=parseJsonEntry(entries,'data/documents.json');
  const profiles=parseJsonEntry(entries,'data/health-profiles.json');
  const appointments=parseJsonEntry(entries,'data/appointments.json');
  const measurements=parseJsonEntry(entries,'data/measurements.json');
  const manifest=entries.some(x=>x.name==='manifest.json')?parseJsonEntry(entries,'manifest.json'):{};
  const docs=documents.documents||[], profs=profiles.profiles||[], apps=appointments.appointments||[], meas=measurements.measurements||[];
  if(docs.length<1||profs.length<2)throw new Error('A csomag nem teljes HealthRadar-migráció.');

  const blobById=new Map();
  for(const e of entries){
    if(!e.name.startsWith('documents/'))continue;
    const m=e.name.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if(m)blobById.set(m[0],new Blob([e.bytes],{type:'application/pdf'}));
  }
  if(blobById.size!==docs.length)throw new Error(`Dokumentumfájl eltérés: ${blobById.size}/${docs.length}.`);

  const db=await openDb();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(['meta','profiles','documents','documentBlobs','measurements','appointments'],'readwrite');
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Az import megszakadt.'));
    for(const n of ['meta','profiles','documents','documentBlobs','measurements','appointments'])tx.objectStore(n).clear();
    for(const x of profs)tx.objectStore('profiles').put(x);
    for(const x of docs)tx.objectStore('documents').put(x);
    for(const x of meas)tx.objectStore('measurements').put(x);
    for(const x of apps)tx.objectStore('appointments').put(x);
    for(const x of docs)tx.objectStore('documentBlobs').put({id:x.id,blob:blobById.get(x.id)});
    tx.objectStore('meta').put({key:META_KEY,importedAt:new Date().toISOString(),sourceFileName,manifest,counts:{documents:docs.length,measurements:meas.length,profiles:profs.length,appointments:apps.length}});
  });
  db.close();
  return {docs:docs.length,meas:meas.length,profiles:profs.length,apps:apps.length};
}

async function importTar(file){
  toastMsg('HealthRadar teljes migráció importálása…');
  const entries=parseTar(await file.arrayBuffer());
  const c=await saveFullMigration(entries,file.name);
  toastMsg(`HealthRadar kész: ${c.docs} lelet · ${c.meas} mérés`);
  await window.renderHealthSection();
}

window.importHealthVault=async function(ev){
  const file=ev?.target?.files?.[0];if(!file)return;
  try{
    if(/\.tar$/i.test(file.name)||file.type==='application/x-tar')await importTar(file);
    else if(legacyImport)legacyImport(ev);
  }catch(e){console.error(e);toastMsg('HealthRadar import hiba: '+(e?.message||e))}
  finally{try{ev.target.value=''}catch(_){}}
};

function measurementSummary(x){
  const a=[];
  if(x.systolic!=null&&x.diastolic!=null)a.push(`${x.systolic}/${x.diastolic} Hgmm`);
  if(x.pulse!=null)a.push(`pulzus ${x.pulse}/perc`);
  if(x.weightKg!=null)a.push(`${x.weightKg} kg`);
  if(x.bloodGlucose!=null)a.push(`${x.bloodGlucose} mmol/L`);
  if(x.oxygenSaturation!=null)a.push(`SpO₂ ${x.oxygenSaturation}%`);
  if(x.notes)a.push(x.notes);
  return a.join(' · ');
}
function measurementTitle(x){
  if(x.systolic!=null||x.diastolic!=null)return 'Vérnyomás';
  if(x.weightKg!=null)return 'Testsúly';
  if(x.bloodGlucose!=null)return 'Vércukor';
  if(x.oxygenSaturation!=null)return 'Véroxigén';
  if(x.pulse!=null)return 'Pulzus';
  return 'Mérés';
}

async function renderHistory(p){
  const [docs,apps]=await Promise.all([getByProfile('documents',p),getByProfile('appointments',p)]);
  const e=[];
  docs.forEach(x=>e.push({d:x.documentDate||x.uploadedAt||'',t:x.originalName,s:`Lelet · ${x.category||''}`,k:'record',id:x.id}));
  (DEVICES[p]||[]).forEach(x=>e.push({d:x.implantedAt||'',t:x.name,s:'Eszköz · '+(x.type||''),k:'device',id:x.id}));
  apps.forEach(x=>e.push({d:x.appointmentDate||'',t:x.title,s:'Tervezett időpont',k:'appointment',id:x.id}));
  e.sort((a,b)=>String(b.d).localeCompare(String(a.d)));
  return `<div class="hrTimeline">${e.map(x=>`<div class="hrEvent" onclick="openHrDetail('${x.k}','${x.id}')"><time>${esc(fmtDate(x.d)||'Dátum nélkül')}</time><b>${esc(x.t)}</b><p>${esc(x.s)}</p></div>`).join('')}</div>`;
}

window.renderHealthSection=async function(){
  const meta=await migrationMeta();
  if(!meta){return legacyRender?.()}
  const p=profileKey(),k=window.healthSectionKind||'overview',q=(document.getElementById('healthSearch')?.value||'').toLocaleLowerCase('hu');
  const titles={overview:'Egészség áttekintés',records:'Leletek',medications:'Gyógyszerek',measurements:'Mérések',devices:'Eszközök',more:'Továbbiak'};
  const pn=p==='monika'?'Mónika':'Zsolt';
  const sp=document.getElementById('healthSubProfile'),st=document.getElementById('healthSubTitle'),banner=document.getElementById('healthMigrationBanner'),c=document.getElementById('healthSubContent');
  if(!c)return;
  if(sp)sp.textContent=pn;if(st)st.textContent=titles[k]||'HealthRadar';
  if(banner){banner.className='migrationBanner ok';banner.innerHTML=`<b>✓ Teljes HealthRadar-adatcsomag betöltve</b><br>${meta.counts?.documents||0} lelet · ${meta.counts?.measurements||0} mérés · helyi privát tárhely`;}

  if(k==='more'){
    c.innerHTML=`<div class="hrSectionCard"><h3>🔐 Privát HealthRadar-adatok</h3><div class="vaultTools"><button class="vaultBtn primary" onclick="document.getElementById('healthVaultFile').click()">Adatcsomag importálása</button><button class="vaultBtn" onclick="exportHealthVault()">Helyi mentés export</button></div><div class="privacyNote">A teljes HealthRadar-karton ezen a készüléken, a böngésző privát IndexedDB tárhelyén marad.</div></div><div class="hrSectionCard"><h3>🕑 HealthRadar előzmények</h3>${await renderHistory(p)}</div>`;
    return;
  }
  if(k==='overview'){
    const [docs,meas,apps]=await Promise.all([getByProfile('documents',p),getByProfile('measurements',p),getByProfile('appointments',p)]);
    c.innerHTML=`<div class="hrSectionCard"><h3>📊 Migrált karton</h3>${hrow('📄','Leletek és naplóbejegyzések',docs.length+' tétel','Leletek')}${hrow('💊','Gyógyszerek',(MEDICATIONS[p]||[]).length+' tétel','Gyógyszer')}${hrow('📈','Mérések',meas.length+' tétel','Mérés')}${hrow('⌚','Eszközök',(DEVICES[p]||[]).length+' tétel','Eszköz')}${apps.length?hrow('📅','Közelgő időpontok',apps.length+' tétel','Időpont'):''}</div><div class="hrSectionCard"><h3>🕑 HealthRadar előzmények</h3>${await renderHistory(p)}</div>`;
    return;
  }
  if(k==='records'){
    let arr=await getByProfile('documents',p);arr.sort((a,b)=>String(b.documentDate||b.uploadedAt).localeCompare(String(a.documentDate||a.uploadedAt)));
    if(q)arr=arr.filter(x=>[x.originalName,x.documentDate,x.category,x.sourceType].join(' ').toLocaleLowerCase('hu').includes(q));
    c.innerHTML=`<div class="hrSectionCard"><h3>📄 Leletek és egészségügyi napló</h3>${arr.length?arr.map(x=>hrow('📄',x.originalName,[fmtDate(x.documentDate),x.category].filter(Boolean).join(' · '),'PDF',`openHrDocument('${x.id}')`)).join(''):'<div class="hrEmpty">Nincs találat.</div>'}</div>`;
    return;
  }
  if(k==='medications'){
    let arr=MEDICATIONS[p]||[];if(q)arr=arr.filter(x=>JSON.stringify(x).toLocaleLowerCase('hu').includes(q));
    c.innerHTML=`<div class="hrSectionCard"><h3>💊 Gyógyszerek</h3>${arr.length?arr.map(x=>hrow('💊',x.name,x.dose,x.status,`openHrDetail('medication','${x.id}')`)).join(''):'<div class="hrEmpty">Nincs találat.</div>'}</div>`;
    return;
  }
  if(k==='measurements'){
    let arr=await getByProfile('measurements',p);arr.sort((a,b)=>String(b.measuredAt).localeCompare(String(a.measuredAt)));
    if(q)arr=arr.filter(x=>[measurementTitle(x),measurementSummary(x),x.measuredAt].join(' ').toLocaleLowerCase('hu').includes(q));
    c.innerHTML=`<div class="hrSectionCard"><h3>📈 Mérések</h3>${arr.length?arr.map(x=>hrow('📈',measurementTitle(x),[fmtDate(x.measuredAt),measurementSummary(x)].filter(Boolean).join(' · '),'migrált',`openHrDetail('measurement','${x.id}')`)).join(''):'<div class="hrEmpty">Nincs találat.</div>'}</div>`;
    return;
  }
  if(k==='devices'){
    let arr=DEVICES[p]||[];if(q)arr=arr.filter(x=>JSON.stringify(x).toLocaleLowerCase('hu').includes(q));
    c.innerHTML=`<div class="hrSectionCard"><h3>⌚ Eszközök</h3>${arr.length?arr.map(x=>hrow('⌚',x.name,[x.type,fmtDate(x.implantedAt)].filter(Boolean).join(' · '),x.status,`openHrDetail('device','${x.id}')`)).join(''):'<div class="hrEmpty">Nincs találat.</div>'}</div>`;
    return;
  }
};

window.openHrDocument=async function(id){
  const x=await getOne('documentBlobs',id);if(!x?.blob){toastMsg('A dokumentumfájl nem található.');return}
  const url=URL.createObjectURL(x.blob),w=window.open(url,'_blank');
  if(!w){URL.revokeObjectURL(url);toastMsg('A böngésző letiltotta az új ablakot.');return}
  setTimeout(()=>URL.revokeObjectURL(url),120000);
};

window.openHrDetail=async function(kind,id){
  const meta=await migrationMeta();if(!meta)return legacyDetail?.(kind,id);
  let x=null,body='';
  if(kind==='record'){return window.openHrDocument(id)}
  if(kind==='medication')x=(MEDICATIONS[profileKey()]||[]).find(a=>a.id===id);
  if(kind==='device')x=(DEVICES[profileKey()]||[]).find(a=>a.id===id);
  if(kind==='measurement')x=await getOne('measurements',id);
  if(kind==='appointment')x=await getOne('appointments',id);
  if(!x)return;
  if(kind==='medication')body=`<h2>${esc(x.name)}</h2><div class="hrDetailMeta">Státusz: ${esc(x.status||'')}</div><h4>Rögzített adagolás</h4><p>${esc(x.dose||'')}</p><p class="privacyNote">A migrált forrásadat nem helyettesíti az aktuális gyógyszerelési utasítást.</p>`;
  if(kind==='device')body=`<h2>${esc(x.name)}</h2><div class="hrDetailMeta">${esc(x.type||'')}</div><p>Beültetés / rögzítés: <b>${esc(fmtDate(x.implantedAt)||'—')}</b></p><p>Státusz: ${esc(x.status||'—')}</p>`;
  if(kind==='measurement'){
    const stats=[];if(x.systolic!=null&&x.diastolic!=null)stats.push(['Vérnyomás',`${x.systolic}/${x.diastolic} Hgmm`]);if(x.pulse!=null)stats.push(['Pulzus',`${x.pulse}/perc`]);if(x.weightKg!=null)stats.push(['Testsúly',`${x.weightKg} kg`]);if(x.bloodGlucose!=null)stats.push(['Vércukor',`${x.bloodGlucose} mmol/L`]);if(x.oxygenSaturation!=null)stats.push(['SpO₂',`${x.oxygenSaturation}%`]);
    body=`<h2>${esc(measurementTitle(x))}</h2><div class="hrDetailMeta">${esc(fmtDate(x.measuredAt))}</div><div class="hrStatGrid">${stats.map(([a,b])=>`<div class="hrStat"><small>${esc(a)}</small><b>${esc(b)}</b></div>`).join('')}</div>${x.notes?`<h4>Megjegyzés</h4><p>${esc(x.notes)}</p>`:''}`;
  }
  if(kind==='appointment')body=`<h2>${esc(x.title)}</h2><div class="hrDetailMeta">${esc(fmtDate(x.appointmentDate))} · ${esc(x.startTime||'')}</div><p>${esc(x.location||'')}</p>${x.notes?`<p>${esc(x.notes)}</p>`:''}`;
  const d=document.getElementById('hrDetailContent'),o=document.getElementById('hrDetailOverlay');if(d)d.innerHTML=body;if(o)o.classList.add('on');
};

function tarHeader(name,size){
  const enc=new TextEncoder(),h=new Uint8Array(512);const wr=(off,len,s)=>h.set(enc.encode(s).subarray(0,len),off);const oct=(v,w)=>v.toString(8).padStart(w-1,'0')+'\0';
  wr(0,100,name.slice(0,100));wr(100,8,'0000644\0');wr(108,8,'0000000\0');wr(116,8,'0000000\0');wr(124,12,oct(size,12));wr(136,12,oct(Math.floor(Date.now()/1000),12));for(let i=148;i<156;i++)h[i]=32;h[156]=48;wr(257,6,'ustar\0');wr(263,2,'00');let sum=0;for(const b of h)sum+=b;wr(148,8,sum.toString(8).padStart(6,'0')+'\0 ');return h;
}
window.exportHealthVault=async function(){
  const meta=await migrationMeta();if(!meta)return legacyExport?.();
  try{
    const [documents,profiles,measurements,appointments,blobRows]=await Promise.all([getAll('documents'),getAll('profiles'),getAll('measurements'),getAll('appointments'),getAll('documentBlobs')]);
    const parts=[];const add=(name,blob)=>{parts.push(tarHeader(name,blob.size),blob);const pad=(512-(blob.size%512))%512;if(pad)parts.push(new Uint8Array(pad))};const addJson=(n,o)=>add(n,new Blob([JSON.stringify(o,null,2)],{type:'application/json'}));
    addJson('data/documents.json',{documents,stats:{total:documents.length,zsolt:documents.filter(x=>x.profile==='zsolt').length,monika:documents.filter(x=>x.profile==='monika').length}});addJson('data/health-profiles.json',{profiles});addJson('data/measurements.json',{measurements});addJson('data/appointments.json',{appointments});addJson('manifest.json',{exporter:'HealthHub HealthRadar local backup',exportedAt:new Date().toISOString(),counts:{documents:documents.length,measurements:measurements.length,profiles:profiles.length,appointments:appointments.length}});
    const bm=new Map(blobRows.map(x=>[x.id,x.blob]));for(const d of documents){const b=bm.get(d.id);if(b)add(`documents/${d.profile}/${d.category||'general'}/${d.id}.pdf`,b)}parts.push(new Uint8Array(1024));
    const out=new Blob(parts,{type:'application/x-tar'}),a=document.createElement('a');a.href=URL.createObjectURL(out);a.download='HealthHub_HealthRadar_FULL_Backup.tar';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);toastMsg('Teljes HealthRadar mentés elkészült');
  }catch(e){console.error(e);toastMsg('Mentési hiba: '+(e?.message||e))}
};

function bindInput(){const i=document.getElementById('healthVaultFile');if(i){i.accept='.tar,application/x-tar,.json,application/json';i.onchange=window.importHealthVault;}}
bindInput();setTimeout(bindInput,500);

document.documentElement.dataset.healthhubDataBuild='1.26-full-migration';
window.HH_LIVE_BUILD='v1.26-data';
})();