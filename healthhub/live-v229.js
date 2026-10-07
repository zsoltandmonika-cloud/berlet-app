(function(){
'use strict';

/* HealthHub v1.230 — HealthRadar profile schema repair + cross-device persistence.
   Older HealthRadar imports keep the actual personal fields under
   legacyProfile.profileData. The current editor reads flat IndexedDB fields.
   This bridge flattens that historical schema without discarding either copy. */

var DB='healthhub-healthradar-v2';
var LEGACY_KEY='hh-health-vault-v1';
var repairing={},verified={};

function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function toastMsg(s){try{window.toast&&window.toast(s)}catch(e){}}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openDb(){return new Promise(function(ok,no){
  var r=indexedDB.open(DB,1);
  r.onsuccess=function(){ok(r.result)};
  r.onerror=function(){no(r.error)};
})}
async function dbGet(profile){
  var db=await openDb();
  try{
    if(!db.objectStoreNames.contains('profiles'))return null;
    return await reqP(db.transaction('profiles','readonly').objectStore('profiles').get(profile))||null;
  }finally{db.close()}
}
async function dbPut(x){
  var db=await openDb();
  try{
    if(!db.objectStoreNames.contains('profiles'))return false;
    await reqP(db.transaction('profiles','readwrite').objectStore('profiles').put(x));
    return true;
  }finally{db.close()}
}
function readLegacy(){
  try{return JSON.parse(localStorage.getItem(LEGACY_KEY)||'null')}catch(e){return null}
}
function legacyProfile(profile){
  var v=readLegacy();
  return v&&v.profiles&&v.profiles[profile]?v.profiles[profile]:null;
}
function useful(v){
  if(v==null||v==='')return false;
  if(Array.isArray(v))return v.length>0;
  if(typeof v==='object')return Object.keys(v).length>0;
  return true;
}
function flatProfile(src,profile){
  if(!src||typeof src!=='object')return null;

  /* Full TAR migration v1.25 stored the real health profile here. */
  var nested=(src.profileData&&typeof src.profileData==='object')?src.profileData:{};

  /* Nested historical values first, then any already-flat current values.
     Empty current values must not erase useful migrated data. */
  var out=Object.assign({},nested);
  Object.keys(src).forEach(function(k){
    if(k==='profileData')return;
    var v=src[k];
    if(useful(v)||!useful(out[k]))out[k]=v;
  });

  /* A few harmless historical aliases used by older exports. */
  if(!useful(out.birthDate)&&useful(out.dateOfBirth))out.birthDate=out.dateOfBirth;
  if(!useful(out.heightCm)&&useful(out.height))out.heightCm=out.height;
  if(!useful(out.weightKg)&&useful(out.weight))out.weightKg=out.weight;
  if(!useful(out.doctorName)&&useful(out.gpName))out.doctorName=out.gpName;
  if(!useful(out.clinicAddress)&&useful(out.doctorAddress))out.clinicAddress=out.doctorAddress;
  if(!useful(out.doctorPhone)&&useful(out.gpPhone))out.doctorPhone=out.gpPhone;
  if(!useful(out.doctorEmail)&&useful(out.gpEmail))out.doctorEmail=out.gpEmail;

  out.profile=profile;
  return out;
}
function mergeProfiles(legacy,current,profile){
  var l=flatProfile(legacy,profile)||{};
  var c=flatProfile(current,profile)||{};
  var out=Object.assign({},l);

  /* Current IndexedDB wins only when it really contains a value.
     This is important after the broken bridge created empty flat fields. */
  Object.keys(c).forEach(function(k){
    if(useful(c[k])||!useful(out[k]))out[k]=c[k];
  });

  out.profile=profile;
  return out;
}
function mirrorLegacy(profile,rec){
  if(!rec)return;
  var v=readLegacy()||{schemaVersion:'healthhub.local.v1',profiles:{}};
  v.profiles=v.profiles||{};
  var old=v.profiles[profile]||{};
  var merged=Object.assign({},old,rec,{profile:profile});

  /* Keep profileData in sync as well because Dropbox Vault snapshots the
     legacy object and older clients still know this nested shape. */
  merged.profileData=Object.assign({},old.profileData||{},rec,{profile:profile});

  v.profiles[profile]=merged;
  localStorage.setItem(LEGACY_KEY,JSON.stringify(v));
}
async function cloudFallback(profile){
  try{
    var v=window.HH_DROPBOX_VAULT;
    if(!v||!v.connected||!v.connected()||typeof v.downloadJson!=='function')return null;
    var raw=await v.downloadJson('/HealthHub/profiles/'+profile+'-vault.json');
    if(!raw)return null;
    return raw.profileData||raw.legacyProfile||null;
  }catch(e){return null}
}
async function ensureProfile(profile,force){
  profile=profile||pkey();
  if(!force&&verified[profile])return await dbGet(profile);
  if(repairing[profile])return repairing[profile];
  repairing[profile]=(async function(){
    try{
      var current=await dbGet(profile);
      var legacy=legacyProfile(profile);

      var cloud=null;
      if(!legacy||!flatProfile(legacy,profile))cloud=await cloudFallback(profile);
      if(!current&&!legacy&&!cloud)return null;

      var base=mergeProfiles(cloud,legacy,profile);
      var merged=mergeProfiles(base,current,profile);
      await dbPut(merged);
      mirrorLegacy(profile,merged);
      verified[profile]=true;
      return merged;
    }catch(e){
      console.warn('HealthHub profile repair failed',profile,e);
      return null;
    }finally{
      setTimeout(function(){delete repairing[profile]},0);
    }
  })();
  return repairing[profile];
}
async function persistCurrentProfile(){
  try{
    var profile=pkey(),rec=await dbGet(profile);
    if(!rec)return;
    rec.profile=profile;
    verified[profile]=true;
    mirrorLegacy(profile,rec);
    if(typeof window.hhDropboxPushCurrentProfile==='function'){
      await window.hhDropboxPushCurrentProfile();
    }
  }catch(e){console.warn('HealthHub profile cloud persistence failed',e)}
}

var previousRender=window.renderHealthSection;
/* Performance: profile repair is startup/exception logic, not a per-render task.
   Keep the existing render chain untouched. */

var previousEdit=window.hhEditHealthProfile;
if(typeof previousEdit==='function'){
  window.hhEditHealthProfile=async function(){
    var p=await ensureProfile(pkey());
    if(!p){toastMsg('A profiladat még nincs ezen az eszközön. Nyisd meg egyszer a HealthHubot azon az eszközön is, ahol a profil teljes, majd frissíts itt.');return}
    return await previousEdit.apply(this,arguments);
  };
}

var previousSave=window.hhSaveHealthProfile;
if(typeof previousSave==='function'){
  window.hhSaveHealthProfile=async function(){
    var r=await previousSave.apply(this,arguments);
    await persistCurrentProfile();
    return r;
  };
}

var previousHistoryEdit=window.hhEditHighlightedHistory;
if(typeof previousHistoryEdit==='function'){
  window.hhEditHighlightedHistory=async function(){
    var p=await ensureProfile(pkey());
    if(!p){toastMsg('A profiladat még nincs ezen az eszközön. Nyisd meg egyszer a HealthHubot azon az eszközön is, ahol a profil teljes, majd frissíts itt.');return}
    return await previousHistoryEdit.apply(this,arguments);
  };
}

var previousHistorySave=window.hhSaveHighlightedHistory;
if(typeof previousHistorySave==='function'){
  window.hhSaveHighlightedHistory=async function(){
    var r=await previousHistorySave.apply(this,arguments);
    await persistCurrentProfile();
    return r;
  };
}

var previousSetProfile=window.setProfile;
if(typeof previousSetProfile==='function'){
  window.setProfile=function(){
    var r=previousSetProfile.apply(this,arguments);
    var p=pkey();
    if(!verified[p])setTimeout(function(){ensureProfile(p)},180);
    return r;
  };
}

window.addEventListener('healthhub:profile-changed',function(e){var p=e&&e.detail&&e.detail.profile||pkey();if(!verified[p])setTimeout(function(){ensureProfile(p)},180)});
window.hhEnsureHealthProfile=ensureProfile;
window.hhPersistHealthProfile=persistCurrentProfile;

Promise.allSettled([ensureProfile('zsolt'),ensureProfile('monika')]).then(function(){
  if(window.healthSectionKind==='overview'&&typeof window.renderHealthSection==='function')window.renderHealthSection();
});
document.documentElement.dataset.healthhubProfileRepair='1.230.1';
window.HH_PROFILE_REPAIR='1.230.1';
})();