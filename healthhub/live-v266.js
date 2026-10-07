(function(){
'use strict';
/* HealthHub v266 — HealthRadar landing profile-data lock.
   Uses the same getAll()+profile-filter pattern as the proven Records module.
   It also survives legacy apply() failures and late demo-data repaints. */

var DB='healthhub-healthradar-v2';
var HC='healthhub-connect-v1';
var renderSeq=0, painting=false, ignoreUntil=0, lastProfile='';

function pkey(p){
  if(p==='m'||p==='monika')return 'monika';
  if(p==='z'||p==='zsolt')return 'zsolt';
  return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
}
function pname(p){return pkey(p)==='monika'?'Mónika':'Zsolt'}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openDb(name,ver){
  return new Promise(function(ok,no){
    var r=indexedDB.open(name,ver);
    r.onsuccess=function(){ok(r.result)};
    r.onerror=function(){no(r.error)};
  });
}
async function all(store){
  var db=await openDb(DB,1);
  try{
    if(!db.objectStoreNames.contains(store))return [];
    return await reqP(db.transaction(store,'readonly').objectStore(store).getAll())||[];
  }finally{db.close()}
}
async function allHealthConnect(store){
  try{
    var db=await openDb(HC,2);
    try{
      if(!db.objectStoreNames.contains(store))return [];
      return await reqP(db.transaction(store,'readonly').objectStore(store).getAll())||[];
    }finally{db.close()}
  }catch(e){return []}
}
async function privateMedicationRows(profile){
  try{
    var rows=await all('meta');
    var x=rows.find(function(v){return v&&v.key==='private-reference'});
    var a=x&&x.payload&&x.payload.profiles&&x.payload.profiles[profile]&&x.payload.profiles[profile].medications;
    if(Array.isArray(a)&&a.length)return a;
  }catch(e){}
  try{
    var v=JSON.parse(localStorage.getItem('hh-health-vault-v1')||'null');
    var p=v&&v.profiles&&v.profiles[profile];
    var a2=p&&Array.isArray(p.medications)?p.medications:(p&&p.profileData&&Array.isArray(p.profileData.medications)?p.profileData.medications:[]);
    return Array.isArray(a2)?a2:[];
  }catch(e){return []}
}
function when(x){
  var s=x&&(x.measuredAt||x.documentDate||x.appointmentDate||x.uploadedAt||x.date||x.updatedAt)||'';
  var n=Date.parse(s);return Number.isFinite(n)?n:0;
}
function fmtDate(s){
  if(!s)return '';
  var d=new Date(s);if(!Number.isFinite(d.getTime()))return String(s);
  return d.toLocaleDateString('hu-HU',{month:'short',day:'numeric'});
}
function latest(a,fn){
  return (a||[]).filter(fn).sort(function(x,y){return when(y)-when(x)})[0]||null;
}
function setText(id,v){
  var e=document.getElementById(id);if(e)e.textContent=v==null?'—':String(v);
}
function setRow(id,item,type){
  var b=document.getElementById(id);if(!b)return;
  var row=b.closest('.row'),small=b.parentElement&&b.parentElement.querySelector('small');
  if(!item){if(row)row.style.display='none';return}
  if(row)row.style.display='';
  if(type==='doc'){
    b.textContent=item.originalName||item.title||'Lelet';
    if(small)small.textContent=[fmtDate(item.documentDate||item.uploadedAt),item.category].filter(Boolean).join(' · ');
  }else{
    b.textContent=item.name||'Gyógyszer';
    if(small)small.textContent=item.dose||item.schedule||item.status||'';
  }
}
function setKpi(index,label,value,unit,status,has){
  var c=document.querySelector('#health .kpis .kpi:nth-child('+index+')');if(!c)return;
  var l=c.querySelector('.lab'),v=c.querySelector('.val'),u=c.querySelector('.unit'),o=c.querySelector('.ok');
  if(l)l.textContent=label;if(v)v.textContent=value==null?'—':String(value);if(u)u.textContent=unit||'';if(o)o.textContent=status||'';
  c.querySelectorAll('.spark,.bars').forEach(function(x){x.style.opacity=has?'.58':'.14'});
}
function apTime(a){
  var d=a&&(a.appointmentDate||a.date)||'';if(!d)return Infinity;
  var s=String(d);if(s.indexOf('T')<0)s+='T'+String(a.startTime||'00:00')+':00';
  var n=Date.parse(s);return Number.isFinite(n)?n:Infinity;
}

async function paint(profileOverride){
  var profile=pkey(profileOverride),my=++renderSeq;
  try{
    if(typeof window.hhEnsureHealthProfile==='function')await window.hhEnsureHealthProfile(profile);
  }catch(e){}

  var rs=await Promise.allSettled([
    all('documents'),
    all('measurements'),
    all('appointments'),
    privateMedicationRows(profile),
    allHealthConnect('activity')
  ]);
  if(my!==renderSeq||pkey()!==profile)return false;

  var docs=rs[0].status==='fulfilled'?rs[0].value.filter(function(x){return x&&x.profile===profile}):[];
  var meas=rs[1].status==='fulfilled'?rs[1].value.filter(function(x){return x&&x.profile===profile}):[];
  var apps=rs[2].status==='fulfilled'?rs[2].value.filter(function(x){return x&&x.profile===profile}):[];
  var meds=rs[3].status==='fulfilled'?rs[3].value:[];
  var act=rs[4].status==='fulfilled'?rs[4].value.filter(function(x){return x&&x.profile===profile}):[];

  docs.sort(function(a,b){return when(b)-when(a)});
  meas.sort(function(a,b){return when(b)-when(a)});
  act.sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''))});

  var bp=latest(meas,function(x){return x.systolic!=null&&x.diastolic!=null});
  var gl=latest(meas,function(x){return x.bloodGlucose!=null});
  var wt=latest(meas,function(x){return x.weightKg!=null});
  var activity=act[0]||null;

  painting=true;ignoreUntil=Date.now()+180;
  try{
    setKpi(1,'❤ Vérnyomás',bp?(Math.round(Number(bp.systolic))+'/'+Math.round(Number(bp.diastolic))):'—','mmHg',bp?('Utolsó: '+fmtDate(bp.measuredAt)):'Nincs importált adat',!!bp);

    if(gl)setKpi(2,'💧 Vércukor',gl.bloodGlucose,'mmol/L','Utolsó: '+fmtDate(gl.measuredAt),true);
    else if(wt)setKpi(2,'⚖ Testsúly',wt.weightKg,'kg','Utolsó: '+fmtDate(wt.measuredAt),true);
    else setKpi(2,'💧 Vércukor','—','mmol/L','Nincs importált adat',false);

    setKpi(3,'🏃 Aktivitás',activity&&activity.steps!=null?Number(activity.steps).toLocaleString('hu-HU'):'—','lépés/nap',activity&&activity.date?('Utolsó: '+fmtDate(activity.date)):'Nincs Health Connect aktivitás',!!activity);

    for(var i=0;i<3;i++)setRow('doc'+(i+1),docs[i],'doc');
    if(meds.length){
      for(var j=0;j<3;j++)setRow('med'+(j+1),meds[j],'med');
    }

    var ins=document.getElementById('insightH');
    if(ins)ins.textContent=pname(profile)+' kartonja: '+docs.length+' lelet · '+meas.length+' mérés'+(meds.length?' · '+meds.length+' gyógyszer':'')+'.';

    var future=apps.filter(function(x){return apTime(x)>=Date.now()-60000}).sort(function(a,b){return apTime(a)-apTime(b)});
    var ap=future[0]||null;
    setText('nextH',ap?fmtDate(ap.appointmentDate||ap.date):'Nincs betervezett');
    setText('nextSub',ap?(ap.title||'orvosi időpont'):'időpont');

    var head=document.querySelector('#health .kpiCard .cardHead small');
    if(head)head.textContent=pname(profile)+' · '+docs.length+' lelet · '+meas.length+' mérés';

    document.documentElement.dataset.hhHealthLandingProfile=profile;
    document.documentElement.dataset.hhHealthLandingData='v266';
    lastProfile=profile;
  }finally{painting=false}
  return true;
}

