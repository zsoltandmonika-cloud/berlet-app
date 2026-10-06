(function(){
'use strict';
/* HealthHub v265 — authoritative HealthRadar main landing data.
   Keeps the original DOM/IDs intact so the legacy apply() function cannot break.
   Personal data is read profile-by-profile from IndexedDB / Health Connect cache. */

var HRDB='healthhub-healthradar-v2';
var HCDB='healthhub-connect-v1';
var LEGACY='hh-health-vault-v1';
var seq=0, writing=false, ignoreMutationsUntil=0, observerTimer=0;

function pkey(p){
  if(p==='m'||p==='monika')return 'monika';
  if(p==='z'||p==='zsolt')return 'zsolt';
  return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
}
function pname(p){return pkey(p)==='monika'?'Mónika':'Zsolt'}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openDb(name,version){return new Promise(function(ok,no){var r=indexedDB.open(name,version);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function byProfile(store,profile){
  var db=await openDb(HRDB,1);
  try{
    if(!db.objectStoreNames.contains(store))return [];
    var s=db.transaction(store,'readonly').objectStore(store);
    if(s.indexNames.contains('profile'))return await reqP(s.index('profile').getAll(profile))||[];
    return (await reqP(s.getAll())||[]).filter(function(x){return x&&x.profile===profile});
  }finally{db.close()}
}
async function activityRows(profile){
  try{
    var db=await openDb(HCDB,2);
    try{
      if(!db.objectStoreNames.contains('activity'))return [];
      var a=await reqP(db.transaction('activity','readonly').objectStore('activity').getAll())||[];
      return a.filter(function(x){return x&&x.profile===profile});
    }finally{db.close()}
  }catch(e){return []}
}
function medicationRows(profile){
  try{
    var v=JSON.parse(localStorage.getItem(LEGACY)||'null');
    var p=v&&v.profiles&&v.profiles[profile];
    if(p&&Array.isArray(p.medications))return p.medications;
    if(p&&p.profileData&&Array.isArray(p.profileData.medications))return p.profileData.medications;
  }catch(e){}
  return [];
}
function timeOf(x){
  var s=x&&(x.measuredAt||x.documentDate||x.appointmentDate||x.uploadedAt||x.date||x.updatedAt)||'';
  var n=Date.parse(s);return Number.isFinite(n)?n:0;
}
function fmtDate(s){
  if(!s)return '';
  var d=new Date(s);if(!Number.isFinite(d.getTime()))return String(s);
  return d.toLocaleDateString('hu-HU',{month:'short',day:'numeric'});
}
function latest(a,fn){
  return (a||[]).filter(fn).sort(function(x,y){return timeOf(y)-timeOf(x)})[0]||null;
}
function setText(id,value){
  var e=document.getElementById(id);if(e)e.textContent=value==null?'—':String(value);
}
function setRow(id,title,sub,visible){
  var b=document.getElementById(id);
  if(!b)return;
  var row=b.closest('.row');
  b.textContent=title||'—';
  var s=b.parentElement&&b.parentElement.querySelector('small');
  if(s)s.textContent=sub||'';
  if(row)row.style.display=visible===false?'none':'';
}
function setKpi(index,label,value,unit,status,hasData){
  var card=document.querySelector('#health .kpis .kpi:nth-child('+index+')');
  if(!card)return;
  var lab=card.querySelector('.lab'),val=card.querySelector('.val'),u=card.querySelector('.unit'),ok=card.querySelector('.ok');
  if(lab)lab.textContent=label;
  if(val)val.textContent=value==null?'—':String(value);
  if(u)u.textContent=unit||'';
  if(ok)ok.textContent=status||'';
  card.querySelectorAll('.spark,.bars').forEach(function(x){x.style.opacity=hasData?'.58':'.14'});
  card.onclick=function(){if(typeof window.openHealthSection==='function')window.openHealthSection('measurements')};
}
function appointmentTime(a){
  var d=a&&(a.appointmentDate||a.date)||'';
  if(!d)return Infinity;
  var s=String(d);
  if(s.indexOf('T')<0)s+='T'+String(a.startTime||'00:00')+':00';
  var n=Date.parse(s);return Number.isFinite(n)?n:Infinity;
}

async function render(profileOverride){
  var my=++seq,profile=pkey(profileOverride);
  if(typeof window.hhEnsureHealthProfile==='function'){
    try{await window.hhEnsureHealthProfile(profile)}catch(e){}
  }
  var all=await Promise.all([
    byProfile('documents',profile),
    byProfile('measurements',profile),
    byProfile('appointments',profile),
    activityRows(profile)
  ]);
  if(my!==seq||pkey()!==profile)return false;

  var docs=all[0]||[], meas=all[1]||[], apps=all[2]||[], activity=all[3]||[];
  var meds=medicationRows(profile);
  docs.sort(function(a,b){return timeOf(b)-timeOf(a)});
  meas.sort(function(a,b){return timeOf(b)-timeOf(a)});
  activity.sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''))});

  var bp=latest(meas,function(x){return x.systolic!=null&&x.diastolic!=null});
  var glucose=latest(meas,function(x){return x.bloodGlucose!=null});
  var weight=latest(meas,function(x){return x.weightKg!=null});
  var act=activity[0]||null;

  writing=true;
  ignoreMutationsUntil=Date.now()+140;
  try{
    setKpi(1,'❤ Vérnyomás',bp?(Math.round(Number(bp.systolic))+'/'+Math.round(Number(bp.diastolic))):'—','mmHg',bp?('Utolsó: '+fmtDate(bp.measuredAt)):'Nincs importált adat',!!bp);

    if(glucose){
      setKpi(2,'💧 Vércukor',glucose.bloodGlucose,'mmol/L','Utolsó: '+fmtDate(glucose.measuredAt),true);
    }else if(weight){
      setKpi(2,'⚖ Testsúly',weight.weightKg,'kg','Utolsó: '+fmtDate(weight.measuredAt),true);
    }else{
      setKpi(2,'💧 Vércukor','—','mmol/L','Nincs importált adat',false);
    }

    setKpi(3,'🏃 Aktivitás',act&&act.steps!=null?Number(act.steps).toLocaleString('hu-HU'):'—','lépés/nap',act&&act.date?('Utolsó: '+fmtDate(act.date)):'Nincs Health Connect aktivitás',!!act);

    for(var i=0;i<3;i++){
      var d=docs[i];
      setRow('doc'+(i+1),d?(d.originalName||d.title||'Lelet'):'',d?[fmtDate(d.documentDate||d.uploadedAt),d.category].filter(Boolean).join(' · '):'',!!d);
    }

    /* Keep the base page profile-specific fallback medication names when the
       migrated/private cart has no medication array. */
    if(meds.length){
      for(var j=0;j<3;j++){
        var m=meds[j];
        setRow('med'+(j+1),m?(m.name||'Gyógyszer'):'',m?(m.dose||m.schedule||m.status||''):'',!!m);
      }
    }else{
      for(var k=1;k<=3;k++){
        var mb=document.getElementById('med'+k);
        if(mb&&mb.closest('.row'))mb.closest('.row').style.display='';
      }
    }

    var insight=document.getElementById('insightH');
    if(insight)insight.textContent=pname(profile)+' kartonja: '+docs.length+' lelet · '+meas.length+' mérés'+(meds.length?' · '+meds.length+' gyógyszer':'')+'.';

    var future=apps.filter(function(x){return appointmentTime(x)>=Date.now()-60000}).sort(function(a,b){return appointmentTime(a)-appointmentTime(b)});
    var ap=future[0]||null;
    setText('nextH',ap?fmtDate(ap.appointmentDate||ap.date):'Nincs betervezett');
    setText('nextSub',ap?(ap.title||'orvosi időpont'):'időpont');

    var head=document.querySelector('#health .kpiCard .cardHead small');
    if(head)head.textContent=pname(profile)+' · profiladatok';

    document.documentElement.dataset.hhHealthLandingProfile=profile;
    document.documentElement.dataset.hhHealthLandingData='v265';
  }finally{
    writing=false;
  }
  return true;
}

function schedule(profile){
  var p=pkey(profile);
  [0,60,180,420,900].forEach(function(ms){setTimeout(function(){render(p)},ms)});
}
window.hhSyncHealthDashboard=render;
window.hhSyncHealthLanding265=render;

window.addEventListener('healthhub:profile-changed',function(e){
  schedule(e&&e.detail&&e.detail.profile);
});
window.addEventListener('healthhub:health-cloud-synced',function(e){
  var p=e&&e.detail&&e.detail.profile;
  if(p&&p!==pkey())return;
  schedule(pkey());
});

var oldShow=window.show;
if(typeof oldShow==='function'){
  window.show=function(id){
    var r=oldShow.apply(this,arguments);
    if(id==='health')schedule(pkey());
    return r;
  };
}

/* Legacy apply() still writes demo values into these same IDs. If an older
   delayed wrapper touches the visible HealthRadar page, repaint from the
   canonical profile data once it has finished. */
var surface=document.querySelector('#health .surface');
if(surface&&window.MutationObserver){
  var mo=new MutationObserver(function(){
    if(writing||Date.now()<ignoreMutationsUntil)return;
    if(!document.getElementById('health')||!document.getElementById('health').classList.contains('on'))return;
    clearTimeout(observerTimer);
    observerTimer=setTimeout(function(){render(pkey())},45);
  });
  mo.observe(surface,{subtree:true,childList:true,characterData:true});
}

schedule(pkey());
document.documentElement.dataset.healthhubHealthLandingCanonical='1.265';
window.HH_LIVE_BUILD='v265-health-landing-authoritative';
})();