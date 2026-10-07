(function(){
'use strict';

/* HealthHub v1.231 — persistent diagnostics / Error Log.
   Captures runtime errors, unhandled promise rejections, console errors/warnings,
   and explicit sync failures. Stored locally on this device only. */

var KEY='hh-error-log-v1',MAX=180,decorating=false,viewCount=12,mem=null,flushTimer=0,lastSig='',lastSigAt=0;
var originalError=console.error.bind(console),originalWarn=console.warn.bind(console);

function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function now(){return new Date().toISOString()}
function clip(v,n){
  n=n||3500;
  try{
    if(v instanceof Error)return String(v.stack||v.message||v).slice(0,n);
    if(typeof v==='string')return v.slice(0,n);
    return JSON.stringify(v,function(k,x){
      if(typeof x==='function')return '[function]';
      if(x instanceof Error)return {name:x.name,message:x.message,stack:x.stack};
      return x;
    }).slice(0,n);
  }catch(e){return String(v).slice(0,n)}
}
function read(){
  if(Array.isArray(mem))return mem;
  try{var a=JSON.parse(localStorage.getItem(KEY)||'[]');mem=Array.isArray(a)?a:[];return mem}catch(e){mem=[];return mem}
}
function flush(){
  flushTimer=0;
  try{localStorage.setItem(KEY,JSON.stringify((mem||[]).slice(0,MAX)))}catch(e){}
}
function write(a){
  mem=a.slice(0,MAX);
  if(flushTimer)return;
  flushTimer=setTimeout(flush,500);
}
function build(){
  var el=document.documentElement;
  return window.HH_PROFILE_REPAIR||window.HH_LIVE_BUILD||el.dataset.healthhubProfileRepair||el.dataset.healthhubDataBuild||'unknown';
}
function record(level,source,message,detail){
  try{
    var msg=clip(message,1200),sig=String(level||'error')+'|'+String(source||'runtime')+'|'+msg,ts=Date.now();
    if(sig===lastSig&&ts-lastSigAt<1500)return;
    lastSig=sig;lastSigAt=ts;
    var a=read().slice();
    a.unshift({
      id:'err-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
      at:now(),
      level:String(level||'error'),
      source:String(source||'runtime'),
      message:msg,
      detail:clip(detail||'',3500),
      profile:pkey(),
      build:String(build()),
      online:navigator.onLine,
      url:location.pathname+location.search,
      ua:(navigator.userAgent||'').slice(0,500)
    });
    write(a);
    var ov=document.getElementById('haOv');
    if(ov&&ov.classList.contains('on'))decorateSoon();
  }catch(e){}
}
window.hhErrorLogRecord=record;
window.hhErrorLogRead=read;

window.addEventListener('error',function(e){
  record('error','window.error',e.message||'JavaScript hiba',(e.error&&e.error.stack)||((e.filename||'')+':'+(e.lineno||'')+':'+(e.colno||'')));
});
window.addEventListener('unhandledrejection',function(e){
  var r=e.reason;
  record('error','unhandledrejection',(r&&r.message)||r||'Nem kezelt Promise hiba',r&&r.stack||r);
});

console.error=function(){
  try{record('error','console.error',Array.from(arguments).map(function(x){return clip(x,800)}).join(' '),Array.from(arguments).map(function(x){return clip(x,1800)}).join('\n'))}catch(e){}
  return originalError.apply(console,arguments);
};
console.warn=function(){
  try{
    var txt=Array.from(arguments).map(function(x){return clip(x,800)}).join(' ');
    if(/error|fail|hiba|sync|dropbox|vault|profile|indexeddb|health/i.test(txt))record('warn','console.warn',txt,txt);
  }catch(e){}
  return originalWarn.apply(console,arguments);
};

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function fmt(s){var d=new Date(s);return isNaN(d)?s:d.toLocaleString('hu-HU',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function line(x){
  return '<details class="hhErrItem '+esc(x.level)+'">'+
    '<summary><span class="hhErrDot"></span><div><b>'+esc(x.message||'Hiba')+'</b><small>'+esc(fmt(x.at))+' · '+esc(x.source)+' · '+esc(x.profile)+' · '+esc(x.build)+'</small></div></summary>'+
    '<div class="hhErrDetail">'+
      '<div><b>Üzenet</b><pre>'+esc(x.message||'')+'</pre></div>'+
      (x.detail?'<div><b>Részlet / stack</b><pre>'+esc(x.detail)+'</pre></div>':'')+
      '<div class="hhErrMeta">Online: '+(x.online?'igen':'nem')+' · '+esc(x.url||'')+'</div>'+
    '</div></details>';
}
function sectionHtml(){
  var a=read(),errors=a.filter(function(x){return x.level==='error'}).length,warns=a.filter(function(x){return x.level==='warn'}).length;
  return '<section id="hhErrorLogSection" class="hhErrCard">'+
   '<div class="hhErrHead"><div><h3>🧯 Error Log</h3><small>JavaScript, Promise, Cloud Vault és sync hibák helyi naplója</small></div><span>'+errors+' hiba · '+warns+' figyelmeztetés</span></div>'+
   '<div class="hhErrActions"><button onclick="hhErrorLogRefresh()">↻ Frissítés</button><button onclick="hhErrorLogExport()">⬇ Export JSON</button><button onclick="hhErrorLogCopy()">⧉ Másolás</button><button class="danger" onclick="hhErrorLogClear()">Törlés</button></div>'+
   '<div class="hhErrList">'+(a.length?a.slice(0,viewCount).map(line).join(''):'<div class="hhErrEmpty">Még nincs rögzített hiba ezen az eszközön.</div>')+'</div>'+
   (a.length>viewCount?'<button class="hhErrMore" onclick="hhErrorLogMore()">További '+Math.min(12,a.length-viewCount)+' bejegyzés</button>':'')+
   '<div class="hhErrNote">A napló ezen az eszközön, localStorage-ban marad. Jelszót vagy Dropbox tokent nem ment.</div>'+
  '</section>';
}
function ensureStyle(){
  if(document.getElementById('hh-v231-error-style'))return;
  var s=document.createElement('style');s.id='hh-v231-error-style';
  s.textContent=
    '.hhErrCard{background:#fff;border:1px solid #e7d9dd;border-radius:16px;padding:12px;margin-top:9px;box-shadow:0 6px 16px rgba(31,65,91,.055)}'+
    '.hhErrHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.hhErrHead h3{margin:0;color:#173f62}.hhErrHead small{display:block;font-size:8px;color:#73879a;margin-top:3px;line-height:1.35}.hhErrHead>span{font-size:7.5px;font-weight:900;background:#fff1f3;color:#b13f5d;padding:5px 7px;border-radius:999px;white-space:nowrap}'+
    '.hhErrActions{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.hhErrActions button{border:1px solid #d9e4ec;background:#f7fafc;color:#31536f;border-radius:10px;padding:7px 9px;font-size:8px;font-weight:850}.hhErrActions .danger{background:#fff0f3;color:#ba3558;border-color:#f2d5dd}'+
    '.hhErrList{display:grid;gap:6px}.hhErrItem{border:1px solid #e5edf2;border-radius:12px;background:#fbfdfe;overflow:hidden}.hhErrItem.error{border-color:#efd8df;background:#fffafb}.hhErrItem.warn{border-color:#f1e5c4;background:#fffdf7}.hhErrItem summary{list-style:none;display:flex;align-items:flex-start;gap:8px;padding:9px;cursor:pointer}.hhErrItem summary::-webkit-details-marker{display:none}.hhErrDot{width:8px;height:8px;border-radius:50%;background:#d74b70;margin-top:3px;flex:none}.hhErrItem.warn .hhErrDot{background:#d9a32e}.hhErrItem summary div{min-width:0;flex:1}.hhErrItem summary b{display:block;font-size:8.5px;color:#294d68;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hhErrItem summary small{display:block;font-size:6.8px;color:#8295a4;margin-top:2px}.hhErrDetail{border-top:1px solid #edf2f5;padding:9px;background:#fff}.hhErrDetail b{font-size:7.2px;color:#506e84}.hhErrDetail pre{white-space:pre-wrap;word-break:break-word;font:7px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;color:#354f63;background:#f5f8fa;border-radius:8px;padding:7px;max-height:180px;overflow:auto}.hhErrMeta,.hhErrNote,.hhErrEmpty{font-size:7px;color:#8194a3;line-height:1.45}.hhErrNote{margin-top:8px}.hhErrEmpty{text-align:center;padding:14px}.hhErrMore{width:100%;margin-top:7px;border:1px solid #d9e4ec;background:#f7fafc;color:#31536f;border-radius:10px;padding:8px;font-size:7.5px;font-weight:900}';
  document.head.appendChild(s);
}
function decorate(){
  if(decorating)return;
  var body=document.getElementById('haBody');
  if(!body||!document.getElementById('haOv')||!document.getElementById('haOv').classList.contains('on'))return;
  decorating=true;
  try{
    ensureStyle();
    var old=document.getElementById('hhErrorLogSection');if(old)old.remove();
    body.insertAdjacentHTML('beforeend',sectionHtml());
  }finally{decorating=false}
}
function decorateSoon(){setTimeout(decorate,40)}
window.hhErrorLogRefresh=decorate;
window.hhErrorLogMore=function(){viewCount=Math.min(read().length,viewCount+12);decorate()};
window.hhErrorLogClear=function(){
  if(!confirm('Törlöd az ezen az eszközön tárolt HealthHub hibanaplót?'))return;
  localStorage.removeItem(KEY);mem=[];viewCount=12;decorate();
};
window.hhErrorLogExport=function(){
  var blob=new Blob([JSON.stringify({schema:'healthhub.errorlog/1',exportedAt:now(),entries:read()},null,2)],{type:'application/json'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='HealthHub_Error_Log_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},5000);
};
window.hhErrorLogCopy=async function(){
  var txt=read().slice(0,60).map(function(x){return '['+x.at+'] '+x.level.toUpperCase()+' '+x.source+' '+x.message+'\n'+(x.detail||'')}).join('\n\n');
  try{await navigator.clipboard.writeText(txt);window.toast&&window.toast('Error Log a vágólapra másolva')}catch(e){record('warn','clipboard','Error Log másolása sikertelen',e)}
};

/* Observe only Admin overlay visibility. Avoid full-document mutation watching/polling. */
function attachAdminErrorLogObserver(){
  var ov=document.getElementById('haOv');
  if(!ov){setTimeout(attachAdminErrorLogObserver,500);return}
  var obs=new MutationObserver(function(){
    if(ov.classList.contains('on'))decorateSoon();
  });
  obs.observe(ov,{attributes:true,attributeFilter:['class']});
  if(ov.classList.contains('on'))decorateSoon();
}
attachAdminErrorLogObserver();

window.addEventListener('pagehide',flush,{passive:true});
document.addEventListener('visibilitychange',function(){if(document.hidden)flush()},{passive:true});
document.documentElement.dataset.healthhubErrorLog='1.231.3';
})();