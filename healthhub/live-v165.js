(function(){
'use strict';
/* HealthHub v1.108 — unified Health + Activity Cloud sync */
var busy=false;
// v1015: one profile-scoped Health Connect fetch shared by import + Activity.
var sharedCloud=new Map(),SHARED_TTL_MS=12000;
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(p){return p==='monika'?'Mónika':'Zsolt'}
function toast(s){try{window.toast&&window.toast(s)}catch(e){}}
function isAndroid(){return /Android/i.test(navigator.userAgent||'')}
function cloudPath(profile){return '/HealthHub/profiles/'+profile+'-health-connect.json'}
function legacyPath(profile){return '/incoming-'+profile+'.json'}
function vault(){return window.HH_DROPBOX_VAULT}
function connected(){try{return !!(vault()&&vault().connected&&vault().connected())}catch(e){return false}}

async function downloadRaw(profile){
 var v=vault();if(!v||typeof v.downloadJson!=='function')throw new Error('A HealthHub Cloud Vault még nem érhető el.');
 try{return {raw:await v.downloadJson(cloudPath(profile)),path:cloudPath(profile)}}
 catch(e){
  if(e&&e.status!==409)throw e;
  return {raw:await v.downloadJson(legacyPath(profile)),path:legacyPath(profile)};
 }
}
function readSharedCloud(profile,force){
 if(profile!=='monika'&&profile!=='zsolt')return Promise.reject(new Error('Hibás Health Connect profil.'));
 var now=Date.now(),old=sharedCloud.get(profile);
 if(old&&(old.pending||(!force&&now-old.at<SHARED_TTL_MS)))return old.promise;
 var row={at:now,pending:true,promise:null};
 row.promise=downloadRaw(profile).then(function(value){
  row.pending=false;row.at=Date.now();
  return value;
 },function(e){
  if(sharedCloud.get(profile)===row)sharedCloud.delete(profile);
  throw e;
 });
 sharedCloud.set(profile,row);
 return row.promise;
}
window.HH_HEALTH_CONNECT_SOURCE_V1015={read:readSharedCloud,version:'1015'};
async function processIncoming(profile,force){
 // Matched Dropbox account changes start read-only. Activity/Sleep can read
 // fresh canonical JSON, but no background import may modify local records.
 if(window.HH_DROPBOX_VAULT?.readOnlyVerification?.())return false;
 if(busy||typeof window.hhImportHealthConnectRaw!=='function'||!connected())return false;
 busy=true;
 try{
  var got;
  try{got=await readSharedCloud(profile,!!force)}catch(e){if(e&&e.status===409)return false;throw e}
  var raw=got&&got.raw;if(!raw)return false;
  if(String(raw.profile||'').toLowerCase()!==profile)throw new Error('A Health Connect Cloud profil nem egyezik.');
  var exportedAt=raw.exportedAt||raw.rangeEnd||'';
  var key='hh-health-cloud-exported-'+profile,last=localStorage.getItem(key)||'';
  if(!force&&exportedAt&&Date.parse(exportedAt)<=Date.parse(last||0))return false;
  toast('Health + Activity Cloud · '+pname(profile)+' adatainak frissítése…');
  await window.hhImportHealthConnectRaw(raw,'Dropbox '+got.path);
  var now=new Date().toISOString();
  if(exportedAt)localStorage.setItem(key,exportedAt);
  localStorage.setItem('hh-sync-now-last-'+profile,now);
  localStorage.setItem('hh-health-cloud-last-'+profile,now);
  localStorage.setItem('hh-health-cloud-path-'+profile,got.path);
  toast('✓ Health + Activity frissítve · '+pname(profile));
  try{window.dispatchEvent(new CustomEvent('healthhub:health-cloud-synced',{detail:{profile:profile,exportedAt:exportedAt,path:got.path}}))}catch(e){}
  return true;
 }finally{busy=false}
}

window.hhHealthCloudSync=function(force){
 return processIncoming(pkey(),!!force).catch(function(e){console.error(e);toast('Health + Activity sync hiba: '+(e.message||e));return false});
};
window.hhHealthCloudSyncProfile=function(profile,force){
 profile=profile==='monika'?'monika':'zsolt';
 return processIncoming(profile,!!force).catch(function(e){console.error(e);toast('Health + Activity sync hiba: '+(e.message||e));return false});
};
window.hhSyncNow=function(){
 var profile=pkey();
 if(!isAndroid()){
  toast('A SYNC NOW a HealthHub Connect Android appot indítja. Telefonon használd.');
  return;
 }
 localStorage.setItem('hh-sync-now-pending-'+profile,new Date().toISOString());
 location.href='healthhubconnect://sync?profile='+encodeURIComponent(profile);
};

function decorate(){
 if(window.healthSectionKind!=='measurements')return;
 var root=document.getElementById('healthSubContent');if(!root)return;
 var card=root.querySelector('.hrSectionCard');if(!card)return;
 var host=card.querySelector('.hhImportTools')||card.querySelector('.hhMeasCrudBar');if(!host)return;
 var b=host.querySelector('.hhSyncNowBtn');
 if(!b){
  b=document.createElement('button');b.type='button';b.className='hhSyncNowBtn';b.textContent='🔄 HEALTH + ACTIVITY SYNC';b.onclick=function(){window.hhSyncNow()};
  Object.assign(b.style,{border:'0',borderRadius:'12px',background:'#173f62',color:'#fff',padding:'8px 11px',fontSize:'8px',fontWeight:'900',cursor:'pointer'});
  host.insertBefore(b,host.firstChild);
 }else b.textContent='🔄 HEALTH + ACTIVITY SYNC';
 var json=host.querySelector('.hhHcBtn');if(json)json.textContent='Plan B · Health Connect JSON';
}

function startup(){
 decorate();
 var u=new URL(location.href),bridge=u.searchParams.get('bridgeSync')==='1',profile=u.searchParams.get('profile')||pkey();
 if(profile!=='monika'&&profile!=='zsolt')profile=pkey();
 if(bridge){
  setTimeout(function(){processIncoming(profile,true).catch(function(e){console.error(e);toast('Health + Activity sync hiba: '+(e.message||e))})},220);
  u.searchParams.delete('bridgeSync');u.searchParams.delete('profile');u.searchParams.delete('ts');
  history.replaceState({},'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash);
 }else setTimeout(function(){processIncoming(pkey(),false).catch(function(e){console.warn(e)})},900);
}
var prev=window.renderHealthSection;
if(typeof prev==='function')window.renderHealthSection=async function(){var r=await prev.apply(this,arguments);decorate();return r};
window.addEventListener('focus',function(){setTimeout(function(){decorate();processIncoming(pkey(),false).catch(function(e){console.warn(e)})},300)});
window.addEventListener('healthhub:profile-changed',function(){setTimeout(function(){processIncoming(pkey(),false).catch(function(e){console.warn(e)})},300)});
startup();
document.documentElement.dataset.healthhubSyncNow='1.108';
})();