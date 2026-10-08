(function(){
'use strict';
/* HealthHub v307 — Tünetnapló V1.
   Structured symptom/episode journal. Dropbox /HealthHub/master is canonical;
   localStorage is offline cache only. Voice input deliberately deferred to V2. */

var BUILD='v307', PAGE='hhSymptomJournal307', WHEEL='hhSymptomWheel307';
var LOCAL='hh-symptom-journal-v1', CLOUD='/HealthHub/master/symptoms.json';
var audioCtx=null, wheelState=null, draft=null, selectedDays=30, selectedTrendSymptom='';

var SYMPTOMS=['Fejfájás','Szédülés','Orrdugulás','Gyomorpanasz','Hátfájás','Mellkasi kellemetlenség','Láz','Allergiás panasz','Sérülés','Egyéb'];
var LOCATIONS={
 'Fejfájás':['Homlok','Fejtető','Homlok / fejtető','Bal halánték','Jobb halánték','Mindkét halánték','Tarkó','Féloldali','Teljes fej','Nem meghatározható'],
 'Orrdugulás':['Bal orrjárat','Jobb orrjárat','Mindkét oldal','Orr / arcüreg','Nem meghatározható'],
 'Gyomorpanasz':['Gyomorszáj','Has felső része','Has alsó része','Bal oldal','Jobb oldal','Teljes has','Nem meghatározható'],
 'Hátfájás':['Nyak','Lapockák között','Derék','Keresztcsont','Bal oldal','Jobb oldal','Nem meghatározható'],
 'Mellkasi kellemetlenség':['Mellkas közepe','Bal mellkas','Jobb mellkas','Szegycsont mögött','Nem meghatározható'],
 'Sérülés':['Fej','Nyak','Váll','Kar / kéz','Mellkas','Hát','Csípő','Láb / lábfej','Egyéb'],
 'default':['Fej','Nyak','Mellkas','Has','Hát','Kar / kéz','Láb / lábfej','Egész test','Nem meghatározható']
};
var ACTIONS=['Gyógyszer','Pihenés','Folyadék','Hideg borogatás','Meleg borogatás','Étkezés','Mozgás / séta','Egyéb','Semmi'];
var MEDS=['Advil Ultra Forte','Algoflex','Panadol','Aspirin','Egyéb','Nem vettem be'];
var DOSES=['100 mg','200 mg','400 mg','500 mg','600 mg','1 adag','Egyéb','—'];
var OUTCOMES=['Megszűnt','Jelentősen javult','Javult','Változatlan','Rosszabb lett','Folyamatban'];
var RESPONSE=['15 perc','30 perc','45 perc','60 perc','90 perc','2 óra','3 óra','4 óra','Nem ismert'];

function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(p){return p==='monika'?'Mónika':'Zsolt'}
function now(){return new Date().toISOString()}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function toast(s){try{window.toast&&window.toast(s)}catch(e){}}
function uuid(){try{return crypto.randomUUID()}catch(e){return 'sym-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}}
function dtLocal(iso){var d=new Date(iso||Date.now());if(isNaN(d.getTime()))d=new Date();var z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,16)}
function fmtDate(iso){var d=new Date(iso);return Number.isFinite(d.getTime())?d.toLocaleString('hu-HU',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}
function locations(){return LOCATIONS[draft&&draft.symptom]||LOCATIONS.default}
function defaultDraft(){
 return {eventAt:now(),symptom:'Fejfájás',location:'Homlok / fejtető',severity:6,action:'Gyógyszer',medication:'Advil Ultra Forte',dose:'400 mg',outcome:'Megszűnt',response:'60 perc',measurement:null,notes:''};
}
function pkgLocal(){
 try{
  var x=JSON.parse(localStorage.getItem(LOCAL)||'null');
  if(x&&Array.isArray(x.events))return x;
 }catch(e){}
 return {schema:'healthhub.master.symptoms/1',updatedAt:null,events:[]};
}
function writeLocal(x){x.schema='healthhub.master.symptoms/1';x.updatedAt=now();localStorage.setItem(LOCAL,JSON.stringify(x));return x}
function connected(){try{return !!(window.HH_DROPBOX_VAULT&&window.HH_DROPBOX_VAULT.connected&&window.HH_DROPBOX_VAULT.connected())}catch(e){return false}}
function mergeEvents(a,b){
 var map=new Map();
 (a||[]).concat(b||[]).forEach(function(x){
  if(!x||!x.id)return;
  var old=map.get(x.id),ot=Date.parse(old&&old.updatedAt||old&&old.createdAt||0),nt=Date.parse(x.updatedAt||x.createdAt||0);
  if(!old||nt>=ot)map.set(x.id,x);
 });
 return Array.from(map.values()).sort(function(x,y){return Date.parse(y.eventAt||0)-Date.parse(x.eventAt||0)});
}
async function pullCloud(){
 if(!connected())return pkgLocal();
 try{
  var remote=null;
  try{remote=await window.HH_DROPBOX_VAULT.downloadJson(CLOUD)}catch(e){if(!(e&&e.status===409))throw e}
  var local=pkgLocal();
  if(remote&&Array.isArray(remote.events)){
   local.events=mergeEvents(local.events,remote.events);
   writeLocal(local);
  }
  return local;
 }catch(e){console.warn('HealthHub Tünetnapló cloud pull',e);return pkgLocal()}
}
async function pushCloud(){
 if(!connected())return false;
 var x=pkgLocal();x.updatedAt=now();
 await window.HH_DROPBOX_VAULT.uploadJson(CLOUD,x);
 return true;
}
function initAudio(){
 try{
  if(!audioCtx){var A=window.AudioContext||window.webkitAudioContext;if(A)audioCtx=new A()}
  if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
 }catch(e){}
}
function tick(){
 try{
  if(audioCtx){
   var o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;
   o.type='square';o.frequency.setValueAtTime(1180,t);g.gain.setValueAtTime(.018,t);g.gain.exponentialRampToValueAtTime(.0001,t+.018);
   o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+.019);
  }
 }catch(e){}
 try{navigator.vibrate&&navigator.vibrate(7)}catch(e){}
}
function tada(){
 try{
  initAudio();if(!audioCtx)return;var t=audioCtx.currentTime+.015;
  function note(f,s,d,v,type){var o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type||'triangle';o.frequency.setValueAtTime(f,s);g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(v,s+.012);g.gain.exponentialRampToValueAtTime(.0001,s+d);o.connect(g);g.connect(audioCtx.destination);o.start(s);o.stop(s+d+.03)}
  note(523.25,t,.18,.075);note(659.25,t+.11,.28,.065);note(783.99,t+.11,.32,.060);note(1046.5,t+.24,.42,.055,'sine');
 }catch(e){}
 try{navigator.vibrate&&navigator.vibrate([20,28,20,28,42])}catch(e){}
}
function severityLabel(n){
 n=Number(n)||0;
 if(n===0)return '0 · nincs';
 if(n<=2)return n+' · enyhe';
 if(n<=5)return n+' · közepes';
 if(n<=7)return n+' · erős';
 return n+' · nagyon erős';
}
function choice(field,label,value,icon){
 return '<button type="button" class="hhSJChoice" data-field="'+field+'"><span class="hhSJCI">'+icon+'</span><span><small>'+esc(label)+'</small><b data-value="'+field+'">'+esc(value)+'</b></span><span class="hhSJCaret">›</span></button>';
}
function ensureStyle(){
 if(document.getElementById('hh-v307-style'))return;
 var s=document.createElement('style');s.id='hh-v307-style';s.textContent=
 '#health .quick.hhSJQuick307{grid-template-columns:repeat(7,minmax(0,1fr));gap:1px}#health .quick.hhSJQuick307 .qbox{width:40px;height:40px;padding:8px}#health .quick.hhSJQuick307 .q span{font-size:7.5px}.hhSJLaunch307 .qbox{background:linear-gradient(135deg,#12a6a2,#6d63e8)!important}.hhSJLaunch307 svg{width:24px;height:24px}'+
 '#'+PAGE+'{min-height:100vh;background:linear-gradient(180deg,color-mix(in srgb,var(--a) 5%,#eef7fb),#f7fbfd);padding-bottom:76px}.hhSJHero{position:relative;height:178px;overflow:hidden;background:linear-gradient(135deg,#dff5f4,#edf0ff)}.hhSJHero img{width:100%;height:100%;object-fit:cover;display:block}.hhSJShade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,37,57,.76),rgba(7,37,57,.20) 62%,rgba(7,37,57,.04))}.hhSJTop{position:absolute;left:12px;right:12px;top:12px;display:flex;justify-content:space-between;align-items:center;color:#fff}.hhSJBack{width:38px;height:38px;border:0;border-radius:50%;background:#ffffffdf;color:#244b66;font-size:26px;line-height:1}.hhSJBuild{font-size:8px;font-weight:900;background:#ffffffd8;color:#2b5873;padding:6px 9px;border-radius:999px}.hhSJCopy{position:absolute;left:16px;bottom:17px;color:white;text-shadow:0 2px 9px rgba(0,0,0,.35)}.hhSJCopy h1{font-size:27px;margin:0 0 3px}.hhSJCopy p{font-size:10px;margin:0}.hhSJBody{padding:10px;max-width:430px;margin:auto}.hhSJCard{background:#fff;border:1px solid #e3edf2;border-radius:18px;padding:11px;margin-bottom:9px;box-shadow:0 7px 18px rgba(31,69,95,.055)}.hhSJCard h3{font-size:13px;margin:0 0 2px;color:#173f62}.hhSJCard>small{font-size:8px;color:#788e9e}.hhSJTime{display:grid;grid-template-columns:38px 1fr;align-items:center;gap:8px;margin-top:9px}.hhSJTime span{font-size:22px}.hhSJTime input{width:100%;box-sizing:border-box;border:1px solid #dbe7ee;border-radius:12px;padding:10px;font:inherit;color:#294e69;background:#fbfdfe}.hhSJGrid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.hhSJChoice{min-height:66px;border:1px solid #e0eaf0;border-radius:14px;background:#fbfdfe;color:#294e69;padding:8px;display:grid;grid-template-columns:28px 1fr 12px;gap:6px;align-items:center;text-align:left}.hhSJChoice .hhSJCI{font-size:20px}.hhSJChoice small{display:block;font-size:7px;color:#8295a4;font-weight:800}.hhSJChoice b{display:block;font-size:10px;margin-top:2px;line-height:1.15}.hhSJCaret{font-size:19px;color:var(--a)}.hhSJMeasurement{margin-top:8px;padding:9px;border-radius:13px;background:color-mix(in srgb,var(--a) 7%,#f7fbfd);border:1px solid color-mix(in srgb,var(--a) 18%,#dfe9ef);font-size:8px;color:#49677c}.hhSJMeasurement b{display:block;font-size:11px;color:#244d68;margin-bottom:2px}.hhSJNotes{width:100%;box-sizing:border-box;margin-top:8px;border:1px solid #dce7ed;border-radius:13px;padding:10px;min-height:66px;resize:vertical;font:inherit;font-size:10px;color:#294e69}.hhSJSave{width:100%;height:50px;border:0;border-radius:15px;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-size:12px;font-weight:950;box-shadow:0 8px 18px color-mix(in srgb,var(--a) 25%,transparent)}.hhSJSave:disabled{opacity:.55}.hhSJPrivacy{text-align:center;font-size:7px;color:#8a9ba8;margin:7px 4px 0}.hhSJTrendHead{display:flex;justify-content:space-between;gap:8px;align-items:center}.hhSJTrendHead select{max-width:155px;border:1px solid #dce7ed;border-radius:10px;padding:6px;background:#fff;font-size:8px}.hhSJRange{display:flex;gap:5px;margin:8px 0}.hhSJRange button{border:1px solid #dce7ed;border-radius:999px;padding:6px 9px;background:#fff;color:#587388;font-size:7px;font-weight:900}.hhSJRange button.on{background:var(--a);color:#fff;border-color:var(--a)}.hhSJMetrics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.hhSJM{padding:8px;border-radius:12px;background:#f7fafc;border:1px solid #e7eef2}.hhSJM b{display:block;font-size:14px;color:#173f62}.hhSJM small{font-size:6.8px;color:#8195a3}.hhSJChart{height:128px;margin-top:8px;border-radius:14px;background:linear-gradient(180deg,#fbfdfe,#f4f9fc);border:1px solid #e5edf2;overflow:hidden}.hhSJChart svg{width:100%;height:100%;display:block}.hhSJLog{margin-top:9px}.hhSJRow{border-top:1px solid #edf2f5;padding:9px 0;display:grid;grid-template-columns:35px 1fr;gap:8px}.hhSJRow:first-child{border-top:0}.hhSJRowIcon{width:34px;height:34px;border-radius:11px;background:color-mix(in srgb,var(--a) 11%,#fff);display:grid;place-items:center;font-size:18px}.hhSJRow b{font-size:9px;color:#244d68}.hhSJRow small{display:block;font-size:7.5px;color:#7b8f9e;margin-top:2px;line-height:1.35}.hhSJEmpty{text-align:center;padding:18px 8px;color:#7c909e;font-size:9px}'+
 '#'+WHEEL+'{display:none;position:fixed;inset:0;z-index:9600;background:rgba(5,25,40,.58);backdrop-filter:blur(8px);align-items:flex-end}#'+WHEEL+'.on{display:flex}.hhSJWCard{width:min(100vw,430px);margin:0 auto;background:linear-gradient(180deg,#fbfdff,#f4f9fc);border-radius:25px 25px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -18px 44px rgba(0,0,0,.22);color:#173f62}.hhSJWHead{display:grid;grid-template-columns:42px 1fr 42px;align-items:center}.hhSJWClose{width:38px;height:38px;border:0;border-radius:50%;background:#eaf2f7;color:#284d69;font-size:22px}.hhSJWTitle{text-align:center}.hhSJWTitle small{display:block;font-size:8px;font-weight:900;color:var(--a)}.hhSJWTitle b{display:block;font-size:16px;margin-top:2px}.hhSJPickerWrap{position:relative;height:230px;margin:12px 9px;border-radius:18px;background:#fff;border:1px solid #dfeaf1;overflow:hidden}.hhSJPicker{height:100%;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:92px 0}.hhSJPicker::-webkit-scrollbar{display:none}.hhSJItem{height:46px;display:flex;align-items:center;justify-content:center;scroll-snap-align:center;font-size:15px;font-weight:760;color:#9caeba;transition:.12s}.hhSJItem.near{color:#667f91;font-size:17px}.hhSJItem.sel{font-size:22px;font-weight:900;color:#173f62;transform:scale(1.035)}.hhSJFocus{position:absolute;left:10px;right:10px;top:92px;height:46px;border-top:1px solid color-mix(in srgb,var(--a) 28%,#dbe8ef);border-bottom:1px solid color-mix(in srgb,var(--a) 28%,#dbe8ef);background:color-mix(in srgb,var(--a) 7%,transparent);pointer-events:none;border-radius:10px}.hhSJFadeT,.hhSJFadeB{position:absolute;left:0;right:0;height:72px;pointer-events:none;z-index:2}.hhSJFadeT{top:0;background:linear-gradient(#fff,rgba(255,255,255,0))}.hhSJFadeB{bottom:0;background:linear-gradient(rgba(255,255,255,0),#fff)}.hhSJWOk{width:100%;height:46px;border:0;border-radius:14px;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-size:10px;font-weight:950}'+
 '@media(max-width:360px){#health .quick.hhSJQuick307 .qbox{width:36px;height:36px}.hhSJGrid{grid-template-columns:1fr}.hhSJHero{height:165px}}';
 document.head.appendChild(s);
}
function ensureWheel(){
 var o=document.getElementById(WHEEL);if(o)return o;
 o=document.createElement('div');o.id=WHEEL;
 o.innerHTML='<div class="hhSJWCard"><div class="hhSJWHead"><button class="hhSJWClose">×</button><div class="hhSJWTitle"><small>TÜNETNAPLÓ</small><b>Válassz</b></div><span></span></div><div class="hhSJPickerWrap"><div class="hhSJFocus"></div><div class="hhSJFadeT"></div><div class="hhSJFadeB"></div><div class="hhSJPicker"></div></div><button class="hhSJWOk">KÉSZ</button></div>';
 document.body.appendChild(o);
 o.querySelector('.hhSJWClose').onclick=closeWheel;
 o.querySelector('.hhSJWOk').onclick=applyWheel;
 o.onclick=function(e){if(e.target===o)closeWheel()};
 return o;
}
function fieldConfig(field){
 if(field==='symptom')return {title:'Tünet',values:SYMPTOMS,current:draft.symptom};
 if(field==='location')return {title:'Hely / jelleg',values:locations(),current:draft.location};
 if(field==='severity')return {title:'Erősség',values:Array.from({length:11},function(_,i){return severityLabel(i)}),current:severityLabel(draft.severity)};
 if(field==='action')return {title:'Mit tettél?',values:ACTIONS,current:draft.action};
 if(field==='medication')return {title:'Eseti gyógyszer',values:MEDS,current:draft.medication};
 if(field==='dose')return {title:'Dózis',values:DOSES,current:draft.dose};
 if(field==='outcome')return {title:'Hatás / kimenetel',values:OUTCOMES,current:draft.outcome};
 if(field==='response')return {title:'Hatás ideje',values:RESPONSE,current:draft.response};
 return null;
}
function openWheel(field){
 initAudio();var cfg=fieldConfig(field);if(!cfg)return;
 var o=ensureWheel(),picker=o.querySelector('.hhSJPicker'),vals=cfg.values,idx=Math.max(0,vals.indexOf(cfg.current));
 wheelState={field:field,values:vals,index:idx,last:idx};
 o.querySelector('.hhSJWTitle b').textContent=cfg.title;
 picker.innerHTML=vals.map(function(v,i){return '<div class="hhSJItem" data-i="'+i+'">'+esc(v)+'</div>'}).join('');
 function visual(i,feedback){
  wheelState.index=i;
  picker.querySelectorAll('.hhSJItem').forEach(function(el,j){el.classList.toggle('sel',j===i);el.classList.toggle('near',Math.abs(j-i)===1)});
  if(feedback&&wheelState.last!==i){wheelState.last=i;tick()}
 }
 picker.onscroll=function(){requestAnimationFrame(function(){var i=Math.max(0,Math.min(vals.length-1,Math.round(picker.scrollTop/46)));visual(i,true)})};
 o.classList.add('on');
 requestAnimationFrame(function(){picker.scrollTop=idx*46;visual(idx,false)});
}
function closeWheel(){document.getElementById(WHEEL)?.classList.remove('on');wheelState=null}
function applyWheel(){
 if(!wheelState)return;
 var raw=wheelState.values[wheelState.index],field=wheelState.field;
 if(field==='severity')draft.severity=parseInt(raw,10)||0;else draft[field]=raw;
 if(field==='symptom'){
  var ls=locations();if(ls.indexOf(draft.location)<0)draft.location=ls[0];
 }
 closeWheel();renderDraft();
}
function showPage(){
 document.querySelectorAll('.page').forEach(function(x){x.classList.remove('on')});
 var p=document.getElementById(PAGE);if(p)p.classList.add('on');
 ['navTimelineBar','navHealthBar','navHomeBar','navDetailBar'].forEach(function(id){var n=document.getElementById(id);if(n)n.style.display='none'});
 window.scrollTo(0,0);
}
function backHealth(){
 if(typeof window.show==='function'){window.show('health');return}
 document.querySelectorAll('.page').forEach(function(x){x.classList.remove('on')});
 document.getElementById('health')?.classList.add('on');
 var n=document.getElementById('navHealthBar');if(n)n.style.display='grid';
 window.scrollTo(0,0);
}
function doctorSrc(){return document.querySelector('#health .ask img')?.getAttribute('src')||document.querySelector('.ask img')?.getAttribute('src')||''}
function ensurePage(){
 ensureStyle();
 var page=document.getElementById(PAGE);
 if(!page){
  page=document.createElement('section');page.id=PAGE;page.className='page';
  page.innerHTML='<div class="hhSJHero"><img class="hhSJDoctor" alt="Léna"><div class="hhSJShade"></div><div class="hhSJTop"><button class="hhSJBack" type="button">‹</button><span class="hhSJBuild">TÜNETNAPLÓ · V1</span></div><div class="hhSJCopy"><h1>Tünetnapló</h1><p><span id="hhSJProfile"></span> · eseti panaszok, kezelés és kimenetel</p></div></div><div class="hhSJBody"><section class="hhSJCard"><h3>🩺 Új egészségügyi esemény</h3><small>Automatikus időbélyeg · minden mező mentés előtt ellenőrizhető</small><div class="hhSJTime"><span>🕒</span><input id="hhSJTime" type="datetime-local"></div><div class="hhSJGrid" id="hhSJGrid"></div><div class="hhSJMeasurement" id="hhSJMeasurement"><b>Kapcsolódó mérés</b>Mérést keresek az esemény időpontja körül…</div><textarea class="hhSJNotes" id="hhSJNotes" placeholder="Opcionális megjegyzés…"></textarea><button class="hhSJSave" id="hhSJSave" type="button">💾 MENTÉS</button><div class="hhSJPrivacy">A Tünetnapló megfigyelési napló, nem diagnózis és nem gyógyszerajánló.</div></section><section class="hhSJCard"><div class="hhSJTrendHead"><div><h3>📈 Eseménytrend</h3><small>gyakoriság · erősség · kimenetel</small></div><select id="hhSJTrendSymptom"></select></div><div class="hhSJRange"><button data-days="7">7 nap</button><button data-days="30" class="on">30 nap</button><button data-days="90">90 nap</button><button data-days="365">1 év</button></div><div class="hhSJMetrics" id="hhSJMetrics"></div><div class="hhSJChart" id="hhSJChart"></div><div class="hhSJLog" id="hhSJLog"></div></section></div>';
  document.querySelector('.app')?.appendChild(page);
  page.querySelector('.hhSJBack').onclick=backHealth;
  page.querySelector('#hhSJSave').onclick=save;
  page.querySelector('#hhSJTime').onchange=function(){draft.eventAt=new Date(this.value).toISOString();findMeasurement();renderDraft(false)};
  page.querySelector('#hhSJNotes').oninput=function(){draft.notes=this.value};
  page.querySelector('.hhSJGrid').onclick=function(e){var b=e.target.closest('[data-field]');if(b)openWheel(b.dataset.field)};
  page.querySelector('.hhSJRange').onclick=function(e){var b=e.target.closest('[data-days]');if(!b)return;selectedDays=Number(b.dataset.days)||30;page.querySelectorAll('[data-days]').forEach(function(x){x.classList.toggle('on',x===b)});renderTrend()};
  page.querySelector('#hhSJTrendSymptom').onchange=function(){selectedTrendSymptom=this.value;renderTrend()};
 }
 var src=doctorSrc();if(src)page.querySelector('.hhSJDoctor').src=src;
 return page;
}
function ensureLaunch(){
 var q=document.querySelector('#health .quick');if(!q)return;
 q.classList.add('hhSJQuick307');
 var b=q.querySelector('.hhSJLaunch307');
 if(!b){
  b=document.createElement('button');b.type='button';b.className='q hhSJLaunch307';
  b.innerHTML='<span class="qbox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16"/><path d="M7 16V5h10v11"/><path d="M9 9h6M12 6v6"/><path d="M9 16h6"/></svg></span><span>Tünet-<br>napló</span>';
  var last=q.lastElementChild;q.insertBefore(b,last||null);
 }
 /* HealthRadar can rebuild .quick with innerHTML. Rebind even when the button survives
    visually but its DOM event handler was discarded by the rebuild. */
 b.type='button';
 b.onclick=function(e){if(e){e.preventDefault();e.stopPropagation()}openJournal()};
}
async function readMeasurements(){
 return new Promise(function(ok){
  try{
   var r=indexedDB.open('healthhub-healthradar-v2');
   r.onerror=function(){ok([])};
   r.onsuccess=function(){var db=r.result;if(!db.objectStoreNames.contains('measurements')){db.close();ok([]);return}var tx=db.transaction('measurements','readonly'),g=tx.objectStore('measurements').getAll();g.onsuccess=function(){db.close();ok(g.result||[])};g.onerror=function(){db.close();ok([])}};
  }catch(e){ok([])}
 });
}
async function findMeasurement(){
 if(!draft)return;
 var all=await readMeasurements(),p=pkey(),t=Date.parse(draft.eventAt),best=null,bd=3*3600*1000+1;
 all.forEach(function(x){
  if(x.profile!==p)return;
  if(x.systolic==null&&x.diastolic==null&&x.pulse==null)return;
  var d=Math.abs(Date.parse(x.measuredAt||0)-t);
  if(Number.isFinite(d)&&d<bd){bd=d;best=x}
 });
 draft.measurement=best?{id:best.id||null,measuredAt:best.measuredAt||null,systolic:best.systolic??null,diastolic:best.diastolic??null,pulse:best.pulse??null,source:best.source||null}:null;
 renderMeasurement();
}
function renderMeasurement(){
 var el=document.getElementById('hhSJMeasurement');if(!el||!draft)return;
 var m=draft.measurement;
 if(!m){el.innerHTML='<b>🩺 Kapcsolódó mérés</b>Az esemény ±3 órás környezetében nem találtam vérnyomás/pulzus mérést.';return}
 var bp=(m.systolic!=null||m.diastolic!=null)?((m.systolic??'—')+'/'+(m.diastolic??'—')+' Hgmm'):'';
 var pulse=m.pulse!=null?(' · '+m.pulse+' bpm'):'';
 el.innerHTML='<b>🩺 Kapcsolódó mérés automatikusan felismerve</b>'+esc(bp+pulse)+' · '+esc(new Date(m.measuredAt).toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'}));
}
function renderDraft(findBp){
 var page=ensurePage();if(!draft)draft=defaultDraft();
 page.querySelector('#hhSJProfile').textContent=pname(pkey());
 var inp=page.querySelector('#hhSJTime');if(document.activeElement!==inp)inp.value=dtLocal(draft.eventAt);
 page.querySelector('#hhSJGrid').innerHTML=
  choice('symptom','Tünet',draft.symptom,'🤕')+
  choice('location','Hely / jelleg',draft.location,'📍')+
  choice('severity','Erősség',severityLabel(draft.severity),'◉')+
  choice('action','Mit tettél?',draft.action,'🧰')+
  choice('medication','Eseti gyógyszer',draft.medication,'💊')+
  choice('dose','Dózis',draft.dose,'⚖️')+
  choice('outcome','Kimenetel',draft.outcome,'✅')+
  choice('response','Hatás ideje',draft.response,'⏱️');
 if(document.activeElement!==page.querySelector('#hhSJNotes'))page.querySelector('#hhSJNotes').value=draft.notes||'';
 renderMeasurement();
 if(findBp!==false)findMeasurement();
}
async function save(){
 initAudio();
 var btn=document.getElementById('hhSJSave');if(btn)btn.disabled=true;
 try{
  var p=pkey(),x=pkgLocal(),t=now();
  var row={schema:'healthhub.symptom.event/1',id:'sym-'+uuid(),profile:p,eventAt:draft.eventAt,symptom:draft.symptom,location:draft.location,severity:Number(draft.severity)||0,action:draft.action,medication:draft.action==='Gyógyszer'?draft.medication:null,dose:draft.action==='Gyógyszer'?draft.dose:null,outcome:draft.outcome,response:draft.response,measurement:draft.measurement||null,notes:(draft.notes||'').trim(),source:'healthhub_manual',createdAt:t,updatedAt:t};
  x.events=mergeEvents(x.events,[row]);writeLocal(x);renderTrend();tada();toast('✓ Esemény elmentve · Tünetnapló');
  try{var ok=await pushCloud();if(ok)toast('✓ Esemény elmentve · központi tárhely frissítve')}catch(e){console.warn(e);toast('Esemény elmentve · cloud sync később újrapróbálható')}
  draft=defaultDraft();renderDraft();
  window.dispatchEvent(new CustomEvent('healthhub:symptom-saved',{detail:{profile:p,id:row.id,eventAt:row.eventAt}}));
 }catch(e){console.error(e);toast('A Tünetnapló bejegyzés nem menthető.')}
 finally{if(btn)btn.disabled=false}
}
function trendEvents(){
 var cut=Date.now()-selectedDays*86400000,p=pkey();
 return pkgLocal().events.filter(function(x){return x.profile===p&&Date.parse(x.eventAt)>=cut&&(!selectedTrendSymptom||x.symptom===selectedTrendSymptom)}).sort(function(a,b){return Date.parse(a.eventAt)-Date.parse(b.eventAt)});
}
function chartSvg(rows){
 if(!rows.length)return '<div class="hhSJEmpty">Még nincs esemény ebben az időszakban.</div>';
 var W=360,H=128,L=25,R=10,T=12,B=24,minT=Date.parse(rows[0].eventAt),maxT=Date.parse(rows[rows.length-1].eventAt);if(maxT===minT)maxT=minT+86400000;
 var pts=rows.map(function(x){var px=L+(Date.parse(x.eventAt)-minT)/(maxT-minT)*(W-L-R),py=T+(10-(Number(x.severity)||0))/10*(H-T-B);return {x:px,y:py,s:x.severity}});
 var poly=pts.map(function(p){return p.x.toFixed(1)+','+p.y.toFixed(1)}).join(' ');
 var circles=pts.map(function(p){return '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4" fill="var(--a)"/>'}).join('');
 return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-label="Tünet erősség trend"><line x1="'+L+'" y1="'+(H-B)+'" x2="'+(W-R)+'" y2="'+(H-B)+'" stroke="#dfe8ee"/><line x1="'+L+'" y1="'+T+'" x2="'+L+'" y2="'+(H-B)+'" stroke="#dfe8ee"/><text x="4" y="'+(T+4)+'" font-size="8" fill="#8194a1">10</text><text x="9" y="'+(H-B)+'" font-size="8" fill="#8194a1">0</text>'+(pts.length>1?'<polyline points="'+poly+'" fill="none" stroke="var(--a)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>':'')+circles+'<text x="'+L+'" y="'+(H-7)+'" font-size="7" fill="#8194a1">'+esc(new Date(minT).toLocaleDateString('hu-HU',{month:'short',day:'numeric'}))+'</text><text x="'+(W-55)+'" y="'+(H-7)+'" font-size="7" fill="#8194a1">'+esc(new Date(rows[rows.length-1].eventAt).toLocaleDateString('hu-HU',{month:'short',day:'numeric'}))+'</text></svg>';
}
function renderTrend(){
 var page=document.getElementById(PAGE);if(!page)return;
 var p=pkey(),all=pkgLocal().events.filter(function(x){return x.profile===p});
 var syms=Array.from(new Set(all.map(function(x){return x.symptom}).concat(SYMPTOMS))).filter(Boolean);
 var sel=page.querySelector('#hhSJTrendSymptom');
 if(!selectedTrendSymptom)selectedTrendSymptom=draft&&draft.symptom||'Fejfájás';
 if(syms.indexOf(selectedTrendSymptom)<0)selectedTrendSymptom=syms[0]||'Fejfájás';
 sel.innerHTML=syms.map(function(s){return '<option'+(s===selectedTrendSymptom?' selected':'')+'>'+esc(s)+'</option>'}).join('');
 var rows=trendEvents(),avg=rows.length?rows.reduce(function(a,x){return a+(Number(x.severity)||0)},0)/rows.length:0,done=rows.filter(function(x){return x.outcome==='Megszűnt'||x.outcome==='Jelentősen javult'||x.outcome==='Javult'}).length;
 page.querySelector('#hhSJMetrics').innerHTML='<div class="hhSJM"><b>'+rows.length+'</b><small>ESEMÉNY</small></div><div class="hhSJM"><b>'+avg.toFixed(rows.length?1:0)+'</b><small>ÁTLAG ERŐSSÉG / 10</small></div><div class="hhSJM"><b>'+(rows.length?Math.round(done/rows.length*100):0)+'%</b><small>JAVULT / MEGSZŰNT</small></div>';
 page.querySelector('#hhSJChart').innerHTML=chartSvg(rows);
 var recent=all.sort(function(a,b){return Date.parse(b.eventAt)-Date.parse(a.eventAt)}).slice(0,12);
 page.querySelector('#hhSJLog').innerHTML=recent.length?recent.map(function(x){
  var med=x.medication?(' · 💊 '+x.medication+(x.dose?' '+x.dose:'')):'';
  var bp=x.measurement&&x.measurement.systolic!=null?(' · 🩺 '+x.measurement.systolic+'/'+(x.measurement.diastolic??'—')):'';
  return '<div class="hhSJRow"><span class="hhSJRowIcon">🤕</span><span><b>'+esc(x.symptom)+' · '+esc(severityLabel(x.severity))+'</b><small>'+esc(fmtDate(x.eventAt))+' · '+esc(x.location||'')+med+bp+'</small><small>'+esc(x.outcome||'')+(x.response?' · '+esc(x.response):'')+'</small></span></div>';
 }).join(''):'<div class="hhSJEmpty">A napló még üres. Az első mentés után itt azonnal megjelenik az esemény és a trend.</div>';
}
async function openJournal(){
 initAudio();draft=defaultDraft();selectedTrendSymptom=draft.symptom;
 ensurePage();showPage();renderDraft();renderTrend();
 var before=pkgLocal().events.length;await pullCloud();if(pkgLocal().events.length!==before)renderTrend();
}
var launchObserver=null,launchRepairTimer=null;
function installLaunchGuard(){
 if(document.documentElement.dataset.hhSJLaunchGuard307==='1')return;
 document.documentElement.dataset.hhSJLaunchGuard307='1';
 /* Delegated fallback: survives every HealthRadar DOM rebuild. */
 document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest?e.target.closest('.hhSJLaunch307'):null;
  if(!b)return;
  e.preventDefault();e.stopPropagation();
  openJournal();
 },true);
 var health=document.getElementById('health');
 if(health&&window.MutationObserver){
  launchObserver=new MutationObserver(function(){
   clearTimeout(launchRepairTimer);
   launchRepairTimer=setTimeout(ensureLaunch,30);
  });
  launchObserver.observe(health,{childList:true,subtree:true});
 }
 /* Tiny watchdog for older WebViews where mutation callbacks can be skipped while
    pages are being swapped. It only repairs the launch button; it does no sync work. */
 setInterval(function(){if(document.getElementById('health'))ensureLaunch()},2500);
}
function decorate(){
 ensurePage();ensureLaunch();installLaunchGuard();
 document.documentElement.dataset.healthhubSymptomJournal='1.307.1';
}
window.hhOpenSymptomJournal307=openJournal;
window.hhSymptomJournalSync307=async function(){await pullCloud();if(connected())await pushCloud();renderTrend();return true};
window.addEventListener('healthhub:profile-changed',function(){if(document.getElementById(PAGE)?.classList.contains('on')){draft=defaultDraft();selectedTrendSymptom=draft.symptom;renderDraft();renderTrend();pullCloud().then(renderTrend)}});
window.addEventListener('online',function(){if(document.getElementById(PAGE)?.classList.contains('on'))pullCloud().then(renderTrend)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
setTimeout(decorate,900);
})();