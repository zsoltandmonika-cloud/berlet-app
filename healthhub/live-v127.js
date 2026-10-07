(function(){
'use strict';

/* HealthRadar parity patch 1:
   - reads the migrated IndexedDB data on the Home/HealthRadar dashboard
   - adds one-tap profile switching with the existing profile picture
   No HealthHub layout redesign. */
const DB_NAME='healthhub-healthradar-v2';
let dashboardTimer=0;

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
  // Home / Today upcoming appointment is owned by the later appointments module (v1.34+).

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
function scheduleDashboardSync(delay){
  clearTimeout(dashboardTimer);
  dashboardTimer=setTimeout(function(){syncFullMigrationDashboard()},delay==null?120:delay);
}
function switchHealthProfileOneClick(ev){
  if(ev){ev.preventDefault();ev.stopPropagation();}
  const next=profileCode()==='m'?'z':'m';
  if(typeof window.setProfile==='function')window.setProfile(next);
  else localStorage.setItem('hh-profile',next);
  setTimeout(ensureProfileSwitches,40);
}
function bindProfileAction(btn){
  if(!btn||btn.dataset.hhProfileBound==='1')return;
  btn.dataset.hhProfileBound='1';
  btn.addEventListener('click',switchHealthProfileOneClick,{capture:true});
}
function ensureProfileSwitches(){
  const mainHero=document.getElementById('heroH');
  if(mainHero&&!mainHero.querySelector('.hhHealthPortraitHit')){
    const hit=document.createElement('button');
    hit.type='button';
    hit.className='hhHealthPortraitHit';
    Object.assign(hit.style,{position:'absolute',left:'0',top:'0',width:'52%',height:'100%',border:'0',background:'transparent',padding:'0',zIndex:'7',cursor:'pointer'});
    bindProfileAction(hit);
    mainHero.appendChild(hit);
  }
  const mainHit=mainHero&&mainHero.querySelector('.hhHealthPortraitHit');
  if(mainHit){
    bindProfileAction(mainHit);
    mainHit.title='Váltás '+otherName()+' profiljára';
    mainHit.setAttribute('aria-label','Egy kattintás: váltás '+otherName()+' profiljára');
  }

  document.querySelectorAll('#heroH .hhHealthProfileSwitch').forEach(el=>el.remove());

  const sub=document.querySelector('#healthSection .healthSubHero');
  if(sub&&!sub.querySelector('.hhHealthSubPortraitHit')){
    const hit=document.createElement('button');
    hit.type='button';
    hit.className='hhHealthSubPortraitHit';
    Object.assign(hit.style,{position:'absolute',left:'0',top:'0',width:'52%',height:'100%',border:'0',background:'transparent',padding:'0',zIndex:'9',cursor:'pointer'});
    bindProfileAction(hit);
    sub.appendChild(hit);
  }
  const subHit=sub&&sub.querySelector('.hhHealthSubPortraitHit');
  if(subHit){
    bindProfileAction(subHit);
    subHit.title='Váltás '+otherName()+' profiljára';
    subHit.setAttribute('aria-label','Egy kattintás: váltás '+otherName()+' profiljára');
  }

  document.querySelectorAll('#healthSection .hhHealthSubProfileSwitch').forEach(el=>el.remove());
}

const prevSet=window.setProfile;
if(typeof prevSet==='function'){
  window.setProfile=function(p){
    const r=prevSet.apply(this,arguments);
    setTimeout(ensureProfileSwitches,60);
    scheduleDashboardSync(140);
    return r;
  };
}
const prevShow=window.show;
if(typeof prevShow==='function'){
  window.show=function(id){
    const r=prevShow.apply(this,arguments);
    if(id==='health'||id==='healthSection'){
      setTimeout(ensureProfileSwitches,40);
      scheduleDashboardSync(100);
    }else if(id==='home'){
      scheduleDashboardSync(100);
    }
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

window.addEventListener('healthhub:profile-changed',function(){setTimeout(ensureProfileSwitches,40);scheduleDashboardSync(120)});
window.hhSyncFullMigrationDashboard=syncFullMigrationDashboard;
window.hhEnsureHealthProfileSwitches=ensureProfileSwitches;

ensureProfileSwitches();
scheduleDashboardSync(300);

document.documentElement.dataset.healthhubParityBuild='1.220.1';
window.HH_LIVE_BUILD='v1.220-health-one-click-profile';
})();