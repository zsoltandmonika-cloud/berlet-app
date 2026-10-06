(function(){
'use strict';
/* HealthHub v1.290 — lightweight viewer for local Léna Health Context v289 */

var STYLE='hh-v290-style', MODAL='hhLenaContextViewer290';

function pkey(p){
  if(p==='m'||p==='monika')return 'monika';
  if(p==='z'||p==='zsolt')return 'zsolt';
  return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
}
function pname(p){return pkey(p)==='monika'?'Mónika':'Zsolt'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function ctx(p){try{return JSON.parse(localStorage.getItem('hh-lena-context-v289-'+pkey(p))||'null')}catch(e){return null}}
function fmtDate(s){
  if(!s)return '—';
  var d=new Date(s);return isNaN(d)?String(s):d.toLocaleString('hu-HU',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}
function num(v,suffix){
  var n=Number(v);return Number.isFinite(n)?String(Math.round(n*10)/10)+(suffix||''):'—';
}
function ensureStyle(){
  if(document.getElementById(STYLE))return;
  var s=document.createElement('style');s.id=STYLE;
  s.textContent=
  '.hhCtxViewBtn290{margin-top:8px;border:0;border-radius:10px;padding:8px 10px;background:#6c4fc4;color:#fff;font-size:8px;font-weight:900;cursor:pointer}'+
  '.hhCtxViewBtn290:active{transform:scale(.98)}'+
  '#'+MODAL+'{position:fixed;inset:0;z-index:99999;background:rgba(14,29,43,.52);display:none;align-items:flex-end;justify-content:center;padding:0}'+
  '#'+MODAL+'.on{display:flex}'+
  '.hhCtxSheet290{width:min(760px,100%);max-height:92vh;overflow:auto;background:#f7fafc;border-radius:24px 24px 0 0;box-shadow:0 -18px 50px rgba(0,0,0,.18);padding:16px 14px 26px;box-sizing:border-box}'+
  '.hhCtxHead290{display:flex;align-items:flex-start;gap:10px;position:sticky;top:0;background:#f7fafc;padding-bottom:10px;z-index:2}'+
  '.hhCtxHead290 h2{font-size:17px;margin:0;color:#173f62}.hhCtxHead290 small{font-size:8px;color:#7890a1}'+
  '.hhCtxClose290{margin-left:auto;border:0;border-radius:11px;background:#e9eff4;color:#35546d;width:34px;height:34px;font-size:17px;font-weight:900}'+
  '.hhCtxCard290{background:#fff;border:1px solid #e2eaf0;border-radius:15px;padding:11px;margin:9px 0;box-shadow:0 4px 12px rgba(31,65,91,.035)}'+
  '.hhCtxCard290 h3{font-size:10px;margin:0 0 8px;color:#274d69;text-transform:uppercase;letter-spacing:.05em}'+
  '.hhCtxSummary290{white-space:pre-wrap;font-size:10px;line-height:1.55;color:#334f64}'+
  '.hhCtxGrid290{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.hhCtxMetric290{background:#f5f9fc;border-radius:11px;padding:8px}'+
  '.hhCtxMetric290 small{display:block;font-size:6.8px;color:#8295a5;text-transform:uppercase;font-weight:900}.hhCtxMetric290 b{display:block;font-size:10px;color:#173f62;margin-top:3px}'+
  '.hhCtxRow290{border-top:1px solid #edf1f4;padding:8px 0}.hhCtxRow290:first-child{border-top:0}.hhCtxRow290 b{display:block;font-size:9px;color:#244761}.hhCtxRow290 small{display:block;font-size:7.5px;color:#7a8f9f;margin-top:2px;line-height:1.45}'+
  '.hhCtxSignal290{background:#fff8e8;border:1px solid #f4dfab;border-radius:11px;padding:8px;margin:6px 0;font-size:8.5px;line-height:1.45;color:#795714}'+
  '.hhCtxDoc290{border-top:1px solid #edf1f4;padding:8px 0}.hhCtxDoc290:first-child{border-top:0}.hhCtxDoc290 b{font-size:8.8px;color:#244761;display:block}.hhCtxDoc290 small{font-size:7.2px;color:#8094a3;display:block;margin-top:2px;line-height:1.35}'+
  '.hhCtxExp290{margin-top:5px;padding:7px;background:#f1f8f6;border-radius:9px;color:#356f68;font-size:7.6px;line-height:1.45}'+
  '@media(max-width:520px){.hhCtxGrid290{grid-template-columns:1fr 1fr}.hhCtxSheet290{max-height:94vh}.hhCtxHead290 h2{font-size:15px}}';
  document.head.appendChild(s);
}
function ensureModal(){
  ensureStyle();
  var o=document.getElementById(MODAL);if(o)return o;
  o=document.createElement('div');o.id=MODAL;
  o.innerHTML='<div class="hhCtxSheet290"><div class="hhCtxHead290"><div><h2 id="hhCtxTitle290">Léna Health Context</h2><small id="hhCtxMeta290"></small></div><button type="button" class="hhCtxClose290" aria-label="Bezárás">×</button></div><div id="hhCtxBody290"></div></div>';
  o.querySelector('.hhCtxClose290').onclick=function(){o.classList.remove('on')};
  o.addEventListener('click',function(e){if(e.target===o)o.classList.remove('on')});
  document.body.appendChild(o);return o;
}
function metric(label,value){return '<div class="hhCtxMetric290"><small>'+esc(label)+'</small><b>'+esc(value)+'</b></div>'}
function section(title,body){return '<div class="hhCtxCard290"><h3>'+esc(title)+'</h3>'+body+'</div>'}
function docsHtml(c){
  var d=c&&c.documents&&Array.isArray(c.documents.index)?c.documents.index:[];
  if(!d.length)return '<div class="hhCtxRow290"><small>Nincs indexelt dokumentum.</small></div>';
  return d.map(function(x){
    var ex=x.explanation&&x.explanation.summary?'<div class="hhCtxExp290"><b>Léna magyarázat</b>'+esc(x.explanation.summary)+'</div>':'';
    return '<div class="hhCtxDoc290"><b>'+esc(x.title||'Dokumentum')+'</b><small>'+esc([x.date||'',x.category||'',x.sourceType||''].filter(Boolean).join(' · '))+'</small>'+ex+'</div>';
  }).join('');
}
function medsHtml(c){
  var a=Array.isArray(c&&c.medications)?c.medications:[];
  if(!a.length)return '<div class="hhCtxRow290"><small>Nincs gyógyszeradat a contextben.</small></div>';
  return a.map(function(x){return '<div class="hhCtxRow290"><b>'+esc(x.name||'Gyógyszer')+'</b><small>'+esc([x.strength||'',x.schedule||'',x.status||'',x.note||''].filter(Boolean).join(' · '))+'</small></div>'}).join('');
}
function signalsHtml(c){
  var a=Array.isArray(c&&c.signals)?c.signals:[];
  if(!a.length)return '<div class="hhCtxRow290"><small>Nincs külön jelzett változás.</small></div>';
  return a.map(function(x){return '<div class="hhCtxSignal290">'+esc(x.text||x.type||'Jelzés')+'</div>'}).join('');
}
function render(p){
  var c=ctx(p),o=ensureModal(),body=o.querySelector('#hhCtxBody290');
  o.querySelector('#hhCtxTitle290').textContent='🧠 Léna Health Context · '+pname(p);
  o.querySelector('#hhCtxMeta290').textContent=c?('Frissítve: '+fmtDate(c.generatedAt)+' · '+(c.reason||'refresh')):'Nincs helyi context';
  if(!c){
    body.innerHTML=section('Állapot','<div class="hhCtxRow290"><small>Ehhez a profilhoz még nincs elkészített v289 context.</small></div>');
    o.classList.add('on');return;
  }
  var m=c.metrics||{},w=m.weight||{},bp=m.bloodPressure||{},gl=m.glucose||{},ox=m.oxygen||{};
  var latestW=w.latest||{},latestBp=bp.latest||{};
  var sl=c.sleep||{},ac=c.activity||{},hr=c.heartRate||{};
  body.innerHTML=
    section('Rövid összefoglaló','<div class="hhCtxSummary290">'+esc(c.summary||'')+'</div>')+
    section('Aktuális értékek','<div class="hhCtxGrid290">'+
      metric('Testsúly',latestW.weightKg!=null?num(latestW.weightKg,' kg'):'—')+
      metric('Testzsír',latestW.bodyFatPercent!=null?num(latestW.bodyFatPercent,'%'):'—')+
      metric('Vérnyomás',latestBp.systolic!=null?(latestBp.systolic+'/'+latestBp.diastolic+' Hgmm'):'—')+
      metric('Pulzus',latestBp.pulse!=null?(latestBp.pulse+'/perc'):(hr.latest&&hr.latest.bpm!=null?hr.latest.bpm+'/perc':'—'))+
      metric('Vércukor',gl.latest&&gl.latest.bloodGlucose!=null?num(gl.latest.bloodGlucose,' mmol/L'):'—')+
      metric('SpO₂',ox.latest&&ox.latest.oxygenSaturation!=null?num(ox.latest.oxygenSaturation,'%'):'—')+
    '</div>')+
    section('Trendablakok','<div class="hhCtxGrid290">'+
      metric('Súly 7 nap',w.delta7d!=null?((w.delta7d>0?'+':'')+w.delta7d+' kg'):'—')+
      metric('Súly 30 nap',w.delta30d!=null?((w.delta30d>0?'+':'')+w.delta30d+' kg'):'—')+
      metric('Alvás 72h',sl.h72&&sl.h72.avgDurationMin!=null?Math.round(sl.h72.avgDurationMin/60*10)/10+' óra':'—')+
      metric('Alvás 7 nap',sl.d7&&sl.d7.avgDurationMin!=null?Math.round(sl.d7.avgDurationMin/60*10)/10+' óra':'—')+
      metric('Lépés 72h',ac.h72&&ac.h72.avgSteps!=null?Math.round(ac.h72.avgSteps).toLocaleString('hu-HU')+'/nap':'—')+
      metric('Lépés 7 nap',ac.d7&&ac.d7.avgSteps!=null?Math.round(ac.d7.avgSteps).toLocaleString('hu-HU')+'/nap':'—')+
    '</div>')+
    section('Figyelemre méltó változások',signalsHtml(c))+
    section('Gyógyszerek',medsHtml(c))+
    section('Leletek és archív dokumentumok · '+(c.documents&&c.documents.count||0),docsHtml(c));
  o.classList.add('on');
}
function decorate(){
  ensureStyle();ensureModal();
  var box=document.getElementById('hhLenaCtx289');if(!box)return;
  if(box.querySelector('.hhCtxViewBtn290'))return;
  var b=document.createElement('button');b.type='button';b.className='hhCtxViewBtn290';b.textContent='Context megtekintése';
  b.onclick=function(){render(pkey())};box.appendChild(b);
}
window.hhOpenLenaContextViewer290=function(p){render(p||pkey())};
window.addEventListener('healthhub:lena-context-updated',function(){setTimeout(decorate,80)});
window.addEventListener('healthhub:profile-changed',function(){setTimeout(decorate,120)});
window.addEventListener('focus',function(){setTimeout(decorate,180)});
try{
  if(typeof window.renderHealthSection==='function'&&!window.renderHealthSection.__lenaViewer290){
    var old=window.renderHealthSection;
    var wrap=async function(){var r=await old.apply(this,arguments);setTimeout(decorate,80);return r};
    wrap.__lenaViewer290=true;window.renderHealthSection=wrap;
  }
}catch(e){}
setTimeout(decorate,1200);
document.documentElement.dataset.healthhubLenaContextViewer='1.290';
})();