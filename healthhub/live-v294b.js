(function(){
'use strict';
var MK='hh-lena-doc-drive-v294-map',SK='hh-lena-doc-drive-v294-state';
function jget(k,d){try{return JSON.parse(localStorage.getItem(k)||'null')||d}catch(e){return d}}
function pk(p){return p==='m'||p==='monika'?'monika':p==='z'||p==='zsolt'?'zsolt':(localStorage.getItem('hh-profile')==='m'?'monika':'zsolt')}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var kbLoadPromise=null;
function loadKnowledgeUi(){
 if(window.HH_KB_UI_V407&&typeof window.HH_KB_UI_V407.mount==='function'){
  window.HH_KB_UI_V407.mount();return Promise.resolve(true);
 }
 if(kbLoadPromise)return kbLoadPromise;
 function load(src){
  return new Promise(function(ok,no){
   var el=document.createElement('script');
   el.src=src;el.async=false;el.onload=ok;
   el.onerror=function(){no(Error('A tudástár egyik modulja nem töltődött be.'))};
   document.head.appendChild(el);
  });
 }
 kbLoadPromise=load('./knowledge-v407-core.js?v=662-integrity')
  .then(function(){return load('./knowledge-v407-ingest.js?v=667-descope')})
  .then(function(){return load('./knowledge-v407-ui.js?v=668-evidence-viewer')})
  .then(function(){
   if(!window.HH_KB_UI_V407)throw Error('A tudástár felülete nem indult el.');
   window.HH_KB_UI_V407.mount();
   var panel=document.getElementById('hhKb407');
   if(panel)panel.scrollIntoView({behavior:'smooth',block:'nearest'});
   return true;
  }).catch(function(e){kbLoadPromise=null;throw e});
 return kbLoadPromise;
}

function fmt(s){if(!s)return'—';var d=new Date(s);return isNaN(d)?String(s):d.toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function decorateContext(p,cloud){
 var key='hh-lena-context-v289-'+p,c=jget(key,null),m=jget(MK,{});if(!c||!c.documents||!Array.isArray(c.documents.index))return false;
 var n=0;c.documents.index=c.documents.index.map(function(x){var e=m[String(x.id)];if(!e||!e.fileId)return x;n++;return Object.assign({},x,{driveArchive:{fileId:e.fileId,fileName:e.fileName||x.title||null,syncedAt:e.syncedAt||null}})});
 var st=jget(SK,{}),fs=st.folders||{};
 c.documents.driveArchive={enabled:true,syncedOriginals:n,rootFolderId:fs.root||null,profileFolderId:fs[p]||null,lastSyncAt:st.completedAt||st.updatedAt||null};
 localStorage.setItem(key,JSON.stringify(c));
 if(cloud){
  try{if(typeof window.hhUploadLenaHealthContext291==='function')window.hhUploadLenaHealthContext291(p,'archive-index-update')}catch(e){}
  try{if(typeof window.hhMirrorLenaContextDrive292==='function')window.hhMirrorLenaContextDrive292(p)}catch(e){}
 }
 return true;
}
function decorateAll(cloud){decorateContext('monika',cloud);decorateContext('zsolt',cloud)}
function render(){
 var host=document.getElementById('hhLenaCtx289');if(!host)return;
 var old=document.getElementById('hhLenaArchive294');if(old)old.remove();
 var st=jget(SK,{}),m=jget(MK,{}),mapped=Object.keys(m).filter(function(k){return m[k]&&m[k].fileId}).length;
 var total=Number(st.total)||0,done=Number(st.done)||0,pct=total?Math.round(done/total*100):0;
 var d=document.createElement('div');d.id='hhLenaArchive294';
 d.style.marginTop='7px';d.style.paddingTop='7px';d.style.borderTop='1px solid #e5edf2';d.style.fontSize='7.2px';d.style.lineHeight='1.55';d.style.color='#7f91a0';
 var line=st.running?('⏳ '+done+' / '+total+' · '+pct+'%'):(st.completed?('✅ '+mapped+' eredeti dokumentum Drive-on · '+fmt(st.completedAt)):(st.lastError?('⚠ '+esc(st.lastError).slice(0,100)):(mapped?('✅ '+mapped+' dokumentum már tükrözve'):'⏸ még nincs teljes archívum-sync')));
 d.innerHTML='<b style="color:#6c4fc4">📚 Léna teljes dokumentumtár</b><br>Drive archívum: '+line+
  (st.running?('<div style="height:6px;background:#e8edf2;border-radius:999px;overflow:hidden;margin:6px 0"><div style="height:100%;width:'+pct+'%;background:#6c4fc4"></div></div>'):'')+
  (st.currentName?('<span style="color:#657d90">Most: '+esc(st.currentName)+'</span><br>'):'')+
  ((st.failed||st.missingBlob)?('<span style="color:#9a6b28">Hiba: '+(st.failed||0)+' · hiányzó eredeti fájl: '+(st.missingBlob||0)+'</span><br>'):'')+
  '<button type="button" id="hhArchiveBtn294" style="margin-top:6px;border:0;border-radius:9px;padding:7px 9px;background:#6c4fc4;color:#fff;font-size:7.5px;font-weight:900;cursor:pointer">'+
  (st.running?'Sync leállítása':(mapped?'Archívum / delta sync most':'Teljes leletarchívum Drive Sync'))+'</button>'+
  '<br><span style="color:#8b98a5">Kézi indítás · egy fájl egyszerre · megszakítás után folytatható</span>'+
  '<div style="margin-top:9px"><button type="button" id="hhKbOpen294" style="min-height:40px;border:1px solid #b5d5e9;background:#e7f6ff;border-radius:10px;padding:8px 12px;font-size:12px;font-weight:800;color:#1d5d80;cursor:pointer">🫀 Tudástár és orvosi képek · próba</button></div>';
 host.appendChild(d);
 var b=d.querySelector('#hhArchiveBtn294');
 if(b)b.onclick=function(){if(st.running&&typeof window.hhStopLenaArchive294==='function')window.hhStopLenaArchive294();else if(typeof window.hhSyncFullLenaArchive294==='function')window.hhSyncFullLenaArchive294()};
 var kb=d.querySelector('#hhKbOpen294');
 if(kb)kb.onclick=function(){
  kb.disabled=true;kb.textContent='⏳ Tudástár megnyitása…';
  loadKnowledgeUi().then(function(){kb.disabled=false;kb.textContent='🫀 Tudástár és orvosi képek · próba'})
   .catch(function(e){kb.disabled=false;kb.textContent='🔁 Tudástár újrapróbálása';try{window.toast&&window.toast(e.message)}catch(_){}});
 };
}
window.addEventListener('healthhub:lena-archive-state',function(){setTimeout(render,40)});
window.addEventListener('healthhub:lena-archive-complete',function(){decorateAll(true);setTimeout(render,80)});
window.addEventListener('healthhub:lena-context-updated',function(e){
 var p=e&&e.detail&&e.detail.profile;
 setTimeout(function(){if(p)decorateContext(pk(p),false);render()},120);
});
window.addEventListener('healthhub:profile-changed',function(){setTimeout(render,150)});
window.addEventListener('focus',function(){setTimeout(render,180)});
try{
 if(typeof window.renderHealthSection==='function'&&!window.renderHealthSection.__lenaArchive294){
  var old=window.renderHealthSection;var wrap=async function(){var r=await old.apply(this,arguments);setTimeout(render,90);return r};wrap.__lenaArchive294=true;window.renderHealthSection=wrap;
 }
}catch(e){}
setTimeout(function(){decorateAll(false);render()},1700);
document.documentElement.dataset.healthhubLenaArchiveUi='1.294';
})();