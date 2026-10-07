(function(){
'use strict';
/* HealthHub v1.291 — private cloud upload bridge for local Léna Health Context.
   Uploads only the already-built context JSON. No document/blob reads. */

var PREFIX='hh-lena-context-v289-';
var CLOUD_KEY='hh-lena-context-v291-cloud-';
var busy={}, timers={};

function pkey(p){
  if(p==='m'||p==='monika')return 'monika';
  if(p==='z'||p==='zsolt')return 'zsolt';
  return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
}
function pname(p){return pkey(p)==='monika'?'Mónika':'Zsolt'}
function fmt(s){
  if(!s)return'még nem';
  var d=new Date(s);
  return isNaN(d)?String(s):d.toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}
function readContext(p){
  try{return JSON.parse(localStorage.getItem(PREFIX+pkey(p))||'null')}catch(e){return null}
}
function readCloudState(p){
  try{return JSON.parse(localStorage.getItem(CLOUD_KEY+pkey(p))||'{}')}catch(e){return{}}
}
function writeCloudState(p,s){
  localStorage.setItem(CLOUD_KEY+pkey(p),JSON.stringify(s||{}));
}
function connected(){
  try{
    var v=window.HH_DROPBOX_VAULT;
    return !!(v&&v.connected&&v.connected()&&typeof v.uploadJson==='function');
  }catch(e){return false}
}
function status(){
  var box=document.getElementById('hhLenaCtx289');if(!box)return;
  var old=document.getElementById('hhLenaCloud291');if(old)old.remove();
  var p=pkey(),st=readCloudState(p);
  var d=document.createElement('div');d.id='hhLenaCloud291';
  d.style.marginTop='7px';d.style.paddingTop='7px';d.style.borderTop='1px solid #e5edf2';
  d.style.fontSize='7.2px';d.style.lineHeight='1.55';d.style.color='#7f91a0';
  var cloudText;
  if(st.ok)cloudText='✅ '+fmt(st.updatedAt);
  else if(st.uploading)cloudText='⏳ feltöltés…';
  else if(!connected())cloudText='⏸ Dropbox nincs csatlakoztatva';
  else if(st.error)cloudText='⚠ '+String(st.error).slice(0,90);
  else cloudText='⏳ még nincs';
  d.innerHTML='<b style="color:#2e6d9b">☁ Privát Léna Context Cloud</b><br>'+
    'Cloud: '+cloudText+
    '<br><span style="color:#8b98a5">🤖 ChatGPT/Léna közvetlen olvasás: connector következik</span>';
  box.appendChild(d);
}
async function upload(profile,reason){
  var p=pkey(profile);
  if(busy[p])return busy[p];
  busy[p]=(async function(){
    var c=readContext(p);
    if(!c){writeCloudState(p,{ok:false,updatedAt:new Date().toISOString(),error:'Nincs helyi context'});status();return false}
    if(!connected()){writeCloudState(p,{ok:false,updatedAt:new Date().toISOString(),error:'Dropbox nincs csatlakoztatva'});status();return false}
    var v=window.HH_DROPBOX_VAULT;
    var started=new Date().toISOString();
    writeCloudState(p,{ok:false,uploading:true,startedAt:started,reason:reason||'context-update'});status();
    try{
      await v.uploadJson('/HealthHub/sync/'+p+'-lena-health-context.json',c);
      var now=new Date().toISOString();
      writeCloudState(p,{ok:true,uploading:false,updatedAt:now,contextGeneratedAt:c.generatedAt||null,reason:reason||'context-update'});
      try{window.dispatchEvent(new CustomEvent('healthhub:lena-context-cloud-synced',{detail:{profile:p,updatedAt:now,contextGeneratedAt:c.generatedAt||null}}))}catch(e){}
      status();
      return true;
    }catch(e){
      console.warn('Léna Context Cloud upload failed',e);
      writeCloudState(p,{ok:false,uploading:false,updatedAt:new Date().toISOString(),error:String(e&&e.message||e)});
      status();
      return false;
    }
  })().finally(function(){busy[p]=null});
  return busy[p];
}
function schedule(profile,reason,delay){
  var p=pkey(profile);
  clearTimeout(timers[p]);
  timers[p]=setTimeout(function(){upload(p,reason).catch(function(){})},delay==null?900:delay);
}

window.hhUploadLenaHealthContext291=function(p,r){return upload(p||pkey(),r||'manual')};
window.hhGetLenaHealthContextCloudState291=function(p){return readCloudState(p||pkey())};

window.addEventListener('healthhub:lena-context-updated',function(e){
  var p=e&&e.detail&&e.detail.profile||pkey();
  setTimeout(status,120);
  schedule(p,'local-context-updated',700);
});
window.addEventListener('healthhub:profile-changed',function(){setTimeout(status,160)});
window.addEventListener('focus',function(){setTimeout(status,180)});

setTimeout(function(){
  status();
  var p=pkey(),st=readCloudState(p),c=readContext(p);
  if(c&&connected()&&(!st.ok||st.contextGeneratedAt!==c.generatedAt))schedule(p,'startup-catchup',1800);
},1400);

document.documentElement.dataset.healthhubLenaContextCloud='1.291.1';
})();