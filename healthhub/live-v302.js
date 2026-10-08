(function(){
'use strict';
/* HealthHub v302 — WISH-007 Central Manual Sync.
   Admin-only orchestration for the active profile. No clinical values are copied into telemetry. */

var BUILD='1.302', SECTION='hhCentralManualSync302', STYLE='hhCentralManualSync302Style';
var STATE='hh-central-manual-sync-v302', WKEY='hh-ai-wishlist-v1';
var busy=false, observer=null, timer=null;

function now(){return new Date().toISOString()}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(p){return p==='monika'?'Mónika':'Zsolt'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function readJson(k,f){try{var x=JSON.parse(localStorage.getItem(k)||'null');return x==null?f:x}catch(e){return f}}
function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function state(){return readJson(STATE,{status:'Idle',profile:pkey(),startedAt:null,completedAt:null,steps:[],message:'Még nem futott Central Manual Sync.'})}
function saveState(s){writeJson(STATE,s)}
function fmt(s){if(!s)return'—';var d=new Date(s);return isNaN(d)?String(s):d.toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})}

function ensureStyle(){
 if(document.getElementById(STYLE))return;
 var s=document.createElement('style');s.id=STYLE;s.textContent=
 '#'+SECTION+'{margin-top:10px}.hhCms302{background:#fff;border:1px solid #dce8ee;border-radius:18px;padding:12px;box-shadow:0 8px 22px rgba(31,65,91,.055)}'+
 '.hhCmsHead302{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.hhCmsHead302 h3{margin:0;color:#173f62}.hhCmsHead302 small{display:block;color:#758a98;margin-top:2px}.hhCmsBadge302{font-size:7.5px;font-weight:950;padding:6px 8px;border-radius:999px;background:#eef3f6;color:#6e8290;white-space:nowrap}.hhCmsBadge302.running{background:#fff4d8;color:#8d6812}.hhCmsBadge302.done{background:#e7f7ef;color:#18714c}.hhCmsBadge302.partial,.hhCmsBadge302.failed{background:#ffe9ed;color:#a83750}'+
 '.hhCmsSteps302{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;margin-top:10px}.hhCmsStep302{padding:7px 4px;border-radius:9px;background:#eef3f6;color:#788e9b;text-align:center;font-size:6.3px;font-weight:850;line-height:1.25}.hhCmsStep302.running{background:#fff4d8;color:#8d6812}.hhCmsStep302.done{background:#e7f7ef;color:#18714c}.hhCmsStep302.failed{background:#ffe9ed;color:#a83750}.hhCmsStep302.skipped{background:#f3f4f5;color:#9aa5ad}'+
 '.hhCmsMeta302{font-size:7px;color:#718895;line-height:1.5;margin-top:8px}.hhCmsActions302{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.hhCmsActions302 button{border:1px solid #d8e4eb;background:#f7fafc;color:#31536f;border-radius:11px;padding:8px 10px;font-size:7.8px;font-weight:900;cursor:pointer;touch-action:manipulation}.hhCmsActions302 .primary{background:#1b7f73;border-color:#1b7f73;color:#fff}.hhCmsActions302 button:disabled{opacity:.55;cursor:wait}'+
 '.hhCmsNote302{margin-top:9px;padding:8px 9px;border-radius:11px;background:#f4f8fa;color:#667f8e;font-size:7px;line-height:1.5}@media(max-width:560px){.hhCmsSteps302{grid-template-columns:repeat(2,minmax(0,1fr))}}';
 document.head.appendChild(s);
}

function taskDefs(profile){
 return [
  {id:'profile',name:'Profile Vault',available:typeof window.hhDropboxPushCurrentProfile==='function',run:function(){return window.hhDropboxPushCurrentProfile()}},
  {id:'master',name:'Structured Vault',available:typeof window.hhMasterStructuredSync304==='function',run:function(){return window.hhMasterStructuredSync304(true)}},
  {id:'daily',name:'Daily Cloud',available:typeof window.hhCloudSyncDaily==='function',run:function(){return window.hhCloudSyncDaily()}},
  {id:'health',name:'Health + Activity',available:typeof window.hhHealthCloudSync==='function',run:function(){return window.hhHealthCloudSync(true)}},
  {id:'devices',name:'Devices Cloud',available:typeof window.hhDeviceCloudSync==='function',run:function(){return window.hhDeviceCloudSync(true)}},
  {id:'lena',name:'Léna Context',available:typeof window.hhUploadLenaHealthContext291==='function',run:function(){return window.hhUploadLenaHealthContext291(profile,'central-manual-sync')}}
 ];
}

function stepClass(st){st=String(st||'Pending').toLowerCase();return st==='done'?'done':st==='running'?'running':st==='failed'?'failed':st==='skipped'?'skipped':''}
function render(){
 var body=document.getElementById('haBody'),ov=document.getElementById('haOv');
 if(!body||!ov||!ov.classList.contains('on'))return;
 ensureStyle();
 var old=document.getElementById(SECTION);if(old)old.remove();
 var s=state(),p=pkey(),defs=taskDefs(p),by={};
 (s.steps||[]).forEach(function(x){by[x.id]=x});
 var steps=defs.map(function(d){var x=by[d.id]||{status:d.available?'Pending':'Skipped'};return '<div class="hhCmsStep302 '+stepClass(x.status)+'">'+esc(d.name)+'<br>'+esc(x.status||'Pending')+'</div>'}).join('');
 var cls=String(s.status||'idle').toLowerCase();
 var html='<section id="'+SECTION+'" class="hhCms302">'+
  '<div class="hhCmsHead302"><div><h3>🔄 Central Manual Sync · WISH-007</h3><small>Adminból indítható központi manuális sync · aktív profil: '+esc(pname(p))+'</small></div><span class="hhCmsBadge302 '+cls+'">'+esc(s.status||'Idle')+'</span></div>'+
  '<div class="hhCmsSteps302">'+steps+'</div>'+
  '<div class="hhCmsMeta302">Utolsó indítás: '+esc(fmt(s.startedAt))+' · Befejezés: '+esc(fmt(s.completedAt))+'</div>'+
  '<div class="hhCmsMeta302">'+esc(s.message||'')+'</div>'+
  '<div class="hhCmsActions302"><button type="button" class="primary" id="hhCmsRun302" '+(busy||s.status==='Running'?'disabled':'')+'>↻ SYNC ACTIVE PROFILE NOW</button><button type="button" id="hhCmsReset302">↺ STATUS RESET</button></div>'+
  '<div class="hhCmsNote302"><b>Scope v302:</b> az aktív profil központi manuális szinkronja. Profile Vault, Central Structured Vault, Daily Cloud, Health + Activity, Devices Cloud és Léna Context. Az összes profil / összes regisztrált eszköz központi orchestrációját a v305 Central Sync Orchestrator kezeli.</div>'+
 '</section>';
 var base=document.getElementById('hhLevel3V301')||document.getElementById('hhAiImprovement300');
 if(base)base.insertAdjacentHTML('afterend',html);else body.insertAdjacentHTML('afterbegin',html);
 var run=document.getElementById('hhCmsRun302'),reset=document.getElementById('hhCmsReset302');
 if(run)run.onclick=function(){runSync()};
 if(reset)reset.onclick=function(){if(busy)return;saveState({status:'Idle',profile:pkey(),startedAt:null,completedAt:null,steps:[],message:'Státusz visszaállítva.'});render()};
}

function setStep(s,id,status,error){
 var x=(s.steps||[]).filter(function(a){return a.id===id})[0];
 if(!x){x={id:id,status:status};s.steps.push(x)}
 x.status=status;x.updatedAt=now();if(error)x.error=String(error);
 saveState(s);render();
}

async function runSync(){
 if(busy)return;
 busy=true;
 var profile=pkey(),defs=taskDefs(profile),s={
  status:'Running',profile:profile,startedAt:now(),completedAt:null,
  steps:defs.map(function(d){return {id:d.id,name:d.name,status:d.available?'Pending':'Skipped'}}),
  message:'Central Manual Sync indul · '+pname(profile)
 };
 saveState(s);render();
 var failed=[];
 try{
  for(var i=0;i<defs.length;i++){
   var d=defs[i];
   if(!d.available)continue;
   setStep(s,d.id,'Running');
   try{
    await Promise.resolve(d.run());
    setStep(s,d.id,'Done');
   }catch(e){
    failed.push(d.name);
    setStep(s,d.id,'Failed',e&&e.message||e);
    try{window.hhErrorLogRecord&&window.hhErrorLogRecord('error','central-manual-sync:'+d.id,(e&&e.message)||e||'Sync hiba',e&&e.stack||e)}catch(_){}
   }
  }
  s.completedAt=now();
  s.status=failed.length?(failed.length===defs.filter(function(x){return x.available}).length?'Failed':'Partial'):'Done';
  s.message=failed.length?('Befejezve hibával: '+failed.join(', ')):('Central Manual Sync kész · '+pname(profile));
  saveState(s);
  try{window.dispatchEvent(new CustomEvent('healthhub:central-manual-sync',{detail:{profile:profile,status:s.status,failed:failed,completedAt:s.completedAt}}))}catch(e){}
  try{window.toast&&window.toast(failed.length?s.message:'✓ Central Manual Sync kész · '+pname(profile))}catch(e){}
 }finally{
  busy=false;render();
 }
}

function markWishDone(){
 var a=readJson(WKEY,[]);if(!Array.isArray(a))return;
 var changed=false;
 a.forEach(function(x){if(x.id==='WISH-007'){
  x.status='Done';x.executionStatus='Done';x.executionMessage='Central Manual Sync aktív az Admin Data Hubban · aktív profilra.';x.executionAt=now();x.updatedAt=now();changed=true;
 }});
 if(changed)writeJson(WKEY,a);
}

window.hhCentralManualSync302=runSync;
window.hhCentralManualSyncState302=state;
markWishDone();

function attach(){
 var ov=document.getElementById('haOv');
 if(!ov){timer=setTimeout(attach,500);return}
 if(observer)observer.disconnect();
 observer=new MutationObserver(function(){if(ov.classList.contains('on'))setTimeout(render,40)});
 observer.observe(ov,{attributes:true,attributeFilter:['class']});
 if(ov.classList.contains('on'))render();
}
attach();
window.addEventListener('healthhub:profile-changed',function(){setTimeout(render,100)});
document.documentElement.dataset.healthhubCentralManualSync='1.302';
})();
