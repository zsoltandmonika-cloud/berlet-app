(function(){
'use strict';

/* HealthHub v1.229 — HealthRadar profile repair + cross-device persistence.
   The rich overview/editor reads IndexedDB "profiles", while the existing
   Dropbox profile Vault historically restores legacy profile data to
   localStorage. This bridge keeps the two stores consistent. */

var DB='healthhub-healthradar-v2';
var LEGACY_KEY='hh-health-vault-v1';
var repairing={};

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
  return true;
}
function mergeProfiles(legacy,current,profile){
  var out=Object.assign({},legacy||{},current||{});
  if(legacy&&current){
    Object.keys(legacy).forEach(function(k){
      if(!useful(out[k])&&useful(legacy[k]))out[k]=legacy[k];
    });
  }
  out.profile=profile;
  return out;
}
function mirrorLegacy(profile,rec){
  if(!rec)return;
  var v=readLegacy()||{schemaVersion:'healthhub.local.v1',profiles:{}};
  v.profiles=v.profiles||{};
  v.profiles[profile]=Object.assign({},v.profiles[profile]||{},rec,{profile:profile});
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
async function ensureProfile(profile){
  profile=profile||pkey();
  if(repairing[profile])return repairing[profile];
  repairing[profile]=(async function(){
    try{
      var current=await dbGet(profile);
      var legacy=legacyProfile(profile);
      if(!current&&!legacy)legacy=await cloudFallback(profile);
      if(!current&&!legacy)return null;
      var merged=mergeProfiles(legacy,current,profile);
      await dbPut(merged);
      mirrorLegacy(profile,merged);
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
    mirrorLegacy(profile,rec);
    if(typeof window.hhDropboxPushCurrentProfile==='function'){
      await window.hhDropboxPushCurrentProfile();
    }
  }catch(e){console.warn('HealthHub profile cloud persistence failed',e)}
}

var previousRender=window.renderHealthSection;
if(typeof previousRender==='function'){
  window.renderHealthSection=async function(){
    await ensureProfile(pkey());
    return await previousRender.apply(this,arguments);
  };
}

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
    setTimeout(function(){
      ensureProfile(pkey()).then(function(){
        if(window.healthSectionKind==='overview'&&typeof window.renderHealthSection==='function')window.renderHealthSection();
      });
    },80);
    return r;
  };
}

window.hhEnsureHealthProfile=ensureProfile;
window.hhPersistHealthProfile=persistCurrentProfile;

Promise.allSettled([ensureProfile('zsolt'),ensureProfile('monika')]).then(function(){
  if(window.healthSectionKind==='overview'&&typeof window.renderHealthSection==='function')window.renderHealthSection();
});
window.addEventListener('focus',function(){
  setTimeout(function(){
    ensureProfile(pkey()).then(function(){
      if(window.healthSectionKind==='overview'&&typeof window.renderHealthSection==='function')window.renderHealthSection();
    });
  },160);
});

document.documentElement.dataset.healthhubProfileRepair='1.229';
window.HH_PROFILE_REPAIR='1.229';
})();