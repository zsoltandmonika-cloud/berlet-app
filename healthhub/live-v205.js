(function(){
'use strict';

/* HealthHub v1.106 — unified Cloud Vault admin card
   Replaces the two Dropbox cards with one clean control surface while keeping
   the existing v161 profile sync and v204 daily cloud functions underneath. */

var CARD_ID='hhUnifiedCloudVaultCard';
var busy=false,scheduled=false,observer=null;

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return profile()==='monika'?'Mónika':'Zsolt'}
function fmt(s){
 if(!s)return 'még nem';
 var d=new Date(s);
 return isNaN(d)?'még nem':d.toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}
function isConnected(){
 try{return !!(window.HH_DROPBOX_VAULT&&window.HH_DROPBOX_VAULT.connected&&window.HH_DROPBOX_VAULT.connected())}catch(e){return false}
}
function dailySource(kind){
 var k=kind==='spark'?'hhDailySparkSource':'hhDailyBriefingSource';
 return document.documentElement.dataset[k]||'—';
}
function removeLegacyCards(root){
 ['hhCloudVaultCard','hhDropboxVaultCard',CARD_ID].forEach(function(id){
  var el=document.getElementById(id);if(el&&el.parentNode===root)el.remove();
 });
}
function html(){
 var p=profile(),on=isConnected();
 var push=localStorage.getItem('hh-dropbox-last-push-'+p);
 var pull=localStorage.getItem('hh-dropbox-last-pull-'+p);
 var sync=localStorage.getItem('hh-dropbox-last-sync-'+p);
 var spark=dailySource('spark'),brief=dailySource('briefing');
 var healthLast=localStorage.getItem('hh-health-cloud-last-'+p)||localStorage.getItem('hh-sync-now-last-'+p);
 var healthPath=localStorage.getItem('hh-health-cloud-path-'+p)||('/HealthHub/profiles/'+p+'-health-connect.json');

 return '<div class="hhUcTop">'+
   '<div class="hhUcIcon">◆</div>'+
   '<div class="hhUcTitle"><b>HealthHub Cloud Vault</b><small>Központi Dropbox tár · '+esc(pname())+' profil · helyi cache</small></div>'+
   '<span class="hhUcStatus '+(on?'on':'off')+'">'+(on?'Dropbox kapcsolva':'Nincs kapcsolat')+'</span>'+
  '</div>'+
  '<div class="hhUcGrid">'+
   '<div class="hhUcMetric"><span>Profil Vault</span><b>'+esc('/HealthHub/profiles/'+p+'-vault.json')+'</b><small>Utolsó sync: '+esc(fmt(sync||pull||push))+'</small></div>'+
   '<div class="hhUcMetric"><span>Health + Activity Cloud</span><b>'+esc(healthPath)+'</b><small>Utolsó sync: '+esc(fmt(healthLast))+'</small></div>'+
   '<div class="hhUcMetric"><span>Daily Cloud</span><b>Daily Spark + Morning Briefing</b><small>Spark: '+esc(spark)+' · Brief: '+esc(brief)+'</small></div>'+
  '</div>'+
  (on
   ?'<div class="hhUcActions">'+
      '<button class="primary" onclick="hhUnifiedSyncAll()">↻ Minden szinkronizálása</button>'+
      '<button onclick="hhDropboxPush()">Feltöltés</button>'+
      '<button onclick="hhDropboxPull()">Letöltés + egyesítés</button>'+
      '<button onclick="hhCloudInitVault()">Vault ellenőrzése</button>'+
      '<button onclick="open(\'https://www.dropbox.com/home/Apps\',\'_blank\')">Dropbox megnyitása</button>'+
      '<button class="danger" onclick="hhUnifiedDisconnect()">Leválasztás</button>'+
    '</div>'
   :'<div class="hhUcActions one"><button class="primary" onclick="hhDropboxConnect()">Dropbox csatlakoztatása</button></div>')+
  '<div class="hhUcMeta">Cloud root: <b>/HealthHub</b> · Profiles · Documents · Explanations · Devices · Measurements · Appointments · Daily · Sync</div>';
}

function consolidate(){
 if(busy||window.healthSectionKind!=='more')return;
 var root=document.getElementById('healthSubContent');if(!root)return;
 busy=true;
 try{
  removeLegacyCards(root);
  var card=document.createElement('div');
  card.id=CARD_ID;card.className='hhUnifiedCloudVault';
  card.innerHTML=html();

  var admin=document.getElementById('hhAdminMenuCard');
  if(admin&&admin.parentNode===root)root.insertBefore(card,admin);
  else root.insertBefore(card,root.firstChild);
 }finally{busy=false}
}
function queue(){
 if(scheduled)return;scheduled=true;
 setTimeout(function(){scheduled=false;consolidate()},40);
}
function ensureObserver(){
 /* Performance: renderHealthSection hook + explicit queue calls are sufficient.
    Avoid observing the entire document body for Cloud Vault decoration. */
 observer=null;
}

window.hhUnifiedSyncAll=async function(){
 if(window.__hhUnifiedSyncBusy)return;
 window.__hhUnifiedSyncBusy=true;
 try{
  var jobs=[];
  if(typeof window.hhDropboxPushCurrentProfile==='function')jobs.push({name:'Profile Vault',run:function(){return window.hhDropboxPushCurrentProfile()}});
  if(typeof window.hhCloudSyncDaily==='function')jobs.push({name:'Daily Cloud',run:function(){return window.hhCloudSyncDaily()}});
  if(typeof window.hhHealthCloudSync==='function')jobs.push({name:'Health + Activity Cloud',run:function(){return window.hhHealthCloudSync(false)}});
  if(typeof window.hhDeviceCloudSync==='function')jobs.push({name:'Devices Cloud',run:function(){return window.hhDeviceCloudSync(true)}});

  var results=await Promise.allSettled(jobs.map(function(j){
    try{return Promise.resolve(j.run())}catch(e){return Promise.reject(e)}
  }));
  var failed=[];
  results.forEach(function(r,i){
    if(r.status==='rejected'){
      failed.push(jobs[i].name);
      try{window.hhErrorLogRecord&&window.hhErrorLogRecord('error','unified-sync:'+jobs[i].name,(r.reason&&r.reason.message)||r.reason||'Sync hiba',r.reason&&r.reason.stack||r.reason)}catch(e){}
    }
  });

  if(failed.length){
    var msg='Sync hiba: '+failed.join(', ');
    try{window.toast&&window.toast(msg)}catch(e){}
    try{window.hhErrorLogRecord&&window.hhErrorLogRecord('error','unified-sync',msg,{failed:failed,total:jobs.length})}catch(e){}
  }else{
    try{window.toast&&window.toast('HealthHub Cloud Vault szinkronizálva')}catch(e){}
  }
 }catch(e){
  try{window.hhErrorLogRecord&&window.hhErrorLogRecord('error','unified-sync','A sync task nem indítható',e&&e.stack||e)}catch(_){}
  try{window.toast&&window.toast('Sync task could not be started')}catch(_){}
  throw e;
 }finally{
  window.__hhUnifiedSyncBusy=false;
  setTimeout(consolidate,120);
 }
};
window.hhUnifiedDisconnect=function(){
 if(!confirm('Leválasztod ezt a készüléket a Dropbox Cloud Vaultról? A Dropboxban tárolt adatok nem törlődnek.'))return;
 if(typeof window.hhDropboxDisconnect==='function')window.hhDropboxDisconnect();
 setTimeout(consolidate,120);
};

function style(){
 if(document.getElementById('hh-v205-style'))return;
 var s=document.createElement('style');s.id='hh-v205-style';s.textContent=
 '.hhUnifiedCloudVault{border:1px solid #cfe0ec;background:linear-gradient(145deg,#ffffff,#f3f9fd);border-radius:18px;padding:13px;margin-bottom:10px;box-shadow:0 7px 18px rgba(31,65,91,.06)}'+
 '.hhUcTop{display:flex;align-items:center;gap:10px}.hhUcIcon{width:40px;height:40px;border-radius:13px;background:#0061ff;color:#fff;display:grid;place-items:center;font-size:17px;font-weight:900;flex:none}.hhUcTitle{min-width:0;flex:1}.hhUcTitle b{display:block;font-size:12px;color:#173f62}.hhUcTitle small{display:block;font-size:8px;color:#70879a;line-height:1.35;margin-top:2px}.hhUcStatus{font-size:7.4px;font-weight:900;padding:5px 8px;border-radius:999px;background:#eef2f5;color:#718292;white-space:nowrap}.hhUcStatus.on{background:#e9f8f2;color:#16735b}'+
 '.hhUcGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:11px}.hhUcMetric{background:#f7fbfd;border:1px solid #e4edf2;border-radius:13px;padding:9px;min-width:0}.hhUcMetric span{display:block;font-size:7px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#7b91a1;margin-bottom:3px}.hhUcMetric b{display:block;font-size:9px;color:#214d6c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hhUcMetric small{display:block;font-size:7.2px;line-height:1.4;color:#8194a3;margin-top:3px}'+
 '.hhUcActions{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:7px;margin-top:10px}.hhUcActions.one{grid-template-columns:1fr}.hhUcActions button{border:0;border-radius:12px;padding:9px 8px;font-size:8px;font-weight:900;background:#edf4f8;color:#31536f;min-height:34px}.hhUcActions .primary{background:#1d78ff;color:#fff}.hhUcActions .danger{background:#fff0f3;color:#c13b5e}.hhUcActions button:active{transform:scale(.98)}'+
 '.hhUcMeta{font-size:7px;color:#8497a5;line-height:1.5;margin-top:9px;padding-top:8px;border-top:1px solid #e5edf2}'+
 '@media(max-width:430px){.hhUcGrid{grid-template-columns:1fr}.hhUcActions{grid-template-columns:1fr 1fr}.hhUcActions .primary{grid-column:1/-1}.hhUcStatus{font-size:7px}.hhUcTitle b{font-size:11.5px}}';
 document.head.appendChild(s);
}

var prev=window.renderHealthSection;
if(typeof prev==='function'){
 window.renderHealthSection=async function(){
  var x=await prev.apply(this,arguments);
  queue();
  return x;
 };
}

style();
ensureObserver();
setTimeout(queue,180);
window.addEventListener('focus',function(){setTimeout(queue,180)});
document.documentElement.dataset.healthhubUnifiedVault='1.231';
window.HH_LIVE_BUILD='v1.231-unified-sync-diagnostics';
})();