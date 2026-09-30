(function(){
'use strict';

/* HealthRadar parity patch 1:
   - reads the migrated IndexedDB data on the Home/HealthRadar dashboard
   - adds one-tap profile switching with the existing profile picture
   No HealthHub layout redesign. */
const DB_NAME='healthhub-healthradar-v2';

function profileKey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function profileCode(){return profileKey()==='monika'?'m':'z'}
function displayName(){return profileKey()==='monika'?'Mónika':'Zsolt'}
function otherName(){return profileKey()==='monika'?'Zsolt':'Mónika'}

function openDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
function reqP(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function getMeta(){
  try{const db=await openDb();const x=await reqP(db.transaction('meta','readonly').objectStore('meta').get('full-migration'));db.close();return x||null}catch(_){return null}
}
async function getByProfile(store,p){
  try{const db=await openDb();const s=db.transaction(store,'readonly').objectStore(store);let out;
    if(s.indexNames.contains('profile')) out=await reqP(s.index('profile').getAll(p));
    else out=(await reqP(s.getAll())).filter(x=>x.profile===p);
    db.close();return out||[];
  }catch(_){return []}
}
function parseTime(x){
  const d=x?.appointmentDate||x?.date||'';const t=x?.startTime||'00:00';
  const n=Date.parse(d+(d.includes('T')?'':('T'+t+':00')));
  return Number.isFinite(n)?n:Infinity;
}
function fmtDate(x){
  const d=x?.appointmentDate||x?.date||'';if(!d)return 'Időpont';
  const dt=new Date(d+'T00:00:00');if(Number.isNaN(dt.getTime()))return d;
  return new Intl.DateTimeFormat('hu-HU',{month:'short',day:'numeric'}).format(dt);
}
function medCount(){return profileKey()==='monika'?6:1}

async function syncFullMigrationDashboard(){
  const meta=await getMeta();if(!meta)return;
  const p=profileKey();
  const [docs,meas,apps]=await Promise.all([
    getByProfile('documents',p),
    getByProfile('measurements',p),
    getByProfile('appointments',p)
  ]);

  const today=document.getElementById('todayInsight');
  if(today)today.textContent=`A HealthRadar karton elérhető: ${docs.length} lelet és ${meas.length} mérés.`;

  const insight=document.getElementById('insightH');
  if(insight)insight.textContent=`${docs.length} lelet, ${medCount()} aktuális gyógyszer és ${meas.length} mérés érhető el a privát kartonban.`;

  const future=apps.filter(a=>parseTime(a)>=Date.now()-60000).sort((a,b)=>parseTime(a)-parseTime(b));
  const a=future[0]||null;
  const next=document.getElementById('nextH'),nextSub=document.getElementById('nextSub');
  if(next)next.textContent=a?fmtDate(a):'Nincs betervezett';
  if(nextSub)nextSub.textContent=a?(a.title||'orvosi időpont'):'időpont';
  const hn=document.getElementById('homeNext'),hs=document.getElementById('homeNextSub');
  if(hn)hn.textContent=a?fmtDate(a):'Nincs betervezett';
  if(hs)hs.textContent=a?(a.title||'orvosi időpont'):'következő időpont';

  const latestBP=meas.filter(x=>x.systolic!=null&&x.diastolic!=null).sort((a,b)=>String(b.measuredAt||'').localeCompare(String(a.measuredAt||'')))[0];
  const bp=document.getElementById('bpH');
  if(bp&&latestBP)bp.textContent=`${latestBP.systolic}/${latestBP.diastolic}`;

  const latestGlucose=meas.filter(x=>x.bloodGlucose!=null).sort((a,b)=>String(b.measuredAt||'').localeCompare(String(a.measuredAt||'')))[0];
  const latestWeight=meas.filter(x=>x.weightKg!=null).sort((a,b)=>String(b.measuredAt||'').localeCompare(String(a.measuredAt||'')))[0];
  const k2=document.getElementById('k2'),k2lab=document.getElementById('k2lab'),k2unit=document.getElementById('k2unit');
  if(k2){
    if(latestGlucose){if(k2lab)k2lab.textContent='💧 Vércukor';k2.textContent=latestGlucose.bloodGlucose;if(k2unit)k2unit.textContent='mmol/L';}
    else if(latestWeight){if(k2lab)k2lab.textContent='⚖ Testsúly';k2.textContent=latestWeight.weightKg;if(k2unit)k2unit.textContent='kg';}
  }
}

function currentAvatarSrc(){
  const a=document.getElementById('personHome')||document.getElementById('personH');
  return a?.currentSrc||a?.src||'';
}
function fillSwitchButton(btn){
  const src=currentAvatarSrc(),name=displayName(),target=otherName();
  btn.title=`Profilváltás: ${target}`;
  btn.setAttribute('aria-label',`${name} profil. Kattintásra váltás ${target} profiljára.`);
  btn.innerHTML='';
  if(src){
    const img=document.createElement('img');
    img.src=src;img.alt=name;
    Object.assign(img.style,{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%',display:'block'});
    btn.appendChild(img);
  }else{
    btn.textContent=name.charAt(0);
    btn.style.fontWeight='900';
  }
}
function toggleProfile(){
  const next=profileCode()==='m'?'z':'m';
  if(typeof window.setProfile==='function')window.setProfile(next);
  else localStorage.setItem('hh-profile',next);
  setTimeout(()=>{ensureProfileSwitches();syncFullMigrationDashboard();if(typeof window.renderHealthSection==='function'&&document.getElementById('healthSection')?.classList.contains('on'))window.renderHealthSection();},80);
}
function ensureProfileSwitches(){
  const hero=document.querySelector('#heroH .heroBtns');
  if(hero&&!hero.querySelector('.hhHealthProfileSwitch')){
    const b=document.createElement('button');
    b.type='button';b.className='round hhHealthProfileSwitch';
    Object.assign(b.style,{padding:'2px',overflow:'hidden',borderRadius:'50%'});
    b.onclick=toggleProfile;
    hero.prepend(b);
  }
  const hb=document.querySelector('#heroH .hhHealthProfileSwitch');if(hb)fillSwitchButton(hb);

  const sub=document.querySelector('#healthSection .healthSubHero');
  if(sub&&!sub.querySelector('.hhHealthSubProfileSwitch')){
    const b=document.createElement('button');
    b.type='button';b.className='round hhHealthSubProfileSwitch';
    Object.assign(b.style,{position:'absolute',right:'55px',top:'18px',padding:'2px',overflow:'hidden',borderRadius:'50%',zIndex:'8',background:'rgba(255,255,255,.86)',border:'1px solid rgba(23,63,97,.14)',boxShadow:'0 4px 12px rgba(31,65,91,.10)'});
    b.onclick=toggleProfile;
    sub.appendChild(b);
  }
  const sb=document.querySelector('#healthSection .hhHealthSubProfileSwitch');if(sb)fillSwitchButton(sb);
}

const prevSet=window.setProfile;
if(typeof prevSet==='function'){
  window.setProfile=function(p){
    const r=prevSet.apply(this,arguments);
    setTimeout(()=>{ensureProfileSwitches();syncFullMigrationDashboard();},60);
    return r;
  };
}
const prevShow=window.show;
if(typeof prevShow==='function'){
  window.show=function(id){
    const r=prevShow.apply(this,arguments);
    setTimeout(()=>{if(id==='health'||id==='healthSection')ensureProfileSwitches();syncFullMigrationDashboard();},40);
    return r;
  };
}
const prevRender=window.renderHealthSection;
if(typeof prevRender==='function'){
  window.renderHealthSection=async function(){
    const r=await prevRender.apply(this,arguments);
    ensureProfileSwitches();
    return r;
  };
}

window.hhSyncFullMigrationDashboard=syncFullMigrationDashboard;
window.hhEnsureHealthProfileSwitches=ensureProfileSwitches;

ensureProfileSwitches();
syncFullMigrationDashboard();
setTimeout(()=>{ensureProfileSwitches();syncFullMigrationDashboard();},400);
setTimeout(()=>{ensureProfileSwitches();syncFullMigrationDashboard();},1400);

document.documentElement.dataset.healthhubParityBuild='1.27';
window.HH_LIVE_BUILD='v1.27-parity1';
})();