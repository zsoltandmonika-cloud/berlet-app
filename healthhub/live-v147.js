(function(){
'use strict';
const DB='healthhub-healthradar-v2';let pending=null,busy=false,selection=0;
const profile=()=>localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
const name=p=>p==='monika'?'Mónika':'Zsolt';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const req=r=>new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const done=t=>new Promise((ok,no)=>{t.oncomplete=ok;t.onerror=()=>no(t.error);t.onabort=()=>no(t.error||Error('Az import megszakadt.'))});
function open(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function read(){const db=await open();try{return await req(db.transaction('measurements').objectStore('measurements').getAll())}finally{db.close()}}
function status(text){document.getElementById('hhHcStatus').textContent=text}
function ui(){
 if(document.getElementById('hhHcDialog'))return;
 const style=document.createElement('style');style.textContent='#hhHcDialog{border:0;border-radius:22px;padding:22px;background:#f4f9fc;color:#183c5d;width:min(90vw,560px);max-height:85vh;overflow:auto}#hhHcDialog::backdrop{background:#08203399}#hhHcDialog button,.hhHcCard button,.hhHcCard a{display:inline-block;border:1px solid #bddbdc;border-radius:12px;background:#edf8f6;color:#1d6768;padding:12px;margin:5px 5px 5px 0;font-size:14px;cursor:pointer}#hhHcDialog p,.hhHcCard p{font-size:14px;line-height:1.5}#hhHcStatus{white-space:pre-wrap}.hhHcCard{background:white;border:1px solid #dbe8ed;border-radius:18px;padding:16px;margin-bottom:14px}.hhHcCard h3{margin:0 0 8px}';document.head.appendChild(style);
 const dialog=document.createElement('dialog');dialog.id='hhHcDialog';dialog.innerHTML='<h2>Health Connect import</h2><p id="hhHcStatus"></p><div id="hhHcPreview"></div><button id="hhHcPick">Fájl kiválasztása</button><button id="hhHcCommit" hidden>Import megerősítése</button><button id="hhHcClose">Bezárás</button>';
 document.body.appendChild(dialog);
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;document.body.appendChild(input);
 document.getElementById('hhHcPick').onclick=()=>input.click();
 document.getElementById('hhHcClose').onclick=()=>{if(!busy){selection++;pending=null;dialog.close()}};
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();else {selection++;pending=null}});
 document.getElementById('hhHcCommit').onclick=commit;
 input.onchange=async()=>{
  const current=++selection;const file=input.files[0];input.value='';pending=null;document.getElementById('hhHcCommit').hidden=true;
  document.getElementById('hhHcPreview').textContent='';if(!file)return;
  const target=profile();
  try {
   if(file.size>32*1024*1024)throw Error('A fájl nagyobb 32 MB-nál. Exportálj rövidebb időszakot.');
   status('Fájl ellenőrzése…');
   const parsed=HHConnectCore.parse(JSON.parse(await file.text()),target);
   if(target!==profile())throw Error('Közben megváltozott a profil. Válaszd ki újra a fájlt.');
   const existing=await read();if(current!==selection)return;
   if(target!==profile())throw Error('Közben megváltozott a profil. Válaszd ki újra a fájlt.');
   const changes=HHConnectCore.plan(parsed.rows,existing);pending=parsed;
   status('Célprofil: '+name(target)+'\nÚj: '+changes.add.length+' · Frissül: '+changes.update.length+' · Ismétlődő: '+changes.duplicate+' · Régebbi: '+changes.stale);
   document.getElementById('hhHcPreview').innerHTML='<p>Az import helyben történik. A forrásból törölt mérések itt megmaradnak. A lépések napi összesítések.</p>'+parsed.warnings.map(s=>'<p>'+esc(s)+'</p>').join('');
   document.getElementById('hhHcCommit').hidden=!(changes.add.length+changes.update.length);
  }catch(e){if(current!==selection)return;pending=null;status(e.message||'A fájl nem olvasható.');}
 };
}
async function commit(){
 if(busy||!pending)return;
 if(profile()!==pending.profile){status('A profil megváltozott. Nyisd meg újra az importot.');pending=null;document.getElementById('hhHcCommit').hidden=true;return;}
 busy=true;const batch=pending;const controls=[...document.querySelectorAll('#hhHcDialog button')];controls.forEach(x=>x.disabled=true);
 let db;
 try{
  db=await open();
  // One transaction reads current state, saves rollback rows, writes measurements and metadata.
  const tx=db.transaction(['measurements','meta'],'readwrite'),completion=done(tx),store=tx.objectStore('measurements');
  let changes;
  const all=store.getAll();all.onsuccess=()=>{
   try{
    changes=HHConnectCore.plan(batch.rows,all.result);
    const old=new Map(all.result.map(r=>[r.id,r]));
    const backup={key:'hc-rollback-'+batch.profile,createdAt:new Date().toISOString(),profile:batch.profile,addedIds:changes.add.map(r=>r.id),previous:changes.update.map(r=>old.get(r.id))};
    tx.objectStore('meta').put(backup);
    [...changes.add,...changes.update].forEach(r=>store.put(r));
    tx.objectStore('meta').put({key:'health-connect-'+batch.profile,importedAt:new Date().toISOString(),exportedAt:batch.exportedAt,added:changes.add.length,updated:changes.update.length});
    const meta=tx.objectStore('meta').get('full-migration');meta.onsuccess=()=>{if(meta.result){const m=meta.result;m.counts={...m.counts,measurements:all.result.length+changes.add.length};tx.objectStore('meta').put(m)}};
   }catch(e){tx.abort();}
  };
  await completion;
  pending=null;document.getElementById('hhHcCommit').hidden=true;
  status('Sikeres import: '+changes.add.length+' új, '+changes.update.length+' frissített rekord · '+name(batch.profile)+'.');
  await window.renderHealthSection?.();window.hhSyncFullMigrationDashboard?.();
 }catch(e){status('Az import nem sikerült: '+(e.message||e));}
 finally{db?.close();busy=false;controls.forEach(x=>x.disabled=false)}
}
window.hhOpenHealthConnect=function(){if(busy)return;selection++;ui();pending=null;document.getElementById('hhHcCommit').hidden=true;document.getElementById('hhHcPreview').textContent='';status('Célprofil: '+name(profile())+'. Válaszd ki a HealthHub Connector által mentett JSON-fájlt.');document.getElementById('hhHcDialog').showModal()};
async function decorate(){
 if(!['devices','measurements','more'].includes(window.healthSectionKind))return;
 const root=document.getElementById('healthSubContent');if(!root||root.querySelector('.hhHcCard'))return;
 const card=document.createElement('section');card.className='hhHcCard';card.innerHTML='<h3>♥ Health Connect</h3><p>Vérnyomás, pulzus, testsúly, vércukor, véroxigén és napi lépések. Helyi fájlátadás; nincs automatikus szinkron.</p><button type="button">Health Connect fájl importálása</button><a href="./connect/" target="_blank" rel="noopener">Connector letöltése és útmutató</a>';
 card.querySelector('button').onclick=window.hhOpenHealthConnect;root.prepend(card);
}
const prev=window.renderHealthSection;if(prev)window.renderHealthSection=async function(){const result=await prev.apply(this,arguments);await decorate();return result};
ui();decorate();document.documentElement.dataset.healthhubConnector='0.1.0';
})();
