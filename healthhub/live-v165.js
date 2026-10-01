(function(){
'use strict';
/* HealthHub v1.65 — one-tap Health Connect Sync Now */
var APP_KEY='o2oe9qclhtoic9s', TOKEN_KEY='hh-dropbox-token-v1';
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(p){return p==='monika'?'Mónika':'Zsolt'}
function toast(s){try{window.toast&&window.toast(s)}catch(e){}}
function readToken(){try{return JSON.parse(localStorage.getItem(TOKEN_KEY)||'null')}catch(e){return null}}
async function accessToken(){
 var t=readToken();if(!t||!t.refresh_token)throw new Error('A Dropbox nincs csatlakoztatva a HealthHubban.');
 if(t.access_token&&Number(t.expires_at)>Date.now()+60000)return t.access_token;
 var body=new URLSearchParams({refresh_token:t.refresh_token,grant_type:'refresh_token',client_id:APP_KEY});
 var r=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body});
 var j=await r.json();if(!r.ok)throw new Error(j.error_description||j.error||'Dropbox token frissítési hiba');
 t.access_token=j.access_token;t.expires_at=Date.now()+((Number(j.expires_in)||14400)-60)*1000;localStorage.setItem(TOKEN_KEY,JSON.stringify(t));return t.access_token;
}
function incomingPath(profile){return '/incoming-'+profile+'.json'}
async function meta(profile){
 var token=await accessToken(),r=await fetch('https://api.dropboxapi.com/2/files/get_metadata',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({path:incomingPath(profile),include_deleted:false})});
 if(r.status===409)return null;
 var j=await r.json();if(!r.ok)throw new Error(j.error_summary||'Dropbox incoming metaadat hiba');return j;
}
async function downloadIncoming(profile){
 var token=await accessToken(),r=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{Authorization:'Bearer '+token,'Dropbox-API-Arg':JSON.stringify({path:incomingPath(profile)})}});
 if(!r.ok)throw new Error('Dropbox incoming letöltési hiba');
 return await r.json();
}
var busy=false;
async function processIncoming(profile,force){
 if(busy||typeof window.hhImportHealthConnectRaw!=='function')return false;
 busy=true;
 try{
  var m=await meta(profile);if(!m)return false;
  var stamp=m.server_modified||m.client_modified||'';
  var key='hh-incoming-last-'+profile,last=localStorage.getItem(key)||'';
  if(!force&&stamp&&last===stamp)return false;
  var raw=await downloadIncoming(profile);
  if(String(raw.profile||'').toLowerCase()!==profile)throw new Error('A beérkező Health Connect profil nem egyezik.');
  toast('SYNC NOW · '+pname(profile)+' adatainak feldolgozása…');
  await window.hhImportHealthConnectRaw(raw,'Dropbox '+incomingPath(profile));
  if(stamp)localStorage.setItem(key,stamp);
  localStorage.setItem('hh-sync-now-last-'+profile,new Date().toISOString());
  toast('✓ SYNC NOW kész · '+pname(profile)+' adatai frissítve');
  return true;
 }finally{busy=false}
}
function isAndroid(){return /Android/i.test(navigator.userAgent||'')}
window.hhSyncNow=function(){
 var profile=pkey();
 if(!isAndroid()){
  toast('A SYNC NOW a HealthHub Connect Android appot indítja. Telefonon használd.');
  return;
 }
 var url='healthhubconnect://sync?profile='+encodeURIComponent(profile);
 var hidden=false;
 var onVis=function(){if(document.hidden)hidden=true};
 document.addEventListener('visibilitychange',onVis,{once:true});
 location.href=url;
 setTimeout(function(){
  document.removeEventListener('visibilitychange',onVis);
  if(!hidden&&!document.hidden)toast('A HealthHub Connect nem nyílt meg. Plan B: használd a Health Connect JSON importot.');
 },1400);
};
function decorate(){
 if(window.healthSectionKind!=='measurements')return;
 var root=document.getElementById('healthSubContent');if(!root)return;
 var card=root.querySelector('.hrSectionCard');if(!card)return;
 var host=card.querySelector('.hhImportTools')||card.querySelector('.hhMeasCrudBar');if(!host)return;
 if(!host.querySelector('.hhSyncNowBtn')){
  var b=document.createElement('button');b.type='button';b.className='hhSyncNowBtn';b.textContent='🔄 SYNC NOW';b.onclick=window.hhSyncNow;
  Object.assign(b.style,{border:'0',borderRadius:'12px',background:'#173f62',color:'#fff',padding:'8px 11px',fontSize:'8px',fontWeight:'900',cursor:'pointer'});
  host.insertBefore(b,host.firstChild);
 }
 var json=host.querySelector('.hhHcBtn');if(json)json.textContent='Plan B · Health Connect JSON';
}
var prev=window.renderHealthSection;
if(typeof prev==='function')window.renderHealthSection=async function(){var r=await prev.apply(this,arguments);decorate();return r};
function startup(){
 decorate();
 var u=new URL(location.href),bridge=u.searchParams.get('bridgeSync')==='1',profile=u.searchParams.get('profile')||pkey();
 if(profile!=='monika'&&profile!=='zsolt')profile=pkey();
 if(bridge){
  setTimeout(function(){processIncoming(profile,true).catch(function(e){console.error(e);toast('SYNC NOW hiba: '+(e.message||e))})},180);
  u.searchParams.delete('bridgeSync');u.searchParams.delete('profile');u.searchParams.delete('ts');
  history.replaceState({},'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash);
 }else{
  setTimeout(function(){processIncoming(pkey(),false).catch(function(e){console.warn(e)})},500);
 }
}
window.addEventListener('focus',function(){setTimeout(function(){processIncoming(pkey(),false).catch(function(e){console.warn(e)})},250)});
startup();
document.documentElement.dataset.healthhubSyncNow='1.65';
})();