var repaintFrame=0,repaintLate=0,pendingProfile='';
function repaint(profile){
  pendingProfile=pkey(profile);
  if(!repaintFrame){
    repaintFrame=requestAnimationFrame(function(){
      repaintFrame=0;
      paint(pendingProfile);
    });
  }
  clearTimeout(repaintLate);
  repaintLate=setTimeout(function(){paint(pendingProfile)},140);
}

window.hhSyncHealthDashboard=paint;
window.hhSyncHealthLanding266=paint;

/* Make legacy apply non-fatal. It is still allowed to do theme/name work,
   but v266 always restores canonical profile data afterwards. */
try{
  if(typeof window.apply==='function'&&!window.apply.__hh266){
    var oldApply=window.apply;
    var safeApply=function(){
      var r;
      try{r=oldApply.apply(this,arguments)}catch(e){console.warn('HealthHub legacy apply stopped early',e)}
      repaint(pkey());
      return r;
    };
    safeApply.__hh266=true;
    window.apply=safeApply;
  }
}catch(e){}

window.addEventListener('healthhub:profile-changed',function(e){repaint(e&&e.detail&&e.detail.profile)});
window.addEventListener('healthhub:health-cloud-synced',function(e){
  var p=e&&e.detail&&e.detail.profile;if(p&&p!==pkey())return;repaint(pkey());
});

var oldShow=window.show;
if(typeof oldShow==='function'){
  window.show=function(id){
    var r=oldShow.apply(this,arguments);
    if(id==='health')repaint(pkey());
    return r;
  };
}

/* Catch late writes from legacy modules, but do not create a render loop. */
var surface=document.querySelector('#health .surface');
if(surface&&window.MutationObserver){
  var timer=0;
  var mo=new MutationObserver(function(){
    if(painting||Date.now()<ignoreUntil)return;
    var page=document.getElementById('health');
    if(!page||!page.classList.contains('on'))return;
    clearTimeout(timer);timer=setTimeout(function(){paint(pkey())},55);
  });
  mo.observe(surface,{subtree:true,childList:true,characterData:true});
}

/* Profile changes are event-driven; no 350 ms safety polling needed. */
repaint(pkey());
document.documentElement.dataset.healthhubHealthLandingCanonical='1.303';
window.HH_LIVE_BUILD='v303-health-landing-coalesced';
})